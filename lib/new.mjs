/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-fs-filename */
import {
  Command,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Option,
} from 'commander';
import {access, constants as FS_CONSTANTS, writeFile} from 'node:fs/promises';
import {env} from 'node:process';
import {$} from 'zx';

import {serviceTemplate, timerTemplate} from './templates.mjs';

const program = new Command();

async function isNameUnused(name) {
  try {
    await access(`${env.HOME}/.config/systemd/user/${name}.service`);
    return false;
  } catch (error) {
    if (error.code !== 'ENOENT')
      program.error(error.message, {code: InvalidArgumentError});
    return true;
  }
}

async function parseExecStart(value) {
  const {R_OK, X_OK} = FS_CONSTANTS;
  try {
    await access(value.split(' ')[0], R_OK | X_OK);
    return value;
  } catch (error) {
    program.error(error.message, {code: InvalidOptionArgumentError});
  }
}

async function parseTimer(type, value) {
  const wantedField = (type === 'timespan' && 'Human') || 'Normalized';
  try {
    const out = await $({quiet: true})`systemd-analyze ${type} ${value} |\
      grep ${wantedField} | cut -d ':' -f 2-`;
    return out.stdout.trim();
  } catch (error) {
    program.error(error.stderr, {code: InvalidOptionArgumentError});
  }
}
const parseCalendar = (value) => parseTimer('calendar', value);
const parseTimeSpan = (value) => parseTimer('timespan', value);

program
  .addOption(
    new Option('-x, --exec-start <command>', 'the command to run').argParser(
      parseExecStart
    )
  )
  .addOption(
    new Option('-c, --calendar <calendar>', 'a systemd calendar value')
      .conflicts('timeSpan')
      .argParser(parseCalendar)
  )
  .addOption(
    new Option(
      '-t, --time-span <time-span>',
      'a systemd timespan value'
    ).argParser(parseTimeSpan)
  )
  .option('--no-enable', "don't automatically enable/start timer")
  .argument(
    '<timer name>',
    'a descriptive name for the timer and associated service'
  );

await program.parseAsync();
const name = program.args[0];

const resolvedOpts = {};
for (const [k, v] of Object.entries(program.opts())) resolvedOpts[k] = await v;
const {calendar, enable, execStart, timeSpan} = resolvedOpts;

// Pre-flight checks
if (!calendar && !timeSpan)
  program.error('error: either --calendar or --time-span is required', {
    code: InvalidOptionArgumentError,
  });
if (!(await isNameUnused(name))) program.error(`error: ${name} already in use`);

// Create .service and .timer files
const baseFileName = `${process.env.HOME}/.config/systemd/user/${name}`;
try {
  await writeFile(
    `${baseFileName}.service`,
    serviceTemplate({execStart, name}),
    {mode: 0o660}
  );
  await writeFile(
    `${baseFileName}.timer`,
    timerTemplate({calendar, name, timeSpan})
  );
  console.info('Unit files created successfully.');
  if (enable) {
    const out = await $({quiet: true})`systemctl --user enable ${name}.timer &&\
                                       systemctl --user start ${name} &&\
                                       systemctl --user list-timers ${name}`;
    console.info(out.stderr, out.stdout);
  }
} catch (error) {
  program.error(error.message || error.stderr);
}

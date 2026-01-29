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

export default function buildCommand() {
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
      const {stdout} = await $({
        quiet: true,
      })`systemd-analyze ${type} ${value} |\
      grep ${wantedField} | cut -d ':' -f 2-`;
      return stdout.trim();
    } catch (error) {
      program.error(error.stderr, {code: InvalidOptionArgumentError});
    }
  }
  const parseCalendar = (value) => parseTimer('calendar', value);
  const parseTimeSpan = (value) => parseTimer('timespan', value);

  async function run(name, {calendar, dryRun, enable, execStart, timeSpan}) {
    // Create .service and .timer files
    const baseFileName = `${env.HOME}/.config/systemd/user/${name}`;
    try {
      if (dryRun) {
        console.info('Would perform the following actions:\n');
        console.info(`Write file: ${baseFileName}.service with content:\n---`);
        console.info(serviceTemplate({execStart, name}));
        console.info('---\n');
        console.info(`Write file: ${baseFileName}.timer with content:\n---`);
        console.info(timerTemplate({calendar, name, timeSpan}));
        console.info('---\n');
        if (enable) console.info('Execute commands:');
      } else {
        await writeFile(
          `${baseFileName}.service`,
          serviceTemplate({execStart, name}),
          {mode: 0o660}
        );
        await writeFile(
          `${baseFileName}.timer`,
          timerTemplate({calendar, name, timeSpan}),
          {mode: 0o660}
        );
        console.info('Unit files created successfully.');
      }
      if (enable) await enableService(name, dryRun);
    } catch (error) {
      program.error(error.message || error.stderr);
    }
  }

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
    .option(
      '--dry-run',
      'display what actions would be performed without actually doing them'
    )
    .argument(
      '<timer name>',
      'a descriptive name for the timer and associated service'
    )
    .action(async (name, options) => {
      // resolve option Promises
      const resolvedOpts = {};
      for (const [k, v] of Object.entries(options)) resolvedOpts[k] = await v;

      // Pre-flight checks
      if (!resolvedOpts.calendar && !resolvedOpts.timeSpan)
        program.error('error: either --calendar or --time-span is required', {
          code: InvalidOptionArgumentError,
        });
      if (!(await isNameUnused(name)))
        program.error(`error: ${name} already in use`, {
          code: InvalidArgumentError,
        });
      run(name, resolvedOpts);
    });
  return program;
}

async function enableService(name, dryRun = false) {
  const commands = [
    ['systemctl', '--user', 'enable', `${name}.timer`],
    ['systemctl', '--user', 'start', name],
    ['systemctl', '--user', 'list-timers', name],
  ];
  for (const command of commands) {
    const {stdout} = await (dryRun
      ? $`${['echo', ...command]}`
      : $`${command}`);
    console.info(stdout);
  }
}

const program = buildCommand();
await program.parseAsync();

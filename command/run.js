// commander binds "this" to the command object
/* eslint-disable no-invalid-this */
import {Temporal} from '@js-temporal/polyfill';
import chalk from 'chalk';

import {fileBox, verboseStyle, warnStyle, whatIfStyle} from '../lib/styles.js';
import {serviceTemplate, timerTemplate} from '../lib/templates.js';

const outWarn = (str) => console.warn(warnStyle(str));

export default function addRunCommand({
  action,
  parseExecStart,
  parseTimer,
  program,
}) {
  return program
    .command('run')
    .alias('new')
    .description('create and start a timer')
    .argument('<command>', 'command to run', parseExecStart)
    .allowExcessArguments()
    .allowUnknownOption()
    .requiredOption('--every, --on <schedule...>', 'timer schedule')
    .hook('preAction', (command) => {
      try {
        Object.assign(command.opts(), parseTimer(command.opts().on.join(' ')));
      } catch (error) {
        program.error(error);
      }
    })
    .option(
      '-n, --name <name>',
      'if not specified timer will be named after executable'
    )
    .usage('<command> [options]')
    .addHelpText(
      'after',
      `
  Schedule can be either a timespan or a calendar event. Options/arguments need to be in single quotes if they contain asterixes (calendar events), but spaces in ${chalk.yellow('<command>')} and ${chalk.green('<schedule...>')} should be handled correctly without needing quotes. Arguments and options not recognized by this command are assumed to be part of the <command> argument.

  Examples of valid timespans: ${chalk.magenta('2 h')}, ${chalk.magenta('2hour')}, ${chalk.magenta('1y 6 month')}, ${chalk.magenta('30s1days 3 hrs')}

  Examples of valid calendar events: ${chalk.magenta('weekly')}, '${chalk.magenta('mon,sun 12-*-* 1,2:30')}', '${chalk.magenta('*-2-29')}'

  See "man systemd.time" for detailed descriptions of timespan/calendar formats.`
    )
    .action(action);
}

export function makeRunAction({$, accessSync, env, writeFileSync}) {
  return function () {
    // there's probably a better way to do this, but this is good enough
    this.args[0] = this.processedArgs[0];
    const execStart = this.args.join(' ');

    const {force, on, quiet, timerType, verbose, whatIf} =
      this.optsWithGlobals();

    // hack the path and args off the execStart line if we don't have a name
    const name =
      this.optsWithGlobals()?.name || execStart.split(' ')[0].split('/').pop();

    const outDebug = whatIf
      ? (str) => console.debug(whatIfStyle(str))
      : (str) => console.debug(verboseStyle(str));

    const baseFileName = `${env.HOME}/.config/systemd/user/${name}`;
    const serviceFile = {
      content: serviceTemplate({execStart, name}),
      name: `${baseFileName}.service`,
    };
    const timerFile = {
      content: timerTemplate({name, on, timerType}),
      name: `${baseFileName}.timer`,
    };

    for (const fileName of [serviceFile.name, timerFile.name]) {
      try {
        accessSync(fileName);
        if (!force) this.error(`${fileName} exists`);
        if (verbose)
          outWarn(`overwriting ${fileName}: exists but --force specified`);
      } catch (error) {
        // we were hoping for error 'ENOENT' all along
        if (error.code !== 'ENOENT') this.error(error.message);
      }
    }

    if (whatIf) outDebug('Would perform the following actions:\n');
    // second verse, diff from the first
    for (const file of [serviceFile, timerFile]) {
      if (verbose) {
        outDebug(`Write file: ${(verbose === 1 && file.name) || ''}`);
        if (verbose > 1) outDebug(fileBox(file));
      }
      if (!whatIf) writeFileSync(file.name, file.content, {mode: 0o660});
    }

    $.verbose = verbose;
    $.quiet = quiet;
    if (verbose) outDebug('Enable and start timer:');
    const cmdLines = [
      ['systemctl', '--user', 'daemon-reload'],
      ['systemctl', '--user', 'enable', '--now', `${name}.timer`],
    ];
    if (timerType === 'timeSpan')
      cmdLines.push(['systemctl', '--user', 'start', `${name}.service`]);
    for (const line of cmdLines) {
      if (whatIf) {
        outDebug(line.join(' '));
        continue;
      }
      const out = $`${line}`;
      if (!out.ok) this.error(`error: ${out.stderr.trim()}`);
      if (verbose) console.debug(out.stderr.trim());
    }

    if (quiet || whatIf) return;
    if (verbose) {
      const out = $`systemctl --user status ${name}.timer --no-pager`;
      if (!out.ok) this.error(`error: ${out.stderr}`);
      console.info(out.stdout);
    } else {
      const out = $`systemctl --user list-timers ${name} -o json`;
      if (!out.ok) this.error(`error: ${out.stderr}`);
      const timerInfo = JSON.parse(out.stdout);
      const nextRun = Temporal.Now.instant()
        .until(
          Temporal.Instant.fromEpochMilliseconds(
            Math.floor(timerInfo[0].next / 1000)
          )
        )
        .round({
          largestUnit: 'years',
          relativeTo: Temporal.Now.plainDateISO(),
          smallestUnit: 'minutes',
        })
        .toLocaleString();
      console.info(
        `Timer created: next run of ${chalk.cyan(name)} in ${chalk.green(nextRun)}`
      );
    }
  };
}

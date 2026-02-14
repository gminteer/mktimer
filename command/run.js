// commander binds "this" to the command object
/* eslint-disable no-invalid-this */
import chalk from 'chalk';
import {stdout} from 'node:process';
import wrapAnsi from 'wrap-ansi';

import {fileBox, verboseStyle, warnStyle, whatIfStyle} from '../lib/styles.js';
import {serviceTemplate, timerTemplate} from '../lib/templates.js';
import {getTimeDelta} from '../lib/utils.js';

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
    .allowExcessArguments()
    .allowUnknownOption()
    .argument('<command>', 'command to run', parseExecStart)
    .requiredOption('--every, --on <schedule...>', 'timer schedule')
    .hook('preAction', (command) => {
      // parseTimer() had to move here since we can't parse until all of its
      // tokens are in the array and requiring the user to quote the schedule
      // parameter every time felt like bad UX
      try {
        // a little barbaric, but command.opts() returns a ref to its internal
        // options object (not a copy) so we can mutate it freely, and we're too
        // late to use .implies to set the timerType anyways
        Object.assign(command.opts(), parseTimer(command.opts().on.join(' ')));
      } catch (error) {
        this.error(error);
      }
    })
    .option(
      '-n, --name <name>',
      'if not specified timer will be named after executable'
    )
    .usage('<command> [options]')
    .addHelpText(
      'after',
      wrapAnsi(
        `
${chalk.whiteBright.bold('Examples:')}
  ${chalk.blue(`${program.name()} run ../../../../../../../../../true --every 60seconds 79 min 3 hrs --foo=bar`)} \
${chalk.italic(`# runs '/usr/bin/true --foo=bar' every 4hrs 20mins`)}
  ${chalk.blue(`${program.name()} run --every 1h /bin/false -n lol-status-degraded -- /bin/false -f -v -v --help`)}
  ${chalk.blue(`${program.name()} new 'rm -rf / --no-preserve-root' --on '*-2-29' -n os-killer`)} \
${chalk.italic('# attempts to brick your OS every leap year day, names the systemd units "os-killer"')}

${chalk.whiteBright.bold('Notes:')}
  Some basic checking and cleanup will be done to parameters: ${chalk.yellow('<command>')} is checked to confirm it exists and is executable, and resolved into a canonical filename, ${chalk.green('<schedule...>')} is validated and normalized by systemd-analyze, and can be either a timespan or a calendar event. Parameters should be single quoted if they contain shell metacharacters (calendar events are full of "*-*-*"), but spaces in parameters should generally work correctly without quotes. Unrecognized parameters are assumed to be part of the <command> argument; if parameters recognized by this program are intended to be part of the <command> argument, then either the command argument should be quoted, or the options should be provided first and terminated with a '--', as is GNU convention. 

See ${chalk.whiteBright.bold('man systemd.time')} for detailed descriptions of timespan / calendar event formats.`,
        stdout.columns,
        {trim: false}
      )
    )
    .action(action);
}

export function makeRunAction({$, accessSync, env, writeFileSync}) {
  return function () {
    // more mild barbarism, we don't really need the original filename anymore
    // so we'll just clobber it with the canonical filename we got from node:fs
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

    // first verse, check to see if those files already exist
    for (const fileName of [serviceFile.name, timerFile.name]) {
      try {
        accessSync(fileName);
        if (!force) this.error(`error: ${fileName} exists`);
        if (!quiet) outWarn(`overwriting ${fileName}`);
      } catch (error) {
        // we were hoping for error 'ENOENT' all along
        if (error.code !== 'ENOENT') this.error(error.message);
      }
    }

    if (whatIf) outDebug('Would perform the following actions:\n');
    // second verse, actually write the files
    for (const file of [serviceFile, timerFile]) {
      if (verbose) {
        outDebug(`Write file: ${(verbose === 1 && file.name) || ''}`);
        if (verbose > 1) outDebug(fileBox(file));
      }
      if (!whatIf) writeFileSync(file.name, file.content, {mode: 0o660});
    }

    $.verbose = verbose;
    $.quiet = quiet;
    const cmdLines = [
      ['systemctl', '--user', 'daemon-reload'],
      ['systemctl', '--user', 'enable', '--now', `${name}.timer`],
    ];
    if (timerType === 'timeSpan')
      cmdLines.push(['systemctl', '--user', 'start', `${name}.service`]);

    if (verbose) outDebug('Enable and start timer:');
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

    // Let the user know the timer has been created
    if (verbose) {
      const out = $`systemctl --user status ${name}.timer`;
      if (!out.ok) this.error(`error: ${out.stderr}`);
      console.info(out.stdout);
    } else {
      const out = $`systemctl --user list-timers ${name} -o json`;
      if (!out.ok) this.error(`error: ${out.stderr}`);
      const timerInfo = JSON.parse(out.stdout);
      const {next} = timerInfo[0];
      console.info(
        `Timer created: next run of ${chalk.cyan(name)} in ${chalk.green(getTimeDelta(next))}.`
      );
    }
  };
}

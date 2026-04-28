import type {Command} from 'commander';

import {stdout} from 'node:process';
import {styleText} from 'node:util';
import wrapAnsi from 'wrap-ansi';

import type {GlobalOpts} from './base.ts';

import {writeUnits} from '../lib/file.ts';
import {styles} from '../lib/style.ts';
import {enableTimer} from '../lib/timer.ts';
import {validateExecStart, validateTimer} from '../lib/util.ts';

export type RunOpts = GlobalOpts & {
  execStart: string;
  name: string;
  on: string;
  timerType: 'calendar' | 'timeSpan';
};

type RawRunOpts = {
  name?: string;
  on: string[];
};

export default function addRunCommand(program: Command) {
  return program
    .command('run')
    .alias('new')
    .description('create and start a timer')
    .allowExcessArguments()
    .allowUnknownOption()
    .argument('<command>', 'command to run')
    .requiredOption('--every, --on <schedule...>', 'timer schedule')
    .option(
      '-n, --name <name>',
      'if not specified timer will be named after executable'
    )
    .usage('<command> [options]')
    .addHelpText(
      'after',
      wrapAnsi(
        `
${styleText(['whiteBright', 'bold'], 'Examples:')}
  ${styleText('blue', `${program.name()} run ../../../../../../../../../../bin/true --every 60seconds 79 min 3 hrs --foo=bar`)} \
${styleText('italic', "# runs '/usr/bin/true --foo=bar' every 4hrs 20mins")}
  ${styleText('blue', `${program.name()} run --every 1h /bin/false -n lol-status-degraded -- /bin/false -f -v -v --help`)} \
${styleText('italic', "# runs '/usr/bin/false -f -v -v --help' every hour, names the systemd units 'lol-status-degraded'")}
  ${styleText('blue', `${program.name()} new 'rm -rf / --no-preserve-root' --on '*-2-29' -n os-killer`)} \
${styleText('italic', "# attempts to brick your OS every leap year day, names the units 'os-killer'")}

${styleText(['whiteBright', 'bold'], 'Notes:')}
  Some basic checking and cleanup will be done to parameters: ${styleText('yellow', '<command>')} is checked to confirm it exists and is executable, and resolved into a canonical filename, ${styleText('green', '<schedule...>')} is validated and normalized by systemd-analyze, and can be either a timespan or a calendar event. Parameters should be single quoted if they contain shell metacharacters (calendar events are full of '*-*-*'), but spaces in parameters should generally work correctly without quotes. Unrecognized parameters are assumed to be part of the <command> argument; if parameters recognized by this program are intended to be part of the <command> argument, then either the command argument should be quoted, or the options intended for this program should be provided first and terminated with a '--', as is GNU convention. 

See ${styleText(['whiteBright', 'bold'], 'man systemd.time')} for detailed descriptions of timespan / calendar event formats.`,
        stdout.columns,
        {trim: false}
      )
    )
    .hook('preAction', validate) // run input validation here since we can be async
    .action(action);
}
async function action(this: Command) {
  const execStart = this.args.join(' ');
  const {
    force,
    name,
    on,
    scope = 'user',
    timerType,
    verbose = 0,
    whatIf,
  }: RunOpts = this.optsWithGlobals();

  try {
    if (whatIf)
      console.debug(styles.whatIf('Would perform the following actions:'));
    await writeUnits({
      execStart,
      force,
      name,
      on,
      scope,
      timerType,
      verbose,
      whatIf,
    });
    await enableTimer(name, timerType, {scope, verbose, whatIf});
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    this.error(error.message);
  }
}

// a better name might be validateAndNormalize
async function validate(program: Command) {
  try {
    // it's a little barbaric to just stomp on input parameters,
    // but we don't need the original values anymore
    program.args[0] = await validateExecStart(program.args[0]);
    const rawOpts: RawRunOpts = program.opts();
    Object.assign(program.opts(), await validateTimer(rawOpts.on.join(' ')));
    if (!rawOpts.name)
      // hack the path and args off the execStart line if we don't have a name
      Object.assign(program.opts(), {name: program.args[0].split('/').pop()});
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    program.error(error.message);
  }
}

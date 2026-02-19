// commander binds "this" to the command object
/* eslint-disable no-invalid-this */
import {writeUnits} from '#lib/file.js';
import {cout} from '#lib/style.js';
import {enableTimer} from '#lib/timer.js';
import {validateExecStart, validateTimer} from '#lib/util.js';
import chalk from 'chalk';
import {stdout} from 'node:process';
import wrapAnsi from 'wrap-ansi';

export default function addRunCommand(program) {
  return program
    .command('run')
    .alias('new')
    .description('create and start a timer')
    .allowExcessArguments()
    .allowUnknownOption()
    .argument('<command>', 'command to run')
    .requiredOption('--every, --on <schedule...>', 'timer schedule')
    .hook('preAction', async (program) => {
      // run input validation here sync we can be async
      try {
        // it's a little barbaric to be mutating the input parameters, but we
        // don't need the original values anymore
        program.args[0] = await validateExecStart(program.args[0]);
        Object.assign(
          program.opts(),
          await validateTimer(program.opts().on.join(' '))
        );
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
      wrapAnsi(
        `
${chalk.whiteBright.bold('Examples:')}
  ${chalk.blue(`${program.name()} run ../../../../../../../../../../bin/true --every 60seconds 79 min 3 hrs --foo=bar`)} \
${chalk.italic(`# runs '/usr/bin/true --foo=bar' every 4hrs 20mins`)}
  ${chalk.blue(`${program.name()} run --every 1h /bin/false -n lol-status-degraded -- /bin/false -f -v -v --help`)} \
${chalk.italic(`# runs ;/usr/bin/false -f -v -v --help' every hour, names the systemd units 'lol-status-degraded`)}
  ${chalk.blue(`${program.name()} new 'rm -rf / --no-preserve-root' --on '*-2-29' -n os-killer`)} \
${chalk.italic('# attempts to brick your OS every leap year day, names the units "os-killer"')}

${chalk.whiteBright.bold('Notes:')}
  Some basic checking and cleanup will be done to parameters: ${chalk.yellow('<command>')} is checked to confirm it exists and is executable, and resolved into a canonical filename, ${chalk.green('<schedule...>')} is validated and normalized by systemd-analyze, and can be either a timespan or a calendar event. Parameters should be single quoted if they contain shell metacharacters (calendar events are full of '*-*-*'), but spaces in parameters should generally work correctly without quotes. Unrecognized parameters are assumed to be part of the <command> argument; if parameters recognized by this program are intended to be part of the <command> argument, then either the command argument should be quoted, or the options intended for this program should be provided first and terminated with a '--', as is GNU convention. 

See ${chalk.whiteBright.bold('man systemd.time')} for detailed descriptions of timespan / calendar event formats.`,
        stdout.columns,
        {trim: false}
      )
    )
    .action(action);
}

async function action() {
  const execStart = this.args.join(' ');

  const {force, on, quiet, timerType, verbose, whatIf} = this.optsWithGlobals();

  cout.whatIf = whatIf;

  // hack the path and args off the execStart line if we don't have a name
  const name =
    this.optsWithGlobals()?.name || execStart.split(' ')[0].split('/').pop();

  try {
    await writeUnits({
      execStart,
      force,
      name,
      on,
      quiet,
      timerType,
      verbose,
      whatIf,
    });

    await enableTimer({name, quiet, timerType, verbose, whatIf});
  } catch (error) {
    this.error(error);
  }
}

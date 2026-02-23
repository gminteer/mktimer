// commander binds "this" to the command object

import {removeUnits} from '#lib/file.js';
import {cout} from '#lib/style.js';
import {disableTimer, listTimers} from '#lib/timer.js';
import chalk from 'chalk';

export default function addRemoveCommand(program) {
  return program
    .command('remove')
    .alias('rm')
    .description('remove a timer')
    .argument('<timer>', 'name of timer')
    .action(action);
}

async function action(name, _, program) {
  const {context, quiet, verbose, whatIf} = program.optsWithGlobals();

  cout.whatIf = whatIf;

  let timer;
  try {
    timer = await listTimers({filter: name});
    if (timer.length > 1)
      program.error(`${chalk.cyan(name)} matched multiple timers`);
    if (timer.length === 0) program.error(`no timer named ${chalk.cyan(name)}`);
    timer = timer[0];

    if (whatIf) cout.debug('Would perform the following actions:');

    await disableTimer({context, name: timer.unit, verbose, whatIf});
    await removeUnits({
      context,
      service: timer.activates,
      timer: timer.unit,
      verbose,
      whatIf,
    });
  } catch (error) {
    program.error(error);
  }
  if (!whatIf && !quiet) console.info(`Timer: ${chalk.cyan(name)} removed.`);
}

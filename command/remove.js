// commander binds "this" to the command object

import {rmUnits} from '#lib/file.js';
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
  const {quiet, verbose, whatIf} = program.optsWithGlobals();

  cout.whatIf = whatIf;

  let timer;
  try {
    timer = await listTimers({filter: name});
    if (timer.length > 1) program.error(`${name} matched multiple timers`);
    timer = timer[0];

    if (whatIf) cout.debug('Would perform the following actions:');

    await disableTimer(timer.unit, {verbose, whatIf});
    await rmUnits({
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

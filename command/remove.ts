import type {Command} from 'commander';

import {styleText} from 'node:util';

import type {GlobalOpts} from './base.ts';

import {removeUnits} from '../lib/file.ts';
import {styles} from '../lib/style.ts';
import {disableTimer, listTimers} from '../lib/timer.ts';

export default function addRemove(program: Command) {
  return program
    .command('remove')
    .alias('rm')
    .description('remove a timer')
    .argument('<timer>', 'name of timer')
    .action(action);
}

async function action(this: Command) {
  const name = this.args[0];
  const {scope, verbose = 0, whatIf}: GlobalOpts = this.optsWithGlobals();

  let timer;
  try {
    timer = await listTimers(name, {scope});
    if (timer.length > 1)
      this.error(`${styleText('cyan', name)} matched multiple timers`);
    if (timer.length === 0)
      this.error(`no timer named ${styleText('cyan', name)}`);
    timer = timer[0];

    if (whatIf)
      console.debug(styles.whatIf('Would perform the following actions:'));

    await disableTimer(timer.unit, {scope, verbose, whatIf});
    await removeUnits(timer.activates, timer.unit, {
      scope,
      verbose,
      whatIf,
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    this.error(error.message);
  }
  if (!whatIf && verbose)
    console.info(`Timer: ${styleText('cyan', name)} removed.`);
}

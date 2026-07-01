import type {Command} from 'commander';

import {ProcessOutput} from 'zx';

import type {GlobalOpts} from './base.ts';

import {formatDetails} from '../lib/style.ts';
import {getTimerDetails} from '../lib/timer.ts';
import {spawnPager} from '../lib/util.ts';

export default function addShow(program: Command) {
  return program
    .command('show')
    .alias('info')
    .description('show details')
    .argument('<timer>', 'timer to display')
    .action(action);
}

async function action(this: Command) {
  const timer = this.args[0];
  const {pager, scope = 'user'}: GlobalOpts = this.optsWithGlobals();

  let details;
  try {
    details = await getTimerDetails(timer, scope, false);
  } catch (error) {
    if (!(error instanceof ProcessOutput)) throw error;
    this.error(error.stderr);
  }
  if (typeof details.timer !== 'string')
    throw new Error('invalid timer details');

  details = await formatDetails(details.timer);
  if (pager) spawnPager(details);
  else console.info(details);
}

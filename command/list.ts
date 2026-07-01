import {Command, Option} from 'commander';
import {styleText} from 'node:util';

import type {GlobalOpts} from './base.ts';

import {formatTimerList, styles} from '../lib/style.ts';
import {getTimerDetails, listTimers, type Timer} from '../lib/timer.ts';
import {getDurationStr} from '../lib/util.ts';

export type ListOpts = GlobalOpts & {
  all?: boolean;
  onlyTransient?: boolean;
  showTransient?: boolean;
};

export default function addList(program: Command) {
  return program
    .command('list')
    .alias('ls')
    .description('lists timers')
    .argument('[filter]', 'only display timers matching [filter]')
    .option('-t, --show-transient', 'show transient timers')
    .addOption(
      new Option('-a, --all', 'show all timers').implies({showTransient: true})
    )
    .addOption(
      new Option('-T, --only-transient', 'only show transient timers')
        .implies({showTransient: true})
        .conflicts('all')
    )
    .action(action);
}

async function action(this: Command) {
  const filter: string = this.args[0];
  const {all, onlyTransient, scope, showTransient, verbose}: ListOpts =
    this.optsWithGlobals();
  const timers = await listTimers(filter, {all, scope});

  if (timers.length === 0) this.error(`No timers match "${filter}".`);

  const displayList = await buildDisplayList(timers, {
    all,
    onlyTransient,
    scope,
    showTransient,
    verbose,
  });

  console.info(formatTimerList(displayList));
}

const debugOut = (str: string) => {
  console.debug(styles.debug(str));
};

async function buildDisplayList(
  timers: Timer[],
  {all, onlyTransient, scope = 'user', showTransient, verbose}: ListOpts
) {
  const displayList = [];
  for (const timer of timers) {
    const info = await getTimerDetails(timer.unit, scope);
    if (typeof info.timer === 'string' || typeof info.service === 'string')
      throw new Error('invalid timer details');
    if (!showTransient && info.timer.transient === 'yes') {
      if (verbose) debugOut(`Skipping transient timer: ${timer.unit}`);
      continue;
    }
    if (onlyTransient && info.timer.transient === 'no') {
      if (verbose) debugOut(`Skipping non-transient timer: ${timer.unit}`);
      continue;
    }
    if (info.timer.activeState === 'inactive' && !all) {
      if (verbose) debugOut(`Skipping inactive timer: ${timer.unit}`);
      continue;
    }

    let execStart;
    if (info.service.execStart) {
      execStart = info.service.execStart
        .split(';')
        .find((token) => token.includes('argv[]='))
        ?.split('=');
      if (!execStart) throw new Error('invalid execStart line');
      execStart.shift();
      execStart = execStart.join('=');
    } else {
      execStart = '<unknown>';
    }
    const timerName = timer.unit.split('.')[0];
    const serviceName = timer.activates.split('.')[0];
    const units =
      (serviceName &&
        timerName !== serviceName &&
        `${timerName} ${styleText('yellowBright', `→ ${serviceName}`)}`) ||
      timerName;

    // there are "left" and "passed" fields in the output from systemd, but
    // they don't appear to work ("left" is the same value as next; "passed"
    // might be a duration but it isn't in microseconds since now), so we'll
    // just work those values out ourselves
    // TODO: sometimes the one transient timer on my system doesn't have a
    // next run scheduled (seems to happen right after it's run) and I'm not
    // sure why (it looks like it runs every 5 seconds)
    const next = (timer.next && getDurationStr(timer.next)) || 'never';
    const last = (timer.last && getDurationStr(timer.last)) || 'never';

    displayList.push({execStart, last, next, units});
  }
  displayList.sort((a, b) => a.units.localeCompare(b.units));
  return displayList;
}

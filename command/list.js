// commander binds "this" to the command object
/* eslint-disable no-invalid-this */
import {Temporal} from '@js-temporal/polyfill';
import chalk from 'chalk';
import {Option} from 'commander';
import TtyTable from 'tty-table';

export default function addListCommand({action, program}) {
  return program
    .command('list')
    .alias('ls')
    .description('lists timers')
    .argument('[filter]', 'only display timers matching [filter]')
    .option('-t, --show-transient', 'show transient timers')
    .addOption(new Option('--all', 'show all timers').implies('showTransient'))
    .action(action);
}

export function makeListAction({$}) {
  return function (filter, _, command) {
    const {all, showTransient, verbose} = command.optsWithGlobals();
    const cmdLine = ['systemctl', '--user', '--output', 'json', 'list-timers'];
    if (all) cmdLine.push('--all');
    if (filter) cmdLine.push(filter);
    const out = $`${cmdLine}`;
    if (!out.ok) command.error(out.stderr);

    const rawTimers = JSON.parse(out);
    const timers = [];
    for (const timer of rawTimers) {
      const timerInfo = $`systemctl --user show ${timer.unit}`;
      if (!timerInfo.ok) this.error(timerInfo.stderr);
      const serviceInfo = $`systemctl --user show ${timer.activates}`;
      if (!serviceInfo.ok) this.error(serviceInfo.stderr);

      const isTransient = timerInfo.stdout
        .split('\n')
        .includes('Transient=yes');
      if (isTransient && !showTransient) {
        if (verbose) console.debug(`Skipping transient timer: ${timer.unit}`);
        continue;
      }

      const execStart = serviceInfo.stdout
        .split('\n')
        .find((line) => line.includes('ExecStart='))
        .split(';')
        .find((token) => token.includes('argv[]='))
        .split('=')[1];

      const activates =
        (timer.activates.split('.')[0] === timer.unit.split('.')[0] && '⬅️') ||
        timer.activates.split('.')[0];

      // there's a "left" field in the systemctl output that's supposed to be
      // the number of microseconds until the next run, but it's busted in
      // systemd 258 and is always the same value as "next" (timestamp for the
      // next run). oh well it's easy enough to calculate on our end
      const nextRun =
        (timer.next &&
          Temporal.Instant.fromEpochMilliseconds(
            Math.floor(timer.next / 1000)
          )) ||
        'never';
      const timeLeft =
        (nextRun !== 'never' &&
          Temporal.Now.instant()
            .until(nextRun)
            .round({
              largestUnit: 'years',
              relativeTo: Temporal.Now.plainDateISO(),
              smallestUnit: 'seconds',
            })
            .toLocaleString()) ||
        nextRun;

      // I think the "passed" field is similarly borked.
      const lastRun =
        (timer.last &&
          Temporal.Instant.fromEpochMilliseconds(
            Math.floor(timer.last / 1000)
          )) ||
        'never';
      const passed =
        (lastRun !== 'never' &&
          Temporal.Now.instant()
            .since(lastRun)
            .round({
              largestUnit: 'years',
              relativeTo: Temporal.Now.plainDateISO(),
              smallestUnit: 'seconds',
            })
            .toLocaleString()) ||
        lastRun;

      timers.push({
        activates,
        execStart,
        passed,
        timeLeft:
          (typeof timeLeft.round === 'function' &&
            timeLeft
              .round({
                largestUnit: 'years',
                relativeTo: Temporal.Now.plainDateISO(),
                smallestUnit: 'seconds',
              })
              .toLocaleString()) ||
          timeLeft,
        timer: timer.unit.split('.')[0],
      });
    }
    timers.sort((a, b) => a.timer.localeCompare(b.timer));

    const table = new TtyTable(
      [
        {
          alias: chalk.bold('Timer'),
          align: 'right',
          color: 'cyan',
          headerAlign: 'right',
          headerColor: 'cyanBright',
          value: 'timer',
        },
        {
          alias: chalk.bold('Service'),
          color: 'blue',
          headerColor: 'blueBright',
          value: 'activates',
        },
        {
          alias: chalk.bold('Runs'),
          color: 'yellow',
          headerColor: 'yellowBright',
          value: 'execStart',
        },
        {
          alias: chalk.bold('Last'),
          align: 'left',
          color: 'green',
          formatter: function (value) {
            return value === 'never'
              ? this.style(value, 'redBright')
              : `${value} ago`;
          },
          headerAlign: 'left',
          headerColor: 'greenBright',
          value: 'passed',
        },
        {
          alias: chalk.bold('Next'),
          align: 'left',
          color: 'magenta',
          formatter: function (value) {
            return value === 'never'
              ? this.style(value, 'redBright')
              : `in ${value}`;
          },
          headerAlign: 'left',
          headerColor: 'magentaBright',
          value: 'timeLeft',
        },
      ],
      timers,
      {borderColor: 'gray', compact: true}
    );
    console.info(table.render());
  };
}

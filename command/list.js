import {Temporal} from '@js-temporal/polyfill';
import chalk from 'chalk';
import TtyTable from 'tty-table';

export default function addListCommand({action, program}) {
  return program
    .command('list')
    .alias('ls')
    .description('lists timers')
    .argument('[filter]', 'only display timers matching [filter]')
    .addHelpText('after')
    .action(action);
}

export function makeListAction({$}) {
  return function (filter, _, command) {
    const cmdLine = ['systemctl', '--user', '--output', 'json', 'list-timers'];
    if (filter) cmdLine.push(filter);
    const out = $`${cmdLine}`;
    if (!out.ok) command.error(out.stderr);

    const rawTimers = JSON.parse(out);
    const timers = [];
    for (const timer of rawTimers) {
      const nextRun =
        (timer.next &&
          Temporal.Instant.fromEpochMilliseconds(
            Math.floor(timer.next / 1000)
          )) ||
        'never';
      const timeLeft =
        (nextRun !== 'never' && Temporal.Now.instant().until(nextRun)) ||
        nextRun;
      const activates =
        (timer.activates.split('.')[0] === timer.unit.split('.')[0] && '<-') ||
        timer.activates.split('.')[0];
      timers.push({
        activates,
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
          alias: chalk.bold('Unit'),
          color: 'blue',
          headerColor: 'blueBright',
          value: 'activates',
        },
        {
          alias: chalk.bold('Next run in'),
          align: 'left',
          color: 'magenta',
          formatter: function (value) {
            return value === 'never'
              ? this.style(value, 'yellowBright')
              : value;
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

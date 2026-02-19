// commander binds "this" to the command object

import {cout} from '#lib/style.js';
import {getTimerDetails, listTimers} from '#lib/timer.js';
import {getDurationStr} from '#lib/util.js';
import chalk from 'chalk';
import {Option} from 'commander';
import TtyTable from 'tty-table';

export default function addListCommand(program) {
  return program
    .command('list')
    .alias('ls')
    .description('lists timers')
    .argument('[filter]', 'only display timers matching [filter]')
    .option('-t, --show-transient', 'show transient timers')
    .addOption(
      new Option('-a, --all', 'show all timers').implies('showTransient')
    )
    .addOption(
      new Option('-T, --only-transient', 'only show transient timers')
        .implies('showTransient')
        .conflicts('all')
    )
    .action(action);
}

async function action(filter, _, program) {
  const {all, onlyTransient, showTransient, verbose} =
    program.optsWithGlobals();
  const timerList = await listTimers({all, filter});

  if (timerList.length === 0) program.error(`No timers match "${filter}".`);

  const displayList = [];
  for (const timer of timerList) {
    let info;
    try {
      info = await getTimerDetails({timer: timer.unit});
    } catch (error) {
      program.error(error);
    }

    if (!showTransient && info.timer.transient === 'yes') {
      if (verbose) cout.debug(`Skipping transient timer: ${timer.unit}`);
      continue;
    }
    if (onlyTransient && info.timer.transient === 'no') {
      if (verbose) cout.debug(`Skipping non-transient timer: ${timer.unit}`);
      continue;
    }

    let execStart = info.service.execStart
      .split(';')
      .find((token) => token.includes('argv[]='))
      .split('=');
    execStart.shift();
    execStart = execStart.join('=');

    const timerName = timer.unit.split('.')[0];
    const serviceName = timer.activates.split('.')[0];
    const units =
      (timerName !== serviceName &&
        `${timerName} ${chalk.yellowBright(`→ ${serviceName}`)}`) ||
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

  const table = new TtyTable(
    [
      {
        alias: chalk.bold('Units'),
        align: 'right',
        color: 'cyan',
        headerAlign: 'right',
        headerColor: 'cyanBright',
        value: 'units',
      },
      {
        alias: chalk.bold('Run'),
        color: 'blue',
        headerColor: 'blueBright',
        value: 'execStart',
      },
      {
        alias: chalk.bold('Last'),
        align: 'left',
        color: 'green',
        formatter: function (value) {
          return value === 'never'
            ? this.style(value, 'redBright')
            : `+${value}`;
        },
        headerAlign: 'left',
        headerColor: 'greenBright',
        value: 'last',
      },
      {
        alias: chalk.bold('Next'),
        align: 'left',
        color: 'magenta',
        formatter: function (value) {
          return value === 'never' ? this.style(value, 'redBright') : value;
        },
        headerAlign: 'left',
        headerColor: 'magentaBright',
        value: 'next',
      },
    ],
    displayList,
    {borderColor: 'gray', compact: true}
  );

  console.info(table.render());
}

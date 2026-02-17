// commander binds "this" to the command object

import {getTimeDelta} from '#lib/utils.js';
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
    .addOption(
      new Option('-a, --all', 'show all timers').implies('showTransient')
    )
    .action(action);
}

export function makeListAction({$, getTimerInfo}) {
  return function (filter, _, program) {
    const {all, showTransient, verbose} = program.optsWithGlobals();
    const cmdLine = ['systemctl', '--user', '--output', 'json', 'list-timers'];
    if (all) cmdLine.push('--all');
    if (filter) cmdLine.push(filter);
    const out = $`${cmdLine}`;
    if (!out.ok) program.error(out.stderr);

    const rawTimers = JSON.parse(out);
    if (rawTimers.length === 0)
      program.error(`No timers matching "${filter}" found.`);

    const timers = [];
    for (const timer of rawTimers) {
      let timerInfo;
      try {
        timerInfo = getTimerInfo(timer.unit, {details: true});
      } catch (error) {
        program.error(error);
      }

      const isTransient = timerInfo.timerDetails
        .split('\n')
        .includes('Transient=yes');
      if (!showTransient && isTransient) {
        if (verbose) console.debug(`Skipping transient timer: ${timer.unit}`);
        continue;
      }

      // slicing and dicing for the ExecStart line in the .service unit
      let execStart = timerInfo.serviceDetails
        .split('\n')
        .find((line) => line.includes('ExecStart='))
        .split(';')
        .find((token) => token.includes('argv[]='))
        .split('=');
      // throw out everything before and including the first '=' character, but
      // we should probably restore the rest of them because they were part of
      // the ExecStart line
      execStart.shift();
      execStart = execStart.join('=');

      const timerName = timer.unit.split('.')[0];
      const serviceName = timer.activates.split('.')[0];
      const units =
        (timerName !== serviceName &&
          `${timerName} ${chalk.yellowBright(`→ ${serviceName}`)}`) ||
        timerName;

      // there are "left" and "passed" fields in the output from systemd, but
      // I don't think they actually work correctly ("left" clearly doesn't
      // it's the same as "next", "passed" looks like a timeDelta but it
      // isn't microseconds since now which is what I'd expect it to be
      const next = (timer.next && getTimeDelta(timer.next)) || 'never';
      const last = (timer.last && getTimeDelta(timer.last)) || 'never';

      timers.push({execStart, last, next, units});
    }
    timers.sort((a, b) => a.units.localeCompare(b.units));

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
      timers,
      {borderColor: 'gray', compact: true}
    );

    console.info(table.render());
  };
}

// commander binds "this" to the command object
/* eslint-disable no-invalid-this */
import chalk from 'chalk';

import {verboseStyle, whatIfStyle} from '../lib/styles.js';
export default function addRemoveCommand({action, program}) {
  return program
    .command('remove')
    .alias('rm')
    .description('remove a timer')
    .argument('<timer>', 'name of timer')
    .action(action);
}

export function makeRemoveAction({$, env, getTimerInfo, rmSync}) {
  return function (name, _, program) {
    const {quiet, verbose, whatIf} = program.optsWithGlobals();

    $.quiet = quiet;
    $.verbose = verbose;
    const outDebug = whatIf
      ? (str) => console.debug(whatIfStyle(str))
      : (str) => console.debug(verboseStyle(str));

    let timerInfo;
    try {
      timerInfo = getTimerInfo(name);
    } catch (error) {
      program.error(error);
    }
    if (whatIf) outDebug('Would perform the following actions:');

    if (verbose) outDebug('Disable timer:');
    if (whatIf) {
      outDebug(`systemctl --user disable ${timerInfo.unit} --now`);
    } else {
      const out = $`systemctl --user disable ${timerInfo.unit} --now`;
      if (!out.ok) this.error(timerInfo.stderr);
    }
    if (verbose) outDebug('Remove units:');
    const fileNames = [
      `${env.HOME}/.config/systemd/user/${timerInfo.unit}`,
      `${env.HOME}/.config/systemd/user/${timerInfo.activates}`,
    ];
    for (const file of fileNames) {
      if (verbose) outDebug(file);
      if (!whatIf) rmSync(file);
    }
    if (!whatIf) console.info(`Timer: ${chalk.cyan(name)} removed.`);
  };
}

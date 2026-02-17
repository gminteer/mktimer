// commander binds "this" to the command object
/* eslint-disable no-invalid-this */
import {cout} from '#lib/styles.js';
import chalk from 'chalk';

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

    const $$ = $({quiet, verbose});
    cout.whatIf = whatIf;

    let timerInfo;
    try {
      timerInfo = getTimerInfo(name);
    } catch (error) {
      program.error(error);
    }
    if (whatIf) cout.debug('Would perform the following actions:');

    if (verbose) cout.debug('Disable timer:');
    if (whatIf) {
      cout.debug(`systemctl --user disable ${timerInfo.unit} --now`);
    } else {
      const out = $$`systemctl --user disable ${timerInfo.unit} --now`;
      if (!out.ok) this.error(timerInfo.stderr);
    }
    if (verbose) cout.debug('Remove units:');
    const fileNames = [
      `${env.HOME}/.config/systemd/user/${timerInfo.unit}`,
      `${env.HOME}/.config/systemd/user/${timerInfo.activates}`,
    ];
    for (const file of fileNames) {
      if (verbose) cout.debug(file);
      if (!whatIf) rmSync(file);
    }
    if (!whatIf) console.info(`Timer: ${chalk.cyan(name)} removed.`);
  };
}

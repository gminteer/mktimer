// commander binds "this" to the command object
/* eslint-disable no-invalid-this */
export default function addRemoveCommand({action, program}) {
  return program
    .command('remove')
    .alias('rm')
    .description('remove a timer')
    .argument('<timer>', 'name of timer')
    .action(action);
}

export function makeRemoveAction({$}) {
  return function (name) {
    const timerInfo = $`systemctl --user list-timers ${name}`;
    if (!timerInfo.ok) this.error(timerInfo.stderr);
    if (timerInfo.stdout.split('\n').includes('0 timers listed.'))
      this.error(`error: couldn't find timer named "${name}"`);
  };
}

// import {Command} from 'commander';

// import addGlobals from '../lib/global-options.js';

export function makeListAction($) {
  return function (filter, options, command) {
    const out = $`systemctl --user --output json list-timers ${filter}`;
    if (!out.ok) command.error(out.stderr);
    const timers = JSON.parse(out);
    for (const timer of timers) {
      console.debug(timer);
      const timestamp = new Date(timer.next / 1000).toLocaleString();
      console.debug(timestamp);
    }
  };
}

// export default function makeListCommand() {
//   return addGlobals(new Command())
//     .name('list')
//     .alias('ls')
//     .description('lists timers')
//     .argument('[filter]', 'only display timers matching [filter]');
// }

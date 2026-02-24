import {cout, showCommand} from '#lib/style.js';
import {getDurationStr} from '#lib/util.js';
import chalk from 'chalk';
import {$} from 'zx';

$.quiet = true;

export async function disableTimer({
  context = 'user',
  name,
  verbose = false,
  whatIf = false,
} = {}) {
  if (verbose) {
    $.verbose = true;
    $.quiet = false;
  }
  const command = ['systemctl', `--${context}`, 'disable', name, '--now'];
  if (verbose) cout.debug('Disable timer:');
  if (whatIf) return await showCommand(command.join(' '));
  return await $`${command}`;
}

export async function enableTimer({
  context = 'user',
  name,
  quiet = false,
  timerType,
  verbose = false,
  whatIf = false,
} = {}) {
  if (verbose) {
    $.verbose = true;
    $.quiet = false;
  }
  const commands = [
    ['systemctl', `--${context}`, 'daemon-reload'],
    ['systemctl', `--${context}`, 'enable', `${name}.timer`, '--now'],
  ];
  if (timerType === 'timeSpan')
    commands.push(['systemctl', `--${context}`, 'start', `${name}.service`]);
  if (verbose) cout.debug('Enable timer:');
  for (const command of commands) {
    if (whatIf) showCommand(command.join(' '));
    else await $`${command}`;
  }
  if (quiet || whatIf) return;
  // Let the user know the timer has been created
  let timer = await listTimers({filter: name});
  if (timer.length !== 1) throw new Error(`${name} matched multiple timers?!`);
  timer = timer[0];
  cout.info(
    `Timer created: ${chalk.cyan(name)} will run in ${chalk.green(getDurationStr(timer.next))}.`
  );
}

export async function getTimerDetails({context = 'user', json = true, timer}) {
  $.verbose = true;
  let output = await $`systemctl --${context} show ${timer}`;
  const details = {
    timer: (json && showToJSON(output.stdout)) || output.stdout,
  };
  const service = details.timer.unit;
  output = await $`systemctl --${context} show ${service}`;
  details.service = (json && showToJSON(output.stdout)) || output.stdout;
  return details;
}

export async function listTimers({
  all = false,
  context = 'user',
  filter = '',
} = {}) {
  const command = [
    'systemctl',
    `--${context}`,
    '--output',
    'json',
    'list-timers',
  ];
  if (all) command.push('--all');
  if (filter) command.push(filter);

  const {stdout} = await $`${command}`;
  const timers = JSON.parse(stdout);
  return timers;
}

function showToJSON(info) {
  const json = {};
  for (const line of info.split('\n')) {
    const tokens = line.split('=');
    let key = tokens.shift();
    key = key.charAt(0).toLowerCase() + key.slice(1);
    const value = tokens.join('=');
    // eslint-disable-next-line security/detect-object-injection
    json[key] = value;
  }
  return json;
}

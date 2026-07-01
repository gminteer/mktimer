import {styleText} from 'node:util';
import {$} from 'zx';

import type {GlobalOpts} from '../command/base.ts';
import type {ListOpts} from '../command/list.ts';

import {formatCommand, styles} from '../lib/style.ts';
import {getDurationStr} from '../lib/util.ts';

$.quiet = true;

export type Timer = {
  activates: string;
  last: number;
  left: null | number;
  next: null | number;
  passed: number;
  unit: string;
};

export async function disableTimer(
  name: string,
  {scope = 'user', verbose, whatIf}: GlobalOpts
) {
  if (verbose) {
    $.verbose = true;
    $.quiet = false;
  }
  const style = whatIf ? styles.whatIf : styles.debug;

  const command = ['systemctl', `--${scope}`, 'disable', name, '--now'];

  if (verbose) console.debug(style('Disable timer:'));
  if (whatIf) console.debug(style(await formatCommand(command.join(' '))));
  else await $`${command}`;
}

export async function enableTimer(
  name: string,
  timerType: 'calendar' | 'timeSpan',
  {scope = 'user', verbose = 0, whatIf}: GlobalOpts
) {
  if (verbose) {
    $.verbose = true;
    $.quiet = false;
  }
  const style = whatIf ? styles.whatIf : styles.debug;

  const commands = [
    ['systemctl', `--${scope}`, 'daemon-reload'],
    ['systemctl', `--${scope}`, 'enable', `${name}.timer`, '--now'],
  ];
  if (timerType === 'timeSpan')
    commands.push(['systemctl', `--${scope}`, 'start', `${name}.service`]);

  if (verbose) console.debug(style('Enable timer:'));
  for (const command of commands) {
    if (whatIf) console.debug(style(await formatCommand(command.join(' '))));
    else await $`${command}`;
  }
  if (verbose < 0 || whatIf) return;

  // Let the user know when the timer's going to run
  const timers = await listTimers(name, {scope});
  if (timers.length !== 1) throw new Error(`${name} matched multiple timers?!`);
  const timer = timers.shift();
  if (!timer || timer.next === null)
    throw new Error(`${name} created but has no next run?!`);
  console.info(
    `Timer created: ${styleText('cyan', name)} will run in ${styleText('green', getDurationStr(timer.next))}.`
  );
}

export async function getTimerDetails(
  name: string,
  scope: 'system' | 'user' = 'user',
  json = true
) {
  let output = await $`systemctl --${scope} show ${name}`;
  const timer = json ? showToJSON(output.stdout) : output.stdout;

  const serviceName =
    typeof timer === 'string'
      ? timer
          .split('\n')
          .find((line) => line.includes('Unit'))
          ?.split('=')
          .pop()
      : timer.unit;

  if (!serviceName) throw new Error("Couldn't figure out service name!");
  output = await $`systemctl --${scope} show ${serviceName}`;
  const service = json ? showToJSON(output.stdout) : output.stdout;
  return {service, timer};
}

export async function listTimers(
  filter: string,
  {all, scope = 'user'}: ListOpts
) {
  const command = ['systemctl', `--${scope}`, '--output=json', 'list-timers'];
  if (all) command.push('--all');
  if (filter) command.push(filter);

  const {stdout} = await $`${command}`;
  const timers = JSON.parse(stdout) as Timer[];
  return timers;
}

function showToJSON(info: string) {
  const json: {[key: string]: string} = {};
  for (const line of info.split('\n')) {
    const tokens = line.split('=');
    let key = tokens.shift();
    if (!key) continue;
    key = key.charAt(0).toLowerCase() + key.slice(1);
    const value = tokens.join('=');
    // eslint-disable-next-line security/detect-object-injection
    json[key] = value;
  }
  return json;
}

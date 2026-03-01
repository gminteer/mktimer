import {debugStyle, warnStyle, whatIfStyle} from '#lib/style.js';
import {Temporal} from '@js-temporal/polyfill';
import {InvalidArgumentError} from 'commander';
import {spawn} from 'node:child_process';
import {access, constants, realpath} from 'node:fs/promises';
import {env, stdout} from 'node:process';
import {$} from 'zx';

$.quiet = true;

export function getDurationStr(timeStamp, {unit = 'microseconds'} = {}) {
  // setting this up in case we need to handle timeStamps that aren't in µs
  // in the future
  if (unit !== 'microseconds') throw new Error(`Unsupported unit: ${unit}`);
  let duration = Temporal.Now.instant()
    .since(Temporal.Instant.fromEpochMilliseconds(Math.floor(timeStamp / 1000)))
    .round({
      largestUnit: 'years',
      relativeTo: Temporal.Now.plainDateISO(),
      roundingMode: 'expand',
      smallestUnit: 'milliseconds',
    });
  if (
    Temporal.Duration.compare(
      duration.abs(),
      Temporal.Duration.from({milliseconds: 500})
    ) > 0
  ) {
    duration = duration.round({
      roundingMode: 'expand',
      smallestUnit: 'seconds',
    });
  }
  if (
    Temporal.Duration.compare(
      duration.abs(),
      Temporal.Duration.from({seconds: 30})
    ) > 0
  ) {
    duration = duration.round({
      roundingMode: 'expand',
      smallestUnit: 'minutes',
    });
  }
  return duration.toLocaleString(undefined, {style: 'narrow'});
}

export function printLn({channel, content, pager = false} = {}) {
  const outFn = pager ? spawnPager : console.log;
  switch (channel) {
    case 'debug': {
      return outFn(debugStyle(content));
    }
    case 'info': {
      return outFn(content);
    }
    case 'warn': {
      return outFn(warnStyle(content));
    }
    case 'whatIf': {
      return outFn(whatIfStyle(content));
    }
    default: {
      throw new Error('invalid context');
    }
  }
}

export function spawnPager(content) {
  if (!stdout.isTTY) return;
  const pagerExec = env.PAGER || 'less';
  const pager = spawn(`cat <<< "${content}" | ${pagerExec}`, {
    shell: true,
    stdio: 'inherit',
  });
  pager.on('error', (error) => {
    throw error;
  });
}

export function unitPath(context) {
  switch (context) {
    case 'system': {
      return '/etc/systemd/system/';
    }
    case 'user': {
      return `${env.HOME}/.config/systemd/user/`;
    }
    default: {
      throw new Error('invalid context');
    }
  }
}

export async function validateExecStart(value) {
  const {R_OK, X_OK} = constants;
  const tokens = value.split(' ');
  const baseName = tokens.shift();
  await access(baseName, R_OK | X_OK);
  // replace the user provided filename with the canonical form
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  tokens.unshift(await realpath(baseName));
  return tokens.join(' ');
}
export async function validateTimer(value) {
  // systemd-analyze uses a different field name depending on which
  // kind of timer we're analyzing
  const wantedField = {calendar: 'Normalized', timeSpan: 'Human'};

  let out;
  let timerType;
  try {
    out = await $`systemd-analyze timespan ${value}`;
    timerType = 'timeSpan';
  } catch (error) {
    // it's handy that it if you ask it to analyze a timespan but give it
    // a calendar, it tells you in the error it's a valid calendar
    if (!error.stderr.includes('valid calendar'))
      throw new InvalidArgumentError(error.stderr);
    out = await $`systemd-analyze calendar ${value}`;
    timerType = 'calendar';
  }
  // systemd-analyze doesn't do JSON :(
  let parsed = out.stdout
    .split('\n')
    // eslint-disable-next-line security/detect-object-injection
    .find((line) => line.includes(wantedField[timerType]));
  parsed = /:(.+)/.exec(parsed)[1].trim();

  return {on: parsed, timerType};
}

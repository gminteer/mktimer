import {Temporal} from '@js-temporal/polyfill';
import {InvalidArgumentError} from 'commander';
import {spawn} from 'node:child_process';
import {access, constants as FS_CONSTANTS, realpath} from 'node:fs/promises';
import {env, stdout} from 'node:process';
import {$, ProcessOutput} from 'zx';

$.quiet = true;

export function getDurationStr(
  timeStamp: number,
  {unit = 'microseconds'} = {}
) {
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
  // try to avoid rounding result to zero
  if (
    Temporal.Duration.compare(
      duration.abs(),
      Temporal.Duration.from({milliseconds: 500})
    ) > 0 // explicit > 0 because .compare returns an always truthy object
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

export function spawnPager(content: string) {
  if (!stdout.isTTY) return;
  const pagerExec = env.PAGER || 'less';
  const pager = spawn(`cat <<< "${content}" | ${pagerExec}`, {
    shell: true,
    stdio: 'inherit',
  });
  // doing this because I don't think it'll proper throw the error on its own
  pager.on('error', (error) => {
    throw error;
  });
}

export const scopePath = {
  system: '/etc/systemd/system/',
  // if env.HOME is undefined we're in trouble anyways
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  user: `${env.HOME}/.config/systemd/user`,
};

export async function validateExecStart(value: string) {
  const {R_OK, X_OK} = FS_CONSTANTS;
  const tokens = value.split(' ');
  const baseName = tokens.shift();
  if (!baseName) throw new Error('received null string');
  await access(baseName, R_OK | X_OK);
  // replace the user provided filename with the canonical form
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  tokens.unshift(await realpath(baseName));
  return tokens.join(' ');
}
export async function validateTimer(value: string) {
  // systemd-analyze uses a different field name depending on which
  // kind of timer we're analyzing
  const wantedField = {calendar: 'Normalized', timeSpan: 'Human'};

  let out: ProcessOutput;
  let timerType: 'calendar' | 'timeSpan';
  try {
    out = await $`systemd-analyze timespan ${value}`;
    timerType = 'timeSpan';
  } catch (error) {
    if (!(error instanceof ProcessOutput)) throw error;
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
  if (parsed === undefined)
    throw new Error("couldn't parse systemd-analyze output");
  parsed = /:(.+)/.exec(parsed)?.pop()?.trim();
  if (!parsed) throw new Error('failed to normalize timer');
  return {on: parsed, timerType};
}

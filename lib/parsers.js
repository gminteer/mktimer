import {InvalidArgumentError} from 'commander';
import {constants as FS_CONSTANTS} from 'node:fs';

export function makeParseExecStart(accessSync, realPathSync) {
  return function (value) {
    const {R_OK, X_OK} = FS_CONSTANTS;
    try {
      const tokens = value.split(' ');
      const baseName = tokens.shift();
      accessSync(baseName, R_OK | X_OK);
      // replace the user provided filename with the canonical form
      // (resolve relative paths/symlinks)
      tokens.unshift(realPathSync(baseName));
      return tokens.join(' ');
    } catch (error) {
      throw new InvalidArgumentError(error.message);
    }
  };
}

export function makeParseTimer($) {
  return function (value) {
    // systemd-analyze uses a different field name depending on which
    // kind of timer we're analyzing
    const wantedField = {calendar: 'Normalized', timeSpan: 'Human'};

    let out = $`systemd-analyze timespan ${value}`;
    let timerType = 'timeSpan';

    if (!out.ok) {
      // it's handy that it if you ask it to analyze a timespan but give it
      // a calendar, it tells you in the error it's a valid calendar
      if (!out.stderr.includes('calendar'))
        // the error is just 'invalid', not worth relaying...
        throw new InvalidArgumentError('rejected by systemd-analyze');

      out = $`systemd-analyze calendar ${value}`;
      timerType = 'calendar';
    }
    // systemd-analyze doesn't do JSON output, and uses a different field name
    // depending on the timer time,
    let parsed = out.stdout
      .split('\n')
      // eslint-disable-next-line security/detect-object-injection
      .find((line) => line.includes(wantedField[timerType]));
    parsed = /:(.+)/.exec(parsed)[1].trim();

    return {on: parsed, timerType};
  };
}

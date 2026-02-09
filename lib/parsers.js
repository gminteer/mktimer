import {InvalidArgumentError} from 'commander';
import {constants as FS_CONSTANTS} from 'node:fs';

export function makeParseExecStart(accessSync, realPathSync) {
  return function (value) {
    const {R_OK, X_OK} = FS_CONSTANTS;
    try {
      const tokens = value.split(' ');
      const baseName = tokens.shift();
      accessSync(baseName, R_OK | X_OK);
      tokens.unshift(realPathSync(baseName));
      return tokens.join(' ');
    } catch (error) {
      throw new InvalidArgumentError(error.message);
    }
  };
}

export function makeParseTimer($) {
  return function (value) {
    const wantedField = {calendar: 'Normalized', timeSpan: 'Human'};
    let out = $`systemd-analyze timespan ${value}`;
    let timerType = 'timeSpan';

    if (!out.ok) {
      if (!out.stderr.includes('calendar'))
        throw new InvalidArgumentError('rejected by systemd-analyze');

      out = $`systemd-analyze calendar ${value}`;
      timerType = 'calendar';
    }

    let parsed = out.stdout
      .split('\n')
      // eslint-disable-next-line security/detect-object-injection
      .find((line) => line.includes(wantedField[timerType]));
    parsed = /:(.+)/.exec(parsed)[1].trim();

    return {on: parsed, timerType};
  };
}

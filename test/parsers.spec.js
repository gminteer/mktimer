import {expect} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import {$ as $_} from 'zx';

import {makeParseExecStart, makeParseTimer} from '../lib/parsers.js';
const $ = $_({nothrow: true, sync: true, verbose: true});

function accessSync(file) {
  // returns undefined on success, throws on failure
  if (accessSync.shouldFail) throw new Error('accessSync');
}

function realPathSync(file) {
  // returns canonical pathname on success, throws on failure
  if (realPathSync.shouldFail) throw new Error('realPathSync');
  return `/canonized/${file}`;
}

beforeEach(() => {
  accessSync.shouldFail = false;
  realPathSync.shouldFail = false;
});

describe('parser factory', () => {
  describe('make execStart parser', () => {
    const parseExecStart = makeParseExecStart(accessSync, realPathSync);
    const parse = () => parseExecStart('file');
    it('should return a canonical pathname with arguments respected', () => {
      expect(parseExecStart('file -a --b=foo')).to.equal(
        '/canonized/file -a --b=foo'
      );
    });

    it('should relay error from accessSync', () => {
      accessSync.shouldFail = true;
      expect(parse).to.throw('accessSync');
    });

    it('should relay error from realPathSync', () => {
      realPathSync.shouldFail = true;
      expect(parse).to.throw('realPathSync');
    });
  });

  describe('make timer parser', () => {
    const parseTimer = makeParseTimer($);
    it('should normalize and identify a timespan via systemd-analyze', () => {
      expect(parseTimer('4 hours 20 minutes')).to.deep.equal({
        on: '4h 20min',
        timerType: 'timeSpan',
      });
    });

    it('should normalize and identify a calendar via systemd-analyze', () => {
      expect(parseTimer('*-2-29')).to.deep.equal({
        on: '*-02-29 00:00:00',
        timerType: 'calendar',
      });
    });

    it('should error if systemd-analyze rejects input', () => {
      expect(() => parseTimer('invalid')).to.throw(
        'rejected by systemd-analyze'
      );
    });
  });
});

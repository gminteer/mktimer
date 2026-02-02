import {expect} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import {$ as $_} from 'zx';

import {makeParseExecStart, makeParseTimer} from '../lib/parser-factory.js';
const $ = $_({nothrow: true, sync: true, verbose: true});
const shouldFail = new Map();

function accessSync(file) {
  // returns undefined on success, throws on failure
  if (shouldFail.get(accessSync)) throw new Error('accessSync');
}

function realPathSync(file) {
  // returns canonical pathname on success, throws on failure
  if (shouldFail.get(realPathSync)) throw new Error('realPathSync');
  return `/canonized/${file}`;
}

const option = {
  implies(obj) {
    Object.assign(this.store, obj);
  },
  store: {},
};

beforeEach(() => {
  shouldFail.set(accessSync, false);
  shouldFail.set(realPathSync, false);
  option.store = {};
});

describe('parser factory', () => {
  describe('make execStart parser', () => {
    const parseExecStart = makeParseExecStart(accessSync, realPathSync);
    const parse = () => parseExecStart('file');
    it('should return canonical pathname with arguments respected', () => {
      expect(parseExecStart('file -a --b=foo')).to.equal(
        '/canonized/file -a --b=foo'
      );
    });

    it('should relay error from accessSync', () => {
      shouldFail.set(accessSync, true);
      expect(parse).to.throw('accessSync');
    });

    it('should relay error from realPathSync', () => {
      shouldFail.set(realPathSync, true);
      expect(parse).to.throw('realPathSync');
    });
  });

  describe('make timer parser', () => {
    const parseTimer = makeParseTimer($).bind(option);
    it('should normalize a timespan and imply timerType: timeSpan', () => {
      expect(parseTimer('4 hours 20 minutes')).to.equal('4h 20min');
      expect(option.store.timerType).to.equal('timeSpan');
    });

    it('should normalize a calendar and imply timerType: calendar', () => {
      expect(parseTimer('*-2-29')).to.equal('*-02-29 00:00:00');
      expect(option.store.timerType).to.equal('calendar');
    });

    it('should error if systemd-analyze rejects input', () => {
      expect(() => parseTimer('invalid')).to.throw(
        'rejected by systemd-analyze'
      );
    });
  });
});

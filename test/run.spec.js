/* eslint-disable no-invalid-this */
// "this" is the associated commander Option
import {expect} from 'chai';
import {Command, InvalidArgumentError} from 'commander';
import {beforeEach, describe, it} from 'mocha';
import {spy} from 'sinon';

import addRunCommand, {makeRunAction} from '../command/run.js';
import program from '../lib/common.js';
import {serviceTemplate, timerTemplate} from '../lib/templates.js';

const shouldFail = new Map();
function $() {
  return {ok: !shouldFail.get($), stderr: 'stderr', stdout: 'stdout'};
}

function accessSync(file) {
  // returns undefined on success, throws on failure
  if (shouldFail.get(accessSync)) {
    const error = new Error('accessSync');
    error.code = accessSync.errorCode;
    throw error;
  }
}
accessSync.fileNotFound = () => {
  accessSync.errorCode = 'ENOENT';
  shouldFail.set(accessSync, true);
};

function parseExecStart(value) {
  if (value !== 'validExec')
    throw new InvalidArgumentError('execStart value rejected');
  return `/canonized/${value}`;
}

function parseTimer(value) {
  if (!['validCalendar', 'validTimeSpan'].includes(value))
    throw new InvalidArgumentError('timer value rejected');
  if (value === 'validCalendar') this.implies({timerType: 'calendar'});
  else this.implies({timerType: 'timeSpan'});
  return value === 'validTimeSpan'
    ? 'normalizedTimeSpan'
    : 'normalizedCalendar';
}

let fileContent = {};
function writeFileSync(fileName, content) {
  // returns undefined on success, throws on failure
  if (shouldFail.get(writeFileSync)) throw new Error('writeFileSync');
  // eslint-disable-next-line security/detect-object-injection
  else fileContent[fileName] = content;
}
const env = Object.freeze({HOME: '~'});

beforeEach(() => {
  shouldFail.set(accessSync, false);
  shouldFail.set(writeFileSync, false);
  shouldFail.set($, false);
  accessSync.errorCode = undefined;
  fileContent = {};
});

addRunCommand({
  action: makeRunAction({$, accessSync, env, writeFileSync}),
  parseExecStart,
  parseTimer,
  program,
});
program.commands[0].exitOverride();

describe('run command', () => {
  const parse = () => program.parse(args, {from: 'user'});
  let args;

  describe('smoke test', () => {
    it('should return a program with a "run" subcommand', () => {
      expect(program).to.be.instanceof(Command);
      expect(program.commands[0].name()).to.equal('run');
    });

    it('should error if mandatory arguments are missing or invalid', () => {
      args = ['run'];
      expect(parse).to.throw();

      args = ['run', 'badExec'];
      expect(parse).to.throw();

      args = ['run', 'validExec'];
      expect(parse).to.throw();

      args = ['run', 'validExec', '--on', 'badTimer'];
      expect(parse).to.throw();
    });

    it("shouldn't error if everything goes ok", () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan'];
      accessSync.fileNotFound();
      expect(parse).to.not.throw();
    });
  });

  describe('usage', () => {
    it('should error if asked to overwrite files', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan'];
      expect(parse).to.throw('validExec.service exists');
    });

    it('should overwrite files if passed --force', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan', '--force'];
      expect(parse).to.not.throw();
    });

    it('should warn on overwrite if passed --verbose', () => {
      args = [
        'run',
        'validExec',
        '--on',
        'validTimeSpan',
        '--force',
        '--verbose',
      ];
      const warnSpy = spy(console, 'warn');
      expect(parse).to.not.throw();
      expect(warnSpy.called);
      warnSpy.restore();
    });

    it('should relay error if file writes fail', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan'];
      accessSync.fileNotFound();
      shouldFail.set(writeFileSync, true);
      expect(parse).to.throw('writeFileSync');
    });

    it('should relay error if running systemctl fails', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan'];
      accessSync.fileNotFound();
      shouldFail.set($, true);
      expect(parse).to.throw('stderr');
    });

    it('should name timer as directed', () => {
      args = [
        'run',
        'validExec',
        '--on',
        'validTimeSpan',
        '--name',
        'testName',
      ];
      accessSync.fileNotFound();
      parse();
      for (const fileName of Object.keys(fileContent)) {
        expect(fileName).to.include('testName');
      }
    });

    it("shouldn't produce info output if --quiet", () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan', '--quiet'];
      accessSync.fileNotFound();
      const infoSpy = spy(console, 'info');
      parse();
      expect(infoSpy.notCalled);
      infoSpy.restore();
    });

    it('should produce debug output if --verbose', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan', '--verbose'];
      accessSync.fileNotFound();
      const debugSpy = spy(console, 'debug');
      parse();
      expect(debugSpy.called);
      console.info(`console debug called ${debugSpy.callCount} times`);
      debugSpy.restore();
    });
    it('should console.debug instead of write if --what-if', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan', '--what-if'];
      accessSync.fileNotFound();
      const writeSpy = spy(writeFileSync);
      const debugSpy = spy(console, 'debug');
      parse();
      expect(writeSpy.notCalled);
      expect(debugSpy.called);
      debugSpy.restore();
    });
  });

  describe('output', () => {
    it('should write templates correctly', () => {
      let snapshot = {
        '~/.config/systemd/user/validExec.service': serviceTemplate({
          execStart: '/canonized/validExec',
          name: 'validExec',
        }),
        '~/.config/systemd/user/validExec.timer': timerTemplate({
          name: 'validExec',
          on: 'normalizedTimeSpan',
          timerType: 'timeSpan',
        }),
      };
      args = ['run', 'validExec', '--on', 'validTimeSpan'];
      accessSync.fileNotFound();
      parse();
      expect(fileContent).to.deep.equal(snapshot);

      args = ['run', 'validExec', '--on', 'validCalendar'];
      snapshot = {
        '~/.config/systemd/user/validExec.service': serviceTemplate({
          execStart: '/canonized/validExec',
          name: 'validExec',
        }),
        '~/.config/systemd/user/validExec.timer': timerTemplate({
          name: 'validExec',
          on: 'normalizedCalendar',
          timerType: 'calendar',
        }),
      };
      parse();
      expect(fileContent).to.deep.equal(snapshot);
    });
  });
});

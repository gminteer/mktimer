// "this" is the associated commander Option
import {expect} from 'chai';
import {Command, InvalidArgumentError} from 'commander';
import {beforeEach, describe, it} from 'mocha';
import {spy} from 'sinon';

import addRunCommand, {makeRunAction} from '../command/run.js';
import program from '../lib/common.js';
import {serviceTemplate, timerTemplate} from '../lib/templates.js';

function $() {
  return {ok: !$.shouldFail, stderr: 'stderr', stdout: 'stdout'};
}

function accessSync(file) {
  // returns undefined on success, throws on failure
  if (accessSync.shouldFail) {
    const error = new Error('accessSync');
    error.code = accessSync.errorCode;
    throw error;
  }
}
accessSync.fileNotFound = () => {
  accessSync.errorCode = 'ENOENT';
  accessSync.shouldFail = true;
};

function parseExecStart(value) {
  if (value !== 'validExec') throw new InvalidArgumentError('parseExecStart');
  return '/canonized/validExec';
}

function parseTimer(value) {
  switch (value) {
    case 'valid calendar':
    case 'validCalendar': {
      return {on: 'normalizedCalendar', timerType: 'calendar'};
    }
    case 'valid time span':
    case 'validTimeSpan': {
      return {on: 'normalizedTimeSpan', timerType: 'timeSpan'};
    }
    default: {
      throw new InvalidArgumentError('parseTimer');
    }
  }
}

let fileContent = {};
function writeFileSync(fileName, content) {
  // returns undefined on success, throws on failure
  if (writeFileSync.shouldFail) throw new Error('writeFileSync');
  // eslint-disable-next-line security/detect-object-injection
  fileContent[fileName] = content;
}
const env = Object.freeze({HOME: '~'});

beforeEach(() => {
  program.commands[0].exitOverride();
  accessSync.shouldFail = false;
  accessSync.errorCode = undefined;
  writeFileSync.shouldFail = false;
  $.shouldFail = false;
  fileContent = {};
});

addRunCommand({
  action: makeRunAction({$, accessSync, env, writeFileSync}),
  parseExecStart,
  parseTimer,
  program,
});

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
      args = [
        'run',
        'validExec',
        '--execOption',
        'value',
        '--on',
        'validTimeSpan',
      ];
      accessSync.fileNotFound();
      expect(parse).to.not.throw();
    });
  });

  describe('usage', () => {
    it('should handle spaces in timer option', () => {
      args = ['run', 'validExec', '--on', 'valid', 'time', 'span'];
      accessSync.fileNotFound();
      expect(parse).to.not.throw();
    });

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
      writeFileSync.shouldFail = true;
      expect(parse).to.throw('writeFileSync');
    });

    it('should relay error if running systemctl fails', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan'];
      accessSync.fileNotFound();
      $.shouldFail = true;
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

    let messageCount = 0;
    it('should produce debug output if --verbose', () => {
      args = ['run', 'validExec', '--on', 'validTimeSpan', '--verbose'];
      accessSync.fileNotFound();
      const debugSpy = spy(console, 'debug');
      parse();
      expect(debugSpy.called);
      messageCount = debugSpy.callCount;
      console.info(`console debug called ${messageCount} times`);
      debugSpy.restore();
    });

    it('should produce more debug output if --verbose --verbose', () => {
      args = [
        'run',
        'validExec',
        '--on',
        'validTimeSpan',
        '--verbose',
        '--verbose',
      ];
      accessSync.fileNotFound();
      const debugSpy = spy(console, 'debug');
      parse();
      console.info(`console debug called ${debugSpy.callCount} times`);
      expect(debugSpy.callCount).to.be.greaterThan(messageCount);
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
          execStart: '/canonized/validExec --execOption value',
          name: 'validExec',
        }),
        '~/.config/systemd/user/validExec.timer': timerTemplate({
          name: 'validExec',
          on: 'normalizedTimeSpan',
          timerType: 'timeSpan',
        }),
      };
      args = [
        'run',
        'validExec',
        '--execOption',
        'value',
        '--on',
        'validTimeSpan',
      ];
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

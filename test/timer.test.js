import {use as chaiUse, should} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import esmock from 'esmock';
import {beforeEach, describe, it, mock} from 'node:test';

chaiUse(chaiAsPromised);
should();

describe('enableTimer', async () => {
  let mocks;
  let opts;

  beforeEach(() => {
    mocks = {
      '#lib/style.js': {
        cout: {
          debug: mock.fn(),
          info: mock.fn(),
          warn: mock.fn(),
        },
        showCommand: mock.fn(async () => {}),
      },
      '#lib/util.js': {
        getDurationStr: mock.fn((str) => str),
      },
      zx: {
        $: mock.fn(async () => {
          return {stdout: '[{"next":"test"}]'};
        }),
      },
    };

    opts = {
      context: 'user',
      name: 'testName',
      timerType: 'calendar',
    };
  });

  it('should work if things go ok', async () => {
    const {enableTimer} = await esmock('#lib/timer.js', {}, mocks);
    return enableTimer(opts).should.be.fulfilled;
  });

  it('should display command instead of calling zx if --what-if specified', async () => {
    opts.whatIf = true;
    const {enableTimer} = await esmock('#lib/timer.js', {}, mocks);
    await enableTimer(opts);
    mocks.zx.$.mock.callCount().should.equal(0);
    return mocks['#lib/style.js'].showCommand.mock.callCount().should.equal(2);
  });

  it('should produce debug output if --verbose specified', async () => {
    opts.verbose = true;
    const {enableTimer} = await esmock('#lib/timer.js', {}, mocks);
    await enableTimer(opts);
    return mocks['#lib/style.js'].cout.debug.mock
      .callCount()
      .should.be.above(0);
  });
});

describe('disableTimer', async () => {
  let mocks;
  let opts;

  beforeEach(() => {
    mocks = {
      '#lib/style.js': {
        cout: {
          debug: mock.fn(),
          info: mock.fn(),
          warn: mock.fn(),
        },
        showCommand: mock.fn(async () => {}),
      },
      zx: {
        $: mock.fn(async () => {}),
      },
    };
    opts = {
      context: 'user',
      name: 'testName',
      verbose: false,
      whatIf: false,
    };
  });

  it('should work if things go ok', async () => {
    const {disableTimer} = await esmock('#lib/timer.js', {}, mocks);
    return disableTimer(opts).should.be.fulfilled;
  });

  it('should display command instead of calling zx if --what-if specified', async () => {
    opts.whatIf = true;
    const {disableTimer} = await esmock('#lib/timer.js', {}, mocks);
    await disableTimer(opts);
    mocks.zx.$.mock.callCount().should.equal(0);
    return mocks['#lib/style.js'].showCommand.mock.callCount().should.equal(1);
  });

  it('should produce debug output if --verbose specified', async () => {
    opts.verbose = true;
    const {disableTimer} = await esmock('#lib/timer.js', {}, mocks);
    await disableTimer(opts);
    return mocks['#lib/style.js'].cout.debug.mock
      .callCount()
      .should.be.above(0);
  });
});

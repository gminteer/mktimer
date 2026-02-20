import {use as chaiUse, should} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import esmock from 'esmock';
import {beforeEach, describe, it, mock} from 'node:test';

chaiUse(chaiAsPromised);
should();

const fileNotFound = new Error('File Not Found');
fileNotFound.code = 'ENOENT';

describe('writeUnits', async () => {
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
        fileBox: async () => '',
      },
      '#lib/util.js': {
        unitPath: () => '~test/',
      },
      'node:fs/promises': {
        access: mock.fn(async () => {
          throw fileNotFound;
        }),
        writeFile: mock.fn(async () => {}),
      },
    };
    opts = {
      execStart: 'testExec',
      name: 'testName',
      on: 'testTimer',
      timerType: 'calendar',
    };
  });

  it('should work if things go ok', async () => {
    const {writeUnits} = await esmock('#lib/file.js', {}, mocks);
    return writeUnits(opts).should.be.fulfilled;
  });

  it('should error if file exists', async () => {
    mocks['node:fs/promises'].access = async () => {};
    const {writeUnits} = await esmock('#lib/file.js', {}, mocks);

    return writeUnits(opts).should.be.rejectedWith(
      '~test/testName.service exists'
    );
  });

  it('should warn if file exists and --force specified', async () => {
    mocks['node:fs/promises'].access = async () => {};
    opts.force = true;
    const {writeUnits} = await esmock('#lib/file.js', {}, mocks);

    await writeUnits(opts);
    return mocks['#lib/style.js'].cout.warn.mock.callCount().should.equal(2);
  });

  it("shouldn't warn if file exits and both --force and --quiet specified", async () => {
    mocks['node:fs/promises'].access = async () => {};
    opts.force = true;
    opts.quiet = true;
    const {writeUnits} = await esmock('#lib/file.js', {}, mocks);

    await writeUnits(opts);
    return mocks['#lib/style.js'].cout.warn.mock.callCount().should.equal(0);
  });

  it('should error if write fails', async () => {
    mocks['node:fs/promises'].writeFile = async () => {
      throw new Error('writeFile');
    };
    const {writeUnits} = await esmock('#lib/file.js', {}, mocks);

    return writeUnits(opts).should.be.rejectedWith('writeFile');
  });

  it('should produce debug output depending on specified verbosity', async () => {
    opts.verbose = 1;
    const {writeUnits} = await esmock('#lib/file.js', {}, mocks);

    await writeUnits(opts);
    const callCount = mocks['#lib/style.js'].cout.debug.mock.callCount();
    callCount.should.be.above(0);

    mock.reset();
    opts.verbose = 2;
    await writeUnits(opts);
    return mocks['#lib/style.js'].cout.debug.mock
      .callCount()
      .should.be.above(callCount);
  });

  it("shouldn't call writeFile if --what-if specified", async () => {
    opts.whatIf = true;
    const {writeUnits} = await esmock('#lib/file.js', {}, mocks);

    await writeUnits(opts);
    return mocks['node:fs/promises'].writeFile.mock.callCount().should.equal(0);
  });
});

describe('rmUnits', async () => {
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
      },
      'node:fs/promises': {
        rm: mock.fn(async () => {}),
      },
    };
    opts = {
      service: 'testService',
      timer: 'testTimer',
      verbose: false,
      whatIf: false,
    };
  });

  it('should work if things go ok', async () => {
    const {rmUnits} = await esmock('#lib/file.js', {}, mocks);
    return rmUnits(opts).should.be.fulfilled;
  });

  it('should error if rm fails', async () => {
    mocks['node:fs/promises'].rm = async () => {
      throw new Error('rm');
    };
    const {rmUnits} = await esmock('#lib/file.js', {}, mocks);
    return rmUnits(opts).should.be.rejectedWith('rm');
  });

  it('should produce debug output if --verbose specified', async () => {
    opts.verbose = true;
    const {rmUnits} = await esmock('#lib/file.js', {}, mocks);
    await rmUnits(opts);
    return mocks['#lib/style.js'].cout.debug.mock
      .callCount()
      .should.be.above(0);
  });

  it("shouldn't call rm if --what-if specified", async () => {
    opts.whatIf = true;
    const {rmUnits} = await esmock('#lib/file.js', {}, mocks);
    await rmUnits(opts);
    return mocks['node:fs/promises'].rm.mock.callCount().should.equal(0);
  });
});

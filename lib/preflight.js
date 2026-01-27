import * as fs from 'node:fs/promises';
import {env, exit} from 'node:process';
import {$} from 'zx';

// man 3 sysexits.h
const EX_USAGE = 64;
const EX_DATAERR = 65;
const EX_CANTCREAT = 73;

function argsOk(args) {
  let error;
  if (!args['--name']) error = '--name missing';
  if (!args['--exec']) error = '--exec missing';
  if (!args['--timespan'] && !args['--calendar'])
    error = 'neither --timespan nor --calendar specified: pick one';
  if (args['--timespan'] && args['--calendar'])
    error = 'both --timespan and --calendar specified: pick one';
  return error;
}

async function execStartOk(execStart) {
  await fs.access(
    execStart.split(' ')[0],
    fs.constants.R_OK | fs.constants.X_OK
  );
}

async function nameUnused(name) {
  try {
    await fs.access(`${env.HOME}/.config/systemd/user/${name}.service`);
    return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return true;
  }
}

async function preflight(args) {
  const error = argsOk(args);
  if (error) {
    console.error(error);
    exit(EX_USAGE);
  }
  const name = args['--name'];
  if (!(await nameUnused(name))) {
    console.error(`Service "${name}" already exists! Aborting...`);
    exit(EX_CANTCREAT);
  }

  const execStart = args['--exec'];
  try {
    await execStartOk(execStart);
  } catch (error) {
    console.error(error.message);
    exit(EX_DATAERR);
  }

  const timerType = args['--timespan'] ? 'timespan' : 'calendar';

  let timer;
  try {
    const out = await sysdValidate(timerType, args[`--${timerType}`]);
    timer = out.stdout;
  } catch {
    exit(EX_DATAERR);
  }
  return {execStart, name, timer, timerType};
}

async function sysdValidate(type, value) {
  return $`systemd-analyze ${type} ${value} |\
           grep ${(type === 'timespan' && 'Human') || 'Normalized'} |\
           cut -d ':' -f 2- | xargs`;
}

export default preflight;

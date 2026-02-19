import {cout, fileBox} from '#lib/style.js';
import {serviceTemplate, timerTemplate} from '#lib/template.js';
import {InvalidArgumentError} from 'commander';
import {access, rm, writeFile} from 'node:fs/promises';
import {env} from 'node:process';

export async function rmUnits({
  context = 'user',
  service,
  timer,
  verbose,
  whatIf,
} = {}) {
  if (verbose) cout.debug('Remove units:');
  const fileNames = [
    `${unitPath(context)}${timer}`,
    `${unitPath(context)}${service}`,
  ];
  for (const file of fileNames) {
    if (verbose) cout.debug(file);
    if (!whatIf) await rm(file);
  }
}

export async function writeUnits({
  context = 'user',
  execStart,
  force = false,
  name,
  on,
  quiet,
  timerType,
  verbose = false,
  whatIf = false,
} = {}) {
  cout.whatIf = whatIf;
  const units = [
    {
      content: serviceTemplate({execStart, name}),
      name: `${unitPath(context)}${name}.service`,
    },
    {
      content: timerTemplate({name, on, timerType}),
      name: `${unitPath(context)}${name}.timer`,
    },
  ];
  // first verse, check to see if those files already exist
  for (const unit of units) {
    try {
      await access(unit.name);
      if (!force) throw new InvalidArgumentError(`${unit.name} exists`);
      if (!quiet) cout.warn(`overwriting ${unit.name}`);
    } catch (error) {
      // we were hoping for error 'ENOENT' all along
      if (error.code !== 'ENOENT')
        throw new InvalidArgumentError(error.message);
    }
  }

  if (whatIf) cout.debug('Would perform the following actions:\n');
  // second verse, actually write the files
  for (const unit of units) {
    if (verbose) {
      cout.debug(`Write file: ${(verbose === 1 && unit.name) || ''}`);
      if (verbose > 1) console.debug(await fileBox(unit));
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!whatIf) await writeFile(unit.name, unit.content, {mode: 0o660});
  }
}
function unitPath(context) {
  switch (context) {
    case 'system': {
      return '/etc/systemd/system/';
    }
    case 'user': {
      return `${env.HOME}/.config/systemd/user/`;
    }
    default: {
      throw new Error('invalid context');
    }
  }
}

import {formatFile} from '#lib/style.js';
import {serviceTemplate, timerTemplate} from '#lib/template.js';
import {printLn, unitPath} from '#lib/util.js';
import {InvalidArgumentError} from 'commander';
import {access, rm, writeFile} from 'node:fs/promises';

export async function removeUnits({
  context = 'user',
  service,
  timer,
  verbose,
  whatIf,
} = {}) {
  const channel = (whatIf && 'whatIf') || 'debug';
  if (verbose) printLn({channel, content: 'Remove units:'});
  const fileNames = [
    `${unitPath(context)}${timer}`,
    `${unitPath(context)}${service}`,
  ];
  for (const file of fileNames) {
    if (verbose) printLn({channel, content: file});
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
  const channel = (whatIf && 'whatIf') || 'debug';
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
  // first verse, check to see if files exist
  for (const unit of units) {
    try {
      await access(unit.name);
      if (!force) throw new InvalidArgumentError(`${unit.name} exists`);
      if (!quiet)
        printLn({channel: 'warn', content: `overwriting ${unit.name}}`});
    } catch (error) {
      // we were hoping for error 'ENOENT' all along
      if (error.code !== 'ENOENT')
        throw new InvalidArgumentError(error.message);
    }
  }
  // second verse, actually write the files
  for (const unit of units) {
    if (verbose) {
      printLn({
        channel,
        content: `Write file: ${(verbose === 1 && unit.name) || ''}`,
      });
      if (verbose > 1) printLn({channel, content: await formatFile(unit)});
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!whatIf) await writeFile(unit.name, unit.content, {mode: 0o660});
  }
}

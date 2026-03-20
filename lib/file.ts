/* eslint-disable security/detect-object-injection */
import {InvalidArgumentError} from 'commander';
import {access, rm, writeFile} from 'node:fs/promises';

import type {GlobalOpts} from '../command/base.ts';
import type {RunOpts} from '../command/run.ts';

import {formatFile, styles} from './style.ts';
import {serviceTemplate, timerTemplate} from './template.ts';
import {scopePath} from './util.ts';

export async function removeUnits(
  service: string,
  timer: string,
  {scope = 'user', verbose, whatIf}: GlobalOpts
) {
  const style = whatIf ? styles.whatIf : styles.debug;
  if (verbose) console.debug(style('Remove units:'));
  const fileNames = [
    `${scopePath[scope]}${timer}`,
    `${scopePath[scope]}${service}`,
  ];
  for (const file of fileNames) {
    if (verbose) console.debug(style(file));
    if (!whatIf) await rm(file);
  }
}

export async function writeUnits({
  execStart,
  force,
  name,
  on,
  scope = 'user',
  timerType,
  verbose = 0,
  whatIf,
}: RunOpts) {
  const style = whatIf ? styles.whatIf : styles.debug;
  const units = [
    {
      content: serviceTemplate({execStart, name}),
      name: `${scopePath[scope]}${name}.service`,
    },
    {
      content: timerTemplate({name, on, timerType}),
      name: `${scopePath[scope]}${name}.timer`,
    },
  ];
  // first verse, check to see if files exist
  for (const unit of units) {
    try {
      await access(unit.name);
      if (!force) throw new InvalidArgumentError(`${unit.name} exists`);
      if (verbose >= 0) console.warn(styles.warn(`overwriting ${unit.name}}`));
    } catch (error) {
      if (!(error instanceof Error && 'code' in error)) throw error;
      // we were hoping for error 'ENOENT' all along
      if (error.code !== 'ENOENT')
        throw new InvalidArgumentError(error.message);
    }
  }
  // second verse, actually write the files
  for (const unit of units) {
    if (verbose) {
      console.debug(style(`Write file: ${(verbose === 1 && unit.name) || ''}`));
      if (verbose > 1)
        console.debug(style(await formatFile(unit.content, unit.name)));
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!whatIf) await writeFile(unit.name, unit.content, {mode: 0o660});
  }
}

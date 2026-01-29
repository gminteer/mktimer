#!/usr/bin/env node
import {Command} from 'commander';

import pkg from './package.json' with {type: 'json'};
const program = new Command();

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .executableDir('./lib')
  .enablePositionalOptions();

program
  .command('new <timer>', 'create a new timer', {executableFile: 'new'})
  .alias('n');

program.parse();

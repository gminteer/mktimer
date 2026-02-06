#!/usr/bin/env node
import {Command} from 'commander';
import {accessSync, realpathSync, writeFileSync} from 'node:fs';
import {env} from 'node:process';
import {$ as $_} from 'zx';
const $ = $_({nothrow: true, quiet: true, sync: true});

import makeListCommand, {makeListAction} from './command/list.js';
import makeRunCommand, {makeRunAction} from './command/run.js';
import {makeParseExecStart, makeParseTimer} from './lib/parser-factory.js';
import pkg from './package.json' with {type: 'json'};

// build list command
const listCommand = makeListCommand();
listCommand.action(makeListAction($));

// build run command
const parseExecStart = makeParseExecStart(accessSync, realpathSync);
const parseTimer = makeParseTimer($);
const runCommand = makeRunCommand({parseExecStart, parseTimer});
runCommand.action(makeRunAction({$, accessSync, env, writeFileSync}));

const program = new Command();

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)

  .addCommand(runCommand)
  .addCommand(listCommand)

  .parse();

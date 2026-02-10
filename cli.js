#!/usr/bin/env node
import {accessSync, realpathSync, writeFileSync} from 'node:fs';
import {env} from 'node:process';
import {$ as $_} from 'zx';
const $ = $_({nothrow: true, quiet: true, sync: true});

import addListCommand, {makeListAction} from './command/list.js';
// import makeListCommand, {makeListAction} from './command/list.js';
import addRunCommand, {makeRunAction} from './command/run.js';
import program from './lib/common.js';
import {makeParseExecStart, makeParseTimer} from './lib/parsers.js';
import pkg from './package.json' with {type: 'json'};

// build list command
// const listCommand = makeListCommand();
// listCommand.action(makeListAction($));

// build run command
const parseExecStart = makeParseExecStart(accessSync, realpathSync);
const parseTimer = makeParseTimer($);

program.name(pkg.name).description(pkg.description).version(pkg.version);

addRunCommand({
  action: makeRunAction({$, accessSync, env, writeFileSync}),
  parseExecStart,
  parseTimer,
  program,
});

addListCommand({
  action: makeListAction({$}),
  program,
});

program.parse();

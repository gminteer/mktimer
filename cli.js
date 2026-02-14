#!/usr/bin/env node
import {accessSync, realpathSync, writeFileSync} from 'node:fs';
import {env} from 'node:process';
import {$ as $_} from 'zx';
const $ = $_({nothrow: true, quiet: true, sync: true});

import addListCommand, {makeListAction} from './command/list.js';
import addRemoveCommand, {makeRemoveAction} from './command/remove.js';
import addRunCommand, {makeRunAction} from './command/run.js';
import program from './lib/styles.js';
import {makeParseExecStart, makeParseTimer} from './lib/utils.js';
import pkg from './package.json' with {type: 'json'};

// Who needs fancy dependancy injection frameworks when you can just write the
// thing as a function that takes the dependancies I need to mock for tests as
// variables?
const parseExecStart = makeParseExecStart(accessSync, realpathSync);
const parseTimer = makeParseTimer($);

program.name(pkg.name).description(pkg.description).version(pkg.version);

addListCommand({
  action: makeListAction($),
  program,
});

addRemoveCommand({
  action: makeRemoveAction({$}),
  program,
});

addRunCommand({
  action: makeRunAction({$, accessSync, env, writeFileSync}),
  parseExecStart,
  parseTimer,
  program,
});

program.parse();

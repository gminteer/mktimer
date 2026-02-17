#!/usr/bin/env node
import {accessSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {env} from 'node:process';
import {$ as $_} from 'zx';
const $ = $_({nothrow: true, quiet: true, sync: true});

import addListCommand, {makeListAction} from '#command/list.js';
import addRemoveCommand, {makeRemoveAction} from '#command/remove.js';
import addRunCommand, {makeRunAction} from '#command/run.js';
import program from '#lib/base-command.js';
import {
  makeGetTimerInfo,
  makeParseExecStart,
  makeParseTimer,
} from '#lib/utils.js';

import pkg from './package.json' with {type: 'json'};

// Who needs fancy dependancy injection frameworks when you can just write the
// thing as a function that takes the dependancies I need to mock for tests as
// variables?
const getTimerInfo = makeGetTimerInfo($);
const parseExecStart = makeParseExecStart(accessSync, realpathSync);
const parseTimer = makeParseTimer($);

program.name(pkg.name).description(pkg.description).version(pkg.version);

addListCommand({
  action: makeListAction({$, getTimerInfo}),
  program,
});

addRemoveCommand({
  action: makeRemoveAction({$, env, getTimerInfo, rmSync}),
  program,
});

addRunCommand({
  action: makeRunAction({$, accessSync, env, writeFileSync}),
  parseExecStart,
  parseTimer,
  program,
});

program.parseAsync();

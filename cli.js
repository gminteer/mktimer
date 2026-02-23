#!/usr/bin/env node
import program from '#command/base.js';
import addListCommand from '#command/list.js';
import addRemoveCommand from '#command/remove.js';
import addRunCommand from '#command/run.js';

import pkg from './package.json' with {type: 'json'};

program.name(pkg.name).description(pkg.description).version(pkg.version);

addListCommand(program);
addRemoveCommand(program);
addRunCommand(program);

await program.parseAsync();

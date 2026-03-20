#!/usr/bin/env node
import program from './command/base.ts';
import addListCommand from './command/list.ts';
import addRemoveCommand from './command/remove.ts';
import addRunCommand from './command/run.ts';
import addShowCommand from './command/show.ts';
import pkg from './package.json' with {type: 'json'};

program.name(pkg.name).description(pkg.description).version(pkg.version);

addListCommand(program);
addRemoveCommand(program);
addRunCommand(program);
addShowCommand(program);

await program.parseAsync();

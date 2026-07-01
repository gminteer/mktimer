#!/usr/bin/env node
import program from './command/base.ts';
import addList from './command/list.ts';
import addRemove from './command/remove.ts';
import addRun from './command/run.ts';
import addShow from './command/show.ts';
import pkg from './package.json' with {type: 'json'};

program.name(pkg.name).description(pkg.description).version(pkg.version);

const verbs = [addList, addRemove, addRun, addShow];
for (const addVerb of verbs) addVerb(program);
await program.parseAsync();

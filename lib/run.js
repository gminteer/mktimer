import {Command} from 'commander';

import addGlobals from './global-options.js';
import {serviceTemplate, timerTemplate} from './templates.js';

export function makeRunAction({$, accessSync, env, writeFileSync}) {
  return function (
    execStart,
    {force, name, on, quiet, timerType, verbose, whatIf},
    command
  ) {
    if (!name) name = execStart.split(' ')[0].split('/').pop();

    // check if files exist
    const baseFileName = `${env.HOME}/.config/systemd/user/${name}`;
    for (const ext of ['service', 'timer']) {
      try {
        const file = `${baseFileName}.${ext}`;
        accessSync(file);
        if (!force) command.error(`${file} exists`);
        if (verbose)
          console.warn(`overwriting ${file}: exists but --force specified`);
      } catch (error) {
        if (error.code !== 'ENOENT') command.error(error.message);
      }
    }

    if (whatIf) console.debug('Would perform the following actions:\n');
    if (verbose) {
      console.debug(`Write file: ${baseFileName}.service with content:\n---`);
      console.debug(serviceTemplate({execStart, name}));
    }
    if (!whatIf)
      writeFileSync(
        `${baseFileName}.service`,
        serviceTemplate({execStart, name}),
        {mode: 0o660}
      );

    if (verbose) {
      console.debug('---\n');
      console.debug(`Write file: ${baseFileName}.timer with content:\n---`);
      console.debug(timerTemplate({name, on, timerType}));
      console.debug('---\n');
    }
    if (!whatIf)
      writeFileSync(
        `${baseFileName}.timer`,
        timerTemplate({name, on, timerType})
      );

    const cmdlines = [
      `systemctl --user enable ${name}.timer`,
      `systemctl --user start ${name}`,
      `systemctl --user list-timers ${name}`,
    ];
    $.verbose = verbose;
    $.quiet = quiet;
    if (verbose) console.debug('Run commands:');
    for (const cmdline of cmdlines) {
      if (whatIf) {
        console.debug(cmdline);
      } else {
        const out = $`${cmdline}`;
        if (out.ok) {
          if (!quiet) console.info(out.stdout);
        } else {
          command.error(`error: ${out.stderr}`);
        }
      }
    }
  };
}

export default function makeRunCommand({parseExecStart, parseTimer}) {
  return addGlobals(new Command())
    .name('run')
    .alias('new')
    .description('create and run a new timer')
    .argument('<command>', 'command to run', parseExecStart)
    .requiredOption('--every, --on <schedule>', 'timer schedule', parseTimer)
    .option('-n, --name <name>', 'default is program name');
}

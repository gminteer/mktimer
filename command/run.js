import {fileBox, verboseStyle, warnStyle, whatIfStyle} from '../lib/common.js';
import {serviceTemplate, timerTemplate} from '../lib/templates.js';

const outWarn = (str) => console.warn(warnStyle(str));

export default function addRunCommand({
  action,
  parseExecStart,
  parseTimer,
  program,
}) {
  return program
    .command('run')
    .alias('new')
    .description('create and run a new timer')
    .argument('<command>', 'command to run', parseExecStart)
    .requiredOption('--every, --on <schedule>', 'timer schedule', parseTimer)
    .option('-n, --name <name>', 'default is program name')
    .action(action);
}

export function makeRunAction({$, accessSync, env, writeFileSync}) {
  return function (execStart, _, command) {
    const {force, on, quiet, timerType, verbose, whatIf} =
      command.optsWithGlobals();
    const name =
      command.optsWithGlobals()?.name ||
      execStart.split(' ')[0].split('/').pop();
    const outDebug = whatIf
      ? (str) => console.debug(whatIfStyle(str))
      : (str) => console.debug(verboseStyle(str));

    const baseFileName = `${env.HOME}/.config/systemd/user/${name}`;
    const serviceFile = {
      content: serviceTemplate({execStart, name}),
      name: `${baseFileName}.service`,
    };
    const timerFile = {
      content: timerTemplate({name, on, timerType}),
      name: `${baseFileName}.timer`,
    };

    for (const fileName of [serviceFile.name, timerFile.name]) {
      try {
        accessSync(fileName);
        if (!force) command.error(`${fileName} exists`);
        if (verbose)
          outWarn(`overwriting ${fileName}: exists but --force specified`);
      } catch (error) {
        if (error.code !== 'ENOENT') command.error(error.message);
      }
    }

    if (whatIf) outDebug('Would perform the following actions:\n');
    for (const file of [serviceFile, timerFile]) {
      if (verbose) {
        outDebug(`Write file: ${(verbose === 1 && file.name) || ''}`);
        if (verbose > 1) outDebug(fileBox(file));
      }
      if (!whatIf) writeFileSync(file.name, file.content, {mode: 0o660});
    }

    $.verbose = verbose;
    $.quiet = quiet;
    if (verbose) outDebug('Enable and start timer:');
    const cmdLines = [
      ['systemctl', '--user', 'daemon-reload'],
      ['systemctl', '--user', 'enable', '--now', `${name}.timer`],
    ];
    for (const line of cmdLines) {
      if (verbose) outDebug(line.join(' '));
      if (!whatIf) {
        const out = $`${line}`;
        if (out.ok) {
          if (!quiet) console.info(out.stderr.trim());
        } else {
          command.error(`error: ${out.stderr.trim()}`);
        }
      }
    }
    if (!quiet && !whatIf) {
      const out = $`systemctl --user status ${name}.timer --no-pager`;
      if (!out.ok) command.error(`error: ${out.stderr}`);
      console.info(out.stdout);
    }
  };
}

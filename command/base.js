import {StyledCommand} from '#lib/style.js';
// eslint-disable-next-line unicorn/import-style
import chalk, {supportsColor, supportsColorStderr} from 'chalk';
import {Option} from 'commander';
import stripAnsi from 'strip-ansi';

export default new StyledCommand()
  .configureOutput({
    getErrHasColors: () => supportsColorStderr,
    getOutHasColors: () => supportsColor,
    outputError: (str, write) => write(chalk.redBright(str)),
    stripColor: (str) => stripAnsi(str),
  })
  .configureHelp({
    showGlobalOptions: true,
    sortOptions: true,
    sortSubcommands: true,
  })
  .option('--color', 'force color output') // implemented by chalk
  .option('--no-color', 'disable color output') // implemented by chalk
  .option('--no-pager', 'do not pipe output to pager')
  .option('-f, --force', 'overwrite existing files')
  .option(
    '-v, --verbose',
    'explain what is happening, -vv for extra info',
    (_, previous) => previous + 1,
    0
  )
  .addOption(
    new Option('-q, --quiet', 'supresses all non-error output').conflicts(
      'verbose'
    )
  )
  .addOption(
    new Option(
      '--dry-run, --what-if',
      'explain what would be done without doing it'
    ).implies({verbose: 2})
  )
  .addOption(
    new Option('-u, --user', 'systemd user context')
      .implies({context: 'user'})
      .conflicts(['system'])
  )
  .addOption(
    new Option('-s, --system', 'systemd system context')
      .implies({context: 'system'})
      .conflicts(['user'])
  );

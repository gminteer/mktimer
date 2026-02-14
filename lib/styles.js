import boxen from 'boxen';
// eslint-disable-next-line unicorn/import-style
import chalkStdOut, {
  chalkStderr as chalkStdErr,
  supportsColorStderr as stdErrSupportsColor,
  supportsColor as stdOutSupportsColor,
} from 'chalk';
import {Command, Help, Option} from 'commander';
import stripAnsi from 'strip-ansi';

export const errorStyle = (str) => chalkStdOut.red(str);
export const verboseStyle = (str) => chalkStdOut.greenBright(str);
export const warnStyle = (str) => chalkStdOut.yellowBright(str);
export const whatIfStyle = (str) => chalkStdOut.italic.magentaBright(str);

export const fileBox = ({content, name}) =>
  boxen(content, {
    borderStyle: 'round',
    margin: 1,
    padding: 1,
    title: name,
  });

class StyledCommand extends Command {
  createCommand(name) {
    return new StyledCommand(name);
  }

  createHelp() {
    return Object.assign(new StyledHelp(), this.configureHelp());
  }
}

class StyledHelp extends Help {
  constructor() {
    super();
    this.chalk = chalkStdOut;
  }

  prepareContext(options) {
    super.prepareContext(options);
    if (options?.error) this.chalk = chalkStdErr;
  }

  styleArgumentText(str) {
    return this.chalk.yellow(str);
  }

  styleCommandDescription(str) {
    return this.chalk.bold(str);
  }

  styleCommandText(str) {
    return this.chalk.cyan(str);
  }

  styleDescriptionText(str) {
    return this.chalk.italic(str);
  }

  styleOptionText(str) {
    return this.chalk.green(str);
  }

  styleSubcommandText(str) {
    return this.chalk.blue(str);
  }

  styleTitle(str) {
    return this.chalk.bold(str);
  }
}

export default new StyledCommand()
  .configureOutput({
    getErrHasColors: () => stdErrSupportsColor,
    getOutHasColors: () => stdOutSupportsColor,
    outputError: (str, write) => write(errorStyle(str)),
    stripColor: (str) => stripAnsi(str),
  })
  .configureHelp({showGlobalOptions: true})
  .option('--color', 'force color output') // implemented by chalk
  .option('--no-color', 'disable color output') // implemented by chalk
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
  );

import {codeToANSI} from '@shikijs/cli';
import boxen from 'boxen';
// eslint-disable-next-line unicorn/import-style
import chalkStdOut, {chalkStderr} from 'chalk';
import {Command, Help} from 'commander';

export const cout = {
  debug(content) {
    if (this.whatIf)
      return console.debug(chalkStdOut.italic.magentaBright(content));
    return console.debug(chalkStdOut.greenBright(content));
  },
  info(content) {
    return console.info(content);
  },
  warn(content) {
    return console.warn(chalkStdOut.yellowBright(content));
  },
  whatIf: false,
};

export const showCommand = async (
  command,
  {theme = 'gruvbox-dark-hard', whatIf = false} = {}
) => {
  let fancyCommand = await codeToANSI(`$ ${command}`, 'bash', theme);
  fancyCommand = fancyCommand.trim();
  if (whatIf) return console.debug(fancyCommand);
  return console.debug(fancyCommand);
};

export const fileBox = async ({
  content,
  name,
  theme = 'gruvbox-dark-hard',
} = {}) => {
  let fancyContent = await codeToANSI(content, 'systemd', theme);
  fancyContent = fancyContent.trim();
  return boxen(fancyContent, {
    borderColor: 'magentaBright',
    borderStyle: 'round',
    margin: 1,
    padding: 1,
    title: chalkStdOut.bold.whiteBright(`[ ${name} ]`),
  });
};

class StyledHelp extends Help {
  constructor() {
    super();
    this.chalk = chalkStdOut;
  }

  prepareContext(options) {
    super.prepareContext(options);
    if (options?.error) this.chalk = chalkStderr;
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

export class StyledCommand extends Command {
  createCommand(name) {
    return new StyledCommand(name);
  }

  createHelp() {
    return Object.assign(new StyledHelp(), this.configureHelp());
  }
}

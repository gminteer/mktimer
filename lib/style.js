import {codeToANSI} from '@shikijs/cli';
import boxen from 'boxen';
// eslint-disable-next-line unicorn/import-style
import chalk, {chalkStderr} from 'chalk';
import {Command, Help} from 'commander';

export const debugStyle = chalk.greenBright;
export const whatIfStyle = chalk.italic.magentaBright;
export const warnStyle = chalk.yellowBright;

// export const cout = {
//   debug(content) {
//     if (this.whatIf) return console.debug(chalk.italic.magentaBright(content));
//     return console.debug(chalk.greenBright(content));
//   },
//   info(content) {
//     return console.info(content);
//   },
//   warn(content) {
//     return console.warn(chalk.yellowBright(content));
//   },
//   whatIf: false,
// };

export const formatDetails = async ({content, theme = 'gruvbox-dark-hard'}) => {
  let fancyDetails = await codeToANSI(content, 'systemd', theme);
  fancyDetails = fancyDetails.trim();
  return fancyDetails;
};

export const formatCommand = async (
  command,
  {theme = 'gruvbox-dark-hard', whatIf = false} = {}
) => {
  let fancyCommand = await codeToANSI(`$ ${command}`, 'bash', theme);
  fancyCommand = fancyCommand.trim();
  return fancyCommand;
};

export const formatFile = async ({
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
    title: chalk.bold.whiteBright(`[ ${name} ]`),
  });
};

class StyledHelp extends Help {
  constructor() {
    super();
    this.chalk = chalk;
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

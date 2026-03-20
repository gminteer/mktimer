import type {Command} from 'commander';

import {codeToANSI} from '@shikijs/cli';
import boxen from 'boxen';
import {styleText} from 'node:util';
import TtyTable from 'tty-table';

import type {DisplayRow} from '../command/list.ts';

export const styles = {
  debug: (str: string) => styleText('greenBright', str),
  warn: (str: string) => styleText('yellowBright', str),
  whatIf: (str: string) => styleText(['italic', 'magentaBright'], str),
};

const theme = 'gruvbox-dark-hard';
export const formatDetails = async (details: string) => {
  let fancyDetails = await codeToANSI(details, 'systemd', theme);
  fancyDetails = fancyDetails.trim();
  return fancyDetails;
};

export const formatCommand = async (command: string) => {
  let fancyCommand = await codeToANSI(`$ ${command}`, 'bash', theme);
  fancyCommand = fancyCommand.trim();
  return fancyCommand;
};

export const formatFile = async (content: string, name: string) => {
  let fancyContent = await codeToANSI(content, 'systemd', theme);
  fancyContent = fancyContent.trim();
  return boxen(fancyContent, {
    borderColor: 'magentaBright',
    borderStyle: 'round',
    margin: 1,
    padding: 1,
    title: styleText(['bold', 'whiteBright'], `[ ${name} ]`),
  });
};

export const formatTimerList = (displayList: DisplayRow[]) =>
  TtyTable(
    [
      {
        alias: styleText('bold', 'Units'),
        align: 'right',
        color: 'cyan',
        headerAlign: 'right',
        headerColor: 'cyanBright',
        value: 'units',
      },
      {
        alias: styleText('bold', 'Run'),
        color: 'blue',
        headerColor: 'blueBright',
        value: 'execStart',
      },
      {
        alias: styleText('bold', 'Last'),
        align: 'left',
        color: 'green',
        formatter: (value: string) =>
          value === 'never' ? styleText('redBright', value) : `+${value}`,
        headerAlign: 'left',
        headerColor: 'greenBright',
        value: 'last',
      },
      {
        alias: styleText('bold', 'Next'),
        align: 'left',
        color: 'magenta',
        formatter: (value: string) =>
          value === 'never' ? styleText('redBright', value) : value,
        headerAlign: 'left',
        headerColor: 'magentaBright',
        value: 'next',
      },
    ],
    displayList,
    {borderColor: 'gray', compact: true}
  ).render();

export const styleCommand = (command: Command) =>
  command
    .configureOutput({
      outputError: (str, write) => {
        write(styleText('redBright', str));
      },
    })
    .configureHelp({
      showGlobalOptions: true,
      sortOptions: true,
      sortSubcommands: true,
      styleArgumentText: (str) => styleText('yellow', str),
      styleCommandDescription: (str) => styleText('bold', str),
      styleCommandText: (str) => styleText('cyan', str),
      styleDescriptionText: (str) => styleText('italic', str),
      styleOptionText: (str) => styleText('green', str),
      styleSubcommandText: (str) => styleText('blue', str),
      styleTitle: (str) => styleText('bold', str),
    });

import boxen from 'boxen';
import {chalk} from 'zx';

export const errorStyle = (str) => chalk.red(str);
export const verboseStyle = (str) => chalk.greenBright(str);
export const warnStyle = (str) => chalk.yellowBright(str);
export const whatIfStyle = (str) => chalk.italic.magentaBright(str);

export const fileBox = ({content, name}) =>
  boxen(content, {
    borderStyle: 'round',
    margin: 1,
    padding: 1,
    title: name,
  });

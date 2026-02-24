import {getTimerDetails} from '#lib/timer.js';
import {codeToANSI} from '@shikijs/cli';
import {env} from 'node:process';
import {$} from 'zx';

export default function addShowCommand(program) {
  return program
    .command('show')
    .alias('info')
    .description('show details')
    .argument('<timer>', 'timer to display')
    .action(action);
}

const formatDetails = async ({content, theme = 'gruvbox-dark-hard'}) => {
  let fancyDetails = await codeToANSI(content, 'systemd', theme);
  fancyDetails = fancyDetails.trim();
  return fancyDetails;
};

async function action(timer, _, program) {
  const {context} = program.optsWithGlobals();

  let details;
  try {
    details = await getTimerDetails({context, json: false, timer});
  } catch (error) {
    program.error(error.stderr);
  }
  details = await formatDetails({content: details.timer});
  return console.info(details);
}

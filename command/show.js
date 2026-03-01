import {formatDetails} from '#lib/style.js';
import {getTimerDetails} from '#lib/timer.js';
import {printLn} from '#lib/util.js';

export default function addShowCommand(program) {
  return program
    .command('show')
    .alias('info')
    .description('show details')
    .argument('<timer>', 'timer to display')
    .action(action);
}

async function action(timer, _, program) {
  const {context, pager} = program.optsWithGlobals();

  let details;
  try {
    details = await getTimerDetails({context, json: false, timer});
  } catch (error) {
    program.error(error.stderr);
  }
  details = await formatDetails({content: details.timer});
  return printLn({channel: 'info', content: details, pager});
}

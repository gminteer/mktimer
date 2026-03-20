import {Command, Option} from 'commander';

import {styleCommand} from '../lib/style.ts';

export type GlobalOpts = {
  force?: boolean;
  pager?: boolean;
  scope?: 'system' | 'user';
  verbose?: number;
  whatIf?: boolean;
};

export default styleCommand(new Command())
  .option('--no-pager', "don't pipe to pager")
  .option('-f, --force', 'overwrite existing files')
  .option(
    '-v, --verbose',
    'explain what is happening, -vv for extra info',
    (_, previous: number) => previous + 1,
    0
  )
  .addOption(
    new Option('-q, --quiet', 'supress non-error output')
      .conflicts('verbose')
      .implies({verbose: -1})
  )
  .addOption(
    new Option(
      '--dry-run, --what-if',
      'explain what would be done without doing it'
    ).implies({verbose: 2})
  )
  .addOption(
    new Option('-u, --user', 'user scope')
      .implies({scope: 'user'})
      .conflicts(['system'])
  )
  .addOption(
    new Option('-s, --system', 'system scope')
      .implies({scope: 'system'})
      .conflicts(['user'])
  );

import {Option} from 'commander';

const addGlobals = (command) =>
  command
    .option(
      '-f, --force',
      'overwrite existing files if encountered (DANGEROUS)'
    )
    .option(
      '-v, --verbose',
      'provide extra information about actions performed'
    )
    .addOption(
      new Option(
        '--dry-run, --what-if',
        'describe actions that would be performed without doing them'
      ).implies('verbose')
    );

export default addGlobals;

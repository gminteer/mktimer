/* eslint-disable n/no-unpublished-import */
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import google from 'eslint-config-google';
import {importX} from 'eslint-plugin-import-x';
// apparently these two rules are borked in eslint 9+
delete google.rules['valid-jsdoc'];
delete google.rules['require-jsdoc'];
import node from 'eslint-plugin-n';
import perfectionist from 'eslint-plugin-perfectionist';
import prettier from 'eslint-plugin-prettier/recommended';
import promise from 'eslint-plugin-promise';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import {globalIgnores} from 'eslint/config';

export default [
  js.configs.recommended,
  promise.configs['flat/recommended'],
  importX.flatConfigs.recommended,
  node.configs['flat/recommended'],
  security.configs.recommended,
  google,
  // eslint-disable-next-line import-x/no-named-as-default-member
  perfectionist.configs['recommended-natural'],
  stylistic.configs.customize({
    '@stylistic/brace-style': ['error', '1tbs', {allowSingleLine: true}],
    '@stylistic/semi': true,
    'curly-newline': ['error', {multiline: true}],
  }),
  unicorn.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      'import-x': importX,
      node,
      promise,
      security,
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      'new-cap': ['off'],
      'no-debugger': ['warn'],
      'no-template-curly-in-string': ['warn'],
      'prefer-const': ['error'],
      'prefer-template': ['warn'],
      'unicorn/better-regex': 'warn',
      'unicorn/prevent-abbreviations': 'off',
      'vars-on-top': ['warn'],
    },
  },
  globalIgnores(['**/node_modules', '**/dist', '**/coverage']),
  prettier,
];

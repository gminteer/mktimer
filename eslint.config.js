import { defineConfig } from "eslint/config";

export default defineConfig([
{
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ['prettier', 'promise', 'import', 'node', 'security'],
  extends: [
    'eslint:recommended',
    'plugin:promise/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'google',
    'prettier',
    'plugin:node/recommended',
    'plugin:security/recommended',
  ],
  rules: {
    'brace-style': ['error', '1tbs', {allowSingleLine: true}],
    curly: ['error', 'multi-or-nest', 'consistent'],
    eqeqeq: ['error', 'always'],
    'new-cap': ['off'],
    'no-debugger': ['warn'],
    'no-template-curly-in-string': ['error'],
    'prefer-template': ['warn'],
    'prettier/prettier': ['warn'],
    'require-jsdoc': ['off'],
    'vars-on-top': ['warn'],
    'security/detect-object-injection': ['off'],
  },
},
]);
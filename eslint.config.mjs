/** @format */

import js from '@eslint/js';
import openwcConfigs from '@open-wc/eslint-config';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

const sourceFilesToLint = ['**/*.ts', '**/*.html'];

// Rules to be customized from extended configs.
/** @type {import('eslint/config').RuleConfig} */
let baseClassMethodsUseThisRule = undefined;

// Apply the target files for linting to the open-wc configs.
// Only set for the config entries that don't already have files.
const filteredConfigs = openwcConfigs.map((config) => {
  // Configs with files are special-purpose, not the general config that has
  // rules to be overridden.
  if (!config.files) {
    // Get rules that need options customized, instead of completing overriding
    // the options (the default behaviour).
    const rule = config.rules['class-methods-use-this'];
    if (rule) {
      baseClassMethodsUseThisRule = rule;
    }
  }
  return {
    ...config,
    files: config.files ?? sourceFilesToLint,
  };
});

function buildClassMethodsUseThisRule(severity, options) {
  const defaultOptions = baseClassMethodsUseThisRule[1] ?? {};
  const exceptMethods = [...defaultOptions.exceptMethods];
  if (options.exceptMethods) {
    exceptMethods.push(...options.exceptMethods);
  }
  return [severity, { ...defaultOptions, ...options, exceptMethods }];
}

export default defineConfig([
  {
    name: 'main-ignores',
    ignores: [
      '**/build/',
      '**/coverage/',
      '.lighthouseci/',
      '**/node_modules/',
      '**/dist/',
      '**/reports/',
      '**/.tmp',
      'out-tsc/',
      // Temporary exclusions, to get linting working without errors
      'config/',
      '**/index.html',
      '**/local.index.html',
      'src/lineup-*.html',
      'src/shared-styles.html',
    ],
  },
  {
    name: 'js-recommended-extends',
    extends: [js.configs.recommended],
    files: sourceFilesToLint,
  },
  {
    name: 'open-wc-extends',
    extends: [...filteredConfigs],
  },
  // Turns off rules that conflict with Prettier
  { name: 'prettier-extends', extends: [prettierConfig] },
  {
    name: 'main-config',
    files: sourceFilesToLint,

    plugins: {
      '@typescript-eslint': tsPlugin,
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    languageOptions: {
      globals: {
        URLPattern: 'readonly',
      },

      parser: tsParser,
    },

    rules: {
      'class-methods-use-this': buildClassMethodsUseThisRule('error', {
        exceptMethods: ['stateChanged'],
        ignoreClassesWithImplements: 'all',
        ignoreOverrideMethods: true,
      }),
      'import-x/no-unresolved': 'off', // Too many false positives, as it does not handle references to @app/
      'no-console': [
        'error',
        {
          allow: ['error', 'time', 'timeEnd', 'timeLog', 'warn'],
        },
      ],

      // Typescript overrides of built-in rules.
      'no-unused-vars': 'off',

      '@typescript-eslint/no-shadow': [
        'error',
        {
          allow: ['state'],
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Only allow imports from the index of each slice, not internal files.
    name: 'slice-imports',
    files: ['src/+(app|components|middleware|models|storage|util)/**/*.ts', 'src/*.ts'],

    rules: {
      'import-x/no-internal-modules': [
        'error',
        {
          forbid: [
            '**/slices/app/!(index.js)',
            '**/slices/auth/!(index.js)',
            '**/slices/game/!(index.js)',
            '**/slices/live/!(index.js)',
            '**/slices/team/!(index.js)',
          ],
        },
      ],
    },
  },
  {
    // TODO: Remove after upgrading to new mwc form fields
    name: 'temp-game-setup-component',
    files: ['src/components/lineup-game-setup.ts'],

    rules: {
      'lit/no-value-attribute': 'off',
    },
  },
]);

/** @format */

import js from '@eslint/js';
import openwcConfigs from '@open-wc/eslint-config';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

const sourceFilesToLint = ['**/*.ts', '**/*.html'];

// Apply the target files for linting to the open-wc configs.
// Only set for the config entries that don't already have files.
// import('eslint/config').Config
const filteredConfigs = openwcConfigs.map((config) => ({
  ...config,
  files: config.files ?? sourceFilesToLint,
}));

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
      'arrow-body-style': 'off',
      'class-methods-use-this': 'off', // Not useful
      'func-names': ['off', 'as-needed'], // Temporarily disable

      'spaced-comment': [
        'off', // Temporarily disable
        'always',
        {
          markers: ['!'],
          exceptions: ['*'],
        },
      ],

      'import-x/no-unresolved': 'off', // Too many false positives, as it does not handle references to @app/

      'lines-between-class-members': 'off',
      'max-classes-per-file': 'off',

      'no-console': [
        'error',
        {
          allow: ['error', 'time', 'timeEnd', 'timeLog', 'warn'],
        },
      ],

      'no-continue': 'off',

      'no-multi-assign': [
        'error',
        {
          ignoreNonDeclaration: true,
        },
      ],

      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['game', 'model', 'obj', 'state'],
        },
      ],

      'no-plusplus': [
        'error',
        {
          allowForLoopAfterthoughts: true,
        },
      ],

      'prefer-destructuring': 'off',

      // Typescript overrides of built-in rules.
      'import/named': 'off',
      'no-shadow': 'off',
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
      // Temporarily disable rules, to allow lint to complete successfully.
      'no-use-before-define': [
        'off',
        {
          functions: false,
          allowNamedExports: true,
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
    // Components often need to import other components twice, once for the side-effect.
    name: 'components-side-effect-imports',
    files: ['src/components/*.ts', 'test/unit/components/*.test.ts'],

    rules: {
      'import/no-duplicates': 'off',
    },
  },
  {
    name: 'visual-integration-tests',
    files: ['test/integration/visual.ts'],

    rules: {
      'no-loop-func': 'off',
    },
  },
  {
    // TODO: Refactor test loops/generation to avoid these lint rules
    name: 'temp-player-card-tests',
    files: ['test/unit/components/lineup-player-card.test.ts'],

    rules: {
      'no-inner-declarations': 'off',
      'no-loop-func': 'off',
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
  {
    name: 'override-use-before-define',
    files: [
      'src/models/*.ts',
      'test/unit/models/*.ts',
      'src/slices/live/events-slice.ts',
      'test/unit/slices/live/events-slice.test.ts',
    ],

    rules: {
      'no-use-before-define': [
        'error',
        {
          functions: false,
          allowNamedExports: true,
        },
      ],
    },
  },
]);

/** @format */

import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import { copy } from '@web/rollup-plugin-copy';
import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import minifyHTML from '@lit-labs/rollup-plugin-minify-html-literals';

/** @type {import("rollup").RollupOptions} */
export default {
  input: 'index.html',
  output: {
    entryFileNames: '[hash].js',
    chunkFileNames: '[hash].js',
    assetFileNames: '[hash][extname]',
    format: 'es',
    dir: 'dist',
    manualChunks: function manualChunks(id) {
      if (id.endsWith('app/app-slice.js') || id.endsWith('app/index.js')) {
        return 'appslice';
      }
    },
  },
  preserveEntrySignatures: false,

  plugins: [
    minifyHTML({ failOnError: true }),
    /** Enable using HTML as rollup entrypoint */
    html({
      minify: true,
    }),
    /** Resolve bare module imports */
    nodeResolve(),
    json(),
    copy({ patterns: ['images/**', 'manifest.json'] }),
    /** Minify JS, compile JS to a lower language target */
    // esbuild({
    //   minify: true,
    //   target: ['chrome64', 'firefox67', 'safari11.1'],
    // }),
    /** Minify html and css tagged template literals */
    babel({
      babelHelpers: 'bundled',
      plugins: [
        /* [
          'babel-plugin-template-html-minifier',
          {
            modules: { lit: ['html', { name: 'css', encapsulation: 'style' }] },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ], */
        // ['@babel/plugin-syntax-import-attributes'],
      ],
    }),
  ],
};

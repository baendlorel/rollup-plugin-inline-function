// @ts-check
import { readFileSync } from 'node:fs';
import path from 'node:path';

// plugins
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import dts from 'rollup-plugin-dts';
import funcMacro from 'rollup-plugin-func-macro';
import constEnum from 'rollup-plugin-const-enum';

// custom plugins
import { replaceLiteralOpts, replaceOpts } from './.scripts/replace.mjs';

/**
 * @type {import('./package.json')}
 */
const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));

// # common options

/**
 * build config
 */
const tsconfig = './tsconfig.build.json';

/**
 * @type {import('@rollup/plugin-alias').RollupAliasOptions}
 */
const aliasOpts = {
  entries: [{ find: /^@\//, replacement: path.resolve(import.meta.dirname, 'src') + '/' }],
};

// # main options

/**
 * @type {import('rollup').RollupOptions[]}
 */
const options = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs',
        format: 'esm',
        sourcemap: false,
      },
      {
        file: 'dist/index.cjs',
        format: 'commonjs',
        sourcemap: false,
      },
    ],

    plugins: [
      alias(aliasOpts),
      replace({
        preventAssignment: false,
        delimiters: ['', ''],
        replaceLiteralOpts,
      }),
      replace(replaceOpts),
      funcMacro(),
      constEnum(),
      resolve(),
      commonjs(),
      typescript({ tsconfig, removeComments: false }),
      terser({
        format: {
          comments: false, // remove comments
        },
        compress: {
          reduce_vars: true,
          drop_console: true,
          dead_code: true, // ✅ Safe: remove dead code
          evaluate: true, // ✅ Safe: evaluate constant expressions
        },
        mangle: {
          properties: {
            regex: /^_/, // only mangle properties starting with '_'
          },
        },
      }),
    ].filter(Boolean),
    external: [],
  },
];

/**
 * @type {import('rollup').RollupOptions}
 */
const declaration = {
  input: 'src/index.ts',
  output: [{ file: 'dist/index.d.ts', format: 'es' }],
  plugins: [alias(aliasOpts), replace(replaceOpts), dts({ tsconfig })],
};

/**
 * @type {'npm'|'rollup-plugin'|'vscode-extension'|'server'|'web'|'app'|'framework'}
 */
switch (pkg.purpose) {
  case 'npm':
  case 'rollup-plugin':
    options.push(declaration);
    break;
}

export default options;

/*
 * @Author: YEYI millerye1995@foxmail.com
 * @Date: 2025-12-15 14:57:41
 * @LastEditors: YEYI millerye1995@foxmail.com
 * @LastEditTime: 2025-12-15 14:57:45
 * @FilePath: \text-layout\rollup.config.mjs
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import dts from 'rollup-plugin-dts';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      postcss({
        extract: true, // Extract to a separate CSS file
        minimize: true,
        use: ['less'],
      }),
      typescript({ tsconfig: './tsconfig.json' }),
    ],
    external: [...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.dependencies || {})],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts(), postcss({ extract: false, inject: false })], // ignore css in dts build
  },
];

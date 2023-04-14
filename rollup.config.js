import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import json from 'rollup-plugin-json';
import path from 'path';

export default {
  input: path.resolve(__dirname, 'main.js'),
  output: {
    file: 'public/dist/bundle.js',
    format: 'iife',
    name: 'MyMetaverse',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    json(),
    terser(),
  ],
  treeshake: false, // Add this line
};

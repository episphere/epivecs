
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: "src/processing.js",
    output: {
      file: `dist/processing.min.js`,
      name: "tool",
      format: "umd",
    },
    plugins: [
      terser(),
      resolve(),
      commonjs()
    ]
  },
  {
    input: "src/processing.js",
    output: {
      file: `dist/processing.js`,
      name: "tool",
      format: "esm",
    },
    plugins: [
      terser(),
      resolve(),
      commonjs()
    ]
  }
]
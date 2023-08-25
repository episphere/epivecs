
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: "src/tool.js",
    output: {
      file: `dist/tool.min.js`,
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
    input: "src/tool.js",
    output: {
      file: `dist/tool.js`,
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
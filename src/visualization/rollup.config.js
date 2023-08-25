
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: "src/index.js",
    output: {
      file: `dist/visualization.min.js`,
      name: "visualization",
      format: "umd",
    },
    plugins: [
      terser(),
      resolve(),
      commonjs()
    ]
  },
  {
    input: "src/index.js",
    output: {
      file: `dist/visualization.js`,
      name: "visualization",
      format: "esm",
    },
    plugins: [
      terser(),
      resolve(),
      commonjs()
    ]
  }
]
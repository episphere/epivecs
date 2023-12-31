
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: "src/index.js",
    output: {
      file: `dist/cluster_embedding.min.js`,
      name: "clusterEmbedding",
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
      file: `dist/cluster_embedding.js`,
      name: "clusterEmbedding",
      format: "esm",
    },
    plugins: [
      terser(),
      resolve(),
      commonjs()
    ]
  }
]
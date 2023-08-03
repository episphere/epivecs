import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'index.js', 
  output: {
    file: 'dist/bundle.js',
    format: 'es',  
  },
  plugins: [resolve(), terser(), commonjs()],
};
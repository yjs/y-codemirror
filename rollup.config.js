import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import cssbundle from 'rollup-plugin-css-bundle';

const debugResolve = {
  resolveId (importee) {
    if (importee === 'y-codemirror') {
      return `${process.cwd()}/src/y-codemirror.js`
    }
    if (importee === 'yjs') {
      return `${process.cwd()}/node_modules/yjs/src/index.js`
    }
    return null
  }
}

export default [{
  input: './src/y-codemirror.js',
  external: id => /^(lib0|yjs|y-protocols|simple-peer)/.test(id),
  output: [{
    name: 'y-codemirror',
    file: 'dist/y-codemirror.cjs',
    format: 'cjs',
    sourcemap: true
  }]
}, {
  input: './demo/codemirror.js',
  output: {
    name: 'test',
    file: 'dist/demo.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    debugResolve,
    cssbundle(),
    nodeResolve({
      mainFields: ['module', 'browser', 'main']
    }),
    commonjs()
  ]
}, {
  input: './test/index.js',
  output: {
    name: 'test',
    file: 'dist/test.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    debugResolve,
    nodeResolve({
      mainFields: ['module', 'browser', 'main']
    }),
    commonjs()
  ]
}]

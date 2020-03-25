
export default [{
  input: './src/y-codemirror.js',
  external: id => /^(lib0|yjs|y-protocols|simple-peer)/.test(id),
  output: [{
    name: 'y-codemirror',
    file: 'dist/y-codemirror.cjs',
    format: 'cjs',
    sourcemap: true,
    paths: path => {
      if (/^lib0\//.test(path)) {
        return `lib0/dist${path.slice(4, -3)}.cjs`
      } else if (/^y-protocols\//.test(path)) {
        return `y-protocols/dist${path.slice(11, -3)}.cjs`
      }
      return path
    }
  }]
}]

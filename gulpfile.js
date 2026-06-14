const { src, dest } = require('gulp');

// Copies node/credential icons (svg/png) into dist so n8n can resolve
// `icon: 'file:relatasql.svg'` at runtime. tsc only emits .js/.d.ts.
function buildIcons() {
  const nodeIcons = src('nodes/**/*.{png,svg}').pipe(dest('dist/nodes'));
  src('credentials/**/*.{png,svg}').pipe(dest('dist/credentials'));
  return nodeIcons;
}

exports['build:icons'] = buildIcons;

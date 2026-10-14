const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@opennextjs',
  'cloudflare',
  'dist',
  'cli',
  'build',
  'patches',
  'plugins',
  'load-manifest.js'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  let modified = false;

  if (content.includes('prefetch-hints}.json') && !content.includes('preview-props}.json')) {
    content = content.replace('prefetch-hints}.json', 'prefetch-hints,preview-props}.json');
    modified = true;
  }

  if (content.includes('p.endsWith("prefetch-hints"))') && !content.includes('p.endsWith("preview-props")')) {
    content = content.replace(
      'p.endsWith("prefetch-hints"))',
      'p.endsWith("prefetch-hints") || p.endsWith("preview-props"))'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('Successfully patched @opennextjs/cloudflare for preview-props.json manifest support.');
  }
}

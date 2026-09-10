import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { minify } from 'terser';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = ['src/graintcp.js', 'src/worker.js'];
const parts = [];
for (const name of modules) {
  let source = await readFile(resolve(root, name), 'utf8');
  source = source.replace(/^import .* from '\.\/[^']+';\n/gm, '');
  if (name !== 'src/worker.js') source = source.replace(/^export (?=(?:async )?(?:function|class|const) )/gm, '');
  parts.push(source.trimEnd());
}
const source = parts.join('\n\n') + '\n';
const result = await minify(source, {
  module: true,
  compress: {
    passes: 3,
    drop_console: false,
    unsafe: false
  },
  mangle: {
    toplevel: true,
    keep_classnames: false,
    keep_fnames: false
  },
  format: {
    ascii_only: true,
    comments: false,
    semicolons: true
  },
  sourceMap: false
});
if (!result.code) throw new Error('Terser produced an empty deployment bundle');
const notice = '/*! cfnewup GrainTCP v4.1; derived from ToiCF/GrainTCP; GPL-3.0-only */\n';
const bundle = notice + result.code + '\n';
const output = resolve(root, '_worker.js');
if (process.argv.includes('--check')) {
  if (await readFile(output, 'utf8') !== bundle) {
    console.error('_worker.js is out of date. Run npm run build.');
    process.exitCode = 1;
  }
} else {
  await writeFile(output, bundle);
  console.log('Built _worker.js (' + Buffer.byteLength(bundle) + ' bytes)');
}

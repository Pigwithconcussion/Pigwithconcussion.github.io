import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, '_site');
const publicFiles = [
  'index.html', '404.html', '.nojekyll', 'app.js', 'config.js', 'languages.js',
  'styles.css', 'starfield.js', 'assets/patrick.svg'
];

const browser = { window: {} };
runInNewContext(await readFile(join(root, 'languages.js'), 'utf8'), browser);
const languages = Object.keys(browser.window.siteLanguages);
if (!languages.includes('en-US') || languages.some(code => !/^[a-z]{2}(?:-[A-Za-z]{2,4})?$/.test(code))) {
  throw new Error('Invalid locale list in languages.js.');
}

const allowed = new Set([...publicFiles, ...languages.map(code => code + '/index.html')]);
const directories = new Set([...allowed].map(name => posix.dirname(name)));
// A repeat build refreshes known files; refuse stale or linked output without deleting anything.
async function checkOutput(directory = '') {
  for (const entry of await readdir(join(output, directory), { withFileTypes: true })) {
    const name = posix.join(directory, entry.name);
    if (entry.isDirectory() && directories.has(name)) {
      await checkOutput(name);
    } else if (!entry.isFile() || !allowed.has(name)) {
      throw new Error('Unexpected output entry: _site/' + name);
    }
  }
}

await mkdir(output, { recursive: true });
if (!(await lstat(output)).isDirectory()) throw new Error('_site must be a directory.');
await checkOutput();
for (const file of publicFiles) {
  await mkdir(dirname(join(output, file)), { recursive: true });
  await copyFile(join(root, file), join(output, file));
}

const template = await readFile(join(root, 'index.html'), 'utf8');
const localePage = template.replace(/(\b(?:href|src)=")([^"#][^"]*)"/g, (attribute, prefix, value) => {
  return publicFiles.includes(value) ? prefix + '../' + value + '"' : attribute;
});
for (const code of languages) {
  const page = localePage.replace(/<html\b[^>]*>/, '<html lang="' + code + '" dir="' + (code === 'ar' ? 'rtl' : 'ltr') + '">');
  await mkdir(join(output, code), { recursive: true });
  await writeFile(join(output, code, 'index.html'), page);
}
console.log('Built ' + allowed.size + ' public files, including ' + languages.length + ' language routes in _site/.');

import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT must be a number from 0 to 65535.');
}

const locales = new Set(
  'zh-CN zh-Hant en-US ja-JP ko-KR th vi id fr-FR de-DE it es pt-BR nl da sv nb-NO fi pl cs sk hu ro bg hr el uk et lv lt ar tr'.split(' ')
);
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'config.js', 'languages.js', 'starfield.js']);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function route(requestTarget) {
  const path = decodeURIComponent(requestTarget.split('?')[0]);
  if (!path.startsWith('/') || path.includes('//')) return null;
  const parts = path.slice(1).split('/');
  if (locales.has(parts[0])) parts.shift();
  const name = parts.join('/');
  if (name === '') return 'index.html';
  if (publicFiles.has(name)) return name;
  if (parts[0] === 'assets' && parts.length > 1 &&
      parts.slice(1).every(part => /^[a-z0-9_-][a-z0-9_.-]*$/i.test(part)) &&
      Object.hasOwn(contentTypes, extname(name).toLowerCase())) {
    return name;
  }
  return null;
}

function sendText(request, response, status, message, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  response.end(request.method === 'HEAD' ? undefined : message);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return sendText(request, response, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  }
  try {
    const name = route(request.url);
    if (!name) return sendText(request, response, 404, 'Not found');
    const publicPath = resolve(root, name);
    const file = await realpath(publicPath);
    if (relative(publicPath, file)) return sendText(request, response, 404, 'Not found');
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(name).toLowerCase()],
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error instanceof URIError ? 400 : 404;
    sendText(request, response, status, status === 400 ? 'Bad request' : 'Not found');
  }
});

server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Patrick site: http://127.0.0.1:${server.address().port}/en-US`);
});

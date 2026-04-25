const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 4173;
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
};

http.createServer((request, response) => {
    const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(root, safePath);

    fs.readFile(filePath, (error, contents) => {
        if (error) {
            response.statusCode = 404;
            response.end('Not found');
            return;
        }

        response.setHeader('Content-Type', mimeTypes[path.extname(filePath)] || 'text/plain; charset=utf-8');
        response.end(contents);
    });
}).listen(port, '127.0.0.1');

console.log(`Server running at http://127.0.0.1:${port}`);

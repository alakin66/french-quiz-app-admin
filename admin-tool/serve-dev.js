// Minimal static file server for Tauri dev with no-cache headers.
// Usage: node serve-dev.js [port] [dir]
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '1420', 10);
const ROOT = path.resolve(process.argv[3] || 'src');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            process.stderr.write(`404 ${urlPath}\n`);
            res.writeHead(404); res.end('Not found'); return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': mime,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
        });
        res.end(data);
        process.stderr.write(`200 ${urlPath}\n`);
    });
}).listen(PORT, () => {
    process.stderr.write(`Dev server listening on http://localhost:${PORT}  root=${ROOT}\n`);
});

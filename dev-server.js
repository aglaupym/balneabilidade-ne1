// Servidor local para testar o projeto sem conta na Vercel:  npm start  ->  http://localhost:3000
// Serve a pasta public/ (site estático).
const http = require("http"), fs = require("fs"), path = require("path");

const PUB = path.join(__dirname, "public"), PORT = process.env.PORT || 3000;
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg", ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml" };

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\/\\])+/, "");
  if (p.endsWith(path.sep) || p === ".") p = path.join(p, "index.html");
  const file = path.join(PUB, p);
  if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end("403"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end("404"); }
    res.setHeader("Content-Type", TIPOS[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(PORT, () => console.log(`NE1 Balneabilidade rodando em http://localhost:${PORT}`));

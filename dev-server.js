// Servidor local para testar o projeto sem conta na Vercel:  npm start  ->  http://localhost:3000
// Serve a pasta public/ e executa api/ler-imagem.js como na Vercel.
const http = require("http"), fs = require("fs"), path = require("path");

try { // carrega .env (sem dependências)
  fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch {}

const PUB = path.join(__dirname, "public"), PORT = process.env.PORT || 3000;
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg", ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml" };
const api = require("./api/ler-imagem.js");

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/ler-imagem") {
    let buf = [], n = 0;
    req.on("data", c => { n += c.length; if (n < 8e6) buf.push(c); });
    req.on("end", async () => {
      try { req.body = JSON.parse(Buffer.concat(buf).toString() || "{}"); } catch { req.body = null; }
      res.status = c => { res.statusCode = c; return res; };
      res.json = o => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(o)); };
      try { await api(req, res); } catch (e) { console.error(e); res.status(500).json({ error: "Erro interno." }); }
    });
    return;
  }
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\/\\])+/, "");
  if (p.endsWith(path.sep) || p === ".") p = path.join(p, "index.html");
  const file = path.join(PUB, p);
  if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end("403"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end("404"); }
    res.setHeader("Content-Type", TIPOS[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(PORT, () => console.log(`NE1 Balneabilidade rodando em http://localhost:${PORT}  (leitura de print: ${process.env.ANTHROPIC_API_KEY ? "ATIVA" : "desativada - falta ANTHROPIC_API_KEY no .env"})`));

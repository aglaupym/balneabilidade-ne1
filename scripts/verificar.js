// "Build" do projeto: o site é estático (HTML/CSS/JS puros), então não há compilação.
// Este script confere se tudo que a Vercel vai publicar está presente e sem erro de sintaxe.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const raiz = path.join(__dirname, "..");
const obrigatorios = [
  "public/index.html", "public/css/style.css", "public/js/praias.js", "public/js/app.js",
  "public/assets/bg-ne1.jpg", "public/assets/logo-ne1.png",
  "public/js/ocr.js", "public/vendor/pdf.min.js", "public/vendor/pdf.worker.min.js",
  "public/vendor/tesseract/tesseract.min.js", "public/vendor/tesseract/worker.min.js",
  "public/vendor/tesseract/tesseract-core-lstm.wasm.js", "public/vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
  "public/vendor/tesseract/lang/por.traineddata.gz", "vercel.json"
];
const erros = [];
obrigatorios.forEach(f => { if (!fs.existsSync(path.join(raiz, f))) erros.push("Arquivo ausente: " + f); });

["public/js/praias.js", "public/js/ocr.js", "public/js/app.js", "dev-server.js"].forEach(f => {
  try { execFileSync(process.execPath, ["--check", path.join(raiz, f)], { stdio: "pipe" }); }
  catch (e) { erros.push("Erro de sintaxe em " + f + "\n" + String(e.stderr || e.message)); }
});

const html = fs.readFileSync(path.join(raiz, "public/index.html"), "utf8");
(html.match(/(?:src|href)="(?!https?:|data:)([^"#]+)"/g) || []).forEach(m => {
  const p = m.replace(/^(?:src|href)="/, "").replace(/"$/, "");
  if (!fs.existsSync(path.join(raiz, "public", p))) erros.push("index.html aponta para arquivo inexistente: " + p);
});

const n = (fs.readFileSync(path.join(raiz, "public/js/praias.js"), "utf8").match(/\["[A-Z]{3}-\d{2}"/g) || []).length;
if (n !== 27) erros.push("Esperadas 27 praias em praias.js, encontradas " + n);

if (erros.length) { console.error("✖ Verificação falhou:\n- " + erros.join("\n- ")); process.exit(1); }
console.log("✔ Projeto OK: 27 praias, arquivos presentes, JavaScript sem erros. Pasta publicada: public/");

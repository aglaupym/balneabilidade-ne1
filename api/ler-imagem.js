// Função serverless (Vercel) — lê um print do informativo da CPRH usando a API da Anthropic.
// A chave fica só no servidor (variável de ambiente ANTHROPIC_API_KEY).
const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const LIMITE_HORA = Number(process.env.RATE_LIMIT_PER_HOUR || 20);   // por IP (melhor esforço)
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const usos = new Map();

function limitado(ip) {
  const agora = Date.now(), h = (usos.get(ip) || []).filter(t => agora - t < 3600e3);
  if (h.length >= LIMITE_HORA) { usos.set(ip, h); return true; }
  h.push(agora); usos.set(ip, h);
  if (usos.size > 5000) usos.clear();
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Método não permitido." }); }

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return res.status(503).json({ error: "Leitura de imagem não está configurada no servidor. Envie o PDF original." });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  if (limitado(ip)) return res.status(429).json({ error: "Muitas leituras de imagem em pouco tempo. Tente mais tarde ou envie o PDF." });

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = null; } }
  const { image, mediaType, codes } = b || {};
  if (typeof image !== "string" || !image || image.length > 5.5e6) return res.status(413).json({ error: "Imagem ausente ou grande demais." });
  if (!TIPOS.includes(mediaType)) return res.status(400).json({ error: "Formato de imagem não suportado." });
  if (!Array.isArray(codes) || !codes.length || codes.length > 40 || !codes.every(c => /^[A-Z]{3}-\d{2}$/.test(c)))
    return res.status(400).json({ error: "Lista de pontos inválida." });

  const prompt = `A imagem é a 1ª página de um informativo de balneabilidade da CPRH (Pernambuco). Leia a tabela e responda SOMENTE com JSON no formato:
{"data":"dd/mm/aaaa","coleta":"dd/mm/aaaa","numero":"40/2026","periodo":"dd/mm/aaaa a dd/mm/aaaa","pontos":{"ITA-20":"Imprópria","ITA-10":"Própria"}}
"data" é o campo DATA do cabeçalho; "coleta" é DATA DA COLETA. Inclua em "pontos" exatamente estes códigos de ponto de coleta: ${codes.join(", ")}. Valores só "Própria" ou "Imprópria"; use null no que estiver ilegível. Não invente nada.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO, max_tokens: 1500,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: prompt }] }]
      })
    });
    if (!r.ok) { console.error("Anthropic API", r.status, (await r.text()).slice(0, 300)); return res.status(502).json({ error: "Falha ao consultar o serviço de leitura de imagem. Envie o PDF original." }); }
    const j = await r.json();
    const t = (j.content || []).map(x => x.text || "").join("");
    const i = t.indexOf("{"), f = t.lastIndexOf("}");
    const o = JSON.parse(t.slice(i, f + 1));
    const s = v => (typeof v === "string" ? v : "");
    const pontos = {};
    codes.forEach(c => { const v = o.pontos && o.pontos[c]; pontos[c] = typeof v === "string" ? v : null; });
    return res.status(200).json({ data: s(o.data), coleta: s(o.coleta), numero: s(o.numero), periodo: s(o.periodo), pontos });
  } catch (e) {
    console.error("ler-imagem:", e);
    return res.status(502).json({ error: "Não consegui interpretar a imagem. Tente um print mais nítido ou envie o PDF." });
  }
};

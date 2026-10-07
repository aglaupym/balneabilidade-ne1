// Leitura de PRINT sem servidor e sem custo.
// A coluna "Classificação" do informativo é colorida (vermelho = Imprópria, verde = Própria). Detectamos as
// 27 linhas da tabela pela cor, na ordem da lista P (praias.js). O OCR (Tesseract) lê só o cabeçalho (datas).
// Sem uso do DOM, para poder ser testado em Node.

// ---- Detecção pela COR da coluna "Classificação" (vermelho = Imprópria, verde = Própria) ----
// Acha as linhas da tabela como faixas horizontais coloridas na coluna mais à direita; se encontrar
// exatamente 27 linhas igualmente espaçadas, a ordem delas é a ordem de P. Retorna {pontos} ou {erro}.
function corPontos(img) {
  const W = img.width, H = img.height, d = img.data;
  const cor = i => {                                   // 1 = vermelho, 2 = verde, 0 = nenhum
    const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 100 || (mx - mn) / mx < 0.5) return 0;
    if (r >= g * 1.8 && r >= b * 1.8) return 1;
    if (g >= r * 1.5 && g >= b * 1.3) return 2;
    return 0;
  };
  const colX = new Uint32Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cor((y * W + x) * 4)) colX[x]++;
  let xmax = -1;
  for (let x = W - 1; x >= 0; x--) if (colX[x] >= 3) { xmax = x; break; }
  if (xmax < 0) return { erro: "Não encontrei texto vermelho/verde. Use o print colorido da tabela." };
  const gap = Math.max(6, Math.round(W * 0.012));
  let xmin = xmax, vazio = 0;
  for (let x = xmax; x >= 0 && vazio <= gap; x--) { if (colX[x] >= 1) { xmin = x; vazio = 0; } else vazio++; }

  const red = new Uint32Array(H), grn = new Uint32Array(H);
  for (let y = 0; y < H; y++) for (let x = xmin; x <= xmax; x++) {
    const c = cor((y * W + x) * 4); if (c === 1) red[y]++; else if (c === 2) grn[y]++;
  }
  const bandas = []; let ini = -1, fim = -1;
  const mergeGap = Math.max(3, Math.round(H * 0.0015));
  for (let y = 0; y <= H; y++) {
    const on = y < H && red[y] + grn[y] >= 4;
    if (on) { if (ini < 0) ini = y; fim = y; }
    else if (ini >= 0 && (y >= H || y - fim > mergeGap)) {
      let r = 0, g = 0; for (let k = ini; k <= fim; k++) { r += red[k]; g += grn[k]; }
      bandas.push({ c: (ini + fim) / 2, h: fim - ini + 1, imp: r > g }); ini = -1;
    }
  }
  if (bandas.length < P.length) return { erro: "Encontrei só " + bandas.length + " linhas coloridas (esperado " + P.length + "). O print precisa mostrar a tabela inteira." };

  const gaps = bandas.slice(1).map((b, i) => b.c - bandas[i].c), med = gaps.slice().sort((a, b) => a - b)[gaps.length >> 1];
  let melhor = [], atual = [bandas[0]];                // maior sequência de linhas com espaçamento regular
  for (let i = 1; i < bandas.length; i++) {
    const g = gaps[i - 1];
    if (g >= med * 0.6 && g <= med * 1.5) atual.push(bandas[i]); else { if (atual.length > melhor.length) melhor = atual; atual = [bandas[i]]; }
  }
  if (atual.length > melhor.length) melhor = atual;
  if (melhor.length !== P.length) return { erro: "Encontrei " + melhor.length + " linhas na tabela (esperado " + P.length + "). Envie um print que mostre as 27 praias." };
  const pontos = {}; P.forEach((p, i) => pontos[p[0]] = melhor[i].imp);
  return { pontos };
}

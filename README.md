# NE1 · Balneabilidade → CSV

Transforma o PDF do informativo de balneabilidade da CPRH em um CSV com as 27 praias, a classificação (Própria/Imprópria) e a data do documento. O CSV é usado pelo script `Balneabilidade.jsx` do After Effects.

- O PDF é lido no próprio navegador (pdf.js): **sem servidor, sem chave de API e sem custo**.
- Site estático em HTML, CSS e JavaScript puros. Não tem dependências npm.

## 1. Instalar

Requisito: [Node.js](https://nodejs.org) 18 ou mais novo (`node -v` mostra a versão).

```bash
git clone <URL-do-seu-repositorio>
cd balneabilidade-ne1
```

Não precisa de `npm install`.

## 2. Rodar localmente

```bash
npm run dev
```

Abra http://localhost:3000. Para usar outra porta: `PORT=4000 npm run dev`.

## 3. Build

O site é estático, então não há compilação. O comando abaixo confere se todos os arquivos estão presentes e se o JavaScript não tem erros:

```bash
npm run build
```

A pasta que vai ao ar é `public/`.

## 4. Publicar na Vercel

1. Suba o projeto para o GitHub.
2. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe o repositório.
3. Não mude nenhuma configuração (o `vercel.json` já indica a pasta `public`) e clique em **Deploy**.

Não é preciso cadastrar nenhuma variável de ambiente.

## Dicas

- Use o PDF original da CPRH (com texto, não escaneado).
- Se a data não for lida, digite no campo **Data do documento**.
- Clique em qualquer classificação para corrigir, se necessário.

## Estrutura

```
public/            site (é o que a Vercel publica)
  index.html
  css/style.css
  js/praias.js     lista das 27 praias (código CPRH → nome da comp)
  js/app.js        leitura, tabela e CSV
  assets/          fundo e logo NE1
  vendor/          pdf.js (cópia local, sem CDN)
dev-server.js      servidor local (npm run dev)
scripts/verificar.js
vercel.json  package.json  .gitignore
```

## Formato do CSV

```
data_documento;01/10/2026
indice;praia;codigo;classificacao;impropria
1;Jaguaribe;ITA-20;Imprópria;1
```

Se a CPRH mudar os pontos de coleta, ajuste `public/js/praias.js`.

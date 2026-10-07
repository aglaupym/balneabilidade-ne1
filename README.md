# NE1 · Balneabilidade → CSV

Transforma o informativo de balneabilidade da CPRH (PDF ou print da 1ª página) em um CSV com as 27 praias, a classificação (Própria/Imprópria) e a data do documento. O CSV é usado pelo script `Balneabilidade.jsx` do After Effects.

- **PDF:** lido no próprio navegador, sem custo.
- **Print:** lido por IA através de uma função no servidor (precisa de uma chave da API da Anthropic).
- Site estático em HTML, CSS e JavaScript puros. **Não tem dependências npm.**

## 1. Instalar

Requisito: [Node.js](https://nodejs.org) 18 ou mais novo (`node -v` mostra a versão).

```bash
git clone <URL-do-seu-repositorio>
cd balneabilidade-ne1
```

Não precisa de `npm install`.

Só para ler **print**, crie o arquivo de configuração local:

```bash
cp .env.example .env      # no Windows: copy .env.example .env
```

e preencha `ANTHROPIC_API_KEY=` com a sua chave. Sem a chave, tudo funciona, menos a leitura de print.

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
4. Para a leitura de print: **Settings > Environment Variables**, adicione `ANTHROPIC_API_KEY` (opcionais: `ANTHROPIC_MODEL`, `RATE_LIMIT_PER_HOUR`) e faça um novo deploy (**Deployments > Redeploy**).

O site fica público e sem login. A leitura de print gasta a **sua** chave: há limite por IP (20/hora por padrão, em melhor esforço), e vale definir também um limite de gasto no console da Anthropic.

## Estrutura

```
public/            site (é o que a Vercel publica)
  index.html
  css/style.css
  js/praias.js     lista das 27 praias (código CPRH → nome da comp)
  js/app.js        leitura, tabela e CSV
  assets/          fundo e logo NE1
  vendor/          pdf.js (cópia local)
api/ler-imagem.js  função serverless que lê o print
dev-server.js      servidor local (npm run dev)
scripts/verificar.js
vercel.json  package.json  .env.example  .gitignore
```

## Formato do CSV

```
data_documento;01/10/2026
indice;praia;codigo;classificacao;impropria
1;Jaguaribe;ITA-20;Imprópria;1
```

Se a CPRH mudar os pontos de coleta, ajuste `public/js/praias.js`.

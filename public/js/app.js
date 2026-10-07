// Lógica da página (PDF -> CSV de balneabilidade). Depende de js/praias.js e vendor/pdf.min.js
const $=id=>document.getElementById(id);
let st={},info={};

function msg(t,err){$("msg").textContent=t;$("msg").className=err?"err":""}
function cls(s){s=(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return /^impr/.test(s)?true:/^prop/.test(s)?false:null}

function parseText(t){
  // o pdf.js entrega o texto com espaços no meio ("ITA - 20", "0 1 / 1 0 /2026"): normaliza antes de ler
  t=t.replace(/\s*\/\s*/g,"/").replace(/(\d)[ \t]+(?=\d)/g,"$1").replace(/\b([A-Z]{3})\s*-\s*(\d{2})\b/g,"$1-$2");
  const codes=new Set(P.map(p=>p[0])),ms=[...t.matchAll(/\b([A-Z]{3}-\d{2})\b/g)].filter(m=>codes.has(m[1])),out={};
  ms.forEach((m,i)=>{const end=i+1<ms.length?ms[i+1].index:t.length,c=t.slice(m.index+m[0].length,end).match(/\b(Impr[óo]pria|Pr[óo]pria)\b/i);
    if(c&&!(m[1] in out))out[m[1]]=cls(c[1])});
  const g=r=>{const m=t.match(r);return m?m[1]:""},pr=t.match(/PER[ÍI]ODO:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i);
  return{pontos:out,data:g(/\bDATA:\s*(\d{2}\/\d{2}\/\d{4})/),coleta:g(/DATA DA COLETA:\s*(\d{2}\/\d{2}\/\d{4})/),numero:g(/INFORMATIVO N[ºo°]?:\s*(\d+\/\d{4})/),periodo:pr?pr[1]+" a "+pr[2]:""};
}

function show(r){
  st={};P.forEach(p=>st[p[0]]=(r.pontos&&p[0] in r.pontos)?r.pontos[p[0]]:null);
  info=r;$("dt").value=r.data||"";
  $("meta").textContent=[r.numero&&"Informativo "+r.numero,r.coleta&&"Coleta "+r.coleta,r.periodo&&"Período "+r.periodo].filter(Boolean).join(" · ");
  $("res").hidden=false;render();
}
function render(){
  $("tb").innerHTML=P.map((p,i)=>{const v=st[p[0]],k=v===null?"u":v?"i":"o",t=v===null?"?":v?"Imprópria":"Própria";
    return `<tr><td class="n">${i+1}</td><td>${p[1]}</td><td>${p[0]}</td><td><button class="pill ${k}" data-c="${p[0]}">${t}</button></td><td>${v===null?"":v?1:0}</td></tr>`}).join("");
  const miss=P.filter(p=>st[p[0]]===null).length,imp=P.filter(p=>st[p[0]]===true).length;
  $("cnt").textContent=miss?miss+" sem leitura (clique em ? para definir)":imp+" impróprias de "+P.length;
  $("dl").disabled=$("cp").disabled=miss>0;
}
$("tb").onclick=e=>{const c=e.target.dataset&&e.target.dataset.c;if(!c)return;st[c]=st[c]===null?true:!st[c];render()};

function csv(){
  const L=["data_documento;"+$("dt").value.trim(),"indice;praia;codigo;classificacao;impropria"];
  P.forEach((p,i)=>L.push([i+1,p[1],p[0],st[p[0]]?"Imprópria":"Própria",st[p[0]]?1:0].join(";")));
  return L.join("\n")+"\n";
}
$("dl").onclick=()=>{
  const b=new Blob(["\ufeff"+csv()],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
  a.href=URL.createObjectURL(b);a.download="Tabela_Balneabilidade.csv";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);msg("CSV baixado.");
};
$("cp").onclick=async()=>{try{await navigator.clipboard.writeText(csv());msg("CSV copiado.")}catch(e){msg("Não foi possível copiar.",1)}};

async function pdfFile(file){
  if(!window.pdfjsLib)throw new Error("Leitor de PDF não carregou. Recarregue a página.");
  pdfjsLib.GlobalWorkerOptions.workerSrc="vendor/pdf.worker.min.js";
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,pg=await pdf.getPage(1);
  const tc=await pg.getTextContent(),r=parseText(tc.items.map(i=>i.str).join(" "));
  if(!Object.keys(r.pontos).length)throw new Error("Não encontrei as praias neste PDF. Envie o PDF original do informativo da CPRH (com texto, não escaneado).");
  return r;
}
async function handle(file){
  if(!file)return;$("res").hidden=true;msg("Lendo "+(file.name||"arquivo")+"…");
  try{
    const isPdf=file.type==="application/pdf"||/\.pdf$/i.test(file.name||"");
    if(!isPdf)throw new Error("Envie o PDF do informativo da CPRH.");
    const r=await pdfFile(file);
    show(r);const miss=P.filter(p=>st[p[0]]===null).length;
    const semData=!$("dt").value.trim();
    msg(miss?"Leitura concluída com "+miss+" ponto(s) sem classificação.":semData?"Praias lidas. A data não foi encontrada: digite no campo Data do documento.":"Pronto: confira os dados e baixe o CSV.",!!miss||semData);
  }catch(e){msg(e.message||(e.code?"Falha na leitura ("+e.code+").":"Não foi possível ler o arquivo."),1)}
}
const dz=$("drop");
dz.onclick=()=>$("file").click();$("file").onchange=e=>handle(e.target.files[0]);
dz.ondragover=e=>{e.preventDefault();dz.classList.add("over")};dz.ondragleave=()=>dz.classList.remove("over");
dz.ondrop=e=>{e.preventDefault();dz.classList.remove("over");handle(e.dataTransfer.files[0])};

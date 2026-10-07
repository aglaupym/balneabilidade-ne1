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

async function toJpeg(src){
  const bmp=src instanceof HTMLCanvasElement?src:await createImageBitmap(src),k=Math.min(1,2000/bmp.width),c=document.createElement("canvas");
  c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  return new Promise(r=>c.toBlob(r,"image/jpeg",.88));
}
function blobToBase64(b){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=()=>rej(new Error("Falha ao preparar a imagem."));r.readAsDataURL(b)})}
async function viaImage(blob){
  msg("Lendo a imagem com IA (pode levar até 1 min)…");
  let resp;
  try{
    resp=await fetch("/api/ler-imagem",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({image:await blobToBase64(blob),mediaType:blob.type||"image/jpeg",codes:P.map(p=>p[0])})});
  }catch(e){throw new Error("Não foi possível falar com o servidor. Verifique a conexão ou envie o PDF original.")}
  const r=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(r.error||"Falha na leitura da imagem ("+resp.status+"). Envie o PDF original.");
  const pt={};Object.keys(r.pontos||{}).forEach(k=>pt[k]=cls(r.pontos[k]));
  return{pontos:pt,data:r.data||"",coleta:r.coleta||"",numero:r.numero||"",periodo:r.periodo||""};
}
async function pdfFile(file){
  if(!window.pdfjsLib)throw new Error("Leitor de PDF não carregou. Envie um print da página.");
  pdfjsLib.GlobalWorkerOptions.workerSrc="vendor/pdf.worker.min.js";
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,pg=await pdf.getPage(1);
  const tc=await pg.getTextContent(),r=parseText(tc.items.map(i=>i.str).join(" "));
  if(Object.keys(r.pontos).length>=P.length)return r;
  msg("Texto do PDF incompleto; lendo como imagem…");
  const vp=pg.getViewport({scale:2}),c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;
  await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
  return viaImage(await toJpeg(c));
}
async function handle(file){
  if(!file)return;$("res").hidden=true;msg("Lendo "+(file.name||"imagem colada")+"…");
  try{
    const isPdf=file.type==="application/pdf"||/\.pdf$/i.test(file.name||"");
    const r=isPdf?await pdfFile(file):await viaImage(await toJpeg(file));
    show(r);const miss=P.filter(p=>st[p[0]]===null).length;
    msg(miss?"Leitura concluída com "+miss+" ponto(s) sem classificação.":"Pronto: confira os dados e baixe o CSV.",!!miss);
  }catch(e){msg(e.message||(e.code?"Falha na leitura ("+e.code+").":"Não foi possível ler o arquivo."),1)}
}
const dz=$("drop");
dz.onclick=()=>$("file").click();$("file").onchange=e=>handle(e.target.files[0]);
dz.ondragover=e=>{e.preventDefault();dz.classList.add("over")};dz.ondragleave=()=>dz.classList.remove("over");
dz.ondrop=e=>{e.preventDefault();dz.classList.remove("over");handle(e.dataTransfer.files[0])};
document.addEventListener("paste",e=>{const f=[...(e.clipboardData?e.clipboardData.files:[])][0];if(f)handle(f)});

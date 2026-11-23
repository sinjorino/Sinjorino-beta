/* PETGA v8 — prévia experimental leve do chat de voz do Sinjorino
   Instalação: coloque este arquivo na raiz do projeto (ao lado do index.html) e adicione,
   logo antes de </body> e DEPOIS do <script> principal:   <script src="petga.js"></script>
   Teste rápido: no console do navegador, Petga.reset() zera os 30 minutos. */
(()=>{
const $=s=>document.querySelector(s),VZ=$('#voz'),ORB=$('#vorb');
if(!VZ||!ORB)return;
const R=Math.random,TAU=Math.PI*2,LIMIT=30*60,KEY='s_petga_used',PKEY='s_petga_on';
const USE_MIC=true;                       /* false = ondas simuladas, sem pedir o microfone */
const ac=()=>typeof AC==='string'?AC:'255,255,255';
const isBusy=()=>typeof busy!=='undefined'&&busy;
const sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)},lp=(a,b,t)=>a+(b-a)*t,cl=x=>Math.max(0,Math.min(1,x));
const mmss=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
let used=0,pon=false;
try{used=Math.min(LIMIT,+localStorage.getItem(KEY)||0);pon=localStorage.getItem(PKEY)==='1'}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,String(Math.floor(used)));localStorage.setItem(PKEY,pon?'1':'0')}catch(e){}};

const MAP_LBLS=(typeof MAP_NAMES!=='undefined'&&Array.isArray(MAP_NAMES))
  ?MAP_NAMES
  :['ARQUITETURA','ÁRVORE','CAMADAS','RADAR','GRAFO','ESPECTRO','PIPELINE','TOPOLOGIA','VORTEX','MATRIZ'];

/* ---------- estilo (leve, sem backdrop-filter em cima de canvas animado) ---------- */
const css=document.createElement('style');
css.textContent=`
#map-tog,#side-maps{display:none!important}
#voz.petga{background:rgba(4,4,6,.96);backdrop-filter:none;-webkit-backdrop-filter:none}
#petga-cv{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
#voz.petga #vorb{opacity:0}
#voz.petga .vname,#voz.petga .vst,#voz.petga #vtx{position:relative;z-index:2;transition:opacity .7s var(--ease);text-shadow:0 0 16px rgba(4,4,6,.98)}
#voz.petga.think .vname,#voz.petga.think .vst,#voz.petga.think #vtx{opacity:0;pointer-events:none}
#voz.petga .vx{z-index:5}

#petga-hud{position:absolute;top:calc(18px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:9px;pointer-events:none;z-index:4}
.pg-seg{display:flex;padding:3px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(13,14,18,.9);pointer-events:auto}
.pg-seg button{display:flex;align-items:center;gap:6px;padding:7px 14px;border:0;border-radius:999px;background:transparent;color:var(--mut);font:500 11.5px var(--sans);cursor:pointer;white-space:nowrap;transition:.25s}
.pg-seg button small{font:600 8.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.pg-seg button.on{background:rgb(var(--ac));color:#070709;font-weight:600}
.pg-meta{display:flex;flex-direction:column;align-items:center;gap:7px;opacity:0;transition:opacity .8s var(--ease)}
#voz.petga .pg-meta{opacity:1}
.pg-bar{width:140px;height:1.5px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.pg-bar i{display:block;height:100%;width:100%;background:rgb(var(--ac));transform-origin:left;transition:transform 1s linear}
.pg-time{font:500 10px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);white-space:nowrap}
#voz.low .pg-time{color:rgb(var(--ac));animation:pgblink 1s steps(1) infinite}
@keyframes pgblink{50%{opacity:.35}}

/* Rótulo ao lado da logo personalizada no canto superior esquerdo */
#pg-brand-txt{
  position:absolute;display:flex;flex-direction:column;gap:3px;
  pointer-events:none;z-index:2;
  opacity:0;transform:translateX(-8px);
  transition:opacity .95s var(--ease),transform .95s var(--ease);
}
#pg-brand-txt.on{opacity:1;transform:none}
.pg-brand-name{font:600 12px var(--mono);letter-spacing:.26em;text-transform:uppercase;color:var(--ink)}
.pg-brand-sub{display:flex;align-items:center;gap:7px;font:400 12px var(--sans);color:var(--mut)}
.pg-brand-sub i{width:5px;height:5px;border-radius:50%;background:rgb(var(--ac));box-shadow:0 0 8px rgba(var(--ac),.75);animation:pgdot 1.8s ease-in-out infinite}
@keyframes pgdot{50%{opacity:.3;transform:scale(.75)}}

/* Canto superior direito: planilha estilizada de resumo dos pontos da fala */
#pg-sheet{
  position:absolute;display:flex;flex-direction:column;overflow:hidden;
  border-radius:16px;background:rgba(13,14,18,.9);
  border:1px solid rgba(255,255,255,.07);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 18px 46px rgba(0,0,0,.55);
  opacity:0;transform:translateY(-10px);pointer-events:none;z-index:3;
  transition:opacity .95s var(--ease),transform .95s var(--ease);
}
#pg-sheet.on{opacity:1;transform:none;pointer-events:auto}
.pg-sh-head{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 13px;border-bottom:1px solid rgba(255,255,255,.06);
  background:rgba(255,255,255,.018);flex:none;
}
.pg-sh-title{display:inline-flex;align-items:center;gap:7px;font:500 9.5px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--ink-2)}
.pg-sh-title i{width:5px;height:5px;border-radius:50%;background:rgb(var(--ac))}
.pg-sh-cnt{font:500 9px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.pg-sh-cols{
  display:grid;grid-template-columns:28px 92px minmax(0,1fr);
  border-bottom:1px solid rgba(255,255,255,.06);
  background:rgba(255,255,255,.02);flex:none;
}
.pg-sh-cols span{
  padding:6px 8px;font:500 8.5px var(--mono);letter-spacing:.14em;
  text-transform:uppercase;color:var(--mut);
}
.pg-sh-cols span+span{border-left:1px solid rgba(255,255,255,.05)}
.pg-sh-rows{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none}
.pg-sh-rows::-webkit-scrollbar{display:none}
.pg-sh-row{
  display:grid;grid-template-columns:28px 92px minmax(0,1fr);
  border-bottom:1px solid rgba(255,255,255,.045);
  transition:background .35s var(--ease),opacity .35s var(--ease);
}
.pg-sh-row:last-child{border-bottom:0}
.pg-sh-row.on{background:rgba(var(--ac),.065)}
.pg-sh-row span{
  padding:8px;font:400 11.5px/1.42 var(--sans);color:var(--ink-2);
  overflow-wrap:anywhere;
}
.pg-sh-row span+span{border-left:1px solid rgba(255,255,255,.045)}
.pg-sh-row .c-idx{
  font:500 10px/1.45 var(--mono);color:rgba(var(--ac),.72);
  text-align:center;padding:8px 4px;
}
.pg-sh-row .c-tag{
  font:500 10.5px/1.4 var(--mono);color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.pg-sh-row.on .c-sum{color:#fff}

/* Canto inferior direito: cartão de texto no estilo do site */
#pg-text-card{
  position:absolute;display:flex;flex-direction:column;gap:10px;
  padding:15px 18px;border-radius:18px;
  background:rgba(15,16,21,.9);border:1px solid rgba(255,255,255,.07);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 22px 54px rgba(0,0,0,.62);
  opacity:0;transform:translateY(14px);pointer-events:none;z-index:2;
  transition:opacity .95s var(--ease),transform .95s var(--ease);
}
#pg-text-card.on{opacity:1;transform:none;pointer-events:auto}
.pg-tc-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.pg-tc-eyebrow{display:inline-flex;align-items:center;gap:7px;font:500 9.5px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--mut)}
.pg-tc-eyebrow i{width:5px;height:5px;border-radius:50%;background:rgb(var(--ac));opacity:.85}
.pg-tc-mode{font:500 9.5px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02)}

#pg-lyrics{position:relative;flex:1;min-height:0;overflow:hidden;pointer-events:none;text-align:left;-webkit-mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}
.pg-ly-in{position:relative;display:flex;flex-direction:column;gap:.55em;transition:transform 1.05s var(--ease);will-change:transform}
.pg-ly-in div{font:400 var(--lyf,15px)/1.65 var(--sans);letter-spacing:0;color:var(--ink-2,#b6b8c4);opacity:.28;transition:opacity .65s var(--ease),color .45s var(--ease)}
.pg-ly-in div.past{opacity:.22}.pg-ly-in div.nx{opacity:.42}.pg-ly-in div.cur{opacity:1;color:var(--ink,#f5f5f7)}
.pg-ly-in span{transition:opacity .25s var(--ease),color .25s var(--ease)}
.pg-ly-in .cur span{opacity:.38}
.pg-ly-in .cur span.on{opacity:1;color:#fff}

#pg-end{position:absolute;bottom:calc(26px + env(safe-area-inset-bottom,0px));left:50%;transform:translate(-50%,14px);width:min(360px,90vw);padding:16px;border-radius:18px;background:rgba(16,17,22,.96);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 60px rgba(0,0,0,.8);display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;opacity:0;pointer-events:none;transition:opacity .6s var(--ease),transform .6s var(--ease);z-index:5}
#pg-end.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
#pg-end b{font:600 14px var(--disp);color:#fff}
#pg-end span{font:400 12.5px/1.5 var(--sans);color:var(--mut)}
#pg-end button{margin-top:8px;padding:10px 18px;border:0;border-radius:999px;background:rgb(var(--ac));color:#070709;font:600 12.5px var(--sans);cursor:pointer}`;
document.head.append(css);

const cv=document.createElement('canvas');cv.id='petga-cv';
const hud=document.createElement('div');hud.id='petga-hud';
hud.innerHTML='<div class="pg-seg"><button type="button" data-p="0">Voz comum</button><button type="button" data-p="1">Petga <small>prévia</small></button></div><div class="pg-meta"><div class="pg-bar"><i id="pg-fill"></i></div><div class="pg-time" id="pg-time"></div></div>';
const end=document.createElement('div');end.id='pg-end';
end.innerHTML='<b>Sua prévia do Petga acabou</b><span>O chat de voz comum continua funcionando. O Petga completo chega ao Modo Pro.</span><button type="button" id="pg-pro">Se inscrever no Pro</button>';

const brandTxt=document.createElement('div');brandTxt.id='pg-brand-txt';
brandTxt.innerHTML='<span class="pg-brand-name">Petga</span><span class="pg-brand-sub"><i></i><span id="pg-brand-st">pensando na resposta…</span></span>';

const sheet=document.createElement('div');sheet.id='pg-sheet';
sheet.innerHTML='<div class="pg-sh-head"><span class="pg-sh-title"><i></i>Resumo da fala</span><span class="pg-sh-cnt" id="pg-sh-cnt">aguardando</span></div><div class="pg-sh-cols"><span>#</span><span>Ponto</span><span>Síntese</span></div><div class="pg-sh-rows" id="pg-sh-rows"></div>';

const textCard=document.createElement('div');textCard.id='pg-text-card';
textCard.innerHTML='<div class="pg-tc-head"><span class="pg-tc-eyebrow"><i></i>Sinjorino</span><span class="pg-tc-mode" id="pg-tc-mode">pensando</span></div>';
const lyBox=document.createElement('div');lyBox.id='pg-lyrics';
const lyIn=document.createElement('div');lyIn.className='pg-ly-in';lyBox.append(lyIn);
textCard.append(lyBox);

VZ.prepend(cv);VZ.append(hud,brandTxt,sheet,textCard,end);
$('#pg-pro').onclick=()=>{const w=$('#waitlist-view');if(w)w.classList.add('on')};
const cx=cv.getContext('2d'),fill=$('#pg-fill'),tm=$('#pg-time');
const brandSt=$('#pg-brand-st'),tcMode=$('#pg-tc-mode'),shRows=$('#pg-sh-rows'),shCnt=$('#pg-sh-cnt');
const msgsEl=$('#msgs'),vtxEl=$('#vtx');
const app=$('#app');if(app)app.classList.add('maps-off');

/* ---------- microfone ---------- */
let aCtx=null,an=null,fd=null,stream=null,micOn=false,micBusy=false,micTried=false;
async function micStart(){
  if(!USE_MIC||micOn||micBusy||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return;
  micBusy=true;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    aCtx=new (window.AudioContext||window.webkitAudioContext)();an=aCtx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=.55;
    aCtx.createMediaStreamSource(stream).connect(an);fd=new Uint8Array(an.frequencyBinCount);micOn=true;
    if(aCtx.state==='suspended')aCtx.resume();
  }catch(e){micOn=false}
  micBusy=false;
}
function micStop(){try{stream&&stream.getTracks().forEach(x=>x.stop());aCtx&&aCtx.close()}catch(e){}stream=aCtx=an=null;micOn=false}
function readMic(){
  if(!micOn||!an)return null;an.getByteFrequencyData(fd);
  const avg=(a,b)=>{let s=0;for(let i=a;i<b;i++)s+=fd[i];return Math.max(0,s/(b-a)/255-.06)};
  return[avg(1,6),avg(6,20),avg(20,60)];
}

/* ---------- sincronização com a fala (navegador + voz da nuvem) ---------- */
let act=0,bnd=false,hookText='',pos=0,curChunkStart=0,curChunkBase=0,curChunkLen=0;
let pendingCloudText='',cloudAudio={active:false,start:0,dur:0,text:''};

if(window.fetch&&!window.fetch.__pg){
  const origFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(url.indexOf('/api/voz')!==-1&&init&&typeof init.body==='string'){
        const d=JSON.parse(init.body);
        if(d&&d.text)pendingCloudText=String(d.text);
      }
    }catch(e){}
    return origFetch(input,init);
  };
  window.fetch.__pg=1;
}
if(window.AudioBufferSourceNode&&AudioBufferSourceNode.prototype.start&&!AudioBufferSourceNode.prototype.__pg){
  const origStart=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(){
    try{
      if(VZ.classList.contains('on')&&this.buffer&&this.buffer.duration>0.25){
        cloudAudio={active:true,start:performance.now(),dur:this.buffer.duration,text:pendingCloudText||''};
        this.addEventListener('ended',()=>{cloudAudio.active=false});
      }
    }catch(e){}
    return origStart.apply(this,arguments);
  };
  AudioBufferSourceNode.prototype.__pg=1;
}
if(window.speechSynthesis&&speechSynthesis.speak&&!speechSynthesis.__pg){
  const origSpeak=speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak=function(u){
    try{
      const txt=String(u.text||'');
      if(txt.trim()){
        const base=hookText?hookText.length+1:0;
        hookText=hookText?hookText+' '+txt:txt;
        u.addEventListener('start',()=>{act++;curChunkBase=base;curChunkLen=txt.length;curChunkStart=performance.now();if(pos<base)pos=base});
        u.addEventListener('boundary',e=>{bnd=true;pos=Math.max(pos,base+(e.charIndex||0))});
        const fin=()=>{act=Math.max(0,act-1);if(!bnd)pos=Math.max(pos,base+txt.length)};
        u.addEventListener('end',fin);u.addEventListener('error',fin);
      }
    }catch(e){}
    return origSpeak(u);
  };
  speechSynthesis.__pg=1;
}
const spoken=()=>act>0||cloudAudio.active||(VZ.dataset.s==='speak')||!!(window.speechSynthesis&&speechSynthesis.speaking);

/* ---------- extrator da planilha de resumo ---------- */
let sheetSrc='\u0000',sheetRowsEls=[],activeSheetRow=-1;
function cleanLine(s){
  return String(s||'').replace(/[*_#`>~]/g,'').replace(/\s+/g,' ').trim();
}
function shortSum(s,max=78){
  s=cleanLine(s).replace(/^(basicamente,|ou seja,|na verdade,|então,|assim,|portanto,|além disso,)\s+/i,'');
  if(s.length<=max)return s;
  const cut=s.slice(0,max-1);
  const sp=cut.lastIndexOf(' ');
  return (sp>max*.5?cut.slice(0,sp):cut).trim()+'…';
}
function inferTag(s,idx,total){
  const mCol=s.match(/^([^:]{2,22}):\s*(.+)$/);
  if(mCol)return[mCol[1].trim(),mCol[2].trim()];
  const low=s.toLowerCase();
  if(/^\d+[.)]\s*/.test(s))return['Etapa '+(idx+1),s.replace(/^\d+[.)]\s*/,'')];
  if(/^[•\-–]\s*/.test(s))return['Tópico '+(idx+1),s.replace(/^[•\-–]\s*/,'')];
  if(/\b(é um|é uma|significa|define|consiste em|refere-se)\b/.test(low))return['Definição',s];
  if(/\b(primeiro|passo|etapa|comece|depois|em seguida)\b/.test(low))return['Passo '+(idx+1),s];
  if(/\b(por[eé]m|mas|contudo|entretanto|diferen[çc]a)\b/.test(low))return['Contraste',s];
  if(/\b(portanto|assim|conclus|resumo|ou seja|por isso)\b/.test(low))return['Conclusão',s];
  if(/\b(exemplo|como por|por exemplo)\b/.test(low))return['Exemplo',s];
  if(idx===0)return['Central',s];
  if(idx===total-1&&total>1)return['Síntese',s];
  return['Ponto '+(idx+1),s];
}
function buildSummary(text,isPlaceholder){
  sheetSrc=text;activeSheetRow=-1;shRows.textContent='';sheetRowsEls=[];
  if(isPlaceholder){
    shCnt.textContent='analisando';
    const r=document.createElement('div');r.className='pg-sh-row on';
    r.innerHTML='<span class="c-idx">00</span><span class="c-tag">Contexto</span><span class="c-sum">Organizando pontos da resposta…</span>';
    shRows.append(r);sheetRowsEls=[r];return;
  }
  const raw=String(text||'').replace(/\r/g,'');
  let parts=raw.split(/\n+/).map(cleanLine).filter(x=>x.length>6);
  if(parts.length<2){
    parts=(cleanLine(raw).match(/[^.!?]+[.!?]?/g)||[]).map(x=>x.trim()).filter(x=>x.length>8);
  }
  if(!parts.length&&raw.trim())parts=[cleanLine(raw)];

  let chosen=[];
  if(parts.length<=4)chosen=parts;
  else{
    chosen=[parts[0],parts[Math.floor(parts.length*.33)],parts[Math.floor(parts.length*.66)],parts[parts.length-1]];
    chosen=[...new Set(chosen)];
  }
  chosen=chosen.slice(0,4);
  shCnt.textContent=chosen.length+(chosen.length===1?' ponto':' pontos');

  chosen.forEach((p,i)=>{
    const [tag,body]=inferTag(p,i,chosen.length);
    const r=document.createElement('div');r.className='pg-sh-row';
    const c1=document.createElement('span');c1.className='c-idx';c1.textContent=String(i+1).padStart(2,'0');
    const c2=document.createElement('span');c2.className='c-tag';c2.textContent=tag;
    const c3=document.createElement('span');c3.className='c-sum';c3.textContent=shortSum(body);
    r.append(c1,c2,c3);shRows.append(r);sheetRowsEls.push(r);
  });
}
function sheetTick(totalLen){
  if(!sheetRowsEls.length||totalLen<=0)return;
  const idx=Math.min(sheetRowsEls.length-1,Math.floor(cl(pos/totalLen)*sheetRowsEls.length));
  if(idx!==activeSheetRow){
    activeSheetRow=idx;
    sheetRowsEls.forEach((r,i)=>r.classList.toggle('on',i===idx));
  }
}

/* ---------- cache de blur offscreen (desfoque suave a custo zero) + gradientes ---------- */
const blurCv=document.createElement('canvas'),blurCx=blurCv.getContext('2d');
let cacheW=0,cacheH=0,cacheAC='',bgVig=null,bandBgGrad=null,bandLineGrad=null,bandWaveGrad=null;
function bakeOffscreen(){
  const bw=Math.max(64,Math.round(W*.26)),bh=Math.max(64,Math.round(H*.26));
  blurCv.width=bw;blurCv.height=bh;
  blurCx.clearRect(0,0,bw,bh);
  if(typeof bgCv!=='undefined'&&bgCv.width>0&&bgCv.height>0){
    blurCx.imageSmoothingEnabled=true;
    blurCx.drawImage(bgCv,0,0,bw,bh);
  }
  const {cy,bh:bdh,top,bot}=bandMetrics();
  bgVig=cx.createRadialGradient(W*.5,H*.5,Math.min(W,H)*.1,W*.5,H*.5,Math.max(W,H)*.7);
  bgVig.addColorStop(0,'rgba(4,4,6,.48)');
  bgVig.addColorStop(1,'rgba(3,3,5,.93)');

  bandBgGrad=cx.createLinearGradient(0,top,0,bot);
  bandBgGrad.addColorStop(0,'rgba(7,7,9,0)');
  bandBgGrad.addColorStop(.16,'rgba(10,11,15,.68)');
  bandBgGrad.addColorStop(.84,'rgba(10,11,15,.68)');
  bandBgGrad.addColorStop(1,'rgba(7,7,9,0)');

  bandLineGrad=cx.createLinearGradient(W*.08,0,W*.92,0);
  bandLineGrad.addColorStop(0,'rgba(255,255,255,0)');
  bandLineGrad.addColorStop(.5,`rgba(${ac()},.15)`);
  bandLineGrad.addColorStop(1,'rgba(255,255,255,0)');

  bandWaveGrad=cx.createLinearGradient(0,cy-bdh*.32,0,bot);
  bandWaveGrad.addColorStop(0,`rgba(${ac()},.045)`);
  bandWaveGrad.addColorStop(1,`rgba(${ac()},0)`);

  cacheW=W;cacheH=H;cacheAC=ac();
}

/* ---------- ondas dentro da faixa central ---------- */
const wv=v=>{const q=Math.floor(v),s=v-q;return(q&1?1:-1)*4*s*(1-s)};
const NL=10,M=56;
const LG=[{off:-1,a:4.25,T:4400},{off:4.5,a:2.75,T:-6200},{off:9,a:1.75,T:4900}];
const LW=[.95,.7,.5,.8,.5,.5,.5,.5,.5,.5],LA=[1,.6,.35,1,0,0,0,0,0,0];
const FGW=[1.9,1.35,.95],FGA=[.92,.58,.36];
const BG=[
  [-.28,.14,1.9,.13],
  [-.19,.16,2.4,.17],
  [-.09,.13,3.1,.21],
  [ .04,.15,2.7,.23],
  [ .14,.14,2.2,.19],
  [ .22,.13,3.4,.16],
  [ .30,.11,1.8,.12]
];
const PH=Array.from({length:NL},()=>R()*TAU);
const PARTS=Array.from({length:22},(_,i)=>({ang:(i/22)*TAU,spd:.55+R()*1.25,vy:(R()-.5)*42,sz:.9+R()*1.2}));

let W=1,H=1,DPR=1,lx=0,ly=0,k=4.5,open=false,state='idle',last=0,lastDraw=0,cleared=true;
let m=0,hold=0,entry=0,ang=0,th=0,saveAcc=0,bd=[.1,.1,.1],ansHold=0,ansWas=false,vtxAtThink='',prevMsgNode=null;
let desk=true,Rs=44,Lx=78,Ly=78,cdw=180,cdh=140,cdx=24,cdy=24,cd2x=220,cd2y=24,boxKey='',maxC=42;
let mA=0,mB=1,lastPair=[-1,-1];
let lines_=[],curI=-1,curSrc='\u0000',lastPos=-1;

function bandMetrics(){
  const bh=Math.min(245,Math.max(150,H*.26));
  return{cy:H*.5,bh,top:H*.5-bh*.5,bot:H*.5+bh*.5};
}
function size(){
  DPR=Math.min(devicePixelRatio||1,1.2);
  W=VZ.clientWidth||innerWidth;H=VZ.clientHeight||innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  bakeOffscreen();
}
addEventListener('resize',size);

/* ---------- texto palavra por palavra (estilo igual ao resto do site) ---------- */
function setLyrics(text,placeholder){
  curSrc=text;curI=-1;lastPos=-1;lines_=[];lyIn.innerHTML='';
  let cur={sp:[],len:0,start:0};
  const push=()=>{if(cur.sp.length)lines_.push(cur);cur={sp:[],len:0,start:0}};
  for(const mm of String(text).matchAll(/\S+/g)){
    const wd=mm[0],s=mm.index;
    if(cur.sp.length&&cur.len+1+wd.length>maxC)push();
    if(!cur.sp.length)cur.start=s;
    const sp=document.createElement('span');sp.textContent=wd+' ';sp.dataset.s=s;cur.sp.push(sp);cur.len+=(cur.len?1:0)+wd.length;
    if(/[.!?…]$/.test(wd)&&cur.len>maxC*.52)push();
  }
  push();
  lines_.forEach(L=>{const d=document.createElement('div');L.sp.forEach(x=>d.append(x));L.el=d;lyIn.append(d)});
  if(placeholder&&lines_[0])lines_[0].el.className='cur';
}
function lyricsTick(){
  if(!lines_.length)return;
  let ci=0;for(let i=0;i<lines_.length;i++)if(lines_[i].start<=pos)ci=i;
  const changed=ci!==curI;
  if(changed){curI=ci;lines_.forEach((L,i)=>{L.el.className=i<ci?'past':i===ci?'cur':i===ci+1?'nx':''})}
  const fp=Math.floor(pos);
  if(changed||fp!==lastPos){lastPos=fp;lines_[ci].sp.forEach(x=>x.classList.toggle('on',+x.dataset.s<=pos))}
  if(changed){const el=lines_[ci].el;lyIn.style.transform=`translateY(${(lyBox.clientHeight||200)*.34-((el.offsetTop||0)+(el.offsetHeight||24)/2)}px)`}
}

/* ---------- layout dos 4 cantos:
   sup. esq = logo personalizada | sup. dir = planilha resumo
   inf. esq = mapas orgânicos    | inf. dir = texto da resposta ---------- */
function layout(){
  desk=W>=860;
  const safeT=parseFloat(getComputedStyle(document.documentElement).paddingTop)||0;
  const safeB=parseFloat(getComputedStyle(document.documentElement).paddingBottom)||0;
  let box,sh;

  if(desk){
    Rs=Math.min(44,Math.max(30,H*.058));
    Lx=30+Rs*1.15;Ly=safeT+26+Rs*1.15;
    brandTxt.style.left=(Lx+Rs+16)+'px';
    brandTxt.style.top=(Ly-15)+'px';

    /* Canto inferior esquerdo: 2 mapas orgânicos */
    cdw=Math.min(200,Math.max(145,W*.155));cdh=Math.round(cdw*.8);
    cdx=24;cdy=H-safeB-24-cdh;
    cd2x=cdx+cdw+14;cd2y=cdy-8;

    /* Coluna direita dividida sem sobreposição entre planilha (topo) e texto (base) */
    const availH=Math.max(260,H-(safeT+72)-(safeB+24)-14);
    const shH=Math.min(230,Math.max(125,Math.round(availH*.42)));
    const shW=Math.min(370,Math.max(260,Math.round(W*.30)));
    sh={l:W-24-shW,t:safeT+70,w:shW,h:shH};

    const mapsRight=cd2x+cdw+24;
    const tw=Math.min(460,Math.max(280,W-mapsRight-24));
    const thBox=Math.min(290,Math.max(155,Math.round(availH*.54)));
    box={l:W-24-tw,t:H-safeB-24-thBox,w:tw,h:thBox,f:15};
  }else{
    Rs=22;
    Lx=18+Rs*1.15;Ly=safeT+72+Rs*1.15;
    brandTxt.style.left=(Lx+Rs+14)+'px';
    brandTxt.style.top=(Ly-14)+'px';

    const shT=Ly+Rs+12;
    const shH=Math.min(116,Math.max(90,Math.round(H*.16)));
    sh={l:16,t:shT,w:W-32,h:shH};

    const thBox=Math.min(165,Math.max(120,Math.round(H*.22)));
    box={l:16,t:H-safeB-16-thBox,w:W-32,h:thBox,f:14};

    const spaceMaps=Math.max(78,box.t-10-(shT+shH+10));
    cdw=Math.min(164,(W-44)/2);cdh=Math.min(108,spaceMaps);
    cdx=16;cdy=box.t-10-cdh;
    cd2x=cdx+cdw+10;cd2y=cdy-3;
  }

  const key=[desk,W,H,Math.round(box.w),Math.round(box.h),Math.round(sh.w),Math.round(sh.h)].join('|');
  if(key!==boxKey){
    boxKey=key;
    const ts=textCard.style;
    ts.left=box.l+'px';ts.top=box.t+'px';ts.width=box.w+'px';ts.height=box.h+'px';
    lyBox.style.setProperty('--lyf',box.f+'px');
    maxC=Math.max(24,Math.floor((box.w-36)/(box.f*.54)));

    const ss=sheet.style;
    ss.left=sh.l+'px';ss.top=sh.t+'px';ss.width=sh.w+'px';ss.maxHeight=sh.h+'px';
    curSrc='\u0000';
  }
}

/* ---------- faixa central de ondas ---------- */
function lines(t,kk){
  const out=[],{cy,bh}=bandMetrics(),unit=bh*.032,hw=Math.max(100,W/5.5),avg=(bd[0]+bd[1]+bd[2])/3;
  const cxLogo=lp(lx,W*.5,sm(m*1.15)),cyLogo=lp(ly,cy,sm(m*1.15));

  for(let i=0;i<NL;i++){
    const ms=sm((m-i*.035)/.64),pts=new Array(M+1);
    for(let j=0;j<=M;j++){
      const u=j/M;let ax,ay;
      if(i===3){const a=u*TAU+ang;ax=cxLogo+Math.cos(a)*18.6*kk;ay=cyLogo+Math.sin(a)*18.6*kk}
      else{const g=LG[i%3],xu=(u-.5)*35.6;ax=cxLogo+xu*kk;ay=cyLogo+(g.off+g.a*wv(xu/12+2*(t%g.T)/g.T))*kk}

      const bx=-20+u*(W+40),env=.55+.45*Math.sin(Math.PI*u);
      let by;
      if(i<3){
        const g=LG[i],lv=bd[i]*.65+avg*.35;
        by=cy+(g.off-3.8)*unit+wv(bx/hw+2*(t%g.T)/g.T)*g.a*unit*(.45+1.4*lv)*env;
      }else{
        const g=BG[i-3];
        by=cy+g[0]*bh+wv(bx/(hw*2.0/g[2])+t*.00032*(i%2?1:-1)+PH[i])*g[1]*bh*(.55+.85*avg)*env;
      }
      pts[j]=[lp(ax,bx,ms),lp(ay,by,ms)+Math.sin(Math.PI*ms)*Math.sin(u*TAU*2+t*.003+i)*9];
    }
    out.push({pts,ms});
  }
  return{out,cxLogo,cyLogo};
}
const path=(c,pts)=>{c.beginPath();for(let j=0;j<pts.length;j++)j?c.lineTo(pts[j][0],pts[j][1]):c.moveTo(pts[j][0],pts[j][1])};

/* ---------- fundo escuro, distante e suavemente desfocado (sem cx.filter!) ---------- */
const pul=[];let ng=null;
function neural(t,dt,a){try{neural0(t,dt,a)}catch(e){}}
function neural0(t,dt,a){
  if(a<.01||typeof nodes==='undefined'||typeof edges==='undefined'||!nodes.length)return;
  if(cacheW!==W||cacheH!==H||cacheAC!==ac())bakeOffscreen();
  if(!ng||ng.length!==nodes.length)ng=new Float32Array(nodes.length);
  const nFirst=(typeof LY!=='undefined'&&LY[0]&&LY[0].n)||12;
  if(pul.length<22&&R()<.45){const ni=Math.floor(R()*nFirst),nd=nodes[ni];if(nd&&nd.out&&nd.out.length){ng[ni]=1;pul.push({e:nd.out[Math.floor(R()*nd.out.length)],p:0,s:.42+R()*.38})}}

  const dw=W*.86,dh=H*.86,dx=(W-dw)*.5,dy=(H-dh)*.5;
  cx.save();
  cx.globalAlpha=a*.36;
  cx.imageSmoothingEnabled=true;
  cx.drawImage(blurCv,dx,dy,dw,dh);
  cx.globalAlpha=1;

  cx.translate(W*.5,H*.5);cx.scale(.86,.86);cx.translate(-W*.5,-H*.5);
  cx.lineCap='round';
  for(let i=pul.length-1;i>=0;i--){
    const p=pul[i],e=edges[p.e];if(!e){pul.splice(i,1);continue}
    p.p+=p.s*dt*1.2;
    const A=nodes[e.a],B=nodes[e.b],x=lp(A.x,B.x,Math.min(1,p.p)),y=lp(A.y,B.y,Math.min(1,p.p)),x0=lp(A.x,B.x,Math.max(0,p.p-.22)),y0=lp(A.y,B.y,Math.max(0,p.p-.22));
    cx.strokeStyle=`rgba(${ac()},${.22*a})`;cx.lineWidth=1.8;cx.beginPath();cx.moveTo(x0,y0);cx.lineTo(x,y);cx.stroke();
    if(p.p>=1){ng[e.b]=1;const nb=nodes[e.b];if(nb&&nb.out&&nb.out.length)pul[i]={e:nb.out[Math.floor(R()*nb.out.length)],p:0,s:p.s};else pul.splice(i,1)}
  }
  for(let i=0;i<nodes.length;i++){
    if(ng[i]>.04){const n=nodes[i];cx.fillStyle=`rgba(${ac()},${.26*ng[i]*a})`;cx.beginPath();cx.arc(n.x,n.y,5*(1+ng[i]*.5),0,TAU);cx.fill();ng[i]*=.88}
  }
  cx.restore();

  if(bgVig){cx.globalAlpha=a;cx.fillStyle=bgVig;cx.fillRect(0,0,W,H);cx.globalAlpha=1}
}

/* ---------- logo personalizada no canto superior esquerdo ---------- */
function drawLogo(t,a){
  if(a<.01)return;
  const kk=Rs/18.6,lv=(bd[0]+bd[1]+bd[2])/3,think=state==='think';
  const boost=think?1.15+.2*Math.sin(t*.0045):state==='speak'?1+.5*(.5+.5*Math.sin(t*.01)):1+lv;
  const wob=Rs*(think?.07:.05);
  cx.save();cx.globalAlpha=a;

  const g=cx.createRadialGradient(Lx,Ly,0,Lx,Ly,28*kk);
  g.addColorStop(0,`rgba(${ac()},.24)`);g.addColorStop(1,`rgba(${ac()},0)`);
  cx.fillStyle=g;cx.beginPath();cx.arc(Lx,Ly,28*kk,0,TAU);cx.fill();

  cx.save();
  cx.setLineDash([1.3*kk,3.3*kk]);cx.lineDashOffset=-t*.00045*22.4*kk;
  cx.lineWidth=.4*kk;cx.strokeStyle=`rgba(${ac()},.5)`;
  cx.beginPath();cx.arc(Lx,Ly,22.4*kk,0,TAU);cx.stroke();
  cx.restore();

  cx.lineJoin='round';cx.lineCap='round';
  cx.save();cx.beginPath();cx.arc(Lx,Ly,17.5*kk-wob*.4,0,TAU);cx.clip();
  for(let i=0;i<3;i++){
    const g2=LG[i];cx.strokeStyle=`rgba(${ac()},${LA[i]})`;cx.lineWidth=LW[i]*.76*kk;cx.beginPath();
    for(let j=0;j<=36;j++){const xu=(j/36-.5)*36;const x=Lx+xu*kk,y=Ly+(g2.off+g2.a*boost*wv(xu/12+2*(t%g2.T)/g2.T))*kk;j?cx.lineTo(x,y):cx.moveTo(x,y)}
    cx.stroke();
  }
  cx.restore();

  cx.strokeStyle=`rgba(${ac()},.9)`;cx.lineWidth=.7*kk;cx.beginPath();
  for(let j=0;j<=72;j++){const aa=j/72*TAU,rr=Rs+Math.sin(aa*8+t*.003)*wob+Math.sin(aa*5-t*.0024)*wob*.55,x=Lx+Math.cos(aa)*rr,y=Ly+Math.sin(aa)*rr;j?cx.lineTo(x,y):cx.moveTo(x,y)}
  cx.closePath();cx.stroke();
  cx.restore();
}

/* ---------- mapas orgânicos no canto inferior esquerdo ---------- */
function organicMap(x,y,w,h,md,t,a,idx){
  if(a<.01)return;
  const floatY=Math.sin(t*.0009+idx*1.8)*3;
  const rad=22,yy=y+floatY+(1-a)*16;
  cx.save();cx.globalAlpha=a;cx.translate(x,yy);

  cx.beginPath();cx.roundRect(0,0,w,h,rad);
  cx.fillStyle='rgba(11,12,16,.86)';cx.fill();

  cx.save();
  cx.beginPath();cx.roundRect(4,4,w-8,h-8,rad-4);cx.clip();
  if(typeof renderMap==='function'){
    cx.translate(0,8);
    renderMap(cx,w,h-12,md,t,{variant:'side',alpha:.84,busy:true,mx:-999,my:-999});
    cx.translate(0,-8);
  }
  const vig=cx.createRadialGradient(w*.5,h*.52,Math.min(w,h)*.2,w*.5,h*.52,Math.max(w,h)*.64);
  vig.addColorStop(0,'rgba(11,12,16,0)');
  vig.addColorStop(1,'rgba(11,12,16,.82)');
  cx.fillStyle=vig;cx.fillRect(0,0,w,h);
  cx.restore();

  cx.strokeStyle='rgba(255,255,255,.065)';cx.lineWidth=.7;
  cx.beginPath();cx.roundRect(.5,.5,w-1,h-1,rad);cx.stroke();

  cx.fillStyle=`rgba(${ac()},.78)`;
  cx.beginPath();cx.arc(15,15,2,0,TAU);cx.fill();
  cx.font='500 8.5px "JetBrains Mono",monospace';
  cx.fillStyle='rgba(255,255,255,.56)';
  cx.textAlign='left';
  cx.fillText(MAP_LBLS[md]||'MAPA',22,18);
  cx.restore();
}

function pickPair(promptTxt){
  let ctxMd=-1;
  if(typeof pickContextMode==='function'&&promptTxt)ctxMd=pickContextMode(promptTxt);
  let a=ctxMd>=0?ctxMd:Math.floor(R()*10),b;
  if(a===lastPair[0]&&ctxMd<0)a=(a+3)%10;
  do{b=Math.floor(R()*10)}while(b===a||b===lastPair[1]);
  lastPair=[a,b];mA=a;mB=b;
}

function readState(){
  const ds=(VZ.dataset.s||'').toLowerCase();
  if(/think|pens|proc|wait|aguard/.test(ds)||isBusy())return'think';
  if(/speak|fal|talk/.test(ds)||spoken())return'speak';
  if(/listen|ou[cv]|rec|escut/.test(ds))return'listen';
  return'idle';
}
function latestAiMsg(){
  if(!msgsEl)return'';
  const lastEl=msgsEl.lastElementChild;
  if(!lastEl||!lastEl.classList.contains('a')||lastEl===prevMsgNode)return'';
  return(lastEl.textContent||'').trim();
}
function isTypingMsg(){
  if(!msgsEl)return false;
  const lastEl=msgsEl.lastElementChild;
  return !!(lastEl&&lastEl!==prevMsgNode&&lastEl.classList.contains('live'));
}

/* ---------- escolha Voz comum / Petga ---------- */
const segB=[...hud.querySelectorAll('.pg-seg button')];
const syncSeg=()=>segB.forEach(x=>x.classList.toggle('on',(x.dataset.p==='1')===pon));
function showEnd(){end.classList.add('on');clearTimeout(showEnd.t);showEnd.t=setTimeout(()=>end.classList.remove('on'),9000)}
function startPetga(){m=0;hold=.65;entry=0;th=0;state='idle';ansHold=0;ansWas=false;cloudAudio.active=false;micTried=true;micStart()}
segB.forEach(x=>x.onclick=()=>{
  const want=x.dataset.p==='1';
  if(want&&used>=LIMIT){showEnd();return}
  if(want===pon)return;
  pon=want;save();syncSeg();
  if(pon)startPetga();else{end.classList.remove('on');micStop()}
});
syncSeg();

function onOpen(){size();if(pon&&used>=LIMIT){pon=false;save();showEnd()}syncSeg();if(pon)startPetga()}
function onClose(){
  save();micStop();micTried=false;cloudAudio.active=false;end.classList.remove('on');
  VZ.classList.remove('petga','low','think');
  brandTxt.classList.remove('on');sheet.classList.remove('on');textCard.classList.remove('on');
  cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cleared=true;
}

/* ---------- loop ---------- */
function frame(t){
  requestAnimationFrame(frame);
  const on=VZ.classList.contains('on');
  if(on!==open){open=on;on?onOpen():onClose()}
  if(!open||document.hidden){last=t;return}
  const dt=Math.min(.05,(t-(last||t))/1000);last=t;
  const live=pon&&used<LIMIT;
  VZ.classList.toggle('petga',live);
  if(!live){
    if(micOn)micStop();
    if(!cleared){
      cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cleared=true;
      VZ.classList.remove('think');brandTxt.classList.remove('on');sheet.classList.remove('on');textCard.classList.remove('on');
    }
    return;
  }
  cleared=false;
  if(!micOn&&!micTried){micTried=true;micStart()}

  used+=dt;saveAcc+=dt;if(saveAcc>5){saveAcc=0;save()}
  const left=LIMIT-used;
  fill.style.transform=`scaleX(${Math.max(0,left/LIMIT)})`;tm.textContent='prévia experimental · '+mmss(left);
  VZ.classList.toggle('low',left<120);
  if(left<=0){pon=false;save();syncSeg();showEnd();micStop();return}

  const st=readState(),spk=spoken();
  if(st==='think'||spk)ansHold=1.35;else ansHold=Math.max(0,ansHold-dt);
  const ans=ansHold>0;
  if(ans&&!ansWas){
    vtxAtThink=(vtxEl?vtxEl.textContent:'').trim();
    const lastEl=msgsEl?msgsEl.lastElementChild:null;
    prevMsgNode=(lastEl&&lastEl.classList.contains('a')&&!lastEl.classList.contains('live'))?lastEl:(lastEl?lastEl.previousElementSibling:null);
    pickPair(vtxAtThink);pos=0;bnd=false;hookText='';curChunkBase=0;curChunkLen=0;curChunkStart=0;
    pendingCloudText='';cloudAudio={active:false,start:0,dur:0,text:''};curSrc='\u0000';sheetSrc='\u0000';
  }
  if(!ans&&ansWas){hookText='';pos=0;bnd=false;cloudAudio.active=false;curSrc='\u0000';sheetSrc='\u0000'}
  ansWas=ans;state=st;

  const mic=(st==='speak'||st==='think')?null:readMic();let tg;
  if(mic)tg=[Math.min(1,mic[0]*2.6),Math.min(1,mic[1]*3.4),Math.min(1,mic[2]*5)];
  else{const a=Math.sin(t*.008)*.5+.5,b2=Math.sin(t*.013+1)*.5+.5,base={idle:.07,listen:.18,speak:.48,think:.32}[st];tg=[base*(.6+.8*a),base*(.6+.8*b2),base*(.5+.9*a*b2)]}
  for(let i=0;i<3;i++)bd[i]+=(tg[i]-bd[i])*Math.min(1,dt*(tg[i]>bd[i]?12:4));

  if(hold>0)hold-=dt;
  m=cl(m+(hold>0?-dt/1.1:dt/2.6));
  th=cl(th+(ans?dt/1.45:-dt/1.25));
  VZ.classList.toggle('think',th>.3);
  ang+=.45*dt;entry=Math.min(1,entry+dt/1.4);

  const rr=ORB.getBoundingClientRect(),vr=VZ.getBoundingClientRect();
  lx=rr.left-vr.left+rr.width/2;ly=rr.top-vr.top+rr.height/2;k=(rr.width||200)/48;
  const eb=1+2.70158*Math.pow(entry-1,3)+1.70158*Math.pow(entry-1,2),kk=k*Math.max(.05,eb),ea=Math.min(1,entry*2);

  if(th>.001){
    layout();
    brandSt.textContent=st==='think'?'pensando na resposta…':spk?'falando…':'pronto';
    tcMode.textContent=st==='think'?'pensando':spk?'falando':'concluído';

    const msgTxt=latestAiMsg();
    const typing=isTypingMsg();
    let src=cloudAudio.text||hookText||(!typing?msgTxt:'')||msgTxt;
    if(!src&&spk){const vt=(vtxEl?vtxEl.textContent:'').trim();if(vt&&vt!==vtxAtThink)src=vt}
    if(!src)src='Pensando na resposta…';
    const isWait=src==='Pensando na resposta…';

    if(src!==curSrc)setLyrics(src,isWait);
    if((!typing||cloudAudio.text||hookText)&&src!==sheetSrc)buildSummary(src,isWait);

    if(cloudAudio.active&&cloudAudio.dur>0){
      const frac=cl((t-cloudAudio.start)/(cloudAudio.dur*1000));
      pos=Math.max(pos,frac*src.length);
    }else if(act>0&&!bnd&&curChunkLen>0){
      const est=curChunkBase+((t-curChunkStart)/1000)*15.5;
      pos=Math.max(pos,Math.min(curChunkBase+curChunkLen,est));
    }else if(spk&&!bnd&&st==='speak'){
      pos=Math.min(src.length,pos+dt*15);
    }else if(!spk&&st!=='think'&&!isWait){
      pos=src.length;
    }
    lyricsTick();
    if(!isWait)sheetTick(src.length);
  }
  const stageVis=th>.26;
  brandTxt.classList.toggle('on',stageVis);
  sheet.classList.toggle('on',stageVis);
  textCard.classList.toggle('on',stageVis);

  /* Limita taxa de desenho: ~42 fps nas ondas, ~25 fps na resposta para ficar super leve */
  const minDt=th>.003?38:22;
  if(t-lastDraw<minDt)return;
  lastDraw=t;
  cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);

  if(th>.003){
    neural(t,dt,th);
    organicMap(cdx,cdy,cdw,cdh,mA,t,sm(th*1.5-.35),0);
    organicMap(cd2x,cd2y,cdw,cdh,mB,t,sm(th*1.5-.55),1);
    drawLogo(t,sm(th*1.4-.15));
  }

  const wa=1-sm(th*1.35);
  if(wa>.01){
    if(cacheW!==W||cacheH!==H||cacheAC!==ac())bakeOffscreen();
    const {bh,top,bot}=bandMetrics();
    const {out,cxLogo,cyLogo}=lines(t,kk),hyp=Math.hypot(W,H),cm=(1-m)*ea*wa;

    cx.save();
    if(bandBgGrad){cx.globalAlpha=wa;cx.fillStyle=bandBgGrad;cx.fillRect(0,top,W,bh);cx.globalAlpha=1}
    if(bandLineGrad){
      cx.globalAlpha=wa;cx.strokeStyle=bandLineGrad;cx.lineWidth=.75;
      cx.beginPath();cx.moveTo(W*.08,top+.5);cx.lineTo(W*.92,top+.5);cx.moveTo(W*.08,bot-.5);cx.lineTo(W*.92,bot-.5);cx.stroke();
      cx.globalAlpha=1;
    }

    cx.beginPath();cx.rect(0,top,W,bh);cx.clip();

    if(cm>.015){
      const g=cx.createRadialGradient(cxLogo,cyLogo,0,cxLogo,cyLogo,30*kk);
      g.addColorStop(0,`rgba(${ac()},${.34*cm})`);g.addColorStop(1,`rgba(${ac()},0)`);
      cx.fillStyle=g;cx.beginPath();cx.arc(cxLogo,cyLogo,30*kk,0,TAU);cx.fill();

      cx.save();
      cx.setLineDash([1.3*kk,3.3*kk]);cx.lineDashOffset=-ang*22.4*kk;
      cx.lineWidth=.4*kk;cx.strokeStyle=`rgba(${ac()},${.5*cm})`;
      cx.beginPath();cx.arc(cxLogo,cyLogo,(22.4+m*16)*kk,0,TAU);cx.stroke();
      cx.restore();

      const segs=6,rMain=(18.6+m*12)*kk;
      cx.strokeStyle=`rgba(${ac()},${.8*cm})`;cx.lineWidth=.8*kk;
      for(let s=0;s<segs;s++){
        const a0=ang+s*(TAU/segs),span=(TAU/segs)*(1-m*.82);
        cx.beginPath();cx.arc(cxLogo,cyLogo,rMain,a0,a0+span);cx.stroke();
      }
    }

    if(m>.04&&m<.96){
      const pa=Math.sin(m*Math.PI)*.64*ea*wa;
      cx.fillStyle=`rgba(${ac()},${pa})`;
      for(let i=0;i<PARTS.length;i++){
        const p=PARTS[i],px=cxLogo+Math.cos(p.ang)*18.6*kk+(Math.cos(p.ang)>=0?1:-1)*m*W*.26*p.spd,py=cyLogo+Math.sin(p.ang)*18.6*kk+p.vy*m;
        cx.beginPath();cx.arc(px,py,p.sz,0,TAU);cx.fill();
      }
    }

    cx.lineCap='round';cx.lineJoin='round';
    for(let i=NL-1;i>=0;i--){
      const {pts,ms}=out[i];
      const wB=i<3?FGW[i]:1.0,aB=i<3?FGA[i]:BG[i-3][3];
      const w=lp(LW[i]*kk,wB,ms),al=Math.min(1,lp(LA[i],aB,ms))*ea*wa;
      if(al<.01)continue;

      cx.save();
      if(i<3&&ms<.999){cx.beginPath();cx.arc(cxLogo,cyLogo,17.8*kk+ms*hyp,0,TAU);cx.clip()}

      if(ms>.05&&bandWaveGrad){
        cx.beginPath();
        for(let j=0;j<pts.length;j++)j?cx.lineTo(pts[j][0],pts[j][1]):cx.moveTo(pts[j][0],pts[j][1]);
        cx.lineTo(pts[pts.length-1][0],bot);cx.lineTo(pts[0][0],bot);cx.closePath();
        cx.globalAlpha=(i<3?.62:.42)*ms*ea*wa;
        cx.fillStyle=bandWaveGrad;cx.fill();
        cx.globalAlpha=1;
      }

      if(i<3){cx.strokeStyle=`rgba(${ac()},${.065*al})`;cx.lineWidth=w*2.1;path(cx,pts);cx.stroke()}
      cx.strokeStyle=`rgba(${ac()},${al})`;cx.lineWidth=w;path(cx,pts);cx.stroke();
      cx.restore();
    }

    cx.restore();
  }
}
requestAnimationFrame(frame);

window.Petga={reset(){used=0;save();end.classList.remove('on');if(open&&pon)startPetga()},usedSeconds:()=>Math.floor(used),limit:LIMIT};
})();

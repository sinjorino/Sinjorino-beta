/* PETGA v3 — prévia experimental do chat de voz do Sinjorino
   Instalação: coloque este arquivo na raiz do projeto (ao lado do index.html) e adicione,
   logo antes de </body> e DEPOIS do <script> principal:   <script src="petga.js"></script>
   Teste rápido: no console do navegador, Petga.reset() zera os 30 minutos. */
(()=>{
const $=s=>document.querySelector(s),VZ=$('#voz'),ORB=$('#vorb');
if(!VZ||!ORB)return;
const R=Math.random,TAU=Math.PI*2,LIMIT=30*60,KEY='s_petga_used',PKEY='s_petga_on';
const USE_MIC=true;                       /* false = ondas simuladas, sem pedir o microfone */
const TEXTO='Pensando…';                  /* texto que as ondas escrevem enquanto o Sinjorino pensa */
const ac=()=>typeof AC==='string'?AC:'255,255,255';
const isBusy=()=>typeof busy!=='undefined'&&busy;
const sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)},lp=(a,b,t)=>a+(b-a)*t,cl=x=>Math.max(0,Math.min(1,x));
const mmss=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
let used=0,pon=false;
try{used=Math.min(LIMIT,+localStorage.getItem(KEY)||0);pon=localStorage.getItem(PKEY)==='1'}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,String(Math.floor(used)));localStorage.setItem(PKEY,pon?'1':'0')}catch(e){}};

/* ---------- estilo ---------- */
const css=document.createElement('style');
css.textContent=`
#map-tog,#side-maps{display:none!important}
#petga-cv{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
#voz.petga #vorb{opacity:0}
#voz.petga .vname,#voz.petga .vst,#voz.petga #vtx{transition:opacity .4s var(--ease)}
#voz.petga.think .vname,#voz.petga.think .vst,#voz.petga.think #vtx{opacity:0}
#petga-hud{position:absolute;top:calc(18px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:9px;pointer-events:none;z-index:2}
.pg-seg{display:flex;padding:3px;border-radius:999px;border:1px solid var(--line-2);background:rgba(255,255,255,.05);pointer-events:auto}
.pg-seg button{display:flex;align-items:center;gap:6px;padding:7px 14px;border:0;border-radius:999px;background:transparent;color:var(--mut);font:600 11.5px var(--sans);cursor:pointer;white-space:nowrap;transition:.2s}
.pg-seg button small{font:600 8.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.pg-seg button.on{background:rgb(var(--ac));color:#070709}
.pg-meta{display:flex;flex-direction:column;align-items:center;gap:7px;opacity:0;transition:opacity .6s var(--ease)}
#voz.petga .pg-meta{opacity:1}
.pg-bar{width:140px;height:2px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden}
.pg-bar i{display:block;height:100%;width:100%;background:rgb(var(--ac));transform-origin:left;transition:transform 1s linear}
.pg-time{font:500 10.5px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);white-space:nowrap}
#voz.low .pg-time{color:rgb(var(--ac));animation:pgblink 1s steps(1) infinite}
@keyframes pgblink{50%{opacity:.35}}
#pg-end{position:absolute;bottom:calc(26px + env(safe-area-inset-bottom,0px));left:50%;transform:translate(-50%,14px);width:min(360px,90vw);padding:16px;border-radius:18px;background:rgba(16,17,22,.95);border:1px solid var(--line-2);box-shadow:0 20px 60px rgba(0,0,0,.8);display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;opacity:0;pointer-events:none;transition:opacity .4s var(--ease),transform .4s var(--ease);z-index:2}
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
VZ.prepend(cv);VZ.append(hud,end);
$('#pg-pro').onclick=()=>{const w=$('#waitlist-view');if(w)w.classList.add('on')};
const cx=cv.getContext('2d'),fill=$('#pg-fill'),tm=$('#pg-time');
const mc=document.createElement('canvas'),mx=mc.getContext('2d'),kc=document.createElement('canvas'),kx=kc.getContext('2d');
const tc=document.createElement('canvas'),tx=tc.getContext('2d',{willReadFrequently:true});
const app=$('#app');if(app)app.classList.add('maps-off');   /* painel de mapas antigo sai de cena */

/* ---------- microfone: as ondas acompanham a sua voz ---------- */
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

/* ---------- geometria das ondas ---------- */
const NL=10,M=80;
const LG=[{off:-1,a:4.25,T:3600},{off:4.5,a:2.75,T:-5200},{off:9,a:1.75,T:4000}];  /* 3 ondas da logo (unid. do viewBox 48) */
const SPW=[[58,1.3,1.1,2.2,.85],[46,1.9,-1.5,1.8,.6],[36,2.7,1.9,1.4,.45],[52,1.6,-1.2,2,.75],[40,2.2,1.4,1.2,.45],[30,3.1,-2,1,.35],[44,1.1,.9,1.2,.4],[26,3.6,2.3,1,.3],[34,2.5,-1.7,1,.3],[48,1.8,1.6,1.2,.4]]; /* amp, ciclos, vel, espessura, alfa */
const LW=[1.2,.85,.6,.95,.6,.6,.6,.6,.6,.6],LA=[1,.6,.35,1,0,0,0,0,0,0];
const PH=SPW.map(()=>R()*TAU);
/* linhas 0-3 = logo de ondas · linhas 4-9 = ondas que formam os mapas */

let W=1,H=1,DPR=1,lx=0,ly=0,k=4.5,open=false,state='idle',last=0,lastDraw=0,cleared=true;
let m=0,hold=0,entry=0,ang=0,th=0,mode=0,lastMode=-1,saveAcc=0,bd=[.1,.1,.1];
let desk=true,Rs=46,ks=2.5,Lx=80,Ly=80,mapL=0,mapTop=0,mapW=1,mapH=1,tx0=0,textTop=0;
let txtKey='',runs=[],txW=1,txF=40;
const ROWN=9;

function size(){DPR=Math.min(devicePixelRatio||1,1.5);W=VZ.clientWidth||innerWidth;H=VZ.clientHeight||innerHeight;cv.width=W*DPR;cv.height=H*DPR;mc.width=kc.width=W;mc.height=kc.height=H}
addEventListener('resize',size);

/* texto feito de ondas: o texto vira linhas horizontais ("scanlines") onde há tinta */
function buildText(){
  const avail=desk?W-(Lx+Rs+26)-34:W-40;let F=desk?42:30;
  const font=f=>`600 ${f}px "Space Grotesk","Plus Jakarta Sans",sans-serif`;
  tx.font=font(F);const w0=tx.measureText(TEXTO).width;if(w0>avail)F=Math.max(16,F*avail/w0);
  const key=TEXTO+'|'+Math.round(F);if(key===txtKey)return;txtKey=key;txF=F;
  tx.font=font(F);txW=Math.ceil(tx.measureText(TEXTO).width)+6;const h=Math.ceil(F*1.3);
  tc.width=txW;tc.height=h;tx.font=font(F);tx.fillStyle='#fff';tx.fillText(TEXTO,3,F*.95);
  const d=tx.getImageData(0,0,txW,h).data;runs=[];
  for(let r=0;r<ROWN;r++){
    const y=Math.min(h-1,Math.round(F*.22+(r+.5)/ROWN*F*.9)),row=[];let s=-1;
    for(let x=0;x<txW;x++){const on=d[(y*txW+x)*4+3]>110;if(on&&s<0)s=x;if(!on&&s>=0){row.push([s,x]);s=-1}}
    if(s>=0)row.push([s,txW]);runs.push(row);
  }
}

/* onde cada coisa fica quando o Sinjorino pensa: logo de ondas no canto esquerdo (PC) ou no topo (celular), texto ao lado, mapas embaixo */
function layout(){
  desk=W>=860;Rs=desk?46:38;ks=Rs/18.6;
  const safe=parseFloat(getComputedStyle(document.documentElement).paddingTop)||0;
  Lx=desk?34+Rs:W/2;buildText();   /* o texto precisa de Lx para saber o espaço disponível */
  if(desk){Ly=30+Rs+10;tx0=Lx+Rs+26;textTop=Ly-.45*txF;mapTop=Ly+Rs+26;mapL=24}
  else{Ly=safe+72+Rs;tx0=(W-txW)/2;textTop=Ly+Rs+20;mapTop=textTop+.9*txF+22;mapL=12}
  mapW=W-2*mapL;mapH=Math.max(120,H-24-mapTop);
}

function lines(t,kk){
  const out=[],bandW=Math.min(W*.88,760),bandL=(W-bandW)/2,rowH=mapH/6;
  for(let i=0;i<NL;i++){
    const sp=SPW[i],ms=sm((m-i*.04)/.64),mt=sm((th-i*.03)/.7),pts=new Array(M+1);
    for(let j=0;j<=M;j++){
      const u=j/M;let ax,ay;
      /* A: círculo da logo, grande, no centro (só no começo) */
      if(i===3){const a=u*TAU+ang;ax=lx+Math.cos(a)*18.6*kk;ay=ly+Math.sin(a)*18.6*kk}
      else{const g=LG[i%3],xu=(u-.5)*35.6;ax=lx+xu*kk;ay=ly+(g.off+g.a*Math.sin(TAU*(xu/24+(t%g.T)/g.T)))*kk}
      /* B: ondas sobrepostas no meio da tela, mexendo com o microfone */
      const env=Math.pow(Math.sin(Math.PI*u),1.3),bx=bandL+u*bandW;
      const by=ly+(i-4.5)*3+Math.sin(u*sp[1]*TAU+PH[i]-t*.0025*sp[2])*sp[0]*(.14+1.7*bd[i%3])*env;
      let x=lp(ax,bx,ms),y=lp(ay,by,ms)+Math.sin(Math.PI*ms)*Math.sin(u*TAU*2+t*.004+i)*22;
      /* C: pensando */
      if(th>.001){
        let px,py;
        if(i<4){ /* logo só de ondas: círculo com ondas dentro */
          if(i===3){const a=u*TAU+ang;px=Lx+Math.cos(a)*Rs;py=Ly+Math.sin(a)*Rs}
          else{const g=LG[i],xu=(u-.5)*35.6;px=Lx+xu*ks;py=Ly+(g.off+g.a*Math.sin(TAU*(xu/24+(t%g.T)/g.T)))*ks}
        }else{ /* ondas dos mapas */
          const q=i-4;px=mapL-20+u*(mapW+40);
          py=mapTop+(q+.5)*rowH+Math.sin(u*(1.6+q*.35)*TAU*Math.max(1,mapW/700)-t*.0022*(q%2?-1:1)+PH[i])*rowH*.3;
        }
        x=lp(x,px,mt);y=lp(y,py,mt)+Math.sin(Math.PI*mt)*Math.sin(u*TAU*2+t*.005+i)*18;
      }
      pts[j]=[x,y];
    }
    out.push({pts,ms,mt});
  }
  return out;
}
const path=(c,pts)=>{c.beginPath();for(let j=0;j<pts.length;j++)j?c.lineTo(pts[j][0],pts[j][1]):c.moveTo(pts[j][0],pts[j][1])};
const pickMode=()=>{let n;do{n=Math.floor(R()*10)}while(n===lastMode);lastMode=n;return n};

function readState(){
  const ds=(VZ.dataset.s||'').toLowerCase();
  if(/think|pens|proc|wait|aguard/.test(ds)||isBusy())return'think';
  if(/speak|fal|talk/.test(ds)||(window.speechSynthesis&&speechSynthesis.speaking))return'speak';
  if(/listen|ou[cv]|rec|escut/.test(ds))return'listen';
  return'idle';
}

/* ---------- escolha Voz comum / Petga ---------- */
const segB=[...hud.querySelectorAll('.pg-seg button')];
const syncSeg=()=>segB.forEach(x=>x.classList.toggle('on',(x.dataset.p==='1')===pon));
function showEnd(){end.classList.add('on');clearTimeout(showEnd.t);showEnd.t=setTimeout(()=>end.classList.remove('on'),9000)}
function startPetga(){m=0;hold=.45;entry=0;th=0;state='idle';micTried=true;micStart()}  /* começa como círculo e se desfaz em ondas */
segB.forEach(x=>x.onclick=()=>{
  const want=x.dataset.p==='1';
  if(want&&used>=LIMIT){showEnd();return}
  if(want===pon)return;
  pon=want;save();syncSeg();
  if(pon)startPetga();else{end.classList.remove('on');micStop()}
});
syncSeg();

function onOpen(){size();if(pon&&used>=LIMIT){pon=false;save();showEnd()}syncSeg();if(pon)startPetga()}
function onClose(){save();micStop();micTried=false;end.classList.remove('on');VZ.classList.remove('petga','low','think');cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cleared=true}

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
    if(!cleared){cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cleared=true;VZ.classList.remove('think')}
    return;
  }
  cleared=false;
  if(!micOn&&!micTried){micTried=true;micStart()}

  /* limite de 30 minutos: só conta com o Petga ligado e a tela de voz aberta */
  used+=dt;saveAcc+=dt;if(saveAcc>5){saveAcc=0;save()}
  const left=LIMIT-used;
  fill.style.transform=`scaleX(${Math.max(0,left/LIMIT)})`;tm.textContent='prévia experimental · '+mmss(left);
  VZ.classList.toggle('low',left<120);
  if(left<=0){pon=false;save();syncSeg();showEnd();micStop();return}

  const st=readState();
  if(st==='think'&&state!=='think')mode=pickMode();   /* cada resposta: as ondas formam um mapa novo */
  state=st;

  /* nível do microfone em 3 faixas (graves, médios, agudos); sem microfone, simula */
  const mic=(st==='speak'||st==='think')?null:readMic();let tg;
  if(mic)tg=[Math.min(1,mic[0]*2.6),Math.min(1,mic[1]*3.4),Math.min(1,mic[2]*5)];
  else{const a=Math.sin(t*.011)*.5+.5,b2=Math.sin(t*.017+1)*.5+.5,base={idle:.07,listen:.18,speak:.5,think:.35}[st];tg=[base*(.6+.8*a),base*(.6+.8*b2),base*(.5+.9*a*b2)]}
  for(let i=0;i<3;i++)bd[i]+=(tg[i]-bd[i])*Math.min(1,dt*(tg[i]>bd[i]?16:5));

  if(hold>0)hold-=dt;
  m=cl(m+(hold>0?-dt/.9:dt/1.3));                       /* círculo se desfaz em ondas no meio da tela */
  th=cl(th+(st==='think'?dt/1.3:-dt/.9));
  VZ.classList.toggle('think',th>.3);
  ang+=.6*dt;entry=Math.min(1,entry+dt/.9);

  const rr=ORB.getBoundingClientRect(),vr=VZ.getBoundingClientRect();
  lx=rr.left-vr.left+rr.width/2;ly=rr.top-vr.top+rr.height/2;k=(rr.width||200)/48;
  const eb=1+2.70158*Math.pow(entry-1,3)+1.70158*Math.pow(entry-1,2),kk=k*Math.max(.05,eb),ea=Math.min(1,entry*2.5);
  if(th>.001)layout();

  if(th>.003&&t-lastDraw<30)return;                    /* com mapa na tela: ~30 fps */
  lastDraw=t;
  cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);
  const L=lines(t,kk),hyp=Math.hypot(W,H);

  /* os mapas nascem das ondas: aparecem só nas faixas das ondas, que engrossam até mostrar o mapa inteiro */
  const rev=sm((th-.25)/.75);
  if(rev>.003&&typeof renderMap==='function'){
    mx.setTransform(1,0,0,1,0,0);mx.globalCompositeOperation='source-over';mx.clearRect(0,0,W,H);
    mx.save();mx.translate(mapL,mapTop);renderMap(mx,mapW,mapH,mode,t,{variant:'side',alpha:1,busy:true,mx:-999,my:-999});mx.restore();
    if(rev<.999){
      kx.clearRect(0,0,W,H);kx.strokeStyle='#fff';kx.lineJoin=kx.lineCap='round';kx.lineWidth=(mapH/6)*1.35*rev+3;
      for(let i=4;i<NL;i++){path(kx,L[i].pts);kx.stroke()}
      mx.globalCompositeOperation='destination-in';mx.drawImage(kc,0,0);mx.globalCompositeOperation='source-over';
    }
    cx.globalAlpha=.7;cx.drawImage(mc,0,0,W,H);cx.globalAlpha=1;
  }

  /* brilho e anel pontilhado da logo (só enquanto ainda é círculo) */
  const cm=(1-m)*ea;
  if(cm>.02){
    const g=cx.createRadialGradient(lx,ly,0,lx,ly,32*kk);g.addColorStop(0,`rgba(${ac()},${.44*cm})`);g.addColorStop(1,`rgba(${ac()},0)`);
    cx.fillStyle=g;cx.beginPath();cx.arc(lx,ly,32*kk,0,TAU);cx.fill();
    cx.save();cx.setLineDash([1.4*kk,3.2*kk]);cx.lineDashOffset=-ang*22.4*kk;cx.lineWidth=.45*kk;cx.strokeStyle=`rgba(${ac()},${.6*cm})`;
    cx.beginPath();cx.arc(lx,ly,22.4*kk,0,TAU);cx.stroke();cx.restore();
  }

  /* as ondas */
  cx.lineCap='round';cx.lineJoin='round';
  for(let i=0;i<NL;i++){
    const {pts,ms,mt}=L[i],sp=SPW[i];
    const w=lp(lp(LW[i]*kk,sp[3],ms),i<4?LW[i]*ks*.75:1.5,mt);
    const al=Math.min(1,lp(lp(LA[i],sp[4],ms),i<4?Math.max(LA[i],.55):.7,mt))*ea;
    if(al<.01)continue;
    cx.save();
    if(i<3){ /* dentro do círculo enquanto forem logo */
      if(ms<.999){cx.beginPath();cx.arc(lx,ly,17.8*kk+ms*hyp,0,TAU);cx.clip()}
      if(th>.001&&mt<.999){cx.beginPath();cx.arc(Lx,Ly,17.8*ks+(1-mt)*hyp,0,TAU);cx.clip()}
    }
    if(i<4){cx.strokeStyle=`rgba(${ac()},${.09*al})`;cx.lineWidth=w*3.2;path(cx,pts);cx.stroke()}
    cx.strokeStyle=`rgba(${ac()},${al})`;cx.lineWidth=w;path(cx,pts);cx.stroke();
    cx.restore();
  }

  /* texto feito de ondas */
  if(th>.2&&runs.length){
    const tp=sm((th-.35)/.65),rowH=.9*txF/ROWN,xr=tx0+tp*(txW+60)-30,amp=Math.min(1.4,txF/28);
    cx.strokeStyle=`rgba(${ac()},${.92*sm(th*1.6)})`;cx.lineWidth=Math.max(1.1,txF/30);
    cx.beginPath();
    for(let r=0;r<ROWN;r++){
      const ty=lp(ly+(r-4)*5,textTop+(r+.5)*rowH,sm(th*1.4-r*.02));
      for(const [a,b2] of runs[r]){
        const x0=tx0+a-3,x1=Math.min(tx0+b2-3,xr);if(x1<=x0)continue;
        for(let x=x0;x<=x1;x+=3){const y=ty+Math.sin(x*.09-t*.006+r*.8)*amp;x===x0?cx.moveTo(x,y):cx.lineTo(x,y)}
      }
    }
    cx.stroke();
  }
}
requestAnimationFrame(frame);

window.Petga={reset(){used=0;save();end.classList.remove('on');if(open&&pon)startPetga()},usedSeconds:()=>Math.floor(used),limit:LIMIT};
})();

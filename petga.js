/* PETGA v2 — prévia experimental do chat de voz do Sinjorino
   Instalação: coloque este arquivo na raiz do projeto (ao lado do index.html) e adicione,
   logo antes de </body> e DEPOIS do <script> principal:   <script src="petga.js"></script>
   Teste rápido: no console do navegador, Petga.reset() zera os 30 minutos. */
(()=>{
const $=s=>document.querySelector(s),VZ=$('#voz'),ORB=$('#vorb');
if(!VZ||!ORB)return;
const R=Math.random,TAU=Math.PI*2,LIMIT=30*60,KEY='s_petga_used',PKEY='s_petga_on';
const ac=()=>typeof AC==='string'?AC:'255,255,255';
const isBusy=()=>typeof busy!=='undefined'&&busy;
const sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)},lp=(a,b,t)=>a+(b-a)*t;
const mmss=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
let used=0,pon=false;
try{used=Math.min(LIMIT,+localStorage.getItem(KEY)||0);pon=localStorage.getItem(PKEY)==='1'}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,String(Math.floor(used)));localStorage.setItem(PKEY,pon?'1':'0')}catch(e){}};

/* ---------- estilo (mesmo visual do site) ---------- */
const css=document.createElement('style');
css.textContent=`
#map-tog,#side-maps{display:none!important}
#petga-cv{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
#voz.petga #vorb{opacity:0}
#petga-hud{position:absolute;top:calc(18px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:9px;pointer-events:none}
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
#pg-end{position:absolute;bottom:calc(26px + env(safe-area-inset-bottom,0px));left:50%;transform:translate(-50%,14px);width:min(360px,90vw);padding:16px;border-radius:18px;background:rgba(16,17,22,.95);border:1px solid var(--line-2);box-shadow:0 20px 60px rgba(0,0,0,.8);display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;opacity:0;pointer-events:none;transition:opacity .4s var(--ease),transform .4s var(--ease)}
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
const app=$('#app');if(app)app.classList.add('maps-off'); /* painel de mapas antigo sai de cena */

/* ---------- as ondas da logo ---------- */
const NL=9,M=84;
const ROWS=[0,-1,1,-2,2,-3,3,-4,4];                       /* linha de cada onda quando espalhada */
const LG=[{off:-1,a:4.25,T:3600},{off:4.5,a:2.75,T:-5200},{off:9,a:1.75,T:4000}]; /* 3 ondas da logo (unid. do viewBox 48) */
const SP=[[26,1.6,1.3,2.4,.9],[20,2.3,-1.7,1.8,.65],[14,3.1,2.1,1.4,.5],[22,1.9,-1.1,2,.8],[18,2.7,1.5,1,.35],[16,1.3,-.9,1,.35],[24,2.1,1.8,1,.3],[12,3.5,-2.2,1,.3],[20,1.1,1.2,1,.3]]; /* amp, ciclos, vel, espessura, alfa */
const LW=[1.2,.85,.6,.95,.6,.6,.6,.6,.6],LA=[1,.6,.35,1,0,0,0,0,0];
const PH=SP.map(()=>R()*TAU);

let W=1,H=1,DPR=1,lx=0,ly=0,k=4.5,open=false,state='idle',last=0,lastDraw=0,tNow=0,cleared=true;
let m=0,hold=0,entry=0,ang=0,lvl=.15,b=0,rev=0,mode=0,lastMode=-1,saveAcc=0;

function size(){DPR=Math.min(devicePixelRatio||1,1.5);W=VZ.clientWidth||innerWidth;H=VZ.clientHeight||innerHeight;cv.width=W*DPR;cv.height=H*DPR;mc.width=kc.width=W;mc.height=kc.height=H}
addEventListener('resize',size);

/* m: 0 = círculo da logo · 1 = ondas espalhadas pela tela · b: 0 = faixa compacta · 1 = ondas ocupam a tela toda (pensando) */
function lines(t,kk){
  const out=[],cyS=lp(ly,H/2,b),gap=lp(22,H/9,b),cyc=Math.max(1,W/600),amB=(.55+lvl*1.3)*(1+b*.7);
  for(let i=0;i<NL;i++){
    const mi=sm((m-i*.045)/.64),sp=SP[i],pts=new Array(M+1);
    for(let j=0;j<=M;j++){
      const u=j/M;let gx,gy;
      if(i===3){const a=u*TAU+ang;gx=lx+Math.cos(a)*18.6*kk;gy=ly+Math.sin(a)*18.6*kk}
      else{const g=LG[i%3],xu=(u-.5)*35.6;gx=lx+xu*kk;gy=ly+(g.off+g.a*Math.sin(TAU*(xu/24+(t%g.T)/g.T)))*kk}
      const sx=-30+u*(W+60),env=.35+.65*Math.sin(Math.PI*u);
      const sy=cyS+ROWS[i]*gap+Math.sin(u*sp[1]*TAU*cyc-t*.002*sp[2]+PH[i])*sp[0]*amB*env;
      const bul=Math.sin(Math.PI*mi)*Math.sin(u*TAU*2+t*.004+i)*26; /* o círculo se desfaz ondulando */
      pts[j]=[lp(gx,sx,mi),lp(gy,sy,mi)+bul];
    }
    out.push({pts,mi});
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
function startPetga(){m=0;hold=.45;entry=0;rev=0;b=0;state='idle'}  /* começa como círculo e se desfaz em ondas */
segB.forEach(x=>x.onclick=()=>{
  const want=x.dataset.p==='1';
  if(want&&used>=LIMIT){showEnd();return}
  if(want===pon)return;
  pon=want;save();syncSeg();
  if(pon)startPetga();else end.classList.remove('on');
});
syncSeg();

function onOpen(){size();if(pon&&used>=LIMIT){pon=false;save();showEnd()}syncSeg();if(pon)startPetga()}
function onClose(){save();end.classList.remove('on');VZ.classList.remove('petga','low');cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cleared=true}

/* ---------- loop ---------- */
function frame(t){
  requestAnimationFrame(frame);
  const on=VZ.classList.contains('on');
  if(on!==open){open=on;on?onOpen():onClose()}
  if(!open||document.hidden){last=t;return}
  const dt=Math.min(.05,(t-(last||t))/1000);last=t;tNow=t;
  const live=pon&&used<LIMIT;
  VZ.classList.toggle('petga',live);
  if(!live){if(!cleared){cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cleared=true}return}
  cleared=false;

  /* limite de 30 minutos: só conta com o Petga ligado e a tela de voz aberta */
  used+=dt;saveAcc+=dt;if(saveAcc>5){saveAcc=0;save()}
  const left=LIMIT-used;
  fill.style.transform=`scaleX(${Math.max(0,left/LIMIT)})`;tm.textContent='prévia experimental · '+mmss(left);
  VZ.classList.toggle('low',left<120);
  if(left<=0){pon=false;save();syncSeg();showEnd();return}

  const st=readState();
  if(st==='think'&&state!=='think')mode=pickMode();   /* cada resposta: as ondas formam um mapa novo */
  state=st;

  lvl+=({idle:.15,listen:.4,speak:.75,think:.6}[st]+(st==='speak'?Math.sin(t*.011)*.18:0)-lvl)*Math.min(1,dt*4);
  const circle=st==='listen'||hold>0;                  /* ouvindo = ondas formam o círculo da logo */
  if(hold>0)hold-=dt;
  m=Math.max(0,Math.min(1,m+(circle?-dt/.9:dt/1.3)));
  b+=((st==='think'?1:0)-b)*Math.min(1,dt*2.5);
  rev=Math.max(0,Math.min(1,rev+(st==='think'?dt/1.6:-dt/1)));
  ang+=(.45+(1-m)*.3)*dt;
  entry=Math.min(1,entry+dt/.9);

  const rr=ORB.getBoundingClientRect(),vr=VZ.getBoundingClientRect();
  lx=rr.left-vr.left+rr.width/2;ly=rr.top-vr.top+rr.height/2;k=(rr.width||200)/48;
  const eb=1+2.70158*Math.pow(entry-1,3)+1.70158*Math.pow(entry-1,2),kk=k*Math.max(.05,eb),ea=Math.min(1,entry*2.5);

  if(rev>.003&&t-lastDraw<30)return;                  /* com mapa na tela: ~30 fps */
  lastDraw=t;
  cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);
  const L=lines(t,kk);

  /* o mapa nasce das ondas: aparece só nas faixas das ondas, que vão engrossando até mostrar tudo */
  if(rev>.003&&typeof renderMap==='function'){
    const e=1-Math.pow(1-rev,3);
    mx.setTransform(1,0,0,1,0,0);mx.globalCompositeOperation='source-over';mx.clearRect(0,0,W,H);
    renderMap(mx,W,H,mode,t,{variant:'side',alpha:1,busy:true,mx:-999,my:-999});
    if(rev<.999){
      kx.clearRect(0,0,W,H);kx.strokeStyle='#fff';kx.lineJoin=kx.lineCap='round';kx.lineWidth=(H/9)*1.3*e+3;
      for(const l of L){path(kx,l.pts);kx.stroke()}
      mx.globalCompositeOperation='destination-in';mx.drawImage(kc,0,0);mx.globalCompositeOperation='source-over';
    }
    cx.globalAlpha=.62;cx.drawImage(mc,0,0,W,H);cx.globalAlpha=1;
    const g=cx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.min(W,H)*.55);
    g.addColorStop(0,`rgba(7,7,9,${.5*e})`);g.addColorStop(1,'rgba(7,7,9,0)');cx.fillStyle=g;cx.fillRect(0,0,W,H);
  }

  /* brilho e anel pontilhado da logo (só enquanto é círculo) */
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
    const {pts,mi}=L[i],sp=SP[i];
    const w=lp(LW[i]*kk,sp[3],mi),al=Math.min(1,lp(LA[i],sp[4],mi)*(1+b*.3))*ea;
    if(al<.01)continue;
    cx.save();
    if(i<3&&mi<.999){cx.beginPath();cx.arc(lx,ly,17.8*kk+mi*Math.hypot(W,H),0,TAU);cx.clip()} /* dentro do círculo enquanto forem logo */
    if(i<4){cx.strokeStyle=`rgba(${ac()},${.09*al})`;cx.lineWidth=w*3.2;path(cx,pts);cx.stroke()}
    cx.strokeStyle=`rgba(${ac()},${al})`;cx.lineWidth=w;path(cx,pts);cx.stroke();
    cx.restore();
  }
}
requestAnimationFrame(frame);

window.Petga={reset(){used=0;save();end.classList.remove('on');if(open&&pon)startPetga()},usedSeconds:()=>Math.floor(used),limit:LIMIT};
})();

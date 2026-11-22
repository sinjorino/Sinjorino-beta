/* PETGA — prévia experimental do chat de voz do Sinjorino
   Instalação: coloque este arquivo na raiz do projeto (ao lado do index.html) e, no index.html,
   adicione esta linha logo antes de </body>, DEPOIS do <script> principal:
   <script src="petga.js"></script>
   Para testar sem esperar 30 min: abra o console do navegador e digite  Petga.reset()  */
(()=>{
const $=s=>document.querySelector(s),VZ=$('#voz'),ORB=$('#vorb');
if(!VZ||!ORB)return;
const R=Math.random,TAU=Math.PI*2,LIMIT=30*60,KEY='s_petga_used';
const ac=()=>typeof AC==='string'?AC:'255,255,255';
const isBusy=()=>typeof busy!=='undefined'&&busy;
const mmss=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
let used=0;try{used=Math.min(LIMIT,+localStorage.getItem(KEY)||0)}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,String(Math.floor(used)))}catch(e){}};

/* ---------- estilo (mesmo visual do site) ---------- */
const css=document.createElement('style');
css.textContent=`
#map-tog,#side-maps{display:none!important}
#petga-cv{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
#petga-hud{position:absolute;top:calc(20px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;opacity:0;transition:opacity .7s var(--ease)}
#voz.petga #petga-hud{opacity:1}
.pg-chip{font:600 10px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--ink-2);padding:6px 13px;border-radius:999px;border:1px solid var(--line-2);background:rgba(255,255,255,.05);white-space:nowrap}
.pg-chip b{color:rgb(var(--ac))}
.pg-bar{width:140px;height:2px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden}
.pg-bar i{display:block;height:100%;width:100%;background:rgb(var(--ac));transform-origin:left;transition:transform 1s linear}
.pg-time{font:500 11px var(--mono);letter-spacing:.1em;color:var(--mut)}
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
hud.innerHTML='<div class="pg-chip"><b>Petga</b> · prévia experimental</div><div class="pg-bar"><i id="pg-fill"></i></div><div class="pg-time" id="pg-time"></div>';
const end=document.createElement('div');end.id='pg-end';
end.innerHTML='<b>Sua prévia do Petga acabou</b><span>O chat de voz normal continua funcionando. O Petga completo chega ao Modo Pro.</span><button type="button" id="pg-pro">Se inscrever no Pro</button>';
VZ.prepend(cv);VZ.append(hud,end);
$('#pg-pro').onclick=()=>{const w=$('#waitlist-view');if(w)w.classList.add('on')};
const cx=cv.getContext('2d'),fill=$('#pg-fill'),tm=$('#pg-time');
const app=$('#app');if(app)app.classList.add('maps-off'); /* painel de mapas antigo sai de cena */

/* ---------- estado ---------- */
let W=1,H=1,DPR=1,lx=0,ly=0,lR=100,open=false,active=used<LIMIT,state='idle',snakes=[];
let last=0,lastDraw=0,entry=0,ang=0,vel=.35,lvl=.15,rev=0,mapA=0,mode=0,lastMode=-1,saveAcc=0,tNow=0;

function size(){DPR=Math.min(devicePixelRatio||1,1.5);W=VZ.clientWidth||innerWidth;H=VZ.clientHeight||innerHeight;cv.width=W*DPR;cv.height=H*DPR}
addEventListener('resize',size);

const mk=(burst,wait)=>({a:R()*TAU,x:lx,y:ly,v:(burst?230:80)+R()*90,ph:R()*TAU,fr:.5+R()*.9,tn:.8+R()*1.3,amp:7+R()*11,w:1.1+R()*1.5,n:34+(R()*20|0),p:[],wait:wait||0,phi:R()*TAU,dir:R()<.5?-1:1,ring:0});

function wring(r,al,wob,ph){
  cx.strokeStyle=`rgba(${ac()},${al})`;cx.lineWidth=1.2;cx.beginPath();
  for(let i=0;i<=90;i++){const a=i/90*TAU,rr=r+Math.sin(a*7+ph)*wob,x=lx+Math.cos(a)*rr,y=ly+Math.sin(a)*rr;i?cx.lineTo(x,y):cx.moveTo(x,y)}
  cx.stroke();
}

function step(s,dt,st,ringR){
  if(s.wait>0){s.wait-=dt;return false}
  s.ring=st==='think'?Math.min(1,s.ring+dt*1.6):Math.max(0,s.ring-dt*3);
  s.a+=Math.sin(tNow*.001*s.fr+s.ph)*s.tn*dt;
  const sp=s.v*(.55+lvl*1.1);
  s.x+=Math.cos(s.a)*sp*dt;s.y+=Math.sin(s.a)*sp*dt;
  let hx=s.x,hy=s.y;
  if(s.ring>0){
    const k=s.ring*s.ring*(3-2*s.ring),ph=s.phi+tNow*.0013*s.dir,rr=ringR+Math.sin(tNow*.004+s.ph)*9;
    hx+=(lx+Math.cos(ph)*rr-hx)*k;hy+=(ly+Math.sin(ph)*rr-hy)*k;
    if(s.ring>=1){s.x=hx;s.y=hy}
  }
  s.p.push([hx,hy]);if(s.p.length>s.n)s.p.shift();
  return hx<-80||hx>W+80||hy<-80||hy>H+80;
}

function drawSnake(s,al){
  const p=s.p,n=p.length;if(n<3)return;
  const P=p.map((a,i)=>{
    const b=p[Math.max(0,i-1)],c=p[Math.min(n-1,i+1)];let nx=b[1]-c[1],ny=c[0]-b[0];const l=Math.hypot(nx,ny)||1;
    const o=Math.sin(i*.5-tNow*.008*(1+lvl)+s.ph)*s.amp*(.3+lvl)*(i/n);
    return[a[0]+nx/l*o,a[1]+ny/l*o];
  });
  cx.lineCap='round';
  for(let i=1;i<n;i++){
    const q=i/n;cx.strokeStyle=`rgba(${ac()},${q*q*.8*al})`;cx.lineWidth=.4+q*s.w*(1+lvl*.6);
    cx.beginPath();cx.moveTo(P[i-1][0],P[i-1][1]);cx.lineTo(P[i][0],P[i][1]);cx.stroke();
  }
  cx.fillStyle=`rgba(${ac()},${.9*al})`;cx.beginPath();cx.arc(P[n-1][0],P[n-1][1],1.4+s.w*.5,0,TAU);cx.fill();
}

const pickMode=()=>{let m;do{m=Math.floor(R()*10)}while(m===lastMode);lastMode=m;return m};

function readState(){
  const ds=(VZ.dataset.s||'').toLowerCase();
  if(/think|pens|proc|wait|aguard/.test(ds)||isBusy())return'think';
  if(/speak|fal|talk/.test(ds)||(window.speechSynthesis&&speechSynthesis.speaking))return'speak';
  if(/listen|ou[cv]|rec|escut/.test(ds))return'listen';
  return'idle';
}

/* ---------- abrir / fechar / acabar o tempo ---------- */
function onOpen(){
  size();
  if(!active){end.classList.add('on');return}
  VZ.classList.add('petga');entry=0;rev=0;mapA=0;state='idle';
  const r=ORB.getBoundingClientRect(),v=VZ.getBoundingClientRect();lx=r.left-v.left+r.width/2;ly=r.top-v.top+r.height/2;
  snakes=[];for(let i=0;i<14;i++)snakes.push(mk(true,i*.07)); /* entrada: ondas se soltam da logo */
}
function onClose(){
  save();VZ.classList.remove('petga','low');end.classList.remove('on');
  ORB.style.transform='';ORB.style.opacity='';cx.clearRect(0,0,W,H);snakes=[];
}
function finish(){
  active=false;save();VZ.classList.remove('petga','low');end.classList.add('on');
  ORB.style.transform='';ORB.style.opacity='';cx.clearRect(0,0,W,H);snakes=[];
}

/* ---------- loop ---------- */
function frame(t){
  requestAnimationFrame(frame);
  const on=VZ.classList.contains('on');
  if(on!==open){open=on;on?onOpen():onClose()}
  if(!open||document.hidden){last=t;return}
  const dt=Math.min(.05,(t-(last||t))/1000);last=t;tNow=t;
  if(!active)return;

  /* limite de 30 minutos (só conta com a tela de voz aberta) */
  used+=dt;saveAcc+=dt;if(saveAcc>5){saveAcc=0;save()}
  const left=LIMIT-used;
  fill.style.transform=`scaleX(${Math.max(0,left/LIMIT)})`;tm.textContent=mmss(left)+' restantes';
  VZ.classList.toggle('low',left<120);
  if(left<=0){finish();return}

  const st=readState();
  if(st==='think'&&state!=='think'){mode=pickMode();rev=0}               /* pensando: ondas criam um mapa novo */
  if(state==='think'&&st!=='think')snakes=snakes.map(()=>mk(true,R()*.3)); /* resposta pronta: ondas se soltam */
  state=st;

  const tl={idle:.15,listen:.4,speak:.75,think:.6}[st];lvl+=(tl+(st==='speak'?Math.sin(t*.011)*.18:0)-lvl)*Math.min(1,dt*4);
  const want={idle:5,listen:7,speak:9,think:8}[st];
  while(snakes.length<want)snakes.push(mk(false,R()*.5));
  while(snakes.length>want)snakes.shift();

  const rr=ORB.getBoundingClientRect(),vr=VZ.getBoundingClientRect();
  lx=rr.left-vr.left+rr.width/2;ly=rr.top-vr.top+rr.height/2;lR=Math.min(220,innerWidth*.52)/2;
  const maxR=Math.hypot(Math.max(lx,W-lx),Math.max(ly,H-ly));
  entry=Math.min(1,entry+dt/1.6);
  const ee=1-Math.pow(1-entry,3),eb=1+2.2*Math.pow(entry-1,3)+1.2*Math.pow(entry-1,2); /* easeOutBack */

  /* logo girando */
  const tv={idle:.35,listen:.6,speak:1,think:3.2}[st];vel+=(tv-vel)*Math.min(1,dt*3);ang+=vel*dt;
  ORB.style.transform=`rotate(${ang-(1-ee)*3.5}rad) scale(${Math.max(.05,eb)})`;ORB.style.opacity=Math.min(1,entry*3);

  rev=st==='think'?Math.min(1,rev+dt/1.5):rev;
  const e=1-Math.pow(1-rev,3);
  mapA=st==='think'?Math.min(1,mapA+dt*2.2):Math.max(0,mapA-dt*1.2);

  const ringR=lR*1.25+(Math.min(W,H)*.34-lR*1.25)*e;
  for(let i=0;i<snakes.length;i++)if(step(snakes[i],dt,st,ringR))snakes[i]=mk(false,0);

  if(mapA>.01&&t-lastDraw<30)return; /* com mapa na tela, desenha ~30 fps */
  lastDraw=t;
  cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);

  if(mapA>.01&&typeof renderMap==='function'){
    cx.save();cx.beginPath();cx.arc(lx,ly,Math.max(1,e*maxR),0,TAU);cx.clip();
    renderMap(cx,W,H,mode,t,{variant:'side',alpha:.6*mapA,busy:true,mx:-999,my:-999});
    const g=cx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.min(W,H)*.55);
    g.addColorStop(0,`rgba(7,7,9,${.5*mapA})`);g.addColorStop(1,'rgba(7,7,9,0)');cx.fillStyle=g;cx.fillRect(0,0,W,H);
    cx.restore();
    if(rev<1){const fa=(1-e)*.7;wring(e*maxR,fa,5+6*(1-e),t*.004);wring(Math.max(0,e*maxR-14),fa*.5,4,-t*.003)} /* borda ondulada que "desenha" o mapa */
  }

  if(entry<1)for(let k=0;k<3;k++){const q=Math.max(0,Math.min(1,entry*1.4-k*.18));if(q>0&&q<1)wring(q*Math.min(W,H)*.6,(1-q)*.5,5,t*.003+k)}
  const al=.35+.65*Math.min(1,entry*1.6);
  for(const s of snakes)drawSnake(s,al);
}
requestAnimationFrame(frame);

window.Petga={reset(){used=0;active=true;save();end.classList.remove('on');if(open)onOpen()},usedSeconds:()=>Math.floor(used),limit:LIMIT};
})();

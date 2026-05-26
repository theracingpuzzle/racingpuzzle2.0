// ─── UI SHELL ─── shell height, mode, swipe engine, header

(function(){
  function setH(){
    // Read the actual safe-area-inset-top from CSS env()
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);height:0;pointer-events:none;';
    document.body.appendChild(tmp);
    const sat = tmp.getBoundingClientRect().top;
    document.body.removeChild(tmp);
    document.documentElement.style.setProperty('--shell-h', (window.innerHeight - 56 - sat) + 'px');
  }
  setH();
  window.addEventListener('resize',setH);
  window.addEventListener('orientationchange',function(){setTimeout(setH,300);});
})();

// ─── MODE ───
let mode='sw';
function setMode(m){
  mode=m;
  const sw=document.getElementById('sw-shell'),cmd=document.getElementById('cmd-shell');
  sw.classList.toggle('gone',m!=='sw');
  cmd.classList.toggle('on',m==='cmd');
  document.getElementById('bsw').classList.toggle('on',m==='sw');
  document.getElementById('bcmd').classList.toggle('on',m==='cmd');
  document.body.classList.toggle('swipe-mode',m==='sw');
  if(m==='cmd'){renderDash();renderCmdRules();}
  updHdr();
}
function goHome(){if(mode!=='sw')setMode('sw');else goTo(0);}


// ─── SWIPE ENGINE ───
let cur=0,drag=false,sx=0,dx=0,px=0,pt=0,vel=0;
const swShell=document.getElementById('sw-shell');
const sNav=document.getElementById('snav');
const cEls=CARDS.map((_,i)=>document.getElementById('c'+i));

function getTX(e){return e.touches?e.touches[0].clientX:e.clientX;}

function onStart(e){
  drag=true;sx=getTX(e);px=sx;
  pt=performance.now();vel=0;dx=0;
}
function onMove(e){
  if(!drag)return;
  e.preventDefault();
  const x=getTX(e),now=performance.now(),dt=now-pt;
  if(dt>0)vel=(x-px)/dt;
  px=x;pt=now;dx=x-sx;
  rpos(dx,true);
}
function onEnd(){
  if(!drag)return;
  drag=false;
  let n=cur;
  if(dx<-40||vel<-.3)n=(cur+1)%CARDS.length;
  else if(dx>40||vel>.3)n=(cur-1+CARDS.length)%CARDS.length;
  goTo(n);dx=0;vel=0;
}

// Swipe zone = bottom nav bar only — no conflict with card scroll
sNav.addEventListener('touchstart',onStart,{passive:true});
sNav.addEventListener('touchmove',onMove,{passive:false});
sNav.addEventListener('touchend',onEnd,{passive:true});
sNav.addEventListener('touchcancel',onEnd,{passive:true});
sNav.addEventListener('mousedown',onStart);
document.addEventListener('mousemove',e=>{if(drag)onMove(e);});
document.addEventListener('mouseup',()=>{if(drag)onEnd();});
function rpos(off=0,isDrag=false){
  const W=window.innerWidth;
  cEls.forEach((el,i)=>{
    const x=(i-cur)*W+off;
    const tilt=isDrag&&i===cur?off*.01:0;
    const sc=i===cur?Math.max(.93,1-Math.abs(off)*.00015):.93;
    el.style.transition=isDrag?'none':'transform .38s cubic-bezier(.25,.46,.45,.94)';
    el.style.transform=`translateX(${x}px) scale(${sc}) rotate(${tilt}deg)`;
    el.style.opacity=i===cur?'1':Math.abs(i-cur)===1?'0.4':'0';
  });
}
function goTo(i,instant=false){
  const prev=cur;
  cur=i;
  if(instant){
    cEls.forEach(el=>el.style.transition='none');
  } else {
    // Wrap forward: 6→0 — snap card 0 to the right of card 6 before animating
    if(prev===CARDS.length-1&&i===0){
      const el=cEls[0];
      el.style.transition='none';
      el.style.transform=`translateX(${window.innerWidth}px) scale(0.93)`;
      el.style.opacity='0.4';
      el.offsetHeight; // force reflow
    }
    // Wrap back: 0→6 — snap card 6 to the left of card 0 before animating
    if(prev===0&&i===CARDS.length-1){
      const el=cEls[CARDS.length-1];
      el.style.transition='none';
      el.style.transform=`translateX(${-window.innerWidth}px) scale(0.93)`;
      el.style.opacity='0.4';
      el.offsetHeight; // force reflow
    }
  }
  rpos(0,false);updDots();renderSwCard();
  const hb=document.getElementById('hbtn');if(hb)hb.classList.toggle('vis',i!==0);
  setTimeout(()=>cEls.forEach(el=>el.style.transition='none'),420);
}
function go(i){goTo(i);}
function bldDots(){const el=document.getElementById('dots');el.innerHTML=CARDS.map((_,i)=>`<div class="dot" id="d${i}" onclick="goTo(${i})"></div>`).join('');}
function updDots(){CARDS.forEach((_,i)=>{const d=document.getElementById('d'+i);if(!d)return;d.className='dot';if(i===cur){d.classList.add('on');d.style.background=CARDS[i].col;d.style.width='17px';}else{d.style.background='';d.style.width='';}});const l=document.getElementById('cnlbl');if(l){l.textContent=CARDS[cur].lbl;l.style.color=CARDS[cur].col;}}
function renderSwCard(){const id=CARDS[cur].id;if(id==='today')renderToday();if(id==='cards')rcSwipeInit();if(id==='results')rcSwLoadResults();if(id==='coach')renderCoachCard();if(id==='bank')renderBkCard();if(id==='watch')renderWatchlist();}

// ─── HEADER ───

// ── Inject new design system CSS once ──

function updHdr(){
  // ── Real bank ──
  const bankCur=D.bank&&D.bank.current!=null?D.bank.current:0;
  const bankStart=D.bank&&D.bank.start!=null?D.bank.start:0;
  const diff=bankCur-bankStart;
  const arrow=!bankStart?'':diff>0?'<span class="rp-bank-arrow" style="color:#4ade80;">▲</span>':diff<0?'<span class="rp-bank-arrow" style="color:#f87171;">▼</span>':'';

  // ── Virtual bank ──
  const vc=D.vBank&&D.vBank.current!=null?D.vBank.current:500;
  const vs=D.vBank&&D.vBank.start!=null?D.vBank.start:500;
  const vdiff=vc-vs;
  const varrow=!vs?'':vdiff>0?'<span class="rp-bank-arrow" style="color:#4ade80;">▲</span>':vdiff<0?'<span class="rp-bank-arrow" style="color:#f87171;">▼</span>':'';

  // ── Streak ──
  const all=new Set((D.dailyLog||[]).map(function(d){return d.date;}));
  let streak=0;const t=td();const yd=new Date();yd.setDate(yd.getDate()-1);const yds=yd.toISOString().slice(0,10);
  let ch=all.has(t)?t:all.has(yds)?yds:null;
  if(ch){let d=new Date(ch);while(all.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1);}}
  window._streak=streak;
  const st=document.getElementById('tstreak-tile');
  if(st){st.innerHTML='<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:26px;font-weight:800;color:var(--gld);margin-bottom:2px;letter-spacing:1px;">'+streak+'<span style="font-size:16px;">🔥</span></div><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,228,220,.4);">Day Streak</div>';}

  // ── Rebuild header ──
  const hdr=document.getElementById('hdr');
  if(!hdr)return;

  // Preserve supa-dot colour set by init.js before rebuild
  const existingDot=document.getElementById('supa-dot');
  const dotBg=existingDot?existingDot.style.background:'#6b7280';

  let inner=document.getElementById('hdr-inner');
  if(!inner){
    hdr.innerHTML='';
    inner=document.createElement('div');
    inner.id='hdr-inner';
    hdr.appendChild(inner);
  }

  inner.innerHTML=
    '<div class="rp-brand">RACING <span class="rp-brand-accent">PUZZLE</span></div>'
    +'<div class="rp-banks">'
      +'<div class="rp-bank-pill">'
        +'<div class="rp-bank-dot" id="supa-dot" onclick="supaTestSync()" style="background:'+dotBg+';cursor:pointer;" title="Supabase status"></div>'
        +'<span class="rp-bank-lbl">Real</span>'
        +'<span class="rp-bank-val" style="color:#60a5fa;">£<span id="hbank">'+bankCur.toFixed(2)+'</span></span>'
        +'<span id="hbank-arrow">'+arrow+'</span>'
      +'</div>'
      +'<div class="rp-bank-pill">'
        +'<span class="rp-bank-lbl">Virtual</span>'
        +'<span class="rp-bank-val" style="color:#fb923c;">£<span id="hvbank">'+vc.toFixed(2)+'</span></span>'
        +'<span id="hvbank-arrow">'+varrow+'</span>'
      +'</div>'
    +'</div>'
    +'<div class="rp-mode-toggle">'
      +'<button id="bsw" class="rp-mode-btn'+(mode==='sw'?' on':'')+'" onclick="setMode(\'sw\')">Swipe</button>'
      +'<button id="bcmd" class="rp-mode-btn'+(mode==='cmd'?' on':'')+'" onclick="setMode(\'cmd\')">CMD</button>'
    +'</div>';

  if(typeof renderToday==='function')renderToday();
}



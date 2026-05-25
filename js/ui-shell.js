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
(function _injectDesignSystem(){
  if(document.getElementById('rp-design-css'))return;
  const s=document.createElement('style');
  s.id='rp-design-css';
  s.textContent=`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800;900&family=Outfit:wght@400;500;600&display=swap');

    /* ── GLOBAL OVERRIDES ── */
    :root {
      --bdr: #1c1c30;
      --sur: #0d0d18;
      --sur2: #111120;
      --mut: #3a3a5c;
      --txt: #d4d8e8;
      --gld: #f59e0b;
      --blu: #60a5fa;
      --grn: #4ade80;
      --red: #f87171;
      --pur: #8b5cf6;
    }

    body {
      background: #050508 !important;
      font-family: 'Outfit', 'Segoe UI', sans-serif !important;
    }

    /* ── HEADER ── */
    #hdr {
      background: rgba(5,5,8,0.96) !important;
      backdrop-filter: blur(14px) !important;
      -webkit-backdrop-filter: blur(14px) !important;
      border-bottom: 1px solid #1c1c30 !important;
      padding: env(safe-area-inset-top, 0px) 0 0 !important;
    }

    #hdr-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 10px;
      gap: 10px;
    }

    /* Brand */
    .rp-brand {
      display: flex; align-items: center; gap: 7px;
      font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
      font-size: 15px; font-weight: 800; letter-spacing: 2px;
      text-transform: uppercase; color: #fff; white-space: nowrap;
    }
    .rp-brand-accent { color: #8b5cf6; }
    .rp-brand-puzzle { font-size: 18px; }

    /* Bank pills */
    .rp-banks {
      display: flex; gap: 6px; align-items: center; flex: 1; justify-content: flex-end;
    }
    .rp-bank-pill {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,.07);
      background: rgba(255,255,255,.03);
    }
    .rp-bank-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .rp-bank-lbl {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 8px; font-weight: 700; letter-spacing: 1.5px;
      text-transform: uppercase; color: rgba(255,255,255,.25);
    }
    .rp-bank-val {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14px; font-weight: 800; letter-spacing: .5px;
    }
    .rp-bank-arrow { font-size: 9px; }

    /* Mode toggle */
    .rp-mode-toggle {
      display: flex;
      border: 1px solid #1c1c30;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .rp-mode-btn {
      padding: 6px 11px;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 10px; font-weight: 800; letter-spacing: 1.5px;
      text-transform: uppercase;
      background: transparent; border: none; cursor: pointer;
      color: rgba(255,255,255,.25); transition: all .15s;
    }
    .rp-mode-btn.on {
      background: rgba(139,92,246,.18);
      color: #8b5cf6;
    }

    /* Supa dot */
    #supa-dot {
      width: 7px !important; height: 7px !important;
      border-radius: 50% !important; flex-shrink: 0 !important;
    }

    /* ── CARD CONTAINERS ── */
    .card {
      background: #0d0d18 !important;
      border-radius: 16px !important;
      border: 1px solid #1c1c30 !important;
      box-shadow: 0 4px 24px rgba(0,0,0,.5) !important;
    }

    /* ── CARD HEADER LABELS ── */
    .card-lbl {
      font-family: 'Barlow Condensed', sans-serif !important;
      font-size: 9px !important; font-weight: 700 !important;
      letter-spacing: 2px !important; text-transform: uppercase !important;
    }
    .card-title {
      font-family: 'Barlow Condensed', sans-serif !important;
      font-size: 22px !important; font-weight: 800 !important;
      letter-spacing: 1px !important;
    }

    /* ── NAV DOTS ── */
    #snav {
      background: rgba(5,5,8,0.96) !important;
      backdrop-filter: blur(14px) !important;
      border-top: 1px solid #1c1c30 !important;
      padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    }
    .dot {
      background: #1c1c30 !important;
      border-radius: 4px !important;
      height: 5px !important;
      width: 5px !important;
      transition: width .2s, background .2s !important;
      cursor: pointer !important;
    }
    .dot.on {
      border-radius: 4px !important;
    }
    #cnlbl {
      font-family: 'Barlow Condensed', sans-serif !important;
      font-size: 10px !important; font-weight: 800 !important;
      letter-spacing: 2px !important; text-transform: uppercase !important;
    }

    /* ── BUTTONS ── */
    .btn {
      font-family: 'Barlow Condensed', sans-serif !important;
      font-weight: 800 !important; letter-spacing: 1px !important;
      text-transform: uppercase !important; border-radius: 9px !important;
    }

    /* ── INPUTS & TEXTAREAS ── */
    input[type=text], input[type=number], input[type=date],
    input[type=email], textarea, select {
      background: #0a0a14 !important;
      border: 1px solid #1c1c30 !important;
      border-radius: 8px !important;
      color: #d4d8e8 !important;
      font-family: 'Outfit', sans-serif !important;
    }
    input[type=text]:focus, input[type=number]:focus,
    textarea:focus, select:focus {
      border-color: rgba(139,92,246,.5) !important;
      outline: none !important;
    }

    /* ── SECTION LABELS in cards ── */
    .sec-hdr {
      font-family: 'Barlow Condensed', sans-serif !important;
      font-size: 9px !important; font-weight: 700 !important;
      letter-spacing: 2px !important; text-transform: uppercase !important;
    }

    /* ── SPLASH ── */
    #splash {
      background: #050508 !important;
    }
    #splash .sp-title {
      font-family: 'Bebas Neue', cursive !important;
      font-size: 42px !important; letter-spacing: 3px !important;
    }
  `;
  document.head.appendChild(s);
})();

function updHdr(){
  // Real bank
  const bankCur=D.bank.current||0, bankStart=D.bank.start||0;
  const diff=bankCur-bankStart;
  const arrow=!bankStart?'':diff>0?'<span class="rp-bank-arrow" style="color:#4ade80;">▲</span>':diff<0?'<span class="rp-bank-arrow" style="color:#f87171;">▼</span>':'';

  // Virtual bank
  const vc=D.vBank&&D.vBank.current!=null?D.vBank.current:500;
  const vs=D.vBank&&D.vBank.start!=null?D.vBank.start:500;
  const vdiff=vc-vs;
  const varrow=!vs?'':vdiff>0?'<span class="rp-bank-arrow" style="color:#4ade80;">▲</span>':vdiff<0?'<span class="rp-bank-arrow" style="color:#f87171;">▼</span>':'';

  // Streak
  const all=new Set((D.dailyLog||[]).map(d=>d.date));
  let streak=0;const t=td();const yd=new Date();yd.setDate(yd.getDate()-1);const yds=yd.toISOString().slice(0,10);
  let ch=all.has(t)?t:all.has(yds)?yds:null;
  if(ch){let d=new Date(ch);while(all.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1);}}
  window._streak=streak;

  // Streak tile (today card)
  const st=document.getElementById('tstreak-tile');
  if(st){st.innerHTML='<div style="font-family:\'Bebas Neue\',cursive;font-size:26px;font-weight:700;color:var(--gld);margin-bottom:2px;letter-spacing:1px;">'+streak+'<span style="font-size:16px;">🔥</span></div><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,228,220,.4);">Day Streak</div>';}

  // Rebuild header HTML with new design
  const hdr=document.getElementById('hdr');
  if(!hdr)return;

  // Find or create inner wrapper
  let inner=document.getElementById('hdr-inner');
  if(!inner){
    hdr.innerHTML='';
    inner=document.createElement('div');
    inner.id='hdr-inner';
    hdr.appendChild(inner);
  }

  inner.innerHTML=
    // Brand
    '<div class="rp-brand"><span class="rp-brand-puzzle">🧩</span>RACING <span class="rp-brand-accent">PUZZLE</span></div>'

    // Banks
    +'<div class="rp-banks">'
      // Real
      +'<div class="rp-bank-pill" id="hbank-wrap">'
        +'<div class="rp-bank-dot" id="supa-dot" style="background:#34d399;"></div>'
        +'<span class="rp-bank-lbl">Real</span>'
        +'<span class="rp-bank-val" style="color:#60a5fa;">£<span id="hbank">'+bankCur.toFixed(2)+'</span></span>'
        +'<span id="hbank-arrow">'+arrow+'</span>'
      +'</div>'
      // Virtual
      +'<div class="rp-bank-pill" id="hvbank-wrap">'
        +'<span class="rp-bank-lbl">Virtual</span>'
        +'<span class="rp-bank-val" style="color:#fb923c;">£<span id="hvbank">'+vc.toFixed(2)+'</span></span>'
        +'<span id="hvbank-arrow">'+varrow+'</span>'
      +'</div>'
    +'</div>'

    // Mode toggle
    +'<div class="rp-mode-toggle">'
      +'<button id="bsw" class="rp-mode-btn'+(mode==='sw'?' on':'')+'" onclick="setMode(\'sw\')">Swipe</button>'
      +'<button id="bcmd" class="rp-mode-btn'+(mode==='cmd'?' on':'')+'" onclick="setMode(\'cmd\')">CMD</button>'
    +'</div>';

  // Re-render today card P&L sync
  if(typeof renderToday === 'function') renderToday();
}



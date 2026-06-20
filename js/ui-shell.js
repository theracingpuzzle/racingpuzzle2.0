// ─── UI SHELL ─── shell height, mode, swipe engine, header

const NAV_SWIPE_IDS = ['today','races','results','tracker'];
const NAV_CARD_MAP  = {today:0, races:1, results:2, tracker:3};

(function(){
  function setH(){
    // Measure safe-area-inset-top
    const tTop = document.createElement('div');
    tTop.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);height:0;pointer-events:none;visibility:hidden;';
    document.body.appendChild(tTop);
    const sat = tTop.getBoundingClientRect().top;
    document.body.removeChild(tTop);

    // Measure safe-area-inset-bottom (extends the nav on iOS PWA)
    const tBot = document.createElement('div');
    tBot.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
    document.body.appendChild(tBot);
    const sab = tBot.offsetHeight || 0;
    document.body.removeChild(tBot);

    // On desktop (≥768px) nav is a sidebar — shell fills full height minus header only
    const isDesktop = window.innerWidth >= 768;
    if(isDesktop){
      document.documentElement.style.setProperty('--shell-h', (window.innerHeight - 56 - sat - 34) + 'px');
    } else {
      // Shell sits between header (56px) and nav (72px base + safe-area-bottom)
      document.documentElement.style.setProperty('--shell-h', (window.innerHeight - 56 - sat - 72 - sab) + 'px');
    }
  }
  setH();
  window.addEventListener('resize', setH);
  window.addEventListener('orientationchange', function(){ setTimeout(setH, 300); });
})();

// ─── NAV COLLAPSE (desktop) ───
(function(){
  if(localStorage.getItem('rp-nav-collapsed')==='1') document.body.classList.add('nav-collapsed');
})();
function toggleNavCollapse(){
  const collapsed = document.body.classList.toggle('nav-collapsed');
  localStorage.setItem('rp-nav-collapsed', collapsed ? '1' : '0');
  setH(); // recalc shell height
}

// ─── MODE ───
let mode='sw';
function setMode(m){
  mode=m;
  const sw=document.getElementById('sw-shell'),cmd=document.getElementById('cmd-shell');
  sw.classList.toggle('gone',m!=='sw');
  cmd.classList.toggle('on',m==='cmd');
  document.body.classList.toggle('swipe-mode',m==='sw');
  // cmd shell removed — content now in swipe cards
  updHdr();
}
function goHome(){if(mode!=='sw')navTo('today');else goTo(0);}

// ─── NAV ───
function navTo(id){
  if(mode!=='sw')setMode('sw');
  const idx={today:0,races:1,results:2,tracker:3,watch:3,stats:4,leagues:5,settings:6}[id];
  if(idx!=null)goTo(idx);
}

const _NAV_IDS=['today','races','results','tracker','stats','leagues'];
function updNav(activeId){
  _NAV_IDS.forEach(function(id){
    const el=document.getElementById('bn-'+id);
    if(el)el.classList.toggle('on',id===activeId);
  });
}


// ─── SWIPE ENGINE ───
let cur=0,drag=false,sx=0,dx=0,px=0,pt=0,vel=0;
const swShell=document.getElementById('sw-shell');
const bNav=document.getElementById('bnav');
const cEls=CARDS.map((_,i)=>document.getElementById('c'+i));

function getTX(e){return e.touches?e.touches[0].clientX:e.clientX;}

function onStart(e){
  // only swipe if mode is sw
  if(mode!=='sw')return;
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
  // If barely moved it's a tap — let the button's onclick handle it
  if(Math.abs(dx)<8&&Math.abs(vel)<.15){dx=0;vel=0;return;}
  let n=cur;
  if(dx<-40||vel<-.3)n=(cur+1)%CARDS.length;
  else if(dx>40||vel>.3)n=(cur-1+CARDS.length)%CARDS.length;
  goTo(n);dx=0;vel=0;
}

if(bNav){
  bNav.addEventListener('touchstart',onStart,{passive:true});
  bNav.addEventListener('touchmove',onMove,{passive:false});
  bNav.addEventListener('touchend',onEnd,{passive:true});
  bNav.addEventListener('touchcancel',onEnd,{passive:true});
  bNav.addEventListener('mousedown',onStart);
}
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
    if(prev===CARDS.length-1&&i===0){
      const el=cEls[0];
      el.style.transition='none';
      el.style.transform=`translateX(${window.innerWidth}px) scale(0.93)`;
      el.style.opacity='0.4';
      el.offsetHeight;
    }
    if(prev===0&&i===CARDS.length-1){
      const el=cEls[CARDS.length-1];
      el.style.transition='none';
      el.style.transform=`translateX(${-window.innerWidth}px) scale(0.93)`;
      el.style.opacity='0.4';
      el.offsetHeight;
    }
  }
  rpos(0,false);
  // Sync bottom nav
  const navKeys=['today','races','results','tracker','stats','leagues','settings'];
  updNav(navKeys[i]||'today');
  renderSwCard();
  const hb=document.getElementById('hbtn');if(hb)hb.classList.toggle('vis',i!==0);
  setTimeout(()=>cEls.forEach(el=>el.style.transition='none'),420);
}

function go(i){goTo(i);}
// bldDots / updDots kept as no-ops for any lingering calls
function bldDots(){}
function updDots(){}

function renderSwCard(){
  const id=CARDS[cur].id;
  if(id==='today')renderToday();
  if(id==='cards')rcSwipeInit();
  if(id==='results')rcSwLoadResults();
  if(id==='watch')renderWatchlist();
  if(id==='stats'){const _sc=document.querySelector('#c4 .cin');if(_sc)_sc.scrollTop=0;if(typeof renderStats==='function')renderStats();if(typeof renderHist==='function')renderHist();}
  if(id==='settings'){const _sc=document.querySelector('#c6 .cin');if(_sc)_sc.scrollTop=0;if(typeof renderBkCard==='function')renderBkCard();if(typeof renderVBKDisp==='function')renderVBKDisp();if(typeof loadApiKeyField==='function')loadApiKeyField();if(typeof loadStartBankField==='function')loadStartBankField();if(typeof loadRacingCredsFields==='function')loadRacingCredsFields();if(typeof loadAILimitField==='function')loadAILimitField();if(typeof renderSettingsSources==='function')renderSettingsSources();if(typeof renderCmdRules==='function')renderCmdRules();}
  if(id==='leagues'){if(typeof lgInit==='function')lgInit();}
}

// ─── HEADER FLASH — visual confirmation when a balance changes ───
function flashHdrBalance(mode, deductedAmount){
  // mode: 'real' | 'virt'
  const elId = mode==='virt' ? 'hvbank' : 'hbank';
  const el = document.getElementById(elId);
  const col = mode==='virt' ? '#ea580c' : '#1d4ed8';
  if(el){
    // pulse the number
    el.style.transition='transform .15s,color .15s';
    el.style.transform='scale(1.25)';
    el.style.color=col;
    setTimeout(function(){
      el.style.transform='scale(1)';
      el.style.color='';
    },700);
  }
  // Toast
  if(deductedAmount&&deductedAmount>0){
    const label = mode==='virt' ? 'Virtual bank' : 'Real bank';
    const toast = document.createElement('div');
    toast.setAttribute('aria-live','polite');
    toast.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
      +'background:'+col+';color:#fff;font-size:13px;font-weight:600;'
      +'padding:8px 18px;border-radius:20px;z-index:99999;'
      +'box-shadow:0 4px 18px rgba(0,0,0,.35);pointer-events:none;'
      +'opacity:0;transition:opacity .2s;white-space:nowrap;';
    toast.textContent='−£'+parseFloat(deductedAmount).toFixed(2)+' from '+label;
    document.body.appendChild(toast);
    requestAnimationFrame(function(){
      toast.style.opacity='1';
      setTimeout(function(){
        toast.style.opacity='0';
        setTimeout(function(){ toast.remove(); }, 250);
      }, 2400);
    });
  }
}

// ─── HEADER ───
function updHdr(){
  // ── Real bank ──
  const bankCur=D.bank&&D.bank.current!=null?D.bank.current:0;
  const bankStart=D.bank&&D.bank.start!=null?D.bank.start:0;
  const diff=bankCur-bankStart;
  const arrow=!bankStart?'':diff>0?'<span style="color:#4ade80;font-size:9px;">▲</span>':diff<0?'<span style="color:#f87171;font-size:9px;">▼</span>':'';
  const hbank=document.getElementById('hbank');
  const hbankArrow=document.getElementById('hbank-arrow');
  if(hbank)hbank.textContent=bankCur.toFixed(2);
  if(hbankArrow)hbankArrow.innerHTML=arrow;

  // ── Virtual bank ──
  const vc=D.vBank&&D.vBank.current!=null?D.vBank.current:500;
  const vs=D.vBank&&D.vBank.start!=null?D.vBank.start:500;
  const vdiff=vc-vs;
  const varrow=!vs?'':vdiff>0?'<span style="color:#4ade80;font-size:9px;">▲</span>':vdiff<0?'<span style="color:#f87171;font-size:9px;">▼</span>':'';
  const hvbank=document.getElementById('hvbank');
  const hvbankArrow=document.getElementById('hvbank-arrow');
  if(hvbank)hvbank.textContent=vc.toFixed(2);
  if(hvbankArrow)hvbankArrow.innerHTML=varrow;

  // ── Streak ──
  const all=new Set((D.dailyLog||[]).map(function(d){return d.date;}));
  let streak=0;const t=td();
  const yd=new Date();yd.setDate(yd.getDate()-1);const yds=yd.toISOString().slice(0,10);
  let ch=all.has(t)?t:all.has(yds)?yds:null;
  if(ch){let d=new Date(ch);while(all.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1);}}
  window._streak=streak;
  const st=document.getElementById('tstreak-tile');
  if(st){st.innerHTML='<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:26px;font-weight:800;color:var(--navy);margin-bottom:2px;letter-spacing:1px;">'+streak+'</div><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);">Day Streak</div>';}

}

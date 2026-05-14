// ─── UI SHELL ─── shell height, mode, swipe engine, header

(function(){
  function setH(){document.documentElement.style.setProperty('--shell-h',(window.innerHeight-56)+'px');}
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
const CARDS=[{id:'today',lbl:'Today',col:'var(--gld)'},{id:'cards',lbl:'Racecards',col:'#60a5fa'},{id:'results',lbl:'Results',col:'#fb923c'},{id:'coach',lbl:'Coach',col:'#cc44aa'},{id:'bank',lbl:'Bank',col:'#f0aa44'},{id:'watch',lbl:'Puzzle Profiler',col:'#e879f9'}];
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
function updHdr(){
  // Real bank — always blue, arrow shows profit/loss direction
  const bankCur=D.bank.current||0, bankStart=D.bank.start||0;
  const hb=document.getElementById('hbank');
  const hw=document.getElementById('hbank-wrap');
  if(hb)hb.textContent=bankCur.toFixed(2);
  if(hw){
    const diff=bankCur-bankStart;
    const arrow=!bankStart?'':diff>0?' <span style="color:#34d399;font-size:10px;">▲</span>':diff<0?' <span style="color:#ef4444;font-size:10px;">▼</span>':'';
    hw.style.color='#60a5fa';
    // Inject arrow after the span - find or create arrow el
    const arrowEl=document.getElementById('hbank-arrow');
    if(arrowEl)arrowEl.innerHTML=arrow;
  }

  // Virtual bank — always orange, arrow shows profit/loss
  const vbEl=document.getElementById('hvbank');
  const vbWrap=document.getElementById('hvbank-wrap');
  const vc=D.vBank&&D.vBank.current!=null?D.vBank.current:500;
  const vs=D.vBank&&D.vBank.start!=null?D.vBank.start:500;
  if(vbEl)vbEl.textContent=vc.toFixed(2);
  if(vbWrap){
    const vdiff=vc-vs;
    const varrow=vs?vdiff>0?' <span style="color:#34d399;font-size:10px;">▲</span>':vdiff<0?' <span style="color:#ef4444;font-size:10px;">▼</span>':'':'';
    const varrowEl=document.getElementById('hvbank-arrow');
    if(varrowEl)varrowEl.innerHTML=varrow;
  }

  // Streak calc — based purely on app visits recorded in dailyLog
  const all=new Set((D.dailyLog||[]).map(d=>d.date));
  let streak=0;const t=td();const yd=new Date();yd.setDate(yd.getDate()-1);const yds=yd.toISOString().slice(0,10);
  let ch=all.has(t)?t:all.has(yds)?yds:null;
  if(ch){let d=new Date(ch);while(all.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1);}}
  window._streak=streak;
  const st=document.getElementById('tstreak-tile');
  if(st){st.innerHTML='<div style="font-family:monospace;font-size:24px;font-weight:700;color:var(--gld);margin-bottom:2px;">'+streak+'<span style="font-size:18px;">🔥</span></div><div style="font-family:monospace;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,228,220,.45);">Day Streak</div>';}

  // Today card bank tiles — real=blue+arrow, virtual=orange+arrow
  const rb=document.getElementById('t-real-bank');
  if(rb){
    const rdiff=bankCur-bankStart;
    const rarrow=bankStart?(rdiff>0?' ▲':rdiff<0?' ▼':''):'';
    const rcol=bankStart?(rdiff>0?'#34d399':rdiff<0?'#ef4444':'#60a5fa'):'#60a5fa';
    rb.innerHTML='£'+bankCur.toFixed(2)+'<span style="font-size:10px;color:'+rcol+';">'+rarrow+'</span>';
    rb.style.color='#60a5fa';
  }
  const vbt=document.getElementById('t-virt-bank');
  if(vbt){
    const vdiff2=vc-vs;
    const varrow2=vs?(vdiff2>0?' ▲':vdiff2<0?' ▼':''):'';
    const vcol=vs?(vdiff2>0?'#34d399':vdiff2<0?'#ef4444':'#fb923c'):'#fb923c';
    vbt.innerHTML='£'+vc.toFixed(2)+'<span style="font-size:10px;color:'+vcol+';">'+varrow2+'</span>';
    vbt.style.color='#fb923c';
  }
}


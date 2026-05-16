// ─── BETTING ─── checklist, log bet, bank, staking

// ─── LOG BET REAL/VIRTUAL TOGGLE ───
let lbMode='real';
function renderRealBankMini(){
  const bank=D.bank||{start:0,current:0};
  const el=document.getElementById('lb-real-bank-amt');
  if(el)el.textContent='£'+(bank.current||0).toFixed(2);
  const diff=(bank.current||0)-(bank.start||0);
  const pnlEl=document.getElementById('lb-real-bank-pnl');
  if(!pnlEl)return;
  const allP=D.bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr').reduce((a,b)=>a+(pnl(b)||0),0);
  pnlEl.innerHTML='<span style="color:'+(diff>=0?'var(--grn)':'var(--red)')+';">'+(diff>=0?'+':'')+'£'+Math.abs(diff).toFixed(2)+'</span><br><span style="color:var(--mut);font-size:9px;">All-time: <span style="color:'+(allP>=0?'var(--grn)':'var(--red)')+';">'+(allP>=0?'+':'')+'£'+Math.abs(allP).toFixed(2)+'</span></span>';
}

function saveStartBank(){
  if(!D.bank||typeof D.bank!=='object')D.bank={start:0,current:0};
  const val=parseFloat(document.getElementById('set-bk-start').value)||0;
  if(!val){alert('Enter a valid amount.');return;}
  D.bank.start=val;
  // If current bank hasn't been set yet, default it to starting bank
  if(!D.bank.current||D.bank.current===0)D.bank.current=val;
  save();updHdr();renderBkCard();renderRealBankMini();
  const st=document.getElementById('set-bk-status');
  if(st){st.textContent='✓ Starting bank set to £'+val.toFixed(2);st.style.color='var(--grn)';}
  setTimeout(()=>{const el=document.getElementById('set-bk-status');if(el)el.textContent='';},3000);
}

function saveVBankSettings(){
  if(!D.vBank||typeof D.vBank!=='object')D.vBank={start:500,current:500};
  const s=parseFloat(document.getElementById('set-vbk-start').value)||0;
  const c=parseFloat(document.getElementById('set-vbk-cur').value)||0;
  if(!s){alert('Enter a valid starting amount.');return;}
  D.vBank.start=s;
  D.vBank.current=c||s;
  save();updHdr();renderVBMini();
  const st=document.getElementById('set-vbk-status');
  if(st){st.textContent='✓ Virtual bank saved — £'+D.vBank.current.toFixed(2)+' current';st.style.color='#fb923c';}
  setTimeout(()=>{const el=document.getElementById('set-vbk-status');if(el)el.textContent='';},3000);
}

function resetVBank(){
  if(!D.vBank||typeof D.vBank!=='object')D.vBank={start:500,current:500};
  if(!confirm('Reset virtual bank current balance to £'+D.vBank.start.toFixed(2)+'?'))return;
  D.vBank.current=D.vBank.start;
  save();updHdr();renderVBMini();
  const s=document.getElementById('set-vbk-cur');if(s)s.value=D.vBank.start;
  const st=document.getElementById('set-vbk-status');
  if(st){st.textContent='✓ Virtual bank reset to £'+D.vBank.start.toFixed(2);st.style.color='#fb923c';}
  setTimeout(()=>{const el=document.getElementById('set-vbk-status');if(el)el.textContent='';},3000);
}

function loadStartBankField(){
  const el=document.getElementById('set-bk-start');if(el)el.value=D.bank&&D.bank.start?D.bank.start:'';
  const vs=document.getElementById('set-vbk-start');if(vs)vs.value=D.vBank&&D.vBank.start?D.vBank.start:500;
  const vc=document.getElementById('set-vbk-cur');if(vc)vc.value=D.vBank&&D.vBank.current!=null?D.vBank.current:500;
  const pv=document.getElementById('set-pv');if(pv)pv.value=getPointValue();
  renderPVPreview();
}
function renderPVPreview(){
  const el=document.getElementById('pv-preview');if(!el)return;
  const pv=parseFloat((document.getElementById('set-pv')||{value:'5'}).value)||5;
  const confLabels=['Speculative','Interested','Solid','Strong','Best Bet'];
  const rows=CONF_PTS.map((pts,i)=>{
    const s=pts*pv;
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bdr);font-size:13px;">'
      +'<span><span style="color:var(--gld);font-family:monospace;">'+('★'.repeat(i+1))+'</span> <span style="color:var(--mut);font-size:12px;">'+confLabels[i]+'</span></span>'
      +'<span style="font-family:monospace;"><span style="color:var(--mut);">'+pts+'pt = </span><strong style="color:var(--txt);">'+fp(s)+'</strong></span>'
      +'</div>';
  });
  el.innerHTML='<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:9px;padding:4px 12px;">'+rows.join('')+'</div>';
}
function savePointValue(){
  const pv=parseFloat((document.getElementById('set-pv')||{value:'5'}).value);
  if(!pv||pv<=0){alert('Enter a valid point value.');return;}
  if(!D.settings)D.settings={};
  D.settings.pointValue=parseFloat(pv.toFixed(2));
  save();
  const st=document.getElementById('set-pv-status');
  if(st){st.textContent='✓ Saved — '+fp(pv)+'/pt';st.style.color='var(--grn)';}
  setTimeout(()=>{const el=document.getElementById('set-pv-status');if(el)el.textContent='';},3000);
}

function setLBMode(m){
  lbMode=m;
  document.getElementById('lb-real-form').style.display=m==='real'?'block':'none';
  document.getElementById('lb-virt-form').style.display=m==='virt'?'block':'none';
  // Update card accent strip colour via CSS variable on the card element
  const card=document.getElementById('c2');
  if(card)card.style.setProperty('--card-accent',m==='real'?'linear-gradient(90deg,#1d4ed8,#60a5fa)':'linear-gradient(90deg,#ea580c,#fb923c)');
  const tr=document.getElementById('lb-tog-real'),tv=document.getElementById('lb-tog-virt');
  if(tr){tr.style.background=m==='real'?'var(--blu)':'transparent';tr.style.color=m==='real'?'white':'var(--mut)';}
  if(tv){tv.style.background=m==='virt'?'#fb923c':'transparent';tv.style.color=m==='virt'?'#141414':'var(--mut)';}
  const title=document.getElementById('lb-card-title');
  if(title){title.textContent=m==='real'?'Real Bet':'Virtual Bet';title.style.color=m==='real'?'#60a5fa':'#fb923c';}
  if(m==='virt'){renderVBMini();setTimeout(calcVirtStake,100);}
  else{renderRealBankMini();setTimeout(calcLiveStake,100);}
}
function calcVirtStake(){calcStakeGuide('virt');}
function renderVBMini(){
  const bank=D.vBank||{start:500,current:500};
  const el=document.getElementById('vb-mini-amt');if(el)el.textContent='£'+bank.current.toFixed(2);
  const diff=bank.current-bank.start;
  const pnlEl=document.getElementById('vb-mini-pnl');
  if(!pnlEl)return;
  pnlEl.innerHTML='<span style="color:'+(diff>=0?'#fb923c':'var(--red)')+';">'+(diff>=0?'+':'')+'£'+Math.abs(diff).toFixed(2)+'</span><br>'
    +'<span style="color:var(--mut);font-size:9px;">Real: <span style="color:'+((D.bank.current||0)>=(D.bank.start||0)?'var(--grn)':'var(--red)')+';">£'+(D.bank.current||0).toFixed(2)+'</span></span>';
}
function renderLogBetCard(){
  const limit=D.settings&&D.settings.dailyLimit?D.settings.dailyLimit:5;
  const todayCount=D.bets.filter(b=>b.date===td()).length;
  const el=document.getElementById('lb-limit-warn');
  if(el){
    if(todayCount>=limit){el.style.display='block';el.style.background='rgba(196,58,58,.08)';el.style.borderColor='rgba(196,58,58,.2)';el.style.color='var(--red)';el.textContent='⚠️ Daily limit reached ('+todayCount+'/'+limit+' bets).';}
    else if(todayCount===limit-1){el.style.display='block';el.style.background='rgba(232,228,220,.08)';el.style.borderColor='rgba(232,228,220,.25)';el.style.color='var(--gld)';el.textContent='Last bet of the day — make it count.';}
    else el.style.display='none';
  }
  if(lbMode==='virt'){renderVBMini();setTimeout(calcVirtStake,100);}
  else{renderRealBankMini();setTimeout(calcLiveStake,100);}
}


// ─── HEADER ───

// ─── CHECKLIST ───
let cks=new Array(CKS.length).fill(false);
function renderPrebet(){const el=document.getElementById('ckitems');if(el&&el.children.length)return;if(el)el.innerHTML=CKS.map((c,i)=>`<div class="cki" id="cki${i}" onclick="tck(${i})"><div class="ckb" id="ckb${i}">✓</div><div class="ckt">${c.t}</div></div>`).join('');updCkScore();}
function renderCmdCk(){const gs=[{id:'ck-f',r:[0,4]},{id:'ck-v',r:[5,6]},{id:'ck-m',r:[7,9]}];gs.forEach(g=>{const el=document.getElementById(g.id);if(!el)return;el.innerHTML=CKS.slice(g.r[0],g.r[1]+1).map((c,ii)=>{const i=ii+g.r[0];return`<div class="cki" id="ckc${i}" onclick="tck(${i})"><div class="ckb" id="ckbc${i}">✓</div><div><div class="ckt">${c.t}</div><div class="cks">${c.s}</div></div></div>`;}).join('');});updCkScore();}
function tck(i){cks[i]=!cks[i];[`cki${i}`,`ckc${i}`].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('done',cks[i]);});[`ckb${i}`,`ckbc${i}`].forEach(id=>{});updCkScore();}
function resetCks(){cks=new Array(CKS.length).fill(false);CKS.forEach((_,i)=>{[`cki${i}`,`ckc${i}`].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('done');});});updCkScore();}
function updCkScore(){
  const done=cks.filter(Boolean).length,tot=CKS.length;
  const sn=document.getElementById('csnum'),sb=document.getElementById('csbox');
  if(sn){sn.textContent=done+'/'+tot;const p=done/tot;sn.className='csnum '+(p===1?'pos':p>.7?'gld':'neg');}
  if(sb)sb.style.borderColor=done===tot?'rgba(38,168,101,.3)':done>7?'rgba(232,228,220,.25)':'rgba(30,50,80,.5)';
  const bar=document.getElementById('ck-bar');
  if(bar){const p=done/tot;bar.style.width=(p*100)+'%';bar.style.background=p===1?'var(--grn)':p>.7?'var(--gld)':'var(--dim)';}
  let rec='',recCol='var(--mut)',recBg='transparent',recBdr='var(--bdr)';
  if(done>=9){rec='✅ Strong process — log as a Real bet';recCol='var(--grn)';recBg='rgba(38,168,101,.08)';recBdr='rgba(38,168,101,.25)';}
  else if(done>=6){rec='⚠️ Partial — consider Virtual first';recCol='var(--gld)';recBg='rgba(232,228,220,.08)';recBdr='rgba(232,228,220,.25)';}
  else if(done>0){rec='🔴 Low confidence — Virtual only';recCol='var(--red)';recBg='rgba(196,58,58,.08)';recBdr='rgba(196,58,58,.2)';}
  const lbl=document.getElementById('cslbl');if(lbl)lbl.textContent=done===tot?'All checks passed':'Checks passed';
  const recEl=document.getElementById('ck-rec');
  if(recEl){if(rec){recEl.style.display='block';recEl.style.background=recBg;recEl.style.borderColor=recBdr;recEl.style.color=recCol;recEl.textContent=rec;}else recEl.style.display='none';}
  const gb=document.getElementById('ckgo');
  if(gb){
    if(done>=9){gb.style.background='var(--grn)';gb.style.color='var(--bg)';gb.style.borderColor='var(--grn)';gb.textContent='→ Log Real Bet';}
    else if(done>=6){gb.style.background='rgba(232,228,220,.15)';gb.style.color='var(--gld)';gb.style.borderColor='var(--gld)';gb.textContent='→ Log Virtual Bet (recommended)';}
    else if(done>0){gb.style.background='rgba(251,146,60,.1)';gb.style.color='#fb923c';gb.style.borderColor='#fb923c';gb.textContent='→ Log Virtual Bet';}
    else{gb.style.background='transparent';gb.style.color='var(--mut)';gb.style.borderColor='var(--bdr)';gb.textContent='Tick the checklist above';}
  }
}
function goFromChecklist(){
  const done=cks.filter(Boolean).length;
  if(done===0){alert('Run through the checklist first — at least tick what you have checked.');return;}
  const mode=done>=9?'real':'virt';
  // Check if coming from a racecard tap
  if(_pendingRCBet){
    const p=_pendingRCBet; _pendingRCBet=null;
    const betMode=p.mode||mode;
    go(2);
    setTimeout(function(){
      setLBMode(betMode);
      const pre=betMode==='real'?'lb':'vb';
      const h=document.getElementById(pre+'h');if(h)h.value=p.horse;
      const t=document.getElementById(pre+'t')||document.getElementById('lbt');if(t)t.value=p.course;
      const ti=document.getElementById(pre+'time');if(ti)ti.value=p.time;
      const j=document.getElementById(pre+'jockey');if(j)j.value=p.jockey;
      const tr=document.getElementById(pre+'trainer');if(tr)tr.value=p.trainer;
      // Hide the pending horse indicator
      const sub=document.getElementById('pb-pending-horse');if(sub)sub.style.display='none';
      renderLogBetCard();
      if(betMode==='real')setTimeout(calcLiveStake,150);else setTimeout(calcVirtStake,150);
    },300);
    return;
  }
  go(2);
  setTimeout(()=>setLBMode(mode),300);
}


// ─── AUTO-CALC WIRED TO RESULT DROPDOWNS ───
function onSwResChange(){const res=document.getElementById('lbres').value,stake=document.getElementById('lbs').value,od=fo(document.getElementById('lbo').value),bt=document.getElementById('lbtype').value;if(res!=='pending'&&stake&&od)document.getElementById('lbret').value=calcReturns(res,stake,od,bt,'');}
function onCmdResChange(){/* removed panel */}
function onEditResChange(){
  const res=(document.getElementById('emres')||{value:'pending'}).value;
  const odRaw=(document.getElementById('em-odds')||{value:''}).value.trim();
  const stake=parseFloat((document.getElementById('em-stake')||{value:0}).value)||0;
  const bt=(document.getElementById('em-type-sel')||{value:'win'}).value;
  const retEl=document.getElementById('emret');
  if(!retEl)return;
  const od=fo(odRaw);
  if(res==='pending'||res==='void'||res==='nr'){retEl.value='';return;}
  if(stake>0&&od>=1){retEl.value=calcReturns(res,stake,od,bt,'');}
}

// ─── LOG BET SWIPE ───
function saveLB(){
  // Daily limit check
  const _limit=D.settings&&D.settings.dailyLimit?D.settings.dailyLimit:5;
  const _today=D.bets.filter(b=>b.date===td()).length;
  if(_today>=_limit){
    if(!confirm('⚠️ You have reached your daily limit of '+_limit+' bets. Are you sure you want to place another?'))return;
  }
  const horse=document.getElementById('lbh').value.trim(),track=document.getElementById('lbt').value.trim(),or=document.getElementById('lbo').value.trim(),stake=parseFloat(document.getElementById('lbs').value),od=fo(or);
  if(!horse){alert('Enter a horse name.');return;}if(!stake||stake<=0){alert('Enter a valid stake.');return;}if(!od||od<1){alert('Enter valid odds e.g. 5/1 or EVS');return;}
  const result=document.getElementById('lbres').value,bt=document.getElementById('lbtype').value;
  const autoRet=calcReturns(result,stake,od,bt,'');
  const returns=parseFloat(document.getElementById('lbret').value)||autoRet;
  const bet={id:gid(),date:td(),horse,track,time:document.getElementById('lbtime').value.trim(),jockey:(document.getElementById('lbjockey')||{value:''}).value.trim(),trainer:(document.getElementById('lbtrainer')||{value:''}).value.trim(),odds:od,oddsDisplay:or,stake,betType:bt,conf:parseInt(document.getElementById('lbconf').value),source:document.getElementById('lbsrc').value,notes:document.getElementById('lbnotes').value.trim(),checklistScore:cks.filter(Boolean).length,result,returns,betBanked:false,createdAt:Date.now()};
  applyBankDelta(bet,null,0);
  D.bets.push(bet);save();updHdr();refreshRacecardHighlights();
  ['lbh','lbtime','lbo','lbs','lbnotes','lbret','lbjockey','lbtrainer'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  resetCks();;
  document.getElementById('lbres').value='pending';document.getElementById('lbconf').value='3';
  const tt=getTracks();if(tt.length===1)document.getElementById('lbt').value=tt[0];
  const overlay=document.getElementById('logbet-overlay');
  if(overlay&&overlay.style.display!=='none'){closeLogbetOverlay();}
  else{document.getElementById('lbok').textContent=`✓ ${horse} @ ${dOdds(or)}${result!=='pending'?' — '+result+' ('+fp(returns)+')':''}`;flash('lbok');renderToday();renderBetLimit();if(CARDS[cur].id==='bank')renderBkCard();}
}

// ─── LOG BET CMD ───

// ─── BANK ───
function renderBkCard(){
  // Load point value field if present on this card
  const pvEl=document.getElementById('set-pv');if(pvEl&&!pvEl.value)pvEl.value=getPointValue();
  renderPVPreview();const s=D.bank.start||0,c=D.bank.current||0,diff=c-s,pct=s>0?(c/s*100):100;const el=document.getElementById('bkdisp');if(!el)return;el.innerHTML=`<div style="margin-bottom:5px;"><div class="sbig gld">${fp(c)}</div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em;margin-top:2px;">Current Bank</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin:9px 0 5px;"><span style="font-size:13px;color:var(--mut);">vs starting ${fp(s)}</span><span style="font-family:monospace;font-size:13px;color:${diff>=0?'var(--grn)':'var(--red)'};">${fmt(diff)}</span></div><div class="prog"><div class="progf ${diff<0?'lp':''}" style="width:${Math.min(100,Math.max(2,pct)).toFixed(1)}%;transition:width .5s;"></div></div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-align:right;margin-top:3px;">${pct.toFixed(1)}% of starting bank</div>`;const bkcuEl=document.getElementById('bkcu');if(bkcuEl)bkcuEl.value=c||'';}
function saveBank(){if(!D.bank||typeof D.bank!=='object')D.bank={start:0,current:0};const c=parseFloat(document.getElementById('bkcu').value)||0;D.bank.current=c;save();updHdr();renderBkCard();calcStk();renderRealBankMini();const btn=document.querySelector('#c4 .bgld');if(btn){const o=btn.textContent;btn.textContent='✓ Saved';btn.style.background='var(--grn)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},3000);}}
function calcStk(){const m=document.getElementById('bkm').value,bank=D.bank.current||0;const kw=document.getElementById('kelwin'),lbl=document.getElementById('bkil'),re=document.getElementById('stkres'),oe=document.getElementById('stkout'),ne=document.getElementById('stknote');kw.style.display=m==='kelly'?'block':'none';let stake=0,note='';if(m==='level'){lbl.textContent='Stake (£)';stake=parseFloat(document.getElementById('bkin').value)||0;note='Fixed amount per bet.';}else if(m==='pct'){lbl.textContent='% of Bank';const p=parseFloat(document.getElementById('bkin').value)||0;stake=bank*(p/100);note=`${p}% of ${fp(bank)}`;}else if(m==='kelly'){const p=(parseFloat(document.getElementById('kp').value)||0)/100,b=(parseFloat(document.getElementById('ko').value)||0)-1,fr=parseFloat(document.getElementById('kf').value)||.5;if(p>0&&b>0){const k=(p*b-(1-p))/b;stake=k>0?bank*k*fr:0;note=k<=0?'No edge — do not bet.':`Full Kelly: ${(k*100).toFixed(2)}% → ${(fr*100).toFixed(0)}% applied`;}}if(stake>0){re.style.display='block';oe.textContent='£'+stake.toFixed(2);ne.textContent=note;}else re.style.display='none';}


// ─── BANK ───
function renderBkCard(){
  // Load point value field if present on this card
  const pvEl=document.getElementById('set-pv');if(pvEl&&!pvEl.value)pvEl.value=getPointValue();
  renderPVPreview();const s=D.bank.start||0,c=D.bank.current||0,diff=c-s,pct=s>0?(c/s*100):100;const el=document.getElementById('bkdisp');if(!el)return;el.innerHTML=`<div style="margin-bottom:5px;"><div class="sbig gld">${fp(c)}</div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em;margin-top:2px;">Current Bank</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin:9px 0 5px;"><span style="font-size:13px;color:var(--mut);">vs starting ${fp(s)}</span><span style="font-family:monospace;font-size:13px;color:${diff>=0?'var(--grn)':'var(--red)'};">${fmt(diff)}</span></div><div class="prog"><div class="progf ${diff<0?'lp':''}" style="width:${Math.min(100,Math.max(2,pct)).toFixed(1)}%;transition:width .5s;"></div></div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-align:right;margin-top:3px;">${pct.toFixed(1)}% of starting bank</div>`;const bkcuEl=document.getElementById('bkcu');if(bkcuEl)bkcuEl.value=c||'';}
function saveBank(){if(!D.bank||typeof D.bank!=='object')D.bank={start:0,current:0};const c=parseFloat(document.getElementById('bkcu').value)||0;D.bank.current=c;save();updHdr();renderBkCard();calcStk();renderRealBankMini();const btn=document.querySelector('#c4 .bgld');if(btn){const o=btn.textContent;btn.textContent='✓ Saved';btn.style.background='var(--grn)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},3000);}}
function calcStk(){const m=document.getElementById('bkm').value,bank=D.bank.current||0;const kw=document.getElementById('kelwin'),lbl=document.getElementById('bkil'),re=document.getElementById('stkres'),oe=document.getElementById('stkout'),ne=document.getElementById('stknote');kw.style.display=m==='kelly'?'block':'none';let stake=0,note='';if(m==='level'){lbl.textContent='Stake (£)';stake=parseFloat(document.getElementById('bkin').value)||0;note='Fixed amount per bet.';}else if(m==='pct'){lbl.textContent='% of Bank';const p=parseFloat(document.getElementById('bkin').value)||0;stake=bank*(p/100);note=`${p}% of ${fp(bank)}`;}else if(m==='kelly'){const p=(parseFloat(document.getElementById('kp').value)||0)/100,b=(parseFloat(document.getElementById('ko').value)||0)-1,fr=parseFloat(document.getElementById('kf').value)||.5;if(p>0&&b>0){const k=(p*b-(1-p))/b;stake=k>0?bank*k*fr:0;note=k<=0?'No edge — do not bet.':`Full Kelly: ${(k*100).toFixed(2)}% → ${(fr*100).toFixed(0)}% applied`;}}if(stake>0){re.style.display='block';oe.textContent='£'+stake.toFixed(2);ne.textContent=note;}else re.style.display='none';}


function recalcBanks(){
  if(!confirm('Recalculate both banks from your full bet history?\nThis will overwrite any manually entered balance.'))return;

  // ── Real bank ──
  D.bank=D.bank||{start:0,current:0};
  D.bank.current=D.bank.start||0;
  // Clear betBanked flags so applyBankDelta replays cleanly
  (D.bets||[]).forEach(function(b){ b.betBanked=false; });
  (D.bets||[]).forEach(function(b){
    if(b.result&&b.result!=='pending'){
      applyBankDelta(b,null,0);
    }
  });

  // ── Virtual bank ──
  const vb=getVBank();
  vb.current=vb.start||500;
  (vb.bets||[]).forEach(function(b){
    if(b.result&&b.result!=='pending'&&b.result!=='nr'){
      const outlay=(parseFloat(b.stake)||0)*(b.betType==='ew'?2:1);
      const betPnl=(parseFloat(b.returns)||0)-outlay;
      vb.current=parseFloat((vb.current+betPnl).toFixed(2));
    }
  });

  save();
  updHdr();
  renderBkCard();
  renderRealBankMini();
  renderVBMini();
  if(typeof renderDash==='function') renderDash();
  if(typeof renderStats==='function') renderStats();

  // Show confirmation
  const btn=document.querySelector('[onclick="recalcBanks()"]');
  if(btn){
    const orig=btn.textContent;
    btn.textContent='✓ Done — banks recalculated';
    btn.style.background='var(--grn)';
    btn.style.borderColor='var(--grn)';
    btn.style.color='#141414';
    setTimeout(function(){
      btn.textContent=orig;
      btn.style.background='';
      btn.style.borderColor='';
      btn.style.color='';
    },3000);
  }
}

// ─── BET FLOW: source dropdown + checklist → log bet ───
let _betFlowState={};
let _flowCks=[];
let _flowActiveCKS=[];

function openBetFlow(horse, course, time, jockey, trainer, raceName){
  _betFlowState={horse,course,time,jockey,trainer,raceName,source:'',tipSource:''};
  const existing=document.getElementById('_bflow-ov');
  if(existing)existing.remove();
  const ov=document.createElement('div');
  ov.id='_bflow-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.75);display:flex;flex-direction:column;justify-content:flex-end;opacity:0;transition:opacity .2s;';
  ov.innerHTML='<div id="_bflow-sheet" style="background:var(--sur);border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);max-height:92vh;display:flex;flex-direction:column;transform:translateY(40px);transition:transform .25s ease,opacity .25s ease;opacity:0;">'
    +'<div style="display:flex;justify-content:center;padding:12px 0 4px;flex-shrink:0;"><div style="width:36px;height:4px;border-radius:2px;background:var(--bdr);"></div></div>'
    +'<div style="padding:12px 18px 14px;border-bottom:1px solid var(--bdr);flex-shrink:0;">'
      +'<div style="font-size:17px;font-weight:700;color:var(--txt);">'+horse+'</div>'
      +'<div style="font-size:11px;color:var(--mut);font-family:monospace;margin-top:1px;">'+time+' · '+course+'</div>'
    +'</div>'
    +'<div id="_bflow-content" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;">'+_betFlowChecklistHtml()+'</div>'
    +'</div>';
  ov.addEventListener('click',function(e){if(e.target===ov)_betFlowClose();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){
    ov.style.opacity='1';
    const sh=document.getElementById('_bflow-sheet');
    if(sh){sh.style.transform='translateY(0)';sh.style.opacity='1';}
  });
}

function _betFlowChecklistHtml(){
  const sources=D.sources||[];
  const opts=sources.map(s=>'<option value="'+s.id+'" data-type="'+s.type+'">'+s.label+'</option>').join('');
  return `<div style="padding:14px 18px 10px;flex-shrink:0;">`
      +`<div style="font-family:monospace;font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">Source</div>`
      +`<select id="_bflow-src-sel" onchange="_betFlowSourceChanged()" style="width:100%;box-sizing:border-box;background:var(--sur2);border:1px solid var(--bdr);border-radius:10px;padding:11px 14px;font-size:14px;color:var(--txt);appearance:none;-webkit-appearance:none;cursor:pointer;">`
        +`<option value="" disabled selected>— Select source —</option>`
        +opts
      +`</select>`
    +`</div>`
    +`<div id="_bflow-cks-wrap" style="flex:1;overflow-y:auto;padding:0 18px;"></div>`
    +`<div style="position:sticky;bottom:0;background:var(--sur);border-top:1px solid var(--bdr);padding:12px 18px env(safe-area-inset-bottom,16px);flex-shrink:0;">`
      +`<div id="_bflow-rec" style="font-family:monospace;font-size:11px;color:var(--mut);margin-bottom:8px;min-height:16px;"></div>`
      +`<div style="display:flex;gap:8px;">`
        +`<button id="_bflow-btn" onclick="_betFlowProceed()" style="flex:1;padding:14px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;">Select a source above</button>`
        +`<button onclick="_betFlowClose()" style="padding:14px 16px;border-radius:10px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:monospace;font-size:14px;cursor:pointer;">✕</button>`
      +`</div>`
    +`</div>`;
}

function _betFlowSourceChanged(){
  const sel=document.getElementById('_bflow-src-sel');
  if(!sel||!sel.value)return;
  const opt=sel.options[sel.selectedIndex];
  const type=opt.getAttribute('data-type');
  const label=opt.text;
  _betFlowState.source=type;
  _betFlowState.tipSource=label;
  _flowActiveCKS=type==='own'?CKS_OWN:CKS_TIP;
  _flowCks=new Array(_flowActiveCKS.length).fill(false);
  const accentCol=type==='own'?'#60a5fa':'#e879f9';
  const wrap=document.getElementById('_bflow-cks-wrap');
  if(wrap){
    wrap.innerHTML=
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0 8px;">'
        +'<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:'+accentCol+';">'+(type==='own'?'OWN STUDY':'TIP · '+label.toUpperCase())+'</div>'
        +'<div id="_bflow-score-lbl" style="font-family:monospace;font-size:11px;color:var(--mut);">0 / '+_flowActiveCKS.length+'</div>'
      +'</div>'
      +'<div style="height:4px;border-radius:2px;background:var(--bdr);overflow:hidden;margin-bottom:12px;">'
        +'<div id="_bflow-bar" style="height:100%;border-radius:2px;background:'+accentCol+';width:0%;transition:width .25s;"></div>'
      +'</div>'
      +_flowActiveCKS.map(function(c,i){return '<div id="_bflow-item-'+i+'" onclick="_betFlowTick('+i+')" style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);margin-bottom:8px;cursor:pointer;transition:border-color .15s,background .15s;">'
        +'<div id="_bflow-chk-'+i+'" style="width:20px;height:20px;flex-shrink:0;border-radius:6px;border:2px solid var(--bdr);display:flex;align-items:center;justify-content:center;margin-top:1px;transition:all .15s;font-size:12px;"></div>'
        +'<div><div style="font-size:13px;line-height:1.4;color:var(--txt);">'+c.t+'</div>'
        +'<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:3px;line-height:1.35;">'+c.s+'</div></div>'
        +'</div>';}).join('')
      +'<div style="height:8px;"></div>';
  }
  const btn=document.getElementById('_bflow-btn');
  const rec=document.getElementById('_bflow-rec');
  if(btn){btn.style.background='var(--sur2)';btn.style.color='var(--mut)';btn.style.borderColor='var(--bdr)';btn.textContent='Tick the checklist above';}
  if(rec)rec.textContent='';
}
function _betFlowTick(i){
  _flowCks[i]=!_flowCks[i];
  const isOwn=_betFlowState.source==='own';
  const accentCol=isOwn?'#60a5fa':'#e879f9';
  const item=document.getElementById('_bflow-item-'+i);
  const chk=document.getElementById('_bflow-chk-'+i);
  if(item){item.style.borderColor=_flowCks[i]?accentCol:'var(--bdr)';item.style.background=_flowCks[i]?accentCol+'18':'var(--sur2)';}
  if(chk){chk.style.background=_flowCks[i]?accentCol:'transparent';chk.style.borderColor=_flowCks[i]?accentCol:'var(--bdr)';chk.style.color=_flowCks[i]?'#141414':'transparent';chk.textContent=_flowCks[i]?'✓':'';}
  _betFlowUpdateScore();
}

function _betFlowUpdateScore(){
  const done=_flowCks.filter(Boolean).length;
  const total=_flowActiveCKS.length;
  const pct=total>0?done/total*100:0;
  const isOwn=_betFlowState.source==='own';
  const accentCol=isOwn?'#60a5fa':'#e879f9';
  const lbl=document.getElementById('_bflow-score-lbl');
  if(lbl)lbl.textContent=done+' / '+total;
  const bar=document.getElementById('_bflow-bar');
  if(bar){bar.style.width=pct+'%';bar.style.background=done===total?'var(--grn)':pct>=66?'var(--gld)':accentCol;}
  const btn=document.getElementById('_bflow-btn');
  const rec=document.getElementById('_bflow-rec');
  if(done===0){
    if(btn){btn.style.background='var(--sur2)';btn.style.color='var(--mut)';btn.style.borderColor='var(--bdr)';btn.textContent='Tick the checklist above';}
    if(rec)rec.textContent='';
    return;
  }
  let recTxt='',recCol='var(--mut)',btnBg='',btnCol='',btnBdr='',btnTxt='';
  if(done===total){
    recTxt='✅ All checks passed — log as Real Bet';recCol='var(--grn)';
    btnBg='var(--grn)';btnCol='#141414';btnBdr='var(--grn)';btnTxt='→ Log Real Bet';
  } else if(pct>=66){
    recTxt='⚠️ Most checks passed — proceed with care';recCol='var(--gld)';
    btnBg='rgba(232,228,220,.12)';btnCol='var(--gld)';btnBdr='var(--gld)';btnTxt='→ Log Real Bet';
  } else {
    recTxt='🔴 Low score — Virtual only';recCol='var(--red)';
    btnBg='rgba(251,146,60,.1)';btnCol='#fb923c';btnBdr='#fb923c';btnTxt='→ Log Virtual Bet';
  }
  if(btn){btn.style.background=btnBg;btn.style.color=btnCol;btn.style.borderColor=btnBdr;btn.textContent=btnTxt;}
  if(rec){rec.style.color=recCol;rec.textContent=recTxt;}
}

function _betFlowProceed(){
  const done=_flowCks.filter(Boolean).length;
  if(done===0){alert('Work through the checklist first — tick at least what you have considered.');return;}
  const total=_flowActiveCKS.length;
  const pct=total>0?done/total*100:0;
  // Derive mode from score — same thresholds as display
  _betFlowState.mode=pct>=66?'real':'virt';
  const s=_betFlowState;
  _betFlowClose();
  _rcDoLogBet(s);
}

function _betFlowClose(){
  const ov=document.getElementById('_bflow-ov');
  if(!ov)return;
  const sh=document.getElementById('_bflow-sheet');
  if(sh){sh.style.transform='translateY(40px)';sh.style.opacity='0';}
  ov.style.opacity='0';
  setTimeout(function(){if(ov.parentNode)ov.remove();},250);
}
// ─── SOURCE MANAGEMENT (Settings) ───
function renderSourceDropdowns(){
  const sources=D.sources||[];
  ['lbsrc','em-source'].forEach(function(id){
    const el=document.getElementById(id);
    if(!el)return;
    const cur=el.value;
    el.innerHTML=sources.map(s=>`<option value="${s.label}">${s.label}</option>`).join('');
    // Restore previous value if still valid
    if(cur&&sources.some(s=>s.label===cur))el.value=cur;
  });
}

function renderSettingsSources(){
  const el=document.getElementById('set-sources-list');
  if(!el)return;
  const sources=D.sources||[];
  if(!sources.length){el.innerHTML='<div style="font-size:12px;color:var(--mut);font-style:italic;">No sources yet.</div>';return;}
  el.innerHTML=sources.map(function(s,i){
    const isOwn=s.type==='own';
    const col=isOwn?'#60a5fa':'#e879f9';
    const bg=isOwn?'rgba(96,165,250,.1)':'rgba(232,121,249,.1)';
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;border:1px solid var(--bdr);background:var(--sur2);margin-bottom:6px;">`
      +`<span style="font-family:monospace;font-size:9px;font-weight:700;padding:3px 8px;border-radius:5px;background:${bg};color:${col};border:1px solid ${col}44;flex-shrink:0;">${isOwn?'OWN':'TIP'}</span>`
      +`<span style="flex:1;font-size:13px;color:var(--txt);">${s.label}</span>`
      +(i>0?`<button onclick="settingsMoveSource(${i},-1)" style="background:transparent;border:none;color:var(--mut);cursor:pointer;padding:4px 6px;font-size:14px;" title="Move up">↑</button>`:'<span style="width:26px;"></span>')
      +(i<sources.length-1?`<button onclick="settingsMoveSource(${i},1)" style="background:transparent;border:none;color:var(--mut);cursor:pointer;padding:4px 6px;font-size:14px;" title="Move down">↓</button>`:'<span style="width:26px;"></span>')
      +`<button onclick="settingsRemoveSource('${s.id}')" style="background:transparent;border:none;color:var(--red);cursor:pointer;padding:4px 8px;font-size:13px;" title="Remove">✕</button>`
    +`</div>`;
  }).join('');
}

function settingsAddSource(){
  const labelEl=document.getElementById('set-src-new-label');
  const typeEl=document.getElementById('set-src-new-type');
  const label=(labelEl?labelEl.value.trim():'');
  const type=typeEl?typeEl.value:'tip';
  if(!label){if(labelEl){labelEl.style.borderColor='var(--red)';labelEl.focus();}return;}
  if(!D.sources)D.sources=[];
  if(D.sources.some(s=>s.label.toLowerCase()===label.toLowerCase())){
    const st=document.getElementById('set-src-status');
    if(st){st.textContent='A source with that name already exists.';st.style.color='var(--red)';}
    return;
  }
  const id='src-'+Date.now().toString(36);
  D.sources.push({id,label,type});
  save();
  if(labelEl)labelEl.value='';
  labelEl.style.borderColor='';
  renderSettingsSources();
  renderSourceDropdowns();
  const st=document.getElementById('set-src-status');
  if(st){st.textContent='✓ '+label+' added.';st.style.color='var(--grn)';}
  setTimeout(()=>{const e=document.getElementById('set-src-status');if(e)e.textContent='';},3000);
}

function settingsRemoveSource(id){
  if(!D.sources)return;
  const src=D.sources.find(s=>s.id===id);
  if(!src)return;
  if(!confirm('Remove "'+src.label+'"?'))return;
  D.sources=D.sources.filter(s=>s.id!==id);
  save();
  renderSettingsSources();
  renderSourceDropdowns();
}

function settingsMoveSource(i,dir){
  if(!D.sources)return;
  const j=i+dir;
  if(j<0||j>=D.sources.length)return;
  const tmp=D.sources[i];D.sources[i]=D.sources[j];D.sources[j]=tmp;
  save();
  renderSettingsSources();
  renderSourceDropdowns();
}

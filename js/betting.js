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
  const raw=document.getElementById('set-bk-start').value;
  if(raw===''||raw===null){alert('Enter a starting bank amount (0 or more).');return;}
  const val=parseFloat(raw)||0;
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
  save();updHdr();renderVBMini();if(typeof renderVBKDisp==='function')renderVBKDisp();
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

function _clearRealBets(){
  if(!confirm('Clear ALL real bets? This cannot be undone.\n\nYour bank and watchlist are not affected.'))return;
  D.bets=[];
  D.bank.current=D.bank.start||0;
  save();updHdr();renderBkCard();renderRealBankMini();
  const st=document.getElementById('set-bk-status');
  if(st){st.textContent='✓ Real bets cleared';st.style.color='var(--grn)';}
  setTimeout(()=>{const el=document.getElementById('set-bk-status');if(el)el.textContent='';},3000);
}

function _clearVirtBets(){
  if(!confirm('Clear ALL virtual bets? This cannot be undone.'))return;
  if(!D.vBank||typeof D.vBank!=='object')D.vBank={start:500,current:500,bets:[]};
  D.vBank.bets=[];
  D.vBank.current=D.vBank.start||500;
  save();updHdr();renderVBMini();
  const st=document.getElementById('set-vbk-status');
  if(st){st.textContent='✓ Virtual bets cleared';st.style.color='#fb923c';}
  setTimeout(()=>{const el=document.getElementById('set-vbk-status');if(el)el.textContent='';},3000);
}

function _clearAllBets(){
  if(!confirm('Clear ALL real AND virtual bets?\n\nThis cannot be undone. Your bank and watchlist are not affected.'))return;
  D.bets=[];
  D.bank.current=D.bank.start||0;
  if(!D.vBank||typeof D.vBank!=='object')D.vBank={start:500,current:500,bets:[]};
  D.vBank.bets=[];
  D.vBank.current=D.vBank.start||500;
  save();updHdr();renderBkCard();renderRealBankMini();renderVBMini();
  const st=document.getElementById('set-bk-status');
  if(st){st.textContent='✓ All bets cleared';st.style.color='var(--grn)';}
  setTimeout(()=>{const el=document.getElementById('set-bk-status');if(el)el.textContent='';},3000);
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

function renderSetSources(){
  if(!D.settings)D.settings={};
  if(!D.settings.sources)D.settings.sources=[];
  const el=document.getElementById('set-sources-list');
  if(!el)return;
  if(!D.settings.sources.length){
    el.innerHTML='<div style="font-family:monospace;font-size:11px;color:var(--mut);padding:6px 0;">No sources added yet.</div>';
    return;
  }
  el.innerHTML=D.settings.sources.map(function(s,i){
    const label=typeof s==='object'?s.label:s;
    const type=typeof s==='object'?s.type:'tip';
    const col=type==='own'?'#60a5fa':'#e879f9';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:9px;background:var(--sur2);border:1px solid var(--bdr);margin-bottom:7px;">'
      +'<div style="display:flex;align-items:center;gap:8px;">'
        +'<span style="font-family:monospace;font-size:9px;padding:2px 7px;border-radius:4px;background:'+col+'22;color:'+col+';border:1px solid '+col+'44;text-transform:uppercase;">'+type+'</span>'
        +'<span style="font-size:13px;color:var(--txt);">'+label+'</span>'
      +'</div>'
      +'<button onclick="settingsRemoveSource('+i+')" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(196,58,58,.3);background:rgba(196,58,58,.08);color:var(--red);font-family:monospace;font-size:10px;cursor:pointer;">Remove</button>'
      +'</div>';
  }).join('');
}
function renderSettingsSources(){renderSetSources();}

function saveChecklistPref(){
  const el=document.getElementById('set-ck-enabled');
  if(!el)return;
  if(!D.settings)D.settings={};
  D.settings.checklistEnabled=el.checked;
  _ckToggleUI(el.checked);
  save();
}
function _ckToggleUI(on){
  const track=document.getElementById('set-ck-track');
  const thumb=document.getElementById('set-ck-thumb');
  if(track)track.style.background=on?'var(--grn)':'var(--bdr)';
  if(thumb)thumb.style.transform=on?'translateX(20px)':'translateX(0)';
}
function initChecklistToggle(){
  const enabled=!(D.settings&&D.settings.checklistEnabled===false);
  const el=document.getElementById('set-ck-enabled');
  if(el)el.checked=enabled;
  _ckToggleUI(enabled);
}
function settingsAddSource(){
  const labelEl=document.getElementById('set-src-new-label');
  const typeEl=document.getElementById('set-src-new-type');
  const statusEl=document.getElementById('set-src-status');
  if(!labelEl)return;
  const label=labelEl.value.trim();
  if(!label){labelEl.style.borderColor='var(--red)';labelEl.focus();return;}
  if(!D.settings)D.settings={};
  if(!D.settings.sources)D.settings.sources=[];
  // Check for duplicate
  const exists=D.settings.sources.some(function(s){return(typeof s==='object'?s.label:s)===label;});
  if(exists){labelEl.style.borderColor='var(--gld)';if(statusEl)statusEl.textContent='Source already exists.';return;}
  D.settings.sources.push({label:label,type:typeEl?typeEl.value:'tip'});
  save();
  labelEl.value='';labelEl.style.borderColor='';
  if(statusEl){statusEl.textContent='✓ Added';setTimeout(function(){statusEl.textContent='';},2000);}
  renderSetSources();
}
function settingsRemoveSource(i){
  if(!D.settings||!D.settings.sources)return;
  D.settings.sources.splice(i,1);
  save();
  renderSetSources();
}

function renderSources(){
  if(!D.settings)D.settings={};if(!D.settings.sources)D.settings.sources=[];
  const el=document.getElementById('sources-list');
  if(!el)return;
  if(!D.settings.sources.length){
    el.innerHTML='<div style="font-family:monospace;font-size:11px;color:var(--mut);padding:8px 0;">No sources added yet.</div>';
    return;
  }
  el.innerHTML=D.settings.sources.map(function(s,i){
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:9px;background:var(--sur2);border:1px solid var(--bdr);margin-bottom:7px;">'
      +'<span style="font-size:13px;color:var(--txt);">💬 '+s+'</span>'
      +'<button onclick="removeSource('+i+')" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(196,58,58,.3);background:rgba(196,58,58,.08);color:var(--red);font-family:monospace;font-size:10px;cursor:pointer;">Remove</button>'
      +'</div>';
  }).join('');
}
function addSource(){
  const inp=document.getElementById('source-input');
  if(!inp)return;
  const val=inp.value.trim();
  if(!val){inp.style.borderColor='var(--red)';inp.focus();return;}
  if(!D.settings)D.settings={};if(!D.settings.sources)D.settings.sources=[];
  if(D.settings.sources.includes(val)){inp.style.borderColor='var(--gld)';return;}
  D.settings.sources.push(val);
  save();
  inp.value='';inp.style.borderColor='';
  renderSources();
}
function removeSource(i){
  if(!D.settings||!D.settings.sources)return;
  D.settings.sources.splice(i,1);
  save();
  renderSources();
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
function getSourceOptions(){
  const saved=(D.settings&&D.settings.sources&&D.settings.sources.length)?D.settings.sources:[];
  const labels=saved.map(function(s){return typeof s==='object'?s.label:s;});
  const all=['Own Form Study'].concat(labels.filter(function(s){return s!=='Own Form Study';}));
  return all.map(function(s){return'<option value="'+s+'">'+s+'</option>';}).join('');
}
function populateSourceDropdowns(){
  ['lbsrc','vbsrc','em-source','lbo-f-source'].forEach(function(id){
    const el=document.getElementById(id);
    if(el)el.innerHTML=getSourceOptions();
  });
}
function renderLogBetCard(){
  // Populate source dropdown from D.sources
  populateSourceDropdowns();
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
// _pendingCkScore / _pendingCkAnswers: set by the bet flow before opening the log form, consumed once by saveLB
let _pendingCkScore=0;
let _pendingCkAnswers={};


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
  const horse=document.getElementById('lbh').value.trim(),track=document.getElementById('lbt').value.trim(),or=document.getElementById('lbo').value.trim(),stake=parseFloat(document.getElementById('lbs').value),od=fo(or);
  if(!horse){alert('Enter a horse name.');return;}if(!stake||stake<=0){alert('Enter a valid stake.');return;}
  const result=document.getElementById('lbres').value,bt=document.getElementById('lbtype').value;
  const autoRet=calcReturns(result,stake,od,bt,'');
  const returns=parseFloat(document.getElementById('lbret').value)||autoRet;
  const bet={id:gid(),date:td(),horse,track,time:document.getElementById('lbtime').value.trim(),jockey:(document.getElementById('lbjockey')||{value:''}).value.trim(),trainer:(document.getElementById('lbtrainer')||{value:''}).value.trim(),odds:od,oddsDisplay:or,stake,betType:bt,conf:parseInt(document.getElementById('lbconf').value),source:document.getElementById('lbsrc').value,notes:document.getElementById('lbnotes').value.trim(),checklistScore:_pendingCkScore||0,checklistAnswers:Object.assign({},_pendingCkAnswers),result,returns,betBanked:false,createdAt:Date.now()};
  _pendingCkScore=0;_pendingCkAnswers={};
  applyBankDelta(bet,null,0);
  D.bets.push(bet);save();updHdr();refreshRacecardHighlights();
  ['lbh','lbtime','lbo','lbs','lbnotes','lbret','lbjockey','lbtrainer'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';})
  document.getElementById('lbres').value='pending';document.getElementById('lbconf').value='3';
  const tt=getTracks();if(tt.length===1)document.getElementById('lbt').value=tt[0];
  const overlay=document.getElementById('logbet-overlay');
  if(overlay&&overlay.style.display!=='none'){closeLogbetOverlay();}
  else{document.getElementById('lbok').textContent=`✓ ${horse} @ ${dOdds(or)}${result!=='pending'?' — '+result+' ('+fp(returns)+')':''}`;flash('lbok');renderToday();renderBetLimit();}
}

// ─── LOG BET CMD ───

// ─── BANK ───
function renderBkCard(){
  // Load point value field if present on this card
  const pvEl=document.getElementById('set-pv');if(pvEl&&!pvEl.value)pvEl.value=getPointValue();
  renderPVPreview();const s=D.bank.start||0,c=D.bank.current||0,diff=c-s,pct=s>0?(c/s*100):100;const el=document.getElementById('bkdisp');if(!el)return;el.innerHTML=`<div style="margin-bottom:5px;"><div class="sbig" style="color:var(--blu);">${fp(c)}</div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em;margin-top:2px;">Current Bank</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin:9px 0 5px;"><span style="font-size:13px;color:var(--mut);">vs starting ${fp(s)}</span><span style="font-family:monospace;font-size:13px;color:${diff>=0?'var(--grn)':'var(--red)'};">${fmt(diff)}</span></div><div class="prog"><div class="progf ${diff<0?'lp':''}" style="width:${Math.min(100,Math.max(2,pct)).toFixed(1)}%;transition:width .5s;"></div></div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-align:right;margin-top:3px;">${pct.toFixed(1)}% of starting bank</div>`;const bkcuEl=document.getElementById('bkcu');if(bkcuEl)bkcuEl.value=c||'';}
function renderVBKDisp(){
  const vb=D.vBank||{start:500,current:500};
  const el=document.getElementById('vbkdisp');if(!el)return;
  const c=vb.current||0,s=vb.start||0,diff=c-s,pct=s>0?(c/s*100):100;
  el.innerHTML=`<div style="margin-bottom:5px;"><div class="sbig" style="color:var(--ora);">${fp(c)}</div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em;margin-top:2px;">Current Virtual Bank</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin:9px 0 5px;"><span style="font-size:13px;color:var(--mut);">vs starting ${fp(s)}</span><span style="font-family:monospace;font-size:13px;color:${diff>=0?'var(--ora)':'var(--red)'};">${fmt(diff)}</span></div><div class="prog"><div class="progf" style="width:${Math.min(100,Math.max(2,pct)).toFixed(1)}%;background:var(--ora);transition:width .5s;"></div></div><div style="font-family:monospace;font-size:9px;color:var(--mut);text-align:right;margin-top:3px;">${pct.toFixed(1)}% of starting bank</div>`;
  const sc=document.getElementById('set-vbk-cur');if(sc)sc.value=c||'';
  const ss=document.getElementById('set-vbk-start');if(ss)ss.value=s||'';
}

function saveBank(){if(!D.bank||typeof D.bank!=='object')D.bank={start:0,current:0};const c=parseFloat(document.getElementById('bkcu').value)||0;D.bank.current=c;save();updHdr();renderBkCard();calcStk();renderRealBankMini();const btn=document.getElementById('bk-save-btn');if(btn){const o=btn.textContent;btn.textContent='✓ Saved';btn.style.background='var(--grn)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},3000);}}
function calcStk(){const m=document.getElementById('bkm').value,bank=D.bank.current||0;const kw=document.getElementById('kelwin'),lbl=document.getElementById('bkil'),re=document.getElementById('stkres'),oe=document.getElementById('stkout'),ne=document.getElementById('stknote');kw.style.display=m==='kelly'?'block':'none';let stake=0,note='';if(m==='level'){lbl.textContent='Stake (£)';stake=parseFloat(document.getElementById('bkin').value)||0;note='Fixed amount per bet.';}else if(m==='pct'){lbl.textContent='% of Bank';const p=parseFloat(document.getElementById('bkin').value)||0;stake=bank*(p/100);note=`${p}% of ${fp(bank)}`;}else if(m==='kelly'){const p=(parseFloat(document.getElementById('kp').value)||0)/100,b=(parseFloat(document.getElementById('ko').value)||0)-1,fr=parseFloat(document.getElementById('kf').value)||.5;if(p>0&&b>0){const k=(p*b-(1-p))/b;stake=k>0?bank*k*fr:0;note=k<=0?'No edge — do not bet.':`Full Kelly: ${(k*100).toFixed(2)}% → ${(fr*100).toFixed(0)}% applied`;}}if(stake>0){re.style.display='block';oe.textContent='£'+stake.toFixed(2);ne.textContent=note;}else re.style.display='none';}



function recalcBanks(){
  if(!confirm('Recalculate both banks from your full bet history?\nThis will overwrite any manually entered balance.'))return;

  // ── Real bank ──
  D.bank=D.bank||{start:0,current:0};
  D.bank.current=D.bank.start||0;
  // Clear betBanked flags so applyBankDelta replays cleanly from scratch
  (D.bets||[]).forEach(function(b){ b.betBanked=false; });
  // Process all bets: applyBankDelta now handles both pending (deduct stake) and settled (P&L)
  (D.bets||[]).forEach(function(b){
    applyBankDelta(b,null,0);
  });

  // ── Virtual bank ──
  const vb=getVBank();
  vb.current=vb.start||500;
  (vb.bets||[]).forEach(function(b){
    const isPending=!b.result||b.result==='pending';
    const outlay=(parseFloat(b.stake)||0)*(b.betType==='ew'?2:1);
    if(isPending){
      // Pending: deduct stake
      vb.current=parseFloat((vb.current-outlay).toFixed(2));
    } else if(b.result!=='nr'&&b.result!=='void'){
      // Settled: apply full P&L
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

// ─── BET FLOW: source picker → checklist → log bet ───
let _betFlowState={};
let _flowCks=[];
let _flowCkAnswers={};
let _flowActiveCKS=[];

function openBetFlow(mode,horse,course,time,jockey,trainer,raceName){
  _betFlowState={mode:mode||'real',horse,course,time,jockey,trainer,raceName,source:'own',tipSource:''};
  const existing=document.getElementById('_bflow-ov');
  if(existing)existing.remove();
  const ov=document.createElement('div');
  ov.id='_bflow-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.7);display:flex;flex-direction:column;justify-content:flex-end;opacity:0;transition:opacity .2s;';
  ov.innerHTML=
    `<div id="_bflow-sheet" style="background:var(--sur);border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);max-height:92vh;display:flex;flex-direction:column;transform:translateY(50px);transition:transform .28s cubic-bezier(.2,.8,.4,1),opacity .28s;opacity:0;">`
      // Drag handle
      +`<div style="display:flex;justify-content:center;padding:10px 0 0;flex-shrink:0;"><div style="width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.12);"></div></div>`
      // Horse context strip — always visible across all steps
      +`<div style="padding:14px 18px 12px;border-bottom:1px solid var(--bdr);flex-shrink:0;">`
        +`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">`
          +`<div style="min-width:0;">`
            +`<div style="font-family:var(--font-display);font-size:20px;font-weight:400;letter-spacing:.03em;text-transform:uppercase;color:var(--txt);line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${horse}</div>`
            +`<div style="font-size:11px;color:var(--mut);margin-top:3px;display:flex;gap:6px;flex-wrap:wrap;">`
              +`<span>${time}</span><span style="opacity:.4;">·</span><span>${course}</span>`
              +(raceName?`<span style="opacity:.4;">·</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px;">${raceName}</span>`:'')
            +`</div>`
          +`</div>`
          +`<button onclick="_betFlowClose()" style="flex-shrink:0;width:28px;height:28px;border-radius:50%;border:1px solid var(--bdr);background:rgba(255,255,255,.06);color:var(--mut);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>`
        +`</div>`
      +`</div>`
      +`<div id="_bflow-content" style="overflow-y:auto;flex:1;">${_betFlowSourceHtml()}</div>`
    +`</div>`;
  ov.addEventListener('click',function(e){if(e.target===ov)_betFlowClose();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){
    ov.style.opacity='1';
    const sh=document.getElementById('_bflow-sheet');
    if(sh){sh.style.transform='translateY(0)';sh.style.opacity='1';}
  });
}

function _betFlowSourceHtml(){
  const BF_LBL='font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:14px;';
  return `<div style="padding:20px 18px 8px;">`
    +`<div style="${BF_LBL}">How did you find this selection?</div>`
    +`<button onclick="_betFlowSelectSource('own')" style="width:100%;text-align:left;padding:16px;border-radius:14px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);cursor:pointer;margin-bottom:10px;display:flex;align-items:center;gap:14px;box-sizing:border-box;transition:border-color .15s,background .15s;" onmouseenter="this.style.borderColor='#60a5fa'" onmouseleave="this.style.borderColor='var(--bdr)'">`
      +`<div style="width:40px;height:40px;border-radius:10px;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🔍</div>`
      +`<div style="min-width:0;">`
        +`<div style="font-family:var(--font);font-size:16px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);">My Own Selection</div>`
        +`<div style="font-size:12px;color:var(--mut);margin-top:2px;">I researched this myself</div>`
      +`</div>`
      +`<div style="margin-left:auto;color:var(--mut);font-size:18px;flex-shrink:0;">›</div>`
    +`</button>`
    +`<button onclick="_betFlowSelectSource('tip')" style="width:100%;text-align:left;padding:16px;border-radius:14px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);cursor:pointer;display:flex;align-items:center;gap:14px;box-sizing:border-box;transition:border-color .15s;" onmouseenter="this.style.borderColor='#e879f9'" onmouseleave="this.style.borderColor='var(--bdr)'">`
      +`<div style="width:40px;height:40px;border-radius:10px;background:rgba(232,121,249,.1);border:1px solid rgba(232,121,249,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">💬</div>`
      +`<div style="min-width:0;">`
        +`<div style="font-family:var(--font);font-size:16px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);">Tip / Source</div>`
        +`<div style="font-size:12px;color:var(--mut);margin-top:2px;">Someone else's selection</div>`
      +`</div>`
      +`<div style="margin-left:auto;color:var(--mut);font-size:18px;flex-shrink:0;">›</div>`
    +`</button>`
  +`</div>`;
}

function _ckEnabled(){return!(D.settings&&D.settings.checklistEnabled===false);}

function _betFlowShowModeSelect(){
  const content=document.getElementById('_bflow-content');
  if(!content)return;
  const BF_LBL='font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:16px;';
  content.innerHTML=`<div style="padding:24px 18px 24px;">`
    +`<div style="${BF_LBL}">Log as real or virtual?</div>`
    +`<div style="display:flex;flex-direction:column;gap:10px;">`
      +`<button onclick="_betFlowSkipProceed('real')" style="width:100%;text-align:left;padding:16px;border-radius:14px;border:1px solid rgba(96,165,250,.3);background:rgba(96,165,250,.08);color:var(--txt);cursor:pointer;display:flex;align-items:center;gap:14px;box-sizing:border-box;">`
        +`<div style="width:40px;height:40px;border-radius:10px;background:rgba(96,165,250,.15);border:1px solid rgba(96,165,250,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">`
          +`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
        +`</div>`
        +`<div><div style="font-family:var(--font);font-size:16px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#60a5fa;">Real Bet</div><div style="font-size:12px;color:var(--mut);margin-top:2px;">Count against my real bank</div></div>`
      +`</button>`
      +`<button onclick="_betFlowSkipProceed('virt')" style="width:100%;text-align:left;padding:16px;border-radius:14px;border:1px solid rgba(251,146,60,.3);background:rgba(251,146,60,.08);color:var(--txt);cursor:pointer;display:flex;align-items:center;gap:14px;box-sizing:border-box;">`
        +`<div style="width:40px;height:40px;border-radius:10px;background:rgba(251,146,60,.15);border:1px solid rgba(251,146,60,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">`
          +`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
        +`</div>`
        +`<div><div style="font-family:var(--font);font-size:16px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#fb923c;">Virtual Bet</div><div style="font-size:12px;color:var(--mut);margin-top:2px;">Paper trade against virtual bank</div></div>`
      +`</button>`
    +`</div>`
  +`</div>`;
}

function _betFlowSkipProceed(chosenMode){
  _pendingCkScore=0;_pendingCkAnswers={};
  _betFlowState.mode=chosenMode;
  const s=Object.assign({},_betFlowState,{mode:chosenMode});
  _betFlowClose(function(){_rcDoLogBet(s);});
}

function _betFlowSelectSource(source){
  _betFlowState.source=source;
  const content=document.getElementById('_bflow-content');
  if(!content)return;
  if(source==='own'){
    if(!_ckEnabled()){_betFlowShowModeSelect();return;}
    _flowActiveCKS=CKS_OWN;
    _betFlowShowChecklist();
  } else {
    // Show saved sources list + option to type a new one
    const sources=(D.settings&&D.settings.sources&&D.settings.sources.length)?D.settings.sources:[];
    const BF_LBL2='font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:12px;';
    let html='<div style="padding:20px 18px 8px;">'
      +'<div style="'+BF_LBL2+'">Who is the tip from?</div>';
    sources.forEach(function(src,si){
      const label=typeof src==='object'?src.label:src;
      html+='<button data-tip-idx="'+si+'" style="width:100%;text-align:left;padding:13px 16px;border-radius:12px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);cursor:pointer;margin-bottom:8px;box-sizing:border-box;display:flex;align-items:center;gap:12px;transition:border-color .12s;">'
        +'<span style="font-size:16px;">💬</span>'
        +'<span style="font-family:var(--font);font-size:15px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;">'+label+'</span>'
        +'<span style="margin-left:auto;color:var(--mut);font-size:16px;">›</span>'
        +'</button>';
    });
    html+='<div style="'+BF_LBL2+'margin-top:16px;">Or type a new source</div>'
      +'<input id="_bflow-tip-src" type="text" placeholder="e.g. Racing Post, Tipster…" autocomplete="off"'
      +' style="width:100%;box-sizing:border-box;background:var(--sur2);border:1px solid var(--bdr);border-radius:12px;padding:13px 14px;font-size:15px;color:var(--txt);outline:none;margin-bottom:10px;font-family:var(--font);font-weight:600;">'
      +'<button id="_bflow-tip-go" style="width:100%;padding:14px;border-radius:12px;border:none;background:#e879f9;color:#141414;font-family:var(--font);font-size:13px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;margin-bottom:8px;">Continue →</button>'
      +'<button id="_bflow-tip-cancel" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:var(--font);font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;">Cancel</button>'
      +'</div>';
    content.innerHTML=html;
    // Wire up listeners after render (no inline onclick = no quote issues)
    content.querySelectorAll('[data-tip-idx]').forEach(function(btn,si){
      const label=typeof sources[si]==='object'?sources[si].label:sources[si];
      btn.addEventListener('click',function(){_betFlowConfirmTipName(label);});
    });
    const goBtn=document.getElementById('_bflow-tip-go');
    if(goBtn)goBtn.addEventListener('click',_betFlowConfirmTip);
    const cancelBtn=document.getElementById('_bflow-tip-cancel');
    if(cancelBtn)cancelBtn.addEventListener('click',_betFlowClose);
  }
}

function _betFlowConfirmTip(){
  const inp=document.getElementById('_bflow-tip-src');
  const val=(inp?inp.value.trim():'');
  if(!val){if(inp){inp.style.borderColor='var(--red)';inp.focus();}return;}
  _betFlowConfirmTipName(val);
}
function _betFlowConfirmTipName(name){
  _betFlowState.tipSource=name;
  if(!_ckEnabled()){_betFlowShowModeSelect();return;}
  _flowActiveCKS=CKS_TIP;
  _betFlowShowChecklist();
}

function _betFlowIsHandicap(){
  const name=((_betFlowState&&_betFlowState.raceName)||'').toLowerCase();
  return /handicap|hcap|hcp|\(h\)/.test(name);
}

function _betFlowShowChecklist(){
  _flowCks=new Array(_flowActiveCKS.length).fill(false);
  _flowCkAnswers={};
  // Mark handicap ratings question as excluded (null) if not a handicap race — excluded from score total
  const isHandicap=_betFlowIsHandicap();
  _flowActiveCKS.forEach(function(c,i){
    if(c.autoSkipIfNotHandicap&&!isHandicap){
      _flowCks[i]=null; // null = excluded from score, not answered
      _flowCkAnswers[c.id]='N/A — not a handicap';
    }
  });
  const s=_betFlowState;
  const isOwn=s.source==='own';
  const accentCol=isOwn?'#60a5fa':'#e879f9';
  const content=document.getElementById('_bflow-content');
  if(!content)return;
  content.style.padding='0';
  content.innerHTML=
    // Checklist header
    `<div style="padding:14px 18px 0;flex-shrink:0;">`
      +`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">`
        +`<div>`
          +`<div style="font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${accentCol};margin-bottom:2px;">${isOwn?'MY SELECTION':'TIP · '+s.tipSource.toUpperCase()}</div>`
          +`<div id="_bflow-score-lbl" style="font-family:var(--font);font-size:13px;font-weight:700;color:var(--mut);">0 of ${_flowActiveCKS.length} checks</div>`
        +`</div>`
        +`<button onclick="_betFlowShowInfo()" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;">ℹ How scored</button>`
      +`</div>`
      +`<div style="height:5px;border-radius:3px;background:var(--bdr);overflow:hidden;margin-bottom:14px;">`
        +`<div id="_bflow-bar" style="height:100%;border-radius:3px;background:${accentCol};width:0%;transition:width .3s cubic-bezier(.4,0,.2,1);"></div>`
      +`</div>`
    +`</div>`
    +`<div style="padding:0 18px;overflow-y:auto;">`
      +_flowActiveCKS.map(function(c,i){
        if(c.autoSkipIfNotHandicap&&!_betFlowIsHandicap()){
          return'<div style="padding:10px 12px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;opacity:.55;">'
            +'<span style="font-size:12px;color:var(--mut);">Handicap ratings</span>'
            +'<span style="font-family:monospace;font-size:10px;color:var(--mut);background:var(--sur);border:1px solid var(--bdr);padding:2px 8px;border-radius:5px;">N/A — auto</span>'
          +'</div>';
        }
        return _betFlowItemHtml(c,i);
      }).join('')
      +`<div style="height:8px;"></div>`
    +`</div>`
    // Sticky bottom action bar
    +`<div style="position:sticky;bottom:0;background:var(--sur);border-top:1px solid var(--bdr);padding:12px 18px env(safe-area-inset-bottom,16px);flex-shrink:0;">`
      +`<div id="_bflow-rec" style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--mut);margin-bottom:10px;min-height:18px;letter-spacing:.03em;"></div>`
      +`<div style="display:flex;gap:8px;">`
        +`<button id="_bflow-btn-real" onclick="_betFlowProceed('real')" style="flex:1;padding:15px 10px;border-radius:12px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:var(--font);font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;">Real Bet</button>`
        +`<button id="_bflow-btn-virt" onclick="_betFlowProceed('virt')" style="flex:1;padding:15px 10px;border-radius:12px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:var(--font);font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;">Virtual</button>`
      +`</div>`
    +`</div>`;
}

function _betFlowItemHtml(c,i){
  const type=c.type||'checkbox';
  const base='display:flex;flex-direction:column;gap:9px;padding:14px;border-radius:12px;border:1px solid var(--bdr);background:var(--sur2);margin-bottom:9px;transition:border-color .15s,background .15s;';
  const QT=`font-size:14px;font-weight:600;line-height:1.4;color:var(--txt);`;
  const QS=`font-size:11px;color:var(--mut);line-height:1.4;margin-top:-2px;`;
  const YNBTN=`flex:1;padding:10px 8px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur);color:var(--mut);font-family:var(--font);font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .15s;`;
  const MOBTN=`flex:1;padding:9px 6px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur);color:var(--mut);font-family:var(--font);font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:all .15s;text-align:center;`;

  if(type==='yes-no'){
    return `<div id="_bflow-item-${i}" style="${base}">`
      +`<div style="${QT}">${c.t}</div>`
      +`<div style="${QS}">${c.s}</div>`
      +`<div style="display:flex;gap:8px;">`
        +`<button id="_bflow-yn-yes-${i}" onclick="_betFlowYesNo(${i},'yes')" style="${YNBTN}">Yes</button>`
        +`<button id="_bflow-yn-no-${i}" onclick="_betFlowYesNo(${i},'no')" style="${YNBTN}">No</button>`
      +`</div>`
    +`</div>`;
  }
  if(type==='multi'){
    const opts=(c.options||[]).map((o,oi)=>`<button id="_bflow-mo-${i}-${oi}" onclick="_betFlowMulti(${i},${oi},${o.score})" style="${MOBTN}">${o.label}</button>`).join('');
    return `<div id="_bflow-item-${i}" style="${base}">`
      +`<div style="${QT}">${c.t}</div>`
      +`<div style="${QS}">${c.s}</div>`
      +`<div style="display:flex;gap:6px;flex-wrap:wrap;">${opts}</div>`
    +`</div>`;
  }
  if(type==='scale'){
    return `<div id="_bflow-item-${i}" style="${base}">`
      +`<div style="${QT}">${c.t}</div>`
      +`<div style="display:flex;align-items:center;justify-content:space-between;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:2px;"><span>${c.scaleMin||'Low'}</span><span>${c.scaleMax||'High'}</span></div>`
      +`<input id="_bflow-scale-${i}" type="range" min="0" max="100" value="0" oninput="_betFlowScale(${i},this.value)" style="width:100%;accent-color:#60a5fa;">`
      +`<div id="_bflow-scale-lbl-${i}" style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--mut);text-align:center;">Not set</div>`
    +`</div>`;
  }
  if(type==='auto'){
    setTimeout(function(){_betFlowAutoCapture(i,c);},50);
    return `<div id="_bflow-item-${i}" style="${base}opacity:.75;">`
      +`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">`
        +`<div style="${QT};flex:1;">${c.t}</div>`
        +`<div id="_bflow-auto-lbl-${i}" style="font-family:var(--font);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);white-space:nowrap;">Detecting…</div>`
      +`</div>`
      +`<div style="${QS}">${c.s}</div>`
    +`</div>`;
  }
  // Default: checkbox
  return `<div id="_bflow-item-${i}" onclick="_betFlowTick(${i})" style="${base}cursor:pointer;">`
    +`<div style="display:flex;align-items:flex-start;gap:12px;">`
      +`<div id="_bflow-chk-${i}" style="width:22px;height:22px;flex-shrink:0;border-radius:7px;border:2px solid var(--bdr);display:flex;align-items:center;justify-content:center;margin-top:1px;transition:all .15s;font-size:13px;color:transparent;"></div>`
      +`<div><div style="${QT}">${c.t}</div>`
      +`<div style="${QS}">${c.s}</div></div>`
    +`</div>`
  +`</div>`;
}
function _betFlowYesNo(i,ans){
  const c=_flowActiveCKS[i];
  const yes=document.getElementById('_bflow-yn-yes-'+i);
  const no=document.getElementById('_bflow-yn-no-'+i);
  const isGood=ans===c.goodAnswer;
  if(yes){yes.style.background=ans==='yes'?(isGood&&ans==='yes'?'var(--grn)':'var(--red)'):'var(--sur)';yes.style.color=ans==='yes'?'#141414':'var(--mut)';}
  if(no){no.style.background=ans==='no'?(isGood||ans!=='no'?'var(--sur)':'var(--red)'):'var(--sur)';no.style.color=ans==='no'?'#141414':'var(--mut)';}
  // yes=good → green, no=good(odd case) → handle
  if(yes)yes.style.background=ans==='yes'?(c.goodAnswer==='yes'?'var(--grn)':'rgba(196,58,58,.3)'):'var(--sur)';
  if(no)no.style.background=ans==='no'?(c.goodAnswer==='no'?'var(--grn)':'rgba(196,58,58,.3)'):'var(--sur)';
  if(yes)yes.style.color=ans==='yes'?'#141414':'var(--mut)';
  if(no)no.style.color=ans==='no'?'#141414':'var(--mut)';
  _flowCks[i]=(isGood?1:0.1); // partial score for wrong answer
  _flowCkAnswers[c.id||i]=ans;
  _betFlowUpdateScore();
}
function _betFlowMulti(i,oi,score){
  const c=_flowActiveCKS[i];
  (c.options||[]).forEach(function(_,j){
    const btn=document.getElementById('_bflow-mo-'+i+'-'+j);
    if(btn){btn.style.background='var(--sur)';btn.style.color='var(--mut)';btn.style.borderColor='var(--bdr)';}
  });
  const sel=document.getElementById('_bflow-mo-'+i+'-'+oi);
  const col=score>=75?'var(--grn)':score>=50?'var(--gld)':'rgba(196,58,58,.3)';
  if(sel){sel.style.background=col;sel.style.color='#141414';sel.style.borderColor=col;}
  _flowCks[i]=score/100;
  _flowCkAnswers[c.id||i]=(c.options[oi]||{}).label||oi;
  _betFlowUpdateScore();
}
function _betFlowScale(i,val){
  const v=parseInt(val);
  const lbl=document.getElementById('_bflow-scale-lbl-'+i);
  const col=v>=66?'var(--grn)':v>=33?'var(--gld)':'var(--mut)';
  if(lbl){lbl.textContent=v+'%';lbl.style.color=col;}
  _flowCks[i]=v/100;
  const c=_flowActiveCKS[i];
  _flowCkAnswers[c.id||i]=v;
  _betFlowUpdateScore();
}
function _betFlowAutoCapture(i,c){
  if(c.autoCapture==='time-before-race'){
    const now=new Date();
    const nowMins=now.getHours()*60+now.getMinutes();
    // Parse race time from bet flow state
    const raceTimeStr=(_betFlowState&&_betFlowState.time)||'';
    let minsUntilRace=null;
    if(raceTimeStr){
      const m=raceTimeStr.match(/(\d{1,2}):(\d{2})/);
      if(m){
        let rh=parseInt(m[1]),rm=parseInt(m[2]);
        const raceMins=rh*60+rm;
        minsUntilRace=raceMins-nowMins;
      }
    }
    let band;
    if(minsUntilRace===null){
      // No race time available — fall back to time of day
      band={label:'Unknown',score:50};
    } else {
      // Bands are defined highest-first (120, 60, 20, 0).
      // Find the highest threshold the user still meets — i.e. the first band
      // where minsUntilRace >= minsMin, scanning from highest to lowest.
      const bands=(c.bands||[]).slice().sort(function(a,b){return b.minsMin-a.minsMin;});
      band=bands.find(function(b){return minsUntilRace>=b.minsMin;})||{label:'After start',score:10};
    }
    const lbl=document.getElementById('_bflow-auto-lbl-'+i);
    if(lbl){lbl.textContent=band.label;lbl.style.color=band.score>=75?'var(--grn)':band.score>=50?'var(--gld)':'var(--red)';}
    _flowCks[i]=band.score/100;
    _flowCkAnswers[c.id||i]=band.label;
    _betFlowUpdateScore();
  }
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
  const done=_flowCks.reduce(function(a,v){return a+(v!==null&&v!==false&&v!==0?1:0);},0);
  const total=_flowCks.filter(function(v){return v!==null;}).length;
  const pct=total>0?done/total*100:0;
  const isOwn=_betFlowState.source==='own';
  const accentCol=isOwn?'#60a5fa':'#e879f9';
  const mode=_betFlowState.mode;
  const lbl=document.getElementById('_bflow-score-lbl');
  if(lbl)lbl.textContent=done+' of '+total+' checks'+(done===total?' ✓':'');
  const bar=document.getElementById('_bflow-bar');
  if(bar){bar.style.width=pct+'%';bar.style.background=done===total?'var(--grn)':pct>=66?'var(--gld)':accentCol;}
  const btnReal=document.getElementById('_bflow-btn-real');
  const btnVirt=document.getElementById('_bflow-btn-virt');
  const rec=document.getElementById('_bflow-rec');
  if(done===0){
    if(btnReal){btnReal.style.background='var(--sur2)';btnReal.style.color='var(--mut)';btnReal.style.borderColor='var(--bdr)';btnReal.style.opacity='.5';}
    if(btnVirt){btnVirt.style.background='var(--sur2)';btnVirt.style.color='var(--mut)';btnVirt.style.borderColor='var(--bdr)';btnVirt.style.opacity='.5';}
    if(rec)rec.textContent='Complete the checklist to unlock betting';
    return;
  }
  if(btnReal)btnReal.style.opacity='1';
  if(btnVirt)btnVirt.style.opacity='1';
  let recTxt='',recCol='';
  if(done===total){
    recTxt='✅ All checks passed — Real bet recommended';recCol='var(--grn)';
    if(btnReal){btnReal.style.background='var(--grn)';btnReal.style.color='#141414';btnReal.style.borderColor='var(--grn)';}
    if(btnVirt){btnVirt.style.background='var(--sur2)';btnVirt.style.color='var(--mut)';btnVirt.style.borderColor='var(--bdr)';}
  } else if(pct>=66){
    recTxt='⚠️ Most checks done — Virtual recommended';recCol='var(--gld)';
    if(btnReal){btnReal.style.background='var(--sur2)';btnReal.style.color='var(--mut)';btnReal.style.borderColor='var(--bdr)';}
    if(btnVirt){btnVirt.style.background='rgba(232,228,220,.12)';btnVirt.style.color='var(--gld)';btnVirt.style.borderColor='var(--gld)';}
  } else {
    recTxt='🔴 Low score — Virtual only recommended';recCol='var(--red)';
    if(btnReal){btnReal.style.background='var(--sur2)';btnReal.style.color='var(--mut)';btnReal.style.borderColor='var(--bdr)';}
    if(btnVirt){btnVirt.style.background='rgba(251,146,60,.1)';btnVirt.style.color='#fb923c';btnVirt.style.borderColor='#fb923c';}
  }
  if(rec){rec.style.color=recCol;rec.textContent=recTxt;}
}

function _betFlowProceed(chosenMode){
  const done=_flowCks.filter(function(v){return v!==null&&v!==false&&v!==0;}).length;
  if(done===0){alert('Work through the checklist first — tick at least what you have considered.');return;}
  // Calculate weighted score (0–100) from flow answers and store for saveLB to consume
  const activeCks=_flowCks.filter(function(v){return v!==null;});
  const total=activeCks.length;
  const rawScore=total>0?(activeCks.reduce(function(a,v){return a+(typeof v==='number'?v:(v?1:0));},0)/total*100):0;
  _pendingCkScore=Math.round(rawScore);
  _pendingCkAnswers=Object.assign({},_flowCkAnswers);
  _betFlowState.mode=chosenMode; // persist the confirmed choice back onto state
  const s=Object.assign({},_betFlowState,{mode:chosenMode});
  _betFlowClose(function(){_rcDoLogBet(s);});
}

function _betFlowShowInfo(){
  const rows=[
    {q:'Research time',type:'Multi-choice',detail:'Quick glance = 0 pts · 10–15 mins = 33 pts · 30+ mins = 66 pts · Deep study = 100 pts.'},
    {q:'Form & distance',type:'Yes / No',detail:'Yes = full 100 points. No = 10 points (penalised but not zero — you still answered honestly).'},
    {q:'Video replay',type:'Yes / No',detail:'Yes = 100 pts. No = 10 pts. Watching replays is one of the strongest process indicators.'},
    {q:'Handicap ratings',type:'Multi-choice',detail:'Only shown for handicap races (auto-detected from race name). Yes = 100 pts · No = 0 pts. Non-handicap races skip this question entirely — it is excluded from the score so it does not skew the result.'},
    {q:'Price assessment',type:'Multi-choice',detail:'Value = 100 pts · Fair = 75 pts · Marginal = 25 pts · Forced = 0 pts.'},
    {q:'Why did you reach for the device?',type:'Multi-choice',detail:'Planned = 100 pts · Spotted it = 75 pts · Tipster = 50 pts · Impulse = 0 pts.'},
    {q:'How far in advance?',type:'Auto-captured',detail:'Measured automatically from the current time vs the race start time. 2h+ before = 100 pts · 1–2h before = 75 pts · 20–60 mins = 50 pts · Under 20 mins = 25 pts. Rewards early research, penalises last-minute decisions.'},
  ];
  const html='<div style="padding:18px;overflow-y:auto;max-height:70dvh;">'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:14px;">How the score is calculated</div>'
    +'<div style="font-size:12px;color:var(--mut);margin-bottom:16px;line-height:1.5;">Each question contributes equally to your total score (0–100). The overall score determines whether Real or Virtual is recommended.</div>'
    +rows.map(function(r){return '<div style="padding:10px 0;border-bottom:1px solid var(--bdr);">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
        +'<div style="font-size:13px;font-weight:600;color:var(--txt);">'+r.q+'</div>'
        +'<span style="font-family:monospace;font-size:9px;background:var(--sur2);border:1px solid var(--bdr);padding:2px 7px;border-radius:5px;color:var(--mut);">'+r.type+'</span>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--mut);line-height:1.5;">'+r.detail+'</div>'
    +'</div>';}).join('')
    +'<div style="padding:12px 0;margin-top:4px;">'
      +'<div style="font-size:12px;font-weight:700;color:var(--txt);margin-bottom:6px;">Recommendation thresholds</div>'
      +'<div style="font-size:12px;color:var(--mut);line-height:1.8;">✅ <strong style="color:var(--grn);">100%</strong> — Real recommended<br>⚠️ <strong style="color:var(--gld);">66–99%</strong> — Virtual recommended<br>🔴 <strong style="color:var(--red);">Under 66%</strong> — Virtual only</div>'
    +'</div>'
    +'<button onclick="this.closest(\'[id^=_bflow-info]\').remove()" class="btn bout" style="width:100%;margin-top:4px;">Close</button>'
  +'</div>';
  const sheet=document.createElement('div');
  sheet.id='_bflow-info-sheet';
  sheet.style.cssText='position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;';
  sheet.innerHTML='<div style="background:var(--sur);border-radius:20px 20px 0 0;width:100%;max-width:520px;">'+html+'</div>';
  sheet.addEventListener('click',function(e){if(e.target===sheet)sheet.remove();});
  document.body.appendChild(sheet);
}

function _betFlowClose(cb){
  const ov=document.getElementById('_bflow-ov');
  if(!ov){if(cb)cb();return;}
  const sh=document.getElementById('_bflow-sheet');
  if(sh){sh.style.transform='translateY(40px)';sh.style.opacity='0';}
  ov.style.opacity='0';
  setTimeout(function(){if(ov.parentNode)ov.remove();if(cb)cb();},250);
}

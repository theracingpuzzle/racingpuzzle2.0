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
  ['lbsrc','vbsrc','em-source'].forEach(function(id){
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
    if(done>=9){gb.style.background='var(--grn)';gb.style.color='var(--bg)';gb.style.borderColor='var(--grn)';}
    else if(done>=6){gb.style.background='rgba(232,228,220,.15)';gb.style.color='var(--gld)';gb.style.borderColor='var(--gld)';}
    else if(done>0){gb.style.background='rgba(251,146,60,.1)';gb.style.color='#fb923c';gb.style.borderColor='#fb923c';}
    else{gb.style.background='transparent';gb.style.color='var(--mut)';gb.style.borderColor='var(--bdr)';}
  }
}
// goFromChecklist defined in racecards.js


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

// ─── BET FLOW: source picker → checklist → log bet ───
let _betFlowState={};
let _flowCks=[];
let _flowActiveCKS=[];

function openBetFlow(mode,horse,course,time,jockey,trainer,raceName){
  _betFlowState={mode:mode||'real',horse,course,time,jockey,trainer,raceName,source:'own',tipSource:''};
  const existing=document.getElementById('_bflow-ov');
  if(existing)existing.remove();
  const modeCol=mode==='real'?'#60a5fa':'#fb923c';
  const ov=document.createElement('div');
  ov.id='_bflow-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.75);display:flex;flex-direction:column;justify-content:flex-end;opacity:0;transition:opacity .2s;';
  ov.innerHTML=`<div id="_bflow-sheet" style="background:var(--sur);border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);max-height:90vh;display:flex;flex-direction:column;transform:translateY(40px);transition:transform .25s ease,opacity .25s ease;opacity:0;">`
    +`<div style="display:flex;justify-content:center;padding:12px 0 4px;flex-shrink:0;"><div style="width:36px;height:4px;border-radius:2px;background:var(--bdr);"></div></div>`
    +`<div style="padding:12px 18px 14px;border-bottom:1px solid var(--bdr);flex-shrink:0;">`
      +`<div style="display:flex;align-items:center;gap:10px;">`
        +`<div><div style="font-size:17px;font-weight:700;color:var(--txt);">${horse}</div>`
        +`<div style="font-size:11px;color:var(--mut);font-family:monospace;margin-top:1px;">${time} · ${course}</div></div>`
      +`</div>`
    +`</div>`
    +`<div id="_bflow-content" style="padding:18px;overflow-y:auto;flex:1;">${_betFlowSourceHtml()}</div>`
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
  return `<div style="font-family:monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);margin-bottom:14px;">How did you find this selection?</div>`
    +`<button onclick="_betFlowSelectSource('own')" style="width:100%;text-align:left;padding:14px 16px;border-radius:12px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);cursor:pointer;margin-bottom:10px;display:flex;align-items:center;gap:14px;box-sizing:border-box;">`
      +`<span style="font-size:24px;flex-shrink:0;">🔍</span>`
      +`<div><div style="font-size:15px;font-weight:700;">My Own Selection</div>`
      +`<div style="font-size:12px;color:var(--mut);font-family:monospace;margin-top:2px;">I did the form study</div></div>`
    +`</button>`
    +`<button onclick="_betFlowSelectSource('tip')" style="width:100%;text-align:left;padding:14px 16px;border-radius:12px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);cursor:pointer;margin-bottom:18px;display:flex;align-items:center;gap:14px;box-sizing:border-box;">`
      +`<span style="font-size:24px;flex-shrink:0;">💬</span>`
      +`<div><div style="font-size:15px;font-weight:700;">Tip / Source</div>`
      +`<div style="font-size:12px;color:var(--mut);font-family:monospace;margin-top:2px;">Someone else's selection</div></div>`
    +`</button>`
    +`<button onclick="_betFlowClose()" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;">✕ Cancel</button>`;
}

function _betFlowSelectSource(source){
  _betFlowState.source=source;
  const content=document.getElementById('_bflow-content');
  if(!content)return;
  if(source==='own'){
    _flowActiveCKS=CKS_OWN;
    _betFlowShowChecklist();
  } else {
    // Show saved sources list + option to type a new one
    const sources=(D.settings&&D.settings.sources&&D.settings.sources.length)?D.settings.sources:[];
    let html='<div style="font-family:monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);margin-bottom:14px;">Who is the tip from?</div>';
    // Build source buttons using data attributes — avoids all quote escaping
    sources.forEach(function(src,si){
      const label=typeof src==='object'?src.label:src;
      html+='<button data-tip-idx="'+si+'" style="width:100%;text-align:left;padding:13px 16px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);font-size:14px;font-weight:600;cursor:pointer;margin-bottom:8px;box-sizing:border-box;display:block;">💬 '+label+'</button>';
    });
    html+='<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;color:var(--mut);margin:12px 0 8px;">OR TYPE A NEW SOURCE</div>'
      +'<input id="_bflow-tip-src" type="text" placeholder="e.g. Racing Post, Twitter, friend…" autocomplete="off"'
      +' style="width:100%;box-sizing:border-box;background:var(--sur2);border:1px solid var(--bdr);border-radius:10px;padding:13px 14px;font-size:15px;color:var(--txt);outline:none;margin-bottom:10px;">'
      +'<button id="_bflow-tip-go" style="width:100%;padding:13px;border-radius:10px;border:none;background:#e879f9;color:#141414;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin-bottom:10px;">Continue →</button>'
      +'<button id="_bflow-tip-cancel" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;">✕ Cancel</button>';
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
  _flowActiveCKS=CKS_TIP;
  _betFlowShowChecklist();
}

function _betFlowShowChecklist(){
  _flowCks=new Array(_flowActiveCKS.length).fill(false);
  const s=_betFlowState;
  const isOwn=s.source==='own';
  const accentCol=isOwn?'#60a5fa':'#e879f9';
  const heading=isOwn?'Own Selection — 0 / '+_flowActiveCKS.length:'Tip: '+s.tipSource+' — 0 / '+_flowActiveCKS.length;
  const content=document.getElementById('_bflow-content');
  if(!content)return;
  content.style.padding='0';
  content.innerHTML=
    `<div style="padding:16px 18px 0;">`
      +`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">`
        +`<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${accentCol};">${isOwn?'MY SELECTION':'TIP · '+s.tipSource.toUpperCase()}</div>`
        +`<div id="_bflow-score-lbl" style="font-family:monospace;font-size:11px;color:var(--mut);">0 / ${_flowActiveCKS.length}</div>`
      +`</div>`
      +`<div style="height:4px;border-radius:2px;background:var(--bdr);overflow:hidden;margin-bottom:14px;">`
        +`<div id="_bflow-bar" style="height:100%;border-radius:2px;background:${accentCol};width:0%;transition:width .25s;"></div>`
      +`</div>`
    +`</div>`
    +`<div style="padding:0 18px;overflow-y:auto;">`
      +_flowActiveCKS.map((c,i)=>_betFlowItemHtml(c,i)).join('')
      +`<div style="height:8px;"></div>`
    +`</div>`
    // Sticky bottom action bar — accessible with thumb
    +`<div style="position:sticky;bottom:0;background:var(--sur);border-top:1px solid var(--bdr);padding:12px 18px env(safe-area-inset-bottom,16px);flex-shrink:0;">`
      +`<div id="_bflow-rec" style="font-family:monospace;font-size:11px;color:var(--mut);margin-bottom:8px;min-height:16px;"></div>`
      +`<div style="display:flex;gap:8px;">`
        +`<button id="_bflow-btn-real" onclick="_betFlowProceed('real')" style="flex:1;padding:14px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.06em;cursor:pointer;transition:all .2s;">💷 Real</button>`
        +`<button id="_bflow-btn-virt" onclick="_betFlowProceed('virt')" style="flex:1;padding:14px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.06em;cursor:pointer;transition:all .2s;">🏦 Virtual</button>`
        +`<button onclick="_betFlowClose()" style="padding:14px 16px;border-radius:10px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:monospace;font-size:14px;cursor:pointer;">✕</button>`
      +`</div>`
    +`</div>`;
}

function _betFlowItemHtml(c,i){
  const type=c.type||'checkbox';
  const base='display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);margin-bottom:8px;transition:border-color .15s,background .15s;';
  if(type==='yes-no'){
    return `<div id="_bflow-item-${i}" style="${base}">`
      +`<div style="font-size:13px;line-height:1.4;color:var(--txt);">${c.t}</div>`
      +`<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:-4px;">${c.s}</div>`
      +`<div style="display:flex;gap:8px;">`
        +`<button id="_bflow-yn-yes-${i}" onclick="_betFlowYesNo(${i},'yes')" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur);color:var(--mut);font-family:monospace;font-size:11px;font-weight:700;cursor:pointer;">Yes</button>`
        +`<button id="_bflow-yn-no-${i}" onclick="_betFlowYesNo(${i},'no')" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur);color:var(--mut);font-family:monospace;font-size:11px;font-weight:700;cursor:pointer;">No</button>`
      +`</div>`
    +`</div>`;
  }
  if(type==='multi'){
    const opts=(c.options||[]).map((o,oi)=>`<button id="_bflow-mo-${i}-${oi}" onclick="_betFlowMulti(${i},${oi},${o.score})" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur);color:var(--mut);font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;">${o.label}</button>`).join('');
    return `<div id="_bflow-item-${i}" style="${base}">`
      +`<div style="font-size:13px;line-height:1.4;color:var(--txt);">${c.t}</div>`
      +`<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:-4px;">${c.s}</div>`
      +`<div style="display:flex;gap:6px;flex-wrap:wrap;">${opts}</div>`
    +`</div>`;
  }
  if(type==='scale'){
    return `<div id="_bflow-item-${i}" style="${base}">`
      +`<div style="font-size:13px;line-height:1.4;color:var(--txt);">${c.t}</div>`
      +`<div style="display:flex;align-items:center;justify-content:space-between;font-family:monospace;font-size:9px;color:var(--mut);margin-bottom:2px;"><span>${c.scaleMin||'Low'}</span><span>${c.scaleMax||'High'}</span></div>`
      +`<input id="_bflow-scale-${i}" type="range" min="0" max="100" value="0" oninput="_betFlowScale(${i},this.value)" style="width:100%;accent-color:#60a5fa;">`
      +`<div id="_bflow-scale-lbl-${i}" style="font-family:monospace;font-size:11px;color:var(--mut);text-align:center;">Not set</div>`
    +`</div>`;
  }
  if(type==='auto'){
    // Auto-capture: set immediately
    setTimeout(function(){_betFlowAutoCapture(i,c);},50);
    return `<div id="_bflow-item-${i}" style="${base};opacity:.7;">`
      +`<div style="display:flex;align-items:center;justify-content:space-between;">`
        +`<div style="font-size:13px;color:var(--txt);">${c.t}</div>`
        +`<div id="_bflow-auto-lbl-${i}" style="font-family:monospace;font-size:11px;color:var(--mut);">Detecting…</div>`
      +`</div>`
      +`<div style="font-size:11px;color:var(--mut);font-style:italic;">${c.s}</div>`
    +`</div>`;
  }
  // Default: checkbox
  return `<div id="_bflow-item-${i}" onclick="_betFlowTick(${i})" style="${base}cursor:pointer;">`
    +`<div style="display:flex;align-items:flex-start;gap:12px;">`
      +`<div id="_bflow-chk-${i}" style="width:20px;height:20px;flex-shrink:0;border-radius:6px;border:2px solid var(--bdr);display:flex;align-items:center;justify-content:center;margin-top:1px;transition:all .15s;font-size:12px;color:transparent;"></div>`
      +`<div><div style="font-size:13px;line-height:1.4;color:var(--txt);">${c.t}</div>`
      +`<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:3px;">${c.s}</div></div>`
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
  _betFlowUpdateScore();
}
function _betFlowScale(i,val){
  const v=parseInt(val);
  const lbl=document.getElementById('_bflow-scale-lbl-'+i);
  const col=v>=66?'var(--grn)':v>=33?'var(--gld)':'var(--mut)';
  if(lbl){lbl.textContent=v+'%';lbl.style.color=col;}
  _flowCks[i]=v/100;
  _betFlowUpdateScore();
}
function _betFlowAutoCapture(i,c){
  if(c.autoCapture==='time-of-day'){
    const h=new Date().getHours();
    const band=(c.bands||[]).find(function(b){return h<b.before;})||{label:'Late',score:25};
    const lbl=document.getElementById('_bflow-auto-lbl-'+i);
    if(lbl){lbl.textContent=band.label;lbl.style.color=band.score>=75?'var(--grn)':band.score>=50?'var(--gld)':'var(--mut)';}
    _flowCks[i]=band.score/100;
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
  const done=_flowCks.reduce(function(a,v){return a+(v?1:0);},0);
  const total=_flowActiveCKS.length;
  const pct=total>0?done/total*100:0;
  const isOwn=_betFlowState.source==='own';
  const accentCol=isOwn?'#60a5fa':'#e879f9';
  const mode=_betFlowState.mode;
  const lbl=document.getElementById('_bflow-score-lbl');
  if(lbl)lbl.textContent=done+' / '+total;
  const bar=document.getElementById('_bflow-bar');
  if(bar){bar.style.width=pct+'%';bar.style.background=done===total?'var(--grn)':pct>=66?'var(--gld)':accentCol;}
  const btnReal=document.getElementById('_bflow-btn-real');
  const btnVirt=document.getElementById('_bflow-btn-virt');
  const rec=document.getElementById('_bflow-rec');
  if(done===0){
    if(btnReal){btnReal.style.background='var(--sur2)';btnReal.style.color='var(--mut)';btnReal.style.borderColor='var(--bdr)';}
    if(btnVirt){btnVirt.style.background='var(--sur2)';btnVirt.style.color='var(--mut)';btnVirt.style.borderColor='var(--bdr)';}
    if(rec)rec.textContent='';
    return;
  }
  let recTxt='',recCol='';
  if(done===total){
    recTxt='✅ All checks — Real recommended';recCol='var(--grn)';
    if(btnReal){btnReal.style.background='var(--grn)';btnReal.style.color='#141414';btnReal.style.borderColor='var(--grn)';}
    if(btnVirt){btnVirt.style.background='var(--sur2)';btnVirt.style.color='var(--mut)';btnVirt.style.borderColor='var(--bdr)';}
  } else if(pct>=66){
    recTxt='⚠️ Most checks — Virtual recommended';recCol='var(--gld)';
    if(btnReal){btnReal.style.background='var(--sur2)';btnReal.style.color='var(--mut)';btnReal.style.borderColor='var(--bdr)';}
    if(btnVirt){btnVirt.style.background='rgba(232,228,220,.12)';btnVirt.style.color='var(--gld)';btnVirt.style.borderColor='var(--gld)';}
  } else {
    recTxt='🔴 Low score — Virtual only';recCol='var(--red)';
    if(btnReal){btnReal.style.background='var(--sur2)';btnReal.style.color='var(--mut)';btnReal.style.borderColor='var(--bdr)';}
    if(btnVirt){btnVirt.style.background='rgba(251,146,60,.1)';btnVirt.style.color='#fb923c';btnVirt.style.borderColor='#fb923c';}
  }
  if(rec){rec.style.color=recCol;rec.textContent=recTxt;}
}

function _betFlowProceed(chosenMode){
  const done=_flowCks.filter(Boolean).length;
  if(done===0){alert('Work through the checklist first — tick at least what you have considered.');return;}
  const s=Object.assign({},_betFlowState,{mode:chosenMode});
  _betFlowClose(function(){_rcDoLogBet(s);});
}

function _betFlowClose(cb){
  const ov=document.getElementById('_bflow-ov');
  if(!ov){if(cb)cb();return;}
  const sh=document.getElementById('_bflow-sheet');
  if(sh){sh.style.transform='translateY(40px)';sh.style.opacity='0';}
  ov.style.opacity='0';
  setTimeout(function(){if(ov.parentNode)ov.remove();if(cb)cb();},250);
}

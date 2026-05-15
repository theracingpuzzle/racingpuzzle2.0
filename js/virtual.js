// ─── VIRTUAL BETTING & FIXTURES ───

// ─── VIRTUAL BETTING ───
function getVBank(){
  if(!D.vBank||typeof D.vBank!=='object') D.vBank={start:500,current:500,bets:[]};
  if(!Array.isArray(D.vBank.bets)) D.vBank.bets=[];
  return D.vBank;
}

function setVBank(){/* removed panel */}

function calcVBStake(){
  // Suggest 2% of virtual bank
  const vb = getVBank();
  const stakeEl = document.getElementById('vbs');
  if(!stakeEl.value){
    stakeEl.value = (vb.current * 0.02).toFixed(2);
  }
  calcVBReturn();
}

function calcVBReturn(){
  const res = document.getElementById('vbres').value;
  const stake = parseFloat(document.getElementById('vbs').value)||0;
  const od = fo(document.getElementById('vbo').value);
  const bt = document.getElementById('vbtype').value;
  const el = document.getElementById('vb-calc');
  if(!stake||!od||res==='pending'){el.style.display='none';return;}
  const returns = calcReturns(res, stake, od, bt, '');
  const p = returns - stake;
  el.style.display='block';
  el.textContent = res==='loss'
    ? '↓ Would lose '+fp(stake)
    : res==='nr'
    ? '↩ Stake refunded: '+fp(stake)
    : '↑ Would return '+fp(returns)+' ('+fmt(p)+')';
  el.style.color = p>0?'#fb923c':p<0?'var(--red)':'var(--mut)';
}

function saveVB(){
  const horse=document.getElementById('vbh').value.trim();
  const track=document.getElementById('vbt').value.trim();
  const odRaw=document.getElementById('vbo').value.trim();
  const stake=parseFloat(document.getElementById('vbs').value)||0;
  const od=fo(odRaw);
  if(!horse){alert('Enter a horse name.');return;}
  if(!stake||stake<0.01){alert('Enter a stake.');return;}
  if(!od||od<1){alert('Enter valid odds e.g. 5/1 or EVS');return;}
  const vb=getVBank();
  if(stake>vb.current){alert('Stake exceeds virtual bank ('+fp(vb.current)+')');return;}
  const result=document.getElementById('vbres').value;
  const bt=document.getElementById('vbtype').value;
  const autoRet=calcReturns(result,stake,od,bt,'');
  const manualRet=parseFloat((document.getElementById('vbret')||{}).value)||0;
  const returns=manualRet||autoRet;
  const bet={
    id:gid(),date:td(),horse,track,
    time:document.getElementById('vbtime').value.trim(),
    jockey:(document.getElementById('vbjockey')||{value:''}).value.trim(),
    trainer:(document.getElementById('vbtrainer')||{value:''}).value.trim(),
    odds:od,oddsDisplay:odRaw,stake,betType:bt,
    conf:parseInt((document.getElementById('vbconf')||{value:'3'}).value)||3,
    source:(document.getElementById('vbsrc')||{value:'Own Form Study'}).value,
    notes:(document.getElementById('vbnotes')||{value:''}).value.trim(),
    checklistScore:cks.filter(Boolean).length,
    result,returns,createdAt:Date.now()
  };
  // Update virtual bank
  vb.current=parseFloat((vb.current-stake).toFixed(2));
  if(result!=='pending')vb.current=parseFloat((vb.current+returns).toFixed(2));
  vb.bets.push(bet);
  save();updHdr();refreshRacecardHighlights();
  ['vbh','vbt','vbtime','vbo','vbs','vbret','vbnotes','vbjockey','vbtrainer'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const vbres=document.getElementById('vbres');if(vbres)vbres.value='pending';
  const vbconf=document.getElementById('vbconf');if(vbconf)vbconf.value='3';
  const vbcalc=document.getElementById('vb-calc');if(vbcalc)vbcalc.style.display='none';
  resetCks();
  const overlay=document.getElementById('logbet-overlay');
  if(overlay&&overlay.style.display!=='none'){closeLogbetOverlay();}
  else{flash('vbok');renderVBMini();renderVirtualCard();renderToday();if(mode==='cmd'){renderDash();renderHist();}}
}

function renderVirtualCard(){/* removed - virtual data shown in history/stats */}

function openVBEdit(id){
  const vb = getVBank();
  const b = vb.bets.find(x=>x.id===id);
  if(!b||b.result!=='pending')return;
  const res = prompt('Update result for '+b.horse+':\nwin / place / loss / nr', 'loss');
  if(!res)return;
  const oldReturns = b.returns||0;
  b.result = res.toLowerCase().trim();
  b.returns = calcReturns(b.result, b.stake, b.odds, b.betType, '');
  // Adjust bank: returns were 0 (pending), now apply actual returns
  vb.current = parseFloat((vb.current + b.returns - oldReturns).toFixed(2));
  save();
  renderVirtualCard();
}


// ─── VIRTUAL BETTING ───
function vPnl(b){if(!b.result||b.result==='pending')return null;if(b.result==='void'||b.result==='nr')return 0;return(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0);}

function onVResChange(){/* removed panel */}

function saveVBet(){/* removed panel */}

function saveVBank(){
  if(!D.vBank||typeof D.vBank!=='object')D.vBank={start:500,current:500};
  // vbk-start removed - starting bank managed via Settings
  // vbk-cur removed
  save();
  renderVirtual();
  updHdr();
}

function renderVirtual(){
  // Only updates swipe card virtual form
  renderVBMini();
}


// ─── FIXTURES ───
const FIXTURES=[
  // 2026 Flat
  {id:'guineas26',name:'Guineas Festival',course:'Newmarket',dates:['2026-05-02','2026-05-03'],colour:'#f59e0b',emoji:'🏆'},
  {id:'derby26',name:'Derby Festival',course:'Epsom',dates:['2026-06-05','2026-06-06'],colour:'#10b981',emoji:'🏆'},
  {id:'ascot26',name:'Royal Ascot',course:'Ascot',dates:['2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20'],colour:'#f43f5e',emoji:'👑'},
  {id:'july26',name:'July Festival',course:'Newmarket',dates:['2026-07-09','2026-07-10','2026-07-11'],colour:'#f59e0b',emoji:'☀️'},
  {id:'goodwood26',name:'Glorious Goodwood',course:'Goodwood',dates:['2026-07-28','2026-07-29','2026-07-30','2026-07-31','2026-08-01'],colour:'#8b5cf6',emoji:'🌟'},
  {id:'ebor26',name:'Ebor Festival',course:'York',dates:['2026-08-19','2026-08-20','2026-08-21','2026-08-22'],colour:'#0ea5e9',emoji:'🎖️'},
  {id:'haydock26',name:'Sprint Cup Day',course:'Haydock',dates:['2026-09-05'],colour:'#84cc16',emoji:'⚡'},
  {id:'ayr26',name:'Ayr Gold Cup',course:'Ayr',dates:['2026-09-19'],colour:'#22d3ee',emoji:'🏅'},
  {id:'champions26',name:'British Champions Day',course:'Ascot',dates:['2026-10-17'],colour:'#f43f5e',emoji:'🏆'},
  // 2026 Jump
  {id:'cheltenham26',name:'Cheltenham Festival',course:'Cheltenham',dates:['2026-03-10','2026-03-11','2026-03-12','2026-03-13'],colour:'#34d399',emoji:'🏆'},
  {id:'national26',name:'Grand National',course:'Aintree',dates:['2026-04-02','2026-04-03','2026-04-04'],colour:'#fb923c',emoji:'🐎'},
  {id:'punchestown26',name:'Punchestown Festival',course:'Punchestown',dates:['2026-04-28','2026-04-29','2026-04-30','2026-05-01','2026-05-02'],colour:'#a78bfa',emoji:'☘️'},
];
function getFixtureForDate(dateStr){
  return FIXTURES.filter(f=>f.dates.includes(dateStr));
}
function getFixtureById(id){return FIXTURES.find(f=>f.id===id)||null;}

function doHorseSearch(horseInputId, resultsId, mode){
  const q=document.getElementById(horseInputId).value.trim();
  if(!q){alert('Type a horse name first.');return;}
  const resultsEl=document.getElementById(resultsId);
  searchHorse(q, resultsEl, function(m){
    document.getElementById(horseInputId).value=m.name;
    if(mode==='real'){
      if(m.trainer){const t=document.getElementById('lbtrainer');if(t)t.value=m.trainer;}
      if(m.jockey){const j=document.getElementById('lbjockey');if(j)j.value=m.jockey;}
      if(m.course){const t=document.getElementById('lbt');if(t&&!t.value)t.value=m.course;}
      if(m.raceTime){const ti=document.getElementById('lbtime');if(ti&&!ti.value)ti.value=m.raceTime;}
      setTimeout(calcLiveStake,100);
    } else {
      if(m.trainer){const t=document.getElementById('vbtrainer');if(t)t.value=m.trainer;}
      if(m.jockey){const j=document.getElementById('vbjockey');if(j)j.value=m.jockey;}
      if(m.course){const t=document.getElementById('vbt');if(t&&!t.value)t.value=m.course;}
      if(m.raceTime){const ti=document.getElementById('vbtime');if(ti&&!ti.value)ti.value=m.raceTime;}
    }
  });
}

function doWLSearch(){
  const q=(document.getElementById('wlf-horse')||{value:''}).value.trim();
  if(!q){alert('Type a horse name first.');return;}
  const resultsEl=document.getElementById('wlf-search-results');
  searchHorse(q, resultsEl, function(m){
    const f=document.getElementById('wlf-horse');if(f)f.value=m.name;
    if(m.trainer){const tf=document.getElementById('wlf-trainer');if(tf)tf.value=m.trainer;}
    if(m.course){const cf=document.getElementById('wlf-track');if(cf&&!cf.value)cf.value=m.course;}
    if(m.raceDate){const df=document.getElementById('wlf-date');if(df&&!df.value)df.value=m.raceDate;}
    if(m.raceName){const rf=document.getElementById('wlf-race');if(rf&&!rf.value)rf.value=m.raceName;}
    if(m.going){const gf=document.getElementById('wlf-cond');if(gf&&!gf.value)gf.value=m.going;}
  });
}

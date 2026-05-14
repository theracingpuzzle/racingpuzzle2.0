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
let wlView='cal', wlCalDate=new Date();

function getWL(){if(!D.watchlist)D.watchlist=[];return D.watchlist;}

function setWLView(v){
  wlView=v;
  document.getElementById('wl-cal-view').style.display=v==='cal'?'block':'none';
  document.getElementById('wl-list-view').style.display=v==='list'?'block':'none';
  const cb=document.getElementById('wl-cal-btn'),lb=document.getElementById('wl-list-btn');
  if(cb){cb.style.background=v==='cal'?'rgba(232,121,249,.2)':'transparent';cb.style.borderColor=v==='cal'?'rgba(232,121,249,.4)':'var(--bdr)';cb.style.color=v==='cal'?'#e879f9':'var(--mut)';}
  if(lb){lb.style.background=v==='list'?'rgba(232,121,249,.2)':'transparent';lb.style.borderColor=v==='list'?'rgba(232,121,249,.4)':'var(--bdr)';lb.style.color=v==='list'?'#e879f9':'var(--mut)';}
  if(v==='cal')renderWLCal();else renderWLList();
}

function renderWatchlist(){setWLView(wlView);}

function wlCalPrev(){wlCalDate=new Date(wlCalDate.getFullYear(),wlCalDate.getMonth()-1,1);renderWLCal();}
function wlCalNext(){wlCalDate=new Date(wlCalDate.getFullYear(),wlCalDate.getMonth()+1,1);renderWLCal();}

function renderWLCal(){
  const wl=getWL();
  const y=wlCalDate.getFullYear(),m=wlCalDate.getMonth();
  const monthEl=document.getElementById('wl-cal-month');
  if(monthEl)monthEl.textContent=new Date(y,m,1).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const grid=document.getElementById('wl-cal-grid');if(!grid)return;
  const firstDay=new Date(y,m,1).getDay(); // 0=Sun
  const daysInMonth=new Date(y,m+1,0).getDate();
  const today=td();
  // Build a map of date→{entries, targets}
  // entries = whole watchlist entries whose raceDate falls on that day
  // targets = {horse, target} pairs for target races on that day
  const dateMap={};
  wl.forEach(function(e){
    if(e.raceDate){
      if(!dateMap[e.raceDate])dateMap[e.raceDate]={entries:[],targets:[]};
      dateMap[e.raceDate].entries.push(e);
    }
    (e.targets||[]).forEach(function(t){
      if(t.date){
        if(!dateMap[t.date])dateMap[t.date]={entries:[],targets:[]};
        dateMap[t.date].targets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});
      }
    });
  });
  // Day headers
  const dayNames=['S','M','T','W','T','F','S'];
  let html=dayNames.map(d=>'<div style="color:var(--mut);font-size:9px;padding:3px 0;font-weight:700;">'+d+'</div>').join('');
  // Empty cells before first day
  const start=firstDay; // Sun=0
  for(let i=0;i<start;i++)html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const dayData=dateMap[dateStr]||{entries:[],targets:[]};
    const entries=dayData.entries;
    const dayTargets=dayData.targets;
    const isToday=dateStr===today;
    const hasBet=entries.length>0||dayTargets.length>0;
    const fixtures=getFixtureForDate(dateStr);
    const hasFixture=fixtures.length>0;
    const dotCol=dayTargets.length&&!entries.length?'#fb923c':'#e879f9';
    const fixtureBar=hasFixture?'<div style="height:3px;border-radius:2px;background:'+fixtures[0].colour+';margin:1px 2px 0;" title="'+fixtures[0].name+'"></div>':'';
    html+='<div onclick="wlSelectDay(\''+dateStr+'\')" style="cursor:pointer;padding:5px 2px;border-radius:6px;'+(isToday?'background:rgba(232,121,249,.15);':'')+'text-align:center;">'
      +'<div style="font-size:11px;color:'+(isToday?'#e879f9':hasBet?'var(--txt)':'var(--mut)'+';font-weight:'+(hasBet?'700':'400'))+';">'+d+'</div>'
      +(hasBet?'<div style="width:5px;height:5px;border-radius:50%;background:'+dotCol+';margin:1px auto 0;"></div>':'<div style="height:4px;"></div>')+fixtureBar
      +'</div>';
  }
  grid.innerHTML=html;
  // Show today's or selected day entries
  const selDay=document.getElementById('wl-cal-day-entries');
  if(selDay)selDay.innerHTML='';
}

function wlSelectDay(dateStr){
  const wl=getWL();
  const entries=wl.filter(e=>e.raceDate===dateStr);
  // Gather targets from all horses that point to this date
  const dayTargets=[];
  wl.forEach(function(e){
    (e.targets||[]).forEach(function(t){
      if(t.date===dateStr)dayTargets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});
    });
  });
  const el=document.getElementById('wl-cal-day-entries');if(!el)return;
  const dayFixtures=getFixtureForDate(dateStr);
  const fixtureBanner=dayFixtures.map(f=>'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9px;background:rgba(0,0,0,.2);border-left:3px solid '+f.colour+';margin-bottom:8px;"><span>'+f.emoji+'</span><div><div style="font-weight:700;font-size:13px;color:'+f.colour+';">'+f.name+'</div><div style="font-size:11px;color:var(--mut);">'+f.course+'</div></div></div>').join('');
  const dayLabel='<div style="font-family:monospace;font-size:9px;color:rgba(232,121,249,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;">'+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})+'</div>';
  let html=fixtureBanner+dayLabel;
  // Target race cards (orange accent)
  if(dayTargets.length){
    html+='<div style="font-family:monospace;font-size:9px;color:rgba(251,146,60,.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">🎯 Target Races</div>';
    html+=dayTargets.map(function(d){
      const t=d.target;
      return'<div data-wl-id="'+d.horseId+'" style="cursor:pointer;border-left:3px solid #fb923c;margin-bottom:8px;padding:10px 11px;background:rgba(251,146,60,.05);border-radius:0 8px 8px 0;">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-weight:700;font-size:14px;margin-bottom:2px;">'+d.horse+(d.currentRating?'<span style="font-family:monospace;font-size:10px;color:var(--mut);font-weight:400;margin-left:6px;">OR '+d.currentRating+'</span>':'')+'</div>'
            +(d.trainer?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">'+d.trainer+'</div>':'')
            +'<div style="font-size:12px;color:#fb923c;font-weight:600;">'+t.race+(t.track?' · '+t.track:'')+'</div>'
            +(t.condition?'<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:2px;">'+t.condition+'</div>':'')
          +'</div>'

        +'</div>'
      +'</div>';
    }).join('');
  }
  // Regular watchlist entries (observation raceDate)
  if(entries.length){
    if(dayTargets.length)html+='<div style="font-family:monospace;font-size:9px;color:rgba(232,121,249,.5);text-transform:uppercase;letter-spacing:.1em;margin:10px 0 6px;">Puzzle Profiler</div>';
    html+=entries.map(function(e){return renderWLEntry(e);}).join('');
  }
  if(!entries.length&&!dayTargets.length){
    html+='<div style="color:var(--mut);font-style:italic;font-size:13px;padding:8px 0;">No targets on '+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'.<br><span style="font-size:12px;">Tap + to add one.</span></div>';
  }
  el.innerHTML=html;
  el.querySelectorAll('[data-wl-id]').forEach(function(el2){el2.addEventListener('click',function(){openWLForm(el2.getAttribute('data-wl-id'));});});
}

// Track which profiler groups are expanded (session only — resets to all collapsed)
const _wlGroupOpen={};

function wlToggleGroup(r){
  _wlGroupOpen[r]=!_wlGroupOpen[r];
  renderWLList();
}

function renderWLList(){
  const wl=getWL();
  const search=(document.getElementById('wl-search')||{value:''}).value.toLowerCase();
  let entries=[...wl].sort(function(a,b){return(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
  if(search)entries=entries.filter(e=>(e.horse||'').toLowerCase().includes(search)||(e.trainer||'').toLowerCase().includes(search)||(e.reasonNote||'').toLowerCase().includes(search));
  const el=document.getElementById('wl-list');if(!el)return;
  if(!entries.length){el.innerHTML='<div class="es">No profiles yet. Tap + to add a horse.</div>';return;}
  const REASON_ORDER=['eye-catcher','future-target','trainer-intel','form-study','tip-source'];
  const REASON_META={'eye-catcher':{emoji:'👁',label:'Eye Catchers',col:'#a78bfa'},'future-target':{emoji:'📰',label:'Future Targets',col:'#fb923c'},'trainer-intel':{emoji:'🗣',label:'Trainer Intel',col:'#60a5fa'},'form-study':{emoji:'📊',label:'Form Study',col:'#ef4444'},'tip-source':{emoji:'💡',label:'Tips & Sources',col:'#eab308'}};
  const groups={};
  entries.forEach(function(e){const r=e.reason||'eye-catcher';if(!groups[r])groups[r]=[];groups[r].push(e);});
  // If searching, expand all matching groups automatically
  const isSearching=!!search;
  let html='';
  REASON_ORDER.forEach(function(r){
    if(!groups[r]||!groups[r].length)return;
    const rm=REASON_META[r];
    const isOpen=isSearching||!!_wlGroupOpen[r];
    const chevron=isOpen?'▾':'›';
    html+='<div onclick="wlToggleGroup(this.dataset.wlg)" data-wlg="'+r+'" style="display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:'+(isOpen?'2':'8')+'px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);cursor:pointer;user-select:none;">'      +'<span style="font-size:14px;">'+rm.emoji+'</span>'      +'<span style="font-family:monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:'+rm.col+';flex:1;">'+rm.label+'</span>'      +'<span style="font-family:monospace;font-size:10px;background:rgba(255,255,255,.07);color:var(--mut);padding:2px 8px;border-radius:20px;">'+groups[r].length+'</span>'      +'<span style="color:'+rm.col+';font-size:14px;transition:transform .15s;">'+chevron+'</span>'    +'</div>';
    if(isOpen){
      html+='<div style="margin-bottom:10px;">'+groups[r].map(function(e){return renderWLEntry(e);}).join('')+'</div>';
    }
  });
  el.innerHTML=html;
  el.querySelectorAll('[data-wl-id]').forEach(function(el2){el2.addEventListener('click',function(ev){ev.stopPropagation();openWLForm(el2.getAttribute('data-wl-id'));});});
}

function renderWLEntry(e){
  const RMAP={'eye-catcher':{emoji:'👁',col:'#a78bfa',label:'Eye Catcher'},'future-target':{emoji:'📰',col:'#fb923c',label:'Future Target'},'trainer-intel':{emoji:'🗣',col:'#60a5fa',label:'Trainer Intel'},'form-study':{emoji:'📊',col:'#ef4444',label:'Form Study'},'tip-source':{emoji:'💡',col:'#eab308',label:'Tip / Source'}};
  const rm=RMAP[e.reason||'eye-catcher']||RMAP['eye-catcher'];
  const obs=e.observations||[];
  const targets=e.targets||[];
  const lastObs=obs.length?obs[obs.length-1]:null;
  const latestDate=lastObs?lastObs.date:(e.raceDate||'');
  const daysAgo=latestDate?(function(){const d=new Date(latestDate+'T00:00:00');const diff=Math.round((new Date()-d)/(1000*60*60*24));return diff===0?'Today':diff===1?'Yesterday':diff>0?diff+'d ago':'Upcoming';}()):'';  const isEmpty=!obs.length&&!targets.length&&!e.trainerIntel&&!e.conditionsNotes;
  return'<div class="mb" data-wl-id="'+e.id+'" style="cursor:pointer;border-left:3px solid '+rm.col+';margin-bottom:8px;padding:10px 11px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="margin-bottom:5px;"><span style="font-size:9px;font-family:monospace;padding:2px 7px;border-radius:20px;background:rgba(0,0,0,.2);border:1px solid '+rm.col+';color:'+rm.col+';font-weight:700;">'+rm.emoji+' '+rm.label+'</span>'+(e.reasonNote?'<span style="font-size:10px;color:var(--mut);font-style:italic;margin-left:6px;">'+e.reasonNote.slice(0,50)+(e.reasonNote.length>50?'…':'')+'</span>':'')+'</div>'
      +'<div style="font-weight:700;font-size:15px;margin-bottom:2px;">'+e.horse+(e.currentRating?'<span style="font-family:monospace;font-size:10px;color:var(--mut);font-weight:400;margin-left:6px;">OR '+e.currentRating+'</span>':'')+'</div>'
      +(e.trainer?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">'+e.trainer+'</div>':'')
      +(lastObs?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">📋 <span style="color:var(--txt);">'+lastObs.raceName+(lastObs.track?' · '+lastObs.track:'')+'</span> · '+daysAgo+'</div>':'')
      +(targets.length?'<div style="margin-top:3px;">'+targets.slice(0,2).map(function(t){const tDate=t.date?(new Date(t.date+'T00:00:00')).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';return'<div style="font-size:11px;font-family:monospace;color:#fb923c;margin-bottom:1px;">🎯 '+t.race+(tDate?'<span style="color:var(--mut);"> · '+tDate+'</span>':'')+(t.track?'<span style="font-size:9px;color:var(--mut);"> · '+t.track+'</span>':'')+'</div>';}).join('')+'</div>':'')
      +(e.trainerIntel?'<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:4px;border-left:2px solid rgba(96,165,250,.3);padding-left:7px;">🗣 '+e.trainerIntel.slice(0,80)+(e.trainerIntel.length>80?'…':'')+'</div>':'')
      +(isEmpty?'<div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:4px;font-style:italic;">Tap to add notes →</div>':'')
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0;margin-left:10px;">'
        +(obs.length?'<div style="font-family:monospace;font-size:9px;color:var(--mut);">'+obs.length+' obs</div>':'')
      +'</div>'
    +'</div>'
  +'</div>';
}


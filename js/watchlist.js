// ─── WATCHLIST / PUZZLE PROFILER ───
function esc(s){return(s==null?'':s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Escape for use inside single-quoted JS strings within onclick attributes
function jsq(s){return(s==null?'':s+'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

function _wlCondInfo(btn,msg){
  const existing=document.getElementById('_wl-cond-tip');
  if(existing){existing.remove();if(existing._srcBtn===btn)return;}
  const tip=document.createElement('div');
  tip._srcBtn=btn;
  tip.id='_wl-cond-tip';
  tip.innerHTML='<div style="font-size:11px;line-height:1.5;color:var(--txt);">'+msg+'</div>'
    +'<button onclick="document.getElementById(\'_wl-cond-tip\').remove()" style="margin-top:8px;font-size:10px;font-weight:700;color:var(--mut);background:none;border:none;cursor:pointer;padding:0;">Dismiss</button>';
  tip.style.cssText='position:fixed;z-index:3000;background:var(--sur);border:1px solid var(--bdr);border-radius:10px;padding:12px 14px;max-width:240px;box-shadow:0 4px 20px rgba(0,0,0,.18);';
  document.body.appendChild(tip);
  const r=btn.getBoundingClientRect();
  const tw=240,th=80;
  let left=r.left+r.width/2-tw/2;
  if(left<8)left=8;
  if(left+tw>window.innerWidth-8)left=window.innerWidth-8-tw;
  let top=r.bottom+8;
  if(top+th>window.innerHeight-8)top=r.top-th-8;
  tip.style.left=left+'px';
  tip.style.top=top+'px';
  document.addEventListener('click',function _close(e){if(!tip.contains(e.target)&&e.target!==btn){tip.remove();document.removeEventListener('click',_close);}},{once:false,capture:true});
}

let wlView='list', wlCalDate=new Date();
// ── OR Edge helpers ──
function orEdge(entry){
  const mr=parseFloat(entry.myRating);
  const or=parseFloat(entry.currentRating);
  if(!mr||!or) return null;
  return mr - or; // positive = horse running below your assessed mark = value
}

function orEdgeBadge(entry){
  const edge=orEdge(entry);
  if(edge===null) return '';
  if(edge>0) return '<span class="wll-edge-pos">▲ +'+edge+' edge</span>';
  if(edge<0) return '<span class="wll-edge-neg">▼ '+edge+' edge</span>';
  return '<span class="wll-edge-nil">→ on mark</span>';
}

function orSummaryLine(entry){
  const mr=parseFloat(entry.myRating);
  const or=parseFloat(entry.currentRating);
  if(!mr&&!or) return '';
  let parts=[];
  if(mr) parts.push('<span class="wll-or-mr">MR '+mr+'</span>');
  if(or) parts.push('<span class="wll-or-or">OR '+or+'</span>');
  return '<div class="wll-or-line">'+parts.join('<span class="wll-or-sep">·</span>')+orEdgeBadge(entry)+'</div>';
}



function getWL(){if(!D.watchlist)D.watchlist=[];return D.watchlist;}

function setWLView(v){
  wlView=v;
  document.getElementById('wl-cal-view').style.display=v==='cal'?'block':'none';
  document.getElementById('wl-list-view').style.display=v==='list'?'block':'none';
  const cb=document.getElementById('wl-cal-btn'),lb=document.getElementById('wl-list-btn');
  if(cb){cb.style.background=v==='cal'?'var(--clr-watch-a1)':'transparent';cb.style.opacity=v==='cal'?'1':'0.45';}
  if(lb){lb.style.background=v==='list'?'var(--clr-watch-a1)':'transparent';lb.style.opacity=v==='list'?'1':'0.45';}
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
  // Monday-first: convert Sun=0…Sat=6 → Mon=0…Sun=6
  const rawFirst=new Date(y,m,1).getDay();
  const firstDay=(rawFirst+6)%7;
  const daysInMonth=new Date(y,m+1,0).getDate();
  const today=td();
  // Build a map of date→{entries, targets, obs, reviews}
  const dateMap={};
  const _ensureDay=function(d){if(!dateMap[d])dateMap[d]={entries:[],targets:[],obs:[],reviews:[]};};
  wl.forEach(function(e){
    if(e.raceDate){_ensureDay(e.raceDate);dateMap[e.raceDate].entries.push(e);}
    (e.targets||[]).forEach(function(t){
      if(t.date){_ensureDay(t.date);dateMap[t.date].targets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});}
    });
    (e.observations||[]).forEach(function(o){
      if(o.date){_ensureDay(o.date);dateMap[o.date].obs.push({horse:e.horse,horseId:e.id,obs:o});}
    });
  });
  // Add reviews to date map
  (D.reviews||[]).forEach(function(r){
    const d=r.date;if(!d)return;
    _ensureDay(d);
    const entry=wl.find(function(e){return e.id===r.profileId;});
    dateMap[d].reviews.push({horse:entry?entry.horse:r.raceName||'',horseId:r.profileId,review:r});
  });
  // Day headers — Mon first
  const dayNames=['M','T','W','T','F','S','S'];
  let html=dayNames.map(function(d){return'<div class="wl-cal-day-hdr">'+d+'</div>';}).join('');
  for(let i=0;i<firstDay;i++)html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const dayData=dateMap[dateStr]||{entries:[],targets:[],obs:[],reviews:[]};
    const {entries,targets:dayTargets,obs:dayObs,reviews:dayReviews}=dayData;
    const isToday=dateStr===today;
    const isPast=dateStr<today;
    const hasAny=entries.length||dayTargets.length||dayObs.length||dayReviews.length;
    const fixtures=getFixtureForDate(dateStr);
    const fixtureBar=fixtures.length?'<div class="wl-cal-fixture-bar" style="background:'+fixtures[0].colour+';" title="'+fixtures[0].name+'"></div>':'';
    // Past targets with no review get a warning indicator
    const hasUnreviewed=isPast&&dayTargets.some(function(dt){return!_targetReviewed(dt.horseId,dateStr,dt.target.race||'');});
    const dots=[];
    if(entries.length)dots.push('<div class="wl-cal-dot" style="background:var(--gld2);"></div>');
    if(dayTargets.length)dots.push('<div class="wl-cal-dot" style="background:'+(hasUnreviewed?'var(--red)':'var(--ora)')+';" title="'+(hasUnreviewed?'Needs review':'Target')+'"></div>');
    if(dayObs.length)dots.push('<div class="wl-cal-dot" style="background:var(--grn);"></div>');
    if(dayReviews.length)dots.push('<div class="wl-cal-dot" style="background:#60a5fa;"></div>');
    html+='<div onclick="wlSelectDay(\''+dateStr+'\')" class="wl-cal-cell'+(isToday?' wl-cal-cell-today':'')+'">'
      +'<div class="wl-cal-num '+(isToday?'wl-cal-num-today':hasAny?'wl-cal-num-active':'wl-cal-num-empty')+'">'+d+'</div>'
      +(hasAny?'<div class="wl-cal-dots">'+dots.join('')+'</div>':'<div style="height:7px;"></div>')+fixtureBar
    +'</div>';
  }
  grid.innerHTML=html;
  // Auto-select today (or first event day in the month if today is another month)
  const autoDay=dateMap[today]?today:null;
  if(autoDay)wlSelectDay(autoDay);else{const selDay=document.getElementById('wl-cal-day-entries');if(selDay)selDay.innerHTML='';}
}

function wlSelectDay(dateStr){
  const wl=getWL();
  const entries=wl.filter(function(e){return e.raceDate===dateStr;});
  const dayTargets=[],dayObs=[],dayReviews=[];
  const isPast=dateStr<td();
  wl.forEach(function(e){
    (e.targets||[]).forEach(function(t){
      if(t.date===dateStr)dayTargets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});
    });
    (e.observations||[]).forEach(function(o){
      if(o.date===dateStr)dayObs.push({horse:e.horse,horseId:e.id,obs:o});
    });
  });
  (D.reviews||[]).forEach(function(r){
    if(r.date!==dateStr)return;
    const entry=wl.find(function(e){return e.id===r.profileId;});
    dayReviews.push({horse:entry?entry.horse:r.raceName||'',horseId:r.profileId,review:r});
  });
  const el=document.getElementById('wl-cal-day-entries');if(!el)return;
  const dayFixtures=getFixtureForDate(dateStr);
  const fixtureBanner=dayFixtures.map(function(f){return'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9px;background:rgba(0,0,0,.2);border-left:3px solid '+f.colour+';margin-bottom:8px;"><span>'+f.emoji+'</span><div><div style="font-weight:700;font-size:13px;color:'+f.colour+';">'+f.name+'</div><div style="font-size:11px;color:var(--mut);">'+f.course+'</div></div></div>';}).join('');
  const dayLabel='<div class="wl-day-lbl">'+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})+'</div>';
  let html=fixtureBanner+dayLabel;
  // Target race cards
  if(dayTargets.length){
    html+='<div class="wl-day-sec-lbl wl-day-sec-lbl-ora" style="display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>Target Races</div>';
    html+=dayTargets.map(function(d){
      const t=d.target;
      const reviewed=_targetReviewed(d.horseId,dateStr,t.race||'');
      const needsReview=isPast&&!reviewed;
      return'<div data-wl-id="'+d.horseId+'" class="wl-day-target" style="'+(needsReview?'border-left:3px solid var(--red);':'')+'">'
        +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">'
          +'<div style="flex:1;min-width:0;">'
            +'<div class="wl-day-target-horse">'+d.horse+'</div>'
            +orSummaryLine(d)
            +(d.trainer?'<div class="wll-sub">'+d.trainer+'</div>':'')
            +'<div class="wl-day-target-race">'+t.race+(t.track?' · '+t.track:'')+'</div>'
            +(t.condition?'<div class="wl-day-target-cond">'+t.condition+'</div>':'')
          +'</div>'
          +(needsReview?'<button onclick="event.stopPropagation();openWLPostRaceReview(\''+d.horseId+'\',\''+jsq(d.horse)+'\',\'\',\'\',\''+jsq(t.race||'')+'\')" style="flex-shrink:0;padding:4px 8px;border-radius:6px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.1);color:var(--red);font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;white-space:nowrap;">Review</button>':'')
        +'</div>'
      +'</div>';
    }).join('');
  }
  // Observations
  if(dayObs.length){
    html+='<div class="wl-day-sec-lbl wl-day-sec-lbl-grn" style="display:flex;align-items:center;gap:5px;'+(dayTargets.length?'margin-top:10px;':'')+'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Observations</div>';
    html+=dayObs.map(function(d){
      const o=d.obs;
      return'<div data-wl-id="'+d.horseId+'" class="wl-day-obs">'
        +'<div class="wl-day-obs-horse">'+d.horse+'</div>'
        +(o.raceName?'<div class="wll-sub">'+o.raceName+'</div>':'')
        +'<div class="wl-day-obs-chips">'
          +(o.result?'<span class="wl-day-obs-result">'+o.result+'</span>':'')
          +(o.going?'<span class="wl-day-obs-going">'+o.going+'</span>':'')
        +'</div>'
        +(o.notes?'<div class="wl-day-obs-notes">'+o.notes+'</div>':'')
      +'</div>';
    }).join('');
  }
  // Reviews
  if(dayReviews.length){
    const RCOL={win:'#4ade80',place:'#f59e0b',unplaced:'#f87171',nr:'var(--mut)',missed:'#a78bfa',watched:'#60a5fa'};
    html+='<div class="wl-day-sec-lbl" style="display:flex;align-items:center;gap:5px;color:#60a5fa;'+(dayTargets.length||dayObs.length?'margin-top:10px;':'')+'">'
      +'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Reviews</div>';
    html+=dayReviews.map(function(d){
      const r=d.review;
      const rc=RCOL[r.result]||'var(--mut)';
      // First review = no other review for this horse has an earlier date
      const allProfileReviews=(D.reviews||[]).filter(function(x){return x.profileId===d.horseId;});
      const isFirstReview=allProfileReviews.length===1||(allProfileReviews.every(function(x){return(x.date||'')>=(r.date||'');}));
      return'<div data-wl-id="'+d.horseId+'" class="wl-day-obs" style="border-left:3px solid #60a5fa33;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
          +'<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">'
            +'<div class="wl-day-obs-horse" style="margin:0;">'+d.horse+'</div>'
            +(isFirstReview?'<span style="font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#ef4444;flex-shrink:0;">NEW</span>':'')
          +'</div>'
          +(r.result?'<span style="font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+rc+'20;border:1px solid '+rc+'40;color:'+rc+';">'+r.result+'</span>':'')
        +'</div>'
        +(r.raceName||r.course?'<div class="wll-sub" style="margin-top:3px;">'+(r.raceName||'')+(r.course&&r.raceName?' · ':''+(r.course||''))+'</div>':'')
        +((r.distance||r.going||r.raceClass)?'<div class="wl-day-obs-chips" style="margin-top:4px;">'
          +(r.distance?'<span class="wl-day-obs-going">'+r.distance+'</span>':'')
          +(r.going?'<span class="wl-day-obs-going">'+r.going+'</span>':'')
          +(r.raceClass?'<span class="wl-day-obs-going">C'+r.raceClass+'</span>':'')
        +'</div>':'')
        +(r.notes?'<div class="wl-day-obs-notes" style="margin-top:4px;">'+r.notes+'</div>':'')
      +'</div>';
    }).join('');
  }
  // Profiler entries
  if(entries.length){
    if(dayTargets.length||dayObs.length||dayReviews.length)html+='<div class="wl-day-sec-lbl wl-day-sec-lbl-pur" style="margin-top:10px;">Puzzle Profiler</div>';
    html+=entries.map(function(e){return renderWLEntry(e);}).join('');
  }
  if(!entries.length&&!dayTargets.length&&!dayObs.length&&!dayReviews.length){
    html+='<div class="wl-day-empty">No activity on '+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'.</div>';
  }
  el.innerHTML=html;
  el.querySelectorAll('[data-wl-id]').forEach(function(el2){el2.addEventListener('click',function(){openWLProfile(el2.getAttribute('data-wl-id'));});});
}

// Track which profiler groups are expanded (session only — resets to all collapsed)
const _wlGroupOpen={};

function wlToggleGroup(r){
  _wlGroupOpen[r]=!_wlGroupOpen[r];
  renderWLList();
}

// ─── PROFILER FILTERS ───
let _wlFilter=null; // null = all, or one of: 'no-obs','past-target','running-today','edge'
let _wlGroupBy='reason'; // 'reason' | 'race-type' | 'surface' | 'age'
let _wlShowCold=false;

const BR_STAGES=[
  {id:'watching',   label:'Watching',       col:'#94a3b8'},
  {id:'interesting',label:'Interesting',    col:'#60a5fa'},
  {id:'on-radar',   label:'On Radar',       col:'#f59e0b'},
  {id:'ready',      label:'Ready to Back',  col:'#10b981'},
  {id:'cold',       label:'Cold',           col:'#a78bfa'},
];
function _brStage(e){return BR_STAGES.find(function(s){return s.id===(e.betReadiness||'watching');})||BR_STAGES[0];}
function wlSetReadiness(id,status,ev){
  if(ev){ev.stopPropagation();}
  const wl=getWL();
  const entry=wl.find(function(x){return x.id===id;});
  if(!entry)return;
  entry.betReadiness=status;
  entry.updatedAt=Date.now();
  D.watchlist=wl;
  save();
  renderWLList();
}
function wlToggleBRPicker(profileId){
  const existing=document.getElementById('wl-br-sheet');
  if(existing){existing.remove();return;}
  const wl=getWL();
  const entry=wl.find(function(x){return x.id===profileId;})||{};
  const cur=entry.betReadiness||'watching';
  const sheet=document.createElement('div');
  sheet.id='wl-br-sheet';
  sheet.style.cssText='position:fixed;inset:0;z-index:800;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;';
  sheet.innerHTML='<div style="background:var(--sur);border-radius:16px 16px 0 0;width:100%;max-width:520px;padding:16px;padding-bottom:max(20px,env(safe-area-inset-bottom,20px));">'
    +'<div style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:12px;text-align:center;">Bet Readiness</div>'
    +BR_STAGES.map(function(s){
      const active=s.id===cur;
      return'<button onclick="wlSetReadiness(\''+profileId+'\',\''+s.id+'\',event);document.getElementById(\'wl-br-sheet\').remove();openWLProfile(\''+profileId+'\')" '
        +'style="display:flex;align-items:center;gap:12px;width:100%;padding:13px 14px;border-radius:10px;border:1px solid '+(active?s.col+'50':'transparent')+';background:'+(active?s.col+'15':'transparent')+';color:var(--txt);font-size:14px;font-weight:'+(active?'800':'600')+';cursor:pointer;text-align:left;margin-bottom:4px;">'
        +'<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:'+s.col+';flex-shrink:0;box-shadow:0 0 0 3px '+s.col+'33;"></span>'
        +s.label
        +(active?'<span style="margin-left:auto;font-size:10px;color:'+s.col+';">Current</span>':'')
      +'</button>';
    }).join('')
    +'<button onclick="document.getElementById(\'wl-br-sheet\').remove()" style="width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-size:13px;font-weight:700;cursor:pointer;">Cancel</button>'
  +'</div>';
  sheet.addEventListener('click',function(ev){if(ev.target===sheet)sheet.remove();});
  document.body.appendChild(sheet);
}

function wlCycleReadiness(id,ev){
  if(ev){ev.stopPropagation();}
  const wl=getWL();
  const entry=wl.find(function(x){return x.id===id;});
  if(!entry)return;
  const cur=entry.betReadiness||'watching';
  const idx=BR_STAGES.findIndex(function(s){return s.id===cur;});
  const next=BR_STAGES[(idx+1)%BR_STAGES.length];
  entry.betReadiness=next.id;
  entry.updatedAt=Date.now();
  D.watchlist=wl;
  save();
  renderWLList();
}

function setWLGroupBy(g){
  _wlGroupBy=g;
  Object.keys(_wlGroupOpen).forEach(function(k){delete _wlGroupOpen[k];});
  renderWLList();
}

// Derive grouping key + metadata from a profile entry
function _wlGroupKey(e){
  if(_wlGroupBy==='reason') return e.reason||'eye-catcher';

  if(_wlGroupBy==='race-type'){
    return e.raceType||'unclassified';
  }

  if(_wlGroupBy==='surface'){
    return e.surface||'unknown-surface';
  }

  if(_wlGroupBy==='age'){
    const age=parseInt(e.age)||0;
    if(age===2)return '2yo';
    if(age===3)return '3yo';
    if(age>=4)return '4yo+';
    return 'unknown';
  }

  return e.reason||'eye-catcher';
}

const _WL_GROUP_META={
  // reason groups
  'eye-catcher':  {label:'Eye Catchers',  col:'#a78bfa'},
  'future-target':{label:'Future Targets',col:'#34d399'},
  'trainer-intel':{label:'Trainer Intel', col:'#38bdf8'},
  'form-study':   {label:'Form Study',    col:'#f59e0b'},
  'tip-source':   {label:'Tips & Sources',col:'#fb7185'},
  // race-type groups
  'handicap':     {label:'Handicappers',  col:'#6366f1'},
  'group':        {label:'Group / Listed',col:'#ec4899'},
  'maiden':       {label:'Maidens',       col:'#f59e0b'},
  'claimer':      {label:'Claimers',      col:'#64748b'},
  'unclassified': {label:'Not Set',       col:'#94a3b8'},
  // surface groups
  'flat':           {label:'Flat',          col:'#22c55e'},
  'jumps':          {label:'Jumps / NH',    col:'#f97316'},
  'aw':             {label:'All Weather',   col:'#06b6d4'},
  'unknown-surface':{label:'Not Set',       col:'#94a3b8'},
  // age groups
  '2yo':          {label:'2-Year-Olds',   col:'#a855f7'},
  '3yo':          {label:'3-Year-Olds',   col:'#3b82f6'},
  '4yo+':         {label:'4yo & Older',   col:'#14b8a6'},
  'unknown':      {label:'Age Unknown',   col:'#94a3b8'},
};

const _WL_GROUPBY_ORDER={
  reason:      ['form-study','eye-catcher','trainer-intel','tip-source','future-target'],
  'race-type': ['handicap','group','maiden','claimer','unclassified'],
  surface:     ['flat','jumps','aw','unknown-surface'],
  age:         ['2yo','3yo','4yo+','unknown'],
};

// Insight filters only — admin tasks handled by the "Needs Attention" button
const WL_FILTERS=[
  {id:'running-today', label:'Running Today', title:'Horses from your profiler confirmed in today\'s racecards',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v14M5 3l10 3.5L5 10"/></svg>'},
  {id:'edge',          label:'Edge',          title:'Your rating is above the official rating — potential value',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 14 7 9 11 12 17 5"/><polyline points="14 5 17 5 17 8"/></svg>'},
  {id:'ready',         label:'Ready to Back', title:'Horses you have marked as ready to back',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><polyline points="6 10 9 13 14 7"/></svg>'},
];

// True if a review is missing distance, class or ground
function _rvwIncomplete(r){
  if(r.result==='nr'||r.result==='missed')return false;
  return !r.distance||!r.raceClass||!(r.going||r.groundConditions);
}

// Count horses that need admin attention (union of all admin task conditions)
function _targetReviewed(profileId,targetDate,raceName){
  const tMs=targetDate?new Date(targetDate+'T00:00:00').getTime():null;
  const rn=(raceName||'').toLowerCase().trim();
  return(D.reviews||[]).some(function(r){
    if(r.profileId!==profileId)return false;
    // Match by race name (if both sides have one)
    const rrn=(r.raceName||'').toLowerCase().trim();
    if(rn&&rrn&&(rrn===rn||rrn.includes(rn)||rn.includes(rrn)))return true;
    // Match by date within 7 days
    if(tMs&&r.date){const dMs=new Date(r.date+'T00:00:00').getTime();if(Math.abs(dMs-tMs)<=7*24*60*60*1000)return true;}
    return false;
  });
}
function _wlAttentionCount(entries){
  const today=td();
  const ids=new Set();
  entries.forEach(function(e){
    if(!e.unraced&&!(D.reviews||[]).some(function(r){return r.profileId===e.id;}))ids.add(e.id);
    if((e.targets||[]).some(function(t){return t.date&&t.date<today&&!_targetReviewed(e.id,t.date,t.race);}))ids.add(e.id);
    if((e.targets||[]).some(function(t){return t.race&&!t.date;}))ids.add(e.id);
    const rvws=(D.reviews||[]).filter(function(r){return r.profileId===e.id;});
    if(rvws.length&&rvws.some(_rvwIncomplete))ids.add(e.id);
  });
  return ids.size;
}

function _wlToggleCold(){_wlShowCold=!_wlShowCold;renderWLList();}

function wlShowRatedList(){
  const existing=document.getElementById('wl-rated-modal');if(existing)existing.remove();

  // Profiles with MR set
  const profileRows=getWL().filter(function(e){return parseFloat(e.myRating)>0;}).slice().sort(function(a,b){return(parseFloat(b.myRating)||0)-(parseFloat(a.myRating)||0);});
  // Quick ratings for horses without a profile
  const profileHorseNames=new Set(getWL().map(function(e){return(e.horse||'').toLowerCase().trim();}));
  const quickRows=Object.entries(D.ratings||{}).filter(function(kv){return!profileHorseNames.has(kv[0]);}).map(function(kv){return{horse:kv[0],mr:kv[1].mr||''};}).sort(function(a,b){return(parseFloat(b.mr)||0)-(parseFloat(a.mr)||0);});

  const modal=document.createElement('div');
  modal.id='wl-rated-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;';

  let rows='';
  if(profileRows.length){
    rows+='<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);padding:10px 16px 6px;">Profiles with MR</div>';
    rows+=profileRows.map(function(e){
      const or=e.currentRating?'<span style="font-size:11px;color:var(--mut);margin-left:4px;">OR '+e.currentRating+'</span>':'';
      const diff=parseFloat(e.myRating)-(parseFloat(e.currentRating)||0);
      const diffStr=diff>0?'<span style="font-size:10px;color:#4ade80;margin-left:4px;">+'+diff+'</span>':diff<0?'<span style="font-size:10px;color:#f87171;margin-left:4px;">'+diff+'</span>':'';
      return'<div onclick="document.getElementById(\'wl-rated-modal\').remove();openWLProfile(\''+e.id+'\')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--bdr);cursor:pointer;active:background:var(--sur2);">'
        +'<div>'
          +'<div style="font-size:14px;font-weight:700;color:var(--txt);">'+e.horse+'</div>'
          +(e.trainer?'<div style="font-size:11px;color:var(--mut);">'+e.trainer+'</div>':'')
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:4px;">'
          +or+diffStr
          +'<span style="font-size:16px;font-weight:800;color:#d97706;min-width:36px;text-align:right;">'+e.myRating+'</span>'
          +'<span style="font-size:10px;font-weight:700;color:var(--mut);">MR</span>'
        +'</div>'
      +'</div>';
    }).join('');
  }
  if(quickRows.length){
    rows+='<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);padding:10px 16px 6px;">Quick Ratings (no profile)</div>';
    rows+=quickRows.map(function(q){
      return'<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--bdr);">'
        +'<div style="font-size:14px;font-weight:700;color:var(--txt);text-transform:capitalize;">'+q.horse+'</div>'
        +'<div style="display:flex;align-items:center;gap:4px;">'
          +'<span style="font-size:16px;font-weight:800;color:#d97706;">'+q.mr+'</span>'
          +'<span style="font-size:10px;font-weight:700;color:var(--mut);">MR</span>'
        +'</div>'
      +'</div>';
    }).join('');
  }
  if(!profileRows.length&&!quickRows.length){
    rows='<div style="text-align:center;padding:40px 20px;font-size:14px;color:var(--mut);">No rated horses yet.<br>Use the MR field on a profile or tap MR on the racecard.</div>';
  }

  modal.innerHTML=
    '<div style="width:100%;max-width:480px;max-height:80vh;background:var(--sur);border-radius:16px 16px 0 0;overflow:hidden;display:flex;flex-direction:column;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--bdr);flex-shrink:0;">'
        +'<div style="font-size:15px;font-weight:800;color:var(--txt);">Rated Horses <span style="font-size:13px;font-weight:400;color:var(--mut);">'+((profileRows.length+quickRows.length))+' total</span></div>'
        +'<button onclick="document.getElementById(\'wl-rated-modal\').remove()" style="background:none;border:none;font-size:20px;color:var(--mut);cursor:pointer;padding:0 4px;">✕</button>'
      +'</div>'
      +'<div style="overflow-y:auto;-webkit-overflow-scrolling:touch;">'+rows+'</div>'
    +'</div>';

  document.body.appendChild(modal);
  modal.addEventListener('click',function(ev){if(ev.target===modal)modal.remove();});
}

function setWLFilter(id){
  _wlFilter=(_wlFilter===id)?null:id; // toggle off if already active
  renderWLList();
}

function _applyWLFilter(entries){
  if(!_wlFilter) return entries;
  const today=td();
  if(_wlFilter==='needs-attention'){
    return entries.filter(function(e){
      const noReviews=!e.unraced&&!(D.reviews||[]).some(function(r){return r.profileId===e.id;});
      const pastTarget=(e.targets||[]).some(function(t){return t.date&&t.date<today&&!_targetReviewed(e.id,t.date,t.race);});
      const noDateTarget=(e.targets||[]).some(function(t){return t.race&&!t.date;});
      const rvws=(D.reviews||[]).filter(function(r){return r.profileId===e.id;});
      const incompleteReview=rvws.length&&rvws.some(_rvwIncomplete);
      return noReviews||pastTarget||noDateTarget||incompleteReview;
    });
  }
  if(_wlFilter==='running-today'){
    const cache=window._todayMeetingsCache;
    if(!cache) return [];
    const races=cache.racecards||cache.races||[];
    const runningNames=new Set();
    races.forEach(function(race){
      (race.runners||race.horses||[]).forEach(function(r){
        runningNames.add((r.horse||r.name||'').toLowerCase().trim());
      });
    });
    return entries.filter(function(e){
      return runningNames.has((e.horse||'').toLowerCase().trim());
    });
  }
  if(_wlFilter==='edge'){
    return entries.filter(function(e){
      const mr=parseFloat(e.myRating), or=parseFloat(e.currentRating);
      return !isNaN(mr)&&!isNaN(or)&&mr>or;
    });
  }
  if(_wlFilter==='ready'){
    return entries.filter(function(e){return e.betReadiness==='ready';});
  }
  // Default: hide Cold unless toggled on
  if(!_wlShowCold){
    return entries.filter(function(e){return (e.betReadiness||'watching')!=='cold';});
  }
  return entries;
}

// ── Silk colour palette — deterministic from horse name ──
function _silkColors(str){
  let h=0;for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;}
  const PALETTES=[
    {body:'#7c3aed',accent:CLR_WATCH},{body:'#ef4444',accent:'#ffffff'},
    {body:'#0ea5e9',accent:'#fbbf24'},{body:'#16a34a',accent:'#fbbf24'},
    {body:'#db2777',accent:'#ffffff'},{body:'#d97706',accent:'#1e1e2e'},
    {body:'#0891b2',accent:CLR_WATCH},{body:'#7c3aed',accent:'#4ade80'},
    {body:'#be185d',accent:'#fbbf24'},{body:'#1d4ed8',accent:CLR_WATCH},
    {body:'#065f46',accent:'#ffffff'},{body:'#92400e',accent:'#ffffff'},
  ];
  return PALETTES[Math.abs(h)%PALETTES.length];
}

function _silkSVG(horse,size){
  // Placeholder — will be replaced with real silks when API is upgraded
  size=size||18;
  const s=Math.round(size*1.8);
  return'<svg width="'+s+'" height="'+s+'" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">'
    +'<circle cx="18" cy="18" r="18" fill="#e2e6eb"/>'
    +'<circle cx="18" cy="14" r="5" fill="#9ca3af"/>'
    +'<path d="M8 30c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#9ca3af"/>'
  +'</svg>';
}

// ── List CSS — injected once ──
function _injectAlbumCSS(){
  const existing=document.getElementById('wl-album-css');
  if(existing)existing.remove();
  const s=document.createElement('style');
  s.id='wl-album-css';
  s.textContent=`
    .wll-wrap{padding:0 0 24px;}
    .wll-stats{display:flex;gap:6px;margin:0 0 14px;}
    .wll-stat{flex:1;background:var(--sur2);border:1px solid var(--bdr);border-radius:9px;padding:8px 10px;text-align:center;}
    .wll-stat-n{font-family:var(--font);font-size:20px;font-weight:800;letter-spacing:.5px;color:var(--txt);}
    .wll-stat-l{font-family:var(--font);font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);margin-top:1px;}
    .wll-sec{display:flex;align-items:center;gap:8px;padding:10px 0 6px;border-bottom:1px solid var(--bdr);margin-bottom:4px;}
    .wll-sec-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
    .wll-sec-lbl{font-family:var(--font);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;flex:1;}
    .wll-sec-cnt{font-family:var(--font);font-size:10px;color:var(--mut);}
    .wll-row{display:flex;align-items:center;border-left:3px solid;padding:10px 10px 10px 12px;margin-bottom:6px;background:var(--sur2);border-radius:0 9px 9px 0;cursor:pointer;transition:background .12s;}
    .wll-row:active{background:var(--dim);}
    .wll-silks{width:30px;height:30px;border-radius:50%;background:var(--sur);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px;}
    .wll-main{flex:1;min-width:0;}
    .wll-name{font-family:var(--font);font-size:16px;font-weight:600;letter-spacing:.2px;color:var(--txt);line-height:1;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .wll-sub{font-size:11px;color:var(--mut);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .wll-tag{display:inline-flex;align-items:center;gap:3px;font-family:var(--font);font-size:8px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:1px 6px;border-radius:3px;}
    .wll-right{display:flex;gap:5px;align-items:center;flex-shrink:0;margin-left:10px;}
    .wll-rating{display:flex;flex-direction:column;align-items:center;background:var(--sur);border:1px solid var(--bdr);border-radius:7px;padding:4px 7px;min-width:38px;}
    .wll-rating-lbl{font-family:var(--font);font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);}
    .wll-rating-val{font-family:var(--font);font-size:15px;font-weight:800;letter-spacing:.5px;line-height:1.1;}
    .wll-empty{font-family:var(--font);font-size:13px;color:var(--mut);font-style:italic;text-align:center;padding:40px 20px;}
  `;
  document.head.appendChild(s);
}

function renderWLList(){
  const wl=getWL();
  const search=(document.getElementById('wl-search')||{value:''}).value.toLowerCase();
  let entries=[...wl].sort(function(a,b){return(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
  if(search)entries=entries.filter(function(e){return(e.horse||'').toLowerCase().includes(search)||(e.trainer||'').toLowerCase().includes(search)||(e.reasonNote||'').toLowerCase().includes(search);});

  // ── Filter chips ──
  const el=document.getElementById('wl-list');if(!el)return;
  const filterBar=document.getElementById('wl-filter-bar');
  if(filterBar){
    filterBar.style.cssText='display:flex;gap:6px;flex-wrap:nowrap;align-items:center;padding:10px 0 6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;';
    filterBar.innerHTML='';
    // Insight pills
    WL_FILTERS.forEach(function(f){
      const on=_wlFilter===f.id;
      const btn=document.createElement('button');
      btn.setAttribute('data-fid',f.id);
      btn.title=f.title;
      btn.innerHTML='<span style="display:flex;align-items:center;gap:5px;">'+f.svg+'<span>'+f.label+'</span></span>';
      btn.style.cssText='font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:14px;cursor:pointer;white-space:nowrap;transition:all .12s;'
        +(on?'background:var(--navy);color:#fff;border:1px solid var(--navy);':'background:var(--sur);color:var(--mut);border:1px solid var(--bdr);');
      btn.addEventListener('click',function(){setWLFilter(f.id);});
      filterBar.appendChild(btn);
    });
    // Needs attention button — pushed to the right
    const allEntries=getWL();
    const attnCount=_wlAttentionCount(allEntries);
    if(attnCount>0){
      const on=_wlFilter==='needs-attention';
      const attnBtn=document.createElement('button');
      attnBtn.style.cssText='flex-shrink:0;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:14px;cursor:pointer;white-space:nowrap;transition:all .12s;display:flex;align-items:center;gap:5px;'
        +(on?'background:#92400e;color:#fbbf24;border:1px solid #b45309;':'background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.35);');
      attnBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        +attnCount+' need attention';
      attnBtn.addEventListener('click',function(){setWLFilter('needs-attention');});
      filterBar.appendChild(attnBtn);
    }
  }

  // Apply active filter
  entries=_applyWLFilter(entries);

  if(!entries.length){
    if(_wlFilter){
      const filterLabel=_wlFilter==='needs-attention'?'Needs Attention':(WL_FILTERS.find(function(f){return f.id===_wlFilter;})||{label:_wlFilter}).label;
      el.innerHTML='<div class="wll-empty">No profiles match the <strong>'+filterLabel+'</strong> filter.</div>';
    } else if(search){
      el.innerHTML='<div class="wll-empty">No profiles match "'+search+'".</div>';
    } else {
      el.innerHTML='<div style="text-align:center;padding:36px 20px;">'
        +'<div style="font-size:40px;margin-bottom:14px;">🐴</div>'
        +'<div style="font-family:var(--font);font-size:17px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:8px;">Your Profiler is empty</div>'
        +'<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:6px;">Build private profiles for every horse you follow — track ratings, going preferences, trainer intel, and race targets.</div>'
        +'<div style="font-size:12px;color:var(--mut);line-height:1.6;margin-bottom:20px;">When they\'re declared to run, they\'ll appear on your Today card automatically.</div>'
        +'<button onclick="wlNew()" style="padding:11px 24px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:var(--font);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">+ Add First Horse</button>'
        +'</div>';
    }
    return;
  }

  const REASON_ORDER=['form-study','eye-catcher','trainer-intel','tip-source','future-target'];
  const REASON_SVG={
    'eye-catcher':   '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>',
    'future-target': '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/></svg>',
    'trainer-intel': '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13a8 8 0 1 0-8 5h8v-5z"/></svg>',
    'form-study':    '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V9M8 15V5M12 15V11M16 15V7"/></svg>',
    'tip-source':    '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a6 6 0 0 1 4.47 10.06A4 4 0 0 1 13 15H7a4 4 0 0 1-1.47-2.94A6 6 0 0 1 10 2z"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="9" y1="21" x2="11" y2="21"/></svg>',
  };
  const REASON_META={
    'eye-catcher': {emoji:'🔭',label:'Eye Catcher',  labelPlural:'Eye Catchers',  col:'#a78bfa'},
    'future-target':{emoji:'📰',label:'Future Target',labelPlural:'Future Targets',col:'#34d399'},
    'trainer-intel':{emoji:'🗣',label:'Trainer Intel',labelPlural:'Trainer Intel', col:'#38bdf8'},
    'form-study':   {emoji:'📊',label:'Form Study',   labelPlural:'Form Study',    col:'#f59e0b'},
    'tip-source':   {emoji:'💡',label:'Tip / Source', labelPlural:'Tips & Sources',col:'#fb7185'},
  };

  const groups={};
  entries.forEach(function(e){const k=_wlGroupKey(e);if(!groups[k])groups[k]=[];groups[k].push(e);});

  const total=entries.length;
  const totalReviews=(D.reviews||[]).filter(function(r){return entries.find(function(e){return e.id===r.profileId;});}).length;
  const totalTargets=entries.reduce(function(a,e){return a+(e.targets||[]).length;},0);
  // MR count — profiles with myRating set, plus quick ratings for horses without a profile
  const profilesWithMR=getWL().filter(function(e){return parseFloat(e.myRating)>0;}).length;
  const profileHorseNames=new Set(getWL().map(function(e){return(e.horse||'').toLowerCase().trim();}));
  const quickRatingsOnly=Object.keys(D.ratings||{}).filter(function(k){return!profileHorseNames.has(k);}).length;
  const totalMR=profilesWithMR+quickRatingsOnly;

  let html='<div class="wll-wrap">';

  const coldCount=getWL().filter(function(e){return e.betReadiness==='cold';}).length;
  const readyCount=getWL().filter(function(e){return e.betReadiness==='ready';}).length;

  // ── Stats strip ──
  html+='<div class="wll-stats">'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:var(--gld2);">'+total+'</div><div class="wll-stat-l">Profiles</div></div>'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:#10b981;">'+readyCount+'</div><div class="wll-stat-l">Ready</div></div>'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:var(--ora);">'+totalTargets+'</div><div class="wll-stat-l">Targets</div></div>'
    +'<div class="wll-stat" onclick="wlShowRatedList()" style="cursor:pointer;" title="View all rated horses"><div class="wll-stat-n" style="color:#d97706;">'+totalMR+'</div><div class="wll-stat-l" style="color:#d97706;">Rated ›</div></div>'
  +'</div>';
  // ── Running Today — pinned section ───────────────────────────────────────
  const _todayRaces=(window._todayMeetingsCache&&(window._todayMeetingsCache.racecards||window._todayMeetingsCache.races))||[];
  // Build map: horse name → set of trainers running today
  const _runningMap={}; // name → [trainerName, ...]
  _todayRaces.forEach(function(race){
    (race.runners||[]).forEach(function(runner){
      if(runner.non_runner||runner.isNonRunner)return;
      if(String(runner.status||'').toLowerCase()==='nr')return;
      if(String(runner.jockey||'').toUpperCase()==='NON-RUNNER'||String(runner.jockey||'').toUpperCase()==='NR')return;
      if(String(runner.number||'').toUpperCase()==='NR')return;
      if(!runner.horse)return;
      const _n=(runner.horse||'').toLowerCase().trim();
      if(!_runningMap[_n])_runningMap[_n]=[];
      const _t=(runner.trainer||runner.trainerName||'').toLowerCase().trim();
      if(_t)_runningMap[_n].push(_t);
    });
  });
  // Match profile entries by horse name only (consistent with the Running Today filter)
  const _runningEntries=entries.filter(function(e){
    const _en=(e.horse||'').toLowerCase().trim();
    return !!_runningMap[_en];
  });
  if(_runningEntries.length){
    html+='<div style="border:1px solid #10b98140;background:#10b98108;border-radius:10px;margin-bottom:10px;overflow:hidden;">'
      +'<div style="padding:9px 14px;background:#10b98118;border-bottom:1px solid #10b98130;display:flex;align-items:center;gap:8px;">'
        +'<span style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px #10b98130;flex-shrink:0;"></span>'
        +'<span style="font-family:var(--font);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#10b981;">Running Today</span>'
        +'<span style="font-size:11px;color:var(--mut);margin-left:auto;">'+_runningEntries.length+' horse'+(  _runningEntries.length>1?'s':'')+'</span>'
      +'</div>';
    _runningEntries.forEach(function(e){
      const or=parseFloat(e.currentRating)||null;
      const mr=parseFloat(e.myRating)||null;
      const edge=(or&&mr)?(mr-or):null;
      const ecol=edge===null?'var(--mut)':edge>0?'#4ade80':edge<0?'#f87171':'#888';
      const br=_brStage(e);
      html+='<div style="padding:10px 14px;border-bottom:1px solid #10b98120;display:flex;align-items:center;gap:10px;cursor:pointer;" data-wl-id="'+e.id+'">'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:14px;font-weight:800;color:var(--txt);">'+_wlpEsc(e.horse||'')+'</div>'
          +'<div style="font-size:11px;color:var(--mut);margin-top:2px;">'+(e.trainer||'')+(function(){const _vgp=(e.goingPrefs||[]).filter(function(g){return['firm','good to firm','good','good to soft','soft','heavy','standard','standard to slow','slow'].includes((g||'').toLowerCase().trim());});return _vgp.length?' · '+_vgp[0]:'';})()+'</div>'
          +'<div style="display:flex;align-items:center;gap:5px;margin-top:4px;">'
            +'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+br.col+';"></span>'
            +'<span style="font-size:10px;font-weight:700;color:'+br.col+';">'+br.label+'</span>'
          +'</div>'
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0;">'
          +(edge!==null?'<div style="font-size:20px;font-weight:900;line-height:1;color:'+ecol+';">'+(edge>0?'+':'')+edge+'</div><div style="font-size:9px;color:var(--mut);">EDGE</div>':or?'<div style="font-size:16px;font-weight:900;color:var(--txt);">'+or+'</div><div style="font-size:9px;color:var(--mut);">OR</div>':'')
        +'</div>'
      +'</div>';
    });
    html+='</div>';
  }

  // Cold toggle
  if(coldCount){
    html+='<div style="text-align:center;margin-bottom:10px;">'
      +'<button onclick="_wlToggleCold()" style="font-size:10px;font-weight:700;color:var(--mut);background:none;border:none;padding:0;cursor:pointer;letter-spacing:.04em;">'
        +(_wlShowCold?'▲ Hide':'▼ Show')+' '+coldCount+' Cold horse'+(coldCount>1?'s':'')
      +'</button>'
    +'</div>';
  }

  // ── Group-by selector ──
  const GB_OPTS=[
    {id:'reason',    label:'By Type'},
    {id:'race-type', label:'Handicap / Group'},
    {id:'surface',   label:'Flat / Jumps / AW'},
    {id:'age',       label:'By Age'},
  ];
  html+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">'
    +GB_OPTS.map(function(o){
      const on=_wlGroupBy===o.id;
      return'<button onclick="setWLGroupBy(\''+o.id+'\')" style="font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:14px;cursor:pointer;white-space:nowrap;transition:all .12s;'
        +(on?'background:var(--navy);color:#fff;border:1px solid var(--navy);':'background:var(--sur);color:var(--mut);border:1px solid var(--bdr);')+'">'+o.label+'</button>';
    }).join('')
  +'</div>';

  // ── Groups ──
  const groupOrder=_WL_GROUPBY_ORDER[_wlGroupBy]||Object.keys(groups);
  // Add any keys not in the predefined order (e.g. custom reason values)
  Object.keys(groups).forEach(function(k){if(!groupOrder.includes(k))groupOrder.push(k);});

  groupOrder.forEach(function(r){
    if(!groups[r]||!groups[r].length)return;
    const rm=_WL_GROUP_META[r]||{label:r,col:'#94a3b8'};
    const grp=groups[r];

    const isOpen=!!_wlGroupOpen[r];
    html+='<div class="wll-cat-hdr" data-grp="'+r+'" style="'
      +'display:flex;align-items:center;gap:10px;'
      +'padding:11px 14px;cursor:pointer;'
      +'background:'+rm.col+';margin-bottom:'+(isOpen?'0':'8px')+';'
      +'border-radius:'+(isOpen?'10px 10px 0 0':'10px')+';'
      +'transition:border-radius .2s;">'
      +'<span style="display:flex;align-items:center;gap:8px;flex:1;color:#fff;">'
        +(REASON_SVG[r]?'<span style="display:flex;align-items:center;opacity:.9;">'+REASON_SVG[r]+'</span>':'')
        +'<span style="font-family:var(--font);font-size:14px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;">'+(rm.labelPlural||rm.label)+'</span>'
      +'</span>'
      +'<span style="font-family:var(--font);font-size:12px;font-weight:700;color:rgba(255,255,255,.75);margin-right:6px;">'+grp.length+'</span>'
      +'<span style="color:rgba(255,255,255,.85);font-size:18px;line-height:1;display:inline-block;transition:transform .2s;'+(isOpen?'transform:rotate(90deg);':'')+'">›</span>'
    +'</div>';
    if(isOpen){
      html+='<div style="border:1px solid '+rm.col+'40;border-top:none;border-radius:0 0 10px 10px;margin-bottom:8px;overflow:hidden;">';
    }
    if(!isOpen){return;}

    grp.forEach(function(e){
      const obs=e.observations||[];
      const targets=e.targets||[];
      const or=parseFloat(e.currentRating)||null;
      const mr=parseFloat(e.myRating)||null;
      const lastObs=obs.length?obs.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');})[0]:null;
      const subParts=[];
      if(e.trainer)subParts.push(e.trainer);
      const _daysAgo=function(ts){if(!ts)return'';const d=Math.floor((Date.now()-ts)/(86400000));return d===0?'today':d===1?'yesterday':d+' days ago';};
      const addedDate=e.createdAt?'Added '+_daysAgo(e.createdAt):'';
      const updatedDate=e.updatedAt&&e.updatedAt!==e.createdAt?'Updated '+_daysAgo(e.updatedAt):'';

      const _cmdBR=_brStage(e);
      const _cmdBRDot='<span onclick="wlCycleReadiness(\''+e.id+'\',event)" title="Bet Readiness: '+_cmdBR.label+' — tap to change" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+_cmdBR.col+';flex-shrink:0;cursor:pointer;margin-right:7px;vertical-align:middle;box-shadow:0 0 0 2px '+_cmdBR.col+'33;"></span>';
      const _cmdPuzzleBadge=e.aiAssessment
        ?'<span title="Puzzle Report generated" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:3px;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.35);flex-shrink:0;vertical-align:middle;margin-left:6px;">'
          +'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/></svg>'
        +'</span>'
        :'';
      const _cmdAwaitingCount=(function(){
        const todayS=td();
        const rvDates=(D.reviews||[]).filter(function(rv){return rv.profileId===e.id;}).map(function(rv){return rv.date||'';});
        const ov=(e.targets||[]).filter(function(t){
          if(!t.date||t.date>=todayS)return false;
          const tMs=new Date(t.date+'T00:00:00').getTime();
          return!rvDates.some(function(d){return Math.abs(new Date(d+'T00:00:00').getTime()-tMs)<=7*24*60*60*1000;});
        }).length;
        const pv=(D.pendingReviews||[]).filter(function(p){
          if(p.profileId!==e.id)return false;
          return!_targetReviewed(e.id,p.date,p.raceName||p.race||'');
        }).length;
        return ov+pv;
      })();
      // Attention reasons — shown when needs-attention filter is active
      const _attnTags=(function(){
        if(_wlFilter!=='needs-attention')return'';
        const today=td();
        const reasons=[];
        if(!e.unraced&&!(D.reviews||[]).some(function(r){return r.profileId===e.id;}))
          reasons.push('No reviews yet');
        if((e.targets||[]).some(function(t){return t.date&&t.date<today&&!_targetReviewed(e.id,t.date,t.race);}))
          reasons.push('Past target');
        if((e.targets||[]).some(function(t){return t.race&&!t.date;}))
          reasons.push('Undated target');
        const rvws=(D.reviews||[]).filter(function(r){return r.profileId===e.id;});
        if(rvws.length&&rvws.some(_rvwIncomplete)){
          const missing=[];
          if(rvws.some(function(r){return!r.distance;}))missing.push('distance');
          if(rvws.some(function(r){return!r.raceClass;}))missing.push('class');
          if(rvws.some(function(r){return!(r.going||r.groundConditions);}))missing.push('ground');
          reasons.push('Reviews missing '+missing.join(' / '));
        }
        return reasons.length
          ?'<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">'
            +reasons.map(function(label){
              return'<span style="font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#f59e0b;">⚠ '+label+'</span>';
            }).join('')
          +'</div>'
          :'';
      })();

      html+='<div style="position:relative;border-bottom:1px solid var(--bdr);" data-wl-id="'+e.id+'">'
        +'<div class="wll-row" style="border-left:none;border-bottom:none;">'
          +'<div class="wll-silks">'+_silkSVG(e.horse||'?',18)+'</div>'
          +'<div class="wll-main">'
            +'<div class="wll-name">'+_cmdBRDot+(e.horse||'Unknown')+_cmdPuzzleBadge+(_cmdAwaitingCount?'<span style="font-size:9px;font-weight:800;margin-left:6px;padding:1px 6px;border-radius:8px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.35);color:#f59e0b;vertical-align:middle;">'+_cmdAwaitingCount+' due</span>':'')+(e.needsReview?'<span class="wll-review-badge">REVIEW</span>':'')+'</div>'
            +'<div class="wll-sub">'+subParts.join(' · ')+'</div>'
            +_attnTags
            +'<div class="wll-tag" style="background:'+rm.col+'14;border:1px solid '+rm.col+'28;color:'+rm.col+';">'+(REASON_SVG[r]?REASON_SVG[r]+' ':'')+rm.label+'</div>'
            +(function(){const nxt=(e.targets||[]).filter(function(t){return t.date&&t.date>=td();}).sort(function(a,b){return a.date.localeCompare(b.date);})[0]||null;return nxt?'<div style="display:flex;align-items:center;gap:5px;margin-top:4px;font-size:10px;color:var(--gld);font-weight:700;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+fdate(nxt.date)+(nxt.track?' · '+nxt.track:'')+'</div>':'';})()+
          '</div>'
          +(function(){const edge=(or&&mr)?(mr-or):null;const ecol=edge===null?'var(--mut)':edge>0?'#4ade80':edge<0?'#f87171':'#888';return'<div class="wll-right" style="min-width:52px;text-align:right;">'+(edge!==null?'<div style="font-size:20px;font-weight:900;line-height:1;color:'+ecol+';">'+(edge>0?'+':'')+edge+'</div><div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-top:1px;">EDGE</div><div style="font-size:9px;color:var(--mut);margin-top:2px;">OR '+or+'</div>':or?'<div style="font-size:16px;font-weight:900;color:var(--txt);">'+or+'</div><div style="font-size:9px;color:var(--mut);">OR</div>':mr?'<div style="font-size:16px;font-weight:900;color:#f97316;">'+mr+'</div><div style="font-size:9px;color:var(--mut);">MR</div>':'<div style="font-size:12px;color:var(--mut);">—</div>')+'</div>';})()
        +'</div>'
        +((addedDate||updatedDate)?'<div style="text-align:right;font-size:9px;color:var(--mut);padding:0 12px 5px;letter-spacing:.04em;display:flex;justify-content:flex-end;gap:10px;">'+(addedDate?'<span>'+addedDate+'</span>':'')+(updatedDate?'<span>'+updatedDate+'</span>':'')+'</div>':'')
      +'</div>';
    });
    if(isOpen){html+='</div>';} // close category wrapper
  });

  html+='</div>'; // wll-wrap
  el.innerHTML=html;

  el.querySelectorAll('[data-wl-id]').forEach(function(row){
    row.addEventListener('click',function(ev){
      ev.stopPropagation();
      window._wlProfileSource='tracker';openWLProfile(row.getAttribute('data-wl-id'));
    });
  });
  el.querySelectorAll('[data-grp]').forEach(function(sec){
    sec.addEventListener('click',function(ev){
      ev.stopPropagation();
      wlToggleGroup(sec.getAttribute('data-grp'));
    });
  });
}

function renderWLEntry(e){
  // Used by calendar day panel
  const RMAP={'eye-catcher':{emoji:'🔭',col:'#a78bfa',label:'Eye Catcher'},'future-target':{emoji:'📰',col:'#34d399',label:'Future Target'},'trainer-intel':{emoji:'🗣',col:'#38bdf8',label:'Trainer Intel'},'form-study':{emoji:'📊',col:'#f59e0b',label:'Form Study'},'tip-source':{emoji:'💡',col:'#fb7185',label:'Tip / Source'}};
  const rm=RMAP[e.reason||'eye-catcher']||RMAP['eye-catcher'];
  const obs=e.observations||[];
  const targets=e.targets||[];
  const or=parseFloat(e.currentRating)||null;
  const mr=parseFloat(e.myRating)||null;
  const lastObs=obs.length?obs.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');})[0]:null;
  const daysAgo=lastObs&&lastObs.date?(function(){const d=new Date(lastObs.date+'T00:00:00');const diff=Math.round((new Date()-d)/(1000*60*60*24));return diff===0?'Today':diff===1?'Yesterday':diff>0?diff+'d ago':'Upcoming';}()):'';
  const subParts=[];
  if(e.trainer)subParts.push(e.trainer);
  const comp=_wlCompleteness(e);
  const mom=_wlMomentum(e);
  const compCol=comp.pct>=80?'#4ade80':comp.pct>=50?'#f59e0b':'#f87171';
  const brStage=_brStage(e);
  const brDot='<span onclick="wlCycleReadiness(\''+e.id+'\',event)" title="'+brStage.label+' — tap to change" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+brStage.col+';flex-shrink:0;cursor:pointer;margin-right:7px;vertical-align:middle;box-shadow:0 0 0 2px '+brStage.col+'33;"></span>';
  // Overdue targets (past date, no review within 7 days)
  const todayStr=td();
  const rvwDates=(D.reviews||[]).filter(function(r){return r.profileId===e.id;}).map(function(r){return r.date||'';});
  const overdueCount=(e.targets||[]).filter(function(t){
    if(!t.date||t.date>=todayStr)return false;
    const tMs=new Date(t.date+'T00:00:00').getTime();
    return!rvwDates.some(function(d){return Math.abs(new Date(d+'T00:00:00').getTime()-tMs)<=7*24*60*60*1000;});
  }).length;
  const pendingCount=(D.pendingReviews||[]).filter(function(p){
    if(p.profileId!==e.id)return false;
    return!(D.reviews||[]).some(function(r){return r.profileId===e.id&&r.date===p.date;});
  }).length;
  const awaitingCount=overdueCount+pendingCount;
  const puzzleBadge=e.aiAssessment
    ?'<span title="Puzzle Report generated" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.35);flex-shrink:0;">'
      +'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
        +'<path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/>'
      +'</svg>'
    +'</span>'
    :'';
  return'<div class="wll-row" style="border-left-color:'+rm.col+';" data-wl-id="'+e.id+'">'
    +'<div class="wll-silks">'+_silkSVG(e.horse||'?',18)+'</div>'
    +'<div class="wll-main">'
      +'<div class="wll-name">'+brDot+(e.horse||'Unknown')+(mom?'<span style="font-size:10px;font-weight:700;margin-left:6px;color:'+mom.col+';">'+mom.icon+'</span>':'')+(awaitingCount?'<span style="font-size:9px;font-weight:800;margin-left:7px;padding:1px 6px;border-radius:8px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.35);color:#f59e0b;vertical-align:middle;">'+awaitingCount+' review'+(awaitingCount>1?'s':'')+' due</span>':'')+'</div>'
      +'<div class="wll-sub">'+subParts.join(' · ')+(daysAgo?' · '+daysAgo:'')+'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">'
        +'<div class="wll-tag" style="background:'+rm.col+'14;border:1px solid '+rm.col+'28;color:'+rm.col+';">'+rm.emoji+' '+rm.label+'</div>'
        +(e.unraced?'<div class="wll-tag" style="background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.25);color:#fb7185;">Unraced</div>':'')
        +puzzleBadge
      +'</div>'
      +(function(){
        const nxt=(e.targets||[]).filter(function(t){return t.date&&t.date>=td();}).sort(function(a,b){return a.date.localeCompare(b.date);})[0]||null;
        if(nxt)return'<div style="display:flex;align-items:center;gap:5px;margin-top:5px;font-size:10px;color:var(--gld);font-weight:700;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+fdate(nxt.date)+(nxt.track?' · '+nxt.track:'')+'</div>';
        return'<div style="display:flex;align-items:center;gap:5px;margin-top:5px;"><div style="flex:1;max-width:70px;height:3px;background:var(--sur2);border-radius:2px;"><div style="height:100%;width:'+comp.pct+'%;background:'+compCol+';border-radius:2px;"></div></div><span style="font-size:9px;color:var(--mut);">'+comp.score+'/12</span></div>';
      })()
    +'</div>'
    +(function(){
      const edge=(or&&mr)?(mr-or):null;
      const ecol=edge===null?'var(--mut)':edge>0?'#4ade80':edge<0?'#f87171':'#888';
      return'<div class="wll-right" style="min-width:52px;text-align:right;">'
        +(edge!==null
          ?'<div style="font-size:20px;font-weight:900;line-height:1;color:'+ecol+';">'+(edge>0?'+':'')+edge+'</div><div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-top:1px;">EDGE</div><div style="font-size:9px;color:var(--mut);margin-top:2px;">OR '+or+'</div>'
          : or
            ?'<div style="font-size:16px;font-weight:900;color:var(--txt);">'+or+'</div><div style="font-size:9px;color:var(--mut);">OR</div>'
            : mr
              ?'<div style="font-size:16px;font-weight:900;color:#f97316;">'+mr+'</div><div style="font-size:9px;color:var(--mut);">MR</div>'
              :'<div style="font-size:12px;color:var(--mut);">—</div>'
        )
      +'</div>';
    })()
  +'</div>';
}




// ── POST-RACE REVIEW SHEET ──
function wlCompletePendingReview(pendingId){
  const p=(D.pendingReviews||[]).find(function(x){return x.id===pendingId;});
  if(!p)return;
  const wl=getWL();
  const entry=wl.find(function(x){return x.id===p.profileId;})||{};
  // Open the review modal pre-filled with all saved race data
  openWLPostRaceReview(p.profileId, entry.horse||p.horse||'', p.course||'', p.result||'', p.raceName||'', p.raceDist||'', p.raceGoing||'', p.raceClass||'');
  setTimeout(function(){
    const d=document.getElementById('rvw-date');if(d)d.value=p.date||'';
    const c=document.getElementById('rvw-course');if(c)c.value=p.course||'';
    const rn=document.getElementById('rvw-racename-prefill');if(rn)rn.value=p.raceName||'';
    const dist=document.getElementById('rvw-dist');if(dist)dist.value=p.raceDist||'';
    const going=document.getElementById('rvw-going-prefill');if(going)going.value=p.raceGoing||'';
    // Select result button if we have it
    if(p.result){
      const rbtn=document.querySelector('.rvw-btn[data-grp="result"][data-result="'+p.result+'"]');
      if(rbtn)wlRvwToggle(rbtn);
    }
    // Fill position if we have it
    if(p.position){
      const posEl=document.getElementById('rvw-pos');if(posEl)posEl.value=p.position;
    }
    // Override save to also clear the pending entry when saved
    const saveBtn=document.getElementById('rvw-save-btn');
    if(saveBtn){
      saveBtn.addEventListener('click',function(){wlDismissPending(pendingId);},{once:true});
    }
  },50);
}

function wlDismissPending(pendingId){
  if(!D.pendingReviews)return;
  D.pendingReviews=D.pendingReviews.filter(function(p){return p.id!==pendingId;});
  save();
}

function openWLEditReview(reviewId){
  const r=(D.reviews||[]).find(function(x){return x.id===reviewId;});
  if(!r)return;
  const wl=getWL();
  const entry=wl.find(function(x){return x.id===r.profileId;})||{};
  openWLPostRaceReview(r.profileId,entry.horse||'',r.course||'','',r.raceName||'',r.distance||'',r.going||'','');
  // After modal opens, populate all fields from existing review
  setTimeout(function(){
    const d=document.getElementById('rvw-date');if(d)d.value=r.date||'';
    const c=document.getElementById('rvw-course');if(c)c.value=r.course||'';
    const dist=document.getElementById('rvw-dist');if(dist)dist.value=r.distance||'';
    const cls=document.getElementById('rvw-class');if(cls)cls.value=r.raceClass||'';
    const pos=document.getElementById('rvw-pos');if(pos)pos.value=r.position||'';
    const beaten=document.getElementById('rvw-beaten');if(beaten)beaten.value=r.beatenDistance||'';
    const odds=document.getElementById('rvw-odds');if(odds)odds.value=r.odds||'';
    const mr=document.getElementById('rvw-mr-adj');if(mr)mr.value=r.mrAdjustment||0;
    const notes=document.getElementById('rvw-notes');if(notes)notes.value=r.notes||'';
    const goingPre=document.getElementById('rvw-going-prefill');if(goingPre)goingPre.value=r.going||'';
    const groundSel=document.getElementById('rvw-ground');if(groundSel)groundSel.value=r.going||r.groundConditions||'';
    // Pre-select toggle buttons
    ['result','verdict','back'].forEach(function(grp){
      const val={result:r.result,verdict:r.verdict}[grp];
      if(!val)return;
      const btn=document.querySelector('.rvw-btn[data-grp="'+grp+'"][data-'+grp+'="'+val+'"]');
      if(btn)wlRvwToggle(btn);
    });
    // Result UX (hide beaten if win)
    if(r.result==='win'||r.result==='nr'||r.result==='missed'){
      const beatenRow=document.getElementById('rvw-beaten-row');
      if(beatenRow)beatenRow.style.display='none';
    }
    // Override save to update existing record instead of creating new
    const _origSaveBtn=document.getElementById('rvw-save-btn');
    if(_origSaveBtn){
      // Clone to strip the new-record event listener added by openWLPostRaceReview
      const saveBtn=_origSaveBtn.cloneNode(true);
      _origSaveBtn.parentNode.replaceChild(saveBtn,_origSaveBtn);
      saveBtn.addEventListener('click',function(){
        r.date=document.getElementById('rvw-date').value||r.date;
        r.course=(document.getElementById('rvw-course').value||'').trim()||r.course;
        r.distance=(document.getElementById('rvw-dist')||{value:''}).value.trim();
        r.groundConditions=(document.getElementById('rvw-ground')||{value:''}).value.trim();
        r.going=r.groundConditions||(document.getElementById('rvw-going-prefill')||{value:''}).value||r.going||'';
        r.raceClass=(document.getElementById('rvw-class')||{value:''}).value.trim();
        r.position=(document.getElementById('rvw-pos').value||'').trim();
        r.beatenDistance=(document.getElementById('rvw-beaten').value||'').trim();
        r.odds=(document.getElementById('rvw-odds')||{value:''}).value.trim();
        r.result=_rvwGet('result')||r.result;
        r.verdict=_rvwGet('verdict')||r.verdict;
        r.mrAdjustment=parseInt((document.getElementById('rvw-mr-adj')||{value:0}).value)||0;
        r.notes=(document.getElementById('rvw-notes').value||'').trim();
        r.raceName=(document.getElementById('rvw-racename-prefill')||{value:''}).value.trim()||r.distance||'';
        const idx=(D.reviews||[]).findIndex(function(x){return x.id===reviewId;});
        if(idx>-1)D.reviews[idx]=r;
        saveLocal();
        if(typeof _supaUpsertNow==='function')_supaUpsertNow();else save();
        document.getElementById('wl-review-modal').remove();
        if(document.getElementById('wlp-modal')){window._wlpActiveTab='history';openWLProfile(r.profileId);}
      });
    }
  },50);
}
function openWLPostRaceReview(profileId,horse,course,time,raceName,raceDist,raceGoing,raceClass,prefillResult,prefillPos){
  const existing=document.getElementById('wl-review-modal');if(existing)existing.remove();
  const wl=getWL();
  const entry=wl.find(function(x){return x.id===profileId;});
  const currentMR=entry?parseFloat(entry.myRating)||null:null;
  const modal=document.createElement('div');
  modal.id='wl-review-modal';
  modal.className='wlr-modal';
  modal._rvwEntry=entry||{};
  const F='width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Segoe UI\',sans-serif;outline:none;box-sizing:border-box;';
  const L='display:block;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;';
  modal.innerHTML=
    '<div class="wlr-sheet">'
    +'<div class="wlr-handle"><div class="wlr-handle-bar"></div></div>'
    +'<div class="wlr-hdr">'
      +'<div><div class="wlr-title">Race Review</div>'
        +'<div class="wlr-sub">'+(horse||'')+(course?' · '+course:'')+'</div>'
      +'</div>'
      +'<button onclick="document.getElementById(\'wl-review-modal\').remove()" class="wlr-close">✕</button>'
    +'</div>'
    +'<input type="hidden" id="rvw-going-prefill" value="'+(raceGoing||'')+'">'
    +'<div class="wlr-body">'
    +'<div class="fg"><label>Race Name <span style="color:var(--mut);font-weight:400;">— used for stats &amp; target matching</span></label><input type="text" id="rvw-racename-prefill" value="'+(raceName||'')+'" placeholder="e.g. Goodwood Stakes" autocomplete="off"></div>'
    +'<div class="g2">'
      +'<div class="fg"><label>Date</label><input type="date" id="rvw-date" value="'+td()+'"></div>'
      +'<div class="fg"><label>Course</label><input type="text" id="rvw-course" value="'+(course||'')+'" placeholder="e.g. Haydock"></div>'
    +'</div>'
    +'<div class="g2">'
      +'<div class="fg"><label>Distance</label>'
        +'<select id="rvw-dist" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-family:var(--font);font-size:14px;">'
        +'<option value="">— Select —</option>'
        +(function(){
          var opts=['5f','6f','7f','1m','1m 1f','1m 2f','1m 3f','1m 4f','1m 6f','2m','2m 1f','2m 2f','2m 4f','2m 6f','3m','3m 2f'];
          var norm=function(s){return(s||'').toLowerCase().replace(/\s+/g,'');};
          var normDist=norm(raceDist);
          return opts.map(function(d){return'<option'+(norm(d)===normDist?' selected':'')+'>'+d+'</option>';}).join('');
        })()
        +'</select>'
      +'</div>'
      +'<div class="fg"><label>Class</label>'
        +'<select id="rvw-class" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-family:var(--font);font-size:14px;">'
        +'<option value="">— Select —</option>'
        +(function(){
          var opts=['1','2','3','4','5','6','7','Group 1','Group 2','Group 3','Listed','Novice','Maiden','Handicap','Conditions'];
          var normCls=(raceClass||'').replace(/^class\s*/i,'').trim();
          // If the race name indicates a pattern race, override the numeric class
          var rn=raceName||'';
          if(/\bGroup\s*1\b|\bGr(ade)?\s*1\b|\bG1\b/i.test(rn))normCls='Group 1';
          else if(/\bGroup\s*2\b|\bGr(ade)?\s*2\b|\bG2\b/i.test(rn))normCls='Group 2';
          else if(/\bGroup\s*3\b|\bGr(ade)?\s*3\b|\bG3\b/i.test(rn))normCls='Group 3';
          else if(/\bListed\b/i.test(rn))normCls='Listed';
          return opts.map(function(c){return'<option'+(c===normCls?' selected':'')+'>'+c+'</option>';}).join('');
        })()
        +'</select>'
      +'</div>'
    +'</div>'
    +'<div class="g2">'
      +'<div class="fg"><label>Ground</label>'
        +'<select id="rvw-ground" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-family:var(--font);font-size:14px;">'+(['','Firm','Good to Firm','Good','Good to Soft','Soft','Heavy','Standard','Standard to Slow','Slow'].map(function(g){var sel=g&&g.toLowerCase()===( raceGoing||'').toLowerCase().trim()?'selected':'';return'<option value="'+g+'"'+(sel?' selected':'')+'>'+( g||'— Select —')+'</option>';}).join(''))+' </select>'
      +'</div>'
    +'</div>'
    +'<div class="fg"><label>Result</label><div class="rvw-btn-group">'
    +[{k:'win',lbl:'Win'},{k:'place',lbl:'Place'},{k:'unplaced',lbl:'Unplaced'},{k:'nr',lbl:'NR'},{k:'missed',lbl:'Missed Target'}].map(function(r){const cols={win:'var(--grn)',place:'var(--gld)',unplaced:'var(--red)',nr:'var(--mut)',missed:'#a78bfa'};return'<button data-result="'+r.k+'" data-grp="result" class="rvw-btn" style="--rvw-col:'+cols[r.k]+'" onclick="wlRvwToggle(this)">'+r.lbl+'</button>';}).join('')
    +'</div></div>'
    +'<div class="g2" id="rvw-pos-row">'
      +'<div class="fg"><label>Finish Position</label><input type="text" id="rvw-pos" placeholder="e.g. 3rd"></div>'
      +'<div class="fg" id="rvw-beaten-row"><label>Beaten Distance</label><input type="text" id="rvw-beaten" placeholder="e.g. 2.5L"></div>'
    +'</div>'
    +'<div class="fg" id="rvw-odds-row"><label>Odds</label><input type="text" id="rvw-odds" placeholder="e.g. 7/2 or 4.50"></div>'
    +'<div class="fg" id="rvw-verdict-row"><label>Verdict</label><div class="rvw-btn-group">'
    +[{k:'upgrade',col:'var(--grn)',lbl:'Upgrade ↑'},{k:'hold',col:'var(--blu)',lbl:'Hold →'},{k:'downgrade',col:'var(--red)',lbl:'Downgrade ↓'}].map(function(v){return'<button data-verdict="'+v.k+'" data-grp="verdict" class="rvw-btn" style="--rvw-col:'+v.col+'" onclick="wlRvwToggle(this)">'+v.lbl+'</button>';}).join('')
    +'</div></div>'
    +(currentMR?'<div class="fg"><label>MR Adjustment <span style="color:var(--mut);font-weight:400;">(current: '+currentMR+')</span></label><input type="number" id="rvw-mr-adj" placeholder="e.g. 5 or -3" oninput="_rvwUpdateSignals()"></div>':'<input type="hidden" id="rvw-mr-adj" value="0">')
    +'<div class="fg"><label>Bet Readiness</label><div class="rvw-btn-group" id="rvw-readiness-row">'
    +BR_STAGES.map(function(s){const isCur=(entry&&(entry.betReadiness||'watching')===s.id);return'<button data-readiness="'+s.id+'" data-grp="readiness" class="rvw-btn" style="--rvw-col:'+s.col+';'+(isCur?'opacity:1':'opacity:0.4')+'" data-selected="'+(isCur?'1':'')+'" onclick="wlRvwToggle(this)">'+s.label+'</button>';}).join('')
    +'</div></div>'
    +'<div id="rvw-signals" style="margin:4px 0 2px;"></div>'
    +'<div class="fg"><label>Notes</label><textarea id="rvw-notes" placeholder="What you saw, sectionals, paddock notes…" style="min-height:64px;"></textarea></div>'
    +'<div style="display:flex;gap:8px;margin-top:4px;">'
    +'<button id="rvw-save-btn" class="btn bgld" style="flex:1;">Save Review</button>'
    +'<button onclick="document.getElementById(\'wl-review-modal\').remove()" class="btn bout">Cancel</button>'
    +'</div>'
    +'</div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',function(ev){if(ev.target===modal)modal.remove();});
  document.getElementById('rvw-save-btn').addEventListener('click',function(){saveWLReview(profileId,horse,course);});

  // Auto-populate from a known race result (already fetched for Track Pulse / results tab).
  // NOTE: results/today/free does not return beaten distance or SP, so only result + position
  // can be pre-filled — beaten distance stays a manual field.
  if(prefillResult){
    setTimeout(function(){
      const rbtn=modal.querySelector('.rvw-btn[data-grp="result"][data-result="'+prefillResult+'"]');
      if(rbtn)wlRvwToggle(rbtn);
      const posEl=document.getElementById('rvw-pos');
      if(posEl&&prefillPos)posEl.value=prefillPos;
      // Flag the banner so the user knows this was pre-filled, not manually entered
      const sub=modal.querySelector('.wlr-sub');
      if(sub)sub.innerHTML+=' <span style="color:var(--grn);font-weight:700;">· Auto-filled from result ⚡</span>';
    },0);
  }
}

function wlRvwToggle(btn){
  const grp=btn.dataset.grp;
  document.querySelectorAll('.rvw-btn[data-grp="'+grp+'"]').forEach(function(b){
    const isThis=b===btn;
    b.style.opacity=isThis?'1':'0.4';
    b.dataset.selected=isThis?'1':'';
  });
  if(grp==='result'){
    const result=btn.dataset.result;
    const posEl=document.getElementById('rvw-pos');
    const posRow=document.getElementById('rvw-pos-row');
    const beatenRow=document.getElementById('rvw-beaten-row');
    const oddsRow=document.getElementById('rvw-odds-row');
    const verdictRow=document.getElementById('rvw-verdict-row');
    const goingRow=document.getElementById('rvw-going-row');
    const raceOnly=result==='nr'||result==='missed';
    [posRow,beatenRow,oddsRow,verdictRow,goingRow].forEach(function(el){
      if(el)el.style.display=raceOnly?'none':'';
    });
    if(raceOnly){
      if(posEl)posEl.value='';
    } else if(result==='win'){
      if(posEl)posEl.value='1st';
      if(beatenRow)beatenRow.style.display='none';
    } else {
      if(posEl&&posEl.value==='1st')posEl.value='';
      if(beatenRow)beatenRow.style.display='';
    }
  }
  _rvwUpdateSignals();
}

function _rvwGet(grp){
  const sel=document.querySelector('.rvw-btn[data-grp="'+grp+'"][data-selected="1"]');
  if(!sel)return'';
  return sel.dataset[grp]||sel.dataset.result||sel.dataset.verdict||sel.dataset.going||sel.dataset.readiness||'';
}

function _distToFurlongs(s){
  if(!s)return null;
  s=String(s).toLowerCase().replace(/\s+/g,'').replace('½','.5').replace('¼','.25').replace('¾','.75');
  // metres (value > 100 and ends in m)
  const metres=s.match(/^(\d+(\.\d+)?)m$/);
  if(metres&&parseFloat(metres[1])>100)return parseFloat(metres[1])/201.168;
  // miles + furlongs: 1m2f, 2m4f, 1m2f110y
  const mf=s.match(/^(\d+)m(\d+(\.\d+)?)?f?/);
  if(mf){return parseInt(mf[1])*8+parseFloat(mf[2]||0);}
  // furlongs only: 6f, 10f, 5.5f
  const fo=s.match(/^(\d+(\.\d+)?)f/);
  if(fo)return parseFloat(fo[1]);
  // miles only: 1m, 2m (≤20 to avoid metres clash)
  const mo=s.match(/^(\d+(\.\d+)?)m$/);
  if(mo&&parseFloat(mo[1])<=20)return parseFloat(mo[1])*8;
  return null;
}

function _rvwUpdateSignals(){
  const el=document.getElementById('rvw-signals');if(!el)return;
  const result=_rvwGet('result');
  const verdict=_rvwGet('verdict');
  const going=_rvwGet('going');
  if(!result&&!verdict&&!going){el.innerHTML='';return;}

  const modal=document.getElementById('wl-review-modal');
  const entry=(modal&&modal._rvwEntry)||{};
  const course=(document.getElementById('rvw-course')||{value:''}).value.trim().toLowerCase();
  const dist=(document.getElementById('rvw-dist')||{value:''}).value.trim().toLowerCase();
  const mrAdj=parseInt((document.getElementById('rvw-mr-adj')||{value:'0'}).value)||0;
  const readinessSel=document.querySelector('.rvw-btn[data-grp="readiness"][data-selected="1"]');
  const curReadiness=readinessSel?readinessSel.dataset.readiness:'watching';

  const pos=[];  // positive signals
  const neg=[];  // negative signals
  const neu=[];  // neutral/info

  // ── Result ──
  if(result==='win')pos.push({label:'Won the race',key:'result'});
  else if(result==='place')pos.push({label:'Placed — ran to form',key:'result'});
  else if(result==='unplaced')neg.push({label:'Unplaced',key:'result'});
  else if(result==='nr')neu.push({label:'Non-runner — no data gained',key:'result'});
  else if(result==='missed')neu.push({label:'Missed target — nothing to assess',key:'result'});

  // ── Going vs profile preferences ──
  const goingPrefs=entry.goingPrefs||[];
  if(going==='confirmed'){
    if(goingPrefs.length)pos.push({label:'Going matched your preference ('+goingPrefs[0]+')',key:'going'});
    else pos.push({label:'Going suited — consider saving going preference',key:'going'});
  } else if(going==='against'){
    if(goingPrefs.length)neg.push({label:'Going against preference ('+goingPrefs[0]+') — excuses apply',key:'going'});
    else neg.push({label:'Going was against — update going preferences on profile',key:'going'});
  } else if(going==='mixed'){
    neu.push({label:'Going was mixed — difficult to draw firm conclusions',key:'going'});
  }

  // ── Track vs profile preference ──
  if(course&&entry.trackPref){
    const trackMatch=entry.trackPref.toLowerCase().includes(course)||course.includes(entry.trackPref.toLowerCase());
    if(trackMatch)pos.push({label:'Ran at preferred track ('+entry.trackPref+')',key:'track'});
    else neu.push({label:'Track not listed as preferred (pref: '+entry.trackPref+')',key:'track'});
  } else if(course&&!entry.trackPref){
    neu.push({label:'No track preference set — consider adding '+course+' if it handles it well',key:'track'});
  }

  // ── Distance vs preference, judged against result ──
  if(entry.distancePref&&dist){
    const df=_distToFurlongs(dist);
    const pf=_distToFurlongs(entry.distancePref);
    if(df&&pf){
      const diff=Math.abs(df-pf);
      const suited=diff<=1;
      const close=diff<=2;
      const ran_well=result==='win'||result==='place';
      const ran_poor=result==='unplaced';
      if(suited&&ran_well)      pos.push({label:(result==='win'?'Won':'Placed')+' at preferred distance ('+dist+') — distance confirmed',key:'dist'});
      else if(suited&&ran_poor) neu.push({label:'Ran at preferred distance ('+dist+') but unplaced — distance not the issue today',key:'dist'});
      else if(suited)           pos.push({label:'Distance suits — '+dist+' matches preference ('+entry.distancePref+')',key:'dist'});
      else if(close&&ran_well)  pos.push({label:(result==='win'?'Won':'Placed')+' at '+dist+' — close to preferred distance ('+entry.distancePref+')',key:'dist'});
      else if(!suited&&ran_well)neu.push({label:(result==='win'?'Won':'Placed')+' at '+dist+' — outside preference ('+entry.distancePref+'), consider updating',key:'dist'});
      else if(!suited&&ran_poor)neg.push({label:'Unplaced — distance ('+dist+') may be a factor vs preference ('+entry.distancePref+')',key:'dist'});
      else                      neu.push({label:'Distance '+dist+' vs preference '+entry.distancePref,key:'dist'});
    } else {
      neu.push({label:'Profile distance: '+entry.distancePref+' (today: '+dist+')',key:'dist'});
    }
  } else if(entry.distancePref&&!dist){
    neu.push({label:'Profile distance preference: '+entry.distancePref+' — add race distance to compare',key:'dist'});
  }

  // ── My Rating adjustment ──
  if(mrAdj>0)pos.push({label:'MR adjusted up by +'+mrAdj+' — improved on assessment',key:'mr'});
  else if(mrAdj<0)neg.push({label:'MR adjusted down by '+mrAdj+' — performed below expectation',key:'mr'});

  // ── Verdict ──
  if(verdict==='upgrade')pos.push({label:'Verdict: Upgrade ↑ — more to offer',key:'verdict'});
  else if(verdict==='downgrade')neg.push({label:'Verdict: Downgrade ↓ — question the assessment',key:'verdict'});
  else if(verdict==='hold')neu.push({label:'Verdict: Hold — consistent, keep monitoring',key:'verdict'});

  // ── Readiness suggestions ──
  const positiveCount=pos.length;
  const negativeCount=neg.length;
  if(positiveCount>=2&&curReadiness!=='ready')
    neu.push({label:'Strong signals — consider moving to Ready to Back',key:'suggest',col:'#10b981'});
  if(negativeCount>=2&&curReadiness!=='cold')
    neu.push({label:'Multiple concerns — consider moving to Cold',key:'suggest',col:'#a78bfa'});
  if(going==='against'&&result==='unplaced'&&curReadiness!=='watching')
    neu.push({label:'Going excuses — drop back to Watching until conditions suit',key:'suggest',col:'#f59e0b'});

  // ── Stars: base 3, +1 per positive, -1 per negative, clamp 1-5 ──
  const starScore=Math.min(5,Math.max(1,3+positiveCount-negativeCount));
  const starCol=starScore>=4?'#10b981':starScore===3?'#f59e0b':'#f87171';
  const starLabel=starScore>=4?'Looking good':starScore===3?'Mixed picture':starScore<=2?'Concerns flagged':'';

  let html='<div style="background:rgba(255,255,255,.04);border:1px solid var(--bdr);border-radius:10px;padding:12px 14px;margin-bottom:4px;">';
  html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +'<span style="font-size:20px;letter-spacing:3px;color:'+starCol+';">'+'★'.repeat(starScore)+'☆'.repeat(5-starScore)+'</span>'
    +'<span style="font-family:var(--font);font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:'+starCol+';">'+starLabel+'</span>'
    +'</div>';
  pos.forEach(function(s){html+='<div style="font-size:13px;color:#10b981;margin-bottom:5px;display:flex;gap:6px;"><span>✓</span><span>'+s.label+'</span></div>';});
  neg.forEach(function(s){html+='<div style="font-size:13px;color:#f87171;margin-bottom:5px;display:flex;gap:6px;"><span>✗</span><span>'+s.label+'</span></div>';});
  neu.forEach(function(s){const c=s.col||'#f59e0b';html+='<div style="font-size:13px;color:'+c+';margin-bottom:5px;display:flex;gap:6px;"><span>→</span><span>'+s.label+'</span></div>';});
  html+='</div>';
  el.innerHTML=html;
}

function saveWLReview(profileId,horse,course){
  const wl=getWL();
  const date=document.getElementById('rvw-date').value||td();
  const rvwCourse=(document.getElementById('rvw-course').value||course||'').trim();
  const rvwDist=(document.getElementById('rvw-dist')||{value:''}).value.trim();
  const mrAdjEl=document.getElementById('rvw-mr-adj');
  const mrAdj=mrAdjEl?parseInt(mrAdjEl.value)||0:0;
  // Use the prefilled race name (from target) or fall back to distance
  const raceName=(document.getElementById('rvw-racename-prefill')||{value:''}).value.trim()||rvwDist||'';

  const review={
    id:gid(),profileId:profileId,
    date:date,raceName:raceName,course:rvwCourse,
    distance:rvwDist,going:(document.getElementById('rvw-going-prefill')||{value:''}).value||(document.getElementById('rvw-ground')||{value:''}).value.trim(),
    groundConditions:(document.getElementById('rvw-ground')||{value:''}).value.trim(),
    raceClass:(document.getElementById('rvw-class')||{value:''}).value.trim(),
    result:_rvwGet('result'),
    position:(document.getElementById('rvw-pos').value||'').trim(),
    beatenDistance:(document.getElementById('rvw-beaten').value||'').trim(),
    odds:(document.getElementById('rvw-odds')||{value:''}).value.trim(),
    verdict:_rvwGet('verdict'),
    mrAdjustment:mrAdj,
    notes:(document.getElementById('rvw-notes').value||'').trim(),
    source:'manual',createdAt:Date.now()
  };

  if(!D.reviews)D.reviews=[];
  D.reviews.push(review);

  // Apply MR adjustment and log to mrHistory
  if(mrAdj){
    const idx=D.watchlist.findIndex(function(x){return x.id===profileId;});
    if(idx>-1){
      const cur=parseFloat(D.watchlist[idx].myRating)||0;
      const newMR=cur+mrAdj;
      D.watchlist[idx].myRating=String(newMR);
      D.watchlist[idx].updatedAt=Date.now();
      if(!D.watchlist[idx].mrHistory)D.watchlist[idx].mrHistory=[];
      // Only log if the value actually changed
      const mH=D.watchlist[idx].mrHistory;
      if(!mH.length||parseFloat(mH[mH.length-1].mr)!==newMR){
        mH.push({mr:String(newMR),date:review.date||td(),source:'review-adj',adj:mrAdj,race:review.raceName||''});
      }
    }
  }
  // Update bet readiness and clear needsReview flag
  const newReadiness=_rvwGet('readiness');
  const idx2=D.watchlist.findIndex(function(x){return x.id===profileId;});
  if(idx2>-1){
    if(newReadiness)D.watchlist[idx2].betReadiness=newReadiness;
    D.watchlist[idx2].needsReview=false;
    D.watchlist[idx2].updatedAt=Date.now();
  }

  // Auto-infer going and distance preferences from this review
  _wlInferFromReview(profileId, review);

  save();
  document.getElementById('wl-review-modal').remove();
  if(typeof checkWatchlistRunners==='function'){
    const _rr=(typeof _mergeRacecardsAndResults==='function'?_mergeRacecardsAndResults():null)
      ||(window._todayMeetingsCache&&(window._todayMeetingsCache.racecards||window._todayMeetingsCache.races))
      ||window._cachedRaces||[];
    if(_rr.length)checkWatchlistRunners(_rr);
  }
  if(document.getElementById('wlp-modal')){window._wlpActiveTab='history';openWLProfile(profileId);}
}

function _wlInferFromReview(profileId, review){
  const idx=D.watchlist.findIndex(function(x){return x.id===profileId;});
  if(idx<0)return;
  const entry=D.watchlist[idx];
  const result=review.result||'';
  const ranWell=result==='win'||result==='place';
  const ranPoor=result==='unplaced';
  const _goingRaw=(review.groundConditions||review.going||review.raceGoing||'').trim();
  const _VALID_GOING=['firm','good to firm','good','good to soft','soft','heavy','standard','standard to slow','slow'];
  const going=_VALID_GOING.includes(_goingRaw.toLowerCase())?_goingRaw:'';
  const dist=(review.distance||review.raceDist||'').trim();
  let changed=false;

  // ── Going inference ──────────────────────────────────────────────────────────
  if(going){
    if(!entry.goingPrefs)entry.goingPrefs=[];
    const already=entry.goingPrefs.some(function(g){return g.toLowerCase()===going.toLowerCase();});
    if(ranWell&&!already){
      entry.goingPrefs.push(going);
      changed=true;
    }
    // Track poor-going patterns so we can flag them later
    if(!entry._goingPoor)entry._goingPoor={};
    if(ranPoor){
      entry._goingPoor[going]=(entry._goingPoor[going]||0)+1;
      changed=true;
    }
  }

  // ── Distance inference ───────────────────────────────────────────────────────
  if(dist&&ranWell){
    // Record every winning/placed distance, deduplicated
    if(!entry.distanceWins)entry.distanceWins=[];
    const alreadyDist=entry.distanceWins.some(function(d){return d.toLowerCase()===dist.toLowerCase();});
    if(!alreadyDist){
      entry.distanceWins.push(dist);
      changed=true;
    }
    // Update primary distancePref to most recent win/place distance
    entry.distancePref=dist;
    changed=true;
  }

  // ── Surface inference ────────────────────────────────────────────────────────
  if(!entry.surface){
    const rn=(review.raceName||'').toLowerCase();
    const rc=(review.raceClass||review.raceGoing||'').toLowerCase();
    if(/hurdle|chase|national hunt|n\.h\.|nh\b|bumper|steeplechase/.test(rn)){
      entry.surface='jumps'; changed=true;
    } else if(/all.weather|polytrack|tapeta|fibresand|a\.w\.|aw\b/.test(rn)){
      entry.surface='aw'; changed=true;
    } else if(/class\s*[1-7]|handicap|maiden|novice|conditions|listed|group|grade|stakes|selling|claimer/.test(rn)||/^[1-7]$/.test((review.raceClass||'').trim())){
      entry.surface='flat'; changed=true;
    }
  }

  // ── Race type inference ───────────────────────────────────────────────────────
  if(!entry.raceType){
    const rn=(review.raceName||'').toLowerCase();
    if(/\bgroup\b|\blisted\b|\bgrade\b/.test(rn)){
      entry.raceType='group'; changed=true;
    } else if(/\bhandicap\b|\bhcap\b/.test(rn)){
      entry.raceType='handicap'; changed=true;
    } else if(/\bmaiden\b/.test(rn)){
      entry.raceType='maiden'; changed=true;
    } else if(/\bclaim(er|ing)?\b/.test(rn)){
      entry.raceType='claimer'; changed=true;
    }
  }

  if(changed){
    entry.updatedAt=Date.now();
  }
}

function wlBackfillInference(){
  const reviews=D.reviews||[];
  if(!reviews.length)return;
  // Sort oldest first so most recent going/distance ends up as the primary pref
  const sorted=reviews.slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  sorted.forEach(function(r){
    if(r.profileId)_wlInferFromReview(r.profileId,r);
  });
  save();
  console.log('[WL] Backfill inference complete —',reviews.length,'reviews processed');
}

// ── AI HORSE ASSESSMENT ──


async function wlAIAssess(){
  const horse=(document.getElementById('wlf-horse')||{value:''}).value.trim();
  if(!horse){alert('Enter a horse name first.');return;}

  // Read from form fields (current state being edited)
  const or=(document.getElementById('wlf-rating')||{value:''}).value.trim();
  const age=(document.getElementById('wlf-age')||{value:''}).value.trim();
  const trainer=(document.getElementById('wlf-trainer')||{value:''}).value.trim();
  const notes=(document.getElementById('wlf-cond-notes')||{value:''}).value.trim();
  const intel=(_wlDossier.intel||[]).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}).map(function(en){return(en.date?en.date+': ':'')+en.text;}).join('\n\n');
  const reasonNote=(document.getElementById('wlf-reason-note')||{value:''}).value.trim();
  const goingPrefsForm=(_wlDossier.goingPrefs||[]).join(', ');
  const distPrefForm=(_wlDossier.distPrefs||[]).join(', ');

  // Pull stored profile data for existing profiles
  const openProfileId=(document.getElementById('wl-modal')||{}).dataset&&document.getElementById('wl-modal').dataset.profileId;
  const storedEntry=openProfileId?(getWL().find(function(x){return x.id===openProfileId;})):null;
  const storedReviews=openProfileId?(D.reviews||[]).filter(function(r){return r.profileId===openProfileId;}).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}):[];
  const storedObs=storedEntry?(storedEntry.observations||[]).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}):[];
  const orHistory=storedEntry?(storedEntry.orHistory||[]):[];

  const btn=document.getElementById('wlf-ai-btn');
  const res=document.getElementById('wlf-ai-result');
  const _puzzleSVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/></svg>';
  if(btn){btn.innerHTML=_puzzleSVG+' Generating…';btn.disabled=true;}
  if(res){res.style.display='none';}

  // Build OR history string
  const orHistStr=orHistory.length>1?orHistory.map(function(h){return h.or+(h.date?' ('+h.date+')':'');}).join(' → '):'';

  // Build race reviews string (last 6)
  const reviewsStr=storedReviews.slice(0,6).map(function(r){
    const parts=[r.date||'',r.raceName||r.course||'',r.result||'',r.position?'pos:'+r.position:'',r.beatenDistance?r.beatenDistance+'l':'',r.goingConfirmed?'going:'+r.goingConfirmed:'',r.mrAdjustment?'MR adj:'+(r.mrAdjustment>0?'+':'')+r.mrAdjustment:''];
    const line=parts.filter(Boolean).join(' | ');
    return '• '+line+(r.notes?'\n  Note: '+r.notes:'')+(r.verdict?' ['+r.verdict+']':'');
  }).join('\n');

  // Build observations string (last 8)
  const obsStr=storedObs.slice(0,8).map(function(o){
    const parts=[o.date||'',o.raceName||'',o.going?'going:'+o.going:'',o.result||''];
    return '• '+parts.filter(Boolean).join(' | ')+(o.notes?'\n  '+o.notes:'');
  }).join('\n');

  const prompt=`You are an expert UK horse racing analyst. Generate a Puzzle Report — a concise, punchy assessment a serious punter can act on. Use ALL available profile data below.

HORSE PROFILE
Horse: ${horse}
${or?'Official Rating (OR): '+or:''}
${orHistStr?'OR history: '+orHistStr:''}
${age?'Age: '+age+'yo':''}
${trainer?'Trainer: '+trainer:''}
${reasonNote?'Why logged: '+reasonNote:''}
${goingPrefsForm?'Going preferences: '+goingPrefsForm:''}
${distPrefForm?'Distance preferences: '+distPrefForm:''}
${notes?'Conditions notes: '+notes:''}
${intel?'Trainer intel: '+intel:''}
${reviewsStr?'\nRACE REVIEWS (most recent first)\n'+reviewsStr:''}
${obsStr?'\nOBSERVATIONS\n'+obsStr:''}

Respond with ONLY a JSON object:
{
  "level": "one line — current ability level based on all available evidence",
  "projection": "one line — where connections could realistically aim this horse",
  "sweet_spot": "ideal conditions — going, distance, track type if discernible",
  "watch_for": "the single most important thing to watch for next time",
  "race_type": "one of: handicap, group, maiden, claimer — best fit",
  "surface": "one of: flat, jumps, aw — best fit",
  "verdict": "2-3 sentences — honest punter's summary synthesising all the evidence above, no fluff"
}

UK racing context: OR 0-59 = sellers/claimers, 60-79 = lower handicaps (Class 4-6), 80-94 = solid handicapper (Class 2-3), 95-109 = Listed/Group 3 potential, 110+ = Group 1-2. Return ONLY the JSON.`;

  try{
    const resp=await fetch('https://racing-proxy.theracingpuzzle.workers.dev',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        type:'screenshot',
        model:'claude-sonnet-4-6',
        max_tokens:600,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data=await resp.json();
    const text=data.content&&data.content[0]&&data.content[0].text;
    if(!text)throw new Error('No response');

    let parsed;
    try{const m=text.match(/\{[\s\S]*\}/);parsed=JSON.parse(m?m[0]:text);}
    catch{throw new Error('Could not parse response');}

    // Auto-fill race type and surface dropdowns if not already set
    const rtEl=document.getElementById('wlf-race-type');
    const sfEl=document.getElementById('wlf-surface');
    if(rtEl&&!rtEl.value&&parsed.race_type)rtEl.value=parsed.race_type;
    if(sfEl&&!sfEl.value&&parsed.surface)sfEl.value=parsed.surface;

    // Store result in memory and auto-save to profile immediately
    window._wlLastAIAssess = parsed;
    parsed._assessedAt = Date.now();

    // Auto-save to existing profile if we have one open
    const openProfileId=(document.getElementById('wl-modal')||{}).dataset&&document.getElementById('wl-modal').dataset.profileId;
    if(openProfileId){
      const wl=getWL();
      const entry=wl.find(function(x){return x.id===openProfileId;});
      if(entry){
        entry.aiAssessment=parsed;
        entry.aiAssessedAt=Date.now();
        D.watchlist=wl;
        save();
      }
    }

    // Render result panel
    const esc2=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    const row=function(label,val,col){return val?'<div style="margin-bottom:8px;"><div style="font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:'+(col||'#a855f7')+';margin-bottom:2px;">'+label+'</div><div style="font-size:13px;color:var(--txt);line-height:1.5;">'+esc2(val)+'</div></div>':'';}
    if(res){
      res.style.display='block';
      res.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
          +'<div style="font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#a855f7;display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/></svg>Puzzle Report</div>'
          +(openProfileId?'<div style="font-size:9px;color:#4ade80;font-weight:700;">✓ Saved automatically</div>':'<div style="font-size:9px;color:#f59e0b;font-weight:700;">Save profile to keep</div>')
        +'</div>'
        +row('Current Level',parsed.level,'#60a5fa')
        +row('Projection',parsed.projection,'#34d399')
        +row('Sweet Spot',parsed.sweet_spot,'#f59e0b')
        +row('Watch For',parsed.watch_for,'#fb7185')
        +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(168,85,247,.2);font-size:13px;color:var(--txt);line-height:1.6;">'+esc2(parsed.verdict||'')+'</div>';
    }
  }catch(e){
    if(res){res.style.display='block';res.innerHTML='<div style="color:var(--red);font-size:13px;">Assessment failed: '+e.message+'</div>';}
  }finally{
    if(btn){btn.innerHTML=_puzzleSVG+' Generate Puzzle Report';btn.disabled=false;}
  }
}

function wlAIApplyToNotes(){
  try{
    const d=window._wlLastAIAssess;
    if(!d)return;
    const el=document.getElementById('wlf-cond-notes');
    if(!el)return;
    const lines=[];
    if(d.level)lines.push('Level: '+d.level);
    if(d.projection)lines.push('Projection: '+d.projection);
    if(d.sweet_spot)lines.push('Sweet spot: '+d.sweet_spot);
    if(d.watch_for)lines.push('Watch for: '+d.watch_for);
    if(d.verdict)lines.push('\n'+d.verdict);
    const existing=el.value.trim();
    el.value=(existing?existing+'\n\n':'')+lines.join('\n');
    el.style.background='rgba(168,85,247,.08)';
    el.style.transition='background 1.5s';
    setTimeout(function(){el.style.background='';},2000);
    const btn=document.querySelector('#wlf-ai-result button');
    if(btn){btn.textContent='✓ Added to notes';btn.disabled=true;}
  }catch(e){}
}

// ── SCREENSHOT → HORSE PROFILE EXTRACTION ──

function wlScanScreenshot(){
  const input=document.createElement('input');
  input.type='file';input.accept='image/*';
  input.onchange=async function(){
    const file=input.files[0];
    if(!file)return;
    const btn=document.getElementById('wlf-scan-btn');
    if(btn){btn.textContent='Scanning…';btn.disabled=true;}
    try{
      const base64=await new Promise(function(res,rej){
        const r=new FileReader();
        r.onload=function(){res(r.result.split(',')[1]);};
        r.onerror=rej;
        r.readAsDataURL(file);
      });
      const mediaType=file.type||'image/jpeg';
      const prompt=`You are extracting horse racing data from a screenshot (Racing Post, At The Races, or a racecard).

Extract every field you can find and return ONLY a JSON object with these keys (omit keys you cannot find):
{
  "horse": "horse name (no country suffix in brackets)",
  "trainer": "trainer full name",
  "jockey": "jockey full name",
  "rating": "official rating as a number string e.g. 95",
  "age": "age as a number only e.g. 3",
  "going_prefs": ["array of going strings from: Firm, Good to Firm, Good, Good to Soft, Soft, Heavy"],
  "distance_pref": "preferred trip e.g. 1m2f",
  "notes": "one sentence summary of the horse's profile or recent form",
  "reason_note": "what caught the eye or why to watch"
}

Return ONLY the JSON object, no explanation.`;

      const resp=await fetch('https://racing-proxy.theracingpuzzle.workers.dev',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          type:'screenshot',
          model:'claude-haiku-4-5-20251001',
          max_tokens:512,
          messages:[{role:'user',content:[
            {type:'image',source:{type:'base64',media_type:mediaType,data:base64}},
            {type:'text',text:prompt}
          ]}]
        })
      });
      const data=await resp.json();
      if(data.error)throw new Error(typeof data.error==='object'?(data.error.message||JSON.stringify(data.error)):data.error);
      const text=data.content&&data.content[0]&&data.content[0].text;
      if(!text)throw new Error('No response from AI — raw: '+JSON.stringify(data).slice(0,200));
      let parsed;
      try{
        const match=text.match(/\{[\s\S]*\}/);
        parsed=JSON.parse(match?match[0]:text);
      }catch{throw new Error('Could not parse AI response');}
      _wlApplyScan(parsed);
    }catch(e){
      alert('Scan failed: '+e.message);
    }finally{
      if(btn){btn.textContent='📷 Scan Screenshot';btn.disabled=false;}
    }
  };
  input.click();
}

function _wlApplyScan(d){
  if(!d||typeof d!=='object')return;
  let filled=0;
  function set(id,val){if(!val)return;const el=document.getElementById(id);if(el){el.value=val;el.style.background='rgba(250,204,21,.08)';el.style.transition='background 1.5s';setTimeout(function(){el.style.background='';},2000);filled++;}}
  set('wlf-horse', d.horse);
  set('wlf-trainer', d.trainer);
  set('wlf-rating', d.rating);
  set('wlf-age', d.age);
  set('wlf-reason-note', d.reason_note||d.notes);
  set('wlf-track', d.distance_pref);
  set('wlf-cond-notes', d.notes);
  // Going preferences — activate matching buttons
  if(d.going_prefs&&d.going_prefs.length){
    document.querySelectorAll('#wlf-going .wlf-going-btn').forEach(function(btn){
      const g=btn.getAttribute('data-going')||'';
      if(d.going_prefs.some(function(p){return p.toLowerCase()===g.toLowerCase();})){
        if(!btn.classList.contains('on')){btn.click();}
        filled++;
      }
    });
  }
  const msg=filled>0?'✓ Filled '+filled+' field'+(filled>1?'s':'')+' — review and save':'Nothing recognised — try a clearer screenshot';
  const notice=document.getElementById('wlf-scan-notice');
  if(notice){notice.textContent=msg;notice.style.display='block';}
}

// ── WATCHLIST DOSSIER MODAL ──
let _wlDossier={obs:[],targets:[],goingPrefs:[]};

function _wlCompleteness(e){
  if(!e)return{score:0,total:12,pct:0,missing:[]};
  const missing=[];
  let score=0;
  if(e.trainer)score++;else missing.push('Trainer');
  if(e.age)score++;else missing.push('Age');
  if(e.currentRating)score++;else missing.push('OR');
  if(e.myRating)score++;else missing.push('My Mark');
  if(e.goingPrefs&&e.goingPrefs.length)score++;else missing.push('Going prefs');
  if(e.distancePref&&e.distancePref.trim())score++;else missing.push('Distance');
  if(e.surface)score++;else missing.push('Surface');
  if(e.raceType)score++;else missing.push('Race type');
  if(e.conditionsNotes||e.notes)score++;else missing.push('Conditions notes');
  if(e.trainerIntel)score++;else missing.push('Trainer intel');
  if(e.reasonNote)score++;else missing.push('Why logged');
  if(e.observations&&e.observations.length)score++;else missing.push('Observations');
  return{score,total:12,pct:Math.round(score/12*100),missing};
}

function _wlMomentum(e){
  if(!e)return null;
  const orH=e.orHistory||[];
  let orTrend=null;
  if(orH.length>=2){
    const diff=(orH[orH.length-1].rating||0)-(orH[orH.length-2].rating||0);
    orTrend=diff>0?'up':diff<0?'down':'flat';
  }
  const rvws=(D.reviews||[]).filter(function(r){return r.profileId===e.id;});
  let rvwSentiment=null;
  if(rvws.length){
    const last=rvws.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');})[0];
    if(last.result==='win'||last.result==='place')rvwSentiment='up';
    else if(last.result==='unplaced'||last.result==='loss')rvwSentiment='down';
  }
  if(!orTrend&&!rvwSentiment)return null;
  if(orTrend==='up'||rvwSentiment==='up')return{label:'Rising',icon:'↑',col:'#4ade80'};
  if(orTrend==='down'||rvwSentiment==='down')return{label:'Falling',icon:'↓',col:'#f87171'};
  return{label:'Steady',icon:'→',col:'#94a3b8'};
}

function wlSwitchTab(name){
  document.querySelectorAll('.wlf-tab-panel').forEach(function(p){p.style.display='none';});
  document.querySelectorAll('.wlf-tab-btn').forEach(function(b){
    const on=b.getAttribute('data-wlftab')===name;
    b.style.background='transparent';
    b.style.color=on?'var(--navy)':'var(--mut)';
    b.style.borderBottomColor=on?'var(--navy)':'transparent';
  });
  const panel=document.getElementById('wlft-'+name);
  if(panel)panel.style.display='';
}

function openWLForm(id,prefill){
  try{
  window._wlLastAIAssess=null;
  // Remove any existing modal first to avoid conflicts
  const existing=document.getElementById('wl-modal');if(existing)existing.remove();
  const wl=getWL();
  const e=id?wl.find(x=>x.id===id):null;
  const p=prefill||{};
  _wlDossier={
    obs:e&&e.observations?e.observations.map(function(o){return Object.assign({},o);}):p.observations||[],
    targets:e&&e.targets?e.targets.map(function(t){return Object.assign({},t);}):p.targets||[],
    intel:(function(){
      var arr=e?e.intelEntries||[]:[];
      // migrate legacy string → single entry
      if(!arr.length&&e&&e.trainerIntel){arr=[{id:gid(),date:td(),text:e.trainerIntel}];}
      return arr.map(function(x){return Object.assign({},x);});
    })()
  };
  const modal=document.createElement('div');
  modal.id='wl-modal';modal.className='wlf-modal';if(e&&e.id)modal.dataset.profileId=e.id;
  const going=['Firm','Good to Firm','Good','Good to Soft','Soft','Heavy'];
  const goingPrefs=e?e.goingPrefs||[]:[];
  _wlDossier.goingPrefs=goingPrefs.slice();
  const DIST_GROUPS=[
    {label:'Sprint',   opts:['5f','5-6f','6f','6-7f']},
    {label:'Mile',     opts:['7f','1m','1m1f','1m2f']},
    {label:'Middle',   opts:['1m4f','1m6f','2m']},
    {label:'Stayer',   opts:['2m2f','2m4f','2m6f','3m+']},
  ];
  const savedDist=e?e.distancePref||'':'';
  _wlDossier.distPrefs=savedDist?savedDist.split(',').map(function(s){return s.trim();}).filter(Boolean):[];
  const goingHtml=going.map(function(g){const sel=_wlDossier.goingPrefs.includes(g);return'<button type="button" data-going="'+g+'" onclick="wlToggleGoing(this)" class="wlf-going-btn'+(sel?' on':'')+'">'+g+'</button>';}).join('');
  const REASONS=[
    {value:'eye-catcher', label:'Eye Catcher',  col:'#a78bfa', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>'},
    {value:'future-target',label:'Future Target',col:'#34d399', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/></svg>'},
    {value:'trainer-intel',label:'Trainer Intel',col:'#38bdf8', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13a8 8 0 1 0-8 5h8v-5z"/></svg>'},
    {value:'form-study',  label:'Form Study',   col:'#f59e0b', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V9M8 15V5M12 15V11M16 15V7"/></svg>'},
    {value:'tip-source',  label:'Tip / Source', col:'#fb7185', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a6 6 0 0 1 4.47 10.06A4 4 0 0 1 13 15H7a4 4 0 0 1-1.47-2.94A6 6 0 0 1 10 2z"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="9" y1="21" x2="11" y2="21"/></svg>'},
  ];
  const curReason=e?e.reason||'eye-catcher':'eye-catcher';
  const REASON_COLS={'eye-catcher':'#a78bfa','future-target':'#34d399','trainer-intel':'#38bdf8','form-study':'#f59e0b','tip-source':'#fb7185'};
  const reasonHtml=REASONS.map(function(r){const sel=r.value===curReason;return'<button type="button" data-reason="'+r.value+'" onclick="wlSelectReason(this)" class="wlf-reason-btn'+(sel?' on':'')+(sel?' wlf-reason-sel':'')+'" style="'+(sel?'background:'+r.col+';border-color:'+r.col+';color:#fff;':'')+'" data-col="'+r.col+'"><span class="wlf-reason-ico">'+r.svg+'</span><span class="wlf-reason-lbl">'+r.label+'</span></button>';}).join('');
  // ── Build tab content ──────────────────────────────────────────────────────
  const c=_wlCompleteness(e);
  const mom=_wlMomentum(e);
  const pctCol=c.pct>=80?'#4ade80':c.pct>=50?'#f59e0b':'#f87171';
  const sf=e?e.surface||'':'';
  const rt=e?e.raceType||'':'';
  const isUnraced=e&&e.unraced?true:false;
  const showUnraced=(curReason==='trainer-intel'||curReason==='tip-source');
  const io=(_wlDossier.obs&&_wlDossier.obs[0])||{};
  const defaultTab='horse';

  // ── Tab 1: Horse (identity + why watching + AI) ────────────────────────────
  const horseTabHtml=(function(){
    if(!e) return'';
    // ── Horse tab content ──────────────────────────────────────────────────
    return'<div id="wlft-horse" class="wlf-tab-panel" style="display:none;">'
      +'<div class="wlf-section">'
        +'<div style="padding:12px 13px 0;">'
          +'<button type="button" id="wlf-scan-btn" onclick="wlScanScreenshot()" style="width:100%;padding:11px;border-radius:9px;border:1.5px dashed rgba(250,204,21,.4);background:rgba(250,204,21,.06);color:var(--gld);font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.02em;">📷 Scan Screenshot — fill from Racing Post / ATR</button>'
          +'<div id="wlf-scan-notice" style="display:none;font-size:12px;color:var(--grn);padding:6px 2px 0;"></div>'
        +'</div>'
        +'<div class="wlf-sec-hdr" style="margin-top:12px;"><span class="wlf-sec-title">Identity &amp; Ratings</span></div>'
        +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
          +'<div class="fg"><label>Horse Name</label><input type="text" id="wlf-horse" value="'+(e?e.horse:p.horse||'')+'"></div>'
          +'<div class="g2">'
            +'<div class="fg"><label>Trainer</label><input type="text" id="wlf-trainer" value="'+(e?e.trainer||'':p.trainer||'')+'"></div>'
            +'<div class="fg"><label>Age</label><input type="number" id="wlf-age" min="2" max="20" placeholder="e.g. 3" value="'+(e?e.age||'':p.age||'')+'"></div>'
          +'</div>'
          +'<div class="g2">'
            +'<div class="fg"><label>Current OR <span style="font-weight:400;color:var(--mut);">auto-updates</span></label><input type="number" id="wlf-rating" placeholder="e.g. 85" value="'+(e?e.currentRating||'':p.currentRating||'')+'"></div>'
            +'<div class="fg"><label style="color:var(--gld);">My Mark (MR) ★</label><input type="number" id="wlf-myrating" placeholder="e.g. 88" value="'+(e?e.myRating||'':'')+'" class="wlf-mr-input"></div>'
          +'</div>'
          +'<div class="g2">'
            +'<div class="fg"><label>Surface</label><select id="wlf-surface"><option value="">— Unknown</option><option value="flat"'+(sf==='flat'?' selected':'')+'>Flat</option><option value="jumps"'+(sf==='jumps'?' selected':'')+'>Jumps / NH</option><option value="aw"'+(sf==='aw'?' selected':'')+'>All Weather</option></select></div>'
            +'<div class="fg"><label>Race Type</label><select id="wlf-race-type"><option value="">— Unknown</option><option value="handicap"'+(rt==='handicap'?' selected':'')+'>Handicapper</option><option value="group"'+(rt==='group'?' selected':'')+'>Group / Listed</option><option value="maiden"'+(rt==='maiden'?' selected':'')+'>Maiden</option><option value="claimer"'+(rt==='claimer'?' selected':'')+'>Claimer</option></select></div>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title">Why Am I Watching?</span></div>'
        +'<div style="display:flex;gap:5px;flex-wrap:wrap;padding:12px 13px 13px;" id="wlf-reasons">'+reasonHtml+'</div>'
        +'<input type="hidden" id="wlf-reason" value="'+curReason+'">'
        +'<div class="wlf-sec-body">'
          +'<div class="fg"><label>In a sentence…</label><input type="text" id="wlf-reason-note" placeholder="e.g. Kept on well from rear, bumped 2f out — needs a clearer run" value="'+(e?e.reasonNote||'':'')+'" autocomplete="off"></div>'
          +'<div id="wlf-unraced-row" style="display:'+(showUnraced?'flex':'none')+';align-items:center;gap:10px;padding:10px 13px;background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2);border-radius:9px;">'
            +'<input type="checkbox" id="wlf-unraced" onchange="wlToggleUnraced()" style="width:16px;height:16px;accent-color:#fb7185;cursor:pointer;flex-shrink:0;"'+(isUnraced?' checked':'')+'>'
            +'<label for="wlf-unraced" style="font-size:12px;font-weight:700;color:var(--txt);cursor:pointer;margin:0;">Unraced — no observations possible yet</label>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }());

  // ── Tab 2: Conditions ─────────────────────────────────────────────────────
  const conditionsTabHtml=(function(){
    if(!e) return'';
    var distHtml=DIST_GROUPS.map(function(grp){
      return'<div style="margin-bottom:6px;">'
        +'<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:4px;">'+grp.label+'</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:5px;">'
        +grp.opts.map(function(d){var sel=_wlDossier.distPrefs.includes(d);return'<button type="button" data-dist="'+d+'" onclick="wlToggleDist(this)" class="wlf-going-btn'+(sel?' on':'')+'">'+d+'</button>';}).join('')
        +'</div></div>';
    }).join('');
    return'<div id="wlft-conditions" class="wlf-tab-panel" style="display:none;">'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title" style="color:var(--grn);">Going &amp; Distance</span></div>'
        +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
          +'<div class="fg"><label>Going Preferences</label><div id="wlf-going" style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;">'+goingHtml+'</div></div>'
          +'<div class="fg"><label>Preferred Distance</label><div id="wlf-dist-btns" style="padding:4px 0;">'+distHtml+'</div></div>'
        +'</div>'
      +'</div>'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title" style="color:var(--grn);">Class, Style &amp; Track</span></div>'
        +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
          +'<div class="g2">'
            +'<div class="fg"><label>Preferred Class</label><select id="wlf-classpref" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-size:14px;"><option value="">— Any —</option><option value="Group"'+(e&&e.classPref==='Group'?' selected':'')+'>Group / Listed</option><option value="Class 1"'+(e&&e.classPref==='Class 1'?' selected':'')+'>Class 1</option><option value="Class 2"'+(e&&e.classPref==='Class 2'?' selected':'')+'>Class 2</option><option value="Class 3"'+(e&&e.classPref==='Class 3'?' selected':'')+'>Class 3</option><option value="Class 4"'+(e&&e.classPref==='Class 4'?' selected':'')+'>Class 4</option><option value="Class 5"'+(e&&e.classPref==='Class 5'?' selected':'')+'>Class 5</option><option value="Class 6"'+(e&&e.classPref==='Class 6'?' selected':'')+'>Class 6</option><option value="Class 7"'+(e&&e.classPref==='Class 7'?' selected':'')+'>Class 7</option></select></div>'
            +'<div class="fg"><label>Field Size</label><select id="wlf-fieldsize" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-size:14px;"><option value="">— Any —</option><option value="small"'+(e&&e.fieldSizePref==='small'?' selected':'')+'>Small (≤8)</option><option value="medium"'+(e&&e.fieldSizePref==='medium'?' selected':'')+'>Medium (9–14)</option><option value="large"'+(e&&e.fieldSizePref==='large'?' selected':'')+'>Large (15+)</option></select></div>'
          +'</div>'
          +'<div class="fg"><label>Running Style</label><div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;">'
            +['Front Runner','Prominent','Hold Up','Flexible'].map(function(rs){const sel=e&&e.runStyle===rs;return'<button type="button" onclick="wlSetRunStyle(this)" data-rs="'+rs+'" class="wlf-going-btn'+(sel?' on':'')+'" style="'+(sel?'--wlg-col:var(--grn);':'')+'">'+rs+'</button>';}).join('')
          +'</div></div>'
          +'<div class="fg"><label>Track Type</label><input type="text" id="wlf-track" placeholder="e.g. Straight, Galloping, Sharp" value="'+(e?e.trackPref||'':'')+'"></div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }());

  // ── Tab 3: Races ──────────────────────────────────────────────────────────
  const racesHtml=(function(){
    if(!e) return'';
    const pid=e.id;
    const rvws=(D.reviews||[]).filter(function(r){return r.profileId===pid;}).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    const RCOL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'var(--mut)',loss:'#f87171',missed:'#a78bfa'};
    return'<div id="wlft-races" class="wlf-tab-panel" style="display:none;">'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr" style="justify-content:space-between;"><span class="wlf-sec-title">Race Reviews</span>'
          +'<button onclick="openWLPostRaceReview(\''+pid+'\',\''+(e.horse||'').replace(/'/g,"\\'")+'\',\'\',\'\',\'\')" class="wlf-add-btn" style="margin:0;padding:4px 10px;font-size:11px;">+ Add Review</button>'
        +'</div>'
        +'<div class="wlf-sec-body">'
          +(rvws.length
            ?rvws.map(function(r){
                const rc=RCOL[r.result||'']||'var(--mut)';
                const stats=[
                  {lbl:'Pos',    val:r.position||'—'},
                  {lbl:'Dist',   val:r.distance||'—'},
                  {lbl:'Class',  val:r.raceClass||'—'},
                  {lbl:'Ground', val:r.going||r.groundConditions||'—'},
                  ...(r.result==='win'&&!r.beatenDistance?[]:[{lbl:'Beaten',val:r.beatenDistance||'—'}]),
                  {lbl:'SP',     val:r.odds||'—', color:r.odds?'var(--gld)':undefined},
                ];
                const statsRow=stats.length
                  ?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:5px;">'
                    +stats.map(function(s){
                      return'<span style="font-size:11px;background:var(--sur2);border:1px solid var(--bdr);border-radius:5px;padding:2px 7px;color:'+(s.color||'var(--txt)')+';">'
                        +'<span style="color:var(--mut);margin-right:3px;">'+s.lbl+'</span>'+s.val
                      +'</span>';
                    }).join('')
                  +'</div>'
                  :'';
                return'<div class="wlf-rvw-row">'
                  +'<div class="wlf-rvw-meta"><span>'+r.date+'</span>'+(r.raceName?'<span class="wlf-rvw-dot">·</span><span>'+r.raceName+'</span>':'')+(r.course?'<span class="wlf-rvw-dot">·</span><span>'+r.course+'</span>':'')+'<span class="wlf-rvw-badge" style="color:'+rc+';">'+(r.result||'').toUpperCase()+'</span></div>'
                  +statsRow
                  +(r.notes?'<div class="wlf-rvw-notes" style="margin-top:5px;">'+r.notes+'</div>':'')
                +'</div>';
              }).join('')
            :'<div style="font-size:12px;color:var(--mut);padding:8px 0;font-style:italic;">No race reviews yet — tap Add Review or use the Review button on Today after a run.</div>')
        +'</div>'
      +'</div>'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr" style="justify-content:space-between;"><span class="wlf-sec-title" style="color:var(--ora);">Future Targets</span>'
          +'<button onclick="wlAddTargetRow()" class="wlf-add-btn" style="margin:0;padding:4px 10px;font-size:11px;">+ Add Target</button>'
        +'</div>'
        +'<div class="wlf-sec-body"><div id="wlf-targets-list"></div></div>'
      +'</div>'
    +'</div>';
  }());

  // ── Tab 4: Intel ──────────────────────────────────────────────────────────
  const intelTabHtml=(function(){
    if(!e) return'';
    return'<div id="wlft-intel" class="wlf-tab-panel" style="display:none;">'
      // Trainer / Connections Intel
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr" style="justify-content:space-between;">'
          +'<span class="wlf-sec-title" style="color:#38bdf8;">Trainer / Connections Intel</span>'
          +'<button type="button" onclick="wlAddIntelEntry()" style="font-size:11px;font-weight:700;color:#38bdf8;background:rgba(56,189,248,.12);border:none;border-radius:6px;padding:3px 9px;cursor:pointer;">+ Add Entry</button>'
        +'</div>'
        +'<div class="wlf-sec-body" style="padding-top:0;">'
          +'<div id="wlf-intel-list"></div>'
          +'<div id="wlf-intel-new" style="display:none;border-top:1px solid var(--bdr);padding-top:10px;margin-top:6px;flex-direction:column;gap:8px;">'
            +'<div class="g2">'
              +'<div class="fg"><label>Date</label><input type="date" id="wlf-intel-new-date" value="'+td()+'"></div>'
              +'<div class="fg" style="flex:2;"><label>Source / Context</label><input type="text" id="wlf-intel-new-src" placeholder="e.g. Post-race interview, Press, Paddock" autocomplete="off"></div>'
            +'</div>'
            +'<div class="fg"><label>What they said / What you heard</label><textarea id="wlf-intel-new-text" placeholder="Trainer quote, connections update, paddock observation..." style="min-height:80px;"></textarea></div>'
            +'<div style="display:flex;gap:8px;justify-content:flex-end;">'
              +'<button type="button" onclick="wlCancelIntelEntry()" style="font-size:12px;font-weight:600;color:var(--mut);background:none;border:1px solid var(--bdr);border-radius:7px;padding:5px 14px;cursor:pointer;">Cancel</button>'
              +'<button type="button" onclick="wlSaveIntelEntry()" style="font-size:12px;font-weight:700;color:#fff;background:#38bdf8;border:none;border-radius:7px;padding:5px 14px;cursor:pointer;">Save Entry</button>'
            +'</div>'
          +'</div>'
        +'</div>'
      +'</div>'
      // Puzzle Report
      +'<div class="wlf-section" style="border:1px solid rgba(168,85,247,.2);border-radius:12px;background:rgba(168,85,247,.03);">'
        +'<div class="wlf-sec-hdr" style="border-color:rgba(168,85,247,.15);">'
          +'<span class="wlf-sec-title" style="color:#a855f7;">Puzzle Report</span>'
          +(e.aiAssessment?'<span style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:rgba(168,85,247,.12);color:#a855f7;">Generated</span>':'')
        +'</div>'
        +'<div class="wlf-sec-body" style="padding-top:4px;">'
          +(e.aiAssessment?(function(){
              const ai=e.aiAssessment;
              return'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'
                +(ai.level?'<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:8px;padding:8px 10px;"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:3px;">Level</div><div style="font-size:13px;font-weight:800;color:#60a5fa;">'+ai.level+'</div></div>':'')
                +(ai.sweet_spot?'<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:8px;padding:8px 10px;"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:3px;">Sweet Spot</div><div style="font-size:13px;font-weight:800;color:#f59e0b;">'+ai.sweet_spot+'</div></div>':'')
                +(ai.projection?'<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:8px;padding:8px 10px;grid-column:1/-1;"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:3px;">Projection</div><div style="font-size:13px;font-weight:700;color:#34d399;">'+ai.projection+'</div></div>':'')
                +(ai.verdict?'<div style="background:var(--sur2);border:1px solid rgba(168,85,247,.2);border-radius:8px;padding:8px 10px;grid-column:1/-1;"><div style="font-size:12px;color:var(--txt);line-height:1.6;font-style:italic;">'+ai.verdict+'</div></div>':'')
              +'</div>';
            })():'<div style="font-size:12px;color:var(--mut);line-height:1.6;margin-bottom:10px;">Generate an AI assessment of this horse\'s form, ideal conditions and race targets.</div>')
          +'<button type="button" id="wlf-ai-btn" onclick="wlAIAssess()" style="width:100%;padding:10px;border-radius:9px;border:1.5px solid rgba(168,85,247,.4);background:rgba(168,85,247,.07);color:#a855f7;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/></svg>'+(e.aiAssessment?'Regenerate Puzzle Report':'Generate Puzzle Report')+'</button>'
          +'<div id="wlf-ai-result" style="display:none;margin-top:10px;border-radius:9px;border:1px solid rgba(168,85,247,.25);background:rgba(168,85,247,.06);padding:12px 13px;"></div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }());

  // ── Tab bar (existing profiles only) ──────────────────────────────────────
  const TABS=e?[{id:'horse',label:'Profile'},{id:'conditions',label:'Conditions'},{id:'races',label:'Races'},{id:'intel',label:'Intel'}]:[];
  const tabBarHtml=e?('<div class="wlf-tab-bar" style="display:flex;border-bottom:2px solid var(--bdr);background:var(--sur2);padding:0 8px;gap:0;">'
    +TABS.map(function(t){
      const on=t.id===defaultTab;
      return'<button data-wlftab="'+t.id+'" onclick="wlSwitchTab(\''+t.id+'\')" class="wlf-tab-btn" style="font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:11px 14px;border:none;border-bottom:2px solid '+(on?'var(--navy)':'transparent')+';margin-bottom:-2px;background:transparent;color:'+(on?'var(--navy)':'var(--mut)')+';cursor:pointer;white-space:nowrap;">'+t.label+'</button>';
    }).join('')
  +'</div>'):'';

  // ── Single-page scrollable form for new profiles ───────────────────────────
  const newProfileBodyHtml=!e?(function(){
    return'<div class="wlf-body">'
      // ── Horse Identity ──
      +'<div class="wlf-section">'
        +'<div style="padding:12px 13px 0;">'
          +'<button type="button" id="wlf-scan-btn" onclick="wlScanScreenshot()" style="width:100%;padding:11px;border-radius:9px;border:1.5px dashed rgba(250,204,21,.4);background:rgba(250,204,21,.06);color:var(--gld);font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.02em;">📷 Scan Screenshot — fill from Racing Post / ATR</button>'
          +'<div id="wlf-scan-notice" style="display:none;font-size:12px;color:var(--grn);padding:6px 2px 0;"></div>'
        +'</div>'
        +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
          +'<div class="fg"><label>Horse Name</label><input type="text" id="wlf-horse" value="'+(p.horse||'')+'"></div>'
          +'<div class="g2">'
            +'<div class="fg"><label>Trainer</label><input type="text" id="wlf-trainer" value="'+(p.trainer||'')+'"></div>'
            +'<div class="fg"><label>Age</label><input type="number" id="wlf-age" min="2" max="20" placeholder="e.g. 3" value="'+(p.age||'')+'"></div>'
          +'</div>'
          +'<div class="g2">'
            +'<div class="fg"><label>Current OR</label><input type="number" id="wlf-rating" placeholder="e.g. 85" value="'+(p.currentRating||'')+'"></div>'
            +'<div class="fg"><label style="color:var(--gld);">My Mark (MR) ★</label><input type="number" id="wlf-myrating" placeholder="e.g. 88" value="" class="wlf-mr-input"></div>'
          +'</div>'
        +'</div>'
      +'</div>'
      // ── Why Am I Watching ──
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title">Why Am I Watching?</span></div>'
        +'<div style="display:flex;gap:5px;flex-wrap:wrap;padding:12px 13px 13px;" id="wlf-reasons">'+reasonHtml+'</div>'
        +'<input type="hidden" id="wlf-reason" value="'+curReason+'">'
        +'<div class="wlf-sec-body">'
          +'<div class="fg"><label>In a sentence…</label><input type="text" id="wlf-reason-note" placeholder="e.g. Kept on well from rear, bumped 2f out — needs a clearer run" value="" autocomplete="off"></div>'
          +'<div id="wlf-unraced-row" style="display:'+(showUnraced?'flex':'none')+';align-items:center;gap:10px;padding:10px 13px;background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2);border-radius:9px;">'
            +'<input type="checkbox" id="wlf-unraced" onchange="wlToggleUnraced()" style="width:16px;height:16px;accent-color:#fb7185;cursor:pointer;flex-shrink:0;">'
            +'<label for="wlf-unraced" style="font-size:12px;font-weight:700;color:var(--txt);cursor:pointer;margin:0;">Unraced — no observations possible yet</label>'
          +'</div>'
        +'</div>'
      +'</div>'
      // ── First Sighting ──
      +(function(){
        const fs=p.firstSighting||{};
        const goingOpts=['Firm','Good to Firm','Good','Good to Soft','Soft','Heavy','Standard','Standard to Slow','Slow'];
        const resultBtns=[{k:'win',lbl:'Win',col:'var(--grn)'},{k:'place',lbl:'Place',col:'var(--gld)'},{k:'unplaced',lbl:'Unplaced',col:'var(--red)'}];
        return'<div class="wlf-section" style="border:1px solid rgba(56,189,248,.25);border-radius:12px;background:rgba(56,189,248,.04);">'
          +'<div class="wlf-sec-hdr" style="border-color:rgba(56,189,248,.15);">'
            +'<span class="wlf-sec-title" style="color:#38bdf8;">First Sighting</span>'
            +(fs.course?'<span style="font-size:11px;font-weight:400;color:#38bdf8;margin-left:8px;">Pre-filled from results</span>':'<span style="font-size:11px;font-weight:400;color:var(--mut);margin-left:8px;">— what did you see?</span>')
          +'</div>'
          +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
            +'<div class="g2">'
              +'<div class="fg"><label>Date Seen</label><input type="date" id="wlf-sight-date" value="'+(fs.date||td())+'"></div>'
              +'<div class="fg"><label>Course</label><input type="text" id="wlf-sight-course" placeholder="e.g. Newmarket" value="'+(fs.course||'')+'" autocomplete="off"></div>'
            +'</div>'
            +'<div class="g2">'
              +'<div class="fg"><label>Race Name</label><input type="text" id="wlf-sight-race" placeholder="e.g. Betfair Handicap" value="'+(fs.race||'')+'" autocomplete="off"></div>'
              +'<div class="fg"><label>Distance</label>'
                +'<select id="wlf-sight-dist" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-family:var(--font);font-size:14px;">'
                +'<option value="">— Select —</option>'
                +(function(){var opts=['5f','6f','7f','1m','1m 1f','1m 2f','1m 3f','1m 4f','1m 6f','2m','2m 1f','2m 2f','2m 4f','2m 6f','3m','3m 2f'];var norm=function(s){return(s||'').toLowerCase().replace(/\s+/g,'');};var nd=norm(fs.dist||'');return opts.map(function(d){return'<option'+(norm(d)===nd?' selected':'')+'>'+d+'</option>';}).join('');})()
                +'</select>'
              +'</div>'
            +'</div>'
            +'<div class="g2">'
              +'<div class="fg"><label>Going</label>'
                +(function(){var sel=function(g){return g.toLowerCase()===(fs.going||'').toLowerCase().trim()?'selected':'';};return'<select id="wlf-sight-going" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-size:14px;">'+(['','Firm','Good to Firm','Good','Good to Soft','Soft','Heavy','Standard','Standard to Slow','Slow'].map(function(g){return'<option value="'+g+'"'+(g&&sel(g)?' selected':'')+'>'+(g||'— Select —')+'</option>';}).join(''))+'</select>';})()
              +'</div>'
              +'<div class="fg"><label>Class</label>'
                +'<select id="wlf-sight-class" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--inp,var(--sur));color:var(--txt);font-family:var(--font);font-size:14px;">'
                +'<option value="">— Select —</option>'
                +(function(){var opts=['1','2','3','4','5','6','7','Group 1','Group 2','Group 3','Listed','Novice','Maiden','Handicap','Conditions'];var rn=fs.race||'';var normCls=(fs.cls||'');if(/\bGroup\s*1\b|\bGr(ade)?\s*1\b|\bG1\b/i.test(rn))normCls='Group 1';else if(/\bGroup\s*2\b|\bGr(ade)?\s*2\b|\bG2\b/i.test(rn))normCls='Group 2';else if(/\bGroup\s*3\b|\bGr(ade)?\s*3\b|\bG3\b/i.test(rn))normCls='Group 3';else if(/\bListed\b/i.test(rn))normCls='Listed';return opts.map(function(c){return'<option'+(c===normCls?' selected':'')+'>'+c+'</option>';}).join('');})()
                +'</select>'
              +'</div>'
            +'</div>'
            +'<div class="fg"><label>Result</label><div class="rvw-btn-group" id="wlf-sight-result-row">'
            +resultBtns.map(function(r){const on=fs.result===r.k;return'<button type="button" data-sr="'+r.k+'" onclick="wlSightResult(this)" class="rvw-btn'+(on?' on':'')+'" style="--rvw-col:'+r.col+';'+(on?'background:'+r.col+';color:#fff;border-color:'+r.col+';':'')+'"  >'+r.lbl+'</button>';}).join('')
            +'</div></div>'
            +'<div class="g2" id="wlf-sight-pos-row" style="display:'+(fs.result==='win'||fs.result==='place'?'grid':'none')+';">'
              +'<div class="fg"><label>Finishing Position</label><input type="text" id="wlf-sight-pos" placeholder="e.g. 2" value="'+(fs.position||'')+'" autocomplete="off"></div>'
            +'</div>'
            +'<div class="fg"><label>What did you see?</label><textarea id="wlf-sight-notes" placeholder="What caught your eye — running style, finish, unlucky in running, potential..." style="min-height:72px;"></textarea></div>'
          +'</div>'
        +'</div>';
      }())
    +'</div>';
  }()):'';

  modal.innerHTML=
  '<div class="wlf-page">'
  +'<div class="wlf-nav">'
    +'<div class="wlf-brand">RACING <span class="wlf-brand-accent">PUZZLE</span></div>'
    +'<div class="wlf-nav-btns">'
      +(e?'<button onclick="delWLEntry(\''+e.id+'\')" class="wlf-del-btn">Delete</button>':'')
      +'<button onclick="var _r=window._wlEditReturnId;window._wlEditReturnId=null;document.getElementById(\'wl-modal\').remove();if(_r)openWLProfile(_r);" class="wlf-close-btn">✕</button>'
    +'</div>'
  +'</div>'
  +'<div class="wlf-hero">'
    +(e
      ?'<div class="wlf-hero-title">'+e.horse+'</div>'
       +'<div style="display:flex;align-items:center;gap:10px;margin-top:4px;">'
         +(mom?'<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,.12);color:'+mom.col+';">'+mom.icon+' '+mom.label+'</span>':'')
         +'<span style="font-size:11px;color:rgba(255,255,255,.6);">'+c.pct+'% complete</span>'
         +'<div style="flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:2px;max-width:80px;"><div style="height:100%;width:'+c.pct+'%;background:'+pctCol+';border-radius:2px;"></div></div>'
       +'</div>'
      :'<div class="wlf-hero-title" style="color:rgba(255,255,255,.7);">New Profile</div><div class="wlf-hero-sub">Create a puzzle profiler entry</div>')
  +'</div>'
  +tabBarHtml
  +(e
    ?('<div class="wlf-body">'+horseTabHtml+conditionsTabHtml+racesHtml+intelTabHtml+'</div>')
    :newProfileBodyHtml)
  +'<div class="wlf-actions">'
    +'<button class="wlf-save-btn" onclick="saveWLEntry(\''+(e?e.id:'')+'\')">'+( e?'Save Profile':'Create Profile')+'</button>'
    +'<button class="wlf-cancel-btn" onclick="var _r=window._wlEditReturnId;window._wlEditReturnId=null;document.getElementById(\'wl-modal\').remove();if(_r)openWLProfile(_r);">Cancel</button>'
  +'</div>'
  +'</div>';

  document.body.appendChild(modal);
  _renderObsList();_renderTargetsList();_wlRenderIntelList();
  if(e)wlSwitchTab(defaultTab);
  setTimeout(function(){
    const f=document.getElementById('wlf-horse');if(f)f.focus();
  },100);
  }catch(err){alert('Profile error: '+err.message);console.error(err);}
}

function _renderObsList(){
  const el=document.getElementById('wlf-obs-list');if(!el)return;
  if(!_wlDossier.obs.length){el.innerHTML='<div class="wlf-obs-empty">No observations yet — tap Add to log a run</div>';return;}
  el.innerHTML=_wlDossier.obs.map(function(o,i){
    return'<div class="wlf-obs-row">'
      +'<div class="wlf-obs-hdr"><span class="wlf-obs-lbl">Observation '+(i+1)+'</span><button onclick="_wlDelObs('+i+')" class="wlf-obs-del">✕ Remove</button></div>'
      +'<div class="g2" style="margin-bottom:8px;">'
      +'<div class="fg"><label>Date</label><input type="date" value="'+(o.date||'')+'" onchange="_wlDossier.obs['+i+'].date=this.value"></div>'
      +'<div class="fg"><label>Result</label><select onchange="_wlDossier.obs['+i+'].result=this.value">'
      +'<option value=""'+((!o.result)?' selected':'')+'>— Select</option>'
      +'<option value="win"'+((o.result==="win")?' selected':'')+'>Won</option>'
      +'<option value="place"'+((o.result==="place")?' selected':'')+'>Placed</option>'
      +'<option value="loss"'+((o.result==="loss")?' selected':'')+'>Unplaced</option>'
      +'</select></div>'
      +'<div class="fg"><label>Race / Track</label><input type="text" value="'+(o.raceName||'')+'" placeholder="e.g. Newmarket Maiden" onchange="_wlDossier.obs['+i+'].raceName=this.value"></div>'
      +'<div class="fg"><label>Going</label><input type="text" value="'+(o.going||'')+'" placeholder="e.g. Good to Firm" onchange="_wlDossier.obs['+i+'].going=this.value"></div>'
      +'</div>'
      +'<div class="fg"><label>Your Notes</label><textarea style="min-height:52px;" placeholder="What you noticed…" onchange="_wlDossier.obs['+i+'].notes=this.value">'+(o.notes||'')+'</textarea></div>'
    +'</div>';
  }).join('');
}


function _renderTargetsList(){
  const el=document.getElementById('wlf-targets-list');if(!el)return;
  if(!_wlDossier.targets.length){el.innerHTML='<div class="wlf-target-empty">No targets set — tap Add to plan a race</div>';return;}
  el.innerHTML=_wlDossier.targets.map(function(t,i){
    return'<div class="wlf-target-row">'
      +'<div class="wlf-obs-hdr"><span class="wlf-target-lbl">🎯 Target '+(i+1)+'</span><button onclick="_wlDelTarget('+i+')" class="wlf-obs-del">✕ Remove</button></div>'
      +'<div class="g2">'
      +'<div class="fg"><label>Race</label><input type="text" value="'+(t.race||'')+'" placeholder="e.g. Sandy Lane" onchange="_wlDossier.targets['+i+'].race=this.value"></div>'
      +'<div class="fg"><label>Track</label><input type="text" value="'+(t.track||'')+'" placeholder="e.g. Haydock" onchange="_wlDossier.targets['+i+'].track=this.value"></div>'
      +'<div class="fg"><label>Date</label><input type="date" value="'+(t.date||'')+'" onchange="_wlDossier.targets['+i+'].date=this.value"></div>'
      +'<div class="fg"><label>Condition</label><input type="text" value="'+(t.condition||'')+'" placeholder="Optional notes" onchange="_wlDossier.targets['+i+'].condition=this.value"></div>'
      +'</div>'
    +'</div>';
  }).join('');
}

function wlAddTargetRow(){
  _wlDossier.targets.push({id:gid(),race:'',track:'',date:'',condition:''});
  _renderTargetsList();
  setTimeout(function(){const el=document.getElementById('wlf-targets-list');if(el&&el.lastElementChild)el.lastElementChild.scrollIntoView({behavior:'smooth',block:'nearest'});},50);
}
function _wlDelTarget(i){_wlDossier.targets.splice(i,1);_renderTargetsList();}

function _wlRenderIntelList(){
  const el=document.getElementById('wlf-intel-list');if(!el)return;
  const entries=_wlDossier.intel||[];
  if(!entries.length){
    el.innerHTML='<div style="font-size:12px;color:var(--mut);padding:8px 0 4px;">No entries yet — tap + Add Entry to start the timeline.</div>';
    return;
  }
  el.innerHTML=entries.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}).map(function(en,_i){
    const idx=entries.indexOf(en);
    return'<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--bdr);">'
      +'<div style="display:flex;flex-direction:column;align-items:center;gap:0;flex-shrink:0;">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:var(--blu);margin-top:3px;"></div>'
        +(_i<entries.length-1?'<div style="width:1px;flex:1;background:var(--bdr);margin-top:4px;min-height:24px;"></div>':'')
      +'</div>'
      +'<div style="flex:1;min-width:0;">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">'
          +'<div>'
            +'<span style="font-size:11px;font-weight:700;color:var(--blu);">'+(en.date||'')+'</span>'
            +(en.source?'<span style="font-size:10px;color:var(--mut);margin-left:6px;">'+esc(en.source)+'</span>':'')
          +'</div>'
          +'<button onclick="_wlDelIntel('+idx+')" style="font-size:10px;color:var(--mut);background:none;border:none;cursor:pointer;flex-shrink:0;padding:0 2px;">✕</button>'
        +'</div>'
        +'<div style="font-size:13px;color:var(--txt);line-height:1.6;white-space:pre-wrap;">'+esc(en.text||'')+'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}
function _wlDelIntel(i){if(!confirm('Remove this intel entry?'))return;_wlDossier.intel.splice(i,1);_wlRenderIntelList();}
function wlAddIntelEntry(){
  const n=document.getElementById('wlf-intel-new');
  if(n){n.style.display='flex';const t=document.getElementById('wlf-intel-new-text');if(t)t.focus();}
}
function wlCancelIntelEntry(){
  const n=document.getElementById('wlf-intel-new');if(n)n.style.display='none';
  const t=document.getElementById('wlf-intel-new-text');if(t)t.value='';
  const s=document.getElementById('wlf-intel-new-src');if(s)s.value='';
}
function wlSaveIntelEntry(){
  const text=(document.getElementById('wlf-intel-new-text')||{value:''}).value.trim();
  if(!text)return;
  const date=(document.getElementById('wlf-intel-new-date')||{value:td()}).value||td();
  const source=(document.getElementById('wlf-intel-new-src')||{value:''}).value.trim();
  _wlDossier.intel.push({id:gid(),date,source,text});
  wlCancelIntelEntry();
  _wlRenderIntelList();
}

function wlSelectReason(btn){
  const val=btn.getAttribute('data-reason');
  const hidden=document.getElementById('wlf-reason');
  if(hidden)hidden.value=val;
  document.querySelectorAll('#wlf-reasons button').forEach(function(b){
    const sel=b.getAttribute('data-reason')===val;
    const col=b.getAttribute('data-col')||'#a78bfa';
    b.className='wlf-reason-btn'+(sel?' on':'');
    b.style.background=sel?col:'';
    b.style.borderColor=sel?col:'';
    b.style.color=sel?'#fff':'';
  });
  // Show unraced toggle only for trainer intel / tip source
  const unracedRow=document.getElementById('wlf-unraced-row');
  if(unracedRow)unracedRow.style.display=(val==='trainer-intel'||val==='tip-source')?'':'none';
  // If switching away from those reasons, uncheck unraced and show obs fields
  if(val!=='trainer-intel'&&val!=='tip-source'){
    const cb=document.getElementById('wlf-unraced');
    if(cb){cb.checked=false;wlToggleUnraced(false);}
  }
}

function wlToggleUnraced(forceVal){
  const cb=document.getElementById('wlf-unraced');
  const isUnraced=typeof forceVal==='boolean'?forceVal:(cb&&cb.checked);
  const obsSection=document.getElementById('wlf-initial-race');
  if(obsSection)obsSection.style.display=isUnraced?'none':'';
}

function wlToggleDist(btn){
  const d=btn.getAttribute('data-dist');
  if(!_wlDossier.distPrefs)_wlDossier.distPrefs=[];
  const idx=_wlDossier.distPrefs.indexOf(d);
  if(idx>-1){_wlDossier.distPrefs.splice(idx,1);}else{_wlDossier.distPrefs.push(d);}
  btn.className='wlf-going-btn'+(_wlDossier.distPrefs.includes(d)?' on':'');
}
function wlToggleGoing(btn){
  const g=btn.getAttribute('data-going');
  if(!_wlDossier.goingPrefs)_wlDossier.goingPrefs=[];
  const idx=_wlDossier.goingPrefs.indexOf(g);
  if(idx>-1){_wlDossier.goingPrefs.splice(idx,1);}else{_wlDossier.goingPrefs.push(g);}
  const sel=_wlDossier.goingPrefs.includes(g);
  btn.className='wlf-going-btn'+(sel?' on':'');
}

function wlSightResult(btn){
  const row=document.getElementById('wlf-sight-result-row');
  if(!row)return;
  const isOn=btn.classList.contains('on');
  row.querySelectorAll('[data-sr]').forEach(function(b){b.classList.remove('on');b.style.background='';b.style.color='';});
  const selected=isOn?null:btn.dataset.sr;
  if(!isOn){btn.classList.add('on');btn.style.background=btn.style.getPropertyValue('--rvw-col')||'rgba(255,255,255,.15)';btn.style.color='#fff';}
  const posRow=document.getElementById('wlf-sight-pos-row');
  if(posRow)posRow.style.display=(selected==='win'||selected==='place')?'grid':'none';
}

function wlSetRunStyle(btn){
  const rs=btn.dataset.rs;
  const isOn=btn.classList.contains('on');
  document.querySelectorAll('[data-rs]').forEach(function(b){b.classList.remove('on');b.style.removeProperty('--wlg-col');});
  if(!isOn){btn.classList.add('on');btn.style.setProperty('--wlg-col','var(--grn)');}
  const hid=document.getElementById('wlf-runstyle-val');
  if(hid)hid.value=isOn?'':rs;
}

function saveWLEntry(id){
  const horse=(document.getElementById('wlf-horse').value||'').trim();
  if(!horse){alert('Enter a horse name.');return;}
  const wl=getWL();
  const old=id?wl.find(x=>x.id===id):null;
  const goingPrefs=_wlDossier.goingPrefs||[];
  const raceDate=old?old.raceDate||'':'';
  const entry={
    id:id||gid(),horse,
    currentRating:document.getElementById('wlf-rating').value.trim()||'',
    myRating:document.getElementById('wlf-myrating').value.trim()||'',
    orHistory:(function(){
      const newOR=document.getElementById('wlf-rating').value.trim();
      const prev=old?old.orHistory||[]:[];
      if(newOR&&(!prev.length||prev[prev.length-1].or!==newOR)){
        return [...prev,{or:newOR,date:td()}];
      }
      return prev;
    })(),
    mrHistory:(function(){
      const newMR=(document.getElementById('wlf-myrating').value||'').trim();
      const prev=old?old.mrHistory||[]:[];
      if(newMR&&(!prev.length||prev[prev.length-1].mr!==newMR)){
        return [...prev,{mr:newMR,date:td()}];
      }
      return prev;
    })(),
    trainer:(document.getElementById('wlf-trainer').value||'').trim(),
    age:parseInt((document.getElementById('wlf-age')||{value:''}).value)||0,
    surface:(document.getElementById('wlf-surface')||{value:''}).value||'',
    raceType:(document.getElementById('wlf-race-type')||{value:''}).value||'',
    reason:(document.getElementById('wlf-reason')||{value:'eye-catcher'}).value||'eye-catcher',
    reasonNote:(document.getElementById('wlf-reason-note')||{value:''}).value.trim(),
    unraced:!!(document.getElementById('wlf-unraced')&&document.getElementById('wlf-unraced').checked),
    intelEntries:(_wlDossier.intel||[]).slice(),
    trainerIntel:(_wlDossier.intel&&_wlDossier.intel.length)?_wlDossier.intel[_wlDossier.intel.length-1].text:'', // legacy fallback for AI coach read
    observations:old?old.observations||[]:(_wlDossier.obs||[]),
    targets:_wlDossier.targets.filter(function(t){return t.race;}),
    goingPrefs,
    distancePref:(_wlDossier.distPrefs||[]).join(', '),
    distanceWins:old?old.distanceWins||[]:[], // preserved — set by review inference
    _goingPoor:old?old._goingPoor||{}:{},    // preserved — set by review inference
    trackPref:((document.getElementById('wlf-track')||{value:''}).value||'').trim(),
    classPref:(document.getElementById('wlf-classpref')||{value:''}).value||'',
    fieldSizePref:(document.getElementById('wlf-fieldsize')||{value:''}).value||'',
    runStyle:(function(){const b=document.querySelector('[data-rs].on');return b?b.dataset.rs:'';})(),
    conditionsNotes:old?old.conditionsNotes||'':'', // field removed from form — preserve existing value
    notes:old?old.notes||'':'',
    betReadiness:old?old.betReadiness||'watching':'watching', // preserved — set by review flow
    needsReview:old?old.needsReview||false:false,             // preserved — set by review flow
    aiAssessment:old?old.aiAssessment||null:null,
    aiAssessedAt:old?old.aiAssessedAt||null:null,
    raceDate,
    createdAt:old?old.createdAt||Date.now():Date.now(),
    updatedAt:(function(){
      if(!old)return Date.now();
      // Only bump the timestamp if something the user can edit actually changed
      const _changed=function(a,b){return JSON.stringify(a)!==JSON.stringify(b);};
      const fields=['horse','trainer','age','surface','raceType','reason','reasonNote','unraced',
        'currentRating','myRating','goingPrefs','distancePref','trackPref','classPref',
        'fieldSizePref','runStyle','intelEntries'];
      const newVals={horse,trainer:entry.trainer,age:entry.age,surface:entry.surface,
        raceType:entry.raceType,reason:entry.reason,reasonNote:entry.reasonNote,
        unraced:entry.unraced,currentRating:entry.currentRating,myRating:entry.myRating,
        goingPrefs:entry.goingPrefs,distancePref:entry.distancePref,trackPref:entry.trackPref,
        classPref:entry.classPref,fieldSizePref:entry.fieldSizePref,runStyle:entry.runStyle,
        intelEntries:entry.intelEntries};
      const oldVals={horse:old.horse,trainer:old.trainer,age:old.age,surface:old.surface,
        raceType:old.raceType,reason:old.reason,reasonNote:old.reasonNote,
        unraced:old.unraced,currentRating:old.currentRating,myRating:old.myRating,
        goingPrefs:old.goingPrefs,distancePref:old.distancePref,trackPref:old.trackPref,
        classPref:old.classPref,fieldSizePref:old.fieldSizePref,runStyle:old.runStyle,
        intelEntries:old.intelEntries};
      return _changed(newVals,oldVals)?Date.now():(old.updatedAt||old.createdAt||Date.now());
    })()
  };
  const old2=id?(D.watchlist||[]).find(x=>x.id===id):null;
  const removedTargetIds=old2?(old2.targets||[]).filter(function(t){return !entry.targets.find(function(n){return n.id===t.id;});}).map(function(t){return t.id;}).filter(Boolean):[];
  if(id){const idx=wl.findIndex(x=>x.id===id);if(idx>-1)wl[idx]=entry;else wl.push(entry);}
  else wl.push(entry);
  D.watchlist=wl;
  // If this is a new profile, clean up any orphaned Quick MR Rating for this horse
  if(!id&&D.ratings){
    const rKey=(horse||'').toLowerCase().trim();
    if(D.ratings[rKey])delete D.ratings[rKey];
  }
  // ── First Sighting: auto-create review for new profiles ──────────────────
  if(!id){
    const sDate=(document.getElementById('wlf-sight-date')||{value:''}).value;
    const sCourse=(document.getElementById('wlf-sight-course')||{value:''}).value.trim();
    const sRace=(document.getElementById('wlf-sight-race')||{value:''}).value.trim();
    const sDist=(document.getElementById('wlf-sight-dist')||{value:''}).value.trim();
    const sClass=(document.getElementById('wlf-sight-class')||{value:''}).value.trim();
    const sGoing=(document.getElementById('wlf-sight-going')||{value:''}).value;
    const sNotes=(document.getElementById('wlf-sight-notes')||{value:''}).value.trim();
    const sResultBtn=document.querySelector('#wlf-sight-result-row [data-sr].on');
    const sResult=sResultBtn?sResultBtn.dataset.sr:'';
    const sPos=(document.getElementById('wlf-sight-pos')||{value:''}).value.trim();
    const hasSighting=sDate||sCourse||sRace||sDist||sGoing||sNotes||sResult;
    if(hasSighting){
      const rev={
        id:gid(),profileId:entry.id,
        date:sDate||td(),
        course:sCourse,raceName:sRace,
        distance:sDist,raceClass:sClass,
        raceGoing:sGoing,going:sGoing,groundConditions:sGoing,
        result:sResult||'watched',
        position:sPos,
        notes:sNotes,
        source:'first-sighting',
        createdAt:Date.now()
      };
      D.reviews=D.reviews||[];
      D.reviews.push(rev);
      _wlInferFromReview(entry.id,rev);
    }
  }
  save();
  if(removedTargetIds.length) supaDeleteTargetsByIds(removedTargetIds).catch(function(){});
  const _retId=window._wlEditReturnId;window._wlEditReturnId=null;
  document.getElementById('wl-modal').remove();
  renderWatchlist();
  if(_retId)openWLProfile(_retId);
  else if(entry.raceDate&&wlView==='cal'){wlCalDate=new Date(entry.raceDate+'T00:00:00');renderWLCal();setTimeout(function(){wlSelectDay(entry.raceDate);},100);}
}

function wlDeleteReview(reviewId, profileId){
  if(!confirm('Delete this review permanently?'))return;
  D.reviews=(D.reviews||[]).filter(function(r){return r.id!==reviewId;});
  save();
  openWLProfile(profileId);
}

function wlDeleteTarget(profileId, targetIdOrRace){
  const idx=D.watchlist.findIndex(function(x){return x.id===profileId;});
  if(idx===-1)return;
  const before=D.watchlist[idx].targets||[];
  // Match by id first, fall back to race name
  const removed=before.filter(function(t){return t.id===targetIdOrRace||t.race===targetIdOrRace;});
  D.watchlist[idx].targets=before.filter(function(t){return t.id!==targetIdOrRace&&t.race!==targetIdOrRace;});
  D.watchlist[idx].updatedAt=Date.now();
  const removedIds=removed.map(function(t){return t.id;}).filter(Boolean);
  if(removedIds.length)supaDeleteTargetsByIds(removedIds).catch(function(){});
  save();
  openWLProfile(profileId);
}

function delWLEntry(id){
  if(!confirm('Delete this profile permanently?'))return;
  // Explicitly delete observations and targets from DB before removing profile
  supaDeleteProfileObsAndTargets(id).catch(function(){});
  // Remove reviews locally so _syncReviews doesn't try to upsert them against a deleted profile
  D.reviews=(D.reviews||[]).filter(function(r){return r.profileId!==id;});
  D.watchlist=(D.watchlist||[]).filter(x=>x.id!==id);save();
  document.getElementById('wl-modal').remove();
  renderWatchlist();
}



// ══════════════════════════════════════════════════════════════
// PUZZLE PROFILER — FULL PROFILE CARD VIEW
// ══════════════════════════════════════════════════════════════

const WLP_CSS = `
#wlp-modal {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: var(--bg);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.wlp-page {
  max-width: 500px;
  margin: 0 auto;
  padding-bottom: 40px;
  font-family: var(--font);
  color: var(--txt);
}
@media (min-width: 768px) {
  #wlp-modal {
    background: rgba(0,0,0,.55);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 16px 32px;
  }
  .wlp-page {
    max-width: 860px;
    width: 100%;
    background: var(--bg);
    border-radius: 16px;
    box-shadow: 0 24px 80px rgba(0,0,0,.45);
    overflow: hidden;
    margin: 0;
  }
  .wlp-sections-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    align-items: start;
  }
  .wlp-sections-grid .wlp-section:nth-child(odd) {
    border-right: 1px solid var(--bdr);
  }
}
/* NAV */
.wlp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top, 14px)) 16px 12px;
  background: var(--navy);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--bdr);
  position: sticky;
  top: 0;
  z-index: 20;
}
.wlp-back {
  display: flex; align-items: center; gap: 5px;
  height: 34px;
  border-radius: 8px;
  background: var(--sur2);
  border: 1px solid var(--bdr);
  padding: 0 12px;
  cursor: pointer; font-size: 14px; color: #fff;
  font-family: var(--font);
  font-weight: 700; letter-spacing: .5px;
  white-space: nowrap;
}
.wlp-brand {
  font-family: var(--font);
  font-size: 14px; font-weight: 800;
  letter-spacing: 2px; text-transform: uppercase;
  color: #fff;
  display: flex; align-items: center; gap: 7px;
}
.wlp-brand-accent { color: var(--gld2); }
.wlp-edit-btn {
  font-family: var(--font);
  font-size: 12px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase;
  color: var(--gld2);
  padding: 6px 13px;
  border: 1px solid CLR_WATCH_A7;
  border-radius: 8px;
  background: CLR_WATCH_A1;
  cursor: pointer;
}
/* HERO */
.wlp-hero {
  background: var(--sur);
  border-bottom: 1px solid var(--bdr);
  overflow: hidden;
  padding: 18px 16px 0;
  position: relative;
}
.wlp-hero-bg {
  position: absolute; right: -10px; top: 0;
  width: 180px; height: 170px;
  opacity: .05; font-size: 140px; line-height: 1;
  pointer-events: none; user-select: none; filter: grayscale(1);
}
.wlp-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative; z-index: 1;
}
.wlp-name-row { display: flex; align-items: center; gap: 8px; }
.wlp-name {
  
  font-size: 40px; letter-spacing: 2px; color: #fff; line-height: 1;
}
.wlp-verified {
  width: 20px; height: 20px; background: var(--gld2); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: #fff; margin-top: 4px; flex-shrink: 0;
}
.wlp-reason-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--font);
  font-size: 10px; font-weight: 800;
  letter-spacing: 1.5px; text-transform: uppercase;
  padding: 3px 8px; border-radius: 5px; margin-top: 4px;
}
.wlp-or-box {
  background: var(--sur2);
  border: 1.5px solid CLR_WATCH_A6;
  border-radius: 10px; padding: 7px 13px; text-align: center;
}
.wlp-or-label {
  font-family: var(--font);
  font-size: 9px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: var(--mut); display: block; margin-bottom: 1px;
}
.wlp-or-value {
  font-size: 32px; letter-spacing: 1px; color: #fff; line-height: 1;
}
.wlp-or-na {
  font-family: var(--font);
  font-size: 13px; font-weight: 700; color: var(--mut);
}
/* META STRIP */
.wlp-meta {
  display: flex; position: relative; z-index: 1;
  margin-top: 14px;
  border-top: 1px solid var(--bdr); border-bottom: 1px solid var(--bdr);
}
.wlp-meta-cell {
  flex: 1; padding: 9px 11px; border-right: 1px solid var(--bdr);
}
.wlp-meta-cell:last-child { border-right: none; }
.wlp-meta-label {
  font-family: var(--font);
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--mut); display: block; margin-bottom: 3px;
}
.wlp-meta-val {
  font-family: var(--font);
  font-size: 13px; font-weight: 700; color: #fff;
}
/* HERO BODY */
.wlp-hero-body {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 14px 0 14px; position: relative; z-index: 1;
}
.wlp-silks {
  width: 92px; height: 92px; flex-shrink: 0; border-radius: 50%;
  background: var(--sur2); border: 2.5px solid rgba(139,92,246,.35);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 16px rgba(139,92,246,.2);
}
.wlp-stats { flex: 1; display: flex; flex-direction: column; }
.wlp-stat-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 0; border-bottom: 1px solid var(--bdr);
}
.wlp-stat-row:last-child { border-bottom: none; }
.wlp-stat-left {
  font-family: var(--font);
  font-size: 12px; font-weight: 600; color: var(--mut);
  display: flex; align-items: center; gap: 6px;
}
.wlp-stat-val {
  
  font-size: 20px; letter-spacing: 1px; line-height: 1;
}
.wlp-stat-sm {
  font-family: var(--font);
  font-size: 12px; font-weight: 700; color: #fff;
}
.wlp-edge-badge {
  
  font-size: 15px; letter-spacing: 1px; padding: 2px 8px; border-radius: 5px;
}
/* EDGE BAR */
.wlp-edge-bar { padding: 2px 0 10px; position: relative; z-index: 1; }
.wlp-edge-bar-track { height: 4px; background: var(--sur2); border-radius: 2px; overflow: hidden; }
.wlp-edge-bar-fill { height: 100%; border-radius: 2px; }
/* SECTIONS */
.wlp-section {
  background: var(--sur); border: 1px solid var(--bdr);
  border-radius: 13px; margin: 10px 12px 0; overflow: hidden;
}
.wlp-section-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; border-bottom: 1px solid var(--bdr);
}
.wlp-section-left { display: flex; align-items: center; gap: 9px; }
.wlp-section-num {
  width: 24px; height: 24px; background: var(--navy);
  border: 1px solid var(--bdr); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font);
  font-size: 12px; font-weight: 800; color: var(--mut);
}
.wlp-section-title {
  font-family: var(--font);
  font-size: 12px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: var(--txt);
}
.wlp-section-action {
  font-family: var(--font);
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--gld2); cursor: pointer;
}
/* WHY LOGGED */
.wlp-why-grid {
  display: grid; grid-template-columns: repeat(5,1fr);
  gap: 6px; padding: 11px 12px 12px;
}
.wlp-why-btn {
  position: relative; background: var(--sur2); border: 1.5px solid #1c1c30;
  border-radius: 9px; padding: 8px 4px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.wlp-why-active { background: CLR_WATCH_A1; border-color: rgba(139,92,246,.4); }
.wlp-why-check {
  position: absolute; top: 4px; right: 4px;
  width: 13px; height: 13px; background: var(--gld2); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 7px; color: #fff;
}
.wlp-why-icon { font-size: 14px; }
.wlp-why-label {
  font-family: var(--font);
  font-size: 9px; font-weight: 700; letter-spacing: .4px;
  text-align: center; line-height: 1.2; color: var(--txt);
}
.wlp-why-active .wlp-why-label { color: #fff; }
.wlp-why-active .wlp-why-icon { color: #fff; opacity: 1; }
.wlp-why-active .wlp-why-icon svg { stroke: #fff; }
.wlp-reason-note {
  padding: 0 13px 11px;
  font-family: var(--font); font-size: 13px;
  color: #6a6a8a; line-height: 1.5; font-style: italic;
}
/* RATINGS */
.wlp-ratings-row { display: flex; padding: 13px 12px; }
.wlp-rating-col {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 0 4px; border-right: 1px solid var(--bdr);
}
.wlp-rating-col:last-child { border-right: none; }
.wlp-rating-key {
  font-family: var(--font);
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--mut); margin-bottom: 5px; text-align: center;
}
.wlp-rating-val {
  
  font-size: 28px; letter-spacing: 1px; line-height: 1; text-align: center;
}
.wlp-rating-na {
  font-family: var(--font);
  font-size: 14px; font-weight: 700; color: var(--mut);
}
.wlp-rating-bar { height: 2px; border-radius: 1px; margin-top: 5px; width: 80%; }
.wlp-or-hist {
  display: flex; gap: 5px; padding: 0 13px 12px;
  flex-wrap: wrap; align-items: center;
}
.wlp-hist-label {
  font-family: var(--font);
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--mut);
}
.wlp-hist-pill {
  font-family: var(--font);
  font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 5px;
  background: CLR_WATCH_A3; border: 1px solid CLR_WATCH_A6;
  color: var(--gld2); display: flex; align-items: center; gap: 4px;
}
.wlp-hist-date { color: var(--mut); font-weight: 600; }
/* SPLIT ROW */
.wlp-split { display: flex; gap: 10px; margin: 10px 12px 0; }
.wlp-split .wlp-section { flex: 1; margin: 0; }
/* NOTEPAD */
.wlp-notepad {
  background: #f5f0d8; border-radius: 0 0 10px 10px; padding: 11px 13px 13px;
}
.wlp-notepad-meta {
  font-family: var(--font);
  font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #8a8060;
  margin-bottom: 7px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
}
.wlp-notepad-dot { color: #c5b87a; }
.wlp-result-badge {
  padding: 1px 6px; border-radius: 4px;
  font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
}
.wlp-notepad-text {
  font-family: var(--font); font-size: 13px;
  line-height: 1.7; color: #2a2510; white-space: pre-line;
}
.wlp-notepad-empty {
  font-family: var(--font);
  font-size: 11px; color: #8a8060; font-style: italic;
  padding: 14px 13px; text-align: center; line-height: 1.6;
}
.wlp-obs-count {
  border-top: 1px solid var(--bdr); padding: 9px;
  font-family: var(--font);
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--gld2); text-align: center; cursor: pointer;
}
/* TARGETS */
.wlp-target-item {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 9px 13px; border-bottom: 1px solid var(--bdr); gap: 8px;
}
.wlp-target-item:last-child { border-bottom: none; }
.wlp-target-icon { font-size: 14px; margin-top: 1px; flex-shrink: 0; opacity: .4; }
.wlp-target-race {
  font-family: var(--font);
  font-size: 13px; font-weight: 800; color: #fff; letter-spacing: .3px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wlp-target-meta {
  font-family: var(--font);
  font-size: 10px; font-weight: 600; color: var(--mut); letter-spacing: .3px; margin-top: 2px;
}
.wlp-target-date {
  font-family: var(--font);
  font-size: 11px; font-weight: 700; color: var(--clr-watch); letter-spacing: .5px;
}
.wlp-target-cond {
  font-family: var(--font);
  font-size: 9px; font-weight: 600; color: var(--mut);
  text-align: right; max-width: 70px; line-height: 1.2; margin-top: 2px;
}
.wlp-target-empty {
  font-family: var(--font);
  font-size: 11px; color: var(--mut); padding: 14px 13px;
  text-align: center; font-style: italic;
}
/* CONDITIONS */
.wlp-cond-grid { display: grid; padding: 11px 10px 10px; }
.wlp-cond-cell {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 0 4px; border-right: 1px solid var(--bdr);
}
.wlp-cond-cell:last-child { border-right: none; }
.wlp-cond-icon { display:flex; align-items:center; justify-content:center; width:20px; height:20px; opacity:.7; }
.wlp-cond-label {
  font-family: var(--font);
  font-size: 8px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--mut); text-align: center;
}
.wlp-cond-val {
  font-family: var(--font);
  font-size: 10px; font-weight: 800; text-align: center; line-height: 1.2;
}
/* INTEL */
.wlp-intel { padding: 10px 13px 13px; display: flex; gap: 9px; align-items: flex-start; }
.wlp-intel-icon { font-size: 16px; opacity: .6; flex-shrink: 0; margin-top: 1px; }
.wlp-intel-text {
  font-family: var(--font); font-size: 13px;
  line-height: 1.6; color: var(--mut); white-space: pre-line;
}
`;

function _wlpEsc(s){
  if(s===null||s===undefined)return'';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'\\\'');
}

function _wlpFmt(d){
  if(!d)return'—';
  const p=String(d).split('-');
  if(p.length!==3)return d;
  const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(p[2])+' '+M[parseInt(p[1])-1]+' '+p[0].slice(2);
}

function wlpTab(id){
  const modal=document.getElementById('wlp-modal');
  if(!modal)return;
  modal.querySelectorAll('[data-wlp-tab]').forEach(function(p){
    p.style.display=p.getAttribute('data-wlp-tab')===id?'':'none';
  });
  modal.querySelectorAll('[data-wlp-tab-btn]').forEach(function(b){
    const on=b.getAttribute('data-wlp-tab-btn')===id;
    b.style.color=on?'var(--txt)':'var(--mut)';
    b.style.borderBottom=on?'2px solid var(--gld)':'2px solid transparent';
    b.style.fontWeight=on?'800':'600';
  });
  window._wlpActiveTab=id;
}

function openWLProfile(id){
  const wl=getWL();
  const e=wl.find(function(x){return x.id===id;});
  if(!e)return;

  const existing=document.getElementById('wlp-modal');
  if(existing)existing.remove();

  const modal=document.createElement('div');
  modal.id='wlp-modal';
  modal.innerHTML=_wlpBuildHTML(e);
  document.body.appendChild(modal);
  // Restore active tab (important when re-opening after review edit)
  wlpTab(window._wlpActiveTab||'intel');
}

function _wlpBuildHTML(e){
  const esc=_wlpEsc;
  const fmt=_wlpFmt;

  const REASONS={
    'eye-catcher':  {emoji:'🔭',label:'Eye Catcher',  col:'#a78bfa', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>'},
    'future-target':{emoji:'📰',label:'Future Target', col:'#34d399', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/></svg>'},
    'trainer-intel':{emoji:'🗣',label:'Trainer Intel', col:'#38bdf8', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13a8 8 0 1 0-8 5h8v-5z"/></svg>'},
    'form-study':   {emoji:'📊',label:'Form Study',    col:'#f59e0b', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V9M8 15V5M12 15V11M16 15V7"/></svg>'},
    'tip-source':   {emoji:'💡',label:'Tip / Source',  col:'#fb7185', svg:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a6 6 0 0 1 4.47 10.06A4 4 0 0 1 13 15H7a4 4 0 0 1-1.47-2.94A6 6 0 0 1 10 2z"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="9" y1="21" x2="11" y2="21"/></svg>'},
  };
  const WHY_ORDER=['eye-catcher','future-target','trainer-intel','form-study','tip-source'];
  const RESULT_COLS={win:'#4ade80',place:CLR_WATCH,loss:'#f87171'};

  const reason=REASONS[e.reason||'eye-catcher']||REASONS['eye-catcher'];
  const or=parseFloat(e.currentRating)||null;
  const mr=parseFloat(e.myRating)||null;
  const edge=(or&&mr)?(mr-or):null;
  const edgeCol=edge===null?'#888':edge>0?'#4ade80':edge<0?'#f87171':'#888';

  const obs=e.observations||[];
  const targets=e.targets||[];
  // profile_observations = initial obs only (first entry)
  // horse_reviews = all subsequent race reviews
  const horseReviews=(D.reviews||[]).filter(function(r){return r.profileId===e.id;}).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
  const latestReview=horseReviews[0]||null;
  const sortedObs=obs.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
  const latestObs=sortedObs[0]||null;
  const lastDate=latestReview?latestReview.date:latestObs?latestObs.date:(e.createdAt?new Date(e.createdAt).toISOString().slice(0,10):'');
  const nextTarget=targets[0]||null;

  const _VALID_GOING_WLP=['firm','good to firm','good','good to soft','soft','heavy','standard','standard to slow','slow'];
  const _cleanGoingPrefs=(e.goingPrefs||[]).filter(function(g){return _VALID_GOING_WLP.includes((g||'').toLowerCase().trim());});

  const condItems=[
    {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',label:'Going',    value:_cleanGoingPrefs.length?_cleanGoingPrefs[0]:'Any',   color:_cleanGoingPrefs.length?'#4ade80':'#3a3a5c'},
    {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/></svg>',label:'Distance', value:e.distancePref||'—',  color:e.distancePref?'#38bdf8':'#3a3a5c'},
    {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>',label:'Track',    value:e.trackPref||'—',     color:e.trackPref?'#8b5cf6':'#3a3a5c'},
  ];

  const editFn="window._wlEditReturnId='"+e.id+"';document.getElementById('wlp-modal').remove();openWLForm('"+e.id+"')";

  // ── Betting record ──
  const horseName=(e.horse||'').toLowerCase().trim();
  const horseBets=(D.bets||[]).filter(function(b){
    return (b.horse||'').toLowerCase().trim()===horseName
      && b.result && b.result!=='pending' && b.result!=='void' && b.result!=='nr';
  });
  const horseWins=horseBets.filter(function(b){
    return b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'));
  });
  const horseStaked=horseBets.reduce(function(a,b){return a+(parseFloat(b.stake)||0);},0);
  const horseReturns=horseBets.reduce(function(a,b){return a+(parseFloat(b.returns)||0);},0);
  const horsePnl=horseReturns-horseStaked;
  const horseSR=horseBets.length>0?(horseWins.length/horseBets.length*100):null;
  const horseROI=horseStaked>0?(horsePnl/horseStaked*100):null;

  function _wlRatingsChart(entry){
    const orH=(entry.orHistory||[]).filter(function(p){return parseFloat(p.or);}).map(function(p){return{val:parseFloat(p.or),date:p.date||''};});
    const mrH=(entry.mrHistory||[]).filter(function(p){return parseFloat(p.mr);}).map(function(p){return{val:parseFloat(p.mr),date:p.date||''};});
    // Need at least one series with 2+ points, or one series with 1 point each to draw something
    if(!orH.length&&!mrH.length)return '';
    // Merge all dates to build x-axis
    const allDates=[...new Set([...orH.map(function(p){return p.date;}), ...mrH.map(function(p){return p.date;})].filter(Boolean))].sort();
    // If only one data point total, still show as a dot — pad with a synthetic second point
    const pts=allDates.length;
    const W=280,H=90,PL=28,PR=12,PT=10,PB=22;
    const cW=W-PL-PR,cH=H-PT-PB;
    // Value range
    const allVals=[...orH.map(function(p){return p.val;}), ...mrH.map(function(p){return p.val;})];
    const minV=Math.max(0,Math.min.apply(null,allVals)-8);
    const maxV=Math.max.apply(null,allVals)+8;
    const range=maxV-minV||1;
    function xOf(i){return PL+(pts<2?cW/2:i/(pts-1)*cW);}
    function yOf(v){return PT+cH-(v-minV)/range*cH;}
    function interpSeries(series){
      // fill value at each date by carrying forward last known value
      var last=null;
      return allDates.map(function(d){
        var p=series.find(function(s){return s.date===d;});
        if(p)last=p.val;
        return last;
      });
    }
    function polyline(series,col){
      const vals=interpSeries(series);
      if(!vals.some(function(v){return v!==null;}))return '';
      var first=true,d='';
      vals.forEach(function(v,i){
        if(v===null)return;
        const x=xOf(i),y=yOf(v);
        d+=(first?'M':'L')+x.toFixed(1)+' '+y.toFixed(1)+' ';
        first=false;
      });
      // filled area path
      var filled=d,startI=-1,endI=-1;
      vals.forEach(function(v,i){if(v!==null){if(startI<0)startI=i;endI=i;}});
      const areaD=d+'L'+xOf(endI).toFixed(1)+' '+(PT+cH)+' L'+xOf(startI).toFixed(1)+' '+(PT+cH)+' Z';
      return '<path d="'+areaD+'" fill="'+col+'" fill-opacity="0.08" stroke="none"/>'
            +'<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            +vals.map(function(v,i){return v!==null?'<circle cx="'+xOf(i).toFixed(1)+'" cy="'+yOf(v).toFixed(1)+'" r="3" fill="'+col+'" stroke="var(--sur)" stroke-width="1.5"/>':'';}).join('');
    }
    // X axis labels — show up to 4, prefer first, last, evenly spaced
    function fmtD(d){if(!d||d.length<7)return d||'';var p=d.split('-');return(p[2]?p[2]+'/':'')+(p[1]||'');}
    const labelIdxs=pts<=1?[0]:pts===2?[0,1]:[0,Math.floor((pts-1)/2),pts-1];
    const xLabels=labelIdxs.map(function(i){
      return'<text x="'+xOf(i).toFixed(1)+'" y="'+(H-4)+'" text-anchor="middle" font-size="9" fill="var(--mut)">'+fmtD(allDates[i])+'</text>';
    }).join('');
    // Y axis labels — min and max
    const yLabels='<text x="'+(PL-4)+'" y="'+(yOf(maxV)+3)+'" text-anchor="end" font-size="9" fill="var(--mut)">'+Math.round(maxV-8)+'</text>'
                 +'<text x="'+(PL-4)+'" y="'+(yOf(minV+8)+3)+'" text-anchor="end" font-size="9" fill="var(--mut)">'+Math.round(minV+8)+'</text>';
    // Horizontal gridlines
    const grid=[minV+8,maxV-8].map(function(v){
      return'<line x1="'+PL+'" y1="'+yOf(v).toFixed(1)+'" x2="'+(W-PR)+'" y2="'+yOf(v).toFixed(1)+'" stroke="var(--bdr)" stroke-width="0.5"/>';
    }).join('');
    const svg='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;overflow:visible;">'
      +grid
      +polyline(orH,'var(--txt)')
      +polyline(mrH,'#f97316')
      +'<line x1="'+PL+'" y1="'+PT+'" x2="'+PL+'" y2="'+(PT+cH)+'" stroke="var(--bdr)" stroke-width="0.5"/>'
      +'<line x1="'+PL+'" y1="'+(PT+cH)+'" x2="'+(W-PR)+'" y2="'+(PT+cH)+'" stroke="var(--bdr)" stroke-width="0.5"/>'
      +xLabels+yLabels
      +'</svg>';
    const legend='<div style="display:flex;gap:12px;margin-top:6px;">'
      +(orH.length?'<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--mut);"><span style="width:12px;height:2px;background:var(--txt);display:inline-block;border-radius:1px;"></span>OR</div>':'')
      +(mrH.length?'<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--mut);"><span style="width:12px;height:2px;background:#f97316;display:inline-block;border-radius:1px;"></span>MR</div>':'')
      +'</div>';
    return'<div style="padding:10px 14px 6px;">'
      +'<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">Rating History</div>'
      +svg+legend
      +'</div>';
  }

  let h='<div class="wlp-page">';

  // ── NAV (pinned, never scrolls) ───────────────────────────────────────────
  h+='<div class="wlp-nav">'
    +'<div class="wlp-back" onclick="document.getElementById(\'wlp-modal\').remove();if(window._wlProfileSource===\'today\')navTo(\'today\');">← Back</div>'
    +'<div class="wlp-brand">RACING <span class="wlp-brand-accent">PUZZLE</span></div>'
    +'<div class="wlp-edit-btn" onclick="'+editFn+'">Edit</div>'
  +'</div>';

  // ── HERO — compact, pinned, gives race-day essentials at a glance ─────────
  const goingPill=_cleanGoingPrefs.length?_cleanGoingPrefs.slice(0,2).join(' · '):'Any ground';
  h+='<div class="wlp-hero">'
    +'<div class="wlp-hero-bg">🐎</div>'
    // Row 1: name + OR badge
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;">'
      +'<div style="flex:1;min-width:0;padding-right:10px;">'
        +'<div class="wlp-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(e.horse)+'</div>'
        +'<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:3px;font-weight:600;">'
          +esc(e.trainer||'Unknown trainer')
          +(e.age?' · '+e.age+'yo':'')
          +(e.surface?' · '+({flat:'Flat',jumps:'Jumps',aw:'AW'}[e.surface]||e.surface):'')
        +'</div>'
        // Reason + bet readiness badges
        +(function(){
          const br=_brStage(e);
          return'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'
            +'<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:5px;background:'+reason.col+'20;border:1px solid '+reason.col+'40;color:'+reason.col+';">'+reason.svg+' '+reason.label+'</span>'
            +'<span onclick="wlToggleBRPicker(\''+e.id+'\')" style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 9px;border-radius:5px;background:'+br.col+'20;border:1px solid '+br.col+'40;color:'+br.col+';cursor:pointer;">'
              +'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+br.col+';flex-shrink:0;"></span>'
              +br.label+' ▾'
            +'</span>'
          +'</div>';
        })()
      +'</div>'
      +'<div class="wlp-or-box" style="flex-shrink:0;">'
        +'<span class="wlp-or-label">OR</span>'
        +(or?'<span class="wlp-or-value">'+or+'</span>':'<span class="wlp-or-na">—</span>')
      +'</div>'
    +'</div>'
    // ── 3-metric strip (the race-day decision strip) ──────────────────────
    +'<div class="wlp-hero-metrics">'
      // My Mark
      +'<div class="wlp-hero-metric">'
        +'<span class="wlp-hero-metric-label">My Mark ★</span>'
        +(mr
          ?'<div class="wlp-hero-metric-val" style="color:var(--gld);">'+mr+'</div>'
          :'<div style="font-size:13px;color:rgba(255,255,255,.3);font-weight:700;padding-top:2px;">—</div>')
      +'</div>'
      // Edge vs OR
      +'<div class="wlp-hero-metric">'
        +'<span class="wlp-hero-metric-label">Edge</span>'
        +(edge!==null
          ?'<div class="wlp-hero-metric-val" style="color:'+edgeCol+';">'+(edge>0?'+':'')+edge+'</div>'
          :'<div style="font-size:13px;color:rgba(255,255,255,.3);font-weight:700;padding-top:2px;">—</div>')
      +'</div>'
      // Going pref
      +'<div class="wlp-hero-metric">'
        +'<span class="wlp-hero-metric-label">Going</span>'
        +'<div style="font-size:12px;font-weight:800;color:'+(_cleanGoingPrefs.length?'#4ade80':'rgba(255,255,255,.3)')+';line-height:1.2;margin-top:2px;">'+goingPill+'</div>'
      +'</div>'
    +'</div>'
  +'</div>';

  // ── READINESS BAR ─────────────────────────────────────────────────────────
  const _brDescs={'watching':'Gathering data — not backed yet','interesting':'Showing promise — watching closely','on-radar':'Strong interest — almost ready','ready':'Conditions met — ready to back','cold':'Inactive / shelved for now'};
  const _brS=_brStage(e);
  h+='<div onclick="wlToggleBRPicker(\''+e.id+'\')" style="padding:9px 14px;background:'+_brS.col+'18;border-bottom:2px solid '+_brS.col+'50;cursor:pointer;display:flex;align-items:center;gap:10px;">'
    +'<span style="width:10px;height:10px;border-radius:50%;background:'+_brS.col+';box-shadow:0 0 0 3px '+_brS.col+'30;flex-shrink:0;"></span>'
    +'<span style="font-size:12px;font-weight:800;color:'+_brS.col+';letter-spacing:.06em;text-transform:uppercase;">'+_brS.label+'</span>'
    +'<span style="font-size:11px;color:var(--mut);flex:1;">'+(_brDescs[e.betReadiness||'watching']||'')+'</span>'
    +'<span style="font-size:12px;color:var(--mut);">›</span>'
  +'</div>';

  // ── SCROLLABLE CONTENT ────────────────────────────────────────────────────
  h+='<div class="wlp-scroll-body">';

  // ── TAB NAV ───────────────────────────────────────────────────────────────
  const _activeTab=window._wlpActiveTab||'intel';
  const _upcomingTargCnt=(e.targets||[]).filter(function(t){return t.date&&t.date>=td();}).length;
  const _tBtn=function(id,label,cnt){
    const on=_activeTab===id;
    const badge=cnt?'<span style="font-size:9px;font-weight:800;background:var(--sur2);border-radius:8px;padding:1px 5px;vertical-align:middle;margin-left:3px;">'+cnt+'</span>':'';
    return'<button data-wlp-tab-btn="'+id+'" onclick="wlpTab(\''+id+'\')" style="flex:1;padding:10px 4px 9px;border:none;border-bottom:2px solid '+(on?'var(--gld)':'transparent')+';background:none;font-family:var(--font);font-size:11px;font-weight:'+(on?'800':'600')+';color:'+(on?'var(--txt)':'var(--mut)')+';cursor:pointer;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;">'+label+badge+'</button>';
  };
  h+='<div style="display:flex;background:var(--sur);border-bottom:1px solid var(--bdr);position:sticky;top:0;z-index:5;">'
    +_tBtn('intel','Intel',0)
    +_tBtn('history','History',horseReviews.length)
    +_tBtn('targets','Targets',_upcomingTargCnt)
    +_tBtn('bets','Bets',horseBets.length)
  +'</div>';

  h+='<div class="wlp-sections-grid">';

  // SECTION 1: IDEAL CONDITIONS
  (function(){
    const NUMERIC_CLASSES=['1','2','3','4','5','6','7'];
    const GOING_ORDER=['Firm','Good to Firm','Good','Good to Soft','Soft','Heavy','Standard','Standard to Slow','Slow'];
    const wpReviews=horseReviews.filter(function(r){return r.result==='win'||r.result==='place';});
    const allReviews=horseReviews;

    // ── CLASS: range based on numeric classes in win/place reviews ──────────
    var idealClass=null,classNote=null;
    const winClasses=wpReviews.map(function(r){return(r.raceClass||'').trim();}).filter(function(c){return NUMERIC_CLASSES.indexOf(c)>-1;});
    if(winClasses.length){
      const nums=winClasses.map(Number).sort(function(a,b){return a-b;});
      const bestWin=nums[0]; // lowest number = highest quality class won
      const worstWin=nums[nums.length-1];
      // Project one step above best win if they've raced at a higher class
      const allClasses=allReviews.map(function(r){return parseInt(r.raceClass||'');}).filter(function(n){return !isNaN(n);});
      const higherAttempted=allClasses.some(function(n){return n<bestWin;});
      const projCeil=higherAttempted&&bestWin>1?bestWin-1:bestWin;
      idealClass=projCeil===worstWin?'Class '+projCeil:'Class '+projCeil+'–'+worstWin;
      if(projCeil<bestWin)classNote='Projected – stepped up in class';
    } else {
      // Non-numeric class (Group, Listed, Maiden etc) — just list unique win classes
      const uniq={};wpReviews.forEach(function(r){if(r.raceClass)uniq[r.raceClass]=1;});
      const keys=Object.keys(uniq);if(keys.length)idealClass=keys.join(', ');
    }

    // ── DISTANCE: winning distances + adjacent range ─────────────────────────
    var idealDist=null;
    const winDists=wpReviews.map(function(r){return(r.distance||'').trim();}).filter(Boolean);
    if(winDists.length){
      const uniq={};winDists.forEach(function(d){uniq[d]=(uniq[d]||0)+1;});
      idealDist=Object.keys(uniq).sort(function(a,b){return uniq[b]-uniq[a];}).join(', ');
    } else if(e.distancePref){
      idealDist=e.distancePref;
    }

    // ── GOING: winning going conditions ─────────────────────────────────────
    var idealGoing=null;
    const winGoing=wpReviews.map(function(r){return(r.groundConditions||r.going||'').trim();}).filter(Boolean);
    if(winGoing.length){
      // Sort by going order (firmest first) and dedupe
      const uniq={};winGoing.forEach(function(g){uniq[g]=1;});
      const sorted=GOING_ORDER.filter(function(g){return uniq[g];});
      const others=Object.keys(uniq).filter(function(g){return GOING_ORDER.indexOf(g)<0;});
      idealGoing=[...sorted,...others].join(', ')||null;
    } else if(_cleanGoingPrefs.length){
      idealGoing=_cleanGoingPrefs.slice(0,3).join(', ');
    }

    // ── SURFACE + TYPE ───────────────────────────────────────────────────────
    const surfaceMap={flat:'Flat',jumps:'Jumps',aw:'AW'};
    const idealSurface=e.surface?surfaceMap[e.surface]||e.surface:null;
    const typeMap={handicap:'Handicap',group:'Group/Listed',maiden:'Maiden',claimer:'Claimer'};
    const idealType=e.raceType?typeMap[e.raceType]||e.raceType:null;

    const _iInfo={
      'Ground':  'Derived from the going conditions in your win &amp; place reviews, ranked by frequency. Set manually via Going Prefs if no reviews yet.',
      'Distance':'Based on distances where this horse has won or placed. Set manually via Distance Pref if not enough data.',
      'Class':   'Range of class levels from win &amp; place reviews. Shows best class won up to highest class placed — ±1 tolerance applied.',
      'Surface': 'Flat / Jumps / AW — set manually on the profile. Not auto-inferred from reviews.',
      'Type':    'Race type preference (Handicap, Maiden etc.) — set manually on the profile.',
    };
    const conds=[
      {label:'Ground',  value:idealGoing,  note:classNote},
      {label:'Distance',value:idealDist},
      {label:'Class',   value:idealClass,  note:classNote},
      {label:'Surface', value:idealSurface},
      {label:'Type',    value:idealType},
    ];
    const hasAny=conds.some(function(c){return c.value;});
    h+='<div class="wlp-section" data-wlp-tab="intel">';
    h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">1</div><span class="wlp-section-title">Ideal Conditions</span></div></div>';
    if(hasAny){
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--bdr);">';
      conds.forEach(function(c){
        const infoTip=_iInfo[c.label]||'';
        h+='<div style="background:var(--sur);padding:11px 13px;">'
          +'<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">'
            +'<div style="font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--mut);">'+c.label+'</div>'
            +'<button onclick="event.stopPropagation();_wlCondInfo(this,\''+infoTip+'\')" style="display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-size:8px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1;padding:0;">i</button>'
          +'</div>'
          +'<div style="font-size:13px;font-weight:800;color:'+(c.value?'var(--txt)':'var(--mut)')+';">'+(c.value||'—')+'</div>'
          +(c.note?'<div style="font-size:9px;color:var(--mut);margin-top:2px;">'+c.note+'</div>':'')
          +'</div>';
      });
      h+='</div>';
      h+='<div style="padding:8px 13px;font-size:10px;color:var(--mut);">Based on '+wpReviews.length+' win'+(wpReviews.length!==1?'s/places':'/place')+' from '+allReviews.length+' race'+(allReviews.length!==1?'s':'')+'</div>';
    } else {
      h+='<div style="padding:16px 13px;font-size:12px;color:var(--mut);">Add race reviews with results to build ideal conditions automatically.</div>';
    }
    h+='</div>';
  })();

  // SECTION 2: WHY LOGGED
  h+='<div class="wlp-section" data-wlp-tab="intel">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">2</div><span class="wlp-section-title">Why Logged</span></div>';
  h+='<span class="wlp-section-action" onclick="'+editFn+'">Edit</span></div>';
  h+='<div class="wlp-why-grid">';
  WHY_ORDER.forEach(function(rid){
    const r=REASONS[rid];const isActive=(e.reason||'eye-catcher')===rid;
    const activeStyle=isActive?'background:'+r.col+';border-color:'+r.col+';color:#fff;':'';
    h+='<div class="wlp-why-btn'+(isActive?' wlp-why-active':'')+'" style="'+activeStyle+'">';
    if(isActive)h+='<div class="wlp-why-check" style="background:rgba(255,255,255,.25);color:#fff;">✓</div>';
    h+='<span class="wlp-why-icon" style="'+(isActive?'color:#fff;opacity:1;':'')+'">'+r.svg+'</span><span class="wlp-why-label" style="'+(isActive?'color:#fff;':'')+'">'+r.label+'</span></div>';
  });
  h+='</div>';
  if(e.reasonNote)h+='<div class="wlp-reason-note">"'+esc(e.reasonNote)+'"</div>';
  // Initial race observation
  const initObs=(e.observations&&e.observations[0])||null;
  if(initObs){
    const irc=RESULT_COLS[initObs.result||'']||'#888';
    h+='<div class="wlp-init-obs">';
    h+='<div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);margin-bottom:6px;">Initial Race</div>';
    h+='<div class="wlp-notepad-meta">';
    if(initObs.date)h+='<span>'+fmt(initObs.date)+'</span>';
    if(initObs.raceName)h+='<span class="wlp-notepad-dot">·</span><span>'+esc(initObs.raceName)+'</span>';
    if(initObs.going)h+='<span class="wlp-notepad-dot">·</span><span>'+esc(initObs.going)+'</span>';
    if(initObs.result)h+='<span class="wlp-result-badge" style="background:'+irc+'22;color:'+irc+';">'+initObs.result.toUpperCase()+'</span>';
    h+='</div>';
    if(initObs.notes)h+='<div class="wlp-notepad-text" style="margin-top:5px;">'+esc(initObs.notes)+'</div>';
    h+='</div>';
  }
  h+='</div>';

  // SECTION 3: RATINGS
  h+='<div class="wlp-section" data-wlp-tab="intel">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">3</div><span class="wlp-section-title">Ratings</span></div>';
  if((e.orHistory||[]).length>1)h+='<span class="wlp-section-action">History ›</span>';
  h+='</div>';
  h+='<div class="wlp-ratings-row">';
  [{key:'Official Rating',val:e.currentRating,col:'var(--txt)'},{key:'My Rating',val:e.myRating,col:'#f97316'}].forEach(function(r){
    const v=parseFloat(r.val)||null;
    h+='<div class="wlp-rating-col"><span class="wlp-rating-key">'+r.key+'</span>';
    if(v){h+='<span class="wlp-rating-val" style="color:'+r.col+';">'+v+'</span>';
      h+='<div class="wlp-rating-bar" style="background:'+r.col+'20;"><div style="height:100%;border-radius:1px;background:'+r.col+';width:'+Math.min(v/130*100,100)+'%;"></div></div>';}
    else{h+='<span class="wlp-rating-na">—</span><div class="wlp-rating-bar" style="background:var(--bdr);"></div>';}
    h+='</div>';
  });
  h+='</div>';
  h+=_wlRatingsChart(e);
  h+='</div>';

  // SECTION 4: TRAINER / CONNECTIONS INTEL
  (function(){
    const intelList=(e.intelEntries||[]).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    h+='<div class="wlp-section" data-wlp-tab="intel">';
    h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">4</div><span class="wlp-section-title">Trainer / Connections Intel</span></div>';
    h+='<span class="wlp-section-action" onclick="'+editFn+'">+ Add</span></div>';
    if(intelList.length){
      intelList.forEach(function(en,i){
        const isLast=i===intelList.length-1;
        h+='<div style="padding:11px 13px;'+(isLast?'':'border-bottom:1px solid var(--bdr);')+'">';
        if(en.date||en.source){
          h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">';
          if(en.date)h+='<span style="font-size:10px;font-weight:700;color:var(--mut);">'+en.date+'</span>';
          if(en.source)h+='<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.25);color:#38bdf8;">'+esc(en.source)+'</span>';
          h+='</div>';
        }
        h+='<div style="font-size:13px;color:var(--txt);line-height:1.6;">'+esc(en.text||'')+'</div>';
        h+='</div>';
      });
    } else {
      h+='<div style="padding:14px 13px;">';
      h+='<div style="font-size:12px;color:var(--mut);margin-bottom:10px;">No trainer or connections intel logged yet.</div>';
      h+='<button onclick="'+editFn+'" style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:7px 14px;border-radius:8px;border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.08);color:#38bdf8;cursor:pointer;">+ Add Intel Entry</button>';
      h+='</div>';
    }
    h+='</div>';
  })();

  // Section 4: Targets (renumbered to 5)
  h+='<div class="wlp-section" data-wlp-tab="targets">';
  h+='<div class="wlp-section-hdr" style="padding:10px 12px;"><div class="wlp-section-left"><div class="wlp-section-num">4</div><span class="wlp-section-title" style="font-size:11px;">Targets</span></div>';
  h+='<span class="wlp-section-action" style="font-size:16px;" onclick="'+editFn+'">+</span></div>';
  if(targets.length){
    const todayStr=td();
    targets.forEach(function(t){
      const isPast=t.date&&t.date<=todayStr;
      const raceLower=(t.race||'').toLowerCase().trim();
      const alreadyReviewed=(D.reviews||[]).some(function(r){
        if(r.profileId!==e.id)return false;
        const rn=(r.raceName||'').toLowerCase().trim();
        return rn===raceLower||rn.includes(raceLower)||raceLower.includes(rn)||(t.date&&r.date===t.date);
      });
      const rv='openWLPostRaceReview(\''+e.id+'\',\''+esc(e.horse)+'\',\''+esc(t.track||'')+'\',\'\',\''+esc(t.race||'')+'\',\'\',\'\',\'\')';
      h+='<div style="padding:11px 13px;border-bottom:1px solid var(--bdr);">';
        // Line 1: date · course — consistent with reviews
        h+='<div style="font-size:10px;font-weight:700;color:'+(isPast?'var(--mut)':alreadyReviewed?'#4ade80':'var(--gld)')+';letter-spacing:.04em;margin-bottom:3px;">'
          +[t.date?fdate(t.date):'TBC',t.track||''].filter(Boolean).join(' · ')
          +(alreadyReviewed?' · <span style="color:#4ade80;">✓ Reviewed</span>':isPast?' · <span style="color:#f59e0b;">Awaiting review</span>':'')
        +'</div>';
        // Line 2: race name
        h+='<div style="font-family:var(--font);font-size:14px;font-weight:800;color:'+(isPast&&!alreadyReviewed?'var(--mut)':'var(--txt)')+';">'+esc(t.race||'—')+'</div>';
        // Line 3: condition note if set
        if(t.condition)h+='<div style="font-size:11px;color:var(--mut);margin-top:2px;font-style:italic;">'+esc(t.condition)+'</div>';
        // Line 4: actions — plain text, unobtrusive
        h+='<div style="display:flex;gap:8px;margin-top:6px;align-items:center;">';
          if(!alreadyReviewed)h+='<button onclick="'+rv+'" style="font-size:10px;font-weight:700;color:'+(isPast?'#f59e0b':'var(--mut)')+';background:none;border:none;padding:0;cursor:pointer;">Write review</button><span style="color:var(--bdr);">·</span>';
          h+='<button onclick="wlDeleteTarget(\''+e.id+'\',\''+esc(t.id||t.race)+'\')" style="font-size:10px;font-weight:700;color:var(--mut);background:none;border:none;padding:0;cursor:pointer;">Remove</button>';
        h+='</div>';
      h+='</div>';
    });
  }else{
    h+='<div class="wlp-target-empty">No targets yet</div>';
  }
  h+='</div>';


  // SECTION 4b: AWAITING REVIEW — merges pendingReviews + overdue targets
  // Overdue targets: date has passed, no review exists within 7 days of target date
  const today=td();
  const profileReviewDates=(D.reviews||[]).filter(function(r){return r.profileId===e.id;}).map(function(r){return r.date||'';});
  function _targetAlreadyReviewed(t){
    const raceLower=(t.race||'').toLowerCase().trim();
    const tMs=t.date?new Date(t.date+'T00:00:00').getTime():null;
    return(D.reviews||[]).some(function(r){
      if(r.profileId!==e.id)return false;
      const rn=(r.raceName||'').toLowerCase().trim();
      if(raceLower&&(rn===raceLower||rn.includes(raceLower)||raceLower.includes(rn)))return true;
      if(tMs&&r.date){const dMs=new Date(r.date+'T00:00:00').getTime();if(Math.abs(dMs-tMs)<=7*24*60*60*1000)return true;}
      return false;
    });
  }
  const overdueTargets=(e.targets||[])
    .filter(function(t){return t.date&&t.date<today&&!_targetAlreadyReviewed(t);})
    .map(function(t){return{_type:'target',id:t.id,date:t.date,raceName:t.race||'',course:t.track||''};})
    .sort(function(a,b){return b.date.localeCompare(a.date);});

  const pendingReviews=((D.pendingReviews||[]).filter(function(p){
    if(p.profileId!==e.id)return false;
    const reviewed=(D.reviews||[]).some(function(r){return r.profileId===e.id&&r.date===p.date;});
    return!reviewed;
  })).map(function(p){return Object.assign({_type:'pending'},p);})
    .sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});

  // Merge — dedupe by date (pending takes priority over overdue target for same date)
  const pendingDates=new Set(pendingReviews.map(function(p){return p.date;}));
  const awaitingItems=pendingReviews.concat(
    overdueTargets.filter(function(t){return!pendingDates.has(t.date);})
  ).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});

  if(awaitingItems.length){
    h+='<div class="wlp-section" data-wlp-tab="targets" style="border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.04);">';
    h+='<div class="wlp-section-hdr">'
      +'<div class="wlp-section-left">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        +'<span class="wlp-section-title" style="color:#f59e0b;">Awaiting Review</span>'
      +'</div>'
      +'<span style="font-size:10px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.15);border-radius:10px;padding:2px 8px;">'+awaitingItems.length+'</span>'
    +'</div>';
    const RCOL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'#3a3a5c',missed:'#a78bfa'};
    awaitingItems.forEach(function(item){
      const rc=item.result?RCOL[item.result]||'':'';
      const label=item._type==='target'?'Target passed — did they run?':'';
      h+='<div style="padding:11px 13px;border-top:1px solid rgba(245,158,11,.15);">'
        +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-family:var(--font);font-size:13px;font-weight:800;color:var(--txt);">'+(item.raceName||item.course||'Race')+'</div>'
            +'<div style="font-size:11px;color:var(--mut);margin-top:2px;">'
              +[item.date?_wlpFmt(item.date):'',item.course,item.raceDist,item.raceGoing].filter(Boolean).join(' · ')
            +'</div>'
            +(item.position?'<div style="font-size:11px;color:var(--txt);margin-top:2px;">Finished: <strong>'+esc(item.position)+'</strong></div>':'')
            +(label?'<div style="font-size:10px;color:#f59e0b;margin-top:3px;font-style:italic;">'+label+'</div>':'')
          +'</div>'
          +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">'
            +(rc?'<span style="font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:'+rc+'20;border:1px solid '+rc+'40;color:'+rc+';">'+item.result+'</span>':'')
            +(item._type==='pending'
              ?'<button onclick="wlCompletePendingReview(\''+item.id+'\')" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:7px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.1);color:#f59e0b;font-family:var(--font);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;white-space:nowrap;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Write Up</button>'
              +'<button onclick="wlDismissPending(\''+item.id+'\');openWLProfile(\''+e.id+'\')" style="display:inline-flex;align-items:center;gap:3px;padding:5px 10px;border-radius:7px;border:1px solid var(--bdr);background:none;color:var(--mut);font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;">✕ Dismiss</button>'
              :'<button onclick="openWLPostRaceReview(\''+e.id+'\',\''+jsq(e.horse)+'\',\'\',\'\',\''+jsq(item.raceName||'')+'\')" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:7px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.1);color:#f59e0b;font-family:var(--font);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;white-space:nowrap;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Write Up</button>')
          +'</div>'
        +'</div>'
      +'</div>';
    });
    h+='</div>';
  }

  // SECTION 5: REVIEWS
  const profileReviews=(D.reviews||[]).filter(function(r){return r.profileId===e.id;}).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
  const VERDICT_META={upgrade:{col:'#4ade80',label:'Upgrade ↑'},hold:{col:'#60a5fa',label:'Hold →'},downgrade:{col:'#f87171',label:'Downgrade ↓'}};
  const RESULT_COL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'#3a3a5c',missed:'#a78bfa'};
  h+='<div class="wlp-section" data-wlp-tab="history">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">5</div><span class="wlp-section-title">Race Reviews</span></div>';
  h+='<span class="wlp-section-action" onclick="openWLPostRaceReview(\''+e.id+'\',\''+jsq(e.horse)+'\',\'\',\'\',\'\')">Add +</span></div>';
  if(profileReviews.length){
    h+='<div style="position:relative;">'
      +'<div style="position:absolute;left:26px;top:8px;bottom:8px;width:2px;background:var(--bdr);border-radius:1px;"></div>';
    profileReviews.forEach(function(r){
      const isObs=r.source==='observation';
      const vm=VERDICT_META[r.verdict]||null;
      const rc=RESULT_COL[r.result]||'var(--mut)';
      h+='<div style="padding:12px 13px 12px 44px;border-bottom:1px solid var(--bdr);position:relative;">'
        +'<div style="position:absolute;left:20px;top:18px;width:13px;height:13px;border-radius:50%;background:'+rc+';border:2px solid var(--sur);z-index:1;box-shadow:0 0 0 2px '+rc+'40;"></div>';
      // Row 1: date · course · race name + result badge
      h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:'+(isObs||r.notes||vm?'6':'0')+'px;">';
        h+='<div style="min-width:0;flex:1;">';
          // Date + course — always consistent, always first
          h+='<div style="font-size:10px;font-weight:700;color:var(--mut);letter-spacing:.04em;margin-bottom:3px;">'+[r.date?_wlpFmt(r.date):'',r.course||''].filter(Boolean).join(' · ')+'</div>';
          // Race name — primary label
          h+='<div style="font-family:var(--font);font-size:14px;font-weight:800;color:'+(isObs?'var(--mut)':'var(--txt)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(isObs?'Initial Sighting':(r.raceName||'Race'))+'</div>';
        h+='</div>';
        // Result badge right-aligned
        h+='<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">';
          if(r.result)h+='<span style="font-family:var(--font);font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 9px;border-radius:5px;background:'+rc+'20;border:1px solid '+rc+'40;color:'+rc+';">'+r.result+'</span>';
          if(vm)h+='<span style="font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+vm.col+'15;border:1px solid '+vm.col+'30;color:'+vm.col+';">'+vm.label+'</span>';
        h+='</div>';
      h+='</div>';
      // Row 2: detail chips — always show all stats, dash if missing
      const _rGoing=r.groundConditions||r.going||r.raceGoing||r.goingConfirmed||'';
      const chips=[
        {l:'Pos',   v:r.position||'—'},
        {l:'Dist',  v:r.distance||'—'},
        {l:'Class', v:r.raceClass||'—'},
        {l:'Ground',v:_rGoing||'—'},
        ...(r.result==='win'&&!r.beatenDistance?[]:[{l:'Beaten',v:r.beatenDistance||'—'}]),
        {l:'SP',    v:r.odds||'—'},
      ];
      if(r.mrAdjustment)chips.push({l:'MR',v:(r.mrAdjustment>0?'+':'')+r.mrAdjustment});
      h+='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;">'+chips.map(function(c){return'<div style="font-size:10px;color:var(--txt);"><span style="color:var(--mut);font-weight:600;">'+c.l+'</span> <span style="font-weight:700;">'+esc(c.v)+'</span></div>';}).join('<span style="color:var(--bdr);margin:0 1px;">·</span>')+'</div>';
      // Row 3: notes
      if(r.notes)h+='<div style="font-size:12px;color:var(--mut);line-height:1.55;margin-bottom:6px;">'+esc(r.notes)+'</div>';
      // Row 4: actions — small and subtle
      h+='<div style="display:flex;gap:8px;margin-top:4px;">'
        +'<button onclick="openWLEditReview(\''+r.id+'\')" style="font-size:10px;font-weight:700;color:var(--mut);background:none;border:none;padding:0;cursor:pointer;letter-spacing:.03em;">Edit</button>'
        +'<span style="color:var(--bdr);">·</span>'
        +'<button onclick="wlDeleteReview(\''+r.id+'\',\''+e.id+'\')" style="font-size:10px;font-weight:700;color:#f87171;background:none;border:none;padding:0;cursor:pointer;letter-spacing:.03em;">Delete</button>'
      +'</div>';
      h+='</div>';
    });
    h+='</div>'; // close timeline wrapper
  } else {
    h+='<div style="padding:14px 13px;font-size:12px;color:var(--mut);font-style:italic;text-align:center;">No reviews yet — tap Add after a run</div>';
  }
  h+='</div>';

  h+='</div>'; // wlp-sections-grid

  // AI ASSESSMENT SECTION
  if(e.aiAssessment){
    const ai=e.aiAssessment;
    const assessedDate=e.aiAssessedAt?_wlpFmt(new Date(e.aiAssessedAt).toISOString().split('T')[0]):'';
    h+='<div class="wlp-section" data-wlp-tab="intel" style="border:1px solid rgba(168,85,247,.25);background:rgba(168,85,247,.04);">';
    h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num" style="background:rgba(168,85,247,.2);color:#a855f7;display:flex;align-items:center;justify-content:center;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/></svg></div><span class="wlp-section-title">Puzzle Report</span></div>';
    if(assessedDate)h+='<span style="font-size:9px;color:var(--mut);">'+assessedDate+'</span>';
    h+='</div>';
    h+='<div style="padding:0 12px 12px;">';
    if(ai.level)h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(168,85,247,.1);"><span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);">Current Level</span><span style="font-size:12px;font-weight:800;color:#60a5fa;">'+esc(ai.level)+'</span></div>';
    if(ai.projection)h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(168,85,247,.1);"><span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);">Projection</span><span style="font-size:12px;font-weight:800;color:#34d399;">'+esc(ai.projection)+'</span></div>';
    if(ai.sweet_spot)h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(168,85,247,.1);"><span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);">Sweet Spot</span><span style="font-size:12px;font-weight:800;color:#f59e0b;">'+esc(ai.sweet_spot)+'</span></div>';
    if(ai.watch_for)h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(168,85,247,.1);"><span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);">Watch For</span><span style="font-size:12px;font-weight:700;color:#fb7185;">'+esc(ai.watch_for)+'</span></div>';
    if(ai.verdict)h+='<div style="padding-top:10px;font-size:13px;color:var(--txt);line-height:1.6;font-style:italic;">'+esc(ai.verdict)+'</div>';
    h+='<button onclick="openWLForm(\''+e.id+'\')" style="margin-top:10px;width:100%;padding:7px;border-radius:7px;border:1px solid rgba(168,85,247,.3);background:rgba(168,85,247,.08);color:#a855f7;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/></svg>Regenerate Puzzle Report</button>';
    h+='</div></div>';
  }

  // ── BETS TAB PANE ────────────────────────────────────────────────────────
  h+='<div data-wlp-tab="bets">';
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">£</div><span class="wlp-section-title">Betting Record</span></div></div>';
  if(horseBets.length){
    const _bs=function(n,l,c){return'<div style="background:var(--sur);padding:14px 8px;text-align:center;"><div style="font-size:20px;font-weight:900;color:'+(c||'var(--txt)')+';">'+n+'</div><div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-top:3px;">'+l+'</div></div>';};
    const _pnlStr=horsePnl>=0?'+£'+horsePnl.toFixed(2):'−£'+Math.abs(horsePnl).toFixed(2);
    const _roiStr=horseROI!==null?(horseROI>=0?'+':'')+horseROI.toFixed(1)+'%':'—';
    h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--bdr);border-bottom:1px solid var(--bdr);">'
      +_bs(horseBets.length,'Bets')
      +_bs(horseWins.length,'Wins','#4ade80')
      +_bs(horseSR!==null?Math.round(horseSR)+'%':'—','Strike',horseSR>=25?'#4ade80':horseSR>0?'#f59e0b':'var(--mut)')
      +_bs(_pnlStr,'P&L',horsePnl>=0?'#4ade80':'#f87171')
    +'</div>';
    horseBets.forEach(function(b){
      const bc={win:'#4ade80',place:CLR_WATCH,loss:'#f87171'}[b.result]||'#888';
      const _pnl=(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0);
      h+='<div style="padding:10px 13px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:10px;">'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:10px;color:var(--mut);">'+(b.bet_date||b.betDate||b.date||'')+(b.track?' · '+esc(b.track):'')+'</div>'
          +'<div style="font-size:11px;color:var(--mut);margin-top:1px;">'+(b.bet_type||b.betType||'win').toUpperCase()+' · £'+b.stake+(b.odds?' @ '+b.odds:'')+'</div>'
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0;">'
          +(b.result?'<div style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+bc+'20;border:1px solid '+bc+'40;color:'+bc+';">'+b.result+'</div>':'')
          +'<div style="font-size:12px;font-weight:800;color:'+(_pnl>=0?'#4ade80':'#f87171')+';margin-top:3px;">'+(_pnl>=0?'+':'−')+'£'+Math.abs(_pnl).toFixed(2)+'</div>'
        +'</div>'
      +'</div>';
    });
    if(horseROI!==null)h+='<div style="padding:8px 14px;font-size:11px;color:var(--mut);text-align:right;">ROI: <strong style="color:'+(horseROI>=0?'#4ade80':'#f87171')+';">'+_roiStr+'</strong></div>';
  } else {
    h+='<div style="padding:24px 14px;text-align:center;font-size:12px;color:var(--mut);">No bets logged for '+esc(e.horse)+'<br><span style="font-size:11px;">Bets are tracked in the Tracker card</span></div>';
  }
  h+='</div>';
  h+='</div>'; // bets tab pane

  h+='</div>'; // wlp-scroll-body

  // ── QUICK ACTION BAR — always visible at bottom ───────────────────────────
  h+='<div class="wlp-quick-bar">'
    +'<button class="wlp-quick-btn" onclick="wlToggleBRPicker(\''+e.id+'\')">⬤ Readiness</button>'
    +'<button class="wlp-quick-btn" onclick="openWLPostRaceReview(\''+e.id+'\',\''+jsq(e.horse)+'\',\'\',\'\',\'\')">+ Review</button>'
    +'<button class="wlp-quick-btn wlp-quick-btn-primary" onclick="'+editFn+'">✏ Edit</button>'
  +'</div>';

  h+='</div>'; // page
  return h;
}

// Quick observation sheet — lightweight, returns to profile view on save

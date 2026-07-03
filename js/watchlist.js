// ─── WATCHLIST / PUZZLE PROFILER ───

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
  if(cb){cb.className='wl-tog-btn '+(v==='cal'?'on':'off');}
  if(lb){lb.className='wl-tog-btn '+(v==='list'?'on':'off');}
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
      if(!dateMap[e.raceDate])dateMap[e.raceDate]={entries:[],targets:[],obs:[]};
      dateMap[e.raceDate].entries.push(e);
    }
    (e.targets||[]).forEach(function(t){
      if(t.date){
        if(!dateMap[t.date])dateMap[t.date]={entries:[],targets:[],obs:[]};
        dateMap[t.date].targets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});
      }
    });
    (e.observations||[]).forEach(function(o){
      if(o.date){
        if(!dateMap[o.date])dateMap[o.date]={entries:[],targets:[],obs:[]};
        dateMap[o.date].obs.push({horse:e.horse,horseId:e.id,obs:o});
      }
    });
  });
  // Day headers
  const dayNames=['S','M','T','W','T','F','S'];
  let html=dayNames.map(d=>'<div class="wl-cal-day-hdr">'+d+'</div>').join('');
  // Empty cells before first day
  const start=firstDay; // Sun=0
  for(let i=0;i<start;i++)html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const dayData=dateMap[dateStr]||{entries:[],targets:[],obs:[]};
    const entries=dayData.entries;
    const dayTargets=dayData.targets;
    const dayObs=dayData.obs;
    const isToday=dateStr===today;
    const hasBet=entries.length>0||dayTargets.length>0||dayObs.length>0;
    const fixtures=getFixtureForDate(dateStr);
    const hasFixture=fixtures.length>0;
    const dotCol=dayTargets.length&&!entries.length&&!dayObs.length?'#fb923c':dayObs.length&&!entries.length&&!dayTargets.length?'#4ade80':CLR_WATCH;
    const fixtureBar=hasFixture?'<div class="wl-cal-fixture-bar" style="background:'+fixtures[0].colour+';" title="'+fixtures[0].name+'"></div>':'';
    // Show up to 3 coloured dots for different event types
    const dots=[];
    if(entries.length)dots.push('<div class="wl-cal-dot" style="background:var(--gld2);"></div>');
    if(dayTargets.length)dots.push('<div class="wl-cal-dot" style="background:var(--ora);"></div>');
    if(dayObs.length)dots.push('<div class="wl-cal-dot" style="background:var(--grn);"></div>');
    html+='<div onclick="wlSelectDay(\''+dateStr+'\')" class="wl-cal-cell'+(isToday?' wl-cal-cell-today':'')+'">'
      +'<div class="wl-cal-num '+(isToday?'wl-cal-num-today':hasBet?'wl-cal-num-active':'wl-cal-num-empty')+'">'+d+'</div>'
      +(hasBet?'<div class="wl-cal-dots">'+dots.join('')+'</div>':'<div style="height:7px;"></div>')+fixtureBar
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
  const dayTargets=[];
  const dayObs=[];
  wl.forEach(function(e){
    (e.targets||[]).forEach(function(t){
      if(t.date===dateStr)dayTargets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});
    });
    (e.observations||[]).forEach(function(o){
      if(o.date===dateStr)dayObs.push({horse:e.horse,horseId:e.id,obs:o});
    });
  });
  const el=document.getElementById('wl-cal-day-entries');if(!el)return;
  const dayFixtures=getFixtureForDate(dateStr);
  const fixtureBanner=dayFixtures.map(f=>'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9px;background:rgba(0,0,0,.2);border-left:3px solid '+f.colour+';margin-bottom:8px;"><span>'+f.emoji+'</span><div><div style="font-weight:700;font-size:13px;color:'+f.colour+';">'+f.name+'</div><div style="font-size:11px;color:var(--mut);">'+f.course+'</div></div></div>').join('');
  const dayLabel='<div class="wl-day-lbl">'+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})+'</div>';
  let html=fixtureBanner+dayLabel;
  // Target race cards
  if(dayTargets.length){
    html+='<div class="wl-day-sec-lbl wl-day-sec-lbl-ora" style="display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>Target Races</div>';
    html+=dayTargets.map(function(d){
      const t=d.target;
      return'<div data-wl-id="'+d.horseId+'" class="wl-day-target">'
        +'<div class="wl-day-target-horse">'+d.horse+'</div>'
        +orSummaryLine(d)
        +(d.trainer?'<div class="wll-sub">'+d.trainer+'</div>':'')
        +'<div class="wl-day-target-race">'+t.race+(t.track?' · '+t.track:'')+'</div>'
        +(t.condition?'<div class="wl-day-target-cond">'+t.condition+'</div>':'')
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
  // Regular watchlist entries
  if(entries.length){
    if(dayTargets.length||dayObs.length)html+='<div class="wl-day-sec-lbl wl-day-sec-lbl-pur" style="margin-top:10px;">Puzzle Profiler</div>';
    html+=entries.map(function(e){return renderWLEntry(e);}).join('');
  }
  if(!entries.length&&!dayTargets.length&&!dayObs.length){
    html+='<div class="wl-day-empty">No targets on '+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'.<br><span style="font-size:12px;">Tap + to add one.</span></div>';
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

const WL_FILTERS=[
  {id:'running-today',  label:'Running Today',   title:'Horses from your profiler confirmed in today\'s racecards',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v14M5 3l10 3.5L5 10"/></svg>'},
  {id:'no-obs',         label:'No Observations', title:'Profiles with no observations logged yet',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><line x1="3" y1="3" x2="17" y2="17"/></svg>'},
  {id:'past-target',    label:'Past Target',     title:'Target race dates that have passed — mark if they ran',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v2M13 2v2M7 12l2 2 4-4"/></svg>'},
  {id:'no-date-target', label:'Undated Target',  title:'Profiles with a target race that has no date set yet',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v2M13 2v2M10 12v.5M10 15v.1"/></svg>'},
  {id:'edge',           label:'Edge',            title:'Your rating is above the official rating — potential value',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 14 7 9 11 12 17 5"/><polyline points="14 5 17 5 17 8"/></svg>'},
  {id:'ready',          label:'Ready to Back',   title:'Horses you have marked as ready to back',
    svg:'<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><polyline points="6 10 9 13 14 7"/></svg>'},
];

function _wlToggleCold(){_wlShowCold=!_wlShowCold;renderWLList();}

function setWLFilter(id){
  _wlFilter=(_wlFilter===id)?null:id; // toggle off if already active
  renderWLList();
}

function _applyWLFilter(entries){
  if(!_wlFilter) return entries;
  const today=td();
  if(_wlFilter==='no-obs'){
    return entries.filter(function(e){return!e.unraced&&!(e.observations&&e.observations.length);});
  }
  if(_wlFilter==='past-target'){
    return entries.filter(function(e){
      return (e.targets||[]).some(function(t){return t.date&&t.date<today&&!t.ran;});
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
  if(_wlFilter==='no-date-target'){
    return entries.filter(function(e){
      return (e.targets||[]).some(function(t){return t.race&&!t.date;});
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
    .wll-stat-n{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:20px;font-weight:800;letter-spacing:.5px;color:var(--txt);}
    .wll-stat-l{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);margin-top:1px;}
    .wll-sec{display:flex;align-items:center;gap:8px;padding:10px 0 6px;border-bottom:1px solid var(--bdr);margin-bottom:4px;}
    .wll-sec-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
    .wll-sec-lbl{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;flex:1;}
    .wll-sec-cnt{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:10px;color:var(--mut);}
    .wll-row{display:flex;align-items:center;border-left:3px solid;padding:10px 10px 10px 12px;margin-bottom:6px;background:var(--sur2);border-radius:0 9px 9px 0;cursor:pointer;transition:background .12s;}
    .wll-row:active{background:var(--dim);}
    .wll-silks{width:30px;height:30px;border-radius:50%;background:var(--sur);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px;}
    .wll-main{flex:1;min-width:0;}
    .wll-name{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:16px;font-weight:600;letter-spacing:.2px;color:var(--txt);line-height:1;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .wll-sub{font-size:11px;color:var(--mut);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .wll-tag{display:inline-flex;align-items:center;gap:3px;font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:8px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:1px 6px;border-radius:3px;}
    .wll-right{display:flex;gap:5px;align-items:center;flex-shrink:0;margin-left:10px;}
    .wll-rating{display:flex;flex-direction:column;align-items:center;background:var(--sur);border:1px solid var(--bdr);border-radius:7px;padding:4px 7px;min-width:38px;}
    .wll-rating-lbl{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);}
    .wll-rating-val{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:15px;font-weight:800;letter-spacing:.5px;line-height:1.1;}
    .wll-empty{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:13px;color:var(--mut);font-style:italic;text-align:center;padding:40px 20px;}
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
    filterBar.innerHTML='';
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
  }

  // Apply active filter
  entries=_applyWLFilter(entries);

  if(!entries.length){
    if(_wlFilter){
      const filterLabel=WL_FILTERS.find(function(f){return f.id===_wlFilter;}).label;
      el.innerHTML='<div class="wll-empty">No profiles match the <strong>'+filterLabel+'</strong> filter.</div>';
    } else if(search){
      el.innerHTML='<div class="wll-empty">No profiles match "'+search+'".</div>';
    } else {
      el.innerHTML='<div style="text-align:center;padding:36px 20px;">'
        +'<div style="font-size:40px;margin-bottom:14px;">🐴</div>'
        +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:17px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:8px;">Your Profiler is empty</div>'
        +'<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:6px;">Build private profiles for every horse you follow — track ratings, going preferences, trainer intel, and race targets.</div>'
        +'<div style="font-size:12px;color:var(--mut);line-height:1.6;margin-bottom:20px;">When they\'re declared to run, they\'ll appear on your Today card automatically.</div>'
        +'<button onclick="wlNew()" style="padding:11px 24px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">+ Add First Horse</button>'
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

  let html='<div class="wll-wrap">';

  const coldCount=getWL().filter(function(e){return e.betReadiness==='cold';}).length;
  const readyCount=getWL().filter(function(e){return e.betReadiness==='ready';}).length;

  // ── Stats strip ──
  html+='<div class="wll-stats">'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:var(--gld2);">'+total+'</div><div class="wll-stat-l">Profiles</div></div>'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:#10b981;">'+readyCount+'</div><div class="wll-stat-l">Ready</div></div>'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:var(--ora);">'+totalTargets+'</div><div class="wll-stat-l">Targets</div></div>'
  +'</div>';
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
          return!(D.reviews||[]).some(function(rv){return rv.profileId===e.id&&rv.date===p.date;});
        }).length;
        return ov+pv;
      })();
      html+='<div style="position:relative;border-bottom:1px solid var(--bdr);" data-wl-id="'+e.id+'">'
        +'<div class="wll-row" style="border-left:none;border-bottom:none;">'
          +'<div class="wll-silks">'+_silkSVG(e.horse||'?',18)+'</div>'
          +'<div class="wll-main">'
            +'<div class="wll-name">'+_cmdBRDot+(e.horse||'Unknown')+_cmdPuzzleBadge+(_cmdAwaitingCount?'<span style="font-size:9px;font-weight:800;margin-left:6px;padding:1px 6px;border-radius:8px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.35);color:#f59e0b;vertical-align:middle;">'+_cmdAwaitingCount+' due</span>':'')+(e.needsReview?'<span class="wll-review-badge">REVIEW</span>':'')+'</div>'
            +'<div class="wll-sub">'+subParts.join(' · ')+'</div>'
            +'<div class="wll-tag" style="background:'+rm.col+'14;border:1px solid '+rm.col+'28;color:'+rm.col+';">'+(REASON_SVG[r]?REASON_SVG[r]+' ':'')+rm.label+'</div>'
          +'</div>'
          +'<div class="wll-right">'
            +'<div class="wll-rating"><div class="wll-rating-lbl">OR</div><div class="wll-rating-val" style="color:'+(or?'var(--navy)':'var(--mut)')+';">'+(or?String(or):'—')+'</div></div>'
            +'<div class="wll-rating"><div class="wll-rating-lbl">MR</div><div class="wll-rating-val" style="color:'+(mr?'var(--gld)':'var(--mut)')+';">'+(mr?String(mr):'—')+'</div></div>'
          +'</div>'
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
      openWLProfile(row.getAttribute('data-wl-id'));
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
      +'<div style="display:flex;align-items:center;gap:5px;margin-top:5px;">'
        +'<div style="flex:1;max-width:70px;height:3px;background:var(--sur2);border-radius:2px;">'
          +'<div style="height:100%;width:'+comp.pct+'%;background:'+compCol+';border-radius:2px;"></div>'
        +'</div>'
        +'<span style="font-size:9px;color:var(--mut);">'+comp.score+'/12</span>'
      +'</div>'
    +'</div>'
    +'<div class="wll-right">'
      +'<div class="wll-rating"><div class="wll-rating-lbl">OR</div><div class="wll-rating-val" style="color:'+(or?'var(--navy)':'var(--mut)')+';">'+(or?String(or):'—')+'</div></div>'
      +'<div class="wll-rating"><div class="wll-rating-lbl">MR</div><div class="wll-rating-val" style="color:'+(mr?'var(--gld)':'var(--mut)')+';">'+(mr?String(mr):'—')+'</div></div>'
    +'</div>'
  +'</div>';
}




// ── POST-RACE REVIEW SHEET ──
function wlCompletePendingReview(pendingId){
  const p=(D.pendingReviews||[]).find(function(x){return x.id===pendingId;});
  if(!p)return;
  const wl=getWL();
  const entry=wl.find(function(x){return x.id===p.profileId;})||{};
  // Open the review modal pre-filled with all saved race data
  openWLPostRaceReview(p.profileId, entry.horse||p.horse||'', p.course||'', p.result||'', p.raceName||'', p.raceDist||'', p.raceGoing||'', '');
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
    const saveBtn=document.querySelector('#wl-review-modal .btn.bgld');
    if(saveBtn){
      const origOnclick=saveBtn.getAttribute('onclick');
      saveBtn.setAttribute('onclick', 'wlDismissPending(\''+pendingId+'\');'+origOnclick);
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
    const pos=document.getElementById('rvw-pos');if(pos)pos.value=r.position||'';
    const beaten=document.getElementById('rvw-beaten');if(beaten)beaten.value=r.beatenDistance||'';
    const odds=document.getElementById('rvw-odds');if(odds)odds.value=r.odds||'';
    const mr=document.getElementById('rvw-mr-adj');if(mr)mr.value=r.mrAdjustment||0;
    const notes=document.getElementById('rvw-notes');if(notes)notes.value=r.notes||'';
    const goingPre=document.getElementById('rvw-going-prefill');if(goingPre)goingPre.value=r.going||'';
    // Pre-select toggle buttons
    ['result','verdict','going','back'].forEach(function(grp){
      const val={result:r.result,verdict:r.verdict,going:r.goingConfirmed}[grp];
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
    const saveBtn=document.querySelector('#wl-review-modal .btn.bgld');
    if(saveBtn){
      saveBtn.onclick=function(){
        r.date=document.getElementById('rvw-date').value||r.date;
        r.course=(document.getElementById('rvw-course').value||'').trim()||r.course;
        r.distance=(document.getElementById('rvw-dist')||{value:''}).value.trim();
        r.position=(document.getElementById('rvw-pos').value||'').trim();
        r.beatenDistance=(document.getElementById('rvw-beaten').value||'').trim();
        r.odds=(document.getElementById('rvw-odds')||{value:''}).value.trim();
        r.result=_rvwGet('result')||r.result;
        r.verdict=_rvwGet('verdict')||r.verdict;
        r.goingConfirmed=_rvwGet('going')||r.goingConfirmed;
        r.mrAdjustment=parseInt((document.getElementById('rvw-mr-adj')||{value:0}).value)||0;
        r.notes=(document.getElementById('rvw-notes').value||'').trim();
        r.going=(document.getElementById('rvw-going-prefill')||{value:''}).value;
        r.raceName=(document.getElementById('rvw-racename-prefill')||{value:''}).value.trim()||r.distance||'';
        const idx=(D.reviews||[]).findIndex(function(x){return x.id===reviewId;});
        if(idx>-1)D.reviews[idx]=r;
        save();
        document.getElementById('wl-review-modal').remove();
        if(document.getElementById('wlp-modal'))openWLProfile(r.profileId);
      };
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
  const F='width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Segoe UI\',sans-serif;outline:none;box-sizing:border-box;';
  const L='display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;';
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
    +'<div class="fg"><label>Distance</label><input type="text" id="rvw-dist" value="'+(raceDist||'')+'" placeholder="e.g. 1m2f"></div>'
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
    +(currentMR?'<div class="fg"><label>MR Adjustment <span style="color:var(--mut);font-weight:400;">(current: '+currentMR+')</span></label><input type="number" id="rvw-mr-adj" placeholder="e.g. 5 or -3"></div>':'<input type="hidden" id="rvw-mr-adj" value="0">')
    +'<div class="fg" id="rvw-going-row"><label>Going'+(raceGoing?' <span style="color:var(--mut);font-weight:400;font-size:11px;">('+raceGoing+')</span>':'')+'</label><div class="rvw-btn-group">'
    +[{k:'confirmed',lbl:'✓ Confirmed'},{k:'mixed',lbl:'~ Mixed'},{k:'against',lbl:'✗ Against'}].map(function(g){return'<button data-going="'+g.k+'" data-grp="going" class="rvw-btn" style="--rvw-col:var(--txt)" onclick="wlRvwToggle(this)">'+g.lbl+'</button>';}).join('')
    +'</div></div>'
    +'<div class="fg"><label>Bet Readiness</label><div class="rvw-btn-group" id="rvw-readiness-row">'
    +BR_STAGES.map(function(s){const isCur=(entry&&(entry.betReadiness||'watching')===s.id);return'<button data-readiness="'+s.id+'" data-grp="readiness" class="rvw-btn" style="--rvw-col:'+s.col+';'+(isCur?'opacity:1':'opacity:0.4')+'" data-selected="'+(isCur?'1':'')+'" onclick="wlRvwToggle(this)">'+s.label+'</button>';}).join('')
    +'</div></div>'
    +'<div id="rvw-signals" style="margin:4px 0 2px;"></div>'
    +'<div class="fg"><label>Notes</label><textarea id="rvw-notes" placeholder="What you saw, sectionals, paddock notes…" style="min-height:64px;"></textarea></div>'
    +'<div style="display:flex;gap:8px;margin-top:4px;">'
    +'<button onclick="saveWLReview(\''+profileId+'\',\''+horse+'\',\''+course+'\')" class="btn bgld" style="flex:1;">Save Review</button>'
    +'<button onclick="document.getElementById(\'wl-review-modal\').remove()" class="btn bout">Cancel</button>'
    +'</div>'
    +'</div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',function(ev){if(ev.target===modal)modal.remove();});

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

function _rvwUpdateSignals(){
  const el=document.getElementById('rvw-signals');if(!el)return;
  const result=_rvwGet('result');
  const verdict=_rvwGet('verdict');
  const going=_rvwGet('going');
  const readiness=_rvwGet('readiness');
  if(!result&&!verdict&&!going){el.innerHTML='';return;}
  const alerts=[];
  const hot=[];
  const cold=[];
  // Result signals
  if(result==='win'){hot.push('Won the race');}
  else if(result==='place'){hot.push('Placed — ran to form');}
  else if(result==='unplaced'){cold.push('Unplaced');}
  else if(result==='nr'){alerts.push({col:'#94a3b8',msg:'Non-runner — no data gained'});}
  else if(result==='missed'){alerts.push({col:'#94a3b8',msg:'Missed target — nothing to assess'});}
  // Going signals
  if(going==='confirmed'){hot.push('Going suited ✓');}
  else if(going==='against'){cold.push('Going against preferences ✗');}
  else if(going==='mixed'){alerts.push({col:'#f59e0b',msg:'Going was mixed — monitor'});}
  // Verdict signals
  if(verdict==='upgrade'){hot.push('Verdict: Upgrade ↑');}
  else if(verdict==='downgrade'){cold.push('Verdict: Downgrade ↓');}
  // Readiness suggestion
  if(result==='win'||verdict==='upgrade'){
    const cur=readiness||document.querySelector('.rvw-btn[data-grp="readiness"][data-selected="1"]')?.dataset.readiness||'watching';
    if(cur!=='ready')alerts.push({col:'#10b981',msg:'Consider marking as Ready to Back'});
  }
  if(verdict==='downgrade'||going==='against'){
    const cur=readiness||document.querySelector('.rvw-btn[data-grp="readiness"][data-selected="1"]')?.dataset.readiness||'watching';
    if(cur!=='cold')alerts.push({col:'#a78bfa',msg:'Consider marking as Cold'});
  }
  // Stars: 1 per hot, -1 per cold, base 3, clamped 1-5
  const starScore=Math.min(5,Math.max(1,3+hot.length-cold.length));
  const starCol=starScore>=4?'#10b981':starScore===3?'#f59e0b':'#f87171';
  const stars='★'.repeat(starScore)+'☆'.repeat(5-starScore);
  let html='<div style="background:rgba(255,255,255,.04);border:1px solid var(--bdr);border-radius:10px;padding:10px 12px;">';
  html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
    +'<span style="font-size:18px;letter-spacing:2px;color:'+starCol+';">'+stars+'</span>'
    +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);">Horse Signal</span>'
    +'</div>';
  hot.forEach(function(m){html+='<div style="font-size:13px;color:#10b981;margin-bottom:3px;">✓ '+m+'</div>';});
  cold.forEach(function(m){html+='<div style="font-size:13px;color:#f87171;margin-bottom:3px;">✗ '+m+'</div>';});
  alerts.forEach(function(a){html+='<div style="font-size:13px;color:'+a.col+';margin-bottom:3px;">⚠ '+a.msg+'</div>';});
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
    distance:rvwDist,going:(document.getElementById('rvw-going-prefill')||{value:''}).value,
    result:_rvwGet('result'),
    position:(document.getElementById('rvw-pos').value||'').trim(),
    beatenDistance:(document.getElementById('rvw-beaten').value||'').trim(),
    odds:(document.getElementById('rvw-odds')||{value:''}).value.trim(),
    verdict:_rvwGet('verdict'),
    mrAdjustment:mrAdj,
    goingConfirmed:_rvwGet('going'),
    notes:(document.getElementById('rvw-notes').value||'').trim(),
    source:'manual',createdAt:Date.now()
  };

  if(!D.reviews)D.reviews=[];
  D.reviews.push(review);

  // Apply MR adjustment
  if(mrAdj){
    const idx=D.watchlist.findIndex(function(x){return x.id===profileId;});
    if(idx>-1){
      const cur=parseFloat(D.watchlist[idx].myRating)||0;
      D.watchlist[idx].myRating=String(cur+mrAdj);
      D.watchlist[idx].updatedAt=Date.now();
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

  save();
  document.getElementById('wl-review-modal').remove();
  if(typeof checkWatchlistRunners==='function'&&window._cachedRaces)checkWatchlistRunners(window._cachedRaces);
  if(document.getElementById('wlp-modal'))openWLProfile(profileId);
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
  const intel=(document.getElementById('wlf-intel')||{value:''}).value.trim();
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
    targets:e&&e.targets?e.targets.map(function(t){return Object.assign({},t);}):p.targets||[]
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
  const defaultTab=e?'overview':'horse';

  // ── Tab 1: Overview ────────────────────────────────────────────────────────
  const overviewHtml=(function(){
    if(!e) return'<div id="wlft-overview" class="wlf-tab-panel" style="display:none;padding:24px 14px;text-align:center;">'
      +'<div style="font-size:32px;margin-bottom:12px;">📊</div>'
      +'<div style="font-size:14px;font-weight:700;color:var(--txt);margin-bottom:6px;">Save your profile first</div>'
      +'<div style="font-size:13px;color:var(--mut);line-height:1.6;">Analytics, momentum, bets P&L and OR history will appear here once the profile is saved.</div>'
    +'</div>';
    const betsOnHorse=(D.bets||[]).filter(function(b){return(b.horse||'').toLowerCase().trim()===(e.horse||'').toLowerCase().trim();});
    const settled=betsOnHorse.filter(function(b){return b.result&&b.result!=='pending';});
    const wins=settled.filter(function(b){return b.result==='win';}).length;
    const totalStaked=settled.reduce(function(a,b){return a+(parseFloat(b.stake)||0);},0);
    const totalRet=settled.reduce(function(a,b){return a+(parseFloat(b.returns)||0);},0);
    const horsePnl=totalRet-totalStaked;
    const nextTarget=(e.targets||[]).filter(function(t){return t.race||t.track;}).sort(function(a,b){return(a.date||'').localeCompare(b.date||'');}).find(function(t){return !t.date||t.date>=td();});
    const orH=e.orHistory||[];
    const orTrend=orH.length>=2?(function(){const d=(orH[orH.length-1].rating||0)-(orH[orH.length-2].rating||0);return d>0?'+'+d+'lb':d<0?d+'lb':'no change';}()):'';
    return'<div id="wlft-overview" class="wlf-tab-panel" style="display:none;padding:14px 14px 0;">'
      +'<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:14px;margin-bottom:12px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
          +'<div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);">Profile Completeness</div>'
          +'<div style="font-size:14px;font-weight:800;color:'+pctCol+';">'+c.score+'/'+c.total+'</div>'
        +'</div>'
        +'<div style="height:6px;background:var(--sur2);border-radius:4px;overflow:hidden;margin-bottom:10px;">'
          +'<div style="height:100%;width:'+c.pct+'%;background:'+pctCol+';border-radius:4px;"></div>'
        +'</div>'
        +(c.missing.length?'<div style="font-size:11px;color:var(--mut);">Missing: <span style="color:var(--txt);">'+c.missing.join(', ')+'</span></div>':'<div style="font-size:11px;color:#4ade80;font-weight:600;">✓ Profile complete</div>')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
        +'<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:12px;">'
          +'<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-bottom:6px;">Momentum</div>'
          +(mom?'<div style="font-size:20px;font-weight:800;color:'+mom.col+';">'+mom.icon+' '+mom.label+'</div>'+(orTrend?'<div style="font-size:10px;color:var(--mut);margin-top:3px;">OR: '+orTrend+'</div>':''):'<div style="font-size:13px;color:var(--mut);">No data yet</div>')
        +'</div>'
        +'<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:12px;">'
          +'<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-bottom:6px;">Your Bets</div>'
          +(betsOnHorse.length?'<div style="font-size:20px;font-weight:800;color:'+(horsePnl>=0?'#4ade80':'#f87171')+';">'+(horsePnl>=0?'+':'')+fmt(horsePnl)+'</div><div style="font-size:10px;color:var(--mut);margin-top:3px;">'+betsOnHorse.length+' bet'+(betsOnHorse.length===1?'':'s')+' · '+wins+' win'+(wins===1?'':'s')+'</div>':'<div style="font-size:13px;color:var(--mut);">No bets logged</div>')
        +'</div>'
      +'</div>'
      +(nextTarget?'<div style="background:rgba(251,146,60,.06);border:1px solid rgba(251,146,60,.2);border-radius:12px;padding:12px;margin-bottom:12px;">'
        +'<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ora);margin-bottom:4px;">🎯 Next Target</div>'
        +'<div style="font-size:14px;font-weight:700;color:var(--txt);">'+(nextTarget.race||'')+(nextTarget.track?' · '+nextTarget.track:'')+'</div>'
        +(nextTarget.date?'<div style="font-size:11px;color:var(--mut);margin-top:2px;">'+nextTarget.date+'</div>':'')
      +'</div>':'')
      +(orH.length?'<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:12px;margin-bottom:12px;">'
        +'<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">OR History</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
        +orH.slice(-6).map(function(h){return'<div style="text-align:center;"><div style="font-size:15px;font-weight:800;color:var(--navy);">'+(h.rating||'—')+'</div><div style="font-size:9px;color:var(--mut);">'+(h.date?h.date.slice(2):'')+'</div></div>';}).join('<div style="color:var(--bdr);">→</div>')
        +'</div></div>':'')
    +'</div>';
  }());

  // ── Tab 2: Horse (identity) ────────────────────────────────────────────────
  const horseHtml=(function(){
    return'<div id="wlft-horse" class="wlf-tab-panel" style="display:none;">'
      +'<div class="wlf-section">'
        +'<div style="padding:12px 13px 0;">'
          +'<button type="button" id="wlf-scan-btn" onclick="wlScanScreenshot()" style="width:100%;padding:11px;border-radius:9px;border:1.5px dashed rgba(250,204,21,.4);background:rgba(250,204,21,.06);color:var(--gld);font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.02em;">📷 Scan Screenshot — fill from Racing Post / ATR</button>'
          +'<div id="wlf-scan-notice" style="display:none;font-size:12px;color:var(--grn);padding:6px 2px 0;"></div>'
        +'</div>'
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
            +'<div class="fg"><label>Surface</label><select id="wlf-surface">'
              +'<option value="">— Unknown</option>'
              +'<option value="flat"'+(sf==='flat'?' selected':'')+'>Flat</option>'
              +'<option value="jumps"'+(sf==='jumps'?' selected':'')+'>Jumps / NH</option>'
              +'<option value="aw"'+(sf==='aw'?' selected':'')+'>All Weather</option>'
            +'</select></div>'
            +'<div class="fg"><label>Race Type</label><select id="wlf-race-type">'
              +'<option value="">— Unknown</option>'
              +'<option value="handicap"'+(rt==='handicap'?' selected':'')+'>Handicapper</option>'
              +'<option value="group"'+(rt==='group'?' selected':'')+'>Group / Listed</option>'
              +'<option value="maiden"'+(rt==='maiden'?' selected':'')+'>Maiden</option>'
              +'<option value="claimer"'+(rt==='claimer'?' selected':'')+'>Claimer</option>'
            +'</select></div>'
          +'</div>'
          +'<div style="padding:4px 0 2px;">'
            +'<button type="button" id="wlf-ai-btn" onclick="wlAIAssess()" style="width:100%;padding:10px;border-radius:9px;border:1.5px solid rgba(168,85,247,.4);background:rgba(168,85,247,.07);color:#a855f7;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.02em;display:flex;align-items:center;justify-content:center;gap:7px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 11h-1V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4.5A1.5 1.5 0 0 0 3 6.5v3.05A2.5 2.5 0 0 1 3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v1.5a2.5 2.5 0 0 0 5 0V19h4.5a2 2 0 0 0 2-2v-4h1a1.5 1.5 0 0 0 0-3z" fill="#a855f7"/></svg>Generate Puzzle Report</button>'
            +'<div id="wlf-ai-result" style="display:none;margin-top:10px;border-radius:9px;border:1px solid rgba(168,85,247,.25);background:rgba(168,85,247,.06);padding:12px 13px;"></div>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }());

  // ── Tab 3: Notes (why watching + conditions + intel) ───────────────────────
  const notesHtml=(function(){
    var distHtml=DIST_GROUPS.map(function(grp){
      return'<div style="margin-bottom:6px;">'
        +'<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:4px;">'+grp.label+'</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:5px;">'
        +grp.opts.map(function(d){var sel=_wlDossier.distPrefs.includes(d);return'<button type="button" data-dist="'+d+'" onclick="wlToggleDist(this)" class="wlf-going-btn'+(sel?' on':'')+'">'+d+'</button>';}).join('')
        +'</div></div>';
    }).join('');
    return'<div id="wlft-notes" class="wlf-tab-panel" style="display:none;">'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title">Why Am I Watching?</span></div>'
        +'<div style="display:flex;gap:5px;flex-wrap:wrap;padding:12px 13px 13px;" id="wlf-reasons">'+reasonHtml+'</div>'
        +'<input type="hidden" id="wlf-reason" value="'+curReason+'">'
        +'<div class="wlf-sec-body">'
          +'<div class="fg"><label>In a sentence…</label>'
            +'<input type="text" id="wlf-reason-note" placeholder="e.g. Kept on well from rear, bumped 2f out — needs a clearer run" value="'+(e?e.reasonNote||'':'')+'" autocomplete="off">'
          +'</div>'
          +'<div id="wlf-unraced-row" style="display:'+(showUnraced?'flex':'none')+';align-items:center;gap:10px;padding:10px 13px;background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2);border-radius:9px;margin-bottom:4px;">'
            +'<input type="checkbox" id="wlf-unraced" onchange="wlToggleUnraced()" style="width:16px;height:16px;accent-color:#fb7185;cursor:pointer;flex-shrink:0;"'+(isUnraced?' checked':'')+'>'
            +'<label for="wlf-unraced" style="font-size:12px;font-weight:700;color:var(--txt);cursor:pointer;margin:0;">Unraced — no observations possible yet</label>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title" style="color:var(--grn);">Conditions Sweet Spot</span></div>'
        +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
          +'<div class="fg"><label>Going Preferences</label><div id="wlf-going" style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;">'+goingHtml+'</div></div>'
          +'<div class="fg"><label>Preferred Distance</label><div id="wlf-dist-btns" style="padding:4px 0;">'+distHtml+'</div></div>'
          +'<div class="fg"><label>Track Type</label><input type="text" id="wlf-track" placeholder="e.g. Straight, Galloping, Sharp" value="'+(e?e.trackPref||'':'')+'"></div>'
          +'<div class="fg"><label>Conditions Notes</label><textarea id="wlf-cond-notes" placeholder="Your evolving view on what suits this horse..." style="min-height:64px;">'+(e?e.conditionsNotes||e.notes||'':'')+'</textarea></div>'
        +'</div>'
      +'</div>'
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title" style="color:var(--blu);">Trainer / Connections Intel</span></div>'
        +'<div class="wlf-sec-body"><div class="fg"><textarea id="wlf-intel" placeholder="Notes from trainer interviews, press, paddock chat..." style="min-height:64px;">'+(e?e.trainerIntel||'':'')+'</textarea></div></div>'
      +'</div>'
    +'</div>';
  }());

  // ── Tab 4: Races (observations + reviews + targets) ───────────────────────
  const racesHtml=(function(){
    const pid=e?e.id:'';
    const rvws=pid?(D.reviews||[]).filter(function(r){return r.profileId===pid;}).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}):[];
    const RCOL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'var(--mut)',loss:'#f87171',missed:'#a78bfa'};
    return'<div id="wlft-races" class="wlf-tab-panel" style="display:none;">'
      // Race reviews
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title">Race Reviews</span></div>'
        +'<div class="wlf-sec-body">'
          +(rvws.length
            ?rvws.map(function(r){const rc=RCOL[r.result||'']||'var(--mut)';return'<div class="wlf-rvw-row">'
                +'<div class="wlf-rvw-meta"><span>'+r.date+'</span>'+(r.raceName?'<span class="wlf-rvw-dot">·</span><span>'+r.raceName+'</span>':'')+(r.odds?'<span class="wlf-rvw-dot">·</span><span style="color:var(--gld);font-weight:700;">'+r.odds+'</span>':'')+'<span class="wlf-rvw-badge" style="color:'+rc+';">'+(r.result||'').toUpperCase()+'</span></div>'
                +(r.notes?'<div class="wlf-rvw-notes">'+r.notes+'</div>':'')
              +'</div>';}).join('')
            :'<div style="font-size:12px;color:var(--mut);padding:8px 0;font-style:italic;">No race reviews yet — add one below or use the Review button on Today after a run.</div>')
          +(pid?'<button onclick="openWLPostRaceReview(\''+pid+'\',\''+(e?(e.horse||'').replace(/'/g,"\\'"):'')+'\',\'\',\'\',\'\')" class="wlf-add-btn" style="margin-top:10px;">+ Add Race Review</button>':'<div style="font-size:11px;color:var(--mut);margin-top:8px;font-style:italic;">Save the profile first to add reviews.</div>')
        +'</div>'
      +'</div>'
      // Future targets
      +'<div class="wlf-section">'
        +'<div class="wlf-sec-hdr"><span class="wlf-sec-title" style="color:var(--ora);">Future Targets</span></div>'
        +'<div class="wlf-sec-body"><div id="wlf-targets-list"></div>'
          +'<button onclick="wlAddTargetRow()" class="wlf-add-btn">+ Add Target Race</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }());

  // ── Tab bar (always 4 tabs) ────────────────────────────────────────────────
  const TABS=[{id:'overview',label:'Overview'},{id:'horse',label:'Horse'},{id:'notes',label:'Notes'},{id:'races',label:'Races'}];
  const tabBarHtml='<div class="wlf-tab-bar" style="display:flex;border-bottom:2px solid var(--bdr);background:var(--sur2);padding:0 8px;gap:0;">'
    +TABS.map(function(t){
      const on=t.id===defaultTab;
      return'<button data-wlftab="'+t.id+'" onclick="wlSwitchTab(\''+t.id+'\')" class="wlf-tab-btn" style="font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:11px 14px;border:none;border-bottom:2px solid '+(on?'var(--navy)':'transparent')+';margin-bottom:-2px;background:transparent;color:'+(on?'var(--navy)':'var(--mut)')+';cursor:pointer;white-space:nowrap;">'+t.label+'</button>';
    }).join('')
  +'</div>';

  modal.innerHTML=
  '<div class="wlf-page">'
  +'<div class="wlf-nav">'
    +'<div class="wlf-brand">RACING <span class="wlf-brand-accent">PUZZLE</span></div>'
    +'<div class="wlf-nav-btns">'
      +(e?'<button onclick="delWLEntry(\''+e.id+'\')" class="wlf-del-btn">Delete</button>':'')
      +'<button onclick="document.getElementById(\'wl-modal\').remove()" class="wlf-close-btn">✕</button>'
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
  +'<div class="wlf-body">'
    +overviewHtml
    +horseHtml
    +notesHtml
    +racesHtml
  +'</div>'
  +'<div class="wlf-actions">'
    +'<button class="wlf-save-btn" onclick="saveWLEntry(\''+(e?e.id:'')+'\')">'+( e?'Save Profile':'Create Profile')+'</button>'
    +'<button class="wlf-cancel-btn" onclick="document.getElementById(\'wl-modal\').remove()">Cancel</button>'
  +'</div>'
  +'</div>';

  document.body.appendChild(modal);
  _renderObsList();_renderTargetsList();
  wlSwitchTab(defaultTab);
  setTimeout(function(){
    if(defaultTab==='horse'){const f=document.getElementById('wlf-horse');if(f)f.focus();}
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
    trainer:(document.getElementById('wlf-trainer').value||'').trim(),
    age:parseInt((document.getElementById('wlf-age')||{value:''}).value)||0,
    surface:(document.getElementById('wlf-surface')||{value:''}).value||'',
    raceType:(document.getElementById('wlf-race-type')||{value:''}).value||'',
    reason:(document.getElementById('wlf-reason')||{value:'eye-catcher'}).value||'eye-catcher',
    reasonNote:(document.getElementById('wlf-reason-note')||{value:''}).value.trim(),
    unraced:!!(document.getElementById('wlf-unraced')&&document.getElementById('wlf-unraced').checked),
    trainerIntel:(document.getElementById('wlf-intel').value||'').trim(),
    observations:[],
    targets:_wlDossier.targets.filter(function(t){return t.race;}),
    goingPrefs,
    distancePref:(_wlDossier.distPrefs||[]).join(', '),
    trackPref:(document.getElementById('wlf-track').value||'').trim(),
    conditionsNotes:(document.getElementById('wlf-cond-notes').value||'').trim(),
    aiAssessment:old?old.aiAssessment||null:null,
    aiAssessedAt:old?old.aiAssessedAt||null:null,
    raceDate,
    notes:(document.getElementById('wlf-intel').value||'').trim(),
    createdAt:old?old.createdAt||Date.now():Date.now(),
    updatedAt:Date.now()
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
  save();
  if(removedTargetIds.length) supaDeleteTargetsByIds(removedTargetIds).catch(function(){});
  document.getElementById('wl-modal').remove();
  renderWatchlist();
  if(entry.raceDate&&wlView==='cal'){wlCalDate=new Date(entry.raceDate+'T00:00:00');renderWLCal();setTimeout(function(){wlSelectDay(entry.raceDate);},100);}
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-weight: 700; letter-spacing: .5px;
  white-space: nowrap;
}
.wlp-brand {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 14px; font-weight: 800;
  letter-spacing: 2px; text-transform: uppercase;
  color: #fff;
  display: flex; align-items: center; gap: 7px;
}
.wlp-brand-accent { color: var(--gld2); }
.wlp-edit-btn {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: var(--mut); display: block; margin-bottom: 1px;
}
.wlp-or-value {
  font-size: 32px; letter-spacing: 1px; color: #fff; line-height: 1;
}
.wlp-or-na {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--mut); display: block; margin-bottom: 3px;
}
.wlp-meta-val {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 600; color: var(--mut);
  display: flex; align-items: center; gap: 6px;
}
.wlp-stat-val {
  
  font-size: 20px; letter-spacing: 1px; line-height: 1;
}
.wlp-stat-sm {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 800; color: var(--mut);
}
.wlp-section-title {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: var(--txt);
}
.wlp-section-action {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--mut); margin-bottom: 5px; text-align: center;
}
.wlp-rating-val {
  
  font-size: 28px; letter-spacing: 1px; line-height: 1; text-align: center;
}
.wlp-rating-na {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 14px; font-weight: 700; color: var(--mut);
}
.wlp-rating-bar { height: 2px; border-radius: 1px; margin-top: 5px; width: 80%; }
.wlp-or-hist {
  display: flex; gap: 5px; padding: 0 13px 12px;
  flex-wrap: wrap; align-items: center;
}
.wlp-hist-label {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--mut);
}
.wlp-hist-pill {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 11px; color: #8a8060; font-style: italic;
  padding: 14px 13px; text-align: center; line-height: 1.6;
}
.wlp-obs-count {
  border-top: 1px solid var(--bdr); padding: 9px;
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 13px; font-weight: 800; color: #fff; letter-spacing: .3px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wlp-target-meta {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 10px; font-weight: 600; color: var(--mut); letter-spacing: .3px; margin-top: 2px;
}
.wlp-target-date {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 11px; font-weight: 700; color: var(--clr-watch); letter-spacing: .5px;
}
.wlp-target-cond {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 600; color: var(--mut);
  text-align: right; max-width: 70px; line-height: 1.2; margin-top: 2px;
}
.wlp-target-empty {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 8px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--mut); text-align: center;
}
.wlp-cond-val {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
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

  const condItems=[
    {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',label:'Going',    value:(e.goingPrefs&&e.goingPrefs.length)?e.goingPrefs[0]:'Any',   color:(e.goingPrefs&&e.goingPrefs.length)?'#4ade80':'#3a3a5c'},
    {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/></svg>',label:'Distance', value:e.distancePref||'—',  color:e.distancePref?'#38bdf8':'#3a3a5c'},
    {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>',label:'Track',    value:e.trackPref||'—',     color:e.trackPref?'#8b5cf6':'#3a3a5c'},
  ];

  const editFn="document.getElementById('wlp-modal').remove();openWLForm('"+e.id+"')";

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

  let h='<div class="wlp-page">';

  // ── NAV (pinned, never scrolls) ───────────────────────────────────────────
  h+='<div class="wlp-nav">'
    +'<div class="wlp-back" onclick="document.getElementById(\'wlp-modal\').remove()">← Profiles</div>'
    +'<div class="wlp-brand">RACING <span class="wlp-brand-accent">PUZZLE</span></div>'
    +'<div class="wlp-edit-btn" onclick="'+editFn+'">Edit</div>'
  +'</div>';

  // ── HERO — compact, pinned, gives race-day essentials at a glance ─────────
  const goingPill=(e.goingPrefs&&e.goingPrefs.length)?e.goingPrefs.slice(0,2).join(' · '):'Any ground';
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
        +'<div style="font-size:12px;font-weight:800;color:'+(e.goingPrefs&&e.goingPrefs.length?'#4ade80':'rgba(255,255,255,.3)')+';line-height:1.2;margin-top:2px;">'+goingPill+'</div>'
      +'</div>'
    +'</div>'
  +'</div>';

  // ── SCROLLABLE CONTENT ────────────────────────────────────────────────────
  h+='<div class="wlp-scroll-body">';
  h+='<div class="wlp-sections-grid">';
  // SECTION 1: WHY LOGGED
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">1</div><span class="wlp-section-title">Why Logged</span></div>';
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

  // SECTION 2: RATINGS
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">2</div><span class="wlp-section-title">Ratings</span></div>';
  if((e.orHistory||[]).length>1)h+='<span class="wlp-section-action">History ›</span>';
  h+='</div>';
  h+='<div class="wlp-ratings-row">';
  [{key:'Official Rating',val:e.currentRating,col:'var(--navy)'},{key:'My Rating',val:e.myRating,col:'#f97316'}].forEach(function(r){
    const v=parseFloat(r.val)||null;
    h+='<div class="wlp-rating-col"><span class="wlp-rating-key">'+r.key+'</span>';
    if(v){h+='<span class="wlp-rating-val" style="color:'+r.col+';">'+v+'</span>';
      h+='<div class="wlp-rating-bar" style="background:'+r.col+'20;"><div style="height:100%;border-radius:1px;background:'+r.col+';width:'+Math.min(v/130*100,100)+'%;"></div></div>';}
    else{h+='<span class="wlp-rating-na">—</span><div class="wlp-rating-bar" style="background:var(--bdr);"></div>';}
    h+='</div>';
  });
  h+='</div>';
  if((e.orHistory||[]).length>0){
    h+='<div class="wlp-or-hist"><span class="wlp-hist-label">OR LOG</span>';
    e.orHistory.forEach(function(o){h+='<div class="wlp-hist-pill"><span>'+esc(o.or)+'</span><span class="wlp-hist-date">'+fmt(o.date)+'</span></div>';});
    h+='</div>';
  }
  h+='</div>';

  // Section 3: Targets
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr" style="padding:10px 12px;"><div class="wlp-section-left"><div class="wlp-section-num">3</div><span class="wlp-section-title" style="font-size:11px;">Targets</span></div>';
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
        h+='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:'+(isPast&&!alreadyReviewed?'var(--mut)':'var(--txt)')+';">'+esc(t.race||'—')+'</div>';
        // Line 3: condition note if set
        if(t.condition)h+='<div style="font-size:11px;color:var(--mut);margin-top:2px;font-style:italic;">'+esc(t.condition)+'</div>';
        // Line 4: actions — plain text, unobtrusive
        h+='<div style="display:flex;gap:8px;margin-top:6px;align-items:center;">';
          if(!alreadyReviewed)h+='<button onclick="'+rv+'" style="font-size:10px;font-weight:700;color:'+(isPast?'#f59e0b':'var(--mut)');+';background:none;border:none;padding:0;cursor:pointer;">Write review</button><span style="color:var(--bdr);">·</span>';
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
  function _dateReviewed(targetDate){
    // Consider reviewed if any review date falls within 7 days either side of target date
    const tMs=new Date(targetDate+'T00:00:00').getTime();
    return profileReviewDates.some(function(d){
      const dMs=new Date(d+'T00:00:00').getTime();
      return Math.abs(dMs-tMs)<=7*24*60*60*1000;
    });
  }
  const overdueTargets=(e.targets||[])
    .filter(function(t){return t.date&&t.date<today&&!_dateReviewed(t.date);})
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
    h+='<div class="wlp-section" style="border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.04);">';
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
            +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:#fff;">'+(item.raceName||item.course||'Race')+'</div>'
            +'<div style="font-size:11px;color:var(--mut);margin-top:2px;">'
              +[item.date?_wlpFmt(item.date):'',item.course,item.raceDist,item.raceGoing].filter(Boolean).join(' · ')
            +'</div>'
            +(item.position?'<div style="font-size:11px;color:var(--txt);margin-top:2px;">Finished: <strong>'+esc(item.position)+'</strong></div>':'')
            +(label?'<div style="font-size:10px;color:#f59e0b;margin-top:3px;font-style:italic;">'+label+'</div>':'')
          +'</div>'
          +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">'
            +(rc?'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:'+rc+'20;border:1px solid '+rc+'40;color:'+rc+';">'+item.result+'</span>':'')
            +(item._type==='pending'
              ?'<button onclick="wlCompletePendingReview(\''+item.id+'\')" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:7px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.1);color:#f59e0b;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;white-space:nowrap;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Write Up</button>'
              :'<button onclick="openWLPostRaceReview(\''+e.id+'\',\''+esc(e.horse)+'\',\'\',\'\',\''+esc(item.raceName||'')+'\')" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:7px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.1);color:#f59e0b;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;white-space:nowrap;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Write Up</button>')
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
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">4</div><span class="wlp-section-title">Race Reviews</span></div>';
  h+='<span class="wlp-section-action" onclick="openWLPostRaceReview(\''+e.id+'\',\''+esc(e.horse)+'\',\'\',\'\',\'\')">Add +</span></div>';
  if(profileReviews.length){
    profileReviews.forEach(function(r){
      const isObs=r.source==='observation';
      const vm=VERDICT_META[r.verdict]||null;
      const rc=RESULT_COL[r.result]||'var(--mut)';
      h+='<div style="padding:12px 13px;border-bottom:1px solid var(--bdr);">';
      // Row 1: date · course · race name + result badge
      h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:'+(isObs||r.notes||vm?'6':'0')+'px;">';
        h+='<div style="min-width:0;flex:1;">';
          // Date + course — always consistent, always first
          h+='<div style="font-size:10px;font-weight:700;color:var(--mut);letter-spacing:.04em;margin-bottom:3px;">'+[r.date?_wlpFmt(r.date):'',r.course||''].filter(Boolean).join(' · ')+'</div>';
          // Race name — primary label
          h+='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:'+(isObs?'var(--mut)':'var(--txt)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(isObs?'Initial Sighting':(r.raceName||'Race'))+'</div>';
        h+='</div>';
        // Result badge right-aligned
        h+='<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">';
          if(r.result)h+='<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 9px;border-radius:5px;background:'+rc+'20;border:1px solid '+rc+'40;color:'+rc+';">'+r.result+'</span>';
          if(vm)h+='<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+vm.col+'15;border:1px solid '+vm.col+'30;color:'+vm.col+';">'+vm.label+'</span>';
        h+='</div>';
      h+='</div>';
      // Row 2: detail chips (position, going, odds etc.) — only if present
      const chips=[];
      if(r.position)chips.push({l:'Pos',v:r.position});
      if(r.goingConfirmed)chips.push({l:'Going',v:r.goingConfirmed});
      if(r.beatenDistance)chips.push({l:'Beaten',v:r.beatenDistance});
      if(r.odds)chips.push({l:'SP',v:r.odds});
      if(r.mrAdjustment)chips.push({l:'MR',v:(r.mrAdjustment>0?'+':'')+r.mrAdjustment});
      if(chips.length)h+='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;">'+chips.map(function(c){return'<div style="font-size:10px;color:var(--txt);"><span style="color:var(--mut);font-weight:600;">'+c.l+'</span> <span style="font-weight:700;">'+esc(c.v)+'</span></div>';}).join('<span style="color:var(--bdr);margin:0 1px;">·</span>')+'</div>';
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
  } else {
    h+='<div style="padding:14px 13px;font-size:12px;color:var(--mut);font-style:italic;text-align:center;">No reviews yet — tap Add after a run</div>';
  }
  h+='</div>';

  h+='</div>'; // wlp-sections-grid

  // SECTION 6: CONDITIONS (full width)
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">5</div><span class="wlp-section-title">Conditions</span></div><span class="wlp-section-action" onclick="'+editFn+'">Edit</span></div>';
  h+='<div class="wlp-cond-grid" style="grid-template-columns:repeat('+condItems.length+',1fr);border-bottom:1px solid var(--bdr);">';
  condItems.forEach(function(c){
    const isDash=c.value==='—'||c.value==='Any';
    h+='<div class="wlp-cond-cell"><span class="wlp-cond-icon">'+c.icon+'</span><span class="wlp-cond-label">'+c.label+'</span><span class="wlp-cond-val" style="color:'+(isDash?'#3a3a5c':c.color)+';">'+esc(c.value)+'</span></div>';
  });
  h+='</div>';
  const intelText=e.trainerIntel||e.conditionsNotes||'';
  if(intelText){
    h+='<div class="wlp-intel"><span class="wlp-intel-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span><div class="wlp-intel-text">'+esc(intelText)+'</div></div>';
  }
  h+='</div>';

  // AI ASSESSMENT SECTION
  if(e.aiAssessment){
    const ai=e.aiAssessment;
    const assessedDate=e.aiAssessedAt?_wlpFmt(new Date(e.aiAssessedAt).toISOString().split('T')[0]):'';
    h+='<div class="wlp-section" style="border:1px solid rgba(168,85,247,.25);background:rgba(168,85,247,.04);">';
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

  h+='</div>'; // wlp-scroll-body

  // ── QUICK ACTION BAR — always visible at bottom ───────────────────────────
  h+='<div class="wlp-quick-bar">'
    +'<button class="wlp-quick-btn" onclick="wlToggleBRPicker(\''+e.id+'\')">⬤ Readiness</button>'
    +'<button class="wlp-quick-btn" onclick="openWLPostRaceReview(\''+e.id+'\',\''+esc(e.horse)+'\',\'\',\'\',\'\')">+ Review</button>'
    +'<button class="wlp-quick-btn wlp-quick-btn-primary" onclick="'+editFn+'">✏ Edit</button>'
  +'</div>';

  h+='</div>'; // page
  return h;
}

// Quick observation sheet — lightweight, returns to profile view on save

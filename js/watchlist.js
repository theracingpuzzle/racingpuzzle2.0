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
];

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
  entries.forEach(function(e){const r=e.reason||'eye-catcher';if(!groups[r])groups[r]=[];groups[r].push(e);});

  const total=entries.length;
  const totalObs=entries.reduce(function(a,e){return a+(e.observations||[]).length;},0);
  const totalTargets=entries.reduce(function(a,e){return a+(e.targets||[]).length;},0);

  let html='<div class="wll-wrap">';

  // ── Stats strip ──
  html+='<div class="wll-stats">'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:var(--gld2);">'+total+'</div><div class="wll-stat-l">Profiles</div></div>'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:var(--grn);">'+totalObs+'</div><div class="wll-stat-l">Observations</div></div>'
    +'<div class="wll-stat"><div class="wll-stat-n" style="color:var(--ora);">'+totalTargets+'</div><div class="wll-stat-l">Targets</div></div>'
  +'</div>';

  // ── Groups ──
  REASON_ORDER.forEach(function(r){
    if(!groups[r]||!groups[r].length)return;
    const rm=REASON_META[r];
    const grp=groups[r];

    const isOpen=!!_wlGroupOpen[r];
    html+='<div class="wll-cat-hdr" data-grp="'+r+'" style="'
      +'display:flex;align-items:center;gap:10px;'
      +'padding:11px 14px;cursor:pointer;border-radius:10px;'
      +'background:'+rm.col+';margin-bottom:'+(isOpen?'0':'8px')+';'
      +'border-radius:'+(isOpen?'10px 10px 0 0':'10px')+';'
      +'transition:border-radius .2s;">'
      +'<span style="display:flex;align-items:center;gap:8px;flex:1;color:#fff;">'
        +'<span style="display:flex;align-items:center;opacity:.9;">'+REASON_SVG[r]+'</span>'
        +'<span style="font-family:var(--font);font-size:14px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;">'+rm.labelPlural+'</span>'
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
      const addedDate=e.createdAt?'Added '+fdate(new Date(e.createdAt).toISOString().slice(0,10)):'';
      const updatedDate=e.updatedAt&&e.updatedAt!==e.createdAt?'Updated '+fdate(new Date(e.updatedAt).toISOString().slice(0,10)):'';

      html+='<div style="position:relative;border-bottom:1px solid var(--bdr);" data-wl-id="'+e.id+'">'
        +'<div class="wll-row" style="border-left:none;border-bottom:none;">'
          +'<div class="wll-silks">'+_silkSVG(e.horse||'?',18)+'</div>'
          +'<div class="wll-main">'
            +'<div class="wll-name">'+(e.horse||'Unknown')+(e.needsReview?'<span class="wll-review-badge">REVIEW</span>':'')+'</div>'
            +'<div class="wll-sub">'+subParts.join(' · ')+'</div>'
            +'<div class="wll-tag" style="background:'+rm.col+'14;border:1px solid '+rm.col+'28;color:'+rm.col+';">'+REASON_SVG[r]+' '+rm.label+'</div>'
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
  return'<div class="wll-row" style="border-left-color:'+rm.col+';" data-wl-id="'+e.id+'">'
    +'<div class="wll-silks">'+_silkSVG(e.horse||'?',18)+'</div>'
    +'<div class="wll-main">'
      +'<div class="wll-name">'+(e.horse||'Unknown')+'</div>'
      +'<div class="wll-sub">'+subParts.join(' · ')+(daysAgo?' · '+daysAgo:'')+'</div>'
      +'<div class="wll-tag" style="background:'+rm.col+'14;border:1px solid '+rm.col+'28;color:'+rm.col+';">'+rm.emoji+' '+rm.label+'</div>'
      +(e.unraced?'<div class="wll-tag" style="background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.25);color:#fb7185;margin-left:4px;">Unraced</div>':'')
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
      const val={result:r.result,verdict:r.verdict,going:r.goingConfirmed,back:r.backNextTime}[grp];
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
        r.backNextTime=_rvwGet('back')||r.backNextTime;
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
    +'<div class="fg" id="rvw-back-row"><label>Back Next Time?</label><div class="rvw-btn-group">'
    +[{k:'yes',col:'var(--grn)',lbl:'Yes'},{k:'depends',col:'var(--gld)',lbl:'Depends'},{k:'no',col:'var(--red)',lbl:'No'}].map(function(b){return'<button data-back="'+b.k+'" data-grp="back" class="rvw-btn" style="--rvw-col:'+b.col+'" onclick="wlRvwToggle(this)">'+b.lbl+'</button>';}).join('')
    +'</div></div>'
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
  // Result-specific UX
  if(grp==='result'){
    const result=btn.dataset.result;
    const posEl=document.getElementById('rvw-pos');
    const posRow=document.getElementById('rvw-pos-row');
    const beatenRow=document.getElementById('rvw-beaten-row');
    const oddsRow=document.getElementById('rvw-odds-row');
    const verdictRow=document.getElementById('rvw-verdict-row');
    const goingRow=document.getElementById('rvw-going-row');
    const backRow=document.getElementById('rvw-back-row');
    const raceOnly=result==='nr'||result==='missed';
    // Rows that vanish for NR / Missed Target
    [posRow,beatenRow,oddsRow,verdictRow,goingRow,backRow].forEach(function(el){
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
}

function _rvwGet(grp){
  const sel=document.querySelector('.rvw-btn[data-grp="'+grp+'"][data-selected="1"]');
  if(!sel)return'';
  return sel.dataset[grp]||sel.dataset.result||sel.dataset.verdict||sel.dataset.going||sel.dataset.back||'';
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
    backNextTime:_rvwGet('back'),
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
  // Clear needsReview flag
  const idx2=D.watchlist.findIndex(function(x){return x.id===profileId;});
  if(idx2>-1&&D.watchlist[idx2].needsReview)D.watchlist[idx2].needsReview=false;

  save();
  document.getElementById('wl-review-modal').remove();
  if(typeof checkWatchlistRunners==='function'&&window._cachedRaces)checkWatchlistRunners(window._cachedRaces);
  if(document.getElementById('wlp-modal'))openWLProfile(profileId);
}

// ── WATCHLIST DOSSIER MODAL ──
let _wlDossier={obs:[],targets:[],goingPrefs:[]};

function openWLForm(id,prefill){
  try{
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
  modal.id='wl-modal';modal.className='wlf-modal';
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
  modal.innerHTML=
  '<div class="wlf-page">'
  +'<div class="wlf-nav">'
  +'<div class="wlf-brand">RACING <span class="wlf-brand-accent">PUZZLE</span></div>'
  +'<div class="wlf-nav-btns">'
  +(e?'<button onclick="delWLEntry(\''+e.id+'\')" class="wlf-del-btn">Delete</button>':'')
  +'<button onclick="document.getElementById(\'wl-modal\').remove()" class="wlf-close-btn">✕</button>'
  +'</div></div>'
  +'<div class="wlf-hero">'
  +(e?'<div class="wlf-hero-title">'+e.horse+'</div><div class="wlf-hero-sub">Editing Profile</div>':'<div class="wlf-hero-title" style="color:rgba(255,255,255,.7);">New Profile</div><div class="wlf-hero-sub">Create a puzzle profiler entry</div>')
  +'</div>'
  +'<div class="wlf-body">'
  +'<div class="wlf-section">'
  +'<div class="wlf-sec-hdr"><div class="wlf-sec-num">1</div><span class="wlf-sec-title">Why Am I Logging This?</span></div>'
  +'<div style="display:flex;gap:5px;padding:12px 13px 13px;" id="wlf-reasons">'+reasonHtml+'</div>'
  +'<input type="hidden" id="wlf-reason" value="'+curReason+'">'
  +'<div class="wlf-sec-body">'
  +'<div class="fg"><label>In a sentence…</label>'
  +'<input type="text" id="wlf-reason-note" placeholder="e.g. Kept on well from rear, bumped 2f out — needs a clearer run" value="'+(e?e.reasonNote||'':'')+'" autocomplete="off">'
  +'</div>'
  // Unraced toggle — only visible for trainer-intel / tip-source
  +(function(){
    const showUnraced=(curReason==='trainer-intel'||curReason==='tip-source');
    const isUnraced=e&&e.unraced?true:false;
    return'<div id="wlf-unraced-row" style="display:'+(showUnraced?'flex':'none')+';align-items:center;gap:10px;padding:10px 13px;background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2);border-radius:9px;margin-bottom:4px;">'
      +'<input type="checkbox" id="wlf-unraced" onchange="wlToggleUnraced()" style="width:16px;height:16px;accent-color:#fb7185;cursor:pointer;flex-shrink:0;"'+(isUnraced?' checked':'')+'>'
      +'<label for="wlf-unraced" style="font-size:12px;font-weight:700;color:var(--txt);cursor:pointer;margin:0;">Unraced — no observations possible yet</label>'
    +'</div>';
  }())
  // Initial Race fields — hidden when unraced is ticked
  +(function(){
    const isUnraced=e&&e.unraced?true:false;
    const io=(_wlDossier.obs&&_wlDossier.obs[0])||{};
    return'<div id="wlf-initial-race" style="display:'+(isUnraced?'none':'')+'">'
      +'<div class="wlf-obs-sub-hdr">Initial Race</div>'
      +'<div class="g2" style="margin-bottom:8px;">'
        +'<div class="fg"><label>Date</label><input type="date" id="wlf-io-date" value="'+(io.date||'')+'"></div>'
        +'<div class="fg"><label>Result</label><select id="wlf-io-result">'
          +'<option value=""'+((!io.result)?' selected':'')+'>— Select</option>'
          +'<option value="win"'+((io.result==='win')?' selected':'')+'>Won</option>'
          +'<option value="place"'+((io.result==='place')?' selected':'')+'>Placed</option>'
          +'<option value="loss"'+((io.result==='loss')?' selected':'')+'>Unplaced</option>'
        +'</select></div>'
        +'<div class="fg"><label>Race / Meeting</label><input type="text" id="wlf-io-race" placeholder="e.g. Newmarket Maiden" value="'+(io.raceName||'')+'"></div>'
        +'<div class="fg"><label>Going</label><input type="text" id="wlf-io-going" placeholder="e.g. Good to Firm" value="'+(io.going||'')+'"></div>'
      +'</div>'
      +'<div class="fg"><label>What you saw</label><textarea id="wlf-io-notes" placeholder="Describe what caught your eye in this race…" style="min-height:60px;">'+(io.notes||'')+'</textarea></div>'
    +'</div>';
  }())
  +'</div></div></div>'
  +'<div class="wlf-section">'
  +'<div class="wlf-sec-hdr"><div class="wlf-sec-num">2</div><span class="wlf-sec-title">Horse</span></div>'
  +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
  +'<div class="fg"><label>Horse Name</label><input type="text" id="wlf-horse" value="'+(e?e.horse:p.horse||'')+'"></div>'
  +'<div class="g2">'
  +'<div class="fg"><label>Current OR <span style="font-weight:400;color:var(--mut);">auto-updates</span></label><input type="number" id="wlf-rating" placeholder="e.g. 85" value="'+(e?e.currentRating||'':p.currentRating||'')+'"></div>'
  +'<div class="fg"><label style="color:var(--gld);">My Mark (MR) ★</label><input type="number" id="wlf-myrating" placeholder="e.g. 88" value="'+(e?e.myRating||'':'')+'" class="wlf-mr-input"></div>'
  +'</div>'
  +'<div class="fg"><label>Trainer</label><input type="text" id="wlf-trainer" value="'+(e?e.trainer||'':p.trainer||'')+'"></div>'
  +'</div></div>'
  +(function(){
    const pid=e?e.id:'';
    const rvws=pid?(D.reviews||[]).filter(function(r){return r.profileId===pid;}).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}):[];
    const RCOL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'var(--mut)',loss:'#f87171',missed:'#a78bfa'};
    return'<div class="wlf-section">'
      +'<div class="wlf-sec-hdr"><div class="wlf-sec-num">3</div><span class="wlf-sec-title">Race Reviews</span></div>'
      +'<div class="wlf-sec-body">'
      +(rvws.length
        ? rvws.map(function(r){const rc=RCOL[r.result||'']||'var(--mut)';return'<div class="wlf-rvw-row">'
            +'<div class="wlf-rvw-meta"><span>'+r.date+'</span>'+(r.raceName?'<span class="wlf-rvw-dot">·</span><span>'+r.raceName+'</span>':'')+(r.odds?'<span class="wlf-rvw-dot">·</span><span style="color:var(--gld);font-weight:700;">'+r.odds+'</span>':'')+'<span class="wlf-rvw-badge" style="color:'+rc+';">'+(r.result||'').toUpperCase()+'</span></div>'
            +(r.notes?'<div class="wlf-rvw-notes">'+r.notes+'</div>':'')
            +'</div>';}).join('')
        : '<div style="font-size:12px;color:var(--mut);padding:8px 0;">No race reviews yet — use the <strong>Review</strong> button on the Today page after each run.</div>')
      +(pid?'<button onclick="openWLPostRaceReview(\''+pid+'\',\''+(e?(e.horse||'').replace(/'/g,"\\'"):'')+'\',\'\',\'\',\'\')" class="wlf-add-btn" style="margin-top:10px;">+ Add Race Review</button>':'')
      +'</div></div>';
  }())
  +'<div class="wlf-section">'
  +'<div class="wlf-sec-hdr"><div class="wlf-sec-num">4</div><span class="wlf-sec-title" style="color:var(--blu);">Trainer / Connections Intel</span></div>'
  +'<div class="wlf-sec-body"><div class="fg"><textarea id="wlf-intel" placeholder="Notes from trainer interviews, press, paddock chat..." style="min-height:64px;">'+(e?e.trainerIntel||'':'')+'</textarea></div></div>'
  +'</div>'
  +'<div class="wlf-section">'
  +'<div class="wlf-sec-hdr"><div class="wlf-sec-num">5</div><span class="wlf-sec-title" style="color:var(--ora);">Future Targets</span></div>'
  +'<div class="wlf-sec-body"><div id="wlf-targets-list"></div>'
  +'<button onclick="wlAddTargetRow()" class="wlf-add-btn">+ Add Target Race</button>'
  +'</div></div>'
  +'<div class="wlf-section">'
  +'<div class="wlf-sec-hdr"><div class="wlf-sec-num">6</div><span class="wlf-sec-title" style="color:var(--grn);">Conditions Profile</span></div>'
  +'<div class="wlf-sec-body" style="display:flex;flex-direction:column;gap:10px;">'
  +'<div class="fg"><label>Going Preferences</label><div id="wlf-going" style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;">'+goingHtml+'</div></div>'
  +(function(){
      var distHtml=DIST_GROUPS.map(function(grp){
        return'<div style="margin-bottom:6px;">'
          +'<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:4px;">'+grp.label+'</div>'
          +'<div style="display:flex;flex-wrap:wrap;gap:5px;">'
          +grp.opts.map(function(d){var sel=_wlDossier.distPrefs.includes(d);return'<button type="button" data-dist="'+d+'" onclick="wlToggleDist(this)" class="wlf-going-btn'+(sel?' on':'')+'">'+d+'</button>';}).join('')
          +'</div></div>';
      }).join('');
      return'<div class="fg"><label>Preferred Distance</label><div id="wlf-dist-btns" style="padding:4px 0;">'+distHtml+'</div></div>';
    }())
  +'<div class="fg"><label>Track Type</label><input type="text" id="wlf-track" placeholder="e.g. Straight" value="'+(e?e.trackPref||'':'')+'"></div>'
  +'<div class="fg"><label>Conditions Notes</label><textarea id="wlf-cond-notes" placeholder="Your evolving view on what suits this horse..." style="min-height:52px;">'+(e?e.conditionsNotes||e.notes||'':'')+'</textarea></div>'
  +'</div></div>'
  +'<div class="wlf-actions">'
  +'<button class="wlf-save-btn" onclick="saveWLEntry(\''+( e?e.id:'')+'\')">'
  +(e?'Save Profile':'Create Profile')+'</button>'
  +'<button class="wlf-cancel-btn" onclick="document.getElementById(\'wl-modal\').remove()">Cancel</button>'
  +'</div>'
  +'</div></div>';
  document.body.appendChild(modal);
  // full-screen — no backdrop click needed
  _renderObsList();_renderTargetsList();
  setTimeout(function(){const f=document.getElementById('wlf-horse');if(f)f.focus();},100);
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

function wlAddObsRow(){
  _wlDossier.obs.push({id:gid(),date:td(),raceName:'',going:'',result:'',notes:''});
  _renderObsList();
  setTimeout(function(){const el=document.getElementById('wlf-obs-list');if(el&&el.lastElementChild)el.lastElementChild.scrollIntoView({behavior:'smooth',block:'nearest'});},50);
}
function _wlDelObs(i){_wlDossier.obs.splice(i,1);_renderObsList();}

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
  // Build initial observation from inline fields (single entry in profile_observations)
  const ioDate=(document.getElementById('wlf-io-date')||{value:''}).value;
  const ioRace=(document.getElementById('wlf-io-race')||{value:''}).value.trim();
  const ioGoing=(document.getElementById('wlf-io-going')||{value:''}).value.trim();
  const ioResult=(document.getElementById('wlf-io-result')||{value:''}).value;
  const ioNotes=(document.getElementById('wlf-io-notes')||{value:''}).value.trim();
  const existingObsId=(old&&old.observations&&old.observations[0])?old.observations[0].id:gid();
  const initialObs=(ioDate||ioRace||ioNotes)?[{id:existingObsId,date:ioDate,raceName:ioRace,going:ioGoing,result:ioResult,notes:ioNotes}]:[];
  const raceDate=ioDate||(old?old.raceDate||'':'');
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
    reason:(document.getElementById('wlf-reason')||{value:'eye-catcher'}).value||'eye-catcher',
    reasonNote:(document.getElementById('wlf-reason-note')||{value:''}).value.trim(),
    unraced:!!(document.getElementById('wlf-unraced')&&document.getElementById('wlf-unraced').checked),
    trainerIntel:(document.getElementById('wlf-intel').value||'').trim(),
    observations:initialObs,
    targets:_wlDossier.targets.filter(function(t){return t.race;}),
    goingPrefs,
    distancePref:(_wlDossier.distPrefs||[]).join(', '),
    trackPref:(document.getElementById('wlf-track').value||'').trim(),
    conditionsNotes:(document.getElementById('wlf-cond-notes').value||'').trim(),
    raceDate,
    raceName:ioRace||'',
    notes:(document.getElementById('wlf-intel').value||'').trim(),
    createdAt:old?old.createdAt||Date.now():Date.now(),
    updatedAt:Date.now()
  };
  // Compute explicitly removed obs and target IDs so we can delete them from DB
  const old2=id?(D.watchlist||[]).find(x=>x.id===id):null;
  const removedObsIds=old2?(old2.observations||[]).filter(function(o){return !entry.observations.find(function(n){return n.id===o.id;});}).map(function(o){return o.id;}).filter(Boolean):[];
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
  // Explicitly delete removed observations and targets from DB (multi-device safe)
  if(removedObsIds.length) supaDeleteObsByIds(removedObsIds).catch(function(){});
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

  let h='<div class="wlp-page">';

  // NAV
  h+='<div class="wlp-nav">';
  h+='<div class="wlp-back" onclick="document.getElementById(\'wlp-modal\').remove()">← Profiles</div>';
  h+='<div class="wlp-brand">RACING <span class="wlp-brand-accent">PUZZLE</span></div>';
  h+='<div class="wlp-edit-btn" onclick="'+editFn+'">Edit</div>';
  h+='</div>';

  // HERO
  h+='<div class="wlp-hero">';
  h+='<div class="wlp-hero-bg">🐎</div>';
  h+='<div class="wlp-hero-top">';
  h+='<div>';
  h+='<div class="wlp-name-row"><span class="wlp-name">'+esc(e.horse)+'</span></div>';
  h+='<div><span class="wlp-reason-badge" style="background:'+reason.col+'20;border:1px solid '+reason.col+'40;color:'+reason.col+';display:inline-flex;align-items:center;gap:5px;">'+reason.svg+' '+reason.label+'</span></div>';
  h+='</div>';
  h+='<div class="wlp-or-box"><span class="wlp-or-label">OR</span>';
  h+=or?'<span class="wlp-or-value">'+or+'</span>':'<span class="wlp-or-na">—</span>';
  h+='</div>';
  h+='</div>';

  // Meta strip
  h+='<div class="wlp-meta">';
  h+='<div class="wlp-meta-cell"><span class="wlp-meta-label">Trainer</span><span class="wlp-meta-val">'+esc(e.trainer||'—')+'</span></div>';
  h+='<div class="wlp-meta-cell"><span class="wlp-meta-label">Race Reviews</span><span class="wlp-meta-val">'+horseReviews.length+' logged</span></div>';
  h+='<div class="wlp-meta-cell"><span class="wlp-meta-label">Targets</span><span class="wlp-meta-val">'+targets.length+' races</span></div>';
  h+='</div>';

  // Silks + stats
  h+='<div class="wlp-hero-body">';
  h+='<div class="wlp-silks">';
  h+='<svg width="64" height="74" viewBox="0 0 70 80" fill="none">';
  h+='<path d="M20 20 Q35 16 50 20 L54 62 Q35 66 16 62 Z" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>';
  h+='<path d="M20 20 Q10 24 6 38 Q10 42 16 40 L20 28 Z" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>';
  h+='<path d="M50 20 Q60 24 64 38 Q60 42 54 40 L50 28 Z" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>';
  h+='<ellipse cx="35" cy="12" rx="13" ry="6" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>';
  h+='</svg></div>';

  // ── Betting record for this horse ──
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

  h+='<div class="wlp-stats">';
  // My Rating
  const _si=function(svg){return '<span style="display:inline-flex;align-items:center;opacity:.7;margin-right:5px;">'+svg+'</span>';};
  const _svgs={
    star:   '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="10,2 12.5,7.5 18.5,8.2 14,12.5 15.3,18.5 10,15.5 4.7,18.5 6,12.5 1.5,8.2 7.5,7.5"/></svg>',
    trophy: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h8v7a4 4 0 0 1-8 0V2z"/><path d="M6 5H3a2 2 0 0 0 2 2"/><path d="M14 5h3a2 2 0 0 1-2 2"/><line x1="10" y1="13" x2="10" y2="16"/><line x1="7" y1="18" x2="13" y2="18"/></svg>',
    bet:    '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="16" height="11" rx="2"/><path d="M2 9h16"/><circle cx="6" cy="13" r="1" fill="currentColor" stroke="none"/></svg>',
    pnl:    '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="7"/><path d="M8 4h6a4 4 0 0 1 0 8h-1v4H9v-4H8a4 4 0 0 1 0-8z"/></svg>',
    roi:    '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 14 7 9 11 12 17 5"/><polyline points="14 5 17 5 17 8"/></svg>',
    cal:    '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v2M13 2v2"/></svg>',
    target: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/></svg>',
  };
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.star)+'My Rating</span>';
  h+=mr?'<span class="wlp-stat-val" style="color:var(--gld);">'+mr+'</span>':'<span class="wlp-stat-sm" style="color:var(--mut);">Not set</span>';
  h+='</div>';
  // OR Edge
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.trophy)+'OR Edge</span>';
  h+=edge!==null?'<span class="wlp-edge-badge" style="background:'+edgeCol+'20;color:'+edgeCol+';">'+(edge>0?'+':'')+edge+' pts</span>':'<span class="wlp-stat-sm" style="color:var(--mut);">—</span>';
  h+='</div>';
  // Betting record
  if(horseBets.length>0){
    h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.bet)+'Backed</span>';
    h+='<span class="wlp-stat-sm">'+horseWins.length+'/'+horseBets.length+' &nbsp;<span style="color:var(--mut);">SR '+horseSR.toFixed(0)+'%</span></span></div>';
    h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.pnl)+'P&amp;L</span>';
    h+='<span class="wlp-stat-sm" style="color:'+(horsePnl>=0?'#4ade80':'#f87171')+';">'+(horsePnl>=0?'+':'')+horsePnl.toFixed(2)+'</span></div>';
    h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.roi)+'ROI</span>';
    h+='<span class="wlp-stat-sm" style="color:'+(horseROI>=0?'#4ade80':'#f87171')+';">'+horseROI.toFixed(1)+'%</span></div>';
  } else {
    h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.bet)+'Backed</span>';
    h+='<span class="wlp-stat-sm" style="color:var(--mut);">Not yet</span></div>';
  }
  // Last Entry
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.cal)+'Last Entry</span>';
  h+='<span class="wlp-stat-sm">'+fmt(lastDate)+'</span></div>';
  // Next Target
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">'+_si(_svgs.target)+'Next Target</span>';
  if(nextTarget){const tw=(nextTarget.race||'').split(' ').slice(0,2).join(' ');h+='<span class="wlp-stat-sm" style="color:var(--gld);font-size:11px;">'+esc(tw)+'</span>';}
  else h+='<span class="wlp-stat-sm" style="color:var(--mut);">None set</span>';
  h+='</div>';
  h+='</div></div>'; // stats + hero-body

  // Edge bar
  if(edge!==null){
    const barW=Math.min(Math.abs(edge)/20*100,100);
    h+='<div class="wlp-edge-bar"><div class="wlp-edge-bar-track"><div class="wlp-edge-bar-fill" style="width:'+barW+'%;background:'+edgeCol+';"></div></div></div>';
  }
  h+='</div>'; // hero

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
      // Check if a review already exists for this target — match by race name (case-insensitive) since dates may differ
      const raceLower=(t.race||'').toLowerCase().trim();
      const alreadyReviewed=(D.reviews||[]).some(function(r){
        if(r.profileId!==e.id)return false;
        const rn=(r.raceName||'').toLowerCase().trim();
        // Match if race name contains the target name or vice versa (handles partial/abbreviated names)
        return rn===raceLower||rn.includes(raceLower)||raceLower.includes(rn)||(t.date&&r.date===t.date);
      });
      const _tgtIcon=isPast
        ?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
        :'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
      h+='<div class="wlp-target-item"><span class="wlp-target-icon">'+_tgtIcon+'</span>';
      h+='<div style="flex:1;min-width:0;"><div class="wlp-target-race">'+esc(t.race||'—')+'</div><div class="wlp-target-meta">'+esc(t.track||'—')+'</div></div>';
      h+='<div style="text-align:right;flex-shrink:0;">';
      h+='<div class="wlp-target-date" style="color:'+(isPast?'var(--mut)':'var(--gld)')+';">'+(t.date?fdate(t.date):'TBC')+'</div>';
      if(t.condition)h+='<div class="wlp-target-cond">'+esc(t.condition)+'</div>';
      h+='<div style="display:flex;gap:4px;justify-content:flex-end;margin-top:5px;">';
      if(alreadyReviewed){
        h+='<div style="font-size:10px;color:#4ade80;">✓ Reviewed</div>';
      }else{
        const rv='openWLPostRaceReview(\''+e.id+'\',\''+esc(e.horse)+'\',\''+esc(t.track||'')+'\',\'\',\''+esc(t.race||'')+'\',\'\',\'\',\'\')';
        h+='<button onclick="'+rv+'" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;font-size:10px;font-weight:700;letter-spacing:.05em;background:rgba(251,146,60,.15);border:1px solid rgba(251,146,60,.4);color:#fb923c;border-radius:6px;cursor:pointer;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Review</button>';
      }
      h+='<button onclick="wlDeleteTarget(\''+e.id+'\',\''+esc(t.id||t.race)+'\')" style="padding:3px 7px;font-size:10px;font-weight:700;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;border-radius:6px;cursor:pointer;" title="Remove target">✕</button>';
      h+='</div>';
      h+='</div></div>';
    });
  }else{
    h+='<div class="wlp-target-empty">No targets yet</div>';
  }
  h+='</div>';


  // SECTION 4b: PENDING REVIEWS (unsaved race data awaiting write-up)
  const pendingReviews=((D.pendingReviews||[]).filter(function(p){
    if(p.profileId!==e.id)return false;
    // Only show if not since been reviewed
    const reviewed=(D.reviews||[]).some(function(r){return r.profileId===e.id&&r.date===p.date;});
    return!reviewed;
  })).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
  if(pendingReviews.length){
    h+='<div class="wlp-section" style="border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.04);">';
    h+='<div class="wlp-section-hdr">'
      +'<div class="wlp-section-left">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        +'<span class="wlp-section-title" style="color:#f59e0b;">Awaiting Review</span>'
      +'</div>'
    +'</div>';
    pendingReviews.forEach(function(p){
      const RCOL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'#3a3a5c',missed:'#a78bfa'};
      const rc=RCOL[p.result]||'';
      h+='<div style="padding:11px 13px;border-top:1px solid rgba(245,158,11,.15);">'
        +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:#fff;">'+(p.raceName||p.course||'Race')+'</div>'
            +'<div style="font-size:11px;color:var(--mut);margin-top:2px;">'
              +[p.date?_wlpFmt(p.date):'',p.course,p.raceDist,p.raceGoing].filter(Boolean).join(' · ')
            +'</div>'
            +(p.position?'<div style="font-size:11px;color:var(--txt);margin-top:2px;">Finished: <strong>'+esc(p.position)+'</strong></div>':'')
          +'</div>'
          +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">'
            +(p.result&&rc?'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:'+rc+'20;border:1px solid '+rc+'40;color:'+rc+';">'+p.result+'</span>':'')
            +'<button onclick="wlCompletePendingReview(\''+p.id+'\')" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:7px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.1);color:#f59e0b;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;white-space:nowrap;">'
              +'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
              +'Write Up'
            +'</button>'
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
      const vm=VERDICT_META[r.verdict]||null;
      const rc=RESULT_COL[r.result]||'#3a3a5c';
      h+='<div style="padding:11px 13px;border-bottom:1px solid var(--bdr);">';
      h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">';
      h+='<div style="flex:1;min-width:0;">';
      h+='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(r.raceName||r.course||'Race')+'</div>';
      h+='<div style="font-size:11px;color:var(--mut);margin-top:1px;">'+[r.date?_wlpFmt(r.date):'',r.course||'',r.distance||''].filter(Boolean).join(' · ')+'</div>';
      if(r.odds)h+='<div style="font-size:11px;font-weight:700;color:var(--gld);margin-top:2px;">'+r.odds+'</div>';
      h+='</div>';
      h+='<div style="display:flex;gap:5px;align-items:center;flex-shrink:0;">';
      if(r.result)h+='<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:'+rc+'20;border:1px solid '+rc+'40;color:'+rc+';">'+r.result+'</span>';
      if(vm)h+='<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:1px;padding:2px 8px;border-radius:5px;background:'+vm.col+'15;border:1px solid '+vm.col+'30;color:'+vm.col+';">'+vm.label+'</span>';
      h+='</div></div>';
      const chips=[];
      if(r.position)chips.push('Pos: '+r.position);
      if(r.beatenDistance)chips.push(r.beatenDistance);
      if(r.mrAdjustment)chips.push((r.mrAdjustment>0?'+':'')+r.mrAdjustment+' MR');
      if(r.goingConfirmed)chips.push('Going: '+r.goingConfirmed);
      if(r.backNextTime)chips.push('Back: '+r.backNextTime);
      if(chips.length)h+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">'+chips.map(function(c){return'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:var(--mut);">'+c+'</span>';}).join('')+'</div>';
      if(r.notes)h+='<div style="font-size:12px;color:var(--mut);font-style:italic;line-height:1.5;">'+esc(r.notes)+'</div>';
      h+='<div style="margin-top:8px;display:flex;gap:6px;">'
        +'<button onclick="openWLEditReview(\''+r.id+'\')" style="display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:6px;border:1px solid var(--bdr);background:transparent;color:var(--mut);cursor:pointer;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Edit</button>'
        +'<button onclick="wlDeleteReview(\''+r.id+'\',\''+e.id+'\')" style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:6px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#f87171;cursor:pointer;">Delete ✕</button>'
        +'</div>';
      h+='</div>';
    });
  } else {
    h+='<div style="padding:14px 13px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;color:var(--mut);font-style:italic;text-align:center;">No reviews yet — tap Add after a run</div>';
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

  h+='<div style="height:30px;"></div>';
  h+='</div>'; // page
  return h;
}

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
    html+='<div class="wl-day-sec-lbl wl-day-sec-lbl-ora">🎯 Target Races</div>';
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
    html+='<div class="wl-day-sec-lbl wl-day-sec-lbl-grn"'+(dayTargets.length?' style="margin-top:10px;"':'')+'>📋 Observations</div>';
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
  {id:'running-today', label:'🏇 Running Today', title:'Horses from your profiler confirmed in today\'s racecards'},
  {id:'no-obs',        label:'👁 No Observations', title:'Profiles with no observations logged yet'},
  {id:'past-target',   label:'📅 Past Target',      title:'Target race dates that have passed — mark if they ran'},
  {id:'edge',          label:'📈 Edge',              title:'Your rating is above the official rating — potential value'},
];

function setWLFilter(id){
  _wlFilter=(_wlFilter===id)?null:id; // toggle off if already active
  renderWLList();
}

function _applyWLFilter(entries){
  if(!_wlFilter) return entries;
  const today=td();
  if(_wlFilter==='no-obs'){
    return entries.filter(function(e){return!(e.observations&&e.observations.length);});
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
      btn.textContent=f.label;
      btn.style.cssText='font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:14px;cursor:pointer;white-space:nowrap;transition:all .12s;'
        +(on?'background:var(--navy);color:#fff;border:1px solid var(--navy);':'background:var(--sur);color:var(--mut);border:1px solid var(--bdr);');
      btn.addEventListener('click',function(){setWLFilter(f.id);});
      filterBar.appendChild(btn);
    });
  }

  // Apply active filter
  entries=_applyWLFilter(entries);

  if(!entries.length){
    const emptyMsg=_wlFilter
      ? 'No profiles match the <strong>'+WL_FILTERS.find(function(f){return f.id===_wlFilter;}).label+'</strong> filter.'
      : (search?'No profiles match "'+search+'"':'No profiles yet — tap + to add your first horse.');
    el.innerHTML='<div class="wll-empty">'+emptyMsg+'</div>';
    return;
  }

  const REASON_ORDER=['form-study','eye-catcher','trainer-intel','tip-source','future-target'];
  const REASON_META={
    'eye-catcher': {emoji:'🔭',label:'Eye Catcher',  labelPlural:'Eye Catchers',  col:CLR_WATCH},
    'future-target':{emoji:'📰',label:'Future Target',labelPlural:'Future Targets',col:'#fb923c'},
    'trainer-intel':{emoji:'🗣',label:'Trainer Intel',labelPlural:'Trainer Intel', col:'#60a5fa'},
    'form-study':   {emoji:'📊',label:'Form Study',   labelPlural:'Form Study',    col:'#ef4444'},
    'tip-source':   {emoji:'💡',label:'Tip / Source', labelPlural:'Tips & Sources',col:'#eab308'},
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
      +'<span style="font-family:var(--font);font-size:14px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#fff;flex:1;">'
        +rm.emoji+' '+rm.labelPlural
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
      if(obs.length)subParts.push(obs.length+' obs');
      if(targets.length)subParts.push(targets.length+' target'+(targets.length>1?'s':''));
      if(!obs.length&&!targets.length)subParts.push('No obs or targets yet');

      html+='<div class="wll-row" style="border-left:none;border-bottom:1px solid var(--bdr);" data-wl-id="'+e.id+'">'
        +'<div class="wll-silks">'+_silkSVG(e.horse||'?',18)+'</div>'
        +'<div class="wll-main">'
          +'<div class="wll-name">'+(e.horse||'Unknown')+(e.needsReview?'<span class="wll-review-badge">REVIEW</span>':'')+'</div>'
          +'<div class="wll-sub">'+subParts.join(' · ')+'</div>'
          +'<div class="wll-tag" style="background:'+rm.col+'14;border:1px solid '+rm.col+'28;color:'+rm.col+';">'+rm.emoji+' '+rm.label+'</div>'
        +'</div>'
        +'<div class="wll-right">'
          +'<div class="wll-rating"><div class="wll-rating-lbl">OR</div><div class="wll-rating-val" style="color:'+(or?'var(--gld2)':'var(--mut)')+';">'+(or?String(or):'—')+'</div></div>'
          +'<div class="wll-rating"><div class="wll-rating-lbl">MR</div><div class="wll-rating-val" style="color:'+(mr?'var(--gld)':'var(--mut)')+';">'+(mr?String(mr):'—')+'</div></div>'
        +'</div>'
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
  const RMAP={'eye-catcher':{emoji:'🔭',col:CLR_WATCH,label:'Eye Catcher'},'future-target':{emoji:'📰',col:'#fb923c',label:'Future Target'},'trainer-intel':{emoji:'🗣',col:'#60a5fa',label:'Trainer Intel'},'form-study':{emoji:'📊',col:'#ef4444',label:'Form Study'},'tip-source':{emoji:'💡',col:'#eab308',label:'Tip / Source'}};
  const rm=RMAP[e.reason||'eye-catcher']||RMAP['eye-catcher'];
  const obs=e.observations||[];
  const targets=e.targets||[];
  const or=parseFloat(e.currentRating)||null;
  const mr=parseFloat(e.myRating)||null;
  const lastObs=obs.length?obs.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');})[0]:null;
  const daysAgo=lastObs&&lastObs.date?(function(){const d=new Date(lastObs.date+'T00:00:00');const diff=Math.round((new Date()-d)/(1000*60*60*24));return diff===0?'Today':diff===1?'Yesterday':diff>0?diff+'d ago':'Upcoming';}()):'';
  const subParts=[];
  if(e.trainer)subParts.push(e.trainer);
  if(obs.length)subParts.push(obs.length+' obs');
  if(targets.length)subParts.push(targets.length+' target'+(targets.length>1?'s':''));
  return'<div class="wll-row" style="border-left-color:'+rm.col+';" data-wl-id="'+e.id+'">'
    +'<div class="wll-silks">'+_silkSVG(e.horse||'?',18)+'</div>'
    +'<div class="wll-main">'
      +'<div class="wll-name">'+(e.horse||'Unknown')+'</div>'
      +'<div class="wll-sub">'+subParts.join(' · ')+(daysAgo?' · '+daysAgo:'')+'</div>'
      +'<div class="wll-tag" style="background:'+rm.col+'14;border:1px solid '+rm.col+'28;color:'+rm.col+';">'+rm.emoji+' '+rm.label+'</div>'
    +'</div>'
    +'<div class="wll-right">'
      +'<div class="wll-rating"><div class="wll-rating-lbl">OR</div><div class="wll-rating-val" style="color:'+(or?'var(--gld2)':'var(--mut)')+';">'+(or?String(or):'—')+'</div></div>'
      +'<div class="wll-rating"><div class="wll-rating-lbl">MR</div><div class="wll-rating-val" style="color:'+(mr?'var(--gld)':'var(--mut)')+';">'+(mr?String(mr):'—')+'</div></div>'
    +'</div>'
  +'</div>';
}




// ── POST-RACE REVIEW SHEET ──
function openWLPostRaceReview(profileId,horse,course,time,raceName,raceDist,raceGoing,raceClass){
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
    +'<div class="g2">'
      +'<div class="fg"><label>Date</label><input type="date" id="rvw-date" value="'+td()+'"></div>'
      +'<div class="fg"><label>Course</label><input type="text" id="rvw-course" value="'+(course||'')+'" placeholder="e.g. Haydock"></div>'
    +'</div>'
    +'<div class="fg"><label>Distance</label><input type="text" id="rvw-dist" value="'+(raceDist||'')+'" placeholder="e.g. 1m2f"></div>'
    +'<div class="fg"><label>Result</label><div class="rvw-btn-group">'
    +['win','place','unplaced','nr'].map(function(r){const cols={win:'var(--grn)',place:'var(--gld)',unplaced:'var(--red)',nr:'var(--mut)'};return'<button data-result="'+r+'" data-grp="result" class="rvw-btn" style="--rvw-col:'+cols[r]+'" onclick="wlRvwToggle(this)">'+r+'</button>';}).join('')
    +'</div></div>'
    +'<div class="g2">'
      +'<div class="fg"><label>Finish Position</label><input type="text" id="rvw-pos" placeholder="e.g. 3rd"></div>'
      +'<div class="fg" id="rvw-beaten-row"><label>Beaten Distance</label><input type="text" id="rvw-beaten" placeholder="e.g. 2.5L"></div>'
    +'</div>'
    +'<div class="fg"><label>Verdict</label><div class="rvw-btn-group">'
    +[{k:'upgrade',col:'var(--grn)',lbl:'Upgrade ↑'},{k:'hold',col:'var(--blu)',lbl:'Hold →'},{k:'downgrade',col:'var(--red)',lbl:'Downgrade ↓'}].map(function(v){return'<button data-verdict="'+v.k+'" data-grp="verdict" class="rvw-btn" style="--rvw-col:'+v.col+'" onclick="wlRvwToggle(this)">'+v.lbl+'</button>';}).join('')
    +'</div></div>'
    +(currentMR?'<div class="fg"><label>MR Adjustment <span style="color:var(--mut);font-weight:400;">(current: '+currentMR+')</span></label><input type="number" id="rvw-mr-adj" placeholder="e.g. 5 or -3"></div>':'<input type="hidden" id="rvw-mr-adj" value="0">')
    +'<div class="fg"><label>Going'+(raceGoing?' <span style="color:var(--mut);font-weight:400;font-size:11px;">('+raceGoing+')</span>':'')+'</label><div class="rvw-btn-group">'
    +[{k:'confirmed',lbl:'✓ Confirmed'},{k:'mixed',lbl:'~ Mixed'},{k:'against',lbl:'✗ Against'}].map(function(g){return'<button data-going="'+g.k+'" data-grp="going" class="rvw-btn" style="--rvw-col:var(--txt)" onclick="wlRvwToggle(this)">'+g.lbl+'</button>';}).join('')
    +'</div></div>'
    +'<div class="fg"><label>Back Next Time?</label><div class="rvw-btn-group">'
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
    const beatenRow=document.getElementById('rvw-beaten-row');
    if(result==='win'){
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
  // Build a descriptive raceName from distance + class for display purposes
  const raceName=rvwDist||'';

  const review={
    id:gid(),profileId:profileId,
    date:date,raceName:raceName,course:rvwCourse,
    distance:rvwDist,going:(document.getElementById('rvw-going-prefill')||{value:''}).value,
    result:_rvwGet('result'),
    position:(document.getElementById('rvw-pos').value||'').trim(),
    beatenDistance:(document.getElementById('rvw-beaten').value||'').trim(),
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
  const REASONS=[{value:'eye-catcher',emoji:'🔭',label:'Eye Catcher'},{value:'future-target',emoji:'📰',label:'Future Target'},{value:'trainer-intel',emoji:'🗣',label:'Trainer Intel'},{value:'form-study',emoji:'📊',label:'Form Study'},{value:'tip-source',emoji:'💡',label:'Tip / Source'}];
  const curReason=e?e.reason||'eye-catcher':'eye-catcher';
  const REASON_COLS={'eye-catcher':CLR_WATCH,'future-target':'#fb923c','trainer-intel':'#60a5fa','form-study':'#ef4444','tip-source':'#eab308'};
  const reasonHtml=REASONS.map(function(r){const sel=r.value===curReason;return'<button type="button" data-reason="'+r.value+'" onclick="wlSelectReason(this)" class="wlf-reason-btn'+(sel?' on':'')+'"><span class="wlf-reason-ico">'+r.emoji+'</span><span class="wlf-reason-lbl">'+r.label+'</span></button>';}).join('');
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
  +'<div class="wlf-obs-sub-hdr">Initial Race</div>'
  +(function(){
    const io=(_wlDossier.obs&&_wlDossier.obs[0])||{};
    return'<div class="g2" style="margin-bottom:8px;">'
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
      +'<div class="fg"><label>What you saw</label><textarea id="wlf-io-notes" placeholder="Describe what caught your eye in this race…" style="min-height:60px;">'+(io.notes||'')+'</textarea></div>';
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
    const RCOL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'var(--mut)',loss:'#f87171'};
    return'<div class="wlf-section">'
      +'<div class="wlf-sec-hdr"><div class="wlf-sec-num">3</div><span class="wlf-sec-title">Race Reviews</span></div>'
      +'<div class="wlf-sec-body">'
      +(rvws.length
        ? rvws.map(function(r){const rc=RCOL[r.result||'']||'var(--mut)';return'<div class="wlf-rvw-row">'
            +'<div class="wlf-rvw-meta"><span>'+r.date+'</span>'+(r.raceName?'<span class="wlf-rvw-dot">·</span><span>'+r.raceName+'</span>':'')+'<span class="wlf-rvw-badge" style="color:'+rc+';">'+(r.result||'').toUpperCase()+'</span></div>'
            +(r.notes?'<div class="wlf-rvw-notes">'+r.notes+'</div>':'')
            +'</div>';}).join('')
        : '<div style="font-size:12px;color:var(--mut);padding:8px 0;">No race reviews yet — use the <strong>Review ✍️</strong> button on the Today page after each run.</div>')
      +(pid?'<button onclick="openWLPostRaceReview(\''+pid+'\',\''+(e?e.horse:'')+'\',\'\',\'\',\'\')" class="wlf-add-btn" style="margin-top:10px;">+ Add Race Review</button>':'')
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
    b.className='wlf-reason-btn'+(b.getAttribute('data-reason')===val?' on':'');
  });
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
  D.watchlist=wl;save();
  // Explicitly delete removed observations and targets from DB (multi-device safe)
  if(removedObsIds.length) supaDeleteObsByIds(removedObsIds).catch(function(){});
  if(removedTargetIds.length) supaDeleteTargetsByIds(removedTargetIds).catch(function(){});
  document.getElementById('wl-modal').remove();
  renderWatchlist();
  if(entry.raceDate&&wlView==='cal'){wlCalDate=new Date(entry.raceDate+'T00:00:00');renderWLCal();setTimeout(function(){wlSelectDay(entry.raceDate);},100);}
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
.wlp-cond-icon { font-size: 16px; opacity: .7; }
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
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
    'eye-catcher':  {emoji:'🔭',label:'Eye Catcher',  col:CLR_WATCH},
    'future-target':{emoji:'📰',label:'Future Target', col:'#fb923c'},
    'trainer-intel':{emoji:'🗣',label:'Trainer Intel', col:'#60a5fa'},
    'form-study':   {emoji:'📊',label:'Form Study',    col:'#ef4444'},
    'tip-source':   {emoji:'💡',label:'Tip / Source',  col:'#eab308'},
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
    {icon:'💧',label:'Going',    value:(e.goingPrefs&&e.goingPrefs.length)?e.goingPrefs[0]:'Any',   color:(e.goingPrefs&&e.goingPrefs.length)?'#4ade80':'#3a3a5c'},
    {icon:'📏',label:'Distance', value:e.distancePref||'—',  color:e.distancePref?'#38bdf8':'#3a3a5c'},
    {icon:'⭕',label:'Track',    value:e.trackPref||'—',     color:e.trackPref?'#8b5cf6':'#3a3a5c'},
  ];

  const editFn="document.getElementById('wlp-modal').remove();openWLForm('"+e.id+"')";

  let h='<div class="wlp-page">';

  // NAV
  h+='<div class="wlp-nav">';
  h+='<div class="wlp-back" onclick="document.getElementById(\'wlp-modal\').remove()">← Profiles</div>';
  h+='<div class="wlp-brand">RACING <span class="wlp-brand-accent">PUZZLE</span></div>';
  h+='<div class="wlp-edit-btn" onclick="'+editFn+'">Edit ✏️</div>';
  h+='</div>';

  // HERO
  h+='<div class="wlp-hero">';
  h+='<div class="wlp-hero-bg">🐎</div>';
  h+='<div class="wlp-hero-top">';
  h+='<div>';
  h+='<div class="wlp-name-row"><span class="wlp-name">'+esc(e.horse)+'</span></div>';
  h+='<div><span class="wlp-reason-badge" style="background:'+reason.col+'20;border:1px solid '+reason.col+'40;color:'+reason.col+';">'+reason.emoji+' '+reason.label+'</span></div>';
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

  h+='<div class="wlp-stats">';
  // My Rating
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">⭐ My Rating</span>';
  h+=mr?'<span class="wlp-stat-val" style="color:var(--gld);">'+mr+'</span>':'<span class="wlp-stat-sm" style="color:var(--mut);">Not set</span>';
  h+='</div>';
  // OR Edge
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">🏆 OR Edge</span>';
  h+=edge!==null?'<span class="wlp-edge-badge" style="background:'+edgeCol+'20;color:'+edgeCol+';">'+(edge>0?'+':'')+edge+' pts</span>':'<span class="wlp-stat-sm" style="color:var(--mut);">—</span>';
  h+='</div>';
  // Last Entry
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">📅 Last Entry</span>';
  h+='<span class="wlp-stat-sm">'+fmt(lastDate)+'</span></div>';
  // Next Target
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">🎯 Next Target</span>';
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

  // SECTION 1: WHY LOGGED
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">1</div><span class="wlp-section-title">Why Logged</span></div>';
  h+='<span class="wlp-section-action" onclick="'+editFn+'">Edit ✏️</span></div>';
  h+='<div class="wlp-why-grid">';
  WHY_ORDER.forEach(function(rid){
    const r=REASONS[rid];const isActive=(e.reason||'eye-catcher')===rid;
    h+='<div class="wlp-why-btn'+(isActive?' wlp-why-active':'')+'">';
    if(isActive)h+='<div class="wlp-why-check">✓</div>';
    h+='<span class="wlp-why-icon">'+r.emoji+'</span><span class="wlp-why-label">'+r.label+'</span></div>';
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

  // Section 3: Race Reviews (horse_reviews only)
  const reviewAddFn="openWLPostRaceReview('"+e.id+"','"+e.horse.replace(/'/g,"\\'")+"','','','')";
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr" style="padding:10px 12px;"><div class="wlp-section-left"><div class="wlp-section-num">3</div><span class="wlp-section-title" style="font-size:11px;">Race Reviews</span></div>';
  h+='<span class="wlp-section-action" style="font-size:11px;" onclick="'+reviewAddFn+'">Add +</span></div>';
  if(latestReview){
    const rc=RESULT_COLS[latestReview.result||'']||'#888';
    h+='<div class="wlp-notepad"><div class="wlp-notepad-meta">';
    h+='<span>'+fmt(latestReview.date)+'</span>';
    if(latestReview.course)h+='<span class="wlp-notepad-dot">·</span><span>'+esc(latestReview.course)+'</span>';
    if(latestReview.distance)h+='<span class="wlp-notepad-dot">·</span><span>'+esc(latestReview.distance)+'</span>';
    if(latestReview.result)h+='<span class="wlp-result-badge" style="background:'+rc+'22;color:'+rc+';">'+latestReview.result.toUpperCase()+'</span>';
    h+='</div><div class="wlp-notepad-text">'+esc(latestReview.notes||'No notes')+'</div></div>';
  }else{
    h+='<div class="wlp-notepad-empty">No race reviews yet<br>Tap Add after each run</div>';
  }
  if(horseReviews.length>1)h+='<div class="wlp-obs-count">📋 '+horseReviews.length+' reviews ›</div>';
  h+='</div>';

  // Section 4: Targets
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr" style="padding:10px 12px;"><div class="wlp-section-left"><div class="wlp-section-num">4</div><span class="wlp-section-title" style="font-size:11px;">Targets</span></div>';
  h+='<span class="wlp-section-action" style="font-size:16px;" onclick="'+editFn+'">+</span></div>';
  if(targets.length){
    targets.forEach(function(t){
      h+='<div class="wlp-target-item"><span class="wlp-target-icon">🏇</span>';
      h+='<div style="flex:1;min-width:0;"><div class="wlp-target-race">'+esc(t.race||'—')+'</div><div class="wlp-target-meta">'+esc(t.track||'—')+'</div></div>';
      h+='<div style="text-align:right;flex-shrink:0;"><div class="wlp-target-date">'+(t.date?fmt(t.date):'TBC')+'</div>';
      if(t.condition)h+='<div class="wlp-target-cond">'+esc(t.condition)+'</div>';
      h+='</div></div>';
    });
  }else{
    h+='<div class="wlp-target-empty">No targets yet</div>';
  }
  h+='</div>';


  // SECTION 5: REVIEWS
  const profileReviews=(D.reviews||[]).filter(function(r){return r.profileId===e.id;}).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
  const VERDICT_META={upgrade:{col:'#4ade80',label:'Upgrade ↑'},hold:{col:'#60a5fa',label:'Hold →'},downgrade:{col:'#f87171',label:'Downgrade ↓'}};
  const RESULT_COL={win:'#4ade80',place:CLR_WATCH,unplaced:'#f87171',nr:'#3a3a5c'};
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">5</div><span class="wlp-section-title">Race Reviews</span></div>';
  h+='<span class="wlp-section-action" onclick="openWLPostRaceReview(\''+e.id+'\',\''+esc(e.horse)+'\',\'\',\'\',\'\')">Add +</span></div>';
  if(profileReviews.length){
    profileReviews.forEach(function(r){
      const vm=VERDICT_META[r.verdict]||null;
      const rc=RESULT_COL[r.result]||'#3a3a5c';
      h+='<div style="padding:11px 13px;border-bottom:1px solid var(--bdr);">';
      h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">';
      h+='<div><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:#fff;">'+(r.raceName||r.course||'Race')+'</div>';
      h+='<div style="font-size:11px;color:var(--mut);">'+[r.date?_wlpFmt(r.date):'',r.course].filter(Boolean).join(' · ')+'</div></div>';
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
      h+='</div>';
    });
  } else {
    h+='<div style="padding:14px 13px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;color:var(--mut);font-style:italic;text-align:center;">No reviews yet — tap Add after a run</div>';
  }
  h+='</div>';

  // SECTION 6: CONDITIONS
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">5</div><span class="wlp-section-title">Conditions Profile</span></div></div>';
  h+='<div class="wlp-cond-grid" style="grid-template-columns:repeat('+condItems.length+',1fr);border-bottom:1px solid var(--bdr);">';
  condItems.forEach(function(c){
    const isDash=c.value==='—'||c.value==='Any';
    h+='<div class="wlp-cond-cell"><span class="wlp-cond-icon">'+c.icon+'</span><span class="wlp-cond-label">'+c.label+'</span><span class="wlp-cond-val" style="color:'+(isDash?'#3a3a5c':c.color)+';">'+esc(c.value)+'</span></div>';
  });
  h+='</div>';
  const intelText=e.trainerIntel||e.conditionsNotes||'';
  if(intelText){
    h+='<div class="wlp-intel"><span class="wlp-intel-icon">🎓</span><div class="wlp-intel-text">'+esc(intelText)+'</div></div>';
  }
  h+='</div>';

  h+='<div style="height:30px;"></div>';
  h+='</div>'; // page
  return h;
}

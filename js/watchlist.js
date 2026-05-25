// ─── WATCHLIST / PUZZLE PROFILER ───

let wlView='cal', wlCalDate=new Date();
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
  if(edge>0) return '<span style="font-family:monospace;font-size:10px;font-weight:700;color:#4ade80;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25);padding:1px 6px;border-radius:4px;margin-left:4px;">▲ +'+edge+' edge</span>';
  if(edge<0) return '<span style="font-family:monospace;font-size:10px;font-weight:700;color:#f87171;background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);padding:1px 6px;border-radius:4px;margin-left:4px;">▼ '+edge+' edge</span>';
  return '<span style="font-family:monospace;font-size:10px;color:var(--mut);background:var(--sur2);border:1px solid var(--bdr);padding:1px 6px;border-radius:4px;margin-left:4px;">→ on mark</span>';
}

function orSummaryLine(entry){
  const mr=parseFloat(entry.myRating);
  const or=parseFloat(entry.currentRating);
  if(!mr&&!or) return '';
  let parts=[];
  if(mr) parts.push('<span style="color:var(--gld);font-weight:700;">MR '+mr+'</span>');
  if(or) parts.push('<span style="color:var(--mut);">OR '+or+'</span>');
  return '<div style="font-family:monospace;font-size:11px;display:flex;align-items:center;gap:4px;margin-top:3px;">'+parts.join('<span style="color:var(--mut);margin:0 2px;">·</span>')+orEdgeBadge(entry)+'</div>';
}



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
  let html=dayNames.map(d=>'<div style="color:var(--mut);font-size:9px;padding:3px 0;font-weight:700;">'+d+'</div>').join('');
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
    const dotCol=dayTargets.length&&!entries.length&&!dayObs.length?'#fb923c':dayObs.length&&!entries.length&&!dayTargets.length?'#4ade80':'#e879f9';
    const fixtureBar=hasFixture?'<div style="height:3px;border-radius:2px;background:'+fixtures[0].colour+';margin:1px 2px 0;" title="'+fixtures[0].name+'"></div>':'';
    // Show up to 3 coloured dots for different event types
    const dots=[];
    if(entries.length)dots.push('<div style="width:5px;height:5px;border-radius:50%;background:#e879f9;display:inline-block;margin:0 1px;"></div>');
    if(dayTargets.length)dots.push('<div style="width:5px;height:5px;border-radius:50%;background:#fb923c;display:inline-block;margin:0 1px;"></div>');
    if(dayObs.length)dots.push('<div style="width:5px;height:5px;border-radius:50%;background:#4ade80;display:inline-block;margin:0 1px;"></div>');
    html+='<div onclick="wlSelectDay(\''+dateStr+'\')" style="cursor:pointer;padding:5px 2px;border-radius:6px;'+(isToday?'background:rgba(232,121,249,.15);':'')+'text-align:center;">'
      +'<div style="font-size:11px;color:'+(isToday?'#e879f9':hasBet?'var(--txt)':'var(--mut)')+(hasBet?';font-weight:700':';font-weight:400')+';">'+d+'</div>'
      +(hasBet?'<div style="display:flex;justify-content:center;margin:1px 0 0;">'+dots.join('')+'</div>':'<div style="height:7px;"></div>')+fixtureBar
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
  const dayLabel='<div style="font-family:monospace;font-size:9px;color:rgba(232,121,249,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;">'+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})+'</div>';
  let html=fixtureBanner+dayLabel;
  // Target race cards
  if(dayTargets.length){
    html+='<div style="font-family:monospace;font-size:9px;color:rgba(251,146,60,.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">🎯 Target Races</div>';
    html+=dayTargets.map(function(d){
      const t=d.target;
      return'<div data-wl-id="'+d.horseId+'" style="cursor:pointer;border-left:3px solid #fb923c;margin-bottom:8px;padding:10px 11px;background:rgba(251,146,60,.05);border-radius:0 8px 8px 0;">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-weight:700;font-size:14px;margin-bottom:2px;">'+d.horse+'</div>'
            +orSummaryLine(d)
            +(d.trainer?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">'+d.trainer+'</div>':'')
            +'<div style="font-size:12px;color:#fb923c;font-weight:600;">'+t.race+(t.track?' · '+t.track:'')+'</div>'
            +(t.condition?'<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:2px;">'+t.condition+'</div>':'')
          +'</div>'
        +'</div>'
      +'</div>';
    }).join('');
  }
  // Observations
  if(dayObs.length){
    html+='<div style="font-family:monospace;font-size:9px;color:rgba(74,222,128,.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;'+(dayTargets.length?'margin-top:10px;':'')+'">📋 Observations</div>';
    html+=dayObs.map(function(d){
      const o=d.obs;
      const resultCol=o.result&&o.result.toLowerCase().includes('win')?'#4ade80':o.result?'#fb923c':'var(--mut)';
      return'<div data-wl-id="'+d.horseId+'" style="cursor:pointer;border-left:3px solid #4ade80;margin-bottom:8px;padding:10px 11px;background:rgba(74,222,128,.04);border-radius:0 8px 8px 0;">'
        +'<div style="font-weight:700;font-size:14px;margin-bottom:3px;">'+d.horse+'</div>'
        +(o.raceName?'<div style="font-size:12px;color:var(--mut);margin-bottom:3px;">'+o.raceName+'</div>':'')
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">'
          +(o.result?'<span style="font-family:monospace;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:'+resultCol+';">'+o.result+'</span>':'')
          +(o.going?'<span style="font-family:monospace;font-size:10px;color:var(--mut);padding:1px 6px;border-radius:4px;background:var(--sur2);border:1px solid var(--bdr);">'+o.going+'</span>':'')
        +'</div>'
        +(o.notes?'<div style="font-size:12px;color:var(--mut);font-style:italic;line-height:1.45;">'+o.notes+'</div>':'')
      +'</div>';
    }).join('');
  }
  // Regular watchlist entries
  if(entries.length){
    if(dayTargets.length||dayObs.length)html+='<div style="font-family:monospace;font-size:9px;color:rgba(232,121,249,.5);text-transform:uppercase;letter-spacing:.1em;margin:10px 0 6px;">Puzzle Profiler</div>';
    html+=entries.map(function(e){return renderWLEntry(e);}).join('');
  }
  if(!entries.length&&!dayTargets.length&&!dayObs.length){
    html+='<div style="color:var(--mut);font-style:italic;font-size:13px;padding:8px 0;">No targets on '+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'.<br><span style="font-size:12px;">Tap + to add one.</span></div>';
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

// ── Silk colour palette — deterministic from horse name ──
function _silkColors(str){
  let h=0;for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;}
  const PALETTES=[
    {body:'#7c3aed',accent:'#f59e0b'},{body:'#ef4444',accent:'#ffffff'},
    {body:'#0ea5e9',accent:'#fbbf24'},{body:'#16a34a',accent:'#fbbf24'},
    {body:'#db2777',accent:'#ffffff'},{body:'#d97706',accent:'#1e1e2e'},
    {body:'#0891b2',accent:'#f59e0b'},{body:'#7c3aed',accent:'#4ade80'},
    {body:'#be185d',accent:'#fbbf24'},{body:'#1d4ed8',accent:'#f59e0b'},
    {body:'#065f46',accent:'#ffffff'},{body:'#92400e',accent:'#ffffff'},
  ];
  return PALETTES[Math.abs(h)%PALETTES.length];
}

function _silkSVG(horse,size){
  size=size||26;
  const c=_silkColors(horse||'?');
  return'<svg width="'+size+'" height="'+(size*1.15).toFixed(0)+'" viewBox="0 0 70 80" fill="none">'
    +'<path d="M20 20 Q35 16 50 20 L54 62 Q35 66 16 62 Z" fill="'+c.body+'"/>'
    +'<path d="M28 19 L28 63" stroke="'+c.accent+'" stroke-width="6"/>'
    +'<path d="M42 19 L42 63" stroke="'+c.accent+'" stroke-width="6"/>'
    +'<path d="M20 20 Q10 24 6 38 Q10 42 16 40 L20 28 Z" fill="'+c.body+'"/>'
    +'<path d="M50 20 Q60 24 64 38 Q60 42 54 40 L50 28 Z" fill="'+c.body+'"/>'
    +'<ellipse cx="35" cy="12" rx="13" ry="6" fill="'+c.accent+'"/>'
    +'<ellipse cx="35" cy="10" rx="10" ry="7" fill="'+c.body+'"/>'
    +'<rect x="22" y="11" width="26" height="3" fill="'+c.accent+'" rx="1"/>'
  +'</svg>';
}

// ── Album CSS — injected once ──
function _injectAlbumCSS(){
  if(document.getElementById('wl-album-css'))return;
  const s=document.createElement('style');
  s.id='wl-album-css';
  s.textContent=`
    .alb-wrap{padding:10px 10px 24px;font-family:'Outfit','Segoe UI',sans-serif;}
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
    .alb-hdr{background:#0d0d1a;border:1px solid rgba(255,255,255,.06);border-radius:13px;padding:13px 14px;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between;}
    .alb-title{font-family:'Bebas Neue','Impact',cursive;font-size:24px;letter-spacing:3px;color:#fff;line-height:1;}
    .alb-sub{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.22);margin-top:3px;}
    .alb-n{font-family:'Bebas Neue','Impact',cursive;font-size:32px;letter-spacing:1px;color:#8b5cf6;line-height:1;text-align:right;}
    .alb-nlbl{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.2);text-align:right;}
    .alb-prog{background:#0a0a14;border-radius:10px;padding:9px 12px;margin-bottom:14px;border:1px solid rgba(255,255,255,.04);}
    .alb-prog-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
    .alb-prog-lbl{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.22);}
    .alb-prog-val{font-family:'Bebas Neue','Impact',cursive;font-size:13px;letter-spacing:1px;color:#8b5cf6;}
    .alb-prog-track{height:3px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden;}
    .alb-prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#7c3aed,#a78bfa);}
    .alb-sec{display:flex;align-items:center;gap:9px;margin:16px 0 9px;}
    .alb-sec-spine{height:26px;width:4px;border-radius:3px;flex-shrink:0;}
    .alb-sec-lbl{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;flex:1;}
    .alb-sec-count{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.25);}
    .alb-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .alb-card{position:relative;border-radius:10px;overflow:hidden;cursor:pointer;box-shadow:2px 3px 14px rgba(0,0,0,.55);transition:transform .12s,box-shadow .12s;}
    .alb-card:active{transform:scale(.96);box-shadow:1px 2px 8px rgba(0,0,0,.4);}
    .alb-card-band{height:4px;width:100%;}
    .alb-card-body{background:#0e0e1a;border:1px solid rgba(255,255,255,.07);border-top:none;border-radius:0 0 10px 10px;padding:9px 10px 10px;}
    .alb-card-num{position:absolute;top:7px;right:7px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:8px;font-weight:800;color:rgba(255,255,255,.22);}
    .alb-card-silks{width:36px;height:42px;border-radius:50%;background:#0a0a14;border:2px solid rgba(139,92,246,.18);display:flex;align-items:center;justify-content:center;margin-bottom:6px;}
    .alb-card-tag{display:inline-flex;align-items:center;gap:3px;font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:8px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:2px 6px;border-radius:4px;margin-bottom:5px;}
    .alb-card-name{font-family:'Bebas Neue','Impact',cursive;font-size:17px;letter-spacing:1.5px;color:#fff;line-height:1;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .alb-card-trainer{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:9px;font-weight:600;color:rgba(255,255,255,.27);margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .alb-card-stats{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid rgba(255,255,255,.05);padding-top:6px;margin-top:2px;}
    .alb-card-or{font-family:'Bebas Neue','Impact',cursive;font-size:21px;letter-spacing:1px;line-height:1;}
    .alb-card-orlbl{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.2);display:block;margin-bottom:1px;}
    .alb-card-meta{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:9px;font-weight:600;color:rgba(255,255,255,.22);text-align:right;line-height:1.5;}
    .alb-empty{border-radius:10px;background:rgba(255,255,255,.012);border:1.5px dashed rgba(255,255,255,.06);height:148px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:background .15s,border-color .15s;}
    .alb-empty:active{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.12);}
    .alb-empty-icon{font-size:20px;opacity:.13;}
    .alb-empty-lbl{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.12);}
    .alb-es{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:13px;color:rgba(255,255,255,.25);font-style:italic;text-align:center;padding:40px 20px;}
  `;
  document.head.appendChild(s);
}

function renderWLList(){
  _injectAlbumCSS();
  const wl=getWL();
  const search=(document.getElementById('wl-search')||{value:''}).value.toLowerCase();
  let entries=[...wl].sort(function(a,b){return(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
  if(search)entries=entries.filter(function(e){return(e.horse||'').toLowerCase().includes(search)||(e.trainer||'').toLowerCase().includes(search)||(e.reasonNote||'').toLowerCase().includes(search);});
  const el=document.getElementById('wl-list');if(!el)return;

  if(!entries.length){
    el.innerHTML='<div class="alb-es">'+(search?'No profiles match "'+search+'"':'No profiles yet — tap + to add your first horse.')+'</div>';
    return;
  }

  const REASON_ORDER=['eye-catcher','future-target','trainer-intel','form-study','tip-source'];
  const REASON_META={
    'eye-catcher': {emoji:'🔭',label:'Eye Catchers',  col:'#a78bfa',grad:'#6d28d9,#a78bfa'},
    'future-target':{emoji:'📰',label:'Future Targets',col:'#fb923c',grad:'#c2410c,#fb923c'},
    'trainer-intel':{emoji:'🗣',label:'Trainer Intel', col:'#60a5fa',grad:'#1d4ed8,#60a5fa'},
    'form-study':   {emoji:'📊',label:'Form Study',    col:'#ef4444',grad:'#991b1b,#ef4444'},
    'tip-source':   {emoji:'💡',label:'Tips & Sources',col:'#eab308',grad:'#92400e,#eab308'},
  };

  const groups={};
  entries.forEach(function(e){const r=e.reason||'eye-catcher';if(!groups[r])groups[r]=[];groups[r].push(e);});

  const total=entries.length;
  // Running card number across all groups
  let cardNum=0;

  let html='<div class="alb-wrap">';

  // ── Album header ──
  html+='<div class="alb-hdr">'
    +'<div><div class="alb-title">🧩 Puzzle Profiler</div>'
    +'<div class="alb-sub">2025/26 Season Collection</div></div>'
    +'<div><div class="alb-n">'+total+'</div><div class="alb-nlbl">Profiles</div></div>'
  +'</div>';

  // ── Progress bar ──
  const target=Math.max(total+5, 20);
  const pct=Math.min(Math.round(total/target*100),100);
  html+='<div class="alb-prog">'
    +'<div class="alb-prog-row"><span class="alb-prog-lbl">Collection</span><span class="alb-prog-val">'+total+' profiles logged</span></div>'
    +'<div class="alb-prog-track"><div class="alb-prog-fill" style="width:'+pct+'%;"></div></div>'
  +'</div>';

  // ── Groups ──
  REASON_ORDER.forEach(function(r){
    if(!groups[r]||!groups[r].length)return;
    const rm=REASON_META[r];
    const grp=groups[r];

    // Section divider
    html+='<div class="alb-sec">'
      +'<div class="alb-sec-spine" style="background:'+rm.col+';"></div>'
      +'<span class="alb-sec-lbl" style="color:'+rm.col+';">'+rm.emoji+' '+rm.label+'</span>'
      +'<span class="alb-sec-count">'+grp.length+'</span>'
    +'</div>';

    html+='<div class="alb-grid">';

    grp.forEach(function(e){
      cardNum++;
      const obs=e.observations||[];
      const targets=e.targets||[];
      const or=parseFloat(e.currentRating)||null;
      const mr=parseFloat(e.myRating)||null;
      const showMR=!or&&mr;
      const ratingVal=or||mr||null;
      const ratingLbl=or?'OR':mr?'MR':'OR';
      const ratingCol=or?'#8b5cf6':mr?'#f59e0b':'#3a3a5c';
      const numStr=String(cardNum).padStart(2,'0');

      html+='<div class="alb-card" data-wl-id="'+e.id+'">'
        +'<div class="alb-card-band" style="background:linear-gradient(90deg,'+rm.grad+');"></div>'
        +'<div class="alb-card-body">'
          +'<div class="alb-card-num">'+numStr+'</div>'
          +'<div class="alb-card-silks">'+_silkSVG(e.horse||'?',26)+'</div>'
          +'<div class="alb-card-tag" style="background:'+rm.col+'18;border:1px solid '+rm.col+'30;color:'+rm.col+';">'+rm.emoji+' '+REASON_META[r].label.replace(/s$/,'')+'</div>'
          +'<div class="alb-card-name">'+(e.horse||'Unknown')+'</div>'
          +'<div class="alb-card-trainer">'+(e.trainer||'—')+'</div>'
          +'<div class="alb-card-stats">'
            +'<div><span class="alb-card-orlbl">'+ratingLbl+'</span><span class="alb-card-or" style="color:'+ratingCol+';">'+(ratingVal||'—')+'</span></div>'
            +'<div class="alb-card-meta">'+(obs.length?obs.length+' obs':'no obs')+'<br>'+(targets.length?targets.length+' target'+(targets.length>1?'s':''):'no targets')+'</div>'
          +'</div>'
        +'</div>'
      +'</div>';
    });

    // Empty add slot at end of each group
    html+='<div class="alb-empty" onclick="openWLForm()">'
      +'<div class="alb-empty-icon">＋</div>'
      +'<div class="alb-empty-lbl">Add Profile</div>'
    +'</div>';

    html+='</div>'; // grid
  });

  html+='</div>'; // alb-wrap
  el.innerHTML=html;

  // Wire up card clicks
  el.querySelectorAll('[data-wl-id]').forEach(function(card){
    card.addEventListener('click',function(ev){
      ev.stopPropagation();
      openWLProfile(card.getAttribute('data-wl-id'));
    });
  });
}

function renderWLEntry(e){
  // renderWLEntry is used by the calendar day panel — keep a compact version
  const RMAP={'eye-catcher':{emoji:'🔭',col:'#a78bfa',label:'Eye Catcher'},'future-target':{emoji:'📰',col:'#fb923c',label:'Future Target'},'trainer-intel':{emoji:'🗣',col:'#60a5fa',label:'Trainer Intel'},'form-study':{emoji:'📊',col:'#ef4444',label:'Form Study'},'tip-source':{emoji:'💡',col:'#eab308',label:'Tip / Source'}};
  const rm=RMAP[e.reason||'eye-catcher']||RMAP['eye-catcher'];
  const obs=e.observations||[];
  const targets=e.targets||[];
  const lastObs=obs.length?obs.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');})[0]:null;
  const latestDate=lastObs?lastObs.date:(e.raceDate||'');
  const daysAgo=latestDate?(function(){const d=new Date(latestDate+'T00:00:00');const diff=Math.round((new Date()-d)/(1000*60*60*24));return diff===0?'Today':diff===1?'Yesterday':diff>0?diff+'d ago':'Upcoming';}()):'';
  const isEmpty=!obs.length&&!targets.length&&!e.trainerIntel&&!e.conditionsNotes;
  return'<div class="mb" data-wl-id="'+e.id+'" style="cursor:pointer;border-left:3px solid '+rm.col+';margin-bottom:8px;padding:10px 11px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
      +'<div style="flex:1;min-width:0;">'
        +'<div style="margin-bottom:5px;"><span style="font-size:9px;font-family:monospace;padding:2px 7px;border-radius:20px;background:rgba(0,0,0,.2);border:1px solid '+rm.col+';color:'+rm.col+';font-weight:700;">'+rm.emoji+' '+rm.label+'</span>'+(e.reasonNote?'<span style="font-size:10px;color:var(--mut);font-style:italic;margin-left:6px;">'+e.reasonNote.slice(0,50)+(e.reasonNote.length>50?'…':'')+'</span>':'')+'</div>'
        +'<div style="font-weight:700;font-size:15px;margin-bottom:2px;">'+e.horse+'</div>'
        +orSummaryLine(e)
        +(e.trainer?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">'+e.trainer+'</div>':'')
        +(lastObs?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">📋 <span style="color:var(--txt);">'+(lastObs.raceName||'')+(lastObs.track?' · '+lastObs.track:'')+'</span>'+(daysAgo?' · '+daysAgo:'')+'</div>':'')
        +(targets.length?'<div style="margin-top:3px;">'+targets.slice(0,2).map(function(t){const tDate=t.date?(new Date(t.date+'T00:00:00')).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';return'<div style="font-size:11px;font-family:monospace;color:#fb923c;margin-bottom:1px;">🎯 '+t.race+(tDate?'<span style="color:var(--mut);"> · '+tDate+'</span>':'')+(t.track?'<span style="font-size:9px;color:var(--mut);"> · '+t.track+'</span>':'')+'</div>';}).join('')+'</div>':'')
        +(isEmpty?'<div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:4px;font-style:italic;">Tap to add notes →</div>':'')
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0;margin-left:10px;">'+(obs.length?'<div style="font-family:monospace;font-size:9px;color:var(--mut);">'+obs.length+' obs</div>':'')+'</div>'
    +'</div>'
  +'</div>';
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
  modal.id='wl-modal';modal.style.cssText='position:fixed;inset:0;z-index:500;background:#050508;overflow-y:auto;-webkit-overflow-scrolling:touch;';
  const going=['Firm','Good to Firm','Good','Good to Soft','Soft','Heavy'];
  const goingPrefs=e?e.goingPrefs||[]:[];
  _wlDossier.goingPrefs=goingPrefs.slice();
  const goingHtml=going.map(function(g){const sel=_wlDossier.goingPrefs.includes(g);return'<button type="button" data-going="'+g+'" onclick="wlToggleGoing(this)" style="padding:6px 13px;border-radius:20px;border:1.5px solid '+(sel?'#4ade80':'rgba(255,255,255,.1)')+';background:'+(sel?'rgba(74,222,128,.1)':'transparent')+';color:'+(sel?'#4ade80':'rgba(255,255,255,.3)')+';font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;cursor:pointer;">'+g+'</button>';}).join('');
  const REASONS=[{value:'eye-catcher',emoji:'🔭',label:'Eye Catcher'},{value:'future-target',emoji:'📰',label:'Future Target'},{value:'trainer-intel',emoji:'🗣',label:'Trainer Intel'},{value:'form-study',emoji:'📊',label:'Form Study'},{value:'tip-source',emoji:'💡',label:'Tip / Source'}];
  const curReason=e?e.reason||'eye-catcher':'eye-catcher';
  const REASON_COLS={'eye-catcher':'#a78bfa','future-target':'#fb923c','trainer-intel':'#60a5fa','form-study':'#ef4444','tip-source':'#eab308'};
  const reasonHtml=REASONS.map(function(r){const sel=r.value===curReason;const col=REASON_COLS[r.value]||'#e879f9';const rgb=col.replace('#','').match(/.{2}/g).map(function(h){return parseInt(h,16);});return'<button type="button" data-reason="'+r.value+'" onclick="wlSelectReason(this)" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 4px;border-radius:10px;border:1.5px solid '+(sel?col:'rgba(255,255,255,.08)')+';background:'+(sel?'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',.12)':'#0d0d18')+';color:'+(sel?col:'rgba(255,255,255,.3)')+';cursor:pointer;flex:1;min-width:0;transition:all .15s;"><span style="font-size:18px;">'+r.emoji+'</span><span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:'+(sel?'800':'600')+';letter-spacing:.5px;text-transform:uppercase;text-align:center;line-height:1.2;">'+r.label+'</span></button>';}).join('');
  modal.innerHTML=
  '<div style="max-width:520px;margin:0 auto;background:#050508;min-height:100%;padding-bottom:40px;">'
  +'<div style="display:flex;align-items:center;justify-content:space-between;padding:max(14px,env(safe-area-inset-top,14px)) 16px 12px;background:rgba(5,5,8,.96);backdrop-filter:blur(12px);border-bottom:1px solid #1c1c30;position:sticky;top:0;z-index:10;">'
  +'<div style="display:flex;align-items:center;gap:7px;"><span style="font-size:16px;">🧩</span><span style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#fff;">RACING <span style="color:#8b5cf6;">PUZZLE</span></span></div>'
  +'<div style="display:flex;gap:8px;align-items:center;">'
  +(e?'<button onclick="delWLEntry(\''+e.id+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(248,113,113,.3);background:rgba(248,113,113,.08);color:#f87171;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">Delete</button>':'')
  +'<button onclick="document.getElementById(\'wl-modal\').remove()" style="width:34px;height:34px;border-radius:50%;background:#111120;border:1px solid #1c1c30;color:#888;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>'
  +'</div></div>'
  +'<div style="background:#0d0d18;border-bottom:1px solid #1c1c30;padding:16px;">'
  +(e?'<div style="font-family:\'Bebas Neue\',cursive;font-size:38px;letter-spacing:2px;color:#fff;line-height:1;margin-bottom:2px;">'+e.horse+'</div><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4a4a6a;">Editing Profile</div>':'<div style="font-family:\'Bebas Neue\',cursive;font-size:32px;letter-spacing:2px;color:#8b5cf6;line-height:1;margin-bottom:2px;">New Profile</div><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4a4a6a;">Create a puzzle profiler entry</div>')
  +'</div>'
  +'<div style="padding:0 12px;">'
  +'<div style="background:#0d0d18;border:1px solid #1c1c30;border-radius:13px;margin-top:12px;overflow:hidden;">'
  +'<div style="display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid #1c1c30;">'+'<div style="width:24px;height:24px;background:#1a1a2e;border:1px solid #1c1c30;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;color:#3a3a5c;flex-shrink:0;">1</div>'+'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c8d0df;">Why Am I Logging This?</span>'+'</div>'
  +'<div style="display:flex;gap:5px;padding:12px 13px 13px;" id="wlf-reasons">'+reasonHtml+'</div>'
  +'<input type="hidden" id="wlf-reason" value="'+curReason+'">'
  +'<div style="padding:0 13px 14px;">'
  +'<label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">In a sentence...</label>'
  +'<input type="text" id="wlf-reason-note" placeholder="e.g. Finished well from rear at Ascot, should improve" value="'+(e?e.reasonNote||'':'')+'" autocomplete="off" style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;">'
  +'</div></div>'
  +'<div style="background:#0d0d18;border:1px solid #1c1c30;border-radius:13px;margin-top:10px;overflow:hidden;">'
  +'<div style="display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid #1c1c30;">'+'<div style="width:24px;height:24px;background:#1a1a2e;border:1px solid #1c1c30;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;color:#3a3a5c;flex-shrink:0;">2</div>'+'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c8d0df;">Horse</span>'+'</div>'
  +'<div style="padding:12px 13px;display:flex;flex-direction:column;gap:10px;">'
  +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">Horse Name</label><input type="text" id="wlf-horse" value="'+(e?e.horse:p.horse||'')+'" style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
  +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">Current OR <span style="color:#3a3a5c;font-weight:400;">auto-updates</span></label><input type="number" id="wlf-rating" placeholder="e.g. 85" value="'+(e?e.currentRating||'':p.currentRating||'')+'" style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
  +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#f59e0b;margin-bottom:5px;">My Mark (MR) ★</label><input type="number" id="wlf-myrating" placeholder="e.g. 88" value="'+(e?e.myRating||'':'')+'" style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid rgba(245,158,11,.35);border-radius:8px;color:#f59e0b;font-size:14px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
  +'</div><div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">Trainer</label><input type="text" id="wlf-trainer" value="'+(e?e.trainer||'':p.trainer||'')+'" style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
  +'</div></div>'
  +'<div style="background:#0d0d18;border:1px solid #1c1c30;border-radius:13px;margin-top:10px;overflow:hidden;">'
  +'<div style="display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid #1c1c30;">'+'<div style="width:24px;height:24px;background:#1a1a2e;border:1px solid #1c1c30;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;color:#3a3a5c;flex-shrink:0;">3</div>'+'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c8d0df;">Race Observations</span>'+'</div>'
  +'<div style="padding:12px 13px 4px;"><div id="wlf-obs-list"></div>'
  +'<button onclick="wlAddObsRow()" style="width:100%;padding:9px;border:1px dashed rgba(232,121,249,.3);border-radius:9px;background:transparent;color:#e879f9;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;margin-bottom:12px;">+ Add Observation</button>'
  +'</div></div>'
  +'<div style="background:#0d0d18;border:1px solid #1c1c30;border-radius:13px;margin-top:10px;overflow:hidden;">'
  +'<div style="display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid #1c1c30;">'+'<div style="width:24px;height:24px;background:#1a1a2e;border:1px solid #1c1c30;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;color:#3a3a5c;flex-shrink:0;">4</div>'+'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#60a5fa;">Trainer / Connections Intel</span>'+'</div>'
  +'<div style="padding:12px 13px 14px;"><textarea id="wlf-intel" placeholder="Notes from trainer interviews, press, paddock chat..." style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;resize:vertical;min-height:64px;">'+(e?e.trainerIntel||'':'')+'</textarea></div>'
  +'</div>'
  +'<div style="background:#0d0d18;border:1px solid #1c1c30;border-radius:13px;margin-top:10px;overflow:hidden;">'
  +'<div style="display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid #1c1c30;">'+'<div style="width:24px;height:24px;background:#1a1a2e;border:1px solid #1c1c30;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;color:#3a3a5c;flex-shrink:0;">5</div>'+'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#fb923c;">Future Targets</span>'+'</div>'
  +'<div style="padding:12px 13px 4px;"><div id="wlf-targets-list"></div>'
  +'<button onclick="wlAddTargetRow()" style="width:100%;padding:9px;border:1px dashed rgba(251,146,60,.3);border-radius:9px;background:transparent;color:#fb923c;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;margin-bottom:12px;">+ Add Target Race</button>'
  +'</div></div>'
  +'<div style="background:#0d0d18;border:1px solid #1c1c30;border-radius:13px;margin-top:10px;overflow:hidden;">'
  +'<div style="display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid #1c1c30;">'+'<div style="width:24px;height:24px;background:#1a1a2e;border:1px solid #1c1c30;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;color:#3a3a5c;flex-shrink:0;">6</div>'+'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#4ade80;">Conditions Profile</span>'+'</div>'
  +'<div style="padding:12px 13px;display:flex;flex-direction:column;gap:10px;">'
  +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">Going Preferences</label><div id="wlf-going" style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;">'+goingHtml+'</div></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
  +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">Preferred Distance</label><input type="text" id="wlf-dist" placeholder="e.g. 6-7f" value="'+(e?e.distancePref||'':'')+'" style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
  +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">Track Type</label><input type="text" id="wlf-track" placeholder="e.g. Straight" value="'+(e?e.trackPref||'':'')+'" style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:14px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
  +'</div><div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:5px;">Conditions Notes</label><textarea id="wlf-cond-notes" placeholder="Your evolving view on what suits this horse..." style="width:100%;padding:9px 11px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;resize:vertical;min-height:52px;">'+(e?e.conditionsNotes||e.notes||'':'')+'</textarea></div>'
  +'</div></div>'
  +'<div style="display:flex;gap:8px;margin-top:16px;">'
  +'<button style="flex:1;padding:13px;border-radius:10px;border:none;background:#8b5cf6;color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;" onclick="saveWLEntry(\''+( e?e.id:'')+'\')">'+(e?'Save Profile':'Create Profile')+'</button>'
  +'<button style="padding:13px 18px;border-radius:10px;border:1px solid #1c1c30;background:#111120;color:#888;font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;" onclick="document.getElementById(\'wl-modal\').remove()">Cancel</button>'
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
  if(!_wlDossier.obs.length){el.innerHTML='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:600;color:#3a3a5c;font-style:italic;text-align:center;padding:8px 0 10px;">No observations yet — tap Add to log a run</div>';return;}
  el.innerHTML=_wlDossier.obs.map(function(o,i){
    return'<div style="background:#111120;border:1px solid #1c1c30;border-radius:10px;padding:12px;margin-bottom:8px;border-top:2px solid rgba(232,121,249,.25);">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
      +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(232,121,249,.6);">Observation '+(i+1)+'</span>'
      +'<button onclick="_wlDelObs('+i+')" style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);border-radius:6px;color:#f87171;font-size:11px;cursor:pointer;padding:2px 8px;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;">✕ Remove</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Date</label><input type="date" value="'+(o.date||'')+'" onchange="_wlDossier.obs['+i+'].date=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Result</label><select onchange="_wlDossier.obs['+i+'].result=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;">'
      +'<option value=""'+((!o.result)?' selected':'')+'>— Select</option>'
      +'<option value="win"'+((o.result==="win")?' selected':'')+'>Won</option>'
      +'<option value="place"'+((o.result==="place")?' selected':'')+'>Placed</option>'
      +'<option value="loss"'+((o.result==="loss")?' selected':'')+'>Unplaced</option>'
      +'</select></div>'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Race / Track</label><input type="text" value="'+(o.raceName||'')+'" placeholder="e.g. Newmarket Maiden" onchange="_wlDossier.obs['+i+'].raceName=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Going</label><input type="text" value="'+(o.going||'')+'" placeholder="e.g. Good to Firm" onchange="_wlDossier.obs['+i+'].going=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
      +'</div>'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Your Notes</label><textarea style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;min-height:52px;resize:vertical;" placeholder="What you noticed…" onchange="_wlDossier.obs['+i+'].notes=this.value">'+(o.notes||'')+'</textarea></div>'
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
  if(!_wlDossier.targets.length){el.innerHTML='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:600;color:#3a3a5c;font-style:italic;text-align:center;padding:8px 0 10px;">No targets set — tap Add to plan a race</div>';return;}
  el.innerHTML=_wlDossier.targets.map(function(t,i){
    return'<div style="background:#111120;border:1px solid rgba(251,146,60,.18);border-radius:10px;padding:12px;margin-bottom:8px;border-top:2px solid rgba(251,146,60,.3);">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
      +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(251,146,60,.7);">🎯 Target '+(i+1)+'</span>'
      +'<button onclick="_wlDelTarget('+i+')" style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);border-radius:6px;color:#f87171;font-size:11px;cursor:pointer;padding:2px 8px;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;">✕ Remove</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Race</label><input type="text" value="'+(t.race||'')+'" placeholder="e.g. Sandy Lane" onchange="_wlDossier.targets['+i+'].race=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Track</label><input type="text" value="'+(t.track||'')+'" placeholder="e.g. Haydock" onchange="_wlDossier.targets['+i+'].track=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Date</label><input type="date" value="'+(t.date||'')+'" onchange="_wlDossier.targets['+i+'].date=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
      +'<div><label style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4a4a6a;margin-bottom:4px;">Condition</label><input type="text" value="'+(t.condition||'')+'" placeholder="Optional notes" onchange="_wlDossier.targets['+i+'].condition=this.value" style="width:100%;padding:8px 10px;background:#0a0a14;border:1px solid #1c1c30;border-radius:8px;color:#d4d8e8;font-size:13px;font-family:\'Outfit\',sans-serif;outline:none;box-sizing:border-box;"></div>'
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
  const RCOLS={'eye-catcher':'#a78bfa','future-target':'#fb923c','trainer-intel':'#60a5fa','form-study':'#ef4444','tip-source':'#eab308'};
  document.querySelectorAll('#wlf-reasons button').forEach(function(b){
    const bval=b.getAttribute('data-reason');
    const sel=bval===val;
    const col=RCOLS[bval]||'#e879f9';
    b.style.border='1px solid '+(sel?col:'rgba(255,255,255,.1)');
    b.style.background=sel?col.replace(/^#/,'').match(/.{2}/g).reduce(function(s,h,i){return s+(i?',':'')+parseInt(h,16);},'rgba(')+',.15)':'transparent';
    b.style.color=sel?col:'var(--mut)';
    const lbl=b.querySelector('span:last-child');
    if(lbl)lbl.style.fontWeight=sel?'700':'400';
  });
}

function wlToggleGoing(btn){
  const g=btn.getAttribute('data-going');
  if(!_wlDossier.goingPrefs)_wlDossier.goingPrefs=[];
  const idx=_wlDossier.goingPrefs.indexOf(g);
  if(idx>-1){_wlDossier.goingPrefs.splice(idx,1);}else{_wlDossier.goingPrefs.push(g);}
  const sel=_wlDossier.goingPrefs.includes(g);
  btn.style.border='1px solid '+(sel?'#e879f9':'rgba(232,121,249,.25)');
  btn.style.background=sel?'rgba(232,121,249,.2)':'transparent';
  btn.style.color=sel?'#e879f9':'var(--mut)';
}

function saveWLEntry(id){
  const horse=(document.getElementById('wlf-horse').value||'').trim();
  if(!horse){alert('Enter a horse name.');return;}
  const wl=getWL();
  const old=id?wl.find(x=>x.id===id):null;
  const goingPrefs=_wlDossier.goingPrefs||[];
  const sortedObs=_wlDossier.obs.filter(function(o){return o.date;}).sort(function(a,b){return b.date.localeCompare(a.date);});
  const raceDate=sortedObs.length?sortedObs[0].date:(old?old.raceDate||'':'');
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
    observations:_wlDossier.obs,
    targets:_wlDossier.targets.filter(function(t){return t.race;}),
    goingPrefs,
    distancePref:(document.getElementById('wlf-dist').value||'').trim(),
    trackPref:(document.getElementById('wlf-track').value||'').trim(),
    conditionsNotes:(document.getElementById('wlf-cond-notes').value||'').trim(),
    raceDate,
    raceName:sortedObs.length?sortedObs[0].raceName||'':'',
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
  background: #050508;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.wlp-page {
  max-width: 500px;
  margin: 0 auto;
  padding-bottom: 40px;
  font-family: 'Outfit','Segoe UI',sans-serif;
  color: #d4d8e8;
}
/* NAV */
.wlp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top, 14px)) 16px 12px;
  background: rgba(5,5,8,0.96);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #1c1c30;
  position: sticky;
  top: 0;
  z-index: 20;
}
.wlp-back {
  display: flex; align-items: center; gap: 5px;
  height: 34px;
  border-radius: 8px;
  background: #111120;
  border: 1px solid #1c1c30;
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
.wlp-brand-accent { color: #8b5cf6; }
.wlp-edit-btn {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase;
  color: #8b5cf6;
  padding: 6px 13px;
  border: 1px solid rgba(139,92,246,.4);
  border-radius: 8px;
  background: rgba(139,92,246,.08);
  cursor: pointer;
}
/* HERO */
.wlp-hero {
  background: #0d0d18;
  border-bottom: 1px solid #1c1c30;
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
  font-family: 'Bebas Neue','Impact',cursive;
  font-size: 40px; letter-spacing: 2px; color: #fff; line-height: 1;
}
.wlp-verified {
  width: 20px; height: 20px; background: #8b5cf6; border-radius: 50%;
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
  background: #111120;
  border: 1.5px solid rgba(139,92,246,.35);
  border-radius: 10px; padding: 7px 13px; text-align: center;
}
.wlp-or-label {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: #3a3a5c; display: block; margin-bottom: 1px;
}
.wlp-or-value {
  font-family: 'Bebas Neue','Impact',cursive;
  font-size: 32px; letter-spacing: 1px; color: #8b5cf6; line-height: 1;
}
.wlp-or-na {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 13px; font-weight: 700; color: #3a3a5c;
}
/* META STRIP */
.wlp-meta {
  display: flex; position: relative; z-index: 1;
  margin-top: 14px;
  border-top: 1px solid #1c1c30; border-bottom: 1px solid #1c1c30;
}
.wlp-meta-cell {
  flex: 1; padding: 9px 11px; border-right: 1px solid #1c1c30;
}
.wlp-meta-cell:last-child { border-right: none; }
.wlp-meta-label {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #4a4a6a; display: block; margin-bottom: 3px;
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
  background: #0a0a14; border: 2.5px solid rgba(139,92,246,.35);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 16px rgba(139,92,246,.2);
}
.wlp-stats { flex: 1; display: flex; flex-direction: column; }
.wlp-stat-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 0; border-bottom: 1px solid #1c1c30;
}
.wlp-stat-row:last-child { border-bottom: none; }
.wlp-stat-left {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 600; color: #3a3a5c;
  display: flex; align-items: center; gap: 6px;
}
.wlp-stat-val {
  font-family: 'Bebas Neue','Impact',cursive;
  font-size: 20px; letter-spacing: 1px; line-height: 1;
}
.wlp-stat-sm {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 700; color: #fff;
}
.wlp-edge-badge {
  font-family: 'Bebas Neue','Impact',cursive;
  font-size: 15px; letter-spacing: 1px; padding: 2px 8px; border-radius: 5px;
}
/* EDGE BAR */
.wlp-edge-bar { padding: 2px 0 10px; position: relative; z-index: 1; }
.wlp-edge-bar-track { height: 4px; background: #111120; border-radius: 2px; overflow: hidden; }
.wlp-edge-bar-fill { height: 100%; border-radius: 2px; }
/* SECTIONS */
.wlp-section {
  background: #0d0d18; border: 1px solid #1c1c30;
  border-radius: 13px; margin: 10px 12px 0; overflow: hidden;
}
.wlp-section-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; border-bottom: 1px solid #1c1c30;
}
.wlp-section-left { display: flex; align-items: center; gap: 9px; }
.wlp-section-num {
  width: 24px; height: 24px; background: #1a1a2e;
  border: 1px solid #1c1c30; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 800; color: #3a3a5c;
}
.wlp-section-title {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 12px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: #c8d0df;
}
.wlp-section-action {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: #8b5cf6; cursor: pointer;
}
/* WHY LOGGED */
.wlp-why-grid {
  display: grid; grid-template-columns: repeat(5,1fr);
  gap: 6px; padding: 11px 12px 12px;
}
.wlp-why-btn {
  position: relative; background: #111120; border: 1.5px solid #1c1c30;
  border-radius: 9px; padding: 8px 4px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.wlp-why-active { background: rgba(139,92,246,.1); border-color: rgba(139,92,246,.4); }
.wlp-why-check {
  position: absolute; top: 4px; right: 4px;
  width: 13px; height: 13px; background: #8b5cf6; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 7px; color: #fff;
}
.wlp-why-icon { font-size: 14px; }
.wlp-why-label {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: .4px;
  text-align: center; line-height: 1.2; color: #c8d0df;
}
.wlp-why-active .wlp-why-label { color: #fff; }
.wlp-reason-note {
  padding: 0 13px 11px;
  font-family: 'Caveat',cursive; font-size: 13px;
  color: #6a6a8a; line-height: 1.5; font-style: italic;
}
/* RATINGS */
.wlp-ratings-row { display: flex; padding: 13px 12px; }
.wlp-rating-col {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 0 4px; border-right: 1px solid #1c1c30;
}
.wlp-rating-col:last-child { border-right: none; }
.wlp-rating-key {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #4a4a6a; margin-bottom: 5px; text-align: center;
}
.wlp-rating-val {
  font-family: 'Bebas Neue','Impact',cursive;
  font-size: 28px; letter-spacing: 1px; line-height: 1; text-align: center;
}
.wlp-rating-na {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 14px; font-weight: 700; color: #4a4a6a;
}
.wlp-rating-bar { height: 2px; border-radius: 1px; margin-top: 5px; width: 80%; }
.wlp-or-hist {
  display: flex; gap: 5px; padding: 0 13px 12px;
  flex-wrap: wrap; align-items: center;
}
.wlp-hist-label {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #4a4a6a;
}
.wlp-hist-pill {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 5px;
  background: rgba(139,92,246,.15); border: 1px solid rgba(139,92,246,.35);
  color: #8b5cf6; display: flex; align-items: center; gap: 4px;
}
.wlp-hist-date { color: #3a3a5c; font-weight: 600; }
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
  font-family: 'Caveat',cursive; font-size: 13px;
  line-height: 1.7; color: #2a2510; white-space: pre-line;
}
.wlp-notepad-empty {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 11px; color: #8a8060; font-style: italic;
  padding: 14px 13px; text-align: center; line-height: 1.6;
}
.wlp-obs-count {
  border-top: 1px solid #1c1c30; padding: 9px;
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: #8b5cf6; text-align: center; cursor: pointer;
}
/* TARGETS */
.wlp-target-item {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 9px 13px; border-bottom: 1px solid #1c1c30; gap: 8px;
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
  font-size: 10px; font-weight: 600; color: #4a4a6a; letter-spacing: .3px; margin-top: 2px;
}
.wlp-target-date {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 11px; font-weight: 700; color: #f59e0b; letter-spacing: .5px;
}
.wlp-target-cond {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 9px; font-weight: 600; color: #4a4a6a;
  text-align: right; max-width: 70px; line-height: 1.2; margin-top: 2px;
}
.wlp-target-empty {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 11px; color: #4a4a6a; padding: 14px 13px;
  text-align: center; font-style: italic;
}
/* CONDITIONS */
.wlp-cond-grid { display: grid; padding: 11px 10px 10px; }
.wlp-cond-cell {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 0 4px; border-right: 1px solid #1c1c30;
}
.wlp-cond-cell:last-child { border-right: none; }
.wlp-cond-icon { font-size: 16px; opacity: .7; }
.wlp-cond-label {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 8px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: #4a4a6a; text-align: center;
}
.wlp-cond-val {
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  font-size: 10px; font-weight: 800; text-align: center; line-height: 1.2;
}
/* INTEL */
.wlp-intel { padding: 10px 13px 13px; display: flex; gap: 9px; align-items: flex-start; }
.wlp-intel-icon { font-size: 16px; opacity: .6; flex-shrink: 0; margin-top: 1px; }
.wlp-intel-text {
  font-family: 'Caveat',cursive; font-size: 13px;
  line-height: 1.6; color: #7a8099; white-space: pre-line;
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

  // Inject Google Fonts once
  if(!document.getElementById('wlp-fonts')){
    const lnk=document.createElement('link');
    lnk.id='wlp-fonts';lnk.rel='stylesheet';
    lnk.href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800;900&family=Caveat:wght@500;600&display=swap';
    document.head.appendChild(lnk);
  }

  // Inject styles once
  if(!document.getElementById('wlp-styles')){
    const s=document.createElement('style');
    s.id='wlp-styles';s.textContent=WLP_CSS;
    document.head.appendChild(s);
  }

  const modal=document.createElement('div');
  modal.id='wlp-modal';
  modal.innerHTML=_wlpBuildHTML(e);
  document.body.appendChild(modal);
}

function _wlpBuildHTML(e){
  const esc=_wlpEsc;
  const fmt=_wlpFmt;

  const REASONS={
    'eye-catcher':  {emoji:'🔭',label:'Eye Catcher',  col:'#a78bfa'},
    'future-target':{emoji:'📰',label:'Future Target', col:'#fb923c'},
    'trainer-intel':{emoji:'🗣',label:'Trainer Intel', col:'#60a5fa'},
    'form-study':   {emoji:'📊',label:'Form Study',    col:'#ef4444'},
    'tip-source':   {emoji:'💡',label:'Tip / Source',  col:'#eab308'},
  };
  const WHY_ORDER=['eye-catcher','future-target','trainer-intel','form-study','tip-source'];
  const RESULT_COLS={win:'#4ade80',place:'#f59e0b',loss:'#f87171'};

  const reason=REASONS[e.reason||'eye-catcher']||REASONS['eye-catcher'];
  const or=parseFloat(e.currentRating)||null;
  const mr=parseFloat(e.myRating)||null;
  const edge=(or&&mr)?(mr-or):null;
  const edgeCol=edge===null?'#888':edge>0?'#4ade80':edge<0?'#f87171':'#888';

  const obs=e.observations||[];
  const targets=e.targets||[];
  const sortedObs=obs.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
  const latestObs=sortedObs[0]||null;
  const lastDate=latestObs?latestObs.date:(e.createdAt?new Date(e.createdAt).toISOString().slice(0,10):'');
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
  h+='<div class="wlp-brand"><span style="font-size:16px;">🧩</span>RACING <span class="wlp-brand-accent">PUZZLE</span></div>';
  h+='<div class="wlp-edit-btn" onclick="'+editFn+'">Edit ✏️</div>';
  h+='</div>';

  // HERO
  h+='<div class="wlp-hero">';
  h+='<div class="wlp-hero-bg">🐎</div>';
  h+='<div class="wlp-hero-top">';
  h+='<div>';
  h+='<div class="wlp-name-row"><span class="wlp-name">'+esc(e.horse)+'</span><div class="wlp-verified">✓</div></div>';
  h+='<div><span class="wlp-reason-badge" style="background:'+reason.col+'20;border:1px solid '+reason.col+'40;color:'+reason.col+';">'+reason.emoji+' '+reason.label+'</span></div>';
  h+='</div>';
  h+='<div class="wlp-or-box"><span class="wlp-or-label">OR</span>';
  h+=or?'<span class="wlp-or-value">'+or+'</span>':'<span class="wlp-or-na">—</span>';
  h+='</div>';
  h+='</div>';

  // Meta strip
  h+='<div class="wlp-meta">';
  h+='<div class="wlp-meta-cell"><span class="wlp-meta-label">Trainer</span><span class="wlp-meta-val">'+esc(e.trainer||'—')+'</span></div>';
  h+='<div class="wlp-meta-cell"><span class="wlp-meta-label">Observations</span><span class="wlp-meta-val">'+obs.length+' logged</span></div>';
  h+='<div class="wlp-meta-cell"><span class="wlp-meta-label">Targets</span><span class="wlp-meta-val">'+targets.length+' races</span></div>';
  h+='</div>';

  // Silks + stats
  h+='<div class="wlp-hero-body">';
  h+='<div class="wlp-silks">';
  h+='<svg width="64" height="74" viewBox="0 0 70 80" fill="none">';
  h+='<path d="M20 20 Q35 16 50 20 L54 62 Q35 66 16 62 Z" fill="#7c3aed"/>';
  h+='<path d="M28 19 L28 63" stroke="#f59e0b" stroke-width="5"/>';
  h+='<path d="M42 19 L42 63" stroke="#f59e0b" stroke-width="5"/>';
  h+='<path d="M20 20 Q10 24 6 38 Q10 42 16 40 L20 28 Z" fill="#7c3aed"/>';
  h+='<line x1="8" y1="24" x2="15" y2="40" stroke="#f59e0b" stroke-width="4"/>';
  h+='<path d="M50 20 Q60 24 64 38 Q60 42 54 40 L50 28 Z" fill="#7c3aed"/>';
  h+='<line x1="62" y1="24" x2="55" y2="40" stroke="#f59e0b" stroke-width="4"/>';
  h+='<path d="M26 20 Q35 15 44 20 Q35 26 26 20 Z" fill="#f59e0b"/>';
  h+='<ellipse cx="35" cy="12" rx="13" ry="6" fill="#f59e0b"/>';
  h+='<ellipse cx="35" cy="10" rx="10" ry="7" fill="#7c3aed"/>';
  h+='<rect x="22" y="11" width="26" height="3" fill="#f59e0b" rx="1"/>';
  h+='<circle cx="35" cy="7" r="2" fill="#f59e0b"/>';
  h+='</svg></div>';

  h+='<div class="wlp-stats">';
  // My Rating
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">⭐ My Rating</span>';
  h+=mr?'<span class="wlp-stat-val" style="color:#f97316;">'+mr+'</span>':'<span class="wlp-stat-sm" style="color:#3a3a5c;">Not set</span>';
  h+='</div>';
  // OR Edge
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">🏆 OR Edge</span>';
  h+=edge!==null?'<span class="wlp-edge-badge" style="background:'+edgeCol+'20;color:'+edgeCol+';">'+(edge>0?'+':'')+edge+' pts</span>':'<span class="wlp-stat-sm" style="color:#3a3a5c;">—</span>';
  h+='</div>';
  // Last Entry
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">📅 Last Entry</span>';
  h+='<span class="wlp-stat-sm">'+fmt(lastDate)+'</span></div>';
  // Next Target
  h+='<div class="wlp-stat-row"><span class="wlp-stat-left">🎯 Next Target</span>';
  if(nextTarget){const tw=(nextTarget.race||'').split(' ').slice(0,2).join(' ');h+='<span class="wlp-stat-sm" style="color:#f59e0b;font-size:11px;">'+esc(tw)+'</span>';}
  else h+='<span class="wlp-stat-sm" style="color:#3a3a5c;">None set</span>';
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
  h+='</div>';

  // SECTION 2: RATINGS
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">2</div><span class="wlp-section-title">Ratings</span></div>';
  if((e.orHistory||[]).length>1)h+='<span class="wlp-section-action">History ›</span>';
  h+='</div>';
  h+='<div class="wlp-ratings-row">';
  [{key:'Official Rating',val:e.currentRating,col:'#8b5cf6'},{key:'My Rating',val:e.myRating,col:'#f97316'}].forEach(function(r){
    const v=parseFloat(r.val)||null;
    h+='<div class="wlp-rating-col"><span class="wlp-rating-key">'+r.key+'</span>';
    if(v){h+='<span class="wlp-rating-val" style="color:'+r.col+';">'+v+'</span>';
      h+='<div class="wlp-rating-bar" style="background:'+r.col+'20;"><div style="height:100%;border-radius:1px;background:'+r.col+';width:'+Math.min(v/130*100,100)+'%;"></div></div>';}
    else{h+='<span class="wlp-rating-na">—</span><div class="wlp-rating-bar" style="background:#1c1c30;"></div>';}
    h+='</div>';
  });
  h+='</div>';
  if((e.orHistory||[]).length>0){
    h+='<div class="wlp-or-hist"><span class="wlp-hist-label">OR LOG</span>';
    e.orHistory.forEach(function(o){h+='<div class="wlp-hist-pill"><span>'+esc(o.or)+'</span><span class="wlp-hist-date">'+fmt(o.date)+'</span></div>';});
    h+='</div>';
  }
  h+='</div>';

  // SECTIONS 3+4 SPLIT
  h+='<div class="wlp-split">';

  // Section 3: Observations
  h+='<div class="wlp-section" style="flex:1.05;">';
  h+='<div class="wlp-section-hdr" style="padding:10px 12px;"><div class="wlp-section-left"><div class="wlp-section-num">3</div><span class="wlp-section-title" style="font-size:11px;">Observations</span></div>';
  h+='<span class="wlp-section-action" style="font-size:11px;" onclick="'+editFn+'">Add +</span></div>';
  if(latestObs){
    const rc=RESULT_COLS[latestObs.result||'']||'#888';
    h+='<div class="wlp-notepad"><div class="wlp-notepad-meta">';
    h+='<span>'+fmt(latestObs.date)+'</span>';
    if(latestObs.raceName)h+='<span class="wlp-notepad-dot">·</span><span>'+esc(latestObs.raceName)+'</span>';
    if(latestObs.going)h+='<span class="wlp-notepad-dot">·</span><span>'+esc(latestObs.going)+'</span>';
    if(latestObs.result)h+='<span class="wlp-result-badge" style="background:'+rc+'22;color:'+rc+';">'+latestObs.result.toUpperCase()+'</span>';
    h+='</div><div class="wlp-notepad-text">'+esc(latestObs.notes||'No notes')+'</div></div>';
  }else{
    h+='<div class="wlp-notepad-empty">No observations yet<br>Tap Add to log a run</div>';
  }
  if(obs.length>1)h+='<div class="wlp-obs-count">📋 '+obs.length+' total ›</div>';
  h+='</div>';

  // Section 4: Targets
  h+='<div class="wlp-section" style="flex:1;">';
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

  h+='</div>'; // split

  // SECTION 5: CONDITIONS
  h+='<div class="wlp-section">';
  h+='<div class="wlp-section-hdr"><div class="wlp-section-left"><div class="wlp-section-num">5</div><span class="wlp-section-title">Conditions Profile</span></div></div>';
  h+='<div class="wlp-cond-grid" style="grid-template-columns:repeat('+condItems.length+',1fr);border-bottom:1px solid #1c1c30;">';
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

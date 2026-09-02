// ─── RACECARDS & RESULTS ─── swipe cards, results, overlay flow

// ─── DISTANCE FORMATTER ───
// Converts API distance values (raw furlongs, "5f", "1m4f", "1408y" etc.)
// into a clean "Xm Yf" display string.
function formatDist(d){
  if(!d) return '';
  const s = String(d).trim();

  // Already formatted: "1m4f", "1m 4f", "5f", "2m", "1m½f", "2m2½f"
  const mf = s.match(/^(\d+)m\s*(\d*\.?\d*)(f?)$/i);
  if(mf){
    const miles = parseInt(mf[1]);
    const fur   = parseFloat(mf[2]||0);
    if(miles && fur)  return miles+'m '+fur+'f';
    if(miles)         return miles+'m';
    return s;
  }
  const fo = s.match(/^(\d*\.?\d+)f$/i);
  if(fo){
    const fur = parseFloat(fo[1]);
    const miles = Math.floor(fur/8);
    const rem   = Math.round((fur%8)*2)/2;
    if(miles && rem) return miles+'m '+rem+'f';
    if(miles)        return miles+'m';
    return fur+'f';
  }
  // Yards: e.g. "1408y"
  const yd = s.match(/^(\d+)y$/i);
  if(yd){
    const yards  = parseInt(yd[1]);
    const fur    = yards/220;
    const miles  = Math.floor(fur/8);
    const remFur = Math.round((fur%8)*2)/2;
    if(miles && remFur) return miles+'m '+remFur+'f';
    if(miles)           return miles+'m';
    return Math.round(fur)+'f';
  }
  // Raw number (furlongs)
  const raw = parseFloat(s);
  if(!isNaN(raw) && raw > 0){
    const miles = Math.floor(raw/8);
    const rem   = Math.round((raw%8)*2)/2;
    if(miles && rem) return miles+'m '+rem+'f';
    if(miles)        return miles+'m';
    return raw+'f';
  }
  return s;
}

// ─── SWIPE RACECARDS / RESULTS ───
let rcSwCurrentRaces=[], rcSwRacesByMeeting={}, rcSwView='time', _pendingRCBet=null, rcSwFilter='all', rcSwDensity='compact';

function rcSwipeInit(){
  if(!rcSwCurrentRaces.length) rcSwLoadMeetings();
}

function rcSwLoad(){ rcSwCurrentRaces=[]; rcSwLoadMeetings(); }

async function rcSwLoadMeetings(){
  const stEl  = document.getElementById('sw-rc-status');
  const uiEl  = document.getElementById('sw-rc-ui');
  if(stEl){ stEl.style.display='block'; stEl.textContent='Loading…'; }
  if(uiEl) uiEl.innerHTML='';
  try{
    // Credentials are server-side (Cloudflare Worker) — no client check needed
    // Share cache with today.js to avoid double-fetching
    if(!window._todayMeetingsCache) window._todayMeetingsCache=await callRacingAPI('racecards/basic',{});
    const data=window._todayMeetingsCache;
    rcSwCurrentRaces=data.racecards||data.races||[];
    if(typeof wlPatchSilksFromRunners==='function') wlPatchSilksFromRunners(rcSwCurrentRaces);
    if(stEl) stEl.style.display='none';
    if(!rcSwCurrentRaces.length){
      if(uiEl) uiEl.innerHTML='<div class="rc-empty">No racecards available.</div>';
      return;
    }
    // Update today card watchlist + edge alerts now that races are cached
    if(typeof renderToday==='function') renderToday();
    rcSwRenderUI();
  }catch(e){
    if(stEl){ stEl.style.display='block'; stEl.textContent='⚠️ '+e.message; }
  }
}

function rcSwRenderUI(){
  const uiEl=document.getElementById('sw-rc-ui');
  if(!uiEl)return;

  const v=rcSwView;
  const f=rcSwFilter;
  const _svgTarget='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
  const _svgTrophy='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M6 9a6 6 0 0 0 12 0V3H6z"/></svg>';
  const _svgEye='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  const filters=[
    {k:'all',  lbl:'All Races', icon:''},
    {k:'bets', lbl:'My Bets',   icon:_svgTarget},
    {k:'league',lbl:'League',   icon:_svgTrophy},
    {k:'watchlist',lbl:'Watchlist',icon:_svgEye},
  ];
  let html='<div style="display:flex;gap:6px;align-items:center;width:100%;margin-bottom:2px;">'
    +'<div class="rc-view-tog" style="flex:1;">'
      +'<button class="rc-view-btn '+(v==='time'?'on':'off')+'" onclick="rcSwView=\'time\';rcSwRenderUI();">Time</button>'
      +'<button class="rc-view-btn '+(v==='course'?'on':'off')+'" onclick="rcSwView=\'course\';rcSwRenderUI();">Course</button>'
    +'</div>'
    +'<div class="rc-view-tog">'
      +'<button class="rc-view-btn '+(rcSwDensity==='compact'?'on':'off')+'" onclick="rcSwDensity=\'compact\';rcSwRenderUI();">Compact</button>'
      +'<button class="rc-view-btn '+(rcSwDensity==='detailed'?'on':'off')+'" onclick="rcSwDensity=\'detailed\';rcSwRenderUI();">Detailed</button>'
    +'</div>'
  +'</div>'
    +'<div style="display:flex;gap:6px;padding:0 2px 10px;flex-wrap:wrap;">'
    +filters.map(function(opt){
      const on=f===opt.k;
      return'<button onclick="rcSwFilter=\''+opt.k+'\';rcSwRenderUI();" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 11px;border-radius:20px;border:1px solid '+(on?'var(--blu)':'var(--bdr)')+';background:'+(on?'var(--blu)':'transparent')+';color:'+(on?'#fff':'var(--mut)')+';cursor:pointer;white-space:nowrap;">'+(opt.icon?opt.icon+' ':'')+opt.lbl+'</button>';
    }).join('')
    +'</div>';

  uiEl.innerHTML=html;

  const listEl=document.createElement('div');
  uiEl.appendChild(listEl);

  if(v==='time') rcSwRenderTime(listEl);
  else           rcSwRenderCourse(listEl);
}

function _rcFilterHorseNames(){
  if(rcSwFilter==='all') return null; // null = no filter
  const norm=function(s){return(s||'').toLowerCase().trim();};
  const today=td();
  if(rcSwFilter==='bets'){
    // Local bets use b.date (not b.bet_date)
    return new Set((D.bets||[]).filter(function(b){return b.date===today;}).map(function(b){return norm(b.horse);}));
  }
  if(rcSwFilter==='league'){
    // Picks live in _lgMyPicks {leagueId: pick[]} in leagues.js, each pick has pick_date + horse
    const picks=[];
    if(typeof _lgMyPicks!=='undefined'){
      Object.values(_lgMyPicks).forEach(function(arr){
        (arr||[]).forEach(function(p){if(p.pick_date===today)picks.push(norm(p.horse||''));});
      });
    }
    return new Set(picks.filter(Boolean));
  }
  if(rcSwFilter==='watchlist'){
    return new Set((D.watchlist||[]).map(function(e){return norm(e.horse);}));
  }
  return null;
}

function _rcRaceMatchesFilter(r){
  const names=_rcFilterHorseNames();
  if(!names) return true;
  const runners=r.runners||r.horses||[];
  return runners.some(function(h){
    const n=(h.horse||h.name||h.horseName||'').toLowerCase().trim();
    return names.has(n);
  });
}

function rcSwRenderTime(listEl){
  _rcSwFlatRaces=[];
  // Flatten all races
  const allRaces=[];
  rcSwCurrentRaces.forEach(function(meeting){
    const course=meeting.course||meeting.venue||'Unknown';
    if(meeting.runners){
      allRaces.push({...meeting,_course:course});
    } else {
      (meeting.races||[]).forEach(function(r){allRaces.push({...r,_course:course});});
    }
  });
  allRaces.sort(function(a,b){
    return timeToMins(a.off||a.off_time||a.time||'') - timeToMins(b.off||b.off_time||b.time||'');
  });
  const filteredRaces=allRaces.filter(_rcRaceMatchesFilter);
  const nowMins=new Date().getHours()*60+new Date().getMinutes();
  const upcoming=[],past=[];
  filteredRaces.forEach(function(r){
    const mins=timeToMins(r.off||r.off_time||r.time||'');
    if(mins===9999||(mins-nowMins)>-5) upcoming.push(r);
    else past.push(r);
  });
  if(!filteredRaces.length){
    const emptyMsg=rcSwFilter==='all'?'No races today.':'No races today matching this filter.';
    listEl.innerHTML='<div class="rc-empty">'+emptyMsg+'</div>'; return;
  }

  // First upcoming race gets the NEXT badge; mark the closest future race
  const nextIdx=upcoming.findIndex(function(r){
    return timeToMins(r.off||r.off_time||r.time||'')>=nowMins;
  });

  let html=upcoming.map(function(r,i){
    return rcSwRaceCardPreview(r, r._course||r.course||'', i===nextIdx&&nextIdx>=0);
  }).join('');

  if(!upcoming.length){
    html='<div class="rc-empty" style="padding:20px 0;">All races have finished for today.</div>';
  }

  if(past.length){
    html+='<div class="rc-earlier-lbl" onclick="var n=this.nextElementSibling;n.style.display=n.style.display===\'none\'?\'block\':\'none\';" style="cursor:pointer;user-select:none;">'
      +'Earlier today <span style="font-size:10px;color:var(--mut);">('+(past.length)+') ›</span>'
    +'</div>'
    +'<div style="display:none;">'
      +past.map(function(r){ return rcSwRaceCardPreview(r, r._course||r.course||'', false, true); }).join('')
    +'</div>';
  }

  listEl.innerHTML=html;
}

let _rcSwOpenCourse='';

function rcSwToggleCourse(el){
  const course=el.getAttribute('data-course');
  _rcSwOpenCourse=_rcSwOpenCourse===course?'':course;
  const uiEl=document.getElementById('sw-rc-ui');
  if(uiEl){
    const lists=uiEl.getElementsByTagName('div');
    for(let i=0;i<lists.length;i++){
      if(lists[i].getAttribute('data-course-list')){
        rcSwRenderCourse(lists[i]);
        return;
      }
    }
  }
}

function rcSwRenderCourse(listEl){
  _rcSwFlatRaces=[];
  listEl.setAttribute('data-course-list','1');
  const meetings={};
  rcSwCurrentRaces.forEach(function(meeting){
    const course=meeting.course||meeting.venue||'Unknown';
    if(meeting.runners){
      if(!meetings[course])meetings[course]=[];
      meetings[course].push(meeting);
    } else {
      (meeting.races||[]).forEach(function(r){
        if(!meetings[course])meetings[course]=[];
        meetings[course].push(r);
      });
    }
  });
  const sorted=Object.keys(meetings).sort(function(a,b){
    const ca=rcCourseCountry(a),cb=rcCourseCountry(b);
    const order={eng:0,sco:0,wal:0,ie:1,aus:2,fra:3,ger:4,rsa:5,usa:6,intl:99};
    const oa=order[ca]!=null?order[ca]:50,ob=order[cb]!=null?order[cb]:50;
    if(oa!==ob)return oa-ob;
    return a.localeCompare(b);
  });
  const filteredSorted=rcSwFilter==='all'?sorted:sorted.filter(function(course){
    return meetings[course].some(_rcRaceMatchesFilter);
  });
  if(!filteredSorted.length){
    listEl.innerHTML='<div class="rc-empty">No races today matching this filter.</div>'; return;
  }
  listEl.innerHTML=filteredSorted.map(function(course){
    const races=meetings[course].slice().sort(function(a,b){
      return cmpTime(a.off||a.off_time||a.time||'',b.off||b.off_time||b.time||'');
    }).filter(function(r){return rcSwFilter==='all'||_rcRaceMatchesFilter(r);});
    const isOpen=_rcSwOpenCourse===course;
    const flag=rcCountryFlag(rcCourseCountry(course));
    const type=rcMeetingType(races);
    const span=rcTimeSpan(races);
    const count=races.length;
    const escapedCourse=course.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return '<div class="rc-meeting">'
      +'<div class="rc-meeting-hdr rc-mtg-blue" data-course="'+escapedCourse+'" onclick="rcSwToggleCourse(this)">'
        +'<span class="rc-meeting-flag">'+flag+'</span>'
        +'<div class="rc-meeting-info">'
          +'<div class="rc-mtg-course" style="display:flex;align-items:center;gap:7px;">'+course+(function(){const s=_rcCourseStats(course);return s?' '+s:'';})()+'</div>'
          +'<div class="rc-mtg-meta">'+type+' · '+count+' race'+(count!==1?'s':'')+(span?' · '+span:'')+'</div>'
        +'</div>'
        +'<span class="rc-meeting-chevron'+(isOpen?' open':'')+'" >›</span>'
      +'</div>'
      +(isOpen
        ? '<div class="rc-meeting-body">'
            +races.map(function(r){return rcSwFullRaceCard(r,course);}).join('')
          +'</div>'
        : '')
      +'</div>';
  }).join('');
}

// ── Race class chip (shared) ──────────────────────────────────────────────────
function _rcClassChip(raceName, raceClass){
  const _n=raceName||'';
  const _c=String(raceClass||'').trim().replace(/^class\s*/i,'');
  // Detect group/listed from race name only
  const isG1=/group\s*1|\bg1\b/i.test(_n);
  const isG2=/group\s*2|\bg2\b/i.test(_n);
  const isG3=/group\s*3|\bg3\b/i.test(_n);
  const isL=/\blisted\b/i.test(_n);
  const chips=[];
  // Class chip — always show if we have a class number
  if(_c){
    chips.push({lbl:'C'+_c,col:'rgba(255,255,255,.55)'});
  }
  // Group/Listed chip — from race name
  if(isG1)chips.push({lbl:'G1',col:'#f59e0b'});
  else if(isG2)chips.push({lbl:'G2',col:'#f59e0b'});
  else if(isG3)chips.push({lbl:'G3',col:'#a78bfa'});
  else if(isL)chips.push({lbl:'Listed',col:'#a78bfa'});
  if(!chips.length)return'';
  return chips.map(function(ch){
    return'<span style="font-size:9px;font-weight:800;letter-spacing:.04em;padding:1px 5px;border-radius:3px;background:'+ch.col+'18;border:1px solid '+ch.col+'40;color:'+ch.col+';flex-shrink:0;">'+ch.lbl+'</span>';
  }).join(' ');
}

// ── Course strike-rate badge ───────────────────────────────────────────────────
function _rcCourseStats(course){
  const norm=function(c){return(c||'').toLowerCase().replace(/\s*\(aw\)/i,'').replace(/\s*\([a-z]+\)/i,'').trim();};
  const cn=norm(course);
  const bets=(D.bets||[]).filter(function(b){
    return b.result&&b.result!=='pending'&&b.result!=='nr'&&norm(b.track)===cn;
  });
  if(!bets.length)return null;
  const total=bets.length;
  const wins=bets.filter(function(b){return b.result==='won'||b.result==='win';}).length;
  const places=bets.filter(function(b){return b.result==='placed'||b.result==='place';}).length;
  const wr=wins/total;
  // Colour: green ≥20% wins, amber any win or ≥20% places, red no wins/places from ≥4 bets
  let col,bg;
  if(wr>=0.2){col='#4ade80';bg='rgba(22,163,74,.18)';}
  else if(wins>0||(places/total)>=0.2){col='#fbbf24';bg='rgba(245,158,11,.15)';}
  else if(total>=4){col='#f87171';bg='rgba(220,38,38,.14)';}
  else{col='var(--mut)';bg='rgba(255,255,255,.06)';}
  const label=(wins?wins+'W':'0W')+(places?' '+places+'P':'')+(total?' / '+total+'R':'');
  return'<span style="font-size:9px;font-weight:800;letter-spacing:.05em;padding:2px 7px;border-radius:5px;background:'+bg+';color:'+col+';border:1px solid '+col+'28;white-space:nowrap;">'+label+'</span>';
}

// Store flattened races for index-based onclick access
let _rcSwFlatRaces = [];
// Strip country suffix from horse names e.g. "Horse Name (IRE)" -> "Horse Name"
function stripCountrySuffix(name){
  return (name||'').replace(/\s*\([A-Z]{2,3}\)\s*$/,'').trim();
}



function rcSwRaceCardPreview(r, course, isNext, isPast){
  const time=r.off||r.off_time||r.time||'—';
  const name=r.race_name||r.name||r.title||'';
  const flag=rcCountryFlag(rcCourseCountry(course));
  const activeRunners=(r.runners||r.horses||[]).filter(function(h){
    return !(h.non_runner||h.isNonRunner||(''+h.number).toUpperCase()==='NR');
  }).length;
  const idx=_rcSwFlatRaces.length;
  _rcSwFlatRaces.push({race:r, course:course});
  const uid='rcr-'+idx;
  return '<div class="rc-meeting"'+(isPast?' style="opacity:.38;"':'')+'>'
    +'<div class="rc-meeting-hdr rc-mtg-blue" onclick="rcSwToggleFlatRace('+idx+')">'
      +'<span class="rc-meeting-flag">'+flag+'</span>'
      +'<div class="rc-meeting-info">'
        +'<div style="display:flex;align-items:baseline;gap:10px;">'
          +'<span class="rc-mtg-course" style="letter-spacing:.5px;">'+(isNext?'<span class="rc-next-badge" style="vertical-align:middle;">NEXT</span> ':'')+time+'</span>'
          +'<span class="rc-mtg-course" style="color:rgba(255,255,255,.9);letter-spacing:.2px;display:inline-flex;align-items:center;gap:6px;">'+course+(function(){const s=_rcCourseStats(course);return s?' '+s:'';})()+'</span>'
        +'</div>'
        +'<div class="rc-mtg-meta">'+activeRunners+' runners'+(name?' · '+name:'')+'</div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
        +'<button onclick="event.stopPropagation();rcSlStartFromFlat('+idx+')" title="Shortlist runners" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.15);color:#fff;cursor:pointer;flex-shrink:0;padding:0;">'
          +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
        +'</button>'
        +'<span id="rcfc-chev-'+idx+'" class="rc-meeting-chevron">›</span>'
      +'</div>'
    +'</div>'
    +'<div id="'+uid+'" style="display:none;"></div>'
    +'</div>';
}

function rcSwFullRaceCard(r, course){
  const time=r.off||r.off_time||r.time||'—';
  const name=r.race_name||r.name||r.title||'Race';
  const runners=(r.runners||r.horses||[]);
  const nrCount=runners.filter(function(h){return !!(h.non_runner||h.isNonRunner||(''+h.number).toUpperCase()==='NR');}).length;
  const runnerCount=runners.length-nrCount;
  const idx=_rcSwFlatRaces.length;
  _rcSwFlatRaces.push({race:r, course:course});
  const uid='rcr-'+idx;
  return '<div class="rc-race-row">'
    +'<div onclick="rcSwToggleFlatRace('+idx+')" class="rc-race-hdr">'
      +'<div class="rc-race-hdr-left">'
        +'<div class="rc-race-time">'+time+'</div>'
        +'<div class="rc-race-name">'+name+'</div>'
        +'<div class="rc-race-meta" style="display:flex;align-items:center;gap:5px;">'+_rcClassChip(r.race_name||r.name||r.title,r.race_class||r.class)+' <span class="rc-race-count">'+runnerCount+' runners'+(nrCount?' ('+nrCount+' NR)':'')+'</span></div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
        +'<button onclick="event.stopPropagation();rcSlStartFromFlat('+idx+')" title="Shortlist runners" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);cursor:pointer;flex-shrink:0;padding:0;">'
          +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
        +'</button>'
        +'<span id="rcfc-chev-'+idx+'" class="rc-chev">›</span>'
      +'</div>'
    +'</div>'
    +'<div id="'+uid+'" style="display:none;"></div>'
    +'</div>';
}

function rcSwToggleFlatRace(idx){
  const el=document.getElementById('rcr-'+idx);
  const chev=document.getElementById('rcfc-chev-'+idx);
  if(!el)return;
  const open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  if(chev){chev.style.transform=open?'':'rotate(90deg)';chev.style.color=open?'#9ca3af':'#3b82f6';}
  if(!open&&!el.dataset.rendered){
    const entry=_rcSwFlatRaces[idx];
    if(entry){
      // Temporarily put race in rcSwRacesByMeeting so rcSwRenderRunners can find it
      if(!rcSwRacesByMeeting[entry.course])rcSwRacesByMeeting[entry.course]=[];
      const tempIdx=rcSwRacesByMeeting[entry.course].length;
      rcSwRacesByMeeting[entry.course].push(entry.race);
      rcSwRenderRunners(tempIdx, entry.course, el);
    }
    el.dataset.rendered='1';
  }
}


// Country detection helpers
const ENG_COURSES=['aintree','ascot','bath','beverley','brighton','carlisle','cartmel','catterick','chelmsford','cheltenham','chester','doncaster','epsom','exeter','fakenham','fontwell','goodwood','haydock','hereford','hexham','huntingdon','kempton','leicester','lingfield','ludlow','market rasen','newbury','newcastle','newmarket','newton abbot','nottingham','plumpton','pontefract','redcar','ripon','salisbury','sandown','sedgefield','southwell','stratford','taunton','thirsk','uttoxeter','warwick','wetherby','wincanton','windsor','wolverhampton','worcester','yarmouth','york'];
const SCO_COURSES=['ayr','hamilton','kelso','musselburgh','perth'];
const WAL_COURSES=['bangor','bangor-on-dee','chepstow','ffos las'];
const IRE_COURSES=['curragh','leopardstown','naas','navan','gowran park','galway','tipperary','cork','killarney','listowel','down royal','downpatrick','dundalk','fairyhouse','kilbeggan','laytown','limerick','roscommon','sligo','tramore','thurles','punchestown','ballinrobe','bellewstown','clonmel','wexford'];
const GER_COURSES=['cologne','baden-baden','hamburg'];
const USA_COURSES=['santa anita','saratoga'];
const FRA_COURSES=['longchamp','auteuil','chantilly','saint-cloud','saint cloud','deauville'];
const AUS_COURSES=['eagle farm','flemington','randwick','moonee valley','caulfield','morphettville'];
const RSA_COURSES=['greyville','turffontein','kenilworth'];

function rcCourseCountry(course){
  const c=(course||'').toLowerCase().trim();
  // Ascot exists in both England and Australia — always resolve to England
  if(c==='ascot'||c==='ascot (berkshire)')return'eng';
  if(SCO_COURSES.some(k=>k==='perth'?(c===k||c.startsWith(k+' ')||c.endsWith(' '+k)):c.includes(k)))return'sco';
  if(WAL_COURSES.some(k=>c.includes(k)))return'wal';
  if(ENG_COURSES.some(k=>c.includes(k)))return'eng';
  if(IRE_COURSES.some(k=>c.includes(k)))return'ie';
  if(GER_COURSES.some(k=>c.includes(k)))return'ger';
  if(USA_COURSES.some(k=>c.includes(k)))return'usa';
  if(FRA_COURSES.some(k=>c.includes(k)))return'fra';
  if(AUS_COURSES.some(k=>c.includes(k)))return'aus';
  if(RSA_COURSES.some(k=>c.includes(k)))return'rsa';
  if(c.includes('(aw)'))return'eng';
  return'intl';
}

function rcCountryFlag(code){
  if(code==='eng')return'🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if(code==='sco')return'🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  if(code==='wal')return'🏴󠁧󠁢󠁷󠁬󠁳󠁿';
  if(code==='ie')return'🇮🇪';
  if(code==='ger')return'🇩🇪';
  if(code==='usa')return'🇺🇸';
  if(code==='fra')return'🇫🇷';
  if(code==='aus')return'🇦🇺';
  if(code==='rsa')return'🇿🇦';
  return'🌍';
}

function rcMeetingType(races){
  const types=new Set(races.map(r=>(r.type||r.race_type||r.flat_or_jumps||'').toLowerCase()).filter(Boolean));
  if(types.has('jumps')||types.has('chase')||types.has('hurdle'))return types.has('flat')?'Mixed':'Jumps';
  return 'Flat';
}

function rcTimeSpan(races){
  const times=races.map(r=>r.off||r.off_time||r.time||'').filter(Boolean).sort((a,b)=>cmpTime(a,b));
  if(!times.length)return'';
  return times.length===1?times[0]:times[0]+' – '+times[times.length-1];
}


let rcSwOpenMeeting='';

function rcSwToggleMeeting(course){
  const safeId=course.replace(/\W/g,'_');
  const racesEl=document.getElementById('swmtg-races-'+safeId);
  const chevEl=document.getElementById('swmtg-chev-'+safeId);
  if(!racesEl)return;
  const isOpen=racesEl.style.display!=='none';
  // Close all
  document.querySelectorAll('[id^="swmtg-races-"]').forEach(function(el){el.style.display='none';});
  document.querySelectorAll('[id^="swmtg-chev-"]').forEach(function(el){el.style.transform='';el.style.color='var(--mut)';});
  if(isOpen){rcSwOpenMeeting='';return;}
  // Open this
  rcSwOpenMeeting=course;
  racesEl.style.display='block';
  chevEl.style.transform='rotate(180deg)';chevEl.style.color='#93c5fd';
  if(!racesEl.dataset.rendered){
    rcSwRenderMeetingRaces(course, racesEl);
    racesEl.dataset.rendered='1';
  }
  const row=document.getElementById('swmtg-'+safeId);
  if(row)setTimeout(function(){row.scrollIntoView({behavior:'smooth',block:'start'});},60);
}

function rcSwRenderMeetingRaces(course, el){
  const safeId=course.replace(/\W/g,'_');
  const races=rcSwCurrentRaces.filter(r=>(r.course||r.venue||'Unknown')===course)
    .sort(function(a,b){return cmpTime(a.off||a.off_time||a.time||'',b.off||b.off_time||b.time||'');});
  rcSwSortedRaces=races;
  rcSwRacesByMeeting[course]=races;
  el.innerHTML=races.map(function(r,i){
    const time=r.off||r.off_time||r.time||'\u2014';
    const name=r.race_name||r.name||r.title||('Race '+(i+1));
    const dist=formatDist(r.distance_round||r.distance_f||r.distance||r.dist||'');
    const runners=(r.runners||r.horses||[]).length;
    const rname=name.toLowerCase();
    const isG1=rname.includes('group 1')||/\bg1\b/i.test(name);const isG2=rname.includes('group 2')||/\bg2\b/i.test(name);
    const isG3=rname.includes('group 3')||/\bg3\b/i.test(name);const isListed=rname.includes('listed');
    const nameCol=isG1||isG2?'#f59e0b':isG3?'#a78bfa':isListed?'#a78bfa':'var(--txt)';
    const classChip=_rcClassChip(name,r.race_class||r.class);
    const _rbt=getRaceBetType(course,time);
    const _betDot=_rbt==='real'
      ?'<span title="Real bet placed" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;margin-left:6px;box-shadow:0 0 0 2px rgba(59,130,246,.25);"></span>'
      :_rbt==='virt'
      ?'<span title="Virtual bet placed" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ea580c;flex-shrink:0;margin-left:6px;box-shadow:0 0 0 2px rgba(234,88,12,.25);"></span>'
      :'';
    return'<div id="sw-row-'+safeId+'-'+i+'" class="rc-race-row">'
      +'<div onclick="rcSwToggle('+i+',\''+course.replace(/\'/g,"\\'")+'\',\''+safeId+'\',true)" class="rc-race-hdr">'
        +'<div class="rc-race-hdr-left">'
          +'<div style="display:flex;align-items:center;">'
            +'<div class="rc-race-time">'+time+'</div>'
            +_betDot
          +'</div>'
          +'<div class="rc-race-meta-row">'+(dist?'<span class="rc-dist-chip">'+dist+'</span>':'')+(r.going?'<span class="rc-dist-chip" style="color:var(--mut);">'+r.going+'</span>':'')+classChip+' '+runners+' runners</div>'
          +'<div class="rc-race-name" style="color:'+nameCol+';">'+name+'</div>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
          +'<button onclick="event.stopPropagation();rcSlStartFromExpanded(\''+course.replace(/'/g,"\\'")+'\','+i+')" title="Shortlist runners" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);cursor:pointer;flex-shrink:0;padding:0;">'
            +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
          +'</button>'
          +'<span id="sw-chev-'+safeId+'-'+i+'" class="rc-chev">›</span>'
        +'</div>'
      +'</div>'
      +'<div class="rc-runners-inline" id="sw-runners-'+safeId+'-'+i+'" data-course="'+course+'" data-idx="'+i+'" style="display:none;"></div>'
    +'</div>';
  }).join('');
}

function rcSwSelectCourse(course){ rcSwToggleMeeting(course); }
function rcSwLoadRaces(course){ if(course)rcSwToggleMeeting(course); }
function rcSwToggle(idx, course, safeId, inMeeting){
  // Support old call signature (no safeId arg) gracefully
  if(typeof safeId === 'boolean'){inMeeting=safeId;safeId=course.replace(/\W/g,'_');}
  if(!safeId)safeId=course.replace(/\W/g,'_');
  const rEl=document.getElementById('sw-runners-'+safeId+'-'+idx);
  const cEl=document.getElementById('sw-chev-'+safeId+'-'+idx);
  if(!rEl)return;
  const open=rEl.style.display!=='none';
  // Only collapse runners within this meeting (not other meetings)
  document.querySelectorAll('[id^="sw-runners-'+safeId+'-"]').forEach(function(el){el.style.display='none';});
  document.querySelectorAll('[id^="sw-chev-'+safeId+'-"]').forEach(function(el){el.style.transform='';el.style.color='var(--mut)';});
  if(open)return;
  rEl.style.display='block';
  if(cEl){cEl.style.transform='rotate(90deg)';cEl.style.color='#3b82f6';}
  if(!rEl.dataset.rendered){rcSwRenderRunners(idx,course,rEl);rEl.dataset.rendered='1';}
  const row=document.getElementById('sw-row-'+safeId+'-'+idx);
  if(row)setTimeout(function(){row.scrollIntoView({behavior:'smooth',block:'start'});},50);
}

// Returns 'real', 'virt', or '' for whether any bet exists on a given race
function getRaceBetType(course, time){
  const today=td();
  const c=(course||'').trim().toLowerCase();
  const hasBet=function(bets){
    return (bets||[]).some(function(b){
      return b.date===today
        &&(!c||(b.track||'').trim().toLowerCase()===c||!b.track)
        &&(!time||b.time===time||b.raceTime===time||!b.time);
    });
  };
  if(hasBet(D.bets))return 'real';
  const vb=getVBank();
  if(hasBet((vb&&vb.bets)||[]))return 'virt';
  return '';
}

function getBetHighlight(horseName, course, time){
  const hn=(horseName||'').trim().toLowerCase();
  if(!hn)return '';
  const today=td();
  // Check real bets (blue)
  const realBet=D.bets.find(function(b){
    return b.date===today&&(b.horse||'').trim().toLowerCase()===hn&&(!course||(b.track||'').trim().toLowerCase()===(course||'').trim().toLowerCase()||!b.track)&&(!time||b.time===time||!b.time);
  });
  if(realBet)return 'background:rgba(96,165,250,.13);border-left:3px solid #60a5fa;';
  // Check virtual bets (orange)
  const vb=getVBank();
  const virtBet=(vb.bets||[]).find(function(b){
    return b.date===today&&(b.horse||'').trim().toLowerCase()===hn&&(!course||(b.track||'').trim().toLowerCase()===(course||'').trim().toLowerCase()||!b.track)&&(!time||b.time===time||!b.time);
  });
  if(virtBet)return 'background:rgba(251,146,60,.13);border-left:3px solid #fb923c;';
  return '';
}

function refreshRacecardHighlights(){
  document.querySelectorAll('[id^="sw-runners-"].rc-runners-inline').forEach(function(el){
    if(el.style.display!=='none'&&el.dataset.rendered){
      var course=el.dataset.course;
      var idx=parseInt(el.dataset.idx);
      if(course!=null&&!isNaN(idx)){
        delete el.dataset.rendered;
        rcSwRenderRunners(idx,course,el);
        el.dataset.rendered='1';
      }
    }
  });
}

function rcSwRenderRunners(idx, course, el){
  const race=(rcSwRacesByMeeting[course]||rcSwSortedRaces||[])[idx];if(!race){el.innerHTML='';return;}
  const runners=race.runners||race.horses||[];
  const time=race.off||race.off_time||race.time||'—';
  const dist=formatDist(race.distance_round||race.distance_f||race.distance||race.dist||race.distance_furlongs||race.distance_yards||'');
  const prize=race.prize||race.total_prize_money||'';
  const going=race.going||'';
  const raceClassRaw=String(race.race_class||race.class||'').trim().replace(/^class\s*/i,'');
  const raceClassVal=raceClassRaw?'Class '+raceClassRaw:'';
  const infoItems=[
    going        ? {lbl:'Going',    val:going}        : null,
    dist         ? {lbl:'Distance', val:dist}         : null,
    raceClassVal ? {lbl:'Class',    val:raceClassVal} : null,
    prize        ? {lbl:'Prize',    val:prize}        : null,
  ].filter(Boolean);
  let html=infoItems.length
    ? '<div class="rc-info-bar">'
        +infoItems.map(function(item){
          return '<div class="rc-info-item">'
            +'<div class="rc-info-lbl">'+item.lbl+'</div>'
            +'<div class="rc-info-val">'+item.val+'</div>'
            +'</div>';
        }).join('')
      +'</div>'
    : '';
  if(!runners.length){el.innerHTML=html+'<div class="rc-no-runners">No runners listed yet.</div>';return;}
  html+=runners.map(function(r,i){
    const name=stripCountrySuffix(r.horse||r.name||'—');
    const no=r.number||r.saddle_cloth||(i+1);
    const draw=(r.draw&&r.draw!==0&&r.draw!=='0')?'('+r.draw+')':'';
    const jock=fmtJockey(r.jockey||r.jockeyName);
    const trainer=r.trainer||r.trainerName||'—';
    const age=r.age?r.age+'yo':'';
    const form=r.form||'';
    const rpr=r.ofr||r.rpr||r.official_rating||r.officialRating||r.or||'';
    const _wtRaw=r.weight||r.lbs||r.stone_lbs||r.weight_lbs||'';
    const wt=(function(){
      if(!_wtRaw)return'';
      // Already formatted (e.g. "9-0", "9st 0lb", "9.0")
      if(/[a-zA-Z\-]/.test(String(_wtRaw)))return String(_wtRaw);
      const n=parseInt(_wtRaw,10);
      if(isNaN(n))return String(_wtRaw);
      return Math.floor(n/14)+'st '+( n%14)+'lb';
    })();
    const isNR=!!(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR'||r.status==='non_runner'||(''+r.status).toLowerCase()==='nr'||(''+r.jockey).toUpperCase()==='NON-RUNNER');
    const _bh=isNR?'':getBetHighlight(name,course,time);
    const _wl2=getWL();const _nl2=(name||'').toLowerCase().trim();
    const _pr2=_wl2.find(function(w){return(w.horse||'').toLowerCase().trim()===_nl2;});
    const _PM2={'eye-catcher':{emoji:'👁',col:'#a78bfa'},'future-target':{emoji:'📰',col:'#34d399'},'trainer-intel':{emoji:'🗣',col:'#38bdf8'},'form-study':{emoji:'📊',col:'#f59e0b'},'tip-source':{emoji:'💡',col:'#fb7185'}};
    const _pm2=_pr2?_PM2[_pr2.reason||'eye-catcher']:null;
    const _qr2=(_pr2&&_pr2.myRating)?{mr:_pr2.myRating}:(D.ratings&&D.ratings[_nl2]);
    const pid='sw-profile-'+course.replace(/\W/g,'_')+'-'+i;
    const _profileStrip=(!isNR&&!_bh&&_pm2)?'border-left:3px solid '+_pm2.col+';padding-left:11px;':'';
    return'<div class="rc-runner'+(isNR?' rc-runner-nr':_bh?(_bh.includes('96,165')?' rc-runner-bet-real':' rc-runner-bet-virt'):'')+'" style="'+_profileStrip+'">'
      +(isNR
        ?'<div class="rc-cloth"><span class="rc-nr-chip">NR</span></div>'
        :'<div class="rc-cloth"><span>'+no+'</span></div>'
         +((r.silk_url||r.silk)?'<img src="'+(r.silk_url||r.silk)+'" alt="" width="44" height="44" style="object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">':''))
      +'<div class="rc-runner-body">'
        +(function(){
          const _wl=getWL();const _nl=(name||'').toLowerCase().trim();
          const _pr=_wl.find(function(w){return(w.horse||'').toLowerCase().trim()===_nl;});
          const _PM={'eye-catcher':{emoji:'👁',col:'#a78bfa'},'future-target':{emoji:'📰',col:'#34d399'},'trainer-intel':{emoji:'🗣',col:'#38bdf8'},'form-study':{emoji:'📊',col:'#f59e0b'},'tip-source':{emoji:'💡',col:'#fb7185'}};
          const _pm=_pr?_PM[_pr.reason||'eye-catcher']:null;
          const _badge='';
          const _nc=isNR?'var(--mut)':_pr?_pm.col:'var(--txt)';
          // Bet chip for this runner
          const _today=td();
          const _hn2=(name||'').toLowerCase().trim();
          const _realB=(D.bets||[]).find(function(b){return b.date===_today&&(b.horse||'').toLowerCase().trim()===_hn2;});
          const _virtB=((getVBank().bets)||[]).find(function(b){return b.date===_today&&(b.horse||'').toLowerCase().trim()===_hn2;});
          const _anyB=_realB||_virtB;
          const _isVirtB=!_realB&&!!_virtB;
          const _betChip=(function(){
            if(!_anyB)return'';
            const _stk=parseFloat(_anyB.stake)||0;
            const _bt=_anyB.betType||'win';
            const _od=_anyB.oddsDisplay||(_anyB.odds?decToFrac(_anyB.odds):'');
            const _btLbl={win:'Win',ew:'E/W',place:'Place'}[_bt]||_bt;
            const _col=_isVirtB?'#fb923c':'#60a5fa';
            const _bg=_isVirtB?'rgba(251,146,60,.15)':'rgba(96,165,250,.15)';
            const _bdr=_isVirtB?'rgba(251,146,60,.35)':'rgba(96,165,250,.35)';
            const _pend=!_anyB.result||_anyB.result==='pending';
            const _pnl=_pend?null:(parseFloat(_anyB.returns||0)-_stk);
            const _suffix=_pend?'':(_pnl>=0?' +£'+_pnl.toFixed(2):' -£'+Math.abs(_pnl).toFixed(2));
            return'<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;background:'+_bg+';border:1px solid '+_bdr+';color:'+_col+';border-radius:5px;padding:2px 6px;margin-left:5px;letter-spacing:.01em;">'
              +(_isVirtB?'V ':'')+'£'+_stk.toFixed(2)+' '+_btLbl+(_od?' @ '+_od:'')
              +(_suffix?'<span style="opacity:.8;">'+_suffix+'</span>':'')
              +'</span>';
          }());
          const _hg=r.headgear||r.head_gear||'';
          return'<div class="rc-runner-name-row">'
            +'<span class="rc-runner-name'+(isNR?' rc-runner-name-nr':'')+'">'+name+'</span>'
            +(_hg?'<span style="font-size:10px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:4px;padding:1px 5px;margin-left:3px;letter-spacing:.03em;">'+_hg+'</span>':'')
            +(age?'<span class="rc-runner-age" style="font-size:0.72em;color:var(--mut);margin-left:4px;">'+age+'</span>':'')
            +(rpr?'<span class="rc-or">'+rpr+'</span>':'')
            +(!isNR?'<span onclick="rcQuickRate(event,\''+name.replace(/'/g,"\\'")+'\',\''+rpr+'\')" class="rc-mr-chip'+((_qr2)?' rc-mr-chip-set':'')+'" title="Log My Rating">MR '+(_qr2?_qr2.mr:'—')+'</span>':'')
            +(_badge?'<span class="rc-wl-pill">'+_pm.svg+'</span>':'')
            +_betChip
            +(draw?'<span class="rc-runner-age">'+draw+'</span>':'')
          +'</div>'
          +(form
            ?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Form</span><span class="rc-runner-form" style="margin-bottom:0;">'+form+'</span></div>'
            :'');
        }())
        +((jock||trainer)?'<div class="rc-runner-detail-row">'+(jock?'<span class="rc-detail-lbl">J</span><span class="rc-runner-jt">'+jock+(r.jockey_rtf?'<span style="margin-left:5px;font-size:10px;color:var(--mut);">'+r.jockey_rtf+'</span>':'')+'</span>':'')+(trainer?'<span class="rc-detail-lbl" style="margin-left:8px;">T</span><span class="rc-runner-jt">'+trainer+(r.trainer_rtf?'<span style="margin-left:5px;font-size:10px;color:var(--mut);">'+r.trainer_rtf+'</span>':'')+'</span>':'')+'</div>':'')
      +'</div>'
      +'<div class="rc-runner-actions">'
        +(isNR?''
          :'<button onclick="rcSwBet(event,\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+(race.race_name||'').replace(/'/g,"\\'")+'\')\" class="rc-act-btn rc-bet-btn" title="Log a bet"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></button>')
        +(!isNR&&typeof _lgMyLeagues!=='undefined'&&_lgMyLeagues.length?'<button onclick="event.stopPropagation();lgPickFromRacecard(\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+(r.sp||r.price||r.odds||'')+'\')" title="Pick for League" class="rc-act-btn" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.08);color:#10b981;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></button>':'')
        +(_pr2&&!isNR?'<button onclick="rcToggleProfile(\''+pid+'\',this)" class="rc-profile-tog" style="border-color:'+_pm2.col+';color:'+_pm2.col+';">\u25bc</button>':'')
      +'</div>'
    +'</div>'
    +(function(){
      if(isNR)return _pr2?'<div id="'+pid+'" class="rc-profile-panel" style="display:none;">'+rcProfilePanelHtml(_pr2,pid)+'</div>':'';
      const _cmt=(r.comment||r.spotlight||'').trim();
      const _hasExtra=!!(trainer||wt||(r.dslr!=null&&r.dslr!=='')||r.owner||_cmt);
      const _dp=_hasExtra&&rcSwDensity==='detailed'
        ?'<div style="padding:8px 14px 10px;border-top:1px solid var(--bdr);background:rgba(0,0,0,.15);">'
          +(trainer?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Trainer</span><span class="rc-runner-jt">'+trainer+(r.trainer_rtf?'<span style="margin-left:5px;font-size:10px;color:var(--mut);">'+r.trainer_rtf+'</span>':'')+'</span></div>':'')
          +(wt?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Weight</span><span class="rc-runner-jt">'+wt+'</span></div>':'')
          +(r.dslr!=null&&r.dslr!==''?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Last run</span><span class="rc-runner-jt">'+r.dslr+' days ago</span></div>':'')
          +(r.owner?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Owner</span><span class="rc-runner-jt" style="color:var(--mut);">'+r.owner+'</span></div>':'')
          +(_cmt?'<div style="margin-top:6px;padding:7px 10px;border-radius:7px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);">'
            +'<div style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#f59e0b;margin-bottom:4px;">Spotlight</div>'
            +'<div style="font-size:12px;line-height:1.6;color:var(--txt);">'+_cmt+'</div>'
          +'</div>':'')
        +'</div>'
        :'';
      return _dp+(_pr2?'<div id="'+pid+'" class="rc-profile-panel" style="display:none;">'+rcProfilePanelHtml(_pr2,pid)+'</div>':'');
    }())
    +'</div>';

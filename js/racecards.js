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
let rcSwCurrentRaces=[], rcSwRacesByMeeting={}, rcSwView='time', _pendingRCBet=null;

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
    if(!window._todayMeetingsCache) window._todayMeetingsCache=await callRacingAPI('racecards/free',{});
    const data=window._todayMeetingsCache;
    rcSwCurrentRaces=data.racecards||data.races||[];
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
  let html='<div class="rc-view-tog" style="width:100%;">'
    +'<button class="rc-view-btn '+(v==='time'?'on':'off')+'" onclick="rcSwView=\'time\';rcSwRenderUI();">Time</button>'
    +'<button class="rc-view-btn '+(v==='course'?'on':'off')+'" onclick="rcSwView=\'course\';rcSwRenderUI();">Course</button>'
    +'</div>';

  uiEl.innerHTML=html;

  const listEl=document.createElement('div');
  uiEl.appendChild(listEl);

  if(v==='time') rcSwRenderTime(listEl);
  else           rcSwRenderCourse(listEl);
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
  const nowMins=new Date().getHours()*60+new Date().getMinutes();
  const upcoming=[],past=[];
  allRaces.forEach(function(r){
    const mins=timeToMins(r.off||r.off_time||r.time||'');
    // Upcoming = race hasn't started yet, or started within the last 5 minutes
    if(mins===9999||(mins-nowMins)>-5) upcoming.push(r);
    else past.push(r);
  });
  if(!allRaces.length){ listEl.innerHTML='<div class="rc-empty">No races today.</div>'; return; }

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
    // UK (eng/sco/wal) first, then others alphabetically by country, intl last
    const order={eng:0,sco:0,wal:0,ie:1,aus:2,fra:3,ger:4,rsa:5,usa:6,intl:99};
    const oa=order[ca]!=null?order[ca]:50,ob=order[cb]!=null?order[cb]:50;
    if(oa!==ob)return oa-ob;
    return a.localeCompare(b);
  });
  listEl.innerHTML=sorted.map(function(course){
    const races=meetings[course].slice().sort(function(a,b){
      return cmpTime(a.off||a.off_time||a.time||'',b.off||b.off_time||b.time||'');
    });
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
          +'<div class="rc-mtg-course">'+course+'</div>'

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
          +'<span class="rc-mtg-course" style="font-size:20px;letter-spacing:.5px;">'+(isNext?'<span class="rc-next-badge" style="vertical-align:middle;">NEXT</span> ':'')+time+'</span>'
          +'<span style="font-size:14px;font-weight:700;color:rgba(255,255,255,.9);letter-spacing:.2px;">'+course+'</span>'
        +'</div>'
        +'<div class="rc-mtg-meta">'+activeRunners+' runners'+(name?' · '+name:'')+'</div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
        +'<button onclick="event.stopPropagation();rcSlStartFromFlat('+idx+')" title="Shortlist runners" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.15);color:#fff;cursor:pointer;flex-shrink:0;padding:0;">'
          +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
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
        +'<div class="rc-race-meta"><span class="rc-race-count">'+runnerCount+' runners'+(nrCount?' ('+nrCount+' NR)':'')+'</span></div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
        +'<button onclick="event.stopPropagation();rcSlStartFromFlat('+idx+')" title="Shortlist runners" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid rgba(139,92,246,.5);background:rgba(139,92,246,.14);color:#7c3aed;cursor:pointer;flex-shrink:0;padding:0;">'
          +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
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
const GER_COURSES=['cologne','baden-baden'];
const USA_COURSES=['santa anita','saratoga'];
const FRA_COURSES=['longchamp','auteuil','chantilly'];
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
    const isG1=rname.includes('group 1');const isG2=rname.includes('group 2');
    const isG3=rname.includes('group 3');const isListed=rname.includes('listed');
    const nameCol=isG1||isG2?'#f59e0b':isG3?'#a78bfa':isListed?'#a78bfa':'var(--txt)';
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
          +'<div class="rc-race-meta-row">'+(dist?'<span class="rc-dist-chip">'+dist+'</span>':'')+runners+' runners</div>'
          +'<div class="rc-race-name" style="color:'+nameCol+';">'+name+'</div>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
          +'<button onclick="event.stopPropagation();rcSlStartFromExpanded(\''+course.replace(/'/g,"\\'")+'\','+i+')" title="Shortlist runners" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid rgba(139,92,246,.5);background:rgba(139,92,246,.14);color:#7c3aed;cursor:pointer;flex-shrink:0;padding:0;">'
            +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
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
  const dist=formatDist(race.distance_round||race.distance_f||race.distance||race.dist||'');
  const prize=race.prize||race.total_prize_money||'';
  const going=race.going||'';
  const infoItems=[
    going ? {lbl:'Going',    val:going} : null,
    dist  ? {lbl:'Distance', val:dist}  : null,
    prize ? {lbl:'Prize',    val:prize} : null,
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
    const draw=r.draw?'('+r.draw+')':'';
    const jock=fmtJockey(r.jockey||r.jockeyName);
    const trainer=r.trainer||r.trainerName||'—';
    const age=r.age?r.age+'yo':'';
    const form=r.form||'';
    const rpr=r.ofr||r.rpr||r.official_rating||r.officialRating||r.or||'';
    const isNR=!!(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR'||r.status==='non_runner'||(''+r.status).toLowerCase()==='nr'||(''+r.jockey).toUpperCase()==='NON-RUNNER');
    const _bh=isNR?'':getBetHighlight(name,course,time);
    const _wl2=getWL();const _nl2=(name||'').toLowerCase().trim();
    const _pr2=_wl2.find(function(w){return(w.horse||'').toLowerCase().trim()===_nl2;});
    const _PM2={'eye-catcher':{emoji:'👁',col:'#a78bfa'},'future-target':{emoji:'📰',col:'#34d399'},'trainer-intel':{emoji:'🗣',col:'#38bdf8'},'form-study':{emoji:'📊',col:'#f59e0b'},'tip-source':{emoji:'💡',col:'#fb7185'}};
    const _pm2=_pr2?_PM2[_pr2.reason||'eye-catcher']:null;
    const _qr2=D.ratings&&D.ratings[_nl2];
    const pid='sw-profile-'+course.replace(/\W/g,'_')+'-'+i;
    const _profileStrip=(!isNR&&!_bh&&_pm2)?'border-left:3px solid '+_pm2.col+';padding-left:11px;':'';
    return'<div class="rc-runner'+(isNR?' rc-runner-nr':_bh?(_bh.includes('96,165')?' rc-runner-bet-real':' rc-runner-bet-virt'):'')+'" style="'+_profileStrip+'">'
      +'<div class="rc-cloth">'+(isNR?'<span class="rc-nr-chip">NR</span>':'<span>'+no+'</span>')+'</div>'
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
          return'<div class="rc-runner-name-row">'
            +'<span class="rc-runner-name'+(isNR?' rc-runner-name-nr':'')+'">'+name+'</span>'
            +(age?'<span class="rc-runner-age" style="font-size:0.72em;color:var(--mut);margin-left:4px;">'+age+'</span>':'')
            +(rpr?'<span class="rc-or">'+rpr+'</span>':'')
            +(_badge?'<span class="rc-wl-pill">'+_pm.svg+'</span>':'')
            +(_qr2?'<span style="font-size:10px;font-weight:800;background:rgba(234,179,8,.18);color:#854d0e;border:1px solid rgba(234,179,8,.4);border-radius:6px;padding:2px 7px;margin-left:5px;">MR '+_qr2.mr+'</span>':'')
            +_betChip
            +(draw?'<span class="rc-runner-age">'+draw+'</span>':'')
          +'</div>'
          +(form
            ?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Form</span><span class="rc-runner-form" style="margin-bottom:0;">'+form+'</span></div>'
            :'');
        }())
        +(jock?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Jockey</span><span class="rc-runner-jt">'+jock+'</span></div>':'')
        +(trainer?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Trainer</span><span class="rc-runner-jt">'+trainer+'</span></div>':'')
      +'</div>'
      +'<div class="rc-runner-actions">'
        +(isNR?''
          :'<button onclick="rcSwBet(event,\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+(race.race_name||'').replace(/'/g,"\\'")+'\')\" class="rc-bet-btn">Bet</button>')
        +(!isNR&&typeof _lgMyLeagues!=='undefined'&&_lgMyLeagues.length?'<button onclick="event.stopPropagation();lgPickFromRacecard(\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+(r.sp||r.price||r.odds||'')+'\')" title="Pick for League" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:7px;border:1px solid rgba(16,185,129,.4);background:rgba(16,185,129,.08);color:#10b981;cursor:pointer;margin-left:4px;padding:0;font-size:13px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></button>':'')
        +(!isNR?'<button onclick="rcQuickRate(event,\''+name.replace(/'/g,"\\'")+'\',\''+rpr+'\')\" class="rc-rate-btn" title="Rate this horse" style="background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:#eab308;border-radius:7px;padding:5px 9px;font-size:13px;cursor:pointer;margin-left:4px;">\u2605</button>':'')
        +(_pr2&&!isNR?'<button onclick="rcToggleProfile(\''+pid+'\',this)" class="rc-profile-tog" style="border-color:'+_pm2.col+';color:'+_pm2.col+';">\u25bc</button>':'')
      +'</div>'
    +'</div>'
    +(_pr2?'<div id="'+pid+'" class="rc-profile-panel" style="display:none;">'+rcProfilePanelHtml(_pr2,pid)+'</div>':'')
    +'</div>';
  }).join('');
  el.innerHTML=html;
}

// ── Overlay flow: Racecard R/V → Checklist overlay → Log Bet overlay → back to Racecards ──
function rcSwBet(event, horse, course, time, jockey, trainer, raceName){
  event.stopPropagation();
  openBetFlow('real', horse, course, time, jockey, trainer, raceName);
}

function openPrebetOverlay(){
  resetCks();
  const overlay=document.getElementById('prebet-overlay');
  const src=document.getElementById('c_PREBET_OLD');
  if(src){
    // Move the actual card into the overlay so IDs are unique and events work
    src.style.display='block';
    src.style.position='static';
    src.style.height='auto';
    src.style.overflow='visible';
    const tgt=document.getElementById('pbo-content');
    if(tgt){tgt.innerHTML='';tgt.appendChild(src);}
  }
  const hEl=document.getElementById('pbo-horse');
  if(hEl&&_pendingRCBet){hEl.textContent='→ '+_pendingRCBet.horse+' · '+_pendingRCBet.course+' · '+_pendingRCBet.time;hEl.style.display='block';}
  overlay.style.display='block';
  document.body.style.overflow='hidden';
  renderPrebet();
  updCkScore();
}

function closePrebetOverlay(){
  const overlay=document.getElementById('prebet-overlay');
  // Return the pre-bet card to its original hidden home
  const src=document.getElementById('c_PREBET_OLD');
  const swShell=document.getElementById('sw-shell');
  if(src&&swShell){src.style.display='none';swShell.appendChild(src);}
  overlay.style.display='none';
  document.body.style.overflow='';
  _pendingRCBet=null;
}

// ─── LOG BET OVERLAY — edit-modal style ───────────────────────────────────────
// Renders a form identical in layout to #emod (the edit bet screen).
// Pre-fills from `prefill` ({horse,course,time,jockey,trainer}) and the
// bet-flow state for source/mode.  Saves via _lboSave().

function openLogbetOverlay(mode, prefill){
  const overlay=document.getElementById('logbet-overlay');
  if(!overlay)return;
  window._lboMode=mode; // stash for _lboSave — do not rely on _betFlowState which may lag
  const accentCol=mode==='virt'?'#fb923c':'#60a5fa';
  const typeLabel=mode==='virt'?'Virtual Bet':'Real Bet';

  // ── Update sticky header ──
  const solidCol=mode==='virt'?'#ea580c':'#1d4ed8';
  const hdrEl=document.getElementById('lbo-header');
  if(hdrEl)hdrEl.style.background=solidCol;

  const typeEl=document.getElementById('lbo-type-lbl');
  const titleEl=document.getElementById('lbo-title');
  const subEl=document.getElementById('lbo-horse-sub');
  const closeBtn=hdrEl&&hdrEl.querySelector('button');

  // Force white text regardless of any cached CSS/HTML state
  if(typeEl){typeEl.textContent=typeLabel;typeEl.style.color='rgba(255,255,255,.7)';}
  if(titleEl){titleEl.textContent=prefill&&prefill.horse?prefill.horse:'Log Bet';titleEl.style.color='#fff';}
  if(closeBtn){closeBtn.style.color='#fff';closeBtn.style.borderColor='rgba(255,255,255,.3)';closeBtn.style.background='rgba(255,255,255,.15)';}
  if(subEl){
    subEl.style.color='rgba(255,255,255,.75)';
    const parts=[];
    if(prefill&&prefill.time)parts.push(prefill.time);
    if(prefill&&prefill.course)parts.push(prefill.course);
    if(parts.length){subEl.textContent=parts.join(' · ');subEl.style.display='block';}
    else subEl.style.display='none';
  }

  // ── Source options ──
  const srcOpts=(function(){
    const saved=(D.settings&&D.settings.sources&&D.settings.sources.length)?D.settings.sources:[];
    const labels=saved.map(function(s){return typeof s==='object'?s.label:s;});
    const all=['Own Form Study'].concat(labels.filter(function(s){return s!=='Own Form Study';}));
    return all.map(function(s){return'<option value="'+s+'">'+s+'</option>';}).join('');
  })();

  // Determine pre-selected source from bet flow state
  const bfs=window._betFlowState||{};
  const preSrc=bfs.source==='tip'?(bfs.tipSource||'Own Form Study'):'Own Form Study';

  // ── Render edit-modal-style form into #lbo-content ──
  const tgt=document.getElementById('lbo-content');
  if(!tgt)return;
  tgt.innerHTML=
    '<div class="em-body" style="padding-bottom:100px;">'
    // Section 1 — Bet Details (coloured to match mode)
    +'<div class="em-section">'
      +'<div class="em-sec-hdr" style="background:'+solidCol+';border-bottom-color:rgba(255,255,255,.15);"><span class="em-sec-num" style="background:rgba(255,255,255,.2);color:#fff;">1</span><span class="em-sec-title" style="color:#fff;">Bet Details</span></div>'
      +'<div class="em-sec-body">'
        +'<div class="g2">'
          +'<div class="fg"><label>Horse</label><input type="text" id="lbo-f-horse" autocomplete="off" value="'+(prefill&&prefill.horse?_escAttr(prefill.horse):'')+'"></div>'
          +'<div class="fg"><label>Track</label><input type="text" id="lbo-f-track" autocomplete="off" value="'+(prefill&&prefill.course?_escAttr(prefill.course):'')+'"></div>'
          +'<div class="fg"><label>Time</label><input type="text" id="lbo-f-time" value="'+(prefill&&prefill.time?_escAttr(prefill.time):'')+'"></div>'
          +'<div class="fg"><label>Odds</label><input type="text" id="lbo-f-odds" style="font-family:monospace;" placeholder="e.g. 5/1" oninput="_lboResChange()"></div>'
          +'<div class="fg"><label>Confidence</label>'
            +'<select id="lbo-f-conf" onchange="_lboCalcStake()">'
            +'<option value="1">1 — Speculative</option>'
            +'<option value="2">2 — Interested</option>'
            +'<option value="3" selected>3 — Solid</option>'
            +'<option value="4">4 — Strong</option>'
            +'<option value="5">5 — Best Bet</option>'
            +'</select>'
          +'</div>'
          +'<div class="fg"><label>Type</label><select id="lbo-f-type" onchange="_lboResChange();_lboCalcStake()"><option value="win">Win</option><option value="ew">Each Way</option><option value="place">Place</option></select></div>'
          +'<div class="fg"><label>Jockey</label><input type="text" id="lbo-f-jockey" autocomplete="off" value="'+(prefill&&prefill.jockey?_escAttr(prefill.jockey):'')+'"></div>'
          +'<div class="fg"><label>Trainer</label><input type="text" id="lbo-f-trainer" autocomplete="off" value="'+(prefill&&prefill.trainer?_escAttr(prefill.trainer):'')+'"></div>'
        +'</div>'
        // Stake guide — tappable, updates on confidence/type change
        +'<div id="lbo-stake-guide" onclick="_lboApplyStake()" style="display:none;cursor:pointer;margin:10px 0 4px;padding:10px 14px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.25);border-radius:10px;"></div>'
        +'<div class="fg"><label>Stake (£)</label><input type="number" id="lbo-f-stake" step="0.5" min="0" oninput="_lboResChange();_lboCalcStake()"></div>'
        +'<div class="fg"><label>Source</label><select id="lbo-f-source">'+srcOpts+'</select></div>'
        +'<div class="fg"><label>Pre-Race Notes</label><textarea id="lbo-f-prenotes" style="min-height:52px" placeholder="Why are you backing this horse?"></textarea></div>'
      +'</div>'
    +'</div>'
    // Section 2 — Result (coloured to match mode)
    +'<div class="em-section">'
      +'<div class="em-sec-hdr" style="background:'+solidCol+';border-bottom-color:rgba(255,255,255,.15);"><span class="em-sec-num" style="background:rgba(255,255,255,.2);color:#fff;">2</span><span class="em-sec-title" style="color:#fff;">Result <span style="font-weight:400;color:rgba(255,255,255,.65);font-size:11px;">(optional — settle later)</span></span></div>'
      +'<div class="em-sec-body">'
        +'<div class="g2">'
          +'<div class="fg"><label>Result</label><select id="lbo-f-result" onchange="_lboResChange()"><option value="pending" selected>Pending</option><option value="win">Win</option><option value="place">Place (EW)</option><option value="loss">Loss</option><option value="void">Void</option><option value="nr">Non-Runner</option></select></div>'
          +'<div class="fg"><label>Returns (£)</label><input type="number" id="lbo-f-returns" step="0.01" min="0" placeholder="Auto-calculated"></div>'
        +'</div>'
        +'<div class="fg"><label>Post-Race Notes</label><textarea id="lbo-f-postnotes" placeholder="What happened? What did I learn?" style="min-height:52px"></textarea></div>'
      +'</div>'
    +'</div>'
    // Actions
    +'<div class="em-actions">'
      +'<button id="lbo-save-btn" data-mode="'+mode+'" class="em-save-btn" onclick="_lboSave()" style="background:'+solidCol+';color:#fff;">Log '+(mode==='virt'?'Virtual':'Real')+' Bet</button>'
      +'<button class="em-cancel-btn" onclick="_lboBackToChecklist()">← Back</button>'
    +'</div>'
    +'</div>';

  // Set source and trigger stake guide
  setTimeout(function(){
    const srcEl=document.getElementById('lbo-f-source');
    if(srcEl)srcEl.value=preSrc;
    _lboCalcStake();
  },50);

  overlay.style.display='block';
}

// Escape helper for HTML attribute values
function _escAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}

// Stake guide — mirrors calcStakeGuide() in utils.js but uses lbo-f-* field IDs
function _lboCalcStake(){
  const guideEl=document.getElementById('lbo-stake-guide');
  if(!guideEl)return;
  const conf=parseInt((document.getElementById('lbo-f-conf')||{value:'3'}).value)||3;
  const betType=(document.getElementById('lbo-f-type')||{value:'win'}).value;
  const stakeEl=document.getElementById('lbo-f-stake');
  const pv=typeof getPointValue==='function'?getPointValue():parseFloat((D.settings&&D.settings.pointValue)||5);
  const CONF_PTS_LOCAL=[1,1.5,2,2.5,3];
  const pts=CONF_PTS_LOCAL[conf-1]||2;
  const isEW=betType==='ew';
  const suggested=parseFloat((pts*pv).toFixed(2));
  const current=parseFloat(stakeEl&&stakeEl.value)||0;
  const _sb=document.getElementById('lbo-save-btn');
  const mode=(_sb&&_sb.getAttribute('data-mode'))||window._lboMode||'real';
  const accentCol=mode==='virt'?'#ea580c':'#60a5fa';

  if(!pv||pv<=0){
    guideEl.style.display='block';
    guideEl.innerHTML='<div style="font-size:12px;color:var(--gld);">⚠️ Set your point value in Settings → Staking Plan.</div>';
    return;
  }

  let html='<div style="display:flex;justify-content:space-between;align-items:center;">'
    +'<div>'
      +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-bottom:2px;">Suggested Stake</div>'
      +'<div style="font-family:monospace;font-size:20px;font-weight:700;color:'+accentCol+';">£'+suggested.toFixed(2)+'</div>'
      +'<div style="font-size:10px;color:var(--mut);margin-top:1px;">'+pts+'pt × £'+pv.toFixed(2)+'/pt'+(isEW?' · EW (£'+(suggested/2).toFixed(2)+' each leg)':'')+'</div>'
    +'</div>'
    +'<div style="text-align:right;">';
  if(current&&current!==suggested){
    const diffPts=(current/pv).toFixed(2);
    html+='<div style="font-size:11px;color:var(--mut);">Your entry: £'+current.toFixed(2)+'</div>'
      +'<div style="font-size:10px;color:var(--mut);">('+diffPts+'pts)</div>';
  } else {
    html+='<div style="font-size:11px;color:'+accentCol+';">Tap to apply →</div>';
  }
  html+='</div></div>';
  guideEl.innerHTML=html;
  guideEl.style.display='block';
  guideEl.style.borderColor=mode==='virt'?'rgba(234,88,12,.3)':'rgba(96,165,250,.25)';
  guideEl.style.background=mode==='virt'?'rgba(234,88,12,.08)':'rgba(96,165,250,.08)';
}

function _lboApplyStake(){
  const conf=parseInt((document.getElementById('lbo-f-conf')||{value:'3'}).value)||3;
  const pv=typeof getPointValue==='function'?getPointValue():parseFloat((D.settings&&D.settings.pointValue)||5);
  const CONF_PTS_LOCAL=[1,1.5,2,2.5,3];
  const pts=CONF_PTS_LOCAL[conf-1]||2;
  const suggested=parseFloat((pts*pv).toFixed(2));
  const stakeEl=document.getElementById('lbo-f-stake');
  if(stakeEl){stakeEl.value=suggested.toFixed(2);}
  _lboCalcStake();
  _lboResChange();
}

// Auto-calculate returns when result/odds/stake change
function _lboResChange(){
  const res=(document.getElementById('lbo-f-result')||{value:'pending'}).value;
  const odRaw=(document.getElementById('lbo-f-odds')||{value:''}).value.trim();
  const stake=parseFloat((document.getElementById('lbo-f-stake')||{value:0}).value)||0;
  const bt=(document.getElementById('lbo-f-type')||{value:'win'}).value;
  const retEl=document.getElementById('lbo-f-returns');
  if(!retEl)return;
  const od=fo(odRaw);
  if(res==='pending'||res==='void'||res==='nr'){retEl.value='';return;}
  if(stake>0&&od>=1){retEl.value=calcReturns(res,stake,od,bt,'');}
}

// Save the new bet from the overlay form
function _lboSave(){
  const horse=(document.getElementById('lbo-f-horse')||{value:''}).value.trim();
  const track=(document.getElementById('lbo-f-track')||{value:''}).value.trim();
  const time=(document.getElementById('lbo-f-time')||{value:''}).value.trim();
  const odRaw=(document.getElementById('lbo-f-odds')||{value:''}).value.trim();
  const stake=parseFloat((document.getElementById('lbo-f-stake')||{value:0}).value)||0;
  const bt=(document.getElementById('lbo-f-type')||{value:'win'}).value;
  const jockey=(document.getElementById('lbo-f-jockey')||{value:''}).value.trim();
  const trainer=(document.getElementById('lbo-f-trainer')||{value:''}).value.trim();
  const source=(document.getElementById('lbo-f-source')||{value:'Own Form Study'}).value;
  const conf=parseInt((document.getElementById('lbo-f-conf')||{value:'3'}).value)||3;
  const preNotes=(document.getElementById('lbo-f-prenotes')||{value:''}).value.trim();
  const result=(document.getElementById('lbo-f-result')||{value:'pending'}).value;
  const postNotes=(document.getElementById('lbo-f-postnotes')||{value:''}).value.trim();
  const od=fo(odRaw);
  if(!horse){alert('Enter a horse name.');return;}
  if(!stake||stake<=0){alert('Enter a valid stake.');return;}
  if(!od||od<1){alert('Enter valid odds — e.g. 5/1 or EVS');return;}

  // Resolve mode: primary = data-mode attr baked into save button at render time; fallback = window._lboMode
  const _saveBtn=document.getElementById('lbo-save-btn');
  const mode=(_saveBtn&&_saveBtn.getAttribute('data-mode'))||window._lboMode||'real';
  const _limit=D.settings&&D.settings.dailyLimit?D.settings.dailyLimit:5;
  if(mode==='real'){
    const _today=D.bets.filter(function(b){return b.date===td();}).length;
    if(_today>=_limit&&!confirm('⚠️ You\'ve reached your daily limit of '+_limit+' bets. Log anyway?'))return;
  }

  const autoRet=calcReturns(result,stake,od,bt,'');
  const returns=parseFloat((document.getElementById('lbo-f-returns')||{value:0}).value)||autoRet;

  const bet={
    id:gid(), date:td(), horse, track, time, jockey, trainer,
    odds:od, oddsDisplay:odRaw||String(od), stake, betType:bt,
    conf, source, notes:preNotes, postNotes,
    checklistScore:_pendingCkScore||0,
    checklistAnswers:Object.assign({},_pendingCkAnswers),
    result, returns, betBanked:false, createdAt:Date.now()
  };
  _pendingCkScore=0; _pendingCkAnswers={};

  if(mode==='virt'){
    const vb=getVBank();
    // Deduct stake; add returns if already settled at log time
    vb.current=parseFloat((vb.current-stake).toFixed(2));
    if(result&&result!=='pending'&&result!=='nr'&&result!=='void'){
      vb.current=parseFloat((vb.current+returns).toFixed(2));
    }
    vb.bets=vb.bets||[];
    vb.bets.push(bet);
  } else {
    // Pre-deduct stake from real bank immediately (applyBankDelta handles this via betBanked flag)
    applyBankDelta(bet,null,0);
    D.bets.push(bet);
  }

  save();
  updHdr();
  if(typeof flashHdrBalance==='function')flashHdrBalance(mode, stake);
  refreshRacecardHighlights();
  // Close and navigate
  closeLogbetOverlay();
  renderToday();
  if(typeof renderVBMini==='function')renderVBMini();
  if(typeof renderRealBankMini==='function')renderRealBankMini();
}

function closeLogbetOverlay(){
  const overlay=document.getElementById('logbet-overlay');
  // Return log bet card to its hidden home
  const src=document.getElementById('c_LOGBET_OLD');
  const swShell=document.getElementById('sw-shell');
  if(src&&swShell){src.style.display='none';swShell.appendChild(src);}
  overlay.style.display='none';
  const cb=document.getElementById('lbo-close-bar');if(cb)cb.style.display='none';
  const prebetOv=document.getElementById('prebet-overlay');if(prebetOv)prebetOv.style.display='none';
  document.body.style.overflow='';
  _pendingRCBet=null;
  // Return to Racecards card
  goTo(1);
}

function _lboBackToChecklist(){
  // Close the log bet overlay without navigating away
  const overlay=document.getElementById('logbet-overlay');
  if(overlay)overlay.style.display='none';
  const cb=document.getElementById('lbo-close-bar');if(cb)cb.style.display='none';
  const src=document.getElementById('c_LOGBET_OLD');
  const swShell=document.getElementById('sw-shell');
  if(src&&swShell){src.style.display='none';swShell.appendChild(src);}
  document.body.style.overflow='';
  // _betFlowClose() removed _bflow-ov from DOM — rebuild it then show checklist
  // openBetFlow recreates the shell; _betFlowShowChecklist then populates it
  if(typeof openBetFlow==='function'&&typeof _betFlowShowChecklist==='function'){
    const s=_betFlowState;
    openBetFlow(s.mode,s.horse,s.course,s.time,s.jockey,s.trainer,s.raceName);
    // openBetFlow shows source picker — skip it, go straight to checklist
    setTimeout(function(){
      if(s.source==='tip'&&s.tipSource){
        _flowActiveCKS=CKS_TIP;
      } else {
        _flowActiveCKS=CKS_OWN;
      }
      _betFlowShowChecklist();
    },50);
  }
}


let rcSwResultsData = [], rcSwResultsView = 'time', rcSwResultsOpenCourse = '';
const _rcResTimeOpen = {}; // tracks which time-view result races are expanded

function rcSwToggleResTime(idx){
  _rcResTimeOpen[idx] = !_rcResTimeOpen[idx];
  const body = document.getElementById('rcrt-body-'+idx);
  const chev = document.getElementById('rcrt-chev-'+idx);
  if(body){ body.style.display = _rcResTimeOpen[idx] ? 'block' : 'none'; }
  if(chev){ chev.style.transform = _rcResTimeOpen[idx] ? 'rotate(90deg)' : ''; }
}

// Look up OR for a horse name from today's racecard data
function rcGetOFR(horseName){
  const nl=(horseName||'').toLowerCase().trim();
  for(const race of rcSwCurrentRaces){
    for(const r of (race.runners||[])){
      if((r.horse||r.name||'').toLowerCase().trim()===nl){
        return r.ofr||r['or']||r.official_rating||r.officialRating||r.rpr||'';
      }
    }
  }
  return '';
}

async function rcSwLoadResults(){
  const stEl = document.getElementById('sw-results-status');
  const listEl = document.getElementById('sw-results-list');
  const filterEl = document.getElementById('sw-results-filters');
  if(rcSwResultsData.length){ rcSwRenderResultsUI(); return; }
  if(stEl){ stEl.style.display='block'; stEl.textContent='Loading results\u2026'; }
  if(listEl) listEl.innerHTML = '';
  if(filterEl) filterEl.style.display = 'none';
  try{
    const data = await callRacingAPI('results/today/free', {});
    rcSwResultsData = data.results||data.races||[];
    if(stEl) stEl.style.display = 'none';
    autoMatchBetResults(rcSwResultsData);
    if(!rcSwResultsData.length){
      if(listEl) listEl.innerHTML = '<div class="rc-empty">No results yet today — check back after the first race.</div>';
      return;
    }
    rcSwResultsOpenCourse = '';
    rcSwRenderResultsUI();
  }catch(e){
    if(stEl){ stEl.style.display='block'; stEl.textContent='\u26a0\ufe0f '+e.message; }
  }
}

function rcSwRenderResultsUI(){
  const filterEl = document.getElementById('sw-results-filters');
  if(!filterEl) return;

  const onT = rcSwResultsView==='time';
  const btnBase = 'font-family:var(--font-ui);font-size:10px;letter-spacing:.07em;text-transform:uppercase;padding:7px 18px;border:none;cursor:pointer;font-weight:700;transition:all .12s;';

  filterEl.style.display = 'block';
  const _rsb='font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;flex:1;padding:7px 12px;border:none;cursor:pointer;';
  filterEl.innerHTML =
    '<div class="rc-view-tog">'
    + '<button class="rc-view-btn '+(onT?'on':'off')+'" onclick="rcSwResultsView=\'time\';rcSwRenderResultsUI();">Time</button>'
    + '<button class="rc-view-btn '+(!onT?'on':'off')+'" onclick="rcSwResultsView=\'course\';rcSwResultsOpenCourse=\'\';rcSwRenderResultsUI();">Course</button>'
    + '</div>';

  const listEl = document.getElementById('sw-results-list');
  if(!listEl) return;

  if(rcSwResultsView === 'time'){
    rcSwRenderResultsTime(listEl);
  } else {
    rcSwRenderResultsCourse(listEl);
  }
}

function rcSwRaceCard(race, course){
  const time = race.off_time||race.off||race.time||'—';
  const name = race.race_name||race.name||'Race';
  const places = (race.runners||[]).slice(0,5);
  const todayBets=[...D.bets,...((D.vBank&&D.vBank.bets)||[])];
  const esc = function(s){return(s+'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"  );};
  return '<div class="rc-race-block">'
    + '<div class="rc-race-hdr" >'
      + '<div class="rc-race-hdr-left">'
        + '<div class="rc-race-time">'+time+'</div>'
        + '<div class="rc-race-name">'+name+'</div>'
      + '</div>'
      + '<span class="rc-race-count">'+places.length+' shown</span>'
    + '</div>'
    + places.map(function(r,i){
        const pos = r.position||r.place||(i+1);
        const horse = stripCountrySuffix(r.horse||r.name||'—');
        const jock = r.jockey||'';
        const trainer = r.trainer||'';
        const sp = r.sp||'';
        const ofr = r.ofr||r['or']||r.official_rating||r.officialRating||r.rpr||rcGetOFR(horse)||'';
        const posClass = pos==1?'rc-pos-1':pos==2?'rc-pos-2':pos==3?'rc-pos-3':'rc-pos-n';
        const hn = horse.toLowerCase().trim();
        const myBet = todayBets.find(function(b){return (b.horse||'').toLowerCase().trim()===hn;});
        const myBetPnl = myBet?(parseFloat(myBet.returns||0)-parseFloat(myBet.stake||0)):0;
        const betBadge = (function(){
          if(!myBet)return'';
          const _stk=parseFloat(myBet.stake)||0;
          const _bt=myBet.betType||'win';
          const _od=myBet.oddsDisplay||(myBet.odds?decToFrac(myBet.odds):'');
          const _btLbl={win:'Win',ew:'E/W',place:'Place'}[_bt]||_bt;
          const _isVirt=!!(myBet.is_virtual||myBet._virt);
          const _pending=!myBet.result||myBet.result==='pending';
          const _won=myBet.result==='win'||myBet.result==='place';
          const _col=_pending?(_isVirt?'#fb923c':'#60a5fa'):_won?'#4ade80':'#f87171';
          const _bg=_pending?(_isVirt?'rgba(251,146,60,.15)':'rgba(96,165,250,.15)'):_won?'rgba(74,222,128,.15)':'rgba(248,113,113,.15)';
          const _bdr=_pending?(_isVirt?'rgba(251,146,60,.35)':'rgba(96,165,250,.35)'):_won?'rgba(74,222,128,.35)':'rgba(248,113,113,.35)';
          const _pnlStr=_pending?'':myBetPnl>=0?' +£'+myBetPnl.toFixed(2):' -£'+Math.abs(myBetPnl).toFixed(2);
          return'<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;background:'+_bg+';border:1px solid '+_bdr+';color:'+_col+';border-radius:5px;padding:2px 6px;margin-left:5px;letter-spacing:.01em;">'
            +(_isVirt?'V ':'')+'£'+_stk.toFixed(2)+' '+_btLbl+(_od?' @ '+_od:'')
            +(_pnlStr?'<span style="opacity:.85;">'+_pnlStr+'</span>':'')
            +'</span>';
        }());
        const wlEntry = getWL().find(function(w){return(w.horse||'').toLowerCase().trim()===hn;});
        const _rGoing = esc(race.going||race.going_description||'');
        const _rDate  = esc(race.date||td());
        const _rDist  = esc(race.distance_f||race.distance_round||race.distance||'');
        const _rPos   = String(pos);
        const watchBtn = wlEntry
          ? '<button class="rc-watch-btn rc-watch-btn-on">\u2713 Watching</button>'
          : '<button onclick="rcAddToWatchlist(\''+esc(horse)+'\',\''+esc(course)+'\',\''+esc(jock)+'\',\''+esc(trainer)+'\',\''+esc(name)+'\',\''+esc(ofr)+'\',\''+_rGoing+'\',\''+esc(time)+'\',\''+_rDate+'\',\''+_rDist+'\',\''+_rPos+'\')" class="rc-watch-btn rc-watch-btn-add">+ Watch</button>';
        const _qrRes=D.ratings&&D.ratings[hn];
        const _mrBadgeRes=_qrRes?'<span style="font-size:10px;font-weight:800;background:rgba(234,179,8,.18);color:#854d0e;border:1px solid rgba(234,179,8,.4);border-radius:6px;padding:2px 7px;margin-left:5px;">MR '+_qrRes.mr+'</span>':'';
        const rateBtnRes='<button onclick="rcQuickRate(event,\''+esc(horse)+'\',\''+esc(ofr)+'\')" class="rc-rate-btn" title="Rate this horse" style="background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:#eab308;border-radius:7px;padding:5px 9px;font-size:13px;cursor:pointer;margin-left:4px;">\u2605</button>';
        return '<div class="rc-res-runner">'
          + '<span class="rc-pos '+posClass+'">'+pos+'</span>'
          + '<div class="rc-runner-main">'
            + '<div class="rc-runner-name-row">'
              + '<span class="rc-runner-name">'+horse+'</span>'
              + (ofr?'<span class="rc-or">'+ofr+'</span>':'')
              + _mrBadgeRes
              + betBadge
            + '</div>'
            + (jock?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Jockey</span><span class="rc-runner-jt">'+jock+'</span></div>':'')
            + (trainer?'<div class="rc-runner-detail-row"><span class="rc-detail-lbl">Trainer</span><span class="rc-runner-jt">'+trainer+'</span></div>':'')
          + '</div>'
          + '<div class="rc-runner-right">'
            + (sp?'<span class="rc-sp">'+sp+'</span>':'')
            + rateBtnRes
            + watchBtn
          + '</div>'
        + '</div>';
      }).join('')
    + '</div>';
}


function rcSwRenderResultsTime(listEl){
  // Sort all races chronologically (ascending)
  const all = rcSwResultsData.slice().sort(function(a,b){
    return cmpTime(a.off_time||a.off||a.time||'', b.off_time||b.off||b.time||'');
  });

  let idx = 0;
  let html = all.map(function(race){
    const course = race.course||race.venue||'Unknown';
    const time   = race.off_time||race.off||race.time||'—';
    const name   = race.race_name||race.name||'';
    const flag   = rcCountryFlag(rcCourseCountry(course));
    const count  = (race.runners||[]).length;
    const i      = idx++;
    const isOpen = !!_rcResTimeOpen[i];
    return '<div class="rc-meeting">'
      +'<div class="rc-meeting-hdr rc-mtg-ora" onclick="rcSwToggleResTime('+i+')">'
        +'<span class="rc-meeting-flag">'+flag+'</span>'
        +'<div class="rc-meeting-info">'
          +'<div style="display:flex;align-items:baseline;gap:10px;">'
            +'<span class="rc-mtg-course" style="font-size:20px;letter-spacing:.5px;">'+time+'</span>'
            +'<span style="font-size:14px;font-weight:700;color:rgba(255,255,255,.9);letter-spacing:.2px;">'+course+'</span>'
          +'</div>'
          +'<div class="rc-mtg-meta">'+count+' runners'+(name?' · '+name:'')+'</div>'
        +'</div>'
        +'<span id="rcrt-chev-'+i+'" class="rc-meeting-chevron'+(isOpen?' open':'')+'" style="'+(isOpen?'transform:rotate(90deg);':'')+'">\u203a</span>'
      +'</div>'
      +'<div id="rcrt-body-'+i+'" class="rc-meeting-body" style="display:'+(isOpen?'block':'none')+';">'
        +rcSwRaceCard(race, course)
      +'</div>'
    +'</div>';
  }).join('');

  listEl.innerHTML = html;
}


function rcSwRenderResultsCourse(listEl){
  const meetings = {};
  rcSwResultsData.forEach(function(r){
    const c = r.course||r.venue||'Unknown';
    if(!meetings[c]) meetings[c] = [];
    meetings[c].push(r);
  });
  const courses = Object.keys(meetings).sort(function(a,b){
    const ca=rcCourseCountry(a),cb=rcCourseCountry(b);
    const order={eng:0,sco:0,wal:0,ie:1,aus:2,fra:3,ger:4,rsa:5,usa:6,intl:99};
    const oa=order[ca]!=null?order[ca]:50,ob=order[cb]!=null?order[cb]:50;
    if(oa!==ob)return oa-ob;
    return a.localeCompare(b);
  });

  listEl.innerHTML = courses.map(function(course){
    const races = meetings[course].slice().sort(function(a,b){
      return cmpTime(a.off_time||a.off||a.time||'',b.off_time||b.off||b.time||'');
    });
    const safeId = course.replace(/\W/g,'_');
    const isOpen = rcSwResultsOpenCourse === course;
    const count = races.length;
    const flag=rcCountryFlag(rcCourseCountry(course));
    return '<div class="rc-meeting">'
      + '<div class="rc-meeting-hdr rc-mtg-ora" onclick="rcSwResultsOpenCourse=rcSwResultsOpenCourse===\''+course+'\'?\'\':' +"'"+course+"'"+ ';rcSwRenderResultsCourse(document.getElementById(\'sw-results-list\'));">'
        + '<span class="rc-meeting-flag">'+flag+'</span>'
        + '<div class="rc-meeting-info">'
          + '<div class="rc-mtg-course">'+course+'</div>'
          + '<div class="rc-mtg-meta">'+count+' race'+(count!==1?'s':'')+'</div>'
        + '</div>'
        + '<span class="rc-meeting-chevron'+(isOpen?' open':'')+'" >›</span>'
      + '</div>'
      + (isOpen
          ? '<div class="rc-meeting-body">'
              + races.map(function(race){ return rcSwRaceCard(race, course); }).join('')
            + '</div>'
          : '')
    + '</div>';
  }).join('');
}



function rcProfilePanelHtml(profiled,panelId){
  if(!profiled)return'';
  const rm={'eye-catcher':{svg:'<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>',col:'#a78bfa',label:'Eye Catcher'},'future-target':{svg:'<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/></svg>',col:'#34d399',label:'Future Target'},'trainer-intel':{svg:'<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13a8 8 0 1 0-8 5h8v-5z"/></svg>',col:'#38bdf8',label:'Trainer Intel'},'form-study':{svg:'<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V9M8 15V5M12 15V11M16 15V7"/></svg>',col:'#f59e0b',label:'Form Study'},'tip-source':{svg:'<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a6 6 0 0 1 4.47 10.06A4 4 0 0 1 13 15H7a4 4 0 0 1-1.47-2.94A6 6 0 0 1 10 2z"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="9" y1="21" x2="11" y2="21"/></svg>',col:'#fb7185',label:'Tip Source'}};
  const meta=rm[profiled.reason||'eye-catcher']||rm['eye-catcher'];
  const edge=(function(){const mr=parseFloat(profiled.myRating),or=parseFloat(profiled.currentRating);if(!mr||!or)return null;return mr-or;}());
  const edgeHtml=edge===null?''
    :edge>0?'<span style="font-family:var(--font-ui);font-size:10px;font-weight:700;color:var(--grn);background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);padding:2px 6px;border-radius:4px;">▲ +'+edge+' edge</span>'
    :edge<0?'<span style="font-family:var(--font-ui);font-size:10px;font-weight:700;color:var(--red);background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);padding:2px 6px;border-radius:4px;">▼ '+edge+' edge</span>'
    :'<span style="font-family:var(--font-ui);font-size:10px;color:var(--mut);border:1px solid var(--bdr);padding:2px 6px;border-radius:4px;">→ on mark</span>';
  const obs=(profiled.observations||[]).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}).slice(0,3);
  const targets=(profiled.targets||[]).slice(0,3);
  let html='<div class="rc-profile-panel">';
  html+='<div class="rc-pp-header">'
    +'<span class="rc-pp-reason-badge" style="border-color:'+meta.col+';color:'+meta.col+';display:inline-flex;align-items:center;gap:4px;">'+meta.svg+' '+meta.label+'</span>'
    +(profiled.myRating?'<span class="rc-pp-mr">MR '+profiled.myRating+'</span>':'')
    +(profiled.currentRating?'<span class="rc-pp-or">OR '+profiled.currentRating+'</span>':'')
    +edgeHtml
  +'</div>';
  if(profiled.reasonNote)html+='<div style="font-size:12px;color:var(--txt);line-height:1.5;margin-bottom:7px;font-style:italic;">“'+profiled.reasonNote+'”</div>';
  const conditions=[];
  if(profiled.goingPrefs&&profiled.goingPrefs.length)conditions.push(profiled.goingPrefs.join(', '));
  if(profiled.distancePref)conditions.push(profiled.distancePref);
  if(profiled.trackPref)conditions.push(profiled.trackPref);
  if(conditions.length)html+='<div class="rc-pp-cond">'+conditions.join(' · ')+'</div>';
  if(profiled.trainerIntel)html+='<div class="rc-pp-intel" style="display:flex;align-items:flex-start;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;opacity:.7;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'+profiled.trainerIntel+'</div>';
  if(profiled.conditionsNotes)html+='<div class="rc-pp-cond-notes" style="display:flex;align-items:flex-start;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;opacity:.7;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'+profiled.conditionsNotes+'</div>';
  if(obs.length){
    html+='<div class="rc-pp-sec-lbl">Recent observations</div>';
    obs.forEach(function(o){
      html+='<div class="rc-pp-obs-row">'
        +(o.date?'<span class="rc-pp-obs-date">'+o.date+'</span>':'')
        +(o.result?'<span class="'+(o.result.toLowerCase().includes('win')?'rc-pp-obs-result-win':'rc-pp-obs-result-mut')+'">'+o.result+'</span>':'')
        +(o.notes||o.raceName||'')
      +'</div>';
    });
  }
  if(targets.length){
    html+='<div class="rc-pp-sec-lbl" style="margin-top:6px;">Targets</div>';
    targets.forEach(function(t){
      html+='<div class="rc-pp-target" style="display:flex;align-items:center;gap:5px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.7;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'+t.race+(t.date?' · '+t.date:'')+(t.track?' · '+t.track:'')+'</div>';
    });
  }
  html+='</div>';
  return html;
}

function rcToggleProfile(panelId,btn){
  const panel=document.getElementById(panelId);
  if(!panel)return;
  const open=panel.style.display!=='none';
  panel.style.display=open?'none':'block';
  if(btn)btn.textContent=open?'▼':'▲';
}


function autoMatchBetResults(resultsData){
  if(!resultsData||!resultsData.length)return 0;
  const today=td();
  let updated=0;

  resultsData.forEach(function(race){
    const course=(race.course||race.venue||'').trim().toLowerCase();
    const ewTerms=race.each_way_terms||race.ew_terms||'';
    const runners=race.runners||[];
    // Determine EW places from API data or estimate from field size
    const numPlaces=parseInt(race.each_way_places||race.num_places||race.places||0)||
      (runners.length>=16?4:runners.length>=8?3:runners.length>=5?2:1);

    runners.forEach(function(r){
      const posRaw=r.position||r.place;
      const pos=parseInt(posRaw);
      const horseName=(r.horse||r.name||'').trim().toLowerCase();
      if(!horseName)return;
      const isNR=!!(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR'||(''+r.status).toLowerCase()==='nr'||(''+r.jockey).toUpperCase()==='NON-RUNNER');

      function resolveResult(b){
        if(isNR)return'nr';
        if(isNaN(pos))return null; // position unknown yet — skip
        if(pos===1)return'win';
        if(pos<=numPlaces&&(b.betType==='ew'||b.betType==='place'))return'place';
        return'loss';
      }

      // ── Real bets ──
      D.bets.forEach(function(b){
        if(b.date!==today)return;
        if(b.result&&b.result!=='pending')return;
        if((b.horse||'').trim().toLowerCase()!==horseName)return;
        if(course&&b.track&&(b.track||'').trim().toLowerCase()!==course)return;
        const result=resolveResult(b);
        if(result===null)return;
        const oldResult=b.result;
        const oldReturns=b.returns||0;
        b.result=result;
        b.returns=calcReturns(result,b.stake,b.odds,b.betType,ewTerms);
        applyBankDelta(b,oldResult,oldReturns);
        updated++;
      });

      // ── Virtual bets ──
      const vb=getVBank();
      (vb.bets||[]).forEach(function(b){
        if(b.date!==today)return;
        if(b.result&&b.result!=='pending')return;
        if((b.horse||'').trim().toLowerCase()!==horseName)return;
        if(course&&b.track&&(b.track||'').trim().toLowerCase()!==course)return;
        const result=resolveResult(b);
        if(result===null)return;
        const oldReturns=b.returns||0;
        b.result=result;
        b.returns=calcReturns(result,b.stake,b.odds,b.betType,ewTerms);
        // Apply to virtual bank: was pending (0 returns banked), now settled
        vb.current=parseFloat((vb.current+(b.returns-oldReturns)).toFixed(2));
        updated++;
      });
    });
  });

  if(updated>0){
    save();updHdr();renderToday();
    // Toast notification
    let toast=document.getElementById('_auto-result-toast');
    if(!toast){
      toast=document.createElement('div');
      toast.id='_auto-result-toast';
      toast.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#34d399;color:#141414;font-family:var(--font-ui);font-size:11px;font-weight:700;letter-spacing:.06em;padding:8px 16px;border-radius:20px;z-index:9999;transition:opacity .4s;pointer-events:none;';
      document.body.appendChild(toast);
    }
    toast.textContent='✓ '+updated+' bet'+(updated===1?'':'s')+' auto-updated from results';
    toast.style.opacity='1';
    clearTimeout(toast._t);
    toast._t=setTimeout(function(){toast.style.opacity='0';},4000);
  }
  return updated;
}

async function rcLoadResults(){
  rcSetStatus('Loading today\'s results…');
  const el=document.getElementById('rc-results-list');
  if(el)el.innerHTML='';
  try{
    const data=await callRacingAPI('results/today/free',{});
    const results=data.results||data.races||[];
    rcSetStatus('');
    autoMatchBetResults(results);
    if(!results.length){
      if(el)el.innerHTML='<div class="rc-empty">No results yet today.</div>';
      return;
    }
    // Group by course
    if(el){
      el.innerHTML=results.map(function(race){
        const course=race.course||race.venue||'Unknown';
        const time=race.off_time||race.time||race.off||'—';
        const name=race.race_name||race.name||'Race';
        const runners=race.runners||[];
        const places=runners.slice(0,4);
        const flag=rcCountryFlag(rcCourseCountry(course));
        return'<div class="blk">'
          +'<div class="row-g8" style="margin-bottom:8px;">'
            +'<span style="font-size:18px;flex-shrink:0;">'+flag+'</span>'
            +'<div><div class="rc-race-time">'+time+' '+course+'</div>'
            +'<div class="rc-race-name">'+name+'</div></div>'
          +'</div>'
          +places.map(function(r,i){
            const pos=r.position||r.place||(i+1);
            const horse=stripCountrySuffix(r.horse||r.name||'—');
            const jock=fmtJockey(r.jockey);
            const trainer=r.trainer||'—';
            const sp=r.sp||r.starting_price||'—';
            const ofr=r.ofr||r['or']||r.official_rating||r.officialRating||r.rpr||rcGetOFR(horse)||'';
            const posCol=pos==1?'var(--grn)':pos==2?'#60a5fa':pos==3?'#fb923c':'var(--mut)';
            const esc2=function(s){return(s+'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");};
            return'<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--bdr);">'
              +'<span style="font-family:var(--font-ui);font-weight:700;font-size:14px;color:'+posCol+';min-width:20px;">'+pos+'</span>'
              +'<div class="rc-runner-body">'
                +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
                  +'<span style="font-weight:600;font-size:13px;">'+horse+'</span>'
                  +(ofr?'<span class="rc-or">'+ofr+'</span>':'')
                +'</div>'
                +'<div style="font-size:11px;color:var(--mut);">'+jock+'</div>'
              +'</div>'
              +'<span class="rc-sp">'+sp+'</span>'
              +'<button onclick="rcAddToWatchlist(\''+esc2(horse)+'\',\''+esc2(course)+'\',\''+esc2(jock)+'\',\''+esc2(trainer)+'\',\''+esc2(name)+'\',\''+esc2(ofr)+'\')" class="rc-watch-btn-sm">W</button>'
              +'</div>';
          }).join('')
          +'</div>';
      }).join('');
    }
  }catch(e){
    rcSetStatus('⚠️ '+e.message);
  }
}

function rcAddToWatchlist(horse, course, jockey, trainer, raceName, ofr, going, time, date, distF, position){
  // Resolve result from finishing position
  var posNum=parseInt(position)||0;
  var resultVal=posNum===1?'win':posNum>=2&&posNum<=3?'place':posNum>3?'loss':'';
  // Build the initial observation pre-filled from the results page
  var initialObs=[];
  if(raceName||course||going||date){
    initialObs=[{
      id:gid(),
      date:date||td(),
      raceName:course||'',
      track:course||'',
      going:going||'',
      result:resultVal,
      notes:''
    }];
  }
  openWLForm(null, {
    horse:    horse,
    trainer:  trainer,
    jockey:   jockey,
    currentRating: ofr||'',
    observations:  initialObs
  });
}

function rcBetFromRunner(event, horse, course, time, jockey, trainer, raceName){
  event.stopPropagation();
  openBetFlow('real', horse, course, time, jockey, trainer, raceName);
}

// ── Quick MR Rating ──────────────────────────────────────────────────────────
function rcQuickRate(event, horse, or_val){
  event.stopPropagation();
  const key=(horse||'').toLowerCase().trim();
  const existing=D.ratings[key]||{};
  const overlay=document.createElement('div');
  overlay.id='rc-qr-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML=
    '<div style="background:var(--sur);border-radius:16px 16px 0 0;padding:22px 20px 34px;width:100%;max-width:520px;box-shadow:0 -4px 30px rgba(0,0,0,.35);">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
      +'<div>'
        +'<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:3px;">Quick Rating</div>'
        +'<div style="font-size:19px;font-weight:800;color:var(--txt);">'+horse+'</div>'
      +'</div>'
      +'<button onclick="document.getElementById(\'rc-qr-overlay\').remove()" style="background:var(--bdr);border:none;border-radius:50%;width:30px;height:30px;font-size:18px;color:var(--mut);cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>'
    +'</div>'
    +'<div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:14px;">'
      +'<div style="flex:1;">'
        +'<label style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:5px;display:block;">My Rating (MR)</label>'
        +'<input id="qr-mr" type="number" min="0" max="200" value="'+(existing.mr||or_val||'')+'" placeholder="e.g. 115" style="width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--bdr);background:var(--bg);color:var(--txt);font-size:18px;font-weight:700;text-align:center;">'
      +'</div>'
      +'<div style="flex:1;">'
        +'<label style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:5px;display:block;">Official Rating</label>'
        +'<div style="padding:10px 12px;border-radius:9px;border:1px solid var(--bdr);background:rgba(0,0,0,.05);color:var(--mut);font-size:18px;font-weight:700;text-align:center;">'+(or_val||'—')+'</div>'
      +'</div>'
    +'</div>'
    +'<div style="margin-bottom:14px;">'
      +'<label style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:5px;display:block;">Note (optional)</label>'
      +'<input id="qr-note" type="text" value="'+(existing.note||'')+'" placeholder="e.g. Underrated by handicapper…" style="width:100%;padding:9px 12px;border-radius:9px;border:1px solid var(--bdr);background:var(--bg);color:var(--txt);font-size:13px;">'
    +'</div>'
    +'<div style="display:flex;gap:8px;">'
      +'<button onclick="rcSaveQuickRate(\''+horse.replace(/'/g,"\\'")+'\',' +(or_val||'\'\'')+ ')" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--gld);color:#000;font-size:14px;font-weight:800;cursor:pointer;">★ Save Rating</button>'
      +'<button onclick="rcPromoteToProfile(\''+horse.replace(/'/g,"\\'")+'\',' +(or_val||'\'\'')+ ')" style="padding:12px 14px;border-radius:10px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-size:12px;font-weight:700;cursor:pointer;">Full Profile</button>'
    +'</div>'
    +'</div>';
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
  setTimeout(function(){const inp=document.getElementById('qr-mr');if(inp){inp.focus();inp.select();}},100);
}

function rcSaveQuickRate(horse, or_val){
  const key=(horse||'').toLowerCase().trim();
  const mr=parseInt(document.getElementById('qr-mr').value)||0;
  const note=(document.getElementById('qr-note').value||'').trim();
  if(!mr){alert('Please enter a rating.');return;}
  D.ratings[key]={horse:horse,mr:mr,note:note,or:String(or_val||''),date:td()};
  save();
  const overlay=document.getElementById('rc-qr-overlay');
  if(overlay){
    overlay.innerHTML='<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;">'
      +'<div style="font-size:40px;margin-bottom:10px;">★</div>'
      +'<div style="font-size:17px;font-weight:700;">Rating saved: MR '+mr+'</div>'
      +'<div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:5px;">'+horse+'</div>'
      +'</div>';
    overlay.style.alignItems='center';
    setTimeout(function(){overlay.remove();},1200);
  }
}

function rcPromoteToProfile(horse, or_val){
  const key=(horse||'').toLowerCase().trim();
  const mr=parseInt((document.getElementById('qr-mr')||{}).value)||0;
  const note=(document.getElementById('qr-note').value||'').trim();
  if(mr){
    D.ratings[key]={horse:horse,mr:mr,note:note,or:String(or_val||''),date:td()};
    save();
  }
  const overlay=document.getElementById('rc-qr-overlay');
  if(overlay)overlay.remove();
  openWLForm(null,{horse:horse,currentRating:String(or_val||''),myRating:mr?String(mr):''});
}

// Called by _betFlowProceed in betting.js once checklist is complete
function _rcDoLogBet(s){
  const _pf={horse:s.horse,course:s.course,time:s.time,jockey:s.jockey,trainer:s.trainer};
  openLogbetOverlay(s.mode, _pf);
}

function rcSetStatus(msg){
  const el=document.getElementById('rc-status');
  if(el){el.textContent=msg;el.style.display=msg?'block':'none';}
}


// ═══════════════════════════════════════════════════════════════════
// ─── SHORTLIST MODE ─── Tinder-style runner cards
// ═══════════════════════════════════════════════════════════════════

let _rcSlShortlist = [];   // accumulated shortlisted runners for this session
let _rcSlRunners   = [];   // runners in the current race being reviewed
let _rcSlIdx       = 0;    // current runner index
let _rcSlRace      = null; // current race object
let _rcSlCourse    = '';   // current course name

// Reason map (shared with profile panel)
const _RC_SL_REASONS = {
  'eye-catcher':  {emoji:'👁', col:'#a78bfa', label:'Eye Catcher'},
  'future-target':{emoji:'📰', col:'#34d399', label:'Future Target'},
  'trainer-intel':{emoji:'🗣', col:'#38bdf8', label:'Trainer Intel'},
  'form-study':   {emoji:'📊', col:'#f59e0b', label:'Form Study'},
  'tip-source':   {emoji:'💡', col:'#fb7185', label:'Tip Source'},
};

// ── Step 1: Race picker ────────────────────────────────────────────
function rcSlRenderPicker(container){
  // Group by meeting (same as Course view)
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

  // Flatten sorted for index lookup
  const allRaces=[];
  const sorted=Object.keys(meetings).sort(function(a,b){return a.localeCompare(b);});
  sorted.forEach(function(course){
    meetings[course].slice().sort(function(a,b){
      return timeToMins(a.off||a.off_time||a.time||'')-timeToMins(b.off||b.off_time||b.time||'');
    }).forEach(function(r){ allRaces.push({race:r,course:course}); });
  });
  window._rcSlAllRaces=allRaces;

  if(!allRaces.length){
    const d=document.createElement('div');
    d.className='rc-empty';d.style.marginTop='20px';
    d.textContent='No races loaded — refresh the card first.';
    container.appendChild(d);
    return;
  }

  // Build grouped HTML matching Course view style
  let html='<div style="font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin-bottom:10px;">Select a race to shortlist</div>';
  sorted.forEach(function(course){
    const races=meetings[course].slice().sort(function(a,b){
      return timeToMins(a.off||a.off_time||a.time||'')-timeToMins(b.off||b.off_time||b.time||'');
    });
    const flag=rcCountryFlag(rcCourseCountry(course));
    const type=rcMeetingType(races);
    const span=rcTimeSpan(races);
    const count=races.length;
    html+='<div class="rc-meeting">'
      +'<div class="rc-meeting-hdr rc-mtg-pur">'
        +'<span class="rc-meeting-flag">'+flag+'</span>'
        +'<div class="rc-meeting-info">'
          +'<div class="rc-mtg-course">'+course+'</div>'
          +'<div class="rc-mtg-meta">'+type+' · '+count+' race'+(count!==1?'s':'')+(span?' · '+span:'')+'</div>'
        +'</div>'
      +'</div>'
      +races.map(function(r){
        const idx=allRaces.findIndex(function(a){return a.race===r&&a.course===course;});
        const time=r.off||r.off_time||r.time||'—';
        const name=r.race_name||r.name||r.title||'Race';
        const cnt=(r.runners||r.horses||[]).filter(function(h){
          return !h.non_runner&&!h.isNonRunner&&(''+h.number).toUpperCase()!=='NR';
        }).length;
        const dist=formatDist(r.distance_round||r.distance_f||r.distance||r.dist||'');
        const going=r.going||'';
        return'<div class="rc-race-row rc-sl-race-row" onclick="rcSlStartRace('+idx+')">'
          +'<div class="rc-race-hdr" style="pointer-events:none;">'
            +'<div class="rc-race-hdr-left">'
              +'<div class="rc-race-time">'+time+'</div>'
              +'<div class="rc-race-name">'+name+'</div>'
              +'<div class="rc-race-meta-row">'
                +(dist?'<span class="rc-dist-chip">'+dist+'</span>':'')
                +(going?'<span class="rc-dist-chip">'+going+'</span>':'')
                +'<span class="rc-race-runners-lbl">'+cnt+' runners</span>'
              +'</div>'
            +'</div>'
            +'<span style="color:var(--blu);font-size:20px;flex-shrink:0;">›</span>'
          +'</div>'
        +'</div>';
      }).join('')
    +'</div>';
  });

  const wrap=document.createElement('div');
  wrap.style.cssText='margin-top:12px;';
  wrap.innerHTML=html;
  container.appendChild(wrap);
}

// ── Entry point from time-view flat race row ──────────────────────
function rcSlStartFromFlat(flatIdx){
  const entry=_rcSwFlatRaces[flatIdx];
  if(!entry||!entry.race)return;
  const course=entry.course;
  const race=entry.race;
  // Ensure the race is registered in rcSwRacesByMeeting so the shortlist can find it
  if(!rcSwRacesByMeeting[course])rcSwRacesByMeeting[course]=[];
  let raceIdx=rcSwRacesByMeeting[course].findIndex(function(r){return r===race;});
  if(raceIdx===-1){rcSwRacesByMeeting[course].push(race);raceIdx=rcSwRacesByMeeting[course].length-1;}
  // Delegate to the standard expanded-race entry point
  rcSlStartFromExpanded(course, raceIdx);
}

// ── Entry point from expanded race (inline toggle) ────────────────
let _rcSlReturnCourse='';
let _rcSlReturnIdx=0;
let _rcSlReturnSafeId='';

function rcSlStartFromExpanded(course, raceIdx){
  const races=rcSwRacesByMeeting[course]||rcSwSortedRaces||[];
  const race=races[raceIdx];
  if(!race)return;
  _rcSlReturnCourse=course;
  _rcSlReturnIdx=raceIdx;
  _rcSlReturnSafeId=course.replace(/\W/g,'_');
  _rcSlRace=race;
  _rcSlCourse=course;
  _rcSlRunners=(race.runners||race.horses||[]).filter(function(r){
    return !r.non_runner&&!r.isNonRunner
      &&(''+r.number).toUpperCase()!=='NR'
      &&(''+r.status).toLowerCase()!=='nr'
      &&(''+r.jockey).toUpperCase()!=='NON-RUNNER';
  });
  _rcSlIdx=0;
  _rcSlShortlist=[];
  rcSlRenderCard();
}

function rcSlBackToRace(){
  // Re-open the meeting and race row
  rcSwView='time';
  rcSwRenderUI();
  if(_rcSlReturnCourse){
    setTimeout(function(){
      rcSwToggleMeeting(_rcSlReturnCourse);
      setTimeout(function(){
        rcSwToggle(_rcSlReturnIdx,_rcSlReturnCourse,_rcSlReturnSafeId,true);
      },120);
    },60);
  }
}

// ── Step 2: Start reviewing a race (from race picker tab — kept for compat) ──
function rcSlStartRace(idx){
  const item=window._rcSlAllRaces[idx];
  if(!item)return;
  _rcSlReturnCourse=''; // no expanded race to go back to
  _rcSlRace=item.race;
  _rcSlCourse=item.course;
  // Filter out non-runners
  _rcSlRunners=(item.race.runners||item.race.horses||[]).filter(function(r){
    return !r.non_runner&&!r.isNonRunner
      &&(''+r.number).toUpperCase()!=='NR'
      &&(''+r.status).toLowerCase()!=='nr'
      &&(''+r.jockey).toUpperCase()!=='NON-RUNNER';
  });
  _rcSlIdx=0;
  _rcSlShortlist=[];
  rcSlRenderCard();
}

// ── Step 3: Render the current runner card ─────────────────────────
function rcSlRenderCard(){
  const uiEl=document.getElementById('sw-rc-ui');
  if(!uiEl)return;

  if(_rcSlIdx>=_rcSlRunners.length){ rcSlRenderSummary(); return; }

  const r=_rcSlRunners[_rcSlIdx];
  const total=_rcSlRunners.length;
  const pct=Math.round((_rcSlIdx/total)*100);

  const name=stripCountrySuffix(r.horse||r.name||'—');
  const no=r.number||r.saddle_cloth||(_rcSlIdx+1);
  const draw=r.draw?'('+r.draw+')':'';
  const jock=fmtJockey(r.jockey||r.jockeyName);
  const trainer=r.trainer||r.trainerName||'';
  const age=r.age?r.age+'yo':'';
  const form=r.form||'';
  const rpr=r.ofr||r.rpr||r.official_rating||r.officialRating||r.or||'';
  const wt=r.weight||r.lbs||r.stone_lbs||'';
  const sp=r.sp||r.price||r.odds||'';
  const time=_rcSlRace.off||_rcSlRace.off_time||_rcSlRace.time||'—';
  const dist=formatDist(_rcSlRace.distance_round||_rcSlRace.distance_f||_rcSlRace.distance||_rcSlRace.dist||'');
  const going=_rcSlRace.going||'';

  // Profile notes from Puzzle Profiler
  const wl=getWL();
  const nl=name.toLowerCase().trim();
  const prof=wl.find(function(w){return(w.horse||'').toLowerCase().trim()===nl;});
  const profMeta=prof?(_RC_SL_REASONS[prof.reason||'eye-catcher']||_RC_SL_REASONS['eye-catcher']):null;
  const edge=prof?(function(){const mr=parseFloat(prof.myRating),or=parseFloat(prof.currentRating);return(mr&&or)?mr-or:null;}()):null;
  const alreadyIn=_rcSlShortlist.some(function(s){return s.name===name;});

  const _slBackFn=_rcSlReturnCourse?'rcSlBackToRace()':'rcSwView=\'course\';rcSwRenderUI();';
  const toggleHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
    +'<button onclick="'+_slBackFn+'" style="display:flex;align-items:center;gap:5px;background:none;border:none;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;cursor:pointer;padding:4px 0;text-transform:uppercase;">'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
      +'Back'
    +'</button>'
    +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);">Shortlist</span>'
    +'<div style="width:48px;"></div>'
  +'</div>';

  // Profile panel — reuses existing rc-profile-panel styles
  let profHtml='';
  if(prof){
    profHtml='<div class="rc-profile-panel" style="margin:0 -14px;border-top:1px solid var(--bdr);border-radius:0;">'
      +'<div class="rc-pp-header">'
        +'<span class="rc-pp-reason-badge" style="border-color:'+profMeta.col+';color:'+profMeta.col+';display:inline-flex;align-items:center;gap:4px;">'+profMeta.svg+' '+profMeta.label+'</span>'
        +(prof.myRating?'<span class="rc-pp-mr">MR '+prof.myRating+'</span>':'')
        +(prof.currentRating?'<span class="rc-pp-or">OR '+prof.currentRating+'</span>':'')
        +(edge!==null?(edge>0?'<span class="rc-sl-edge-pos">▲ +'+edge+'</span>':(edge<0?'<span class="rc-sl-edge-neg">▼ '+edge+'</span>':'')):'')
      +'</div>'
      +(prof.reasonNote?'<div class="rc-pp-note">"'+prof.reasonNote+'"</div>':'')
      +(prof.trainerIntel?'<div class="rc-pp-intel">'+prof.trainerIntel+'</div>':'')
      +(prof.conditionsNotes?'<div class="rc-pp-cond-notes">'+prof.conditionsNotes+'</div>':'')
    +'</div>';
  }

  // ── Silk colours derived from horse name (deterministic) ──
  const _slkC=(function(str){
    let h=0;for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;}
    const P=[
      {body:'#7c3aed',accent:'#fbbf24'},{body:'#ef4444',accent:'#ffffff'},
      {body:'#0ea5e9',accent:'#fbbf24'},{body:'#16a34a',accent:'#fbbf24'},
      {body:'#db2777',accent:'#ffffff'},{body:'#d97706',accent:'#1e1e2e'},
      {body:'#0891b2',accent:'#fbbf24'},{body:'#1d4ed8',accent:'#ffffff'},
      {body:'#be185d',accent:'#fbbf24'},{body:'#065f46',accent:'#ffffff'},
    ];
    return P[Math.abs(h)%P.length];
  })(name);

  // Large Top-Trumps silk SVG
  const silkSVG='<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">'
    // body/silhouette
    +'<ellipse cx="60" cy="62" rx="34" ry="38" fill="'+_slkC.body+'"/>'
    // sash / accent stripe
    +'<path d="M26 62 Q60 48 94 62 Q60 76 26 62Z" fill="'+_slkC.accent+'" opacity=".7"/>'
    // cap
    +'<ellipse cx="60" cy="30" rx="18" ry="10" fill="'+_slkC.body+'"/>'
    +'<rect x="42" y="26" width="36" height="8" rx="4" fill="'+_slkC.accent+'"/>'
    // head
    +'<circle cx="60" cy="22" r="12" fill="#f5d0a9"/>'
    // goggles
    +'<ellipse cx="55" cy="21" rx="5" ry="4" fill="rgba(0,0,0,.18)"/>'
    +'<ellipse cx="65" cy="21" rx="5" ry="4" fill="rgba(0,0,0,.18)"/>'
    +'<line x1="60" y1="21" x2="60" y2="21" stroke="rgba(0,0,0,.3)" stroke-width="2"/>'
    // saddle cloth number
    +'<rect x="44" y="72" width="32" height="20" rx="5" fill="rgba(0,0,0,.25)"/>'
    +'<text x="60" y="87" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="13" font-weight="900" fill="#fff">'+no+'</text>'
  +'</svg>';

  uiEl.innerHTML=toggleHTML
    +'<div id="rc-sl-card-wrap">'

    // ── Race context header ──
    +'<div class="rc-meeting rc-sl-race-header">'
      +'<div class="rc-meeting-hdr rc-mtg-pur" style="cursor:default;border-radius:12px;">'
        +'<div class="rc-meeting-info">'
          +'<div style="display:flex;align-items:baseline;gap:10px;">'
            +'<span class="rc-mtg-course">'+time+'</span>'
            +'<span style="font-size:14px;font-weight:700;color:rgba(255,255,255,.9);">'+_rcSlCourse+'</span>'
          +'</div>'
          +'<div class="rc-mtg-meta">'
            +(_rcSlRace.race_name||_rcSlRace.name||'')
            +(dist?' · '+dist:'')
            +(going?' · '+going:'')
          +'</div>'
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0;">'
          +'<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.9);">'+(_rcSlIdx+1)+' / '+total+'</div>'
          +(_rcSlShortlist.length?'<div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px;">★ '+_rcSlShortlist.length+' picked</div>':'')
        +'</div>'
      +'</div>'
      +'<div style="height:3px;background:rgba(255,255,255,.15);">'
        +'<div style="width:'+pct+'%;height:100%;background:var(--blu);transition:width .3s;"></div>'
      +'</div>'
    +'</div>'

    // ── Top Trumps card ──
    +'<div class="rc-sl-card rc-meeting" id="rc-sl-card" style="overflow:hidden;padding:0;">'

      // Silk panel — coloured band with big silk in centre
      +'<div style="background:linear-gradient(160deg,'+_slkC.body+'dd,'+_slkC.body+'99);padding:20px 14px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;position:relative;">'
        // OR chip top-right
        +(rpr?'<span class="rc-or" style="position:absolute;top:12px;right:12px;font-size:13px;padding:4px 10px;">'+rpr+'</span>':'')
        // Draw chip top-left
        +(draw?'<span style="position:absolute;top:12px;left:12px;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:rgba(0,0,0,.25);color:#fff;padding:3px 8px;border-radius:6px;">Draw '+draw+'</span>':'')
        // Silk
        +silkSVG
        // Horse name below silk
        +'<div style="text-align:center;">'
          +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:26px;font-weight:900;color:#fff;letter-spacing:.3px;line-height:1;text-shadow:0 1px 4px rgba(0,0,0,.4);">'+name+'</div>'
          +(age||wt?'<div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:4px;">'+[age,wt].filter(Boolean).join(' · ')+'</div>':'')
        +'</div>'
      +'</div>'

      // Stats grid — Top Trumps style rows
      +'<div style="display:grid;grid-template-columns:1fr 1fr;border-top:2px solid '+_slkC.body+';">'
        +(sp?'<div style="padding:10px 14px;border-right:1px solid var(--bdr);border-bottom:1px solid var(--bdr);">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:2px;">Price</div>'
          +'<div style="font-size:18px;font-weight:900;font-family:\'Barlow Condensed\',sans-serif;color:var(--gld);">'+sp+'</div>'
        +'</div>':'<div style="border-right:1px solid var(--bdr);border-bottom:1px solid var(--bdr);"></div>')
        +(form?'<div style="padding:10px 14px;border-bottom:1px solid var(--bdr);">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:2px;">Form</div>'
          +'<div style="font-size:15px;font-weight:800;letter-spacing:3px;color:var(--txt);font-family:var(--font-ui);">'+form+'</div>'
        +'</div>':'<div style="border-bottom:1px solid var(--bdr);"></div>')
        +(jock?'<div style="padding:10px 14px;border-right:1px solid var(--bdr);'+(trainer?'border-bottom:1px solid var(--bdr);':'')+'">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:2px;">Jockey</div>'
          +'<div style="font-size:13px;font-weight:700;color:var(--txt);line-height:1.2;">'+jock+'</div>'
        +'</div>':'<div style="border-right:1px solid var(--bdr);'+(trainer?'border-bottom:1px solid var(--bdr);':'')+'""></div>')
        +(trainer?'<div style="padding:10px 14px;border-bottom:1px solid var(--bdr);">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:2px;">Trainer</div>'
          +'<div style="font-size:13px;font-weight:700;color:var(--txt);line-height:1.2;">'+trainer+'</div>'
        +'</div>':'')
      +'</div>'

      // Profile panel (if horse is in Profiler)
      +profHtml

    +'</div>'

    // ── Pass / Shortlist buttons ──
    +'<div class="rc-sl-actions">'
      +'<button class="rc-sl-btn-pass" onclick="rcSlPass()">✕  Pass</button>'
      +(alreadyIn
        ?'<button class="rc-sl-btn-shortlist rc-sl-btn-added" onclick="rcSlUnshortlist()">★  Added</button>'
        :'<button class="rc-sl-btn-shortlist" onclick="rcSlAdd()">★  Shortlist</button>'
      )
    +'</div>'

    +(_rcSlShortlist.length
      ?'<div style="text-align:center;margin-top:10px;">'
        +'<button class="btn bout bsm" onclick="rcSlRenderSummary()">Review shortlist ('+_rcSlShortlist.length+') →</button>'
      +'</div>'
      :'')

    +'</div>';

  _rcSlBindSwipe(document.getElementById('rc-sl-card'));
}

// ── Swipe gesture binding ──────────────────────────────────────────
function _rcSlBindSwipe(el){
  if(!el)return;
  let startX=0,startY=0,dragging=false;
  el.addEventListener('touchstart',function(e){
    startX=e.touches[0].clientX;startY=e.touches[0].clientY;dragging=true;
    el.style.transition='none';
  },{passive:true});
  el.addEventListener('touchmove',function(e){
    if(!dragging)return;
    const dx=e.touches[0].clientX-startX;
    const dy=e.touches[0].clientY-startY;
    if(Math.abs(dx)>Math.abs(dy)){
      el.style.transform='translateX('+dx+'px) rotate('+(dx*0.04)+'deg)';
      el.style.opacity=String(1-Math.abs(dx)/400);
    }
  },{passive:true});
  el.addEventListener('touchend',function(e){
    if(!dragging)return;dragging=false;
    const dx=e.changedTouches[0].clientX-startX;
    el.style.transition='transform .25s,opacity .25s';
    if(dx>80){
      el.style.transform='translateX(120%) rotate(15deg)';
      el.style.opacity='0';
      setTimeout(rcSlAdd,240);
    } else if(dx<-80){
      el.style.transform='translateX(-120%) rotate(-15deg)';
      el.style.opacity='0';
      setTimeout(rcSlPass,240);
    } else {
      el.style.transform='';el.style.opacity='1';
    }
  },{passive:true});
}

// ── Actions ────────────────────────────────────────────────────────
function rcSlAdd(){
  const r=_rcSlRunners[_rcSlIdx];
  if(!r)return;
  const name=stripCountrySuffix(r.horse||r.name||'—');
  if(!_rcSlShortlist.some(function(s){return s.name===name;})){
    _rcSlShortlist.push({
      name:name,
      no:r.number||r.saddle_cloth||(_rcSlIdx+1),
      jockey:fmtJockey(r.jockey||r.jockeyName),
      trainer:r.trainer||r.trainerName||'',
      odds:r.sp||r.price||r.odds||'',
      or:r.ofr||r.rpr||r.official_rating||r.officialRating||r.or||'',
      form:r.form||'',
      course:_rcSlCourse,
      time:_rcSlRace.off||_rcSlRace.off_time||_rcSlRace.time||'—',
      raceName:_rcSlRace.race_name||_rcSlRace.name||''
    });
  }
  _rcSlIdx++;
  rcSlRenderCard();
}

function rcSlPass(){
  _rcSlIdx++;
  rcSlRenderCard();
}

function rcSlUnshortlist(){
  const r=_rcSlRunners[_rcSlIdx];
  if(!r)return;
  const name=stripCountrySuffix(r.horse||r.name||'—');
  _rcSlShortlist=_rcSlShortlist.filter(function(s){return s.name!==name;});
  rcSlRenderCard(); // re-render to show Pass state
}

// ── Step 4: Summary screen ─────────────────────────────────────────
function rcSlRenderSummary(){
  const uiEl=document.getElementById('sw-rc-ui');
  if(!uiEl)return;

  const _slBackFn2=_rcSlReturnCourse?'rcSlBackToRace()':'rcSwView=\'course\';rcSwRenderUI();';
  const toggleHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
    +'<button onclick="'+_slBackFn2+'" style="display:flex;align-items:center;gap:5px;background:none;border:none;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;cursor:pointer;padding:4px 0;text-transform:uppercase;">'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
      +'Back'
    +'</button>'
    +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);">Shortlist</span>'
    +'<div style="width:48px;"></div>'
  +'</div>';

  if(!_rcSlShortlist.length){
    uiEl.innerHTML=toggleHTML
      +'<div style="text-align:center;padding:40px 20px;">'
        +'<div style="font-size:32px;margin-bottom:12px;">🤷</div>'
        +'<div style="font-weight:700;font-size:16px;margin-bottom:8px;">Nothing shortlisted</div>'
        +'<div style="font-size:13px;color:var(--mut);margin-bottom:20px;">You passed on everyone in this race.</div>'
        +'<button class="btn bout" onclick="rcSwView=\'shortlist\';rcSwRenderUI();">Pick another race</button>'
      +'</div>';
    return;
  }

  let rows=_rcSlShortlist.map(function(s,i){
    const esc2=function(v){return(v+'').replace(/'/g,"\\'");};
    return'<div class="rc-sl-summary-row">'
      +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:16px;font-weight:800;color:var(--txt);">'+s.name+'</div>'
        +'<div style="font-size:11px;color:var(--mut);margin-top:2px;">'+s.course+' · '+s.time+(s.odds?' · <span style="color:var(--gld);">'+s.odds+'</span>':'')+(s.or?' · OR '+s.or:'')+'</div>'
        +(s.jockey?'<div style="font-size:11px;color:var(--mut);">J: '+s.jockey+(s.trainer?' · T: '+s.trainer:'')+'</div>':'')
      +'</div>'
      +'<div class="t-flex-col-end" style="gap:6px;">'
        +'<button class="rc-bet-btn" style="font-size:10px;" onclick="rcSlBet('+i+')">Bet 🏇</button>'
        +'<button style="font-size:10px;background:transparent;border:1px solid var(--bdr);color:var(--mut);padding:4px 8px;border-radius:6px;cursor:pointer;" onclick="rcSlRemove('+i+')">✕</button>'
      +'</div>'
    +'</div>';
  }).join('');

  uiEl.innerHTML=toggleHTML
    +'<div style="margin-top:12px;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
        +'<div style="font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--blu);">★ Your Shortlist ('+_rcSlShortlist.length+')</div>'
        +'<button class="btn bout bsm" onclick="rcSwView=\'shortlist\';rcSwRenderUI();">Review another race</button>'
      +'</div>'
      +'<div class="blk" style="padding:0;">'+rows+'</div>'
    +'</div>';
}

function rcSlBet(idx){
  const s=_rcSlShortlist[idx];
  if(!s)return;
  openBetFlow('real',s.name,s.course,s.time,s.jockey,s.trainer,s.raceName);
}

function rcSlAddToTracker(idx){
  const s=_rcSlShortlist[idx];
  if(!s)return;
  const wl=getWL();
  const existing=wl.find(function(w){return(w.horse||'').toLowerCase().trim()===s.name.toLowerCase().trim();});
  if(existing){
    alert(s.name+' is already in your Tracker.');
    return;
  }
  wl.push({
    id:gid(),horse:s.name,trainer:s.trainer,
    currentRating:s.or,myRating:'',
    reason:'eye-catcher',reasonNote:'Added from shortlist',
    orHistory:[],observations:[],targets:[],
    createdAt:Date.now()
  });
  setWL(wl);save();
  // Update button to show added
  const btn=document.querySelectorAll('.rc-sl-summary-row')[idx];
  if(btn){
    const tBtn=btn.querySelectorAll('button')[1];
    if(tBtn){tBtn.textContent='✓ Added';tBtn.style.color='var(--grn)';}
  }
}

function rcSlRemove(idx){
  _rcSlShortlist.splice(idx,1);
  rcSlRenderSummary();
}

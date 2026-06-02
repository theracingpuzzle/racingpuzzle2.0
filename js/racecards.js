// ─── RACECARDS & RESULTS ─── swipe cards, results, overlay flow

// ─── SWIPE RACECARDS / RESULTS ───
let rcSwCurrentRaces=[], rcSwRacesByMeeting={}, rcSwView='course', _pendingRCBet=null;

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
    const creds=getRacingCreds();
    if(!creds.username||!creds.password){
      if(stEl){ stEl.style.display='block'; stEl.textContent='Set API credentials in Settings to load racecards.'; }
      return;
    }
    // Share cache with today.js to avoid double-fetching
    if(!window._todayMeetingsCache) window._todayMeetingsCache=await callRacingAPI('racecards/free',{});
    const data=window._todayMeetingsCache;
    rcSwCurrentRaces=data.racecards||data.races||[];
    if(stEl) stEl.style.display='none';
    if(!rcSwCurrentRaces.length){
      if(uiEl) uiEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">No racecards available.</div>';
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

  const onTime=rcSwView==='time';
  const _sb_base='font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;flex:1;padding:7px 12px;border:none;cursor:pointer;transition:all .12s;';
  let html='<div style="display:flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;margin-bottom:10px;">'
    +'<button style="'+_sb_base+(onTime?'background:transparent;color:#9ca3af;':'background:#1e293b;color:#fff;')+'" onclick="rcSwView=\'course\';rcSwRenderUI();">Course</button>'
    +'<button style="'+_sb_base+(onTime?'background:#1e293b;color:#fff;':'background:transparent;color:#9ca3af;')+'border-left:1px solid #e5e7eb;" onclick="rcSwView=\'time\';rcSwRenderUI();">Time</button>'
    +'</div>';

  uiEl.innerHTML=html;

  const listEl=document.createElement('div');
  uiEl.appendChild(listEl);

  if(onTime) rcSwRenderTime(listEl);
  else       rcSwRenderCourse(listEl);
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
    if(mins===9999||(mins-nowMins)>-30) upcoming.push(r);
    else past.push(r);
  });
  if(!allRaces.length){ listEl.innerHTML='<div class="es" style="padding:20px;">No races today.</div>'; return; }

  listEl.innerHTML=upcoming.map(function(r,i){
    return rcSwRaceCardPreview(r, r._course||r.course||'', i===0);
  }).join('')
  +(past.length
    ? '<div class="clbl" style="padding:14px 0 6px;border-top:1px solid #e5e7eb;margin-top:4px;color:#9ca3af;">Earlier today</div>'
      + past.map(function(r){ return rcSwRaceCardPreview(r, r._course||r.course||'', false, true); }).join('')
    : '');
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
    const order={gb:0,ie:1,intl:2};
    if(order[ca]!==order[cb])return order[ca]-order[cb];
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
      +'<div class="rc-meeting-hdr" data-course="'+escapedCourse+'" onclick="rcSwToggleCourse(this)" style="background:#2d3f55;">'
        +'<span class="rc-meeting-flag">'+flag+'</span>'
        +'<div class="rc-meeting-info">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:#93c5fd;letter-spacing:-.2px;">'+course+'</div>'
          +'<div style="font-size:10px;color:#94a3b8;margin-top:2px;">'+type+' · '+count+' race'+(count!==1?'s':'')+(span?' · '+span:'')+'</div>'
        +'</div>'
        +'<span class="rc-meeting-chevron'+(isOpen?' open':'')+'" >›</span>'
      +'</div>'
      +(isOpen
        ? '<div style="border-radius:0 0 10px 10px;overflow:hidden;">'
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
  return '<div class="rc-meeting" style="'+(isPast?'opacity:.38;':'')+'">'  // MARKER_PREVIEW
    +'<div class="rc-meeting-hdr" onclick="rcSwToggleFlatRace('+idx+')" style="background:#2d3f55;">'
      +'<span class="rc-meeting-flag">'+flag+'</span>'
      +'<div class="rc-meeting-info">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:#93c5fd;letter-spacing:-.2px;">'+course+'</div>'
        +'<div style="font-size:10px;color:#94a3b8;margin-top:2px;">'+(isNext?'<span style="background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:800;margin-right:5px;">NEXT</span>':'')+time+' · '+activeRunners+' runners'+(name?' · '+name:'')+'</div>'
      +'</div>'
      +'<span id="rcfc-chev-'+idx+'" style="color:#9ca3af;font-size:14px;">›</span>'
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
  return '<div style="overflow:hidden;border-bottom:1px solid #e5e7eb;">'
    +'<div onclick="rcSwToggleFlatRace('+idx+')" style="display:flex;align-items:flex-start;justify-content:space-between;padding:9px 13px 8px;background:#fafafa;cursor:pointer;border-bottom:1px solid #f3f4f6;">'
      +'<div style="flex:1;min-width:0;">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:#374151;margin-bottom:2px;">'+time+'</div>'
        +'<div style="font-size:13px;font-weight:600;color:#6b7280;line-height:1.3;margin-bottom:3px;">'+name+'</div>'
        +'<div class="rc-race-meta"><span class="rc-race-count">'+runnerCount+' runners'+(nrCount?' ('+nrCount+' NR)':'')+'</span></div>'
      +'</div>'
      +'<span id="rcfc-chev-'+idx+'" style="color:#9ca3af;font-size:14px;">›</span>'
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
const IRE_COURSES=['curragh','leopardstown','naas','navan','gowran park','galway','tipperary','cork','killarney','listowel','down royal','downpatrick','dundalk','fairyhouse','kilbeggan','laytown','limerick','roscommon','sligo','tramore','thurles','punchestown','ballinrobe','bellewstown','clonmel','mullingar','wexford','kilmalloch'];
const GER_COURSES=['cologne'];
const USA_COURSES=['santa anita'];
const FRA_COURSES=['longchamp','auteuil','saint-cloud'];

function rcCourseCountry(course){
  const c=(course||'').toLowerCase().trim();
  if(SCO_COURSES.some(k=>k==='perth'?(c===k||c.startsWith(k+' ')||c.endsWith(' '+k)):c.includes(k)))return'sco';
  if(WAL_COURSES.some(k=>c.includes(k)))return'wal';
  if(ENG_COURSES.some(k=>c.includes(k)))return'eng';
  if(IRE_COURSES.some(k=>c.includes(k)))return'ie';
  if(GER_COURSES.some(k=>c.includes(k)))return'ger';
  if(USA_COURSES.some(k=>c.includes(k)))return'usa';
  if(FRA_COURSES.some(k=>c.includes(k)))return'fra';
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
    const dist=r.distance_round||r.distance_f||r.distance||r.dist||'';
    const runners=(r.runners||r.horses||[]).length;
    const rname=name.toLowerCase();
    const isG1=rname.includes('group 1');const isG2=rname.includes('group 2');
    const isG3=rname.includes('group 3');const isListed=rname.includes('listed');
    const nameCol=isG1||isG2?'#f59e0b':isG3?'#a78bfa':isListed?'#a78bfa':'var(--txt)';
    return'<div id="sw-row-'+safeId+'-'+i+'" style="border-bottom:1px solid #e5e7eb;background:#fff;">'
      +'<div onclick="rcSwToggle('+i+',\''+course.replace(/\'/g,"\\'")+'\',\''+safeId+'\',true)" style="display:flex;align-items:flex-start;justify-content:space-between;padding:9px 13px 8px;background:#fafafa;cursor:pointer;">'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:#374151;margin-bottom:2px;">'+time+'</div>'
          +'<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:10px;color:#9ca3af;">'+(dist?'<span style="background:#f3f4f6;color:#9ca3af;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:600;">'+dist+'</span>':'')+runners+' runners</div>'
          +'<div style="font-size:13px;font-weight:600;color:#6b7280;line-height:1.3;margin-bottom:3px;">'+name+'</div>'
        +'</div>'
        +'<span id="sw-chev-'+safeId+'-'+i+'" style="color:#9ca3af;font-size:14px;transition:transform .15s;">›</span>'
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
  const dist=race.distance_round||race.distance_f||race.distance||race.dist||'';
  const prize=race.prize||race.total_prize_money||'';
  const infoBar=[race.going,dist,prize].filter(Boolean).join(' · ');
  let html=infoBar?'<div style="display:flex;gap:5px;flex-wrap:wrap;padding:7px 13px 6px;background:#fafafa;border-bottom:1px solid #f3f4f6;">'+infoBar.split(' · ').map(function(c){return'<span class="rc-chip">'+c+'</span>';}).join('')+'</div>':'';
  if(!runners.length){el.innerHTML=html+'<div style="padding:8px 13px;color:var(--mut);font-style:italic;font-size:13px;">No runners listed yet.</div>';return;}
  html+=runners.map(function(r,i){
    const name=stripCountrySuffix(r.horse||r.name||'—');
    const no=r.number||r.saddle_cloth||(i+1);
    const draw=r.draw?'('+r.draw+')':'';
    const jock=r.jockey||r.jockeyName||'—';
    const trainer=r.trainer||r.trainerName||'—';
    const age=r.age?r.age+'yo':'';
    const form=r.form||'';
    const rpr=r.ofr||r.rpr||r.official_rating||r.officialRating||r.or||'';
    const isNR=!!(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR'||r.status==='non_runner'||(''+r.status).toLowerCase()==='nr'||(''+r.jockey).toUpperCase()==='NON-RUNNER');
    const _bh=isNR?'':getBetHighlight(name,course,time);
    const _wl2=getWL();const _nl2=(name||'').toLowerCase().trim();
    const _pr2=_wl2.find(function(w){return(w.horse||'').toLowerCase().trim()===_nl2;});
    const _PM2={'eye-catcher':{emoji:'👁',col:'#a78bfa'},'future-target':{emoji:'📰',col:'#fb923c'},'trainer-intel':{emoji:'🗣',col:'#60a5fa'},'form-study':{emoji:'📊',col:'#ef4444'},'tip-source':{emoji:'💡',col:'#eab308'}};
    const _pm2=_pr2?_PM2[_pr2.reason||'eye-catcher']:null;
    const pid='sw-profile-'+course.replace(/\W/g,'_')+'-'+i;
    return'<div class="rc-runner'+(isNR?' rc-runner-nr':_bh?(_bh.includes('96,165')?' rc-runner-bet-real':' rc-runner-bet-virt'):'')+'" style="background:#fff;">'
      +'<div class="rc-cloth">'+(isNR?'<span class="rc-nr-chip">NR</span>':'<span>'+no+'</span>')+'</div>'
      +'<div style="flex:1;min-width:0;">'
        +(function(){
          const _wl=getWL();const _nl=(name||'').toLowerCase().trim();
          const _pr=_wl.find(function(w){return(w.horse||'').toLowerCase().trim()===_nl;});
          const _PM={'eye-catcher':{emoji:'👁',col:'#a78bfa'},'future-target':{emoji:'📰',col:'#fb923c'},'trainer-intel':{emoji:'🗣',col:'#60a5fa'},'form-study':{emoji:'📊',col:'#ef4444'},'tip-source':{emoji:'💡',col:'#eab308'}};
          const _pm=_pr?_PM[_pr.reason||'eye-catcher']:null;
          const _badge=_pr?'<span style="font-size:9px;font-family:var(--font-ui);padding:1px 5px;border-radius:10px;border:1px solid '+_pm.col+';color:'+_pm.col+';background:rgba(0,0,0,.35);margin-left:3px;">'+_pm.emoji+'</span>':'';
          const _nc=isNR?'var(--mut)':_pr?_pm.col:'var(--txt)';
          return'<div class="rc-runner-name-row">'
            +'<span class="rc-runner-name'+(isNR?' rc-runner-name-nr':'')+'">'+name+'</span>'
            +(rpr?'<span class="rc-or">'+rpr+'</span>':'')
            +(_badge?'<span class="rc-wl-pill">'+_pm.emoji+'</span>':'')
            +(draw?'<span class="rc-runner-age">'+draw+'</span>':'')
          +'</div>'
          +(form?'<span class="rc-runner-form">'+form+'</span>':'');
        }())
        +'<div class="rc-runner-jt">'+jock+(age?' · '+age:'')+'  ·  '+trainer+'</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">'
        +(isNR?''
          :'<button onclick="rcSwBet(event,\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+(race.race_name||'').replace(/'/g,"\\'")+'\')\" class="rc-bet-btn">Bet</button>')
        +(_pr2&&!isNR?'<button onclick="rcToggleProfile(\''+pid+'\',this)" style="font-family:var(--font-ui);font-size:9px;font-weight:700;padding:3px 8px;border-radius:5px;border:1px solid '+_pm2.col+';background:transparent;color:'+_pm2.col+';cursor:pointer;">\u25bc</button>':'')
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

function openLogbetOverlay(mode, prefill){
  const overlay=document.getElementById('logbet-overlay');
  const src=document.getElementById('c_LOGBET_OLD');
  if(src){
    src.style.display='block';
    src.style.position='static';
    src.style.height='auto';
    src.style.overflow='visible';
    // Hide old card header (Record label, title, Real/Virtual toggle)
    const cin=src.querySelector('.cin');
    if(cin){const hdr=cin.children[0];if(hdr)hdr.style.display='none';}
    // Hide bank tiles in both forms
    ['lb-real-bank-amt','vb-mini-amt'].forEach(function(id){
      const el=document.getElementById(id);
      if(el){const tile=el.closest('.g2,div[style*="grid"]')||el.parentElement.parentElement;if(tile)tile.style.display='none';}
    });
    const tgt=document.getElementById('lbo-content');
    if(tgt){tgt.style.paddingBottom='90px';tgt.innerHTML='';tgt.appendChild(src);}
  }
  // Header colouring
  const typeEl=document.getElementById('lbo-type-lbl');
  const titleEl=document.getElementById('lbo-title');
  const hdr=document.getElementById('lbo-header');
  const accentCol=mode==='virt'?'#fb923c':'#60a5fa';
  if(mode==='virt'){
    if(typeEl){typeEl.textContent='Virtual Bet';typeEl.style.color=accentCol;}
    if(titleEl){titleEl.textContent='Virtual Bet';titleEl.style.color=accentCol;}
    if(hdr)hdr.style.borderBottom='none';
  } else {
    if(typeEl){typeEl.textContent='Real Bet';typeEl.style.color=accentCol;}
    if(titleEl){titleEl.textContent='Real Bet';titleEl.style.color=accentCol;}
    if(hdr)hdr.style.borderBottom='none';
  }
  const accentBar=document.getElementById('lbo-accent-bar');
  if(accentBar)accentBar.style.background=accentCol;
  setLBMode(mode);
  renderLogBetCard();
  // Pre-fill from pending
  const _fill=prefill||_pendingRCBet;
  if(_fill){
    const pre=mode==='real'?'lb':'vb';
    setTimeout(function(){
      const he=document.getElementById(pre+'h');if(he&&_fill.horse)he.value=_fill.horse;
      const te=document.getElementById(pre+'t')||document.getElementById('lbt');if(te&&_fill.course)te.value=_fill.course;
      const ti=document.getElementById(pre+'time');if(ti&&_fill.time)ti.value=_fill.time;
      const je=document.getElementById(pre+'jockey');if(je&&_fill.jockey)je.value=_fill.jockey;
      const tr=document.getElementById(pre+'trainer');if(tr&&_fill.trainer)tr.value=_fill.trainer;
      if(mode==='real')calcLiveStake();else calcVirtStake();
    },80);
  }
  // Add sticky close button at bottom if not already there
  let closeBar=document.getElementById('lbo-close-bar');
  if(!closeBar){
    closeBar=document.createElement('div');
    closeBar.id='lbo-close-bar';
    closeBar.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:202;padding:12px 17px env(safe-area-inset-bottom,16px);background:var(--bg);border-top:1px solid var(--bdr);';
    closeBar.innerHTML='<button onclick="_lboBackToChecklist()" style="width:100%;padding:14px;border-radius:10px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:var(--font-ui);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;">← Back to Checklist</button>';
    document.body.appendChild(closeBar);
  }
  closeBar.style.display='block';
  overlay.style.display='block';
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

function goFromChecklist(){
  const done=cks.filter(Boolean).length;
  if(done===0){alert('Run through the checklist first.');return;}
  const mode=_pendingRCBet?(_pendingRCBet.mode||( done>=9?'real':'virt')):(done>=9?'real':'virt');
  if(_pendingRCBet){
    // Close checklist overlay, open logbet overlay
    document.getElementById('prebet-overlay').style.display='none';
    openLogbetOverlay(mode);
  } else {
    // Normal flow — use swipe cards
    goTo(CARDS.findIndex(c=>c.id==='today'));
    setTimeout(()=>setLBMode(mode),300);
  }
}

let rcSwResultsData = [], rcSwResultsView = 'course', rcSwResultsOpenCourse = '';

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
      if(listEl) listEl.innerHTML = '<div style="color:var(--mut);font-style:italic;font-size:13px;">No results yet today \u2014 check back after the first race.</div>';
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
    '<div style="display:flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;margin-bottom:10px;">'
    + '<button style="'+_rsb+(!onT?'background:#1e293b;color:#fff;':'background:transparent;color:#9ca3af;')+'" onclick="rcSwResultsView=\'course\';rcSwResultsOpenCourse=\'\';rcSwRenderResultsUI();">Course</button>'
    + '<button style="'+_rsb+(onT?'background:#1e293b;color:#fff;':'background:transparent;color:#9ca3af;')+'border-left:1px solid #e5e7eb;" onclick="rcSwResultsView=\'time\';rcSwRenderResultsUI();">Time</button>'
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
  return '<div class="rc-race-block" style="border-radius:10px;border:1px solid #e5e7eb;margin-bottom:8px;">'
    + '<div class="rc-race-hdr" style="border-radius:10px 10px 0 0;background:#fafafa;">'
      + '<div class="rc-race-hdr-left">'
        + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:#374151;margin-bottom:2px;">'+time+'</div>'
        + '<div style="font-size:13px;font-weight:600;color:#6b7280;line-height:1.3;margin-bottom:3px;">'+name+'</div>'
      + '</div>'
      + '<span class="rc-race-count">'+places.length+' shown</span>'
    + '</div>'
    + places.map(function(r,i){
        const pos = r.position||r.place||(i+1);
        const horse = stripCountrySuffix(r.horse||r.name||'—');
        const jock = r.jockey||'';
        const trainer = r.trainer||'';
        const sp = r.sp||'—';
        const ofr = r.ofr||r['or']||r.official_rating||r.officialRating||r.rpr||rcGetOFR(horse)||'';
        const posClass = pos==1?'rc-pos-1':pos==2?'rc-pos-2':pos==3?'rc-pos-3':'rc-pos-n';
        const hn = horse.toLowerCase().trim();
        const myBet = todayBets.find(function(b){return (b.horse||'').toLowerCase().trim()===hn&&b.result&&b.result!=='pending';});
        const pnl = myBet?(parseFloat(myBet.returns||0)-parseFloat(myBet.stake||0)):0;
        const betBadge = myBet
          ? (myBet.result==='win'||myBet.result==='place'
              ? '<span class="rc-your-bet rc-your-bet-win">Your Bet +'+(pnl>0?fp(pnl):'')+'</span>'
              : '<span class="rc-your-bet rc-your-bet-loss">Your Bet</span>')
          : '';
        const wlEntry = getWL().find(function(w){return(w.horse||'').toLowerCase().trim()===hn;});
        const watchBtn = wlEntry
          ? '<button style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:4px 9px;border-radius:5px;border:1px solid #bbf7d0;background:#f0fdf4;color:#15803d;cursor:pointer;white-space:nowrap;">\u2713 Watching</button>'
          : '<button onclick="rcAddToWatchlist(\''+esc(horse)+'\',\''+esc(course)+'\',\''+esc(jock)+'\',\''+esc(trainer)+'\',\''+esc(name)+'\',\''+esc(ofr)+'\')" style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:4px 9px;border-radius:5px;border:1px solid #c4b5fd;background:#ede9fe;color:#7c3aed;cursor:pointer;white-space:nowrap;">+ Watch</button>';
        return '<div class="rc-runner" style="background:#fff;">'
          + '<span class="rc-pos '+posClass+'">'+pos+'</span>'
          + '<div class="rc-runner-main">'
            + '<div class="rc-runner-name-row">'
              + '<span class="rc-runner-name">'+horse+'</span>'
              + (ofr?'<span class="rc-or">'+ofr+'</span>':'')
              + betBadge
            + '</div>'
            + '<div class="rc-runner-jt">'+(jock||'')+(trainer?' · '+trainer:'')+'</div>'
          + '</div>'
          + '<div class="rc-runner-right">'
            + watchBtn
          + '</div>'
        + '</div>';
      }).join('')
    + '</div>';
}


function rcSwRenderResultsTime(listEl){
  const domestic = rcSwResultsData.filter(function(r){
    const c=(r.course||r.venue||'').toLowerCase();
    return ENG_COURSES.some(k=>c.includes(k))
      || SCO_COURSES.some(function(k){return k==='perth'?(c===k||c.startsWith(k+' ')||c.endsWith(' '+k)):c.includes(k);})
      || WAL_COURSES.some(k=>c.includes(k))
      || IRE_COURSES.some(k=>c.includes(k));
  });
  const intl = rcSwResultsData.filter(function(r){
    return !domestic.includes(r);
  });
  domestic.sort(function(a,b){
    return cmpTime(b.off_time||b.off||b.time||'',a.off_time||a.off||a.time||'');
  });
  intl.sort(function(a,b){
    return cmpTime(b.off_time||b.off||b.time||'',a.off_time||a.off||a.time||'');
  });
  let html = domestic.map(function(race){
    return rcSwRaceCard(race, race.course||race.venue||'Unknown');
  }).join('');
  if(intl.length){
    html += '<div style="font-family:var(--font-ui);font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:var(--mut);padding:10px 4px 6px;">\U0001f30d International</div>';
    html += intl.map(function(race){
      return rcSwRaceCard(race, race.course||race.venue||'Unknown');
    }).join('');
  }
  listEl.innerHTML = html;
}

function rcSwRenderResultsCourse(listEl){
  const meetings = {};
  rcSwResultsData.forEach(function(r){
    const c = r.course||r.venue||'Unknown';
    if(!meetings[c]) meetings[c] = [];
    meetings[c].push(r);
  });
  const courses = Object.keys(meetings).sort();

  listEl.innerHTML = courses.map(function(course){
    const races = meetings[course].slice().sort(function(a,b){
      return cmpTime(a.off_time||a.off||a.time||'',b.off_time||b.off||b.time||'');
    });
    const safeId = course.replace(/\W/g,'_');
    const isOpen = rcSwResultsOpenCourse === course;
    const count = races.length;
    const flag=rcCountryFlag(rcCourseCountry(course));
    return '<div class="rc-meeting">'
      + '<div class="rc-meeting-hdr" onclick="rcSwResultsOpenCourse=rcSwResultsOpenCourse===\''+course+'\'?\'\':' +"'"+course+"'"+ ';rcSwRenderResultsCourse(document.getElementById(\'sw-results-list\'));" style="background:#2d3f55;">'
        + '<span class="rc-meeting-flag">'+flag+'</span>'
        + '<div class="rc-meeting-info">'
          + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:#fdba74;">'+course+'</div>'
          + '<div class="rc-meeting-meta">'+count+' race'+(count!==1?'s':'')+'</div>'
        + '</div>'
        + '<span class="rc-meeting-chevron'+(isOpen?' open':'')+'" >›</span>'
      + '</div>'
      + (isOpen
          ? '<div style="border-radius:0 0 10px 10px;overflow:hidden;">'
              + races.map(function(race){ return rcSwRaceCard(race, course); }).join('')
            + '</div>'
          : '')
    + '</div>';
  }).join('');
}



function rcProfilePanelHtml(profiled,panelId){
  if(!profiled)return'';
  const rm={'eye-catcher':{emoji:'👁',col:'#a78bfa',label:'Eye Catcher'},'future-target':{emoji:'📰',col:'#fb923c',label:'Future Target'},'trainer-intel':{emoji:'🗣',col:'#60a5fa',label:'Trainer Intel'},'form-study':{emoji:'📊',col:'#ef4444',label:'Form Study'},'tip-source':{emoji:'💡',col:'#eab308',label:'Tip Source'}};
  const meta=rm[profiled.reason||'eye-catcher']||rm['eye-catcher'];
  const edge=(function(){const mr=parseFloat(profiled.myRating),or=parseFloat(profiled.currentRating);if(!mr||!or)return null;return mr-or;}());
  const edgeHtml=edge===null?''
    :edge>0?'<span style="font-family:var(--font-ui);font-size:10px;font-weight:700;color:var(--grn);background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);padding:2px 6px;border-radius:4px;">▲ +'+edge+' edge</span>'
    :edge<0?'<span style="font-family:var(--font-ui);font-size:10px;font-weight:700;color:var(--red);background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);padding:2px 6px;border-radius:4px;">▼ '+edge+' edge</span>'
    :'<span style="font-family:var(--font-ui);font-size:10px;color:var(--mut);border:1px solid var(--bdr);padding:2px 6px;border-radius:4px;">→ on mark</span>';
  const obs=(profiled.observations||[]).slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');}).slice(0,3);
  const targets=(profiled.targets||[]).slice(0,3);
  let html='<div style="border-top:1px solid var(--bdr);background:rgba(167,139,250,.04);padding:10px 13px 12px;">';
  html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">'
    +'<span style="font-size:9px;font-family:var(--font-ui);font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(0,0,0,.2);border:1px solid '+meta.col+';color:'+meta.col+';">'+meta.emoji+' '+meta.label+'</span>'
    +(profiled.myRating?'<span style="font-family:var(--font-ui);font-size:10px;color:var(--gld);">MR '+profiled.myRating+'</span>':'')
    +(profiled.currentRating?'<span style="font-family:var(--font-ui);font-size:10px;color:var(--mut);">OR '+profiled.currentRating+'</span>':'')
    +edgeHtml
  +'</div>';
  if(profiled.reasonNote)html+='<div style="font-size:12px;color:var(--txt);line-height:1.5;margin-bottom:7px;font-style:italic;">“'+profiled.reasonNote+'”</div>';
  const conditions=[];
  if(profiled.goingPrefs&&profiled.goingPrefs.length)conditions.push('⛳ '+profiled.goingPrefs.join(', '));
  if(profiled.distancePref)conditions.push('⇔ '+profiled.distancePref);
  if(profiled.trackPref)conditions.push('🏇 '+profiled.trackPref);
  if(conditions.length)html+='<div style="font-family:var(--font-ui);font-size:10px;color:var(--mut);margin-bottom:7px;">'+conditions.join(' · ')+'</div>';
  if(profiled.trainerIntel)html+='<div style="font-size:11px;color:var(--mut);border-left:2px solid rgba(96,165,250,.4);padding-left:7px;margin-bottom:7px;line-height:1.45;">🗣 '+profiled.trainerIntel+'</div>';
  if(profiled.conditionsNotes)html+='<div style="font-size:11px;color:var(--mut);border-left:2px solid rgba(251,146,60,.4);padding-left:7px;margin-bottom:7px;line-height:1.45;">📋 '+profiled.conditionsNotes+'</div>';
  if(obs.length){
    html+='<div style="font-family:var(--font-ui);font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--mut);margin-bottom:5px;">Recent observations</div>';
    obs.forEach(function(o){
      html+='<div style="font-size:11px;color:var(--mut);margin-bottom:4px;line-height:1.4;">'
        +(o.date?'<span style="font-family:var(--font-ui);font-size:9px;color:var(--mut);margin-right:5px;">'+o.date+'</span>':'')
        +(o.result?'<span style="font-family:var(--font-ui);font-size:9px;font-weight:700;color:'+(o.result.toLowerCase().includes('win')?'var(--grn)':'var(--mut)')+';margin-right:5px;">'+o.result+'</span>':'')
        +(o.notes||o.raceName||'')
      +'</div>';
    });
  }
  if(targets.length){
    html+='<div style="font-family:var(--font-ui);font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--mut);margin-top:6px;margin-bottom:5px;">Targets</div>';
    targets.forEach(function(t){
      html+='<div style="font-size:11px;color:var(--ora);font-family:var(--font-ui);margin-bottom:2px;">🎯 '+t.race+(t.date?' · '+t.date:'')+(t.track?' · '+t.track:'')+'</div>';
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
      if(el)el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">No results yet today.</div>';
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
        return'<div class="blk" style="margin-bottom:10px;padding:12px 14px;">'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
            +'<span style="font-size:18px;flex-shrink:0;">'+flag+'</span>'
            +'<div><div style="font-weight:700;font-size:14px;">'+time+' '+course+'</div>'
            +'<div style="font-size:12px;color:var(--mut);">'+name+'</div></div>'
          +'</div>'
          +places.map(function(r,i){
            const pos=r.position||r.place||(i+1);
            const horse=stripCountrySuffix(r.horse||r.name||'—');
            const jock=r.jockey||'—';
            const trainer=r.trainer||'—';
            const sp=r.sp||r.starting_price||'—';
            const ofr=r.ofr||r['or']||r.official_rating||r.officialRating||r.rpr||rcGetOFR(horse)||'';
            const posCol=pos==1?'var(--grn)':pos==2?'#60a5fa':pos==3?'#fb923c':'var(--mut)';
            const esc2=function(s){return(s+'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");};
            return'<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--bdr);">'
              +'<span style="font-family:var(--font-ui);font-weight:700;font-size:14px;color:'+posCol+';min-width:20px;">'+pos+'</span>'
              +'<div style="flex:1;min-width:0;">'
                +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
                  +'<span style="font-weight:600;font-size:13px;">'+horse+'</span>'
                  +(ofr?'<span style="font-family:var(--font-ui);font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);color:var(--blu);">'+ofr+'</span>':'')
                +'</div>'
                +'<div style="font-size:11px;color:var(--mut);">'+jock+'</div>'
              +'</div>'
              +'<span style="font-family:var(--font-ui);font-size:13px;color:var(--gld);flex-shrink:0;">'+sp+'</span>'
              +'<button onclick="rcAddToWatchlist(\''+esc2(horse)+'\',\''+esc2(course)+'\',\''+esc2(jock)+'\',\''+esc2(trainer)+'\',\''+esc2(name)+'\',\''+esc2(ofr)+'\')" style="font-family:var(--font-ui);font-size:10px;font-weight:700;padding:4px 8px;border-radius:7px;border:1px solid rgba(167,139,250,.3);background:rgba(167,139,250,.1);color:#a78bfa;cursor:pointer;flex-shrink:0;">W</button>'
              +'</div>';
          }).join('')
          +'</div>';
      }).join('');
    }
  }catch(e){
    rcSetStatus('⚠️ '+e.message);
  }
}

function rcAddToWatchlist(horse, course, jockey, trainer, raceName, ofr){
  openWLForm(null, {
    horse: horse,
    trainer: trainer,
    jockey: jockey,
    currentRating: ofr||'',
    notes: 'Noted from results on '+td()
  });
}

function rcBetFromRunner(event, horse, course, time, jockey, trainer, raceName){
  event.stopPropagation();
  openBetFlow('real', horse, course, time, jockey, trainer, raceName);
}

// Called by _betFlowProceed in betting.js once checklist is complete
function _rcDoLogBet(s){
  const _pf={horse:s.horse,course:s.course,time:s.time,jockey:s.jockey,trainer:s.trainer};
  openLogbetOverlay(s.mode, _pf);
  setTimeout(function(){
    const pre=s.mode==='real'?'lb':'vb';
    const src=document.getElementById(pre+'src');
    if(src)src.value=s.source==='own'?'Own Form Study':(s.tipSource||'Own Form Study');
  },200);
}

function rcSetStatus(msg){
  const el=document.getElementById('rc-status');
  if(el){el.textContent=msg;el.style.display=msg?'block':'none';}
}


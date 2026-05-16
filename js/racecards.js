// ─── RACECARDS & RESULTS ─── swipe cards, results, overlay flow

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
    rcSwRenderUI();
  }catch(e){
    if(stEl){ stEl.style.display='block'; stEl.textContent='⚠️ '+e.message; }
  }
}

function rcSwRenderUI(){
  const uiEl=document.getElementById('sw-rc-ui');
  if(!uiEl)return;

  const onTime=rcSwView==='time';
  const btnBase='font-family:monospace;font-size:10px;letter-spacing:.07em;text-transform:uppercase;padding:7px 18px;border:none;cursor:pointer;font-weight:700;transition:all .12s;';

  const timeActive = onTime?'background:#60a5fa;color:#141414;flex:1;':'background:transparent;color:var(--mut);flex:1;';
  const courseActive = !onTime?'background:#60a5fa;color:#141414;flex:1;':'background:transparent;color:var(--mut);flex:1;';
  let html='<div style="display:flex;background:var(--sur2);border:1px solid var(--bdr);border-radius:8px;overflow:hidden;margin-bottom:12px;">'
    +'<button style="'+btnBase+courseActive+'" onclick="rcSwView=\'course\';rcSwRenderUI();">Course</button>'
    +'<button style="'+btnBase+timeActive+'" onclick="rcSwView=\'time\';rcSwRenderUI();">Time</button>'
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
  if(!allRaces.length){ listEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">No races today.</div>'; return; }

  listEl.innerHTML=upcoming.map(function(r,i){
    return rcSwRaceCardPreview(r, r._course||r.course||'', i===0);
  }).join('')
  +(past.length
    ? '<div style="font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em;padding:14px 0 6px;border-top:1px solid var(--bdr);margin-top:4px;">Earlier today</div>'
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
    return '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;margin-bottom:8px;overflow:hidden;">'
      +'<div data-course="'+escapedCourse+'" onclick="rcSwToggleCourse(this)" style="display:flex;align-items:center;gap:12px;padding:13px;cursor:pointer;background:'+(isOpen?'rgba(96,165,250,.05)':'transparent')+';">'
        +'<span style="font-size:20px;flex-shrink:0;">'+flag+'</span>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:15px;font-weight:700;color:'+(isOpen?'#60a5fa':'var(--txt)')+';">'+course+'</div>'
          +'<div style="font-family:monospace;font-size:10px;color:var(--mut);margin-top:2px;">'+type+' · '+count+' race'+(count!==1?'s':'')+(span?' · '+span:'')+'</div>'
        +'</div>'
        +'<span style="color:'+(isOpen?'#60a5fa':'var(--mut)')+';font-size:18px;display:inline-block;transform:'+(isOpen?'rotate(90deg)':'none')+';">›</span>'
      +'</div>'
      +(isOpen
        ? '<div style="border-top:1px solid var(--bdr);padding:10px 10px 2px;">'
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
  return '<div style="background:var(--sur);border:1px solid '+(isNext?'rgba(96,165,250,.35)':'var(--bdr)')+';border-radius:12px;margin-bottom:8px;overflow:hidden;'+(isPast?'opacity:0.38;':'')+'">'
    +'<div onclick="rcSwToggleFlatRace('+idx+')" style="padding:11px 13px;'+(isNext?'background:rgba(96,165,250,.05);':'')+'display:flex;align-items:center;gap:8px;cursor:pointer;">'
      +'<span style="font-family:monospace;font-size:14px;font-weight:700;color:'+(isNext?'#60a5fa':'var(--gld)')+';">'+time+'</span>'
      +flag
      +(isNext?'<span style="font-size:9px;font-weight:700;background:rgba(96,165,250,.15);color:#60a5fa;border:1px solid rgba(96,165,250,.3);padding:1px 5px;border-radius:4px;letter-spacing:.05em;flex-shrink:0;">NEXT</span>':'')
      +'<span style="font-size:14px;font-weight:'+(isNext?'700':'600')+';color:var(--txt);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+course+'</span>'
      +'<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'
        +'<span style="font-family:monospace;font-size:11px;color:var(--mut);">'+activeRunners+' runners</span>'
        +'<span id="rcfc-chev-'+idx+'" style="color:var(--mut);font-size:18px;display:inline-block;">›</span>'
      +'</div>'
    +'</div>'
    +(name?'<div style="padding:0 13px 6px;font-size:11px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+name+'</div>':'')
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
  return '<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:10px;margin-bottom:8px;overflow:hidden;">'
    +'<div data-race-idx="'+idx+'" onclick="rcSwToggleFlatRace('+idx+')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;cursor:pointer;">'
      +'<div>'
        +'<div style="font-family:monospace;font-size:12px;font-weight:700;color:#60a5fa;">'+time+'</div>'
        +'<div style="font-size:13px;font-weight:600;color:var(--txt);margin-top:1px;">'+name+'</div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;">'
        +'<span style="font-family:monospace;font-size:10px;color:var(--mut);">'+runnerCount+' runners'+(nrCount?' ('+nrCount+' NR)':'')+'</span>'
        +'<span id="rcfc-chev-'+idx+'" style="color:var(--mut);font-size:18px;display:inline-block;">›</span>'
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
  if(chev){chev.style.transform=open?'':'rotate(90deg)';chev.style.color=open?'var(--mut)':'#60a5fa';}
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
const UK_COURSES=['aintree','ascot','ayr','bangor','bangor-on-dee','bath','beverley','brighton','carlisle','cartmel','catterick','chelmsford','cheltenham','chepstow','chester','doncaster','epsom','exeter','fakenham','ffos las','fontwell','goodwood','hamilton','haydock','hereford','hexham','huntingdon','kelso','kempton','leicester','lingfield','ludlow','market rasen','musselburgh','newbury','newcastle','newmarket','newton abbot','nottingham','perth','plumpton','pontefract','redcar','ripon','salisbury','sandown','sedgefield','southwell','stratford','taunton','thirsk','uttoxeter','warwick','wetherby','wincanton','windsor','wolverhampton','worcester','yarmouth','york'];
const IRE_COURSES=['the curragh','leopardstown','naas','navan','gowran park','galway','tipperary','cork','killarney','listowel','down royal','downpatrick','dundalk','fairyhouse','kilbeggan','laytown','limerick','roscommon','sligo','tramore','thurles','punchestown','ballinrobe','bellewstown','clonmel','mullingar','wexford','kilmalloch'];

function rcCourseCountry(course){
  const c=(course||'').toLowerCase().trim();
  if(UK_COURSES.some(k=>c.includes(k)))return'gb';
  if(IRE_COURSES.some(k=>c.includes(k)))return'ie';
  if(c.includes('(aw)'))return'gb';
  return'intl';
}

function rcCountryFlag(code){
  return code==='gb'?'🇬🇧':code==='ie'?'🇮🇪':'🌍';
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
  chevEl.style.transform='rotate(180deg)';chevEl.style.color='#60a5fa';
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
    const dist=r.distance_round||r.distance||r.dist||'';
    const runners=(r.runners||r.horses||[]).length;
    const rname=name.toLowerCase();
    const isG1=rname.includes('group 1');const isG2=rname.includes('group 2');
    const isG3=rname.includes('group 3');const isListed=rname.includes('listed');
    const nameCol=isG1||isG2?'#f59e0b':isG3?'#a78bfa':isListed?'#a78bfa':'var(--txt)';
    return'<div id="sw-row-'+safeId+'-'+i+'" style="border-top:1px solid rgba(255,255,255,.04);">'      +'<div onclick="rcSwToggle('+i+',\''+course.replace(/\'/g,"\\'")+'\',' +"'"+safeId+"'"+',true)" style="display:flex;align-items:center;gap:12px;padding:10px 0 10px 8px;cursor:pointer;">'        +'<div style="font-size:15px;font-weight:700;color:var(--gld);flex-shrink:0;min-width:46px;font-family:monospace;">'+time+'</div>'        +'<div style="flex:1;min-width:0;">'          +'<div style="font-size:12px;color:var(--mut);margin-bottom:2px;">'+(dist?dist+' \u00b7 ':'')+runners+' Runners</div>'          +'<div style="font-size:13px;font-weight:600;color:'+nameCol+';line-height:1.3;">'+name+'</div>'        +'</div>'        +'<span id="sw-chev-'+safeId+'-'+i+'" style="color:var(--mut);font-size:13px;flex-shrink:0;transition:transform .15s;">\u203a</span>'      +'</div>'      +'<div class="rc-runners-inline" id="sw-runners-'+safeId+'-'+i+'" data-course="'+course+'" data-idx="'+i+'" style="display:none;"></div>'    +'</div>';
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
  if(cEl){cEl.style.transform='rotate(90deg)';cEl.style.color='var(--gld)';}
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
  const dist=race.distance_round||race.distance||'';
  const prize=race.prize||'';
  let html='<div style="background:var(--sur2);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:7px 13px;font-family:monospace;font-size:10px;color:var(--mut);margin-bottom:6px;">'
    +(dist?dist+' · ':'')+( race.going?race.going+' · ':'')+(prize?prize:'')+'</div>';
  if(!runners.length){el.innerHTML=html+'<div style="padding:8px 13px;color:var(--mut);font-style:italic;font-size:13px;">No runners listed yet.</div>';return;}
  html+=runners.map(function(r,i){
    const name=stripCountrySuffix(r.horse||r.name||'—');
    const no=r.number||r.saddle_cloth||(i+1);
    const draw=r.draw?'('+r.draw+')':'';
    const jock=r.jockey||r.jockeyName||'—';
    const trainer=r.trainer||r.trainerName||'—';
    const age=r.age?r.age+'yo':'';
    const form=r.form||'';
    const rpr=r.rpr||r.officialRating||'';
    const isNR=!!(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR'||r.status==='non_runner'||(''+r.status).toLowerCase()==='nr'||(''+r.jockey).toUpperCase()==='NON-RUNNER');
    const _bh=isNR?'':getBetHighlight(name,course,time);
    return'<div style="padding:9px 13px;border-bottom:1px solid var(--bdr);'+(isNR?'opacity:0.38;':_bh)+'display:flex;align-items:flex-start;gap:9px;">'
      +'<div style="width:22px;text-align:center;flex-shrink:0;padding-top:2px;">'
        +(isNR?'<span style="font-size:9px;font-weight:700;background:rgba(239,68,68,.15);color:var(--red);border:1px solid rgba(239,68,68,.3);padding:1px 4px;border-radius:4px;">NR</span>'
          :'<span style="font-family:monospace;font-size:13px;font-weight:700;color:var(--mut);">'+no+'</span>')
      +'</div>'
      +'<div style="flex:1;min-width:0;">'
        +(function(){
          const _wl=getWL();const _nl=(name||'').toLowerCase().trim();
          const _pr=_wl.find(function(w){return(w.horse||'').toLowerCase().trim()===_nl;});
          const _PM={'eye-catcher':{emoji:'👁',col:'#a78bfa'},'future-target':{emoji:'📰',col:'#fb923c'},'trainer-intel':{emoji:'🗣',col:'#60a5fa'},'form-study':{emoji:'📊',col:'#ef4444'},'tip-source':{emoji:'💡',col:'#eab308'}};
          const _pm=_pr?_PM[_pr.reason||'eye-catcher']:null;
          const _badge=_pr?'<span style="font-size:9px;font-family:monospace;padding:1px 5px;border-radius:10px;border:1px solid '+_pm.col+';color:'+_pm.col+';background:rgba(0,0,0,.35);margin-left:3px;">'+_pm.emoji+'</span>':'';
          const _nc=isNR?'var(--mut)':_pr?_pm.col:'var(--txt)';
          return'<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;">'
            +'<span style="font-size:14px;font-weight:700;color:'+_nc+';">'+(isNR?'<s>'+name+'</s>':name)+'</span>'
            +_badge
            +(draw?'<span style="font-family:monospace;font-size:11px;color:var(--mut);">'+draw+'</span>':'')
            +(form?'<span style="font-family:monospace;font-size:10px;color:var(--mut);letter-spacing:.06em;text-decoration:underline;text-underline-offset:2px;">'+form+'</span>':'')
          +'</div>';
        }())
        +'<div style="font-size:12px;color:var(--gld);margin-bottom:1px;">J: '+jock+'</div>'
        +'<div style="font-size:11px;color:var(--mut);">T: '+trainer+(age?' · '+age:'')+(rpr?' · <span style="font-size:9px;background:var(--sur2);border:1px solid var(--bdr);padding:1px 4px;border-radius:3px;">'+rpr+'</span>':'')+'</div>'
      +'</div>'
      +(isNR?''
        :'<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">'
          +'<button onclick="rcSwBet(event,\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+(race.race_name||'').replace(/'/g,"\\'")+'\',\'real\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:5px 10px;border-radius:7px;border:1px solid rgba(96,165,250,.3);background:rgba(96,165,250,.1);color:#60a5fa;cursor:pointer;">R</button>'
          +'<button onclick="rcSwBet(event,\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+(race.race_name||'').replace(/'/g,"\\'")+'\',\'virt\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:5px 10px;border-radius:7px;border:1px solid rgba(251,146,60,.3);background:rgba(251,146,60,.1);color:#fb923c;cursor:pointer;">V</button>'
        +'</div>')
    +'</div>';
  }).join('');
  el.innerHTML=html;
}

// ── Overlay flow: Racecard R/V → Checklist overlay → Log Bet overlay → back to Racecards ──
function rcSwBet(event, horse, course, time, jockey, trainer, raceName, mode){
  event.stopPropagation();
  _pendingRCBet={horse,course,time,jockey,trainer,raceName,mode};
  openPrebetOverlay();
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

function openLogbetOverlay(mode){
  const overlay=document.getElementById('logbet-overlay');
  const src=document.getElementById('c_LOGBET_OLD');
  if(src){
    src.style.display='block';
    src.style.position='static';
    src.style.height='auto';
    src.style.overflow='visible';
    const tgt=document.getElementById('lbo-content');
    if(tgt){tgt.innerHTML='';tgt.appendChild(src);}
  }
  // Header colouring
  const typeEl=document.getElementById('lbo-type-lbl');
  const titleEl=document.getElementById('lbo-title');
  const hdr=document.getElementById('lbo-header');
  if(mode==='virt'){
    if(typeEl){typeEl.textContent='Virtual Bet';typeEl.style.color='#fb923c';}
    if(titleEl){titleEl.textContent='Virtual Bet';titleEl.style.color='#fb923c';}
    if(hdr)hdr.style.borderBottom='1px solid rgba(251,146,60,.2)';
  } else {
    if(typeEl){typeEl.textContent='Real Bet';typeEl.style.color='#60a5fa';}
    if(titleEl){titleEl.textContent='Real Bet';titleEl.style.color='#60a5fa';}
    if(hdr)hdr.style.borderBottom='1px solid rgba(96,165,250,.2)';
  }
  setLBMode(mode);
  renderLogBetCard();
  // Pre-fill from pending
  if(_pendingRCBet){
    const p=_pendingRCBet;
    const pre=mode==='real'?'lb':'vb';
    setTimeout(function(){
      const he=document.getElementById(pre+'h');if(he)he.value=p.horse;
      const te=document.getElementById(pre+'t')||document.getElementById('lbt');if(te)te.value=p.course;
      const ti=document.getElementById(pre+'time');if(ti)ti.value=p.time;
      const je=document.getElementById(pre+'jockey');if(je)je.value=p.jockey;
      const tr=document.getElementById(pre+'trainer');if(tr)tr.value=p.trainer;
      if(mode==='real')calcLiveStake();else calcVirtStake();
    },50);
  }
  overlay.style.display='block';
}

function closeLogbetOverlay(){
  const overlay=document.getElementById('logbet-overlay');
  // Return log bet card to its hidden home
  const src=document.getElementById('c_LOGBET_OLD');
  const swShell=document.getElementById('sw-shell');
  if(src&&swShell){src.style.display='none';swShell.appendChild(src);}
  overlay.style.display='none';
  document.getElementById('prebet-overlay').style.display='none';
  document.body.style.overflow='';
  _pendingRCBet=null;
  // Return to Racecards card
  goTo(1);
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

let rcSwResultsData = [], rcSwResultsView = 'time', rcSwResultsOpenCourse = '';

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
  const btnBase = 'font-family:monospace;font-size:10px;letter-spacing:.07em;text-transform:uppercase;padding:7px 18px;border:none;cursor:pointer;font-weight:700;transition:all .12s;';

  filterEl.style.display = 'block';
  filterEl.innerHTML =
    '<div style="display:flex;background:var(--sur2);border:1px solid var(--bdr);border-radius:8px;overflow:hidden;margin-bottom:12px;">'
    + '<button style="'+btnBase+(!onT?'background:#fb923c;color:#141414;flex:1;':'background:transparent;color:var(--mut);flex:1;')+'" onclick="rcSwResultsView=\'course\';rcSwResultsOpenCourse=\'\';rcSwRenderResultsUI();">Course</button>'
    + '<button style="'+btnBase+(onT?'background:#fb923c;color:#141414;flex:1;':'background:transparent;color:var(--mut);flex:1;')+'" onclick="rcSwResultsView=\'time\';rcSwRenderResultsUI();">Time</button>'
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
  const time = race.off_time||race.off||race.time||'\u2014';
  const name = race.race_name||race.name||'Race';
  const places = (race.runners||[]).slice(0,5);
  return '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;margin-bottom:8px;overflow:hidden;">'
    + '<div style="padding:10px 13px;border-bottom:1px solid var(--bdr);background:rgba(251,146,60,.04);">'
      + '<div style="font-size:13px;font-weight:700;color:var(--txt);">'+time+' '+course+'</div>'
      + '<div style="font-size:11px;color:var(--mut);">'+name+'</div>'
    + '</div>'
    + places.map(function(r,i){
        const pos = r.position||r.place||(i+1);
        const horse = stripCountrySuffix(r.horse||r.name||'\u2014');
        const jock = r.jockey||'\u2014';
        const trainer = r.trainer||'\u2014';
        const sp = r.sp||'\u2014';
        const posCol = pos==1?'var(--grn)':pos==2?'#60a5fa':pos==3?'#fb923c':'var(--mut)';
        const esc = s => s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 13px;border-bottom:1px solid var(--bdr);">'
          + '<span style="font-family:monospace;font-weight:700;font-size:14px;color:'+posCol+';min-width:18px;">'+pos+'</span>'
          + '<div style="flex:1;min-width:0;">'
            + '<div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+horse+'</div>'
            + '<div style="font-size:11px;color:var(--mut);">'+jock+'</div>'
          + '</div>'
          + '<span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--gld);flex-shrink:0;">'+sp+'</span>'
          + '<button onclick="rcAddToWatchlist(\''+esc(horse)+'\',\''+esc(course)+'\',\''+esc(jock)+'\',\''+esc(trainer)+'\',\''+esc(name)+'\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:4px 8px;border-radius:7px;border:1px solid rgba(167,139,250,.3);background:rgba(167,139,250,.1);color:#a78bfa;cursor:pointer;flex-shrink:0;">W</button>'
        + '</div>';
      }).join('')
    + '</div>';
}

function rcSwRenderResultsTime(listEl){
  const sorted = rcSwResultsData.slice().sort(function(a,b){
    return cmpTime(b.off_time||b.off||b.time||'',a.off_time||a.off||a.time||'');
  });
  listEl.innerHTML = sorted.map(function(race){
    return rcSwRaceCard(race, race.course||race.venue||'Unknown');
  }).join('');
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
    return '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;margin-bottom:8px;overflow:hidden;">'
      + '<div onclick="rcSwResultsOpenCourse=rcSwResultsOpenCourse===\''+course+'\'?\'\':\''+course+'\';rcSwRenderResultsCourse(document.getElementById(\'sw-results-list\'));" style="display:flex;align-items:center;gap:12px;padding:13px;cursor:pointer;background:'+(isOpen?'rgba(251,146,60,.05)':'transparent')+';">'
        + '<div style="flex:1;">'
          + '<div style="font-size:15px;font-weight:700;color:'+(isOpen?'#fb923c':'var(--txt)')+';">'+course+'</div>'
          + '<div style="font-family:monospace;font-size:10px;color:var(--mut);margin-top:2px;">'+count+' race'+(count!==1?'s':'')+'</div>'
        + '</div>'
        + '<span style="color:'+(isOpen?'#fb923c':'var(--mut)')+';font-size:16px;transition:transform .15s;transform:'+(isOpen?'rotate(90deg)':'none')+';">\u203a</span>'
      + '</div>'
      + (isOpen
          ? '<div style="border-top:1px solid var(--bdr);padding:10px 10px 2px;">'
              + races.map(function(race){ return rcSwRaceCard(race, course); }).join('')
            + '</div>'
          : '')
    + '</div>';
  }).join('');
}


let rcCurrentRaces=[], rcMode='cards', rcSortedRaces=[], rcDay='today', rcView='course';

function rcInit(){
  rcSetDay('today');
  rcSetView('course');
}

function rcSetDay(day){
  rcDay=day;
  document.getElementById('rc-race-list').innerHTML='';
  const tl=document.getElementById('rc-time-list');
  if(tl)tl.innerHTML='';
  const meetEl=document.getElementById('rc-meeting');
  if(meetEl)meetEl.innerHTML='<option value="">— Select meeting —</option>';
  rcCurrentRaces=[];rcSortedRaces=[];
}

function rcSetView(view){
  rcView=view;
  const cb=document.getElementById('rc-btn-course');
  const tb=document.getElementById('rc-btn-time');
  if(cb){cb.style.background=view==='course'?'#60a5fa':'transparent';cb.style.color=view==='course'?'#141414':'var(--mut)';cb.style.fontWeight=view==='course'?'700':'400';}
  if(tb){tb.style.background=view==='time'?'#60a5fa':'transparent';tb.style.color=view==='time'?'#141414':'var(--mut)';tb.style.fontWeight=view==='time'?'700':'400';}
  // Show/hide meeting selector — only needed in course view
  const mw=document.getElementById('rc-meeting-wrap');
  if(mw)mw.style.display=view==='course'?'':'none';
  // Show correct list
  const courseList=document.getElementById('rc-race-list');
  const timeList=document.getElementById('rc-time-list');
  if(courseList)courseList.style.display=view==='course'?'block':'none';
  if(timeList)timeList.style.display=view==='time'?'block':'none';
  // If switching to time view and we have races loaded, render immediately
  if(view==='time'&&rcCurrentRaces.length) rcRenderTimeView();
  // If switching to time view and no races, load them
  if(view==='time'&&!rcCurrentRaces.length) rcLoadTimeView();
}

function rcSetMode(m){
  rcMode=m;
  const cb=document.getElementById('rc-btn-cards'),rb=document.getElementById('rc-btn-results');
  if(cb){cb.style.background=m==='cards'?'#60a5fa':'transparent';cb.style.color=m==='cards'?'#141414':'var(--mut)';cb.style.fontWeight=m==='cards'?'700':'400';}
  if(rb){rb.style.background=m==='results'?'#fb923c':'transparent';rb.style.color=m==='results'?'#141414':'var(--mut)';rb.style.fontWeight=m==='results'?'700':'400';}
  const cs=document.getElementById('rc-cards-section');
  const rs=document.getElementById('rc-results-section');
  if(cs)cs.style.display=m==='cards'?'block':'none';
  if(rs)rs.style.display=m==='results'?'block':'none';
  if(m==='results')rcLoadResults();
}

function rcLoad(){
  if(rcMode==='results')rcLoadResults();
  else rcLoadMeetings();
}

async function rcLoadMeetings(){
  rcSetStatus('Loading meetings…');
  const meetEl=document.getElementById('rc-meeting');
  meetEl.innerHTML='<option value="">Loading…</option>';
  const endpoint=rcDay==='tomorrow'?'racecards/tomorrow/free':'racecards/free';
  try{
    const data=await callRacingAPI(endpoint,{});
    const races=data.racecards||data.races||[];
    const courses={};
    races.forEach(function(r){
      const c=r.course||r.venue||'Unknown';
      if(!courses[c])courses[c]={course:c,races:[]};
      courses[c].races.push(r);
    });
    rcCurrentRaces=races;
    meetEl.innerHTML='<option value="">— Select meeting ('+ Object.keys(courses).length+') —</option>'
      +Object.keys(courses).sort().map(function(c){
        return'<option value="'+c+'">'+c+' ('+courses[c].races.length+' races)</option>';
      }).join('');
    rcSetStatus('');
    if(Object.keys(courses).length===1){meetEl.value=Object.keys(courses)[0];rcLoadRaces();}
  }catch(e){
    rcSetStatus('⚠️ '+e.message);
    meetEl.innerHTML='<option value="">— Error loading —</option>';
  }
}

async function rcLoadTimeView(){
  const tl=document.getElementById('rc-time-list');
  if(tl)tl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;padding:8px 0;">Loading…</div>';
  try{
    const data=await callRacingAPI('racecards/free',{});
    rcCurrentRaces=data.racecards||data.races||[];
    rcRenderTimeView();
  }catch(e){
    if(tl)tl.innerHTML='<div style="color:var(--red);font-size:13px;">⚠️ '+e.message+'</div>';
  }
}

function rcRenderTimeView(){
  const tl=document.getElementById('rc-time-list');
  if(!tl)return;

  // Flatten all races across all meetings with course info
  const allRaces=[];
  rcCurrentRaces.forEach(function(meeting){
    const course=meeting.course||meeting.venue||'Unknown';
    const races=meeting.runners?[meeting]:(meeting.races||[]);
    // Handle both flat (meeting IS a race) and nested (meeting has .races)
    if(meeting.runners){
      allRaces.push({...meeting, _course:course});
    } else {
      (meeting.races||[]).forEach(function(r){
        allRaces.push({...r, _course:course});
      });
    }
  });

  // Sort by time
  allRaces.sort(function(a,b){
    return timeToMins(a.off||a.off_time||a.time||'') - timeToMins(b.off||b.off_time||b.time||'');
  });

  // Split into upcoming and past
  const nowMins=new Date().getHours()*60+new Date().getMinutes();
  const upcoming=[], past=[];
  allRaces.forEach(function(r){
    const t=r.off||r.off_time||r.time||'';
    const mins=timeToMins(t);
    if(mins===9999||(mins-nowMins)>-30) upcoming.push(r);
    else past.push(r);
  });

  if(!allRaces.length){
    tl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">No races loaded.</div>';
    return;
  }

  let html='';

  // Upcoming races
  upcoming.forEach(function(r,i){
    const time=r.off||r.off_time||r.time||'—';
    const course=r._course||r.course||'';
    const name=r.race_name||r.name||r.title||'';
    const runners=(r.runners||r.horses||[]).filter(function(h){
      return !(h.non_runner||h.isNonRunner||(''+h.number).toUpperCase()==='NR');
    }).length;
    const isNext=i===0;
    html+='<div style="padding:11px 13px;border-bottom:1px solid var(--bdr);'
      +(isNext?'background:rgba(96,165,250,.06);border-left:3px solid #60a5fa;':'')
      +'cursor:pointer;" onclick="rcOpenTimeRace(this)" data-idx="'+allRaces.indexOf(r)+'">'
      +'<div style="display:flex;align-items:center;gap:8px;">'
      +'<span style="font-family:monospace;font-size:13px;font-weight:700;color:'+(isNext?'#60a5fa':'var(--gld)')+';">'+time+'</span>'
      +(isNext?'<span style="font-size:9px;font-weight:700;background:rgba(96,165,250,.15);color:#60a5fa;border:1px solid rgba(96,165,250,.3);padding:1px 5px;border-radius:4px;letter-spacing:.05em;">NEXT</span>':'')
      +'<span style="font-size:13px;font-weight:600;color:var(--txt);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+course+'</span>'
      +'<span style="font-size:11px;color:var(--mut);flex-shrink:0;">'+runners+' runners</span>'
      +'</div>'
      +(name?'<div style="font-size:11px;color:var(--mut);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+name+'</div>':'')
      +'</div>';
  });

  // Past races (greyed out, at bottom)
  if(past.length){
    html+='<div style="font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em;padding:12px 13px 4px;border-top:1px solid var(--bdr);margin-top:4px;">Earlier today</div>';
    past.forEach(function(r){
      const time=r.off||r.off_time||r.time||'—';
      const course=r._course||r.course||'';
      const name=r.race_name||r.name||r.title||'';
      html+='<div style="padding:9px 13px;border-bottom:1px solid var(--bdr);opacity:0.4;">'
        +'<div style="display:flex;align-items:center;gap:8px;">'
        +'<span style="font-family:monospace;font-size:13px;color:var(--mut);">'+time+'</span>'
        +'<span style="font-size:13px;color:var(--mut);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+course+'</span>'
        +'</div>'
        +(name?'<div style="font-size:11px;color:var(--mut);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+name+'</div>':'')
        +'</div>';
    });
  }

  tl.innerHTML=html;
}

function rcOpenTimeRace(el){
  const idx=parseInt(el.getAttribute('data-idx'));
  const allRaces=[];
  rcCurrentRaces.forEach(function(meeting){
    if(meeting.runners){
      allRaces.push(meeting);
    } else {
      (meeting.races||[]).forEach(function(r){ allRaces.push(r); });
    }
  });
  const race=allRaces[idx];
  if(!race)return;
  // Reuse existing race overlay
  rcShowRaceOverlay(race, race._course||race.course||'');
}

function rcRaceHTML(r, i, course){
  const time=r.off||r.off_time||r.time||'—';
  const name=r.race_name||r.name||r.title||('Race '+(i+1));
  const dist=r.distance_round||r.distance||r.dist||'';
  const cls=(r.race_class||r.class||'').toString().replace(/^class\s*/i,'');
  const going=r.going||'';
  const runners=(r.runners||r.horses||[]).length;
  const rname=(name||'').toLowerCase();
  const isG1=rname.includes('group 1');const isG2=rname.includes('group 2');
  const isG3=rname.includes('group 3');const isListed=rname.includes('listed');
  const stripe=isG1||isG2?'#f59e0b':isG3||isListed?'#a78bfa':'#60a5fa';
  const badge=isG1?'<span class="rc-pill rc-g1">G1</span>'
    :isG2?'<span class="rc-pill rc-g2">G2</span>'
    :isG3?'<span class="rc-pill rc-g3">G3</span>'
    :isListed?'<span class="rc-pill rc-listed">Listed</span>'
    :(cls?'<span class="rc-pill rc-cls">Cls '+cls+'</span>':'');
  const goingPill=going?'<span class="rc-pill rc-going">'+going+'</span>':'';
  return'<div class="rc-race-row" id="rc-row-'+i+'" data-idx="'+i+'" data-course="'+course+'">'
    +'<div class="rc-race-header" onclick="rcToggleRace('+i+',\''+course+'\')">'
    +'<div style="display:flex;align-items:center;gap:10px;">'
    +'<span style="font-size:15px;font-weight:700;color:var(--gld);flex-shrink:0;min-width:46px;">'+time+'</span>'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="font-size:13px;font-weight:600;color:var(--txt);margin-bottom:4px;line-height:1.3;">'+name+'</div>'
    +'<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">'+badge+goingPill
    +'<span style="font-size:10px;color:var(--mut);">'+runners+' runners</span>'
    +(dist?'<span style="font-size:10px;color:var(--mut);">· '+dist+'</span>':'')
    +'</div></div></div>'
    +'<span id="rc-chevron-'+i+'" style="color:var(--mut);font-size:14px;flex-shrink:0;transition:transform .15s;">›</span>'
    +'</div>'
    +'<div class="rc-runners-inline" id="rc-runners-'+i+'" style="display:none;"></div>'
    +'</div>';
}

function rcLoadRaces(){
  const course=document.getElementById('rc-meeting').value;
  if(!course){document.getElementById('rc-race-list').innerHTML='';return;}
  const races=rcCurrentRaces.filter(r=>(r.course||r.venue||'Unknown')===course)
    .sort(function(a,b){return cmpTime(a.off||a.off_time||a.time||'',b.off||b.off_time||b.time||'');});
  rcSortedRaces=races;
  document.getElementById('rc-race-list').innerHTML=
    '<div style="font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px;">'+course+' — '+races.length+' races</div>'
    +races.map(function(r,i){return rcRaceHTML(r,i,course);}).join('');
}

function rcToggleRace(idx, course){
  const runnersDiv=document.getElementById('rc-runners-'+idx);
  const chevron=document.getElementById('rc-chevron-'+idx);
  if(!runnersDiv)return;
  const isOpen=runnersDiv.style.display!=='none';
  // Close all others
  document.querySelectorAll('.rc-runners-inline').forEach(function(el,i){
    el.style.display='none';
  });
  document.querySelectorAll('[id^="rc-chevron-"]').forEach(function(el){
    el.style.transform='';el.style.color='var(--mut)';
  });
  if(isOpen){return;} // just close if already open
  // Open this one
  runnersDiv.style.display='block';
  chevron.style.transform='rotate(90deg)';chevron.style.color='var(--gld)';
  // Render runners if not yet
  if(!runnersDiv.dataset.rendered){
    rcRenderRunners(idx, course, runnersDiv);
    runnersDiv.dataset.rendered='1';
  }
  // Scroll race row into view
  const row=document.getElementById('rc-row-'+idx);
  if(row)setTimeout(function(){row.scrollIntoView({behavior:'smooth',block:'start'});},50);
}

function rcRenderRunners(idx, course, el){
  const races=rcSortedRaces||[];
  const race=races[idx];if(!race){el.innerHTML='';return;}
  const runners=race.runners||race.horses||[];
  const time=race.off||race.off_time||race.time||'—';
  const dist=race.distance_round||race.distance||'';
  const cls=(race.race_class||race.class||'').toString().replace(/^class\s*/i,'');
  const prize=race.prize||race.total_prize_money||'';
  // Race info bar
  const infoItems=[];
  if(dist)infoItems.push(dist);if(race.going)infoItems.push(race.going);
  if(cls)infoItems.push('Class '+cls);if(prize)infoItems.push(prize);
  let html='<div style="background:var(--sur2);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:8px 13px;font-family:monospace;font-size:10px;color:var(--mut);margin-bottom:6px;">'+infoItems.join(' · ')+'</div>';
  if(!runners.length){
    el.innerHTML=html+'<div style="padding:8px 13px;color:var(--mut);font-style:italic;font-size:13px;">No runners listed yet.</div>';return;
  }
  html+=runners.map(function(r,i){
    const name=stripCountrySuffix(r.horse||r.name||'—');
    const no=r.number||r.saddle_cloth||(i+1);
    const draw=r.draw?'('+r.draw+')':'';
    const jock=r.jockey||r.jockeyName||'—';
    const weight=r.weight||r.lbs||'';
    const trainer=r.trainer||r.trainerName||'—';
    const age=r.age?r.age+'yo':'';
    const form=r.form||'';
    const rpr=r.rpr||r.officialRating||'';
    const sp=r.sp||'';
    const pos=r.position||r.place||'';
    const hasResult=!!(pos&&pos!=='0');
    const isNR=!!(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR'||r.status==='non_runner'||r.status==='NR'||(''+r.status).toLowerCase()==='nr'||(''+r.jockey).toUpperCase()==='NON-RUNNER');
    const isFav=i===0&&!isNR;
    const borderCol=isNR?'rgba(239,68,68,.2)':hasResult?(pos==='1'?'var(--grn)':pos==='2'?'#60a5fa':pos==='3'?'#fb923c':'var(--bdr)'):'var(--bdr)';

    return'<div style="padding:10px 13px;border-bottom:1px solid var(--bdr);border-left:3px solid '+borderCol+';'+(isNR?'opacity:0.38;':isFav?'background:rgba(245,158,11,.025);':'')+'display:flex;align-items:flex-start;gap:10px;">'

      // Cloth
      +'<div style="width:26px;text-align:center;flex-shrink:0;padding-top:1px;">'
        +(isNR
          ?'<span style="font-size:9px;font-weight:700;background:rgba(239,68,68,.15);color:var(--red);border:1px solid rgba(239,68,68,.3);padding:2px 4px;border-radius:4px;">NR</span>'
          :'<span style="font-family:monospace;font-size:13px;font-weight:700;color:var(--mut);">'+no+'</span>'
        )
      +'</div>'

      // Main block
      +'<div style="flex:1;min-width:0;">'

        // Row 1: Name + draw
        +(function(){
          const wl=getWL();
          const nameLower=(name||'').toLowerCase().trim();
          const profiled=wl.find(function(w){return(w.horse||'').toLowerCase().trim()===nameLower;});
          const PREASON_META={'eye-catcher':{emoji:'👁',col:'#a78bfa'},'future-target':{emoji:'📰',col:'#fb923c'},'trainer-intel':{emoji:'🗣',col:'#60a5fa'},'form-study':{emoji:'📊',col:'#ef4444'},'tip-source':{emoji:'💡',col:'#eab308'}};
          const pm=profiled?PREASON_META[profiled.reason||'eye-catcher']:null;
          const profilerBadge=profiled?'<span style="font-size:9px;font-family:monospace;padding:1px 6px;border-radius:10px;border:1px solid '+pm.col+';color:'+pm.col+';background:rgba(0,0,0,.3);margin-left:4px;">'+pm.emoji+'</span>':'';
          const nameCol=isNR?'var(--mut)':profiled?pm.col:'var(--txt)';
          return'<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;">'
            +'<span style="font-size:14px;font-weight:700;color:'+nameCol+';">'+(isNR?'<s>'+name+'</s>':name)+'</span>'
            +profilerBadge
            +(draw?'<span style="font-family:monospace;font-size:11px;color:var(--mut);">'+draw+'</span>':'')
            +(hasResult?'<span style="font-family:monospace;font-size:11px;font-weight:700;color:'+(pos==='1'?'var(--grn)':pos==='2'?'#60a5fa':pos==='3'?'#fb923c':'var(--mut)')+';">'+pos+'</span>':'')
          +'</div>';
        }())

        // Row 2: J: Jockey • weight
        +'<div style="font-size:12px;color:var(--gld);margin-bottom:1px;">'
          +'J: '+jock+(weight?' <span style="color:var(--mut);">· '+weight+'</span>':'')
        +'</div>'

        // Row 3: form • T: Trainer • age
        +'<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">'
          +(form?'<span style="font-family:monospace;font-size:11px;color:var(--mut);letter-spacing:.06em;text-decoration:underline;text-underline-offset:2px;text-decoration-color:rgba(138,128,120,.4);">'+form+'</span>':'')
          +'<span style="font-size:11px;color:var(--mut);">T: '+trainer+(age?' · '+age:'')+'</span>'
          +(rpr?'<span style="font-size:9px;font-family:monospace;background:var(--sur2);border:1px solid var(--bdr);padding:1px 5px;border-radius:3px;color:var(--mut);">RPR '+rpr+'</span>':'')
        +'</div>'

      +'</div>'

      // Right: position/SP + R/V buttons
      +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;min-width:60px;">'
        +(hasResult&&sp?'<span style="font-family:monospace;font-size:13px;font-weight:700;color:var(--grn);">'+sp+'</span>':'')
        +(isNR?''
          :'<div style="display:flex;gap:4px;">'
            +'<button onclick="rcBetFromRunner(event,\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+(race.race_name||'').replace(/'/g,"\\'")+'\',\'real\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:5px 10px;border-radius:7px;border:1px solid rgba(96,165,250,.3);background:rgba(96,165,250,.1);color:#60a5fa;cursor:pointer;">R</button>'
            +'<button onclick="rcBetFromRunner(event,\''+name.replace(/'/g,"\\'")+'\',\''+course+'\',\''+time+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+(race.race_name||'').replace(/'/g,"\\'")+'\',\'virt\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:5px 10px;border-radius:7px;border:1px solid rgba(251,146,60,.3);background:rgba(251,146,60,.1);color:#fb923c;cursor:pointer;">V</button>'
          +'</div>')
      +'</div>'

    +'</div>';
  }).join('');
  el.innerHTML=html;
}

function rcShowRace(idx, course){ rcToggleRace(idx, course); }
function rcBack(){ document.querySelectorAll('.rc-runners-inline').forEach(function(el){el.style.display='none';});}

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
      toast.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#34d399;color:#141414;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.06em;padding:8px 16px;border-radius:20px;z-index:9999;transition:opacity .4s;pointer-events:none;';
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
        return'<div class="blk" style="margin-bottom:10px;padding:12px 14px;">'
          +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">'
            +'<div><div style="font-weight:700;font-size:14px;">'+time+' '+course+'</div>'
            +'<div style="font-size:12px;color:var(--mut);">'+name+'</div></div>'
          +'</div>'
          +places.map(function(r,i){
            const pos=r.position||r.place||(i+1);
            const horse=stripCountrySuffix(r.horse||r.name||'—');
            const jock=r.jockey||'—';
            const trainer=r.trainer||'—';
            const sp=r.sp||r.starting_price||'—';
            const posCol=pos==1?'var(--grn)':pos==2?'#60a5fa':pos==3?'#fb923c':'var(--mut)';
            return'<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--bdr);">'
              +'<span style="font-family:monospace;font-weight:700;font-size:14px;color:'+posCol+';min-width:20px;">'+pos+'</span>'
              +'<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+horse+'</div>'
              +'<div style="font-size:11px;color:var(--mut);">'+jock+'</div></div>'
              +'<span style="font-family:monospace;font-size:13px;color:var(--gld);flex-shrink:0;">'+sp+'</span>'
              +'<button onclick="rcAddToWatchlist(\''+horse.replace(/'/g,"\\'")+'\',\''+course+'\',\''+jock.replace(/'/g,"\\'")+'\',\''+trainer.replace(/'/g,"\\'")+'\',\''+name+'\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:4px 8px;border-radius:7px;border:1px solid rgba(167,139,250,.3);background:rgba(167,139,250,.1);color:#a78bfa;cursor:pointer;flex-shrink:0;">W</button>'
              +'</div>';
          }).join('')
          +'</div>';
      }).join('');
    }
  }catch(e){
    rcSetStatus('⚠️ '+e.message);
  }
}

function rcAddToWatchlist(horse, course, jockey, trainer, raceName){
  // Open the watchlist form overlay pre-filled — don't save immediately
  // raceName and track are intentionally omitted: user is planning ahead for a future race
  openWLForm(null, {
    horse: horse,
    trainer: trainer,
    jockey: jockey,
    notes: 'Noted from results on '+td()
  });
}

function rcBetFromRunner(event, horse, course, time, jockey, trainer, raceName, mode){
  event.stopPropagation();
  mode=mode||'real';
  setMode('sw');
  goTo(2);
  setTimeout(function(){
    setLBMode(mode);
    const prefix=mode==='real'?'lb':'vb';
    const h=document.getElementById(prefix+'h');if(h)h.value=horse;
    const t=document.getElementById(prefix+'t')||document.getElementById('lbt');if(t)t.value=course;
    const ti=document.getElementById(prefix+'time');if(ti)ti.value=time;
    const j=document.getElementById(prefix+'jockey');if(j)j.value=jockey;
    const tr=document.getElementById(prefix+'trainer');if(tr)tr.value=trainer;
    renderLogBetCard();
    if(mode==='real')setTimeout(calcLiveStake,150);
    else setTimeout(calcVirtStake,150);
  },300);
}

function rcSetStatus(msg){
  const el=document.getElementById('rc-status');
  if(el){el.textContent=msg;el.style.display=msg?'block':'none';}
}


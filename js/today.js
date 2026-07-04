// ─── TODAY ─── today card, tracks, chips, next race, study reminder

// ─── TRACKS ───
function getTracks(){const l=(D.dailyLog||[]).find(d=>d.date===td());return(l&&Array.isArray(l.tracks))?l.tracks:[];}
function setTracks(t){D.dailyLog=D.dailyLog||[];let l=D.dailyLog.find(d=>d.date===td());if(!l){l={date:td(),checkedIn:false,mood:'neutral',notes:'',tracks:[],createdAt:Date.now()};D.dailyLog.push(l);}l.tracks=t;save();}
function addTrack(){const el=document.getElementById('ttrack');const v=el.value.trim();if(!v)return;const t=getTracks();if(!t.includes(v)){t.push(v);setTracks(t);}el.value='';renderChips();rfrTL();}
function rmTrack(n){setTracks(getTracks().filter(x=>x!==n));renderChips();rfrTL();}

// ─── TODAY DEMO ───
function runTodayDemo(){
  const btn = document.getElementById('t-demo-btn');
  if(btn && btn.textContent.trim() === 'Demo ›'){
    btn.textContent = 'Clear ✕';
    btn.style.color = 'var(--red)';
    btn.style.borderColor = 'rgba(196,58,58,.3)';
    _showTodayDemo();
  } else {
    if(btn){ btn.textContent = 'Demo ›'; btn.style.color = 'rgba(232,228,220,.4)'; btn.style.borderColor = 'rgba(232,228,220,.15)'; }
    renderToday(); // restore real state
  }
}

function _showTodayDemo(){
  // ── P&L tiles ──
  const pe = document.getElementById('tpnl');
  if(pe){ pe.textContent = '+£68.00'; pe.style.color = '#3b82f6'; }
  const vpe = document.getElementById('t-virt-pnl');
  if(vpe){ vpe.textContent = '+£34.50'; vpe.style.color = '#ea580c'; }
  const rbs = document.getElementById('t-real-bank-sub');
  if(rbs) rbs.textContent = '£368.00';
  const vbs = document.getElementById('t-virt-bank-sub');
  if(vbs) vbs.textContent = '£534.50';

  // ── Bet strip ──
  const bl = document.getElementById('tbetlimit');
  if(bl) bl.innerHTML =
    '<div style="display:flex;align-items:center;gap:5px;padding:5px 2px;">'
    +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);">Last 5</span>'
    +'<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#3b82f6;"></span>'
    +'<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#3b82f6;"></span>'
    +'<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#ea580c;"></span>'
    +'<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.08);"></span>'
    +'<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.08);"></span>'
    +'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#3b82f6;margin-left:6px;"></span>'
    +'<span style="font-size:9px;color:var(--mut);">Real</span>'
    +'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ea580c;margin-left:4px;"></span>'
    +'<span style="font-size:9px;color:var(--mut);">Virtual</span>'
    +'<span style="flex:1;"></span>'
    +'<span style="font-size:11px;color:var(--mut);font-weight:600;">3 of 5 bets today</span>'
    +'</div>';

  // ── Check-in ──
  const ci = document.getElementById('tcin');
  if(ci) ci.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.03);border:1px solid var(--bdr);border-radius:9px;">'
    +'<span style="font-size:16px;flex-shrink:0;">🙂</span>'
    +'<div style="flex:1;min-width:0;">'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#4ade80;">Good mindset</div>'
      +'<div style="font-size:12px;color:var(--txt);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Watching the Gosden runners — looks a strong day at Ascot</div>'
    +'</div>'
    +'</div>';

  // ── Running Today — iconic horses / real races ──
  const ta = document.getElementById('t-today-alerts');
  if(ta){
    ta.style.display = 'block';
    ta.innerHTML = '<div class="t-alert-pur">'
      + '<div class="t-wl-hdr"><div class="t-alert-lbl-pur" style="display:flex;align-items:center;gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7;flex-shrink:0;"><path d="M17 11c.34 1.76.52 3.51.52 5.26 0 .79-.04 1.57-.11 2.35"/><path d="M3.52 16.26A14.26 14.26 0 0 1 3 11"/><path d="M13 3c-2.76 0-5.52.84-7 2.52"/><path d="M13 3c2.76 0 5.52.84 7 2.52"/><path d="M7 16.95a10 10 0 0 0 6 0"/><circle cx="13" cy="9" r="2"/></svg>Running Today</div></div>'
      + [
          // Frankel — 2000 Guineas, Newmarket 2011
          {horse:'Frankel',       course:'Newmarket', time:'14:00', jockey:'T. Queally',   race:"2000 Guineas (Group 1)",        edge:8, mr:140, or:132},
          // Enable — King George VI & QE Stakes, Ascot 2017
          {horse:'Enable',        course:'Ascot',     time:'15:45', jockey:'F. Dettori',   race:'King George VI & QE Stakes (G1)',edge:5, mr:128, or:123},
          // Kauto Star — Cheltenham Gold Cup 2009
          {horse:'Kauto Star',    course:'Cheltenham',time:'15:20', jockey:'R. Walsh',      race:'Cheltenham Gold Cup (Grade 1)', edge:0, mr:0,   or:0},
        ].map(function(a){
          const edgeBadge=a.edge>0
            ?'<span class="t-edge-badge" style="margin-left:7px;">MR '+a.mr+' · OR '+a.or+' · +'+a.edge+'</span>'
            :'';
          return '<div class="t-alert-row-pur">'
            +'<div class="t-row-sb-gap">'
              +'<div class="t-flex-info">'
                +'<div style="display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-bottom:3px;">'
                  +'<span class="t-horse-name">'+a.horse+'</span>'+edgeBadge
                +'</div>'
                +'<div class="t-muted" style="font-size:11px;">'+a.time+' · '+a.course+' · '+a.race+' · J: '+fmtJockey(a.jockey)+'</div>'
              +'</div>'
              +'<div class="t-flex-col-end">'
                +'<button class="t-review-btn">Review</button>'
                +'<button style="background:none;border:none;padding:2px 0;cursor:pointer;font-size:10px;color:var(--mut);text-align:right;letter-spacing:.02em;">Profile →</button>'
              +'</div>'
            +'</div>'
          +'</div>';
        }).join('')
      +'</div>';
  }

  // ── Next race ──
  const nr = document.getElementById('t-next-race');
  const nrc = document.getElementById('t-next-race-content');
  if(nr && nrc){
    nr.style.display = 'block';
    nrc.innerHTML =
      '<div class="t-next-card" style="border-left:3px solid #f87171;">'
        +'<div style="flex:1;min-width:0;">'
          +'<div class="t-next-title">14:00 · Newmarket</div>'
          +'<div class="mm" style="margin-top:2px;">2000 Guineas (Group 1)</div>'
          +'<div class="mm" style="margin-top:2px;display:flex;gap:6px;flex-wrap:wrap;">'
            +'<span>14 runners</span><span>· 1m</span><span>· Good to Firm</span>'
          +'</div>'
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0;">'
          +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:20px;font-weight:900;line-height:1.1;color:#f87171;">8m</div>'
          +'<div style="font-size:10px;opacity:.6;letter-spacing:.05em;text-transform:uppercase;">away</div>'
          +'<div class="t-next-cta">Racecards →</div>'
        +'</div>'
      +'</div>';
  }

  // ── Today's bets — real historical results ──
  const le = document.getElementById('tbets');
  if(le){
    le.innerHTML = [
      // Frankel 2000 Guineas 2011 — SP 1/2, Tom Queally
      {horse:"Frankel",       track:'Newmarket', time:'14:00', odds:'1/2',  stake:20, result:'win',     returns:30,   type:'real',  race:'2000 Guineas'},
      // Sea The Stars Epsom Derby 2009 — SP 11/4, Mick Kinane
      {horse:'Sea The Stars', track:'Epsom',     time:'15:00', odds:'11/4', stake:10, result:'win',     returns:37.5, type:'real',  race:'Epsom Derby'},
      // Enable King George 2017 — SP 8/13, Frankie Dettori
      {horse:'Enable',        track:'Ascot',     time:'15:45', odds:'8/13', stake:15, result:'pending', returns:0,    type:'virt',  race:'King George'},
    ].map(function(b){
      const isV=b.type==='virt';
      const p=b.result==='win'?b.returns-b.stake:b.result==='loss'?-b.stake:null;
      const bgMap={win:'bw1',loss:'bl1',pending:'bpend'};
      return '<div class="mb '+(b.result)+'" style="border-left-color:'+(isV?'var(--ora)':'')+';cursor:pointer;">'
        +'<div class="mbl">'
          +'<div class="mh">'+b.horse+(isV?' <span class="t-virt-lbl">VIRT</span>':'')+'</div>'
          +'<div class="mm">'+b.track+' · '+b.time+' · '+b.race+' · <span style="font-family:var(--font-ui);">'+b.odds+'</span></div>'
        +'</div>'
        +'<div class="mbr">'
          +'<span class="bdg '+(bgMap[b.result]||'bpend')+'">'+b.result+'</span>'
          +'<div class="mp '+(p===null?'':p>=0?'pos':'neg')+'" style="margin-top:2px;">'+(p===null?'—':fmt(p))+'</div>'
        +'</div>'
      +'</div>';
    }).join('');
  }
}

// cache shared via window._todayMeetingsCache
async function loadTodayMeetings(){
  const stEl=document.getElementById('t-meetings-status');
  if(stEl)stEl.textContent='Loading…';
  // Credentials are server-side (Cloudflare Worker) — no client check needed
  try{
    if(!window._todayMeetingsCache) window._todayMeetingsCache=await callRacingAPI('racecards/free',{});
    const data=window._todayMeetingsCache;
    const races=data.racecards||data.races||[];
    const courses=[...new Set(races.map(r=>r.course||r.venue||'').filter(Boolean))].sort();
    const current=getTracks();
    const listEl=document.getElementById('t-meetings-list');
    const picker=document.getElementById('t-meetings-picker');
    if(listEl){
      listEl.innerHTML=courses.map(function(c){
        const active=current.includes(c);
        const el=document.createElement('div');el.setAttribute('onclick','toggleMeetingChip("'+c+'")');el.id='tmc-'+c.replace(/[^a-zA-Z0-9]/g,'_');el.style.cssText='cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 11px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid;transition:all .12s;'+(active?'background:rgba(232,228,220,.1);border-color:rgba(232,228,220,.3);color:var(--gld)':'background:var(--sur2);border-color:var(--bdr);color:var(--mut)');el.textContent=c;return el.outerHTML;
      }).join('');
    }
    if(picker)picker.style.display='block';
    if(stEl)stEl.textContent=courses.length+' meetings';
    rfrTL();
    checkWatchlistRunners(races);
    renderNextRace();
    initTrackPulse();
  }catch(e){if(stEl)stEl.textContent='';}
}


function toggleMeetingChip(course){
  const t=getTracks();
  if(t.includes(course)){
    setTracks(t.filter(x=>x!==course));
  } else {
    t.push(course);setTracks(t);
  }
  renderChips();
  // Update the picker chip styling
  const el=document.getElementById('tmc-'+course.replace(/\s/g,'-'));
  const active=getTracks().includes(course);
  if(el){
    el.style.background=active?'rgba(232,228,220,.1)':'var(--sur2)';
    el.style.borderColor=active?'rgba(232,228,220,.3)':'var(--bdr)';
    el.style.color=active?'var(--gld)':'var(--mut)';
  }
}


function renderNextRace(){
  const el=document.getElementById('t-next-race');
  const content=document.getElementById('t-next-race-content');
  if(!el||!content)return;

  // Prefer the shared cache; fall back to rcSwCurrentRaces
  const raw=(window._todayMeetingsCache&&(window._todayMeetingsCache.racecards||window._todayMeetingsCache.races))
    || (typeof rcSwCurrentRaces!=='undefined'?rcSwCurrentRaces:[]);
  if(!raw||!raw.length){el.style.display='none';return;}

  // Flatten meetings → individual races (same logic as rcSwRenderTime)
  const flat=[];
  raw.forEach(function(meeting){
    const course=meeting.course||meeting.venue||'Unknown';
    if(meeting.runners){
      // Meeting IS the race
      flat.push({race:meeting,course:course});
    } else {
      (meeting.races||[]).forEach(function(r){
        flat.push({race:r,course:course});
      });
    }
  });
  if(!flat.length){el.style.display='none';return;}

  // Use td() for the date string (local date, avoids UTC offset issues in BST)
  const todayStr=td();
  const now=new Date();

  // Build timed list using timeToMins for consistency with racecards
  const allTimed=flat.map(function(item){
    const t=item.race.off||item.race.off_time||item.race.time||'';
    if(!t)return null;
    // Parse to a full Date using local date + time string
    const parts=t.split(':');
    if(parts.length<2)return null;
    let h=parseInt(parts[0],10),m=parseInt(parts[1],10);
    // Apply PM convention: before 09:30 = evening
    if(h<9||(h===9&&m<30))h+=12;
    const dt=new Date(todayStr+'T'+(String(h).padStart(2,'0'))+':'+String(m).padStart(2,'0')+':00');
    if(isNaN(dt.getTime()))return null;
    return{race:item.race,course:item.course,dt,diff:Math.round((dt-now)/60000)};
  }).filter(Boolean);

  if(!allTimed.length){el.style.display='none';return;}

  const upcoming=allTimed.filter(function(r){return r.diff>-5;}).sort(function(a,b){return a.diff-b.diff;});
  const past=allTimed.filter(function(r){return r.diff<=-5;}).sort(function(a,b){return b.diff-a.diff;});

  // Show the soonest upcoming; if all races finished show the most recent
  const next=upcoming.length?upcoming[0]:past.length?past[0]:null;
  if(!next){el.style.display='none';return;}

  const mins=next.diff;
  const absMins=Math.abs(mins);
  const hrs=Math.floor(absMins/60);
  const remMins=absMins%60;

  let countdown,countdownSub='';
  if(mins<=-5){
    countdown='Result pending';
  } else if(mins<=2){
    countdown='Starting now';
  } else if(hrs>0){
    countdown=hrs+'h '+remMins+'m';
    countdownSub='away';
  } else {
    countdown=remMins+'m';
    countdownSub='away';
  }

  // Colour: red <15m, amber <45m, green otherwise, grey if past
  const urgency=mins<=-5?'var(--mut)':mins<=15?'var(--red)':mins<=45?'var(--gld)':'var(--grn)';

  const course=next.course;
  const raceName=next.race.race_name||next.race.name||next.race.title||'';
  const raceTime=next.race.off||next.race.off_time||next.race.time||'';
  const runners=(next.race.runners||next.race.horses||[]).filter(function(r){
    return !r.non_runner&&!r.isNonRunner;
  }).length;
  const dist=typeof formatDist==='function'
    ?formatDist(next.race.distance_round||next.race.distance_f||next.race.distance||next.race.dist||''):'';
  const going=next.race.going||next.race.going_description||'';

  el.style.display='block';
  // Store for the click handler
  window._nextRaceCourse=course;
  window._nextRaceTime=raceTime;
  content.innerHTML=
    '<div class="t-next-card" style="border-left:3px solid '+urgency+';cursor:pointer;" onclick="goToNextRace()">'
      +'<div style="flex:1;min-width:0;">'
        +'<div class="t-next-title">'+raceTime+(raceTime&&course?' · ':'')+course+'</div>'
        +(raceName?'<div class="mm" style="margin-top:2px;">'+raceName+'</div>':'')
        +'<div class="mm" style="margin-top:2px;display:flex;gap:6px;flex-wrap:wrap;">'
          +(runners?'<span>'+runners+' runners</span>':'')
          +(dist?'<span>· '+dist+'</span>':'')
          +(going?'<span>· '+going+'</span>':'')
        +'</div>'
      +'</div>'
      +'<div class="t-next-count" style="color:'+urgency+';text-align:right;flex-shrink:0;">'
        +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:20px;font-weight:900;line-height:1.1;">'+countdown+'</div>'
        +(countdownSub?'<div style="font-size:10px;opacity:.6;letter-spacing:.05em;text-transform:uppercase;">'+countdownSub+'</div>':'')
        +'<div class="t-next-cta">Racecards →</div>'
      +'</div>'
    +'</div>';

  // Refresh every minute so the countdown ticks
  if(window._nextRaceTimer)clearTimeout(window._nextRaceTimer);
  window._nextRaceTimer=setTimeout(renderNextRace,60000);
}

// Navigate to Racecards and auto-expand a specific meeting + race row.
// Polls for the Races tab to actually finish loading (async fetch + DOM build)
// instead of guessing a fixed delay — fixes "lands on Races tab but race never opens"
// on cold loads / slow connections where the old setTimeout(350) fired too early.
function _rcGoToRace(course, time){
  if(!course){navTo('races');return;}
  navTo('races');
  const safeId=course.replace(/\W/g,'_');
  const deadline=Date.now()+4000;
  (function waitForMeetingRow(){
    const row=document.getElementById('swmtg-'+safeId);
    if(row){
      rcSwSelectCourse(course);
      waitForRaceData();
      return;
    }
    if(Date.now()<deadline){setTimeout(waitForMeetingRow,100);}
    // else: meeting never appeared (course not racing today / bad name) — leave user on Races tab
  })();
  function waitForRaceData(){
    const races=window.rcSwRacesByMeeting&&window.rcSwRacesByMeeting[course];
    if(races&&races.length){
      const idx=races.findIndex(function(r){
        const t=r.off||r.off_time||r.time||'';
        return t===time;
      });
      if(idx>-1)rcSwToggle(idx,course,safeId,true);
      return;
    }
    if(Date.now()<deadline){setTimeout(waitForRaceData,100);}
  }
}

function goToNextRace(){
  _rcGoToRace(window._nextRaceCourse,window._nextRaceTime);
}

function renderStudyReminder(){
  const el=document.getElementById('t-study-reminder');
  if(!el)return;
  const todayKey='study-done-'+td();
  const done=!!localStorage.getItem(todayKey);
  const todayBets=D.bets.filter(b=>b.date===td());
  const hasBets=todayBets.length>0;
  el.style.display='block';
  el.innerHTML='<div class="t-study-card '+(done?'done':'pending')+'">'
    +'<div class="row-sb" style="gap:10px;">'
      +'<div>'
        +'<div class="'+(done?'t-study-lbl-done':'t-study-lbl-pending')+'">📋 Form Study</div>'
        +'<div class="t-body">'+(done?'Done for today — good discipline.':hasBets?'You\'ve bet today. Form studied?':'Have you studied today\'s form before betting?')+'</div>'
      +'</div>'
      +(done
        ?'<span class="t-study-done-ico">✅</span>'
        :'<button onclick="markStudyDone()" class="t-study-btn">Mark done</button>'
      )
    +'</div>'
  +'</div>';
}

function markStudyDone(){
  localStorage.setItem('study-done-'+td(),'1');
  renderStudyReminder();
}

// ── Combined "Running Today" — watchlist + edge in one section ──
// Cross-reference a watched horse against today's results cache (already fetched for Track Pulse).
// Returns {position, result, going} once the race has actually finished, else null.
// NOTE: results/today/free (the free-tier endpoint) does NOT return beaten distance or SP —
// confirmed against a live runner payload (fields: horse_id, horse, age, sex, number, position,
// draw, weight, weight_lbs, headgear, or, jockey, jockey_id, trainer, trainer_id, owner, owner_id,
// sire, sire_id, dam, dam_id, damsire, damsire_id). Don't re-add those fields here without
// confirming a paid/upgraded endpoint actually returns them.
function _wlFindResult(horseName, course){
  const results=window._todayResultsCache||[];
  if(!results.length)return null;
  // Strip country suffix e.g. "Frankel (IRE)" — results feed includes it, watchlist entries don't
  const strip=function(s){return(typeof stripCountrySuffix==='function'?stripCountrySuffix(s||''):(s||'')).toLowerCase().trim();};
  // Strip trailing track-type qualifiers e.g. "Newcastle (AW)" so course names line up across feeds
  const normCourse=function(s){return(s||'').replace(/\s*\([^)]*\)\s*$/,'').toLowerCase().trim();};
  const hn=strip(horseName);
  const cn=normCourse(course);
  for(let i=0;i<results.length;i++){
    const race=results[i];
    const rc=normCourse(race.course||race.venue||'');
    if(cn&&rc&&rc!==cn)continue;
    const runners=race.runners||race.horses||[];
    for(let j=0;j<runners.length;j++){
      const r=runners[j];
      const rn=strip(r.horse||r.name||'');
      if(rn!==hn)continue;
      const pos=r.position||r.place||'';
      if(!pos)continue; // race hasn't returned a result for this runner yet
      const posNum=parseInt(pos)||0;
      const result=posNum===1?'win':(posNum>=2&&posNum<=3?'place':(posNum>3?'unplaced':''));
      return{
        position:String(pos),result:result,
        going:race.going||race.going_description||''
      };
    }
  }
  return null;
}

async function checkWatchlistRunners(races){
  const wl=getWL();
  const watching=wl.filter(function(e){return e.horse;});
  const alertEl=document.getElementById('t-today-alerts');
  if(!watching.length){
    if(alertEl){
      alertEl.style.display='block';
      alertEl.innerHTML='<div class="t-alert-pur" style="text-align:center;padding:20px 16px;">'
        +'<div style="font-size:28px;margin-bottom:10px;">⭐</div>'
        +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:14px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:6px;">No horses on your Profiler</div>'
        +'<div style="font-size:12px;color:var(--mut);line-height:1.6;margin-bottom:14px;">Add horses to your Puzzle Profiler and they\'ll appear here when they\'re declared to run today.</div>'
        +'<button onclick="navTo(\'watch\')" style="padding:9px 18px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">Open Profiler →</button>'
        +'</div>';
    }
    return;
  }

  const todayStr2=td();
  // Exclude horses added to the watchlist today — nothing to alert on yet
  const watching2=watching.filter(function(w){
    return !w.createdAt||new Date(w.createdAt).toISOString().slice(0,10)!==todayStr2;
  });

  const alerts=[];
  (races||[]).forEach(function(race){
    const time=race.off||race.off_time||race.time||'—';
    const course=race.course||race.venue||'—';
    const raceName=race.race_name||race.name||'';
    const raceDist=typeof formatDist==='function'?formatDist(race.distance_round||race.distance_f||race.distance||race.dist||''):(race.distance_round||race.distance_f||race.distance||race.dist||'');
    const raceGoing=race.going||race.going_description||'';
    const raceClass=race.race_class||race.class||'';
    (race.runners||race.horses||[]).filter(function(r){
      if(r.non_runner||r.isNonRunner)return false;
      if(String(r.status||'').toLowerCase()==='nr')return false;
      if(String(r.jockey||'').toUpperCase()==='NON-RUNNER')return false;
      if(String(r.jockey||'').toUpperCase()==='NR')return false;
      if(String(r.number||'').toUpperCase()==='NR')return false;
      return true;
    }).forEach(function(r){
      const horseName=(typeof stripCountrySuffix==='function'?stripCountrySuffix(r.horse||r.name||''):(r.horse||r.name||'')).toLowerCase().trim();
      const racecardOR=String(r.ofr||r['or']||r.official_rating||r.officialRating||r.rpr||(typeof rcGetOFR==='function'?rcGetOFR(r.horse||r.name||''):'')||'').trim();
      watching2.forEach(function(w){
        const wlName=(typeof stripCountrySuffix==='function'?stripCountrySuffix(w.horse||''):(w.horse||'')).toLowerCase().trim();
        if(horseName&&wlName&&horseName===wlName){
          // Auto-update OR if racecard has one and it differs from stored value — once per day only
          const storedOR=String(w.currentRating||'').trim();
          const alreadyUpdatedToday=w.orUpdatedDate===td();
          const orChanged=racecardOR&&racecardOR!==storedOR&&!alreadyUpdatedToday;
          if(orChanged){
            w.currentRating=racecardOR;
            w.orUpdatedDate=td();
            if(!w.orHistory)w.orHistory=[];
            w.orHistory.unshift({or:racecardOR,prev:storedOR,date:td(),auto:true});
            if(w.orHistory.length>20)w.orHistory=w.orHistory.slice(0,20);
            save();
          }
          if(!alerts.find(function(a){return a.horse.toLowerCase()===horseName;})){
            // Calculate edge (myRating vs currentRating)
            const mr=parseFloat(w.myRating);
            const or=parseFloat(orChanged?racecardOR:storedOR||w.currentRating);
            const edge=(mr&&or&&mr>or)?Math.round(mr-or):0;
            const resultInfo=_wlFindResult(r.horse||r.name,course);
            alerts.push({
              horse:r.horse||r.name,course,time,raceName,
              jockey:r.jockey||'',raceDist,raceGoing,raceClass,
              wlEntry:w,
              orUpdated:orChanged?racecardOR:null,
              orPrev:orChanged?storedOR:null,
              edge,mr,or,
              resultInfo
            });
          }
        }
      });
    });
  });

  if(!alertEl)return;
  if(!alerts.length){alertEl.style.display='none';window._wlAlerts=[];return;}

  // Edge horses first (highest edge), then by time
  alerts.sort(function(a,b){
    if(b.edge!==a.edge)return b.edge-a.edge;
    return(a.time||'').localeCompare(b.time||'');
  });

  window._wlAlerts=alerts; // stored for PDF generation

  // ── Persist pending review snapshots ─────────────────────────────────────
  // Save each alert to D.pendingReviews so the data survives beyond today.
  // Only save if not already reviewed and not already saved for this horse+date.
  if(!D.pendingReviews)D.pendingReviews=[];
  const todayDateStr=td();
  let pendingChanged=false;
  alerts.forEach(function(a){
    const wid=(a.wlEntry&&a.wlEntry.id)||'';
    if(!wid)return;
    // Skip if already fully reviewed
    const alreadyReviewed=(D.reviews||[]).some(function(r){return r.profileId===wid&&r.date===todayDateStr;});
    if(alreadyReviewed)return;
    // Skip if snapshot already saved for this profile + race date
    const alreadySaved=D.pendingReviews.some(function(p){return p.profileId===wid&&p.date===todayDateStr;});
    if(alreadySaved){
      // Update result/position if we now have result info we didn't before
      if(a.resultInfo){
        const saved=D.pendingReviews.find(function(p){return p.profileId===wid&&p.date===todayDateStr;});
        if(saved&&!saved.result){saved.result=a.resultInfo.result||'';saved.position=a.resultInfo.position||'';pendingChanged=true;}
      }
      return;
    }
    D.pendingReviews.push({
      id:gid?gid():(Date.now().toString(36)+Math.random().toString(36).slice(2,5)),
      profileId:wid,
      horse:a.horse,
      course:a.course,
      date:todayDateStr,
      time:a.time||'',
      raceName:a.raceName||'',
      raceDist:a.raceDist||'',
      raceGoing:a.raceGoing||'',
      raceClass:a.raceClass||'',
      result:(a.resultInfo&&a.resultInfo.result)||'',
      position:(a.resultInfo&&a.resultInfo.position)||'',
      savedAt:new Date().toISOString(),
    });
    pendingChanged=true;
  });
  if(pendingChanged)save();
  alertEl.style.display='block';
  const todayStr=td();

  alertEl.innerHTML='<div class="t-alert-pur">'
    +'<div class="t-wl-hdr">'
      +'<div class="t-alert-lbl-pur" style="display:flex;align-items:center;gap:6px;">'
        +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7;flex-shrink:0;"><path d="M17 11c.34 1.76.52 3.51.52 5.26 0 .79-.04 1.57-.11 2.35"/><path d="M3.52 16.26A14.26 14.26 0 0 1 3 11"/><path d="M13 3c-2.76 0-5.52.84-7 2.52"/><path d="M13 3c2.76 0 5.52.84 7 2.52"/><path d="M7 16.95a10 10 0 0 0 6 0"/><circle cx="13" cy="9" r="2"/></svg>'
        +'Running Today'
      +'</div>'
      +'<button onclick="shareWatchlistAlerts()" class="t-pdf-btn" style="display:flex;align-items:center;gap:5px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</button>'
    +'</div>'
    +alerts.map(function(a){
      const wid=(a.wlEntry&&a.wlEntry.id)?a.wlEntry.id:'';
      const alreadyReviewed=(D.reviews||[]).some(function(r){
        return r.profileId===wid&&r.date===todayStr;
      });
      const edgeBadge=a.edge>0
        ?'<span class="t-edge-badge" style="margin-left:7px;">MR '+a.mr+' · OR '+a.or+' · +'+a.edge+'</span>'
        :'';
      const ri=a.resultInfo;
      const finishBadge=ri
        ?'<span style="font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 8px;border-radius:6px;margin-left:5px;'
          +(ri.result==='win'?'background:rgba(22,163,74,.15);color:var(--grn);':ri.result==='place'?'background:rgba(217,119,6,.15);color:var(--gld);':'background:rgba(220,38,38,.12);color:var(--red);')
          +'">Finished '+ri.position+'</span>'
        :'';
      // Don't show review button if the watchlist entry was created today (just added)
      const addedToday=a.wlEntry&&a.wlEntry.createdAt&&new Date(a.wlEntry.createdAt).toISOString().slice(0,10)===todayStr;
      // Only show review button once the race has a result or the time has passed
      const raceMinsPast=(function(){
        try{const t=a.time||'';const parts=t.match(/(\d+):(\d+)/);if(!parts)return false;
          const now=new Date();const raceDate=new Date();
          raceDate.setHours(parseInt(parts[1]),parseInt(parts[2]),0,0);
          return now>raceDate;}catch(e){return false;}
      })();
      const reviewedInline=alreadyReviewed?'<span class="t-reviewed-inline">✓ Reviewed</span>':'';
      const reviewBtn=alreadyReviewed
        ?''
        :addedToday?''
        :(ri||raceMinsPast)
          ?'<button data-wlid="'+wid+'" data-horse="'+a.horse+'" data-course="'+a.course+'" data-time="'+a.time+'" data-race="'+(a.raceName||'')+'" data-dist="'+(a.raceDist||'')+'" data-going="'+(a.raceGoing||'')+'" data-class="'+(a.raceClass||'')+'"'
            +(ri?' data-result="'+ri.result+'" data-pos="'+ri.position+'"':'')
            +' class="t-wl-review-btn t-review-btn"'+(ri?' style="background:rgba(22,163,74,.12);border-color:rgba(22,163,74,.35);color:var(--grn);"':'')+'>'
            +(ri?'✓ Confirm Review':'Review ✍️')+'</button>'
          :'';
      // Reason badge — shows why this horse is logged
      const _REASON_META={
        'eye-catcher':  {label:'Eye-Catcher', col:'#a78bfa'},
        'future-target':{label:'Future Target',col:'#34d399'},
        'trainer-intel':{label:'Trainer Intel',col:'#38bdf8'},
        'form-study':   {label:'Form Study',  col:'#f59e0b'},
        'tip-source':   {label:'Tip Source',  col:'#fb7185'},
      };
      const _rm=_REASON_META[a.wlEntry&&a.wlEntry.reason]||null;
      const reasonBadge=_rm
        ?'<span style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+_rm.col+'18;border:1px solid '+_rm.col+'35;color:'+_rm.col+';">'+_rm.label+'</span>'
        :'';
      // Race meta: time · course · race name on first line, jockey on second
      const raceMeta=[a.time,a.course,a.raceName].filter(Boolean).join(' · ');
      const jockeyLine=a.jockey?'<div class="t-muted" style="font-size:13px;margin-top:2px;">J: '+fmtJockey(a.jockey)+'</div>':'';
      // Primary action: review (if available/past) or race (if upcoming)
      const primaryBtn=reviewBtn
        ?reviewBtn
        :'<button data-course="'+a.course+'" data-time="'+a.time+'" class="t-wl-race-btn t-race-btn">'
          +'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M17 11c.34 1.76.52 3.51.52 5.26 0 .79-.04 1.57-.11 2.35"/><path d="M3.52 16.26A14.26 14.26 0 0 1 3 11"/><path d="M13 3c-2.76 0-5.52.84-7 2.52"/><path d="M13 3c2.76 0 5.52.84 7 2.52"/><path d="M7 16.95a10 10 0 0 0 6 0"/><circle cx="13" cy="9" r="2"/></svg>'
          +' Racecard'
        +'</button>';
      const profileClick=wid?'window._wlProfileSource=\'today\';openWLProfile(\''+wid+'\');':'';
      return'<div class="t-alert-row-pur">'
        +'<div class="t-row-sb-gap">'
          +'<div class="t-flex-info"'+(profileClick?' onclick="'+profileClick+'" style="cursor:pointer;"':'')+'>'
            +'<div style="margin-bottom:4px;">'
              +'<span class="t-horse-name">'+a.horse+'</span>'
            +'</div>'
            +'<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px;">'
              +reviewedInline
              +reasonBadge
              +edgeBadge
              +finishBadge
            +'</div>'
            +'<div class="t-muted" style="font-size:13px;margin-top:1px;">'+raceMeta+'</div>'
            +jockeyLine
            +(a.orUpdated?'<div style="font-size:12px;color:var(--gld);margin-top:2px;">OR updated: '+(a.orPrev?a.orPrev+' → ':'')+a.orUpdated+'</div>':'')
          +'</div>'
          +'<div class="t-flex-col-end">'
            +primaryBtn
          +'</div>'
        +'</div>'
      +'</div>';
    }).join('')
  +'</div>';

  // Schedule push notifications for declared Profiler horses
  if(typeof notifScheduleToday==='function') notifScheduleToday(races, alerts);

  setTimeout(function(){
    alertEl.querySelectorAll('.t-wl-review-btn').forEach(function(btn){
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        openWLPostRaceReview(
          btn.getAttribute('data-wlid'),
          btn.getAttribute('data-horse'),
          btn.getAttribute('data-course'),
          btn.getAttribute('data-time'),
          btn.getAttribute('data-race'),
          btn.getAttribute('data-dist')||'',
          btn.getAttribute('data-going')||'',
          btn.getAttribute('data-class')||'',
          btn.getAttribute('data-result')||'',
          btn.getAttribute('data-pos')||''
        );
      });
    });
    alertEl.querySelectorAll('.t-wl-profile-btn').forEach(function(btn){
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        var id=btn.getAttribute('data-wlid');if(id){window._wlProfileSource='today';openWLProfile(id);}
      });
    });
    alertEl.querySelectorAll('.t-wl-race-btn').forEach(function(btn){
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        _rcGoToRace(btn.getAttribute('data-course'),btn.getAttribute('data-time')||'');
      });
    });
  },0);
}

// ── WATCHLIST SHARE ──
function shareWatchlistAlerts(){
  const alerts=window._wlAlerts||[];
  if(!alerts.length){alert('No watchlist horses running today.');return;}
  const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const lines=alerts.map(function(a){
    const meta=[a.time,a.course,a.raceName].filter(Boolean).join(' · ');
    const edge=a.edge>0?' [MR '+a.mr+' OR '+a.or+' +'+a.edge+']':'';
    return '🐎 '+a.horse+edge+'\n   '+meta+(a.jockey?'\n   J: '+a.jockey:'');
  });
  const text='Racing Puzzle — Tracker Alerts\n'+today+'\n\n'+lines.join('\n\n');
  if(navigator.share){
    navigator.share({title:'My Tracker Alerts — '+today,text:text}).catch(function(){});
  } else {
    navigator.clipboard.writeText(text).then(function(){
      flash('Copied to clipboard');
    }).catch(function(){
      alert(text);
    });
  }
}

// ── WATCHLIST PDF EXPORT ──
function generateWatchlistPDF(){
  const alerts=window._wlAlerts||[];
  if(!alerts.length){alert('No watchlist horses running today.');return;}

  function _buildPDF(){
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const PW=210,PH=297,M=12,CW=PW-M*2;
    const dateStr=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    // ── Colours ──
    const BLACK=[15,23,36];
    const NAVY=[15,23,36];
    const WHITE=[255,255,255];
    const LGREY=[245,246,248];
    const MGREY=[200,205,215];
    const DGREY=[100,110,130];
    const BLUE=[59,130,246];
    const GREEN=[22,163,74];
    const ORANGE=[234,88,12];
    const PURPLE=[245,158,11]; // matches CLR_WATCH
    const GOLD=[217,119,6];
    const RED=[220,38,38];

    const REASON_COL={
      'eye-catcher':PURPLE,'future-target':ORANGE,
      'trainer-intel':BLUE,'form-study':RED,'tip-source':GOLD
    };
    const REASON_LBL={
      'eye-catcher':'Eye Catcher','future-target':'Future Target',
      'trainer-intel':'Trainer Intel','form-study':'Form Study','tip-source':'Tip Source'
    };

    function sf(...c){doc.setFillColor(...c);}
    function ss(...c){doc.setDrawColor(...c);}
    function st(...c){doc.setTextColor(...c);}
    function rr(x,y,w,h,r,mode){doc.roundedRect(x,y,w,h,r,r,mode||'F');}

    // ── Page background ──
    sf(...LGREY); doc.rect(0,0,PW,PH,'F');

    // ── Header bar ──
    sf(...NAVY); doc.rect(0,0,PW,20,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(14);
    st(...WHITE);
    doc.text('Racing Puzzle',M,13);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    st(180,185,195);
    doc.text('Watchlist Briefing',M+36,13);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    st(150,155,170);
    doc.text(dateStr,PW-M,13,{align:'right'});

    // ── Sub-header ──
    sf(...WHITE); rr(M,24,CW,12,2,'F');
    ss(...MGREY); doc.setLineWidth(.2); rr(M,24,CW,12,2,'D');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    st(...NAVY);
    doc.text(alerts.length+' horse'+(alerts.length===1?'':'s')+' from your watchlist running today',M+4,31.5);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    st(...DGREY);
    doc.text('theracingpuzzle.github.io',PW-M-4,31.5,{align:'right'});

    let y=40;

    alerts.forEach(function(a){
      const w=a.wlEntry||{};
      const obs=(w.observations||[]).slice().sort(function(x,z){return(z.date||'').localeCompare(x.date||'');});
      const tgts=w.targets||[];
      const revs=(D.reviews||[]).filter(function(r){return r.profileId===w.id;}).slice().sort(function(x,z){return(z.date||'').localeCompare(x.date||'');});
      const lastRev=revs[0]||null;
      const mr=w.myRating?parseFloat(w.myRating):null;
      const or=w.currentRating?parseFloat(w.currentRating):null;
      const hasObs=obs.length>0;
      const hasTgt=tgts.length>0;
      const hasRev=!!lastRev;
      const hasIntel=!!(w.trainerIntel);

      // Estimate card height
      let ch=28; // header section always
      if(w.reasonNote)ch+=5;
      if(hasObs)ch+=6+(Math.min(obs.length,2)*10);
      if(hasRev)ch+=6+8;
      if(hasTgt)ch+=6+6;
      if(hasIntel)ch+=6+6;
      ch+=4; // bottom padding

      // Page break check
      if(y+ch>PH-14){
        doc.addPage();
        sf(...LGREY); doc.rect(0,0,PW,PH,'F');
        y=14;
      }

      const accentCol=REASON_COL[w.reason||'eye-catcher']||PURPLE;

      // ── Card shadow (simulate) ──
      sf(220,222,228); rr(M+.5,y+.8,CW,ch,2,'F');

      // ── Card background ──
      sf(...WHITE); rr(M,y,CW,ch,2,'F');

      // ── Left accent bar ──
      sf(...accentCol); doc.rect(M,y,2,ch,'F');
      // round the left corners of accent bar
      sf(...accentCol); rr(M,y,3,3,1.5,'F');
      sf(...accentCol); rr(M,y+ch-3,3,3,1.5,'F');

      const TX=M+6, TW=CW-10;
      let cy=y+7;

      // ── Race badge top-right ──
      const raceStr=a.time+(a.course?' · '+a.course:'');
      sf(...LGREY); rr(PW-M-4-doc.getTextWidth(raceStr)*1.8,y+3,doc.getTextWidth(raceStr)+8,5.5,1.5,'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(7);
      st(...DGREY);
      doc.text(raceStr,PW-M-4,y+7.2,{align:'right'});

      // ── Horse name ──
      doc.setFont('helvetica','bold');
      doc.setFontSize(13);
      st(...BLACK);
      doc.text(a.horse,TX,cy);
      cy+=5;

      // ── Race name ──
      if(a.raceName){
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        st(...DGREY);
        doc.text(a.raceName,TX,cy,{maxWidth:TW-40});
        cy+=4;
      }

      // ── Trainer & jockey ──
      const jt=[];
      if(a.jockey)jt.push({lbl:'J: '+fmtJockey(a.jockey),col:GREEN});
      if(w.trainer)jt.push({lbl:'T: '+w.trainer,col:ORANGE});
      if(jt.length){
        let px=TX;
        jt.forEach(function(item){
          doc.setFont('helvetica','normal');
          doc.setFontSize(7.5);
          st(...item.col);
          doc.text(item.lbl,px,cy);
          px+=doc.getTextWidth(item.lbl)+6;
        });
        cy+=5;
      }

      // ── Pills row: reason tag + OR + MR ──
      let px=TX;
      // Reason tag
      const rlbl=REASON_LBL[w.reason]||'Watchlist';
      const rw2=doc.getTextWidth(rlbl)+6;
      doc.setFontSize(6.5);
      doc.setFont('helvetica','bold');
      // background
      doc.setFillColor(accentCol[0],accentCol[1],accentCol[2],.12);
      sf(accentCol[0]+(255-accentCol[0])*.85,accentCol[1]+(255-accentCol[1])*.85,accentCol[2]+(255-accentCol[2])*.85);
      rr(px,cy-3,rw2,5,1.5,'F');
      st(...accentCol);
      doc.text(rlbl,px+3,cy+.5);
      px+=rw2+4;

      if(or){
        const lbl='OR '+or;
        const pw2=doc.getTextWidth(lbl)+6;
        sf(219,234,254); rr(px,cy-3,pw2,5,1.5,'F');
        st(...BLUE); doc.text(lbl,px+3,cy+.5);
        px+=pw2+4;
      }
      if(mr){
        const lbl='MR '+mr;
        const pw2=doc.getTextWidth(lbl)+6;
        sf(254,243,199); rr(px,cy-3,pw2,5,1.5,'F');
        st(...GOLD); doc.text(lbl,px+3,cy+.5);
        px+=pw2+4;
      }
      cy+=6;

      // ── Reason note ──
      if(w.reasonNote){
        doc.setFont('helvetica','italic');
        doc.setFontSize(7);
        st(...DGREY);
        doc.text('"'+w.reasonNote+'"',TX,cy,{maxWidth:TW});
        cy+=5;
      }

      // ── Divider ──
      ss(...MGREY); doc.setLineWidth(.15);
      doc.line(TX,cy,M+CW-4,cy);
      cy+=4;

      // ── Observations ──
      if(hasObs){
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        st(...NAVY);
        doc.text('OBSERVATIONS ('+obs.length+')',TX,cy);
        cy+=3.5;
        obs.slice(0,2).forEach(function(o){
          const res=o.result||'';
          const rc=res==='win'?GREEN:res==='place'?GOLD:res==='loss'?RED:DGREY;
          const resBg=res==='win'?[220,252,231]:res==='place'?[254,243,199]:res==='loss'?[254,226,226]:[243,244,246];
          // result pill
          doc.setFontSize(6.5);
          doc.setFont('helvetica','bold');
          const rl=(res||'—').toUpperCase();
          const rw3=doc.getTextWidth(rl)+5;
          sf(...resBg); rr(TX,cy-2.5,rw3,4.5,1,'F');
          st(...rc); doc.text(rl,TX+2.5,cy+.5);
          // meta
          doc.setFont('helvetica','normal');
          doc.setFontSize(7);
          st(...DGREY);
          const meta=[(o.date||''),(o.raceName||''),(o.going||'')].filter(Boolean).join(' · ');
          doc.text(meta,TX+rw3+2,cy+.5,{maxWidth:TW-rw3-2});
          cy+=4;
          if(o.notes){
            doc.setFont('helvetica','italic');
            doc.setFontSize(6.5);
            st(...DGREY);
            const lines=doc.splitTextToSize(o.notes,TW-4);
            doc.text(lines.slice(0,2),TX+2,cy);
            cy+=lines.slice(0,2).length*3+1;
          }
        });
        cy+=2;
      }

      // ── Last review ──
      if(hasRev){
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        st(...NAVY);
        doc.text('LAST REVIEW',TX,cy);
        cy+=3.5;
        const vc=lastRev.verdict==='upgrade'?GREEN:lastRev.verdict==='downgrade'?RED:BLUE;
        const vBg=lastRev.verdict==='upgrade'?[220,252,231]:lastRev.verdict==='downgrade'?[254,226,226]:[219,234,254];
        const vl=(lastRev.verdict||'—').toUpperCase();
        const vw=doc.getTextWidth(vl)+5;
        sf(...vBg); rr(TX,cy-2.5,vw,4.5,1,'F');
        st(...vc); doc.setFontSize(6.5); doc.setFont('helvetica','bold');
        doc.text(vl,TX+2.5,cy+.5);
        doc.setFont('helvetica','normal'); doc.setFontSize(7); st(...DGREY);
        const rl2=[(lastRev.result||''),(lastRev.date||'')].filter(Boolean).join(' · ');
        doc.text(rl2,TX+vw+3,cy+.5);
        cy+=4;
        if(lastRev.notes){
          doc.setFont('helvetica','italic'); doc.setFontSize(6.5); st(...DGREY);
          doc.text(doc.splitTextToSize(lastRev.notes,TW-4).slice(0,2),TX+2,cy);
          cy+=7;
        } else { cy+=2; }
      }

      // ── Next target ──
      if(hasTgt){
        doc.setFont('helvetica','bold'); doc.setFontSize(6.5); st(...NAVY);
        doc.text('NEXT TARGET',TX,cy);
        cy+=3.5;
        const tgt=tgts[0];
        const tStr=[tgt.race,tgt.track,tgt.date].filter(Boolean).join(' · ');
        const tw2=doc.getTextWidth(tStr)+6;
        sf(255,237,213); rr(TX,cy-2.5,tw2,4.5,1,'F');
        st(...ORANGE); doc.setFont('helvetica','normal'); doc.setFontSize(7);
        doc.text(tStr,TX+3,cy+.5,{maxWidth:TW});
        cy+=6;
      }

      // ── Trainer intel ──
      if(hasIntel){
        doc.setFont('helvetica','bold'); doc.setFontSize(6.5); st(...NAVY);
        doc.text('TRAINER INTEL',TX,cy);
        cy+=3.5;
        doc.setFont('helvetica','italic'); doc.setFontSize(6.5); st(...DGREY);
        doc.text(doc.splitTextToSize(w.trainerIntel,TW-4).slice(0,2),TX+2,cy);
        cy+=7;
      }

      y+=ch+5;
    });

    // ── Footer ──
    sf(...NAVY); doc.rect(0,PH-10,PW,10,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(6); st(...[150,155,170]);
    doc.text('Racing Puzzle · theracingpuzzle.github.io',M,PH-4);
    doc.text(dateStr,PW-M,PH-4,{align:'right'});

    // ── Save / Share ──
    const fname='racing-puzzle-'+new Date().toISOString().slice(0,10)+'.pdf';
    if(navigator.share&&typeof navigator.canShare==='function'){
      try{
        const blob=doc.output('blob');
        const file=new File([blob],fname,{type:'application/pdf'});
        if(navigator.canShare({files:[file]})){
          navigator.share({files:[file],title:'Racing Puzzle Watchlist'});
          return;
        }
      }catch(e){}
    }
    doc.save(fname);
  }

  if(window.jspdf&&window.jspdf.jsPDF){
    _buildPDF();
  } else {
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload=_buildPDF;
    s.onerror=function(){alert('Could not load PDF library.');};
    document.head.appendChild(s);
  }
}

function renderThisWeek(){
  const el=document.getElementById('t-this-week');
  const listEl=document.getElementById('t-this-week-list');
  if(!el||!listEl)return;
  const today=new Date();const todayStr=td();
  const nextWeek=new Date(today);nextWeek.setDate(today.getDate()+7);
  const items=[];
  if(typeof FIXTURES!=='undefined')FIXTURES.forEach(function(f){
    f.dates.forEach(function(d){
      if(d>todayStr&&new Date(d+'T00:00:00')<=nextWeek){
        if(!items.find(i=>i.label===f.name&&i.date===d))
          items.push({type:'fixture',date:d,label:f.emoji+' '+f.name,sub:f.course,col:f.colour});
      }
    });
  });
  getWL().filter(e=>e.raceDate&&e.raceDate>todayStr&&new Date(e.raceDate+'T00:00:00')<=nextWeek).forEach(function(e){
    items.push({type:'watch',date:e.raceDate,label:e.horse,sub:(e.raceName||'')+(e.track?' · '+e.track:''),col:CLR_WATCH});
  });
  items.sort(function(a,b){return a.date.localeCompare(b.date);});
  if(!items.length){el.style.display='none';return;}
  el.style.display='block';
  listEl.innerHTML=items.map(function(item){
    const d=new Date(item.date+'T00:00:00');
    const diff=Math.round((d-today)/(1000*60*60*24));
    const dayLbl=diff===1?'Tomorrow':d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    return'<div class="t-week-row">'
      +'<div class="t-week-bar" style="background:'+item.col+';"></div>'
      +'<div style="flex:1;min-width:0;"><div class="t-week-label">'+item.label+'</div>'+(item.sub?'<div class="mm">'+item.sub+'</div>':'')+'</div>'
      +'<div class="t-week-day" style="color:'+item.col+';">'+dayLbl+'</div>'
    +'</div>';
  }).join('');
}

function renderChips(){
  const el=document.getElementById('tchips');if(!el)return;
  const t=getTracks();
  el.innerHTML=t.length?t.map(n=>'<div class="t-track-chip"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.7;"><path d="M17 11c.34 1.76.52 3.51.52 5.26 0 .79-.04 1.57-.11 2.35"/><path d="M3.52 16.26A14.26 14.26 0 0 1 3 11"/><path d="M13 3c-2.76 0-5.52.84-7 2.52"/><path d="M13 3c2.76 0 5.52.84 7 2.52"/><path d="M7 16.95a10 10 0 0 0 6 0"/><circle cx="13" cy="9" r="2"/></svg> '+n+'<span class="t-track-rm" onclick="rmTrack(\''+n+'\')">×</span></div>').join(''):'<span class="t-no-tracks">No courses added yet — tap Load from API</span>';
}
function rfrTL(){const c=[...new Set([...getTracks(),...TKS])];document.querySelectorAll('.tl').forEach(dl=>{dl.innerHTML=c.map(t=>`<option value="${t}">`).join('');});}

// ─── TODAY ───
function renderToday(){
  const t=td();
  const dl=document.getElementById('tdlbl');
  if(dl) dl.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'});

  // ── Real P&L today ──
  const tb=D.bets.filter(b=>b.date===t);
  const set=tb.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr');
  const p=set.reduce((a,b)=>a+(pnl(b)||0),0);
  const pe=document.getElementById('tpnl');
  if(pe){
    pe.textContent=set.length?fmt(p):'—';
    pe.style.color=!set.length?'rgba(255,255,255,.4)':'#60a5fa';
  }
  const realBankSub=document.getElementById('t-real-bank-sub');
  if(realBankSub)realBankSub.textContent=fp(D.bank&&D.bank.current!=null?D.bank.current:0);

  // ── Virtual P&L today ──
  const vb=getVBank();
  const vtb=(vb.bets||[]).filter(b=>b.date===t);
  const vset=vtb.filter(b=>b.result&&b.result!=='pending'&&b.result!=='nr');
  const vp=vset.reduce((a,b)=>a+((parseFloat(b.returns)||0)-(parseFloat(b.stake)||0)),0);
  const vpe=document.getElementById('t-virt-pnl');
  if(vpe){
    vpe.textContent=vset.length?fmt(vp):'—';
    vpe.style.color=!vset.length?'rgba(255,255,255,.4)':'#fb923c';
  }
  const virtBankSub=document.getElementById('t-virt-bank-sub');
  if(virtBankSub)virtBankSub.textContent=fp(vb.current!=null?vb.current:500);

  // ── Show/hide P&L tiles ──
  const pnlTiles=document.getElementById('t-pnl-tiles');
  if(pnlTiles)pnlTiles.style.display=(tb.length||vtb.length)?'grid':'none';

  // ── Bet strip ──
  renderBetLimit();

  // ── Check-in state ──
  renderCheckIn();

  // ── Watchlist + Edge alerts ──
  if(window._todayMeetingsCache){
    const races=window._todayMeetingsCache.racecards||window._todayMeetingsCache.races||[];
    checkWatchlistRunners(races);
    renderNextRace();
  }

  // ── Streak ──

  // ── Today's bets ──
  renderTodayBets(tb, vtb);

  // ── League reminder ──
  renderLeagueReminder();

  // ── Outstanding ──
  renderOutstanding();

  // ── This week ──
  renderThisWeek();
}

function renderCheckIn(){
  const t=td();
  const log=(D.dailyLog||[]).find(d=>d.date===t);
  const ci=document.getElementById('tcin');
  if(!ci) return;
  if(log&&log.checkedIn){
    const moodEmoji ={poor:'😔',neutral:'😐',good:'🙂',great:'😄'}[log.mood||'neutral']||'😐';
    const moodLabel ={poor:'Below par',neutral:'Neutral',good:'Good mindset',great:'Sharp today'}[log.mood||'neutral']||'Checked in';
    const moodCol   ={poor:'#f87171',neutral:'var(--mut)',good:'#4ade80',great:'#34d399'}[log.mood||'neutral']||'var(--mut)';
    ci.innerHTML=
      '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.03);border:1px solid var(--bdr);border-radius:9px;">'
        +'<span style="font-size:16px;flex-shrink:0;">'+moodEmoji+'</span>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:'+moodCol+';">'+moodLabel+'</div>'
          +(log.focus
            ?'<div style="font-size:12px;color:var(--txt);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+log.focus+'</div>'
            :'<div style="font-size:11px;color:var(--mut);font-style:italic;">No focus set for today</div>'
          )
        +'</div>'
        +'<button onclick="undoCheckIn()" style="flex-shrink:0;padding:2px 8px;border-radius:5px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-size:10px;cursor:pointer;">Edit</button>'
      +'</div>';
  } else {
    // Show check-in strip — restore mood button active state
    const mood=(log&&log.mood)||'neutral';
    const _moodCols={poor:'var(--red)',neutral:'var(--mut)',good:'var(--grn)',great:'#34d399'};
    document.querySelectorAll('.mood-btn-sm').forEach(function(b){
      const m=b.getAttribute('onclick').replace("setMood('","").replace("')","");
      const activeCol=_moodCols[m]||'rgba(232,228,220,.8)';
      const isActive=m===mood;
      b.style.background=isActive?'rgba(255,255,255,.06)':'transparent';
      b.style.borderColor=isActive?activeCol:'var(--bdr)';
      b.style.color=isActive?activeCol:'var(--mut)';
      b.style.opacity=isActive?'1':'.4';
    });
    const tf=document.getElementById('t-focus');
    if(tf&&log&&log.focus) tf.value=log.focus;
  }
}

function setMood(mood){
  const moodCols={poor:'var(--red)',neutral:'var(--mut)',good:'var(--grn)',great:'#34d399'};
  document.querySelectorAll('.mood-btn-sm').forEach(function(b){
    b.style.background='transparent';b.style.borderColor='var(--bdr)';b.style.opacity='.4';b.style.color='var(--mut)';
  });
  const btn=document.getElementById('mood-'+mood);
  const activeCol=moodCols[mood]||'rgba(232,228,220,.8)';
  if(btn){btn.style.background='rgba(255,255,255,.06)';btn.style.borderColor=activeCol;btn.style.opacity='1';btn.style.color=activeCol;}
  const t=td();
  D.dailyLog=D.dailyLog||[];
  let log=D.dailyLog.find(d=>d.date===t);
  if(!log){log={date:t,checkedIn:false,mood:'neutral',notes:'',tracks:[],createdAt:Date.now()};D.dailyLog.push(log);}
  log.mood=mood;
  save();
}

function saveFocus(val){
  const t=td();
  D.dailyLog=D.dailyLog||[];
  let log=D.dailyLog.find(d=>d.date===t);
  if(!log){log={date:t,checkedIn:false,mood:'neutral',notes:'',tracks:[],createdAt:Date.now()};D.dailyLog.push(log);}
  log.focus=val.trim();
  save();
}

function doCheckIn(){
  const t=td();
  D.dailyLog=D.dailyLog||[];
  let log=D.dailyLog.find(d=>d.date===t);
  if(!log){log={date:t,checkedIn:false,mood:'neutral',notes:'',tracks:[],createdAt:Date.now()};D.dailyLog.push(log);}
  // mood is already written to log by setMood() on tap — just ensure a default
  if(!log.mood)log.mood='neutral';
  const focus=document.getElementById('t-focus');
  if(focus)log.focus=focus.value.trim();
  log.checkedIn=true;
  log.checkedInAt=Date.now();
  save();
  renderCheckIn();
}

function undoCheckIn(){
  const t=td();
  const log=D.dailyLog&&D.dailyLog.find(d=>d.date===t);
  if(log)log.checkedIn=false;
  save();
  // Re-inject the strip HTML then pre-fill saved values
  const ci=document.getElementById('tcin');
  if(ci){
    ci.innerHTML=
      '<div id="tmood-btns" style="display:flex;align-items:center;gap:5px;padding:6px 10px;background:rgba(255,255,255,.03);border:1px solid var(--bdr);border-radius:9px;">'
        +'<span style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);flex-shrink:0;margin-right:2px;">Mood</span>'
        +'<button class="mood-btn-sm" onclick="setMood(\'poor\')" id="mood-poor" title="Poor" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:1px solid var(--bdr);background:transparent;cursor:pointer;padding:0;color:var(--mut);transition:all .12s;">'
          +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
        +'</button>'
        +'<button class="mood-btn-sm" onclick="setMood(\'neutral\')" id="mood-neutral" title="Neutral" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:1px solid var(--bdr);background:transparent;cursor:pointer;padding:0;color:var(--mut);transition:all .12s;">'
          +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
        +'</button>'
        +'<button class="mood-btn-sm" onclick="setMood(\'good\')" id="mood-good" title="Good" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:1px solid var(--bdr);background:transparent;cursor:pointer;padding:0;color:var(--mut);transition:all .12s;">'
          +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
        +'</button>'
        +'<button class="mood-btn-sm" onclick="setMood(\'great\')" id="mood-great" title="Great" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:1px solid var(--bdr);background:transparent;cursor:pointer;padding:0;color:var(--mut);transition:all .12s;">'
          +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 3 4 3 4-3 4-3"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
        +'</button>'
        +'<input type="text" id="t-focus" placeholder="Focus for today…" autocomplete="off"'
          +' style="flex:1;min-width:0;background:transparent;border:none;outline:none;font-size:12px;color:var(--txt);padding:0 6px;"'
          +' onblur="saveFocus(this.value)">'
        +'<button onclick="doCheckIn()" id="t-checkin-btn"'
          +' style="flex-shrink:0;padding:4px 10px;border-radius:6px;border:none;background:rgba(22,163,74,.2);color:#4ade80;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.08em;cursor:pointer;">✓</button>'
      +'</div>';
    // Pre-fill saved values
    if(log){
      const focusEl=document.getElementById('t-focus');
      if(focusEl&&log.focus)focusEl.value=log.focus;
      if(log.mood)setMood(log.mood);
    }
  }
}

// renderEdgeAlerts merged into checkWatchlistRunners above

function renderTodayBets(tb, vtb){
  const le=document.getElementById('tbets');
  if(!le) return;
  const allBets=[...tb.map(b=>({...b,_type:'real'})),...vtb.map(b=>({...b,_type:'virt'}))];
  if(!allBets.length){
    le.innerHTML='<div style="text-align:center;padding:28px 16px;">'
      +'<div style="font-size:32px;margin-bottom:10px;">🎯</div>'
      +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:14px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:6px;">No bets today</div>'
      +'<div style="font-size:12px;color:var(--mut);line-height:1.6;">Use the form above to log your first bet of the day.</div>'
      +'</div>';
    return;
  }
  const bg={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
  le.innerHTML=allBets.map(function(b){
    const isV=b._type==='virt';
    const p2=isV?((b.result&&b.result!=='pending'&&b.result!=='nr')?(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0):null):pnl(b);
    const os=b.oddsDisplay||(b.odds||'—');
    const el=document.createElement('div');
    el.className='mb '+(b.result||'pending');
    el.style.borderLeftColor=isV?'var(--ora)':'';
    el.style.cursor='pointer';
    el.setAttribute('onclick',isV?'openVEM("'+b.id+'")':'openEM("'+b.id+'")');
    el.innerHTML='<div class="mbl"><div class="mh">'+b.horse+(isV?' <span class="t-virt-lbl">VIRT</span>':'')+'</div>'
      +'<div class="mm">'+(b.track||'—')+(b.time?' · '+b.time:'')+' · <span style="font-family:var(--font-ui);">'+os+'</span></div></div>'
      +'<div class="mbr"><span class="bdg '+(bg[b.result]||'bpend')+'">'+(b.result||'pending')+'</span>'
      +'<div class="mp '+(p2===null?'':p2>=0?'pos':'neg')+'" style="margin-top:2px;">'+(p2===null?'—':fmt(p2))+'</div></div>';
    return el.outerHTML;
  }).join('');
}

function renderLeagueReminder(){
  const el=document.getElementById('t-league-reminder');if(!el)return;
  if(typeof _lgMyLeagues==='undefined'||!_lgMyLeagues){el.style.display='none';return;}
  const today=td();
  const active=_lgMyLeagues.filter(function(l){return !_lgIsEnded(l);});
  if(!active.length){el.style.display='none';return;}
  const uid=typeof _lgUid==='function'?_lgUid():null;
  const missing=active.filter(function(l){
    const picks=(_lgPicks[l.id]||[]);
    const todayPick=picks.find(function(p){return p.user_id===uid&&p.pick_date===today;});
    return !todayPick;
  });
  if(!missing.length){el.style.display='none';return;}
  const names=missing.map(function(l){return l.name;});
  const multi=missing.length>1;
  el.style.display='block';
  el.innerHTML='<div onclick="navTo(\'leagues\')" class="t-league-banner">'
    +'<div class="t-league-icon">'
      +'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    +'</div>'
    +'<div style="flex:1;min-width:0;">'
      +'<div class="t-league-title">League Pick Needed</div>'
      +'<div class="t-league-body">No selection yet for <strong>'+names.join('</strong> &amp; <strong>')+'</strong></div>'
    +'</div>'
    +'<div class="t-league-arrow">›</div>'
  +'</div>';
}

function renderOutstanding(){
  const t=td();
  const allPrev=[
    ...D.bets.filter(b=>(!b.result||b.result==='pending')&&b.date!==t).map(b=>({...b,_type:'real'})),
    ...getVBank().bets.filter(b=>(!b.result||b.result==='pending')&&b.date!==t).map(b=>({...b,_type:'virt'}))
  ].sort(function(a,b){return a.date.localeCompare(b.date);});
  const owrap=document.getElementById('t-outstanding-wrap');
  const olist=document.getElementById('t-outstanding');
  const ocnt=document.getElementById('t-outstanding-count');
  if(owrap) owrap.style.display=allPrev.length?'block':'none';
  if(ocnt) ocnt.textContent=allPrev.length+' pending';
  if(olist&&allPrev.length){
    olist.innerHTML=allPrev.map(function(b){
      const isV=b._type==='virt';
      const fn=isV?'openVEM':'openEM';
      const os=b.oddsDisplay||(b.odds||'—');
      return'<div class="mb pending" onclick="'+fn+'(\''+b.id+'\')" style="cursor:pointer;border-left-color:'+(isV?'var(--ora)':'var(--red)')+';">'
        +'<div class="mbl"><div class="mh">'+b.horse+(isV?' <span class="t-virt-lbl">VIRT</span>':'')+'</div>'
        +'<div class="mm">'+b.date+' · '+(b.track||'—')+' · <span style="font-family:var(--font-ui);">'+os+'</span> · '+fp(b.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bdg-settle">settle</span></div></div>';
    }).join('');
  }
}
function saveToday(){D.dailyLog=D.dailyLog||[];const ex=D.dailyLog.find(d=>d.date===td());const e={date:td(),checkedIn:true,mood:document.getElementById('tmood').value,notes:document.getElementById('tnotes').value.trim(),tracks:getTracks(),createdAt:Date.now()};if(ex)Object.assign(ex,e);else D.dailyLog.push(e);save();updHdr();flash('tsaved');renderToday();}


// ─── TRACK PULSE ─────────────────────────────────────────────────────────────
// Rolling ticker: analyses today's results (jockeys, trainers, going,
// favourite SR, notable winners) from the Racing API.

async function fetchTodayResults(){
  // 1. Use rcSwResultsData if Results tab has already loaded it this session
  if(typeof rcSwResultsData!=='undefined'&&rcSwResultsData&&rcSwResultsData.length){
    window._todayResultsCache=rcSwResultsData;
    return rcSwResultsData;
  }
  // 2. Fetch from the correct results endpoint
  try{
    const data=await callRacingAPI('results/today/free',{});
    const res=data.results||data.racecards||data.races||[];
    if(res.length){
      window._todayResultsCache=res;
      // Share with racecards so Results tab benefits too
      if(typeof rcSwResultsData!=='undefined')rcSwResultsData=res;
      return res;
    }
  }catch(e){}
  // 3. Fallback: racecard cache (pre-race data only — no positions)
  const raw=(window._todayMeetingsCache&&
    (window._todayMeetingsCache.racecards||window._todayMeetingsCache.races))||[];
  window._todayResultsCache=raw;
  return raw;
}

// GB + Irish racecourses — excludes international (Sha Tin, Eagle Farm etc.)
var _TP_GB_TRACKS=new Set(['Ascot','Aintree','Ayr','Bath','Brighton','Carlisle','Catterick',
  'Chelmsford City','Cheltenham','Chester','Chepstow','Doncaster','Epsom','Exeter',
  'Fakenham','Ffos Las','Goodwood','Hamilton','Haydock','Hereford','Hexham','Huntingdon',
  'Kelso','Kempton','Leicester','Lingfield','Ludlow','Market Rasen','Musselburgh',
  'Newbury','Newcastle','Newmarket','Newton Abbot','Nottingham','Perth','Plumpton',
  'Pontefract','Redcar','Ripon','Salisbury','Sandown','Sedgefield','Southwell',
  'Stratford','Taunton','Thirsk','Towcester','Uttoxeter','Warwick','Wincanton',
  'Windsor','Wolverhampton','Worcester','Yarmouth','York',
  'Cork','Curragh','Down Royal','Dundalk','Galway','Gowran Park','Leopardstown',
  'Limerick','Naas','Navan','Punchestown','Sligo','Tipperary','Tramore']);

function _tpIsGB(course){
  if(!course)return false;
  // Exact match first, then check if any GB track name is contained in the course string
  if(_TP_GB_TRACKS.has(course))return true;
  var c=course.toLowerCase();
  for(var t of _TP_GB_TRACKS){if(c.indexOf(t.toLowerCase())>-1)return true;}
  return false;
}

function _tpBuildItems(races){
  const winners=[];
  const jockeyWins={};
  const trainerWins={};
  const trainerRuns={};
  const goingWins={};
  let totalFavs=0,favWins=0,totalRacesResult=0;

  // Filter to GB meetings only
  races=(races||[]).filter(function(m){return _tpIsGB(m.course||m.venue||'');});

  (races||[]).forEach(function(meeting){
    var course=meeting.course||meeting.venue||'';
    var meetingGoing=meeting.going||meeting.going_description||'';
    var meetingRaces=meeting.runners?[meeting]:(meeting.races||[]);
    meetingRaces.forEach(function(race){
      var raceGoing=race.going||race.going_description||meetingGoing||'';
      var raceTime=race.off||race.off_time||race.time||'';
      var runners=(race.runners||race.horses||[]).filter(function(r){
        return !r.non_runner&&!r.isNonRunner;
      });
      if(!runners.length)return;
      // Detect if this race has a result (any runner has a numeric position)
      var hasResult=runners.some(function(r){
        var pos=String(r.position||r.pos||'').trim().toLowerCase();
        return pos==='1'||pos==='w'||pos==='won'||pos==='1st';
      });
      if(!hasResult)return;
      totalRacesResult++;
      if(raceGoing){goingWins[raceGoing]=(goingWins[raceGoing]||0)+1;}

      // Identify favourite (lowest SP)
      var fav=null;
      runners.forEach(function(r){
        var sp=fo(r.sp||r.starting_price||'');
        if(sp>1&&(!fav||sp<fo(fav.sp||fav.starting_price||''))){fav=r;}
      });
      if(fav){
        totalFavs++;
        var favPos=String(fav.position||fav.pos||'').trim().toLowerCase();
        if(favPos==='1'||favPos==='w')favWins++;
      }

      // Collect winner data
      runners.forEach(function(r){
        var pos=String(r.position||r.pos||'').trim().toLowerCase();
        if(pos==='1'||pos==='w'||pos==='won'||pos==='1st'){
          var jk=r.jockey||r.jockey_name||'';
          var tr=r.trainer||r.trainer_name||'';
          var sp=r.sp||r.starting_price||'';
          var horse=r.horse||r.name||'';
          if(jk){jockeyWins[jk]=(jockeyWins[jk]||0)+1;}
          if(tr){trainerWins[tr]=(trainerWins[tr]||0)+1;}
          winners.push({horse:horse,course:course,time:raceTime,jockey:jk,trainer:tr,sp:sp,going:raceGoing});
        }
        // Track trainer runner count (for strike rate)
        var tr2=r.trainer||r.trainer_name||'';
        if(tr2)trainerRuns[tr2]=(trainerRuns[tr2]||0)+1;
      });
    });
  });

  var items=[];

  // ── No results yet — mine the racecard data for rich pre-race intel ──
  if(totalRacesResult===0){
    var allRaces=[];
    var jockeyMounts={};
    var trainerMounts={};
    var biggestFields=[];
    var notableRaces=[];
    var highRatedHorses=[];
    var courseGoings={};

    (races||[]).forEach(function(meeting){
      var course=meeting.course||meeting.venue||'';
      var meetingGoingRaw=meeting.going||meeting.going_description||'';
      var raceList=meeting.runners?[meeting]:(meeting.races||[]);
      raceList.forEach(function(race){
        var raceGoing=race.going||race.going_description||meetingGoingRaw||'';
        var raceTime=race.off||race.off_time||race.time||'';
        var raceName=race.race_name||race.name||race.title||'';
        var raceClass=String(race.race_class||race.class||'').trim();
        var runners=(race.runners||race.horses||[]).filter(function(r){return !r.non_runner&&!r.isNonRunner;});

        // Going per course (first race's going for that course)
        if(course&&raceGoing&&!courseGoings[course])courseGoings[course]=raceGoing;

        allRaces.push({time:raceTime,course:course,going:raceGoing,name:raceName,raceClass:raceClass,runnerCount:runners.length});

        // Notable races — Group/Grade 1/2/3 or Listed
        if(raceName&&(/\bGroup\b|\bGrade\b|\bGr\b|\bG1\b|\bG2\b|\bG3\b|\bListed\b/i.test(raceName)||/\bGroup\b|\bGrade\b/i.test(raceClass))){
          notableRaces.push({name:raceName,time:raceTime,course:course,runners:runners.length});
        }

        // Biggest fields
        if(runners.length>=12){
          biggestFields.push({course:course,time:raceTime,count:runners.length,name:raceName});
        }

        runners.forEach(function(r){
          var jk=r.jockey||r.jockey_name||'';
          var tr=r.trainer||r.trainer_name||'';
          var orRating=parseFloat(r.ofr||r['or']||r.official_rating||r.officialRating||0);
          var horse=r.horse||r.name||'';
          if(jk)jockeyMounts[jk]=(jockeyMounts[jk]||0)+1;
          if(tr)trainerMounts[tr]=(trainerMounts[tr]||0)+1;
          if(orRating>=110&&horse){highRatedHorses.push({horse:horse,or:orRating,course:course,time:raceTime,jockey:jk});}
        });
      });
    });

    var courses=[...new Set(allRaces.map(function(r){return r.course;}).filter(Boolean))];
    if(!allRaces.length)return items;

    // Total races and meetings
    items.push(allRaces.length+' races across '+courses.length+' meetings today');

    // Going — per course, concise
    var goingParts=Object.entries(courseGoings).slice(0,6).map(function(e){return e[0]+': '+e[1];});
    if(goingParts.length){items.push('Going — '+goingParts.join(' · '));}

    // First and last race
    var sorted=allRaces.filter(function(r){return r.time;}).sort(function(a,b){return timeToMins(a.time)-timeToMins(b.time);});
    if(sorted.length){
      items.push('First off: '+sorted[0].time+' '+sorted[0].course);
      if(sorted.length>1){items.push('Last race: '+sorted[sorted.length-1].time+' '+sorted[sorted.length-1].course);}
    }

    // Notable races
    notableRaces.slice(0,4).forEach(function(r){
      items.push(r.name+' — '+r.time+' '+r.course+' ('+r.runners+' runners)');
    });

    // Biggest fields
    biggestFields.sort(function(a,b){return b.count-a.count;}).slice(0,3).forEach(function(r){
      items.push('Big field: '+r.count+' runners — '+r.time+' '+r.course+(r.name?' · '+r.name:''));
    });

    // Busiest jockeys (5+ mounts = serious book)
    var jkBusy=Object.entries(jockeyMounts).sort(function(a,b){return b[1]-a[1];}).slice(0,4);
    jkBusy.forEach(function(e){
      var jk=e[0],m=e[1];
      if(m>=4)items.push(fmtJockey(jk)+' — '+m+' rides today');
    });

    // Busiest trainers
    var trBusy=Object.entries(trainerMounts).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
    trBusy.forEach(function(e){
      var tr=e[0],m=e[1];
      if(m>=5)items.push(tr+' — '+m+' runners declared today');
    });

    // High-rated horses (OR 110+)
    highRatedHorses.sort(function(a,b){return b.or-a.or;}).slice(0,4).forEach(function(h){
      items.push('OR '+h.or+': '+h.horse+' runs '+h.time+' at '+h.course+(h.jockey?' — '+fmtJockey(h.jockey):''));
    });

    // Watchlist horses running today (cross-reference)
    var wl=typeof getWL==='function'?getWL():[];
    var wlNames=wl.map(function(w){return (w.horse||'').toLowerCase().trim();}).filter(Boolean);
    if(wlNames.length){
      allRaces.forEach(function(race){
        // We can't easily get runners from allRaces here — already flattened
        // so skip — handled by checkWatchlistRunners separately
      });
    }

    return items;
  }

  // ── Results are in ──

  // Hot jockeys (2+ wins first, then singles)
  var jkSorted=Object.entries(jockeyWins).sort(function(a,b){return b[1]-a[1];});
  jkSorted.slice(0,3).forEach(function(entry){
    var jk=entry[0],w=entry[1];
    if(w>=2){items.push('[HOT_JK] Hot jockey: '+fmtJockey(jk)+' — '+w+' winner'+(w>1?'s':'')+' today');}
    else{items.push('[WIN] '+fmtJockey(jk)+' lands a winner today');}
  });

  // Hot trainers
  var trSorted=Object.entries(trainerWins).sort(function(a,b){return b[1]-a[1];});
  trSorted.slice(0,2).forEach(function(entry){
    var tr=entry[0],w=entry[1];
    var runs=trainerRuns[tr]||w;
    if(w>=2){items.push('[HOT_TR] Trainer in form: '+tr+' — '+w+'/'+runs+' today');}
    else if(runs>=3){items.push('[TR] '+tr+': 1 from '+runs+' runners today');}
  });

  // Favourite strike rate
  if(totalFavs>=2){
    var pct=Math.round(favWins/totalFavs*100);
    items.push((pct>=50?'[FAV_UP]':'[FAV_DN]')+' Fav SR: '+favWins+'/'+totalFavs+' ('+pct+'%) today'+(pct>=50?' — follow the market':' — market struggling'));
  }else if(totalFavs===1){
    items.push(favWins?'[FAV_UP] Favourite won in the only completed race so far':'[FAV_DN] Favourite beaten in the only result so far');
  }

  // Going patterns
  var goingSorted=Object.entries(goingWins).sort(function(a,b){return b[1]-a[1];});
  if(goingSorted.length){
    var g=goingSorted[0][0],c=goingSorted[0][1];
    items.push(c+' race'+(c>1?'s':'')+' completed on '+g+' ground today');
  }

  // Recent winners — last 5 as individual items
  var recent=winners.slice(-5).reverse();
  recent.forEach(function(w){
    var jkLabel=w.jockey?' — '+fmtJockey(w.jockey):'';
    items.push('[WIN] '+w.time+(w.course?' '+w.course:'')+': '+w.horse+jkLabel);
  });

  return items.length?items:[totalRacesResult+' result'+(totalRacesResult>1?'s':'')+' processed today'];
}

function renderTrackPulse(){
  var el=document.getElementById('t-track-pulse');
  if(!el)return;
  var races=(window._todayResultsCache||
    (window._todayMeetingsCache&&(window._todayMeetingsCache.racecards||window._todayMeetingsCache.races)))||[];
  if(!races.length){el.style.display='none';return;}

  var items=_tpBuildItems(races);
  // No results processed yet — show a standing-by message rather than hiding
  if(!items.length){
    var rcRaces=(window._todayMeetingsCache&&(window._todayMeetingsCache.racecards||window._todayMeetingsCache.races))||[];
    if(rcRaces.length){
      items=['Awaiting results — '+rcRaces.length+' meeting'+(rcRaces.length!==1?'s':'')+' today','Results update every 10 minutes'];
    }else{
      el.style.display='none';return;
    }
  }

  // Double items so the CSS scroll loop is perfectly seamless
  var doubled=items.concat(items);

  el.style.display='block';
  el.innerHTML=
    '<div class="tp-bar">'
      +'<div class="tp-label"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><rect x="2" y="9" width="4" height="6" rx="1"/><path d="M6 9l6-6v18l-6-6"/></svg></div>'
      +'<div class="tp-track-wrap">'
        +'<div class="tp-track">'
          +doubled.map(function(t){
            var cls='tp-item';
            var display=t;
            if(t.startsWith('[WIN]')){cls+=' tp-item-highlight';display=t.slice(5).trimStart();}
            else if(t.startsWith('[HOT_JK]')){cls+=' tp-item-highlight';display=t.slice(8).trimStart();}
            else if(t.startsWith('[HOT_TR]')){cls+=' tp-item-highlight';display=t.slice(8).trimStart();}
            else if(t.startsWith('[TR]')){display=t.slice(4).trimStart();}
            else if(t.startsWith('[FAV_UP]')){cls+=' tp-item-highlight';display=t.slice(8).trimStart();}
            else if(t.startsWith('[FAV_DN]')){cls+=' tp-item-warn';display=t.slice(8).trimStart();}
            return'<span class="'+cls+'">'+display+'</span><span class="tp-sep">·</span>';
          }).join('')
        +'</div>'
      +'</div>'
    +'</div>';
}

// Merge racecard + results into a unified race list so checkWatchlistRunners
// sees both declared runners AND finishing positions in a single pass.
function _mergeRacecardsAndResults(){
  const rcRaces=(window._todayMeetingsCache&&(window._todayMeetingsCache.racecards||window._todayMeetingsCache.races))||[];
  const resRaces=window._todayResultsCache||[];
  if(!resRaces.length)return rcRaces;
  if(!rcRaces.length)return resRaces;
  // Index results by course+time for fast lookup
  const resIdx={};
  resRaces.forEach(function(r){
    const key=(r.course||r.venue||'').toLowerCase().trim()+'|'+(r.off||r.off_time||r.time||'');
    resIdx[key]=r;
  });
  // Return merged list: result version if available (has positions), else racecard version
  return rcRaces.map(function(rc){
    const key=(rc.course||rc.venue||'').toLowerCase().trim()+'|'+(rc.off||rc.off_time||rc.time||'');
    return resIdx[key]||rc;
  }).concat(resRaces.filter(function(r){
    const key=(r.course||r.venue||'').toLowerCase().trim()+'|'+(r.off||r.off_time||r.time||'');
    return !rcRaces.some(function(rc){
      return (rc.course||rc.venue||'').toLowerCase().trim()+'|'+(rc.off||rc.off_time||rc.time||'')=== key;
    });
  }));
}

async function initTrackPulse(){
  await fetchTodayResults();
  renderTrackPulse();

  // Pass merged racecard+results data to watchlist checker so it sees
  // both declared runners AND finishing positions in a single pass
  if(typeof checkWatchlistRunners==='function'){
    const merged=_mergeRacecardsAndResults();
    if(merged.length)checkWatchlistRunners(merged);
  }

  // Settle league picks — wait for leagues to finish loading if needed
  function _doLgSync(){
    if(typeof lgSyncResults==='function'&&window._todayResultsCache&&window._todayResultsCache.length){
      if(typeof _lgLoaded!=='undefined'&&!_lgLoaded){
        // Leagues not loaded yet — retry in 3 seconds
        setTimeout(_doLgSync,3000);
        return;
      }
      lgSyncResults(window._todayResultsCache);
    }
  }
  _doLgSync();

  // Auto-settle personal bets
  if(window._todayResultsCache&&window._todayResultsCache.length){
    syncBetResults(window._todayResultsCache);
  }

  // Refresh every 10 minutes — bust caches so results are genuinely fresh
  if(window._tpRefreshTimer)clearInterval(window._tpRefreshTimer);
  window._tpRefreshTimer=setInterval(async function(){
    window._todayResultsCache=null;
    if(typeof rcSwResultsData!=='undefined')rcSwResultsData=[];
    try{ window._todayMeetingsCache=await callRacingAPI('racecards/free',{}); }catch(e){}
    await fetchTodayResults();
    renderTrackPulse();
    if(typeof checkWatchlistRunners==='function'){
      const merged=_mergeRacecardsAndResults();
      if(merged.length)checkWatchlistRunners(merged);
    }
    if(typeof lgSyncResults==='function'&&window._todayResultsCache&&window._todayResultsCache.length){
      lgSyncResults(window._todayResultsCache);
    }
    if(window._todayResultsCache&&window._todayResultsCache.length){
      syncBetResults(window._todayResultsCache);
    }
  },10*60*1000);
}

// ── Auto-settle personal bets from race results ───────────────────────────────
function syncBetResults(results){
  if(!results||!results.length)return;
  const today=td();

  const normHorse=function(s){return(s||'').replace(/\s*\([^)]+\)\s*$/,'').toLowerCase().trim();};

  // Build result map: horseName → {pos, numRunners, sp}
  const resultMap={};
  results.forEach(function(race){
    const numRunners=(race.runners||race.horses||[]).length;
    (race.runners||race.horses||[]).forEach(function(r){
      const hn=normHorse(r.horse||r.name||'');
      if(!hn)return;
      const posRaw=r.position||r.place||'';
      const pos=parseInt(posRaw);
      if(!posRaw||isNaN(pos))return;
      if(!resultMap[hn]){
        resultMap[hn]={pos,numRunners,sp:r.sp||r.starting_price||''};
      }
    });
  });

  if(!Object.keys(resultMap).length)return;

  let changed=false;

  // Determine place terms based on field size (standard UK rules)
  function placeTerms(numRunners){
    if(numRunners<=4)return null;       // no place market
    if(numRunners<=7)return'1/4';       // 2 places
    if(numRunners<=12)return'1/5';      // 3 places
    return'1/4';                        // 4+ places (handicaps etc.)
  }

  // How many places paid
  function placesNum(numRunners){
    if(numRunners<=4)return 1;
    if(numRunners<=7)return 2;
    if(numRunners<=12)return 3;
    return 4;
  }

  function settleBet(b){
    if(b.result&&b.result!=='pending')return false; // already settled
    if(b.date!==today)return false;                 // only today's bets
    const hn=normHorse(b.horse||'');
    const res=resultMap[hn];
    if(!res)return false;

    const pos=res.pos;
    const places=placesNum(res.numRunners);
    const betType=b.betType||'win';

    let result;
    if(pos===1){
      result='win';
    } else if(pos<=places&&(betType==='ew'||betType==='place')){
      result='place';
    } else {
      result='loss';
    }

    // Use stored odds; fall back to SP from results
    const oddsRaw=b.oddsDisplay||b.odds||res.sp||'';
    const odDec=fo(String(oddsRaw));
    const ewT=placeTerms(res.numRunners)||'1/4';
    const returns=calcReturns(result,b.stake,odDec,betType,ewT);

    b.result=result;
    b.returns=returns;
    // If no odds were stored, fill in the SP so it shows on the bet
    if(!b.odds&&res.sp)b.odds=fo(String(res.sp));
    if(!b.oddsDisplay&&res.sp)b.oddsDisplay=String(res.sp);
    return true;
  }

  // Settle real bets
  (D.bets||[]).forEach(function(b){if(settleBet(b))changed=true;});

  // Settle virtual bets
  const vb=getVBank();
  (vb.bets||[]).forEach(function(b){if(settleBet(b))changed=true;});

  if(changed){
    save();
    if(typeof updHdr==='function')updHdr();
    if(typeof renderStats==='function')renderStats();
    if(typeof renderToday==='function')renderToday();
  }
}

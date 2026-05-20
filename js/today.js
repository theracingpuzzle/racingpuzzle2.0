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
  if(pe){ pe.textContent = '+£42.50'; pe.style.color = 'var(--grn)'; }
  const vpe = document.getElementById('t-virt-pnl');
  if(vpe){ vpe.textContent = '+£18.00'; vpe.style.color = 'var(--grn)'; }

  // ── Bet limit tile ──
  const bl = document.getElementById('tbetlimit');
  if(bl) bl.innerHTML = '<div style="font-family:monospace;font-size:9px;color:rgba(232,228,220,.45);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Bets Today</div>'
    + '<div style="font-family:monospace;font-size:17px;font-weight:700;color:var(--gld);">2 <span style="font-size:11px;color:var(--mut);">/ 3</span></div>';

  // ── Check-in ──
  const ci = document.getElementById('tcin');
  if(ci) ci.innerHTML = '<div style="background:rgba(45,184,122,.08);border:1px solid rgba(45,184,122,.25);border-radius:11px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;">'
    + '<div><div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--grn);margin-bottom:3px;">✓ Checked in</div>'
    + '<div style="font-size:13px;color:var(--txt);">Looking for a well-treated handicapper on decent ground</div></div>'
    + '<span style="font-size:22px;">🙂</span></div>';

  // ── Edge alerts ──
  const ea = document.getElementById('t-edge-alerts');
  if(ea){
    ea.style.display = 'block';
    ea.innerHTML = '<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:11px;padding:12px 14px;">'
      + '<div style="font-family:monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#4ade80;margin-bottom:8px;">⭐ Edge Running Today</div>'
      + [
          {horse:'Midnight Envoy', course:'Ascot', time:'14:30', mr:92, or:88, edge:4},
          {horse:'Thistle Down',   course:'York',  time:'16:10', mr:85, or:82, edge:3},
        ].map(function(e){
          return '<div style="padding:7px 0;border-bottom:1px solid rgba(74,222,128,.1);display:flex;align-items:center;justify-content:space-between;">'
            + '<div><div style="font-size:13px;font-weight:700;color:var(--txt);">'+e.horse+'</div>'
            + '<div style="font-family:monospace;font-size:10px;color:var(--mut);">'+e.time+' · '+e.course+'</div></div>'
            + '<span style="font-family:monospace;font-size:11px;font-weight:700;color:#4ade80;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25);padding:3px 8px;border-radius:8px;white-space:nowrap;">MR '+e.mr+' · OR '+e.or+' · +'+e.edge+'</span>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  // ── Watchlist alert ──
  const wa = document.getElementById('t-wl-alerts');
  if(wa){
    wa.style.display = 'block';
    wa.innerHTML = '<div style="background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25);border-radius:11px;padding:12px 14px;">'
      + '<div style="font-family:monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#a78bfa;margin-bottom:8px;">🔔 Watchlist Running Today</div>'
      + [
          {horse:'Midnight Envoy', course:'Ascot', time:'14:30', jockey:'F. Dettori', race:'Copper Horse Stakes'},
          {horse:'Velvet Sunrise',  course:'Newmarket', time:'15:45', jockey:'R. Moore', race:'July Stakes'},
        ].map(function(a){
          return '<div style="padding:7px 0;border-bottom:1px solid rgba(167,139,250,.12);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">'
            + '<div><div style="font-size:13px;font-weight:700;color:var(--txt);">'+a.horse+'</div>'
            + '<div style="font-size:11px;color:var(--mut);">'+a.time+' · '+a.course+' · '+a.race+'</div>'
            + '<div style="font-size:11px;color:var(--gld);">J: '+a.jockey+'</div></div>'
            + '<span style="font-family:monospace;font-size:9px;font-weight:700;background:rgba(167,139,250,.15);color:#a78bfa;padding:3px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;">Profile →</span>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  // ── Next race ──
  const nr = document.getElementById('t-next-race');
  const nrc = document.getElementById('t-next-race-content');
  if(nr && nrc){
    nr.style.display = 'block';
    nrc.innerHTML = '<div style="background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2);border-radius:11px;padding:12px 14px;">'
      + '<div style="font-family:monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#60a5fa;margin-bottom:6px;">⏰ Next Race</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--txt);">Ascot — 14:30</div>'
      + '<div style="font-size:11px;color:var(--mut);">Copper Horse Stakes · 12 runners</div></div>'
      + '<div style="font-family:monospace;font-size:20px;font-weight:700;color:#60a5fa;">8m</div>'
      + '</div></div>';
  }

  // ── Today's bets ──
  const le = document.getElementById('tbets');
  if(le){
    le.innerHTML = [
      {horse:'Midnight Envoy', track:'Ascot',    time:'14:30', odds:'7/2',  stake:10, result:'win',     returns:45,  type:'real'},
      {horse:'Velvet Sunrise',  track:'Newmarket',time:'15:45', odds:'5/1',  stake:5,  result:'loss',    returns:0,   type:'real'},
      {horse:'Thistle Down',    track:'York',     time:'16:10', odds:'9/4',  stake:8,  result:'pending', returns:0,   type:'virt'},
    ].map(function(b){
      const isV=b.type==='virt';
      const p=b.result==='win'?b.returns-b.stake:b.result==='loss'?-b.stake:null;
      const bgMap={win:'bw1',loss:'bl1',pending:'bpend'};
      return '<div class="mb '+(b.result)+'" style="border-left-color:'+(isV?'#fb923c':'')+';cursor:pointer;">'
        +'<div class="mbl"><div class="mh">'+b.horse+(isV?' <span style="font-size:9px;color:#fb923c;font-family:monospace;">VIRT</span>':'')+'</div>'
        +'<div class="mm">'+b.track+' · '+b.time+' · <span style="font-family:monospace;">'+b.odds+'</span></div></div>'
        +'<div class="mbr"><span class="bdg '+(bgMap[b.result]||'bpend')+'">'+b.result+'</span>'
        +'<div class="mp '+(p===null?'':p>=0?'pos':'neg')+'" style="margin-top:2px;">'+(p===null?'—':fmt(p))+'</div></div>'
        +'</div>';
    }).join('');
  }
}

// cache shared via window._todayMeetingsCache
async function loadTodayMeetings(){
  const stEl=document.getElementById('t-meetings-status');
  if(stEl)stEl.textContent='Loading…';
  const creds=getRacingCreds();
  if(!creds.username||!creds.password){if(stEl)stEl.textContent='';renderChips();return;}
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
  // Use races from the swipe card if already loaded, otherwise skip
  const races=rcSwCurrentRaces||[];
  if(!races.length){el.style.display='none';return;}
  const now=new Date();
  const todayStr=now.toISOString().slice(0,10);
  // Split races into upcoming (future) and past
  const allTimed=races.map(function(r){
    const t=r.off||r.off_time||r.time||'';
    if(!t)return null;
    const dt=new Date(todayStr+'T'+t+':00');
    if(isNaN(dt))return null;
    return{race:r,dt,diff:Math.round((dt-now)/60000)};
  }).filter(Boolean);
  const upcoming=allTimed.filter(function(r){return r.diff>0;}).sort(function(a,b){return a.diff-b.diff;});
  const past=allTimed.filter(function(r){return r.diff<=0;}).sort(function(a,b){return b.diff-a.diff;});
  // Always show: next upcoming race, or if all done show the most recent race
  const next=upcoming.length?upcoming[0]:past.length?past[0]:null;
  if(!next){el.style.display='none';return;}
  const mins=next.diff;
  const hrs=Math.floor(Math.abs(mins)/60);
  const m=Math.abs(mins)%60;
  const countdown=mins>0?(mins<1?'Starting now':hrs>0?hrs+'h '+m+'m':m+'m'):'Result pending';
  const course=next.race.course||next.race.venue||'';
  const name=next.race.race_name||next.race.name||'';
  const runners=(next.race.runners||[]).length;
  const urgency=mins<=0?'var(--mut)':mins<30?'var(--red)':mins<60?'#f59e0b':'var(--grn)';
  el.style.display='block';
  content.innerHTML='<div style="background:rgba(0,0,0,.2);border:1px solid var(--bdr);border-left:3px solid '+urgency+';border-radius:10px;padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:10px;" onclick="goTo(1)">'
    +'<div><div style="font-size:14px;font-weight:700;color:var(--txt);">'+(next.race.off||next.race.time||'')+' '+course+'</div>'
    +'<div style="font-size:11px;color:var(--mut);margin-top:2px;">'+name+(runners?' · '+runners+' runners':'')+'</div></div>'
    +'<div style="text-align:right;flex-shrink:0;"><div style="font-family:monospace;font-size:15px;font-weight:700;color:'+urgency+';">'+countdown+'</div>'
    +'<div style="font-size:9px;color:var(--mut);">Racecards →</div></div>'
    +'</div>';
  // Refresh every minute
  if(window._nextRaceTimer)clearTimeout(window._nextRaceTimer);
  window._nextRaceTimer=setTimeout(renderNextRace,60000);
}

function renderStudyReminder(){
  const el=document.getElementById('t-study-reminder');
  if(!el)return;
  const todayKey='study-done-'+td();
  const done=!!localStorage.getItem(todayKey);
  const todayBets=D.bets.filter(b=>b.date===td());
  const hasBets=todayBets.length>0;
  el.style.display='block';
  el.innerHTML='<div style="background:rgba(0,0,0,.2);border:1px solid '+(done?'rgba(52,211,153,.2)':'rgba(245,158,11,.2)')+';border-radius:10px;padding:11px 13px;">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">'
      +'<div>'
        +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:'+(done?'var(--grn)':'#f59e0b')+';margin-bottom:3px;">📋 Form Study</div>'
        +'<div style="font-size:13px;color:var(--txt);">'+(done?'Done for today — good discipline.':hasBets?'You\'ve bet today. Form studied?':'Have you studied today\'s form before betting?')+'</div>'
      +'</div>'
      +(done
        ?'<span style="font-size:20px;">✅</span>'
        :'<button onclick="markStudyDone()" style="flex-shrink:0;font-family:monospace;font-size:10px;font-weight:700;padding:6px 12px;border-radius:8px;border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.1);color:#f59e0b;cursor:pointer;letter-spacing:.05em;text-transform:uppercase;">Mark done</button>'
      )
    +'</div>'
  +'</div>';
}

function markStudyDone(){
  localStorage.setItem('study-done-'+td(),'1');
  renderStudyReminder();
}

async function checkWatchlistRunners(races){
  const wl=getWL();
  const watching=wl.filter(e=>e.horse);
  if(!watching.length){const alertEl=document.getElementById('t-wl-alerts');if(alertEl)alertEl.style.display='none';return;}
  const alerts=[];
  (races||[]).forEach(function(race){
    const time=race.off||race.off_time||race.time||'—';
    const course=race.course||race.venue||'—';
    const raceName=race.race_name||race.name||'';
    (race.runners||race.horses||[]).forEach(function(r){
      const horseName=(r.horse||r.name||'').toLowerCase().trim();
      watching.forEach(function(w){
        const wlName=(w.horse||'').toLowerCase().trim();
        if(horseName&&wlName&&horseName===wlName){
          if(!alerts.find(a=>a.horse.toLowerCase()===horseName)){
            alerts.push({horse:r.horse||r.name,course,time,raceName,jockey:r.jockey||'',wlEntry:w});
          }
        }
      });
    });
  });
  const alertEl=document.getElementById('t-wl-alerts');if(!alertEl)return;
  if(!alerts.length){alertEl.style.display='none';return;}
  alertEl.style.display='block';
  alertEl.innerHTML='<div style="background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25);border-radius:11px;padding:12px 14px;">'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#a78bfa;margin-bottom:8px;">🔔 Watchlist Running Today</div>'
    +alerts.map(function(a){
      const wid=(a.wlEntry&&a.wlEntry.id)?a.wlEntry.id:'';
      return'<div data-wlid="'+wid+'" class="t-wl-item" style="padding:7px 0;border-bottom:1px solid rgba(167,139,250,.12);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;cursor:pointer;">'
        +'<div>'
          +'<div style="font-size:13px;font-weight:700;color:var(--txt);">'+a.horse+'</div>'
          +'<div style="font-size:11px;color:var(--mut);">'+a.time+' · '+a.course+(a.raceName?' · '+a.raceName:'')+'</div>'
          +(a.jockey?'<div style="font-size:11px;color:var(--gld);">J: '+a.jockey+'</div>':'')
        +'</div>'
        +'<span style="font-family:monospace;font-size:9px;font-weight:700;background:rgba(167,139,250,.15);color:#a78bfa;padding:3px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;">Profile →</span>'
      +'</div>';
    }).join('')
  +'</div>';
  setTimeout(function(){
    alertEl.querySelectorAll('.t-wl-item').forEach(function(el){
      el.addEventListener('click',function(){var id=this.getAttribute('data-wlid');if(id)openWLForm(id);});
    });
  },0);
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
    items.push({type:'watch',date:e.raceDate,label:e.horse,sub:(e.raceName||'')+(e.track?' · '+e.track:''),col:'#a78bfa'});
  });
  items.sort(function(a,b){return a.date.localeCompare(b.date);});
  if(!items.length){el.style.display='none';return;}
  el.style.display='block';
  listEl.innerHTML=items.map(function(item){
    const d=new Date(item.date+'T00:00:00');
    const diff=Math.round((d-today)/(1000*60*60*24));
    const dayLbl=diff===1?'Tomorrow':d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    return'<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--bdr);">'
      +'<div style="width:3px;height:34px;border-radius:2px;background:'+item.col+';flex-shrink:0;"></div>'
      +'<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--txt);">'+item.label+'</div>'+(item.sub?'<div style="font-size:11px;color:var(--mut);">'+item.sub+'</div>':'')+'</div>'
      +'<div style="font-family:monospace;font-size:10px;color:'+item.col+';flex-shrink:0;">'+dayLbl+'</div>'
    +'</div>';
  }).join('');
}

function renderRunningToday(){
  const todayStr=td();
  const el=document.getElementById('t-running-today');
  if(!el)return;
  // Find watchlist entries whose raceDate is today
  const running=getWL().filter(function(e){return e.raceDate===todayStr;});
  if(!running.length){el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML='<div style="font-family:monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#a78bfa;margin-bottom:10px;">🏇 Running Today</div>'
    +running.map(function(e){
      const isTarget=(e.targets||[]).some(function(t){
        return t.date===todayStr&&t.track&&e.track&&t.track.toLowerCase()===e.track.toLowerCase();
      });
      const hasResult=(e.raceResults||[]).some(function(r){return r.date===todayStr;});
      const badge=isTarget
        ?'<span style="font-family:monospace;font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(251,191,36,.15);color:#f59e0b;border:1px solid rgba(251,191,36,.3);">🎯 TARGET RACE</span>'
        :'<span style="font-family:monospace;font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.3);">👁 WATCHED</span>';
      const btn=hasResult
        ?'<button data-pid="'+e.id+'" class="_pl-btn" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(167,139,250,.3);background:rgba(167,139,250,.08);color:#a78bfa;font-family:monospace;font-size:10px;cursor:pointer;">Edit ✓</button>'
        :'<button data-pid="'+e.id+'" class="_pl-btn" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.08);color:#f59e0b;font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;">Log Performance</button>';
      return'<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--sur2);border:1px solid var(--bdr);margin-bottom:8px;">'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">'+badge+'</div>'
          +'<div style="font-size:14px;font-weight:700;color:var(--txt);">'+e.horse+'</div>'
          +(e.track?'<div style="font-size:11px;color:var(--mut);">'+e.track+(e.raceDate?' · '+e.raceDate:'')+'</div>':'')
        +'</div>'
        +btn
      +'</div>';
    }).join('');
  // Wire up buttons via delegation to avoid inline onclick quote issues
  el.querySelectorAll('._pl-btn').forEach(function(btn){
    btn.addEventListener('click',function(){openPerfLog(btn.getAttribute('data-pid'));});
  });
}

function openPerfLog(profileId){
  const todayStr=td();
  const entry=getWL().find(function(e){return e.id===profileId;});
  if(!entry)return;
  const existing=(entry.raceResults||[]).find(function(r){return r.date===todayStr;})||null;
  const isTarget=(entry.targets||[]).some(function(t){
    return t.date===todayStr&&t.track&&entry.track&&t.track.toLowerCase()===entry.track.toLowerCase();
  });
  // Find any bet logged today on this horse
  const allBets=[...(D.bets||[]),...((D.vBank&&D.vBank.bets)||[])];
  const linkedBet=allBets.find(function(b){
    return b.date===todayStr&&(b.horse||'').toLowerCase()===(entry.horse||'').toLowerCase();
  });

  const existing_ran=existing?existing.ran:true;
  const existing_pos=existing?existing.position:'';
  const existing_trav=existing?existing.travelling:3;
  const existing_going=existing?existing.goingSuited:null;
  const existing_notes=existing?existing.notes:'';

  const ov=document.createElement('div');
  ov.id='_perf-log-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.7);display:flex;flex-direction:column;justify-content:flex-end;';
  ov.innerHTML=
    '<div style="background:var(--sur);border-radius:20px 20px 0 0;padding:20px 18px env(safe-area-inset-bottom,24px);max-height:85vh;overflow-y:auto;">'
      +'<div style="width:36px;height:4px;border-radius:2px;background:var(--bdr);margin:0 auto 16px;"></div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">'
        +(isTarget?'<span style="font-family:monospace;font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(251,191,36,.15);color:#f59e0b;border:1px solid rgba(251,191,36,.3);">🎯 TARGET RACE</span>':'')
        +'<span style="font-size:16px;font-weight:700;color:var(--txt);">'+entry.horse+'</span>'
      +'</div>'
      +(linkedBet?'<div style="font-family:monospace;font-size:10px;color:var(--grn);margin-bottom:14px;">✓ Bet logged: '+linkedBet.odds+' · £'+linkedBet.stake+'</div>':'')

      // Did it run?
      +'<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">Did it run?</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:16px;">'
        +'<button id="_pl-ran-yes" onclick="_plSetRan(true)" style="flex:1;padding:10px;border-radius:9px;border:1px solid '+(existing_ran?'var(--grn)':'var(--bdr)')+';background:'+(existing_ran?'rgba(38,168,101,.12)':'var(--sur2)')+';color:'+(existing_ran?'var(--grn)':'var(--mut)')+';font-family:monospace;font-size:11px;font-weight:700;cursor:pointer;">Yes</button>'
        +'<button id="_pl-ran-no" onclick="_plSetRan(false)" style="flex:1;padding:10px;border-radius:9px;border:1px solid '+(!existing_ran?'#fb923c':'var(--bdr)')+';background:'+(!existing_ran?'rgba(251,146,60,.1)':'var(--sur2)')+';color:'+(!existing_ran?'#fb923c':'var(--mut)')+';font-family:monospace;font-size:11px;font-weight:700;cursor:pointer;">NR / Scratched</button>'
      +'</div>'

      // Position
      +'<div id="_pl-ran-fields">'
      +'<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">Finishing position</div>'
      +'<div id="_pl-pos-btns" style="display:flex;gap:6px;margin-bottom:16px;">'+['1st','2nd','3rd','4th','5+'].map(function(p){
        const sel=existing_pos===p;
        return'<button data-pos="'+p+'" class="_pl-pos-btn" style="flex:1;padding:9px 4px;border-radius:8px;border:1px solid '+(sel?'var(--gld)':'var(--bdr)')+';background:'+(sel?'rgba(232,228,220,.12)':'var(--sur2)')+';color:'+(sel?'var(--gld)':'var(--mut)')+';font-family:monospace;font-size:11px;font-weight:700;cursor:pointer;">'+p+'</button>';
      }).join('')+'</div>'

      // Travelling
      +'<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:6px;">How did it travel?</div>'
      +'<div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;color:var(--mut);margin-bottom:4px;"><span>Never going</span><span>Won easily</span></div>'
      +'<input id="_pl-trav" type="range" min="1" max="5" value="'+existing_trav+'" oninput="_plUpdTrav(this.value)" style="width:100%;accent-color:#a78bfa;margin-bottom:6px;">'
      +'<div id="_pl-trav-lbl" style="font-family:monospace;font-size:11px;color:#a78bfa;text-align:center;margin-bottom:16px;">'+['','Never going','Outpaced','OK','Travelled well','Won in a canter'][existing_trav]+'</div>'

      // Going suited
      +'<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">Did going suit as expected?</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:16px;">'
        +'<button id="_pl-gs-yes" onclick="_plSetGoing(true)" style="flex:1;padding:9px;border-radius:8px;border:1px solid '+(existing_going===true?'var(--grn)':'var(--bdr)')+';background:'+(existing_going===true?'rgba(38,168,101,.12)':'var(--sur2)')+';color:'+(existing_going===true?'var(--grn)':'var(--mut)')+';font-family:monospace;font-size:11px;cursor:pointer;">Yes</button>'
        +'<button id="_pl-gs-no" onclick="_plSetGoing(false)" style="flex:1;padding:9px;border-radius:8px;border:1px solid '+(existing_going===false?'var(--red)':'var(--bdr)')+';background:'+(existing_going===false?'rgba(196,58,58,.08)':'var(--sur2)')+';color:'+(existing_going===false?'var(--red)':'var(--mut)')+';font-family:monospace;font-size:11px;cursor:pointer;">No</button>'
        +'<button id="_pl-gs-uns" onclick="_plSetGoing(null)" style="flex:1;padding:9px;border-radius:8px;border:1px solid '+(existing_going===null?'var(--gld)':'var(--bdr)')+';background:'+(existing_going===null?'rgba(232,228,220,.08)':'var(--sur2)')+';color:'+(existing_going===null?'var(--gld)':'var(--mut)')+';font-family:monospace;font-size:11px;cursor:pointer;">Unsure</button>'
      +'</div>'
      +'</div>'

      // Notes
      +'<div style="font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">What did I learn?</div>'
      +'<textarea id="_pl-notes" placeholder="One sentence observation…" style="width:100%;box-sizing:border-box;background:var(--sur2);border:1px solid var(--bdr);border-radius:10px;padding:12px;font-size:14px;color:var(--txt);outline:none;resize:none;min-height:60px;margin-bottom:16px;">'+existing_notes+'</textarea>'

      +'<button id="_pl-save-btn" style="width:100%;padding:15px;border-radius:12px;border:none;background:#a78bfa;color:#141414;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;margin-bottom:10px;">Save Performance</button>'
      +'<button id="_pl-cancel-btn" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:monospace;font-size:11px;cursor:pointer;">Cancel</button>'
    +'</div>';

  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
  ov.querySelectorAll('._pl-pos-btn').forEach(function(btn){
    btn.addEventListener('click',function(){_plSetPos(btn,btn.getAttribute('data-pos'));});
  });
  const saveBtn=document.getElementById('_pl-save-btn');
  if(saveBtn)saveBtn.addEventListener('click',function(){_plSave(profileId,todayStr,isTarget,linkedBet?linkedBet.id:null);});
  const cancelBtn=document.getElementById('_pl-cancel-btn');
  if(cancelBtn)cancelBtn.addEventListener('click',function(){ov.remove();});

  // State
  window._plState={ran:existing_ran,position:existing_pos,travelling:existing_trav,goingSuited:existing_going};
  if(!existing_ran)document.getElementById('_pl-ran-fields').style.display='none';
}

function _plSetRan(v){
  window._plState.ran=v;
  const yBtn=document.getElementById('_pl-ran-yes');
  const nBtn=document.getElementById('_pl-ran-no');
  const fields=document.getElementById('_pl-ran-fields');
  if(yBtn){yBtn.style.borderColor=v?'var(--grn)':'var(--bdr)';yBtn.style.background=v?'rgba(38,168,101,.12)':'var(--sur2)';yBtn.style.color=v?'var(--grn)':'var(--mut)';}
  if(nBtn){nBtn.style.borderColor=!v?'#fb923c':'var(--bdr)';nBtn.style.background=!v?'rgba(251,146,60,.1)':'var(--sur2)';nBtn.style.color=!v?'#fb923c':'var(--mut)';}
  if(fields)fields.style.display=v?'block':'none';
}
function _plSetPos(btn,pos){
  window._plState.position=pos;
  btn.closest('div').querySelectorAll('button').forEach(function(b){b.style.borderColor='var(--bdr)';b.style.background='var(--sur2)';b.style.color='var(--mut)';});
  btn.style.borderColor='var(--gld)';btn.style.background='rgba(232,228,220,.12)';btn.style.color='var(--gld)';
}
function _plUpdTrav(v){
  window._plState.travelling=parseInt(v);
  const lbl=document.getElementById('_pl-trav-lbl');
  const labels=['','Never going','Outpaced','OK','Travelled well','Won in a canter'];
  if(lbl){lbl.textContent=labels[v]||'';}
}
function _plSetGoing(v){
  window._plState.goingSuited=v;
  const yBtn=document.getElementById('_pl-gs-yes');
  const nBtn=document.getElementById('_pl-gs-no');
  const uBtn=document.getElementById('_pl-gs-uns');
  if(yBtn){yBtn.style.borderColor=v===true?'var(--grn)':'var(--bdr)';yBtn.style.background=v===true?'rgba(38,168,101,.12)':'var(--sur2)';yBtn.style.color=v===true?'var(--grn)':'var(--mut)';}
  if(nBtn){nBtn.style.borderColor=v===false?'var(--red)':'var(--bdr)';nBtn.style.background=v===false?'rgba(196,58,58,.08)':'var(--sur2)';nBtn.style.color=v===false?'var(--red)':'var(--mut)';}
  if(uBtn){uBtn.style.borderColor=v===null?'var(--gld)':'var(--bdr)';uBtn.style.background=v===null?'rgba(232,228,220,.08)':'var(--sur2)';uBtn.style.color=v===null?'var(--gld)':'var(--mut)';}
}
function _plSave(profileId,date,isTargetRace,betId){
  const s=window._plState||{};
  const notes=(document.getElementById('_pl-notes')||{value:''}).value.trim();
  const entry=getWL().find(function(e){return e.id===profileId;});
  if(!entry)return;
  if(!entry.raceResults)entry.raceResults=[];
  // Remove any existing result for today
  entry.raceResults=entry.raceResults.filter(function(r){return r.date!==date;});
  entry.raceResults.push({
    id:gid(),date:date,track:entry.track||'',raceName:entry.raceName||'',
    ran:s.ran!==false,position:s.ran?s.position||'':'',
    travelling:s.ran?s.travelling||3:null,
    goingSuited:s.ran?s.goingSuited:null,
    isTargetRace:isTargetRace||false,
    betId:betId||null,notes:notes
  });
  entry.updatedAt=Date.now();
  D.watchlist=(D.watchlist||[]).map(function(e){return e.id===profileId?entry:e;});
  save();
  const ov=document.getElementById('_perf-log-ov');if(ov)ov.remove();
  renderRunningToday();
}

function renderChips(){
  const el=document.getElementById('tchips');if(!el)return;
  const t=getTracks();
  el.innerHTML=t.length?t.map(n=>'<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(232,228,220,.08);border:1px solid rgba(232,228,220,.2);border-radius:20px;padding:4px 10px 4px 11px;font-size:12px;font-weight:600;color:var(--gld);">🏇 '+n+'<span onclick="rmTrack(\''+n+'\')" style="cursor:pointer;font-size:14px;opacity:.6;margin-left:1px;">×</span></div>').join(''):'<span style="font-size:12px;color:var(--mut);font-style:italic;">No courses added yet — tap Load from API</span>';
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
  if(pe){pe.textContent=fmt(p);pe.style.color=p>0?'var(--grn)':p<0?'var(--red)':'var(--gld)';}

  // ── Virtual P&L today ──
  const vb=getVBank();
  const vtb=(vb.bets||[]).filter(b=>b.date===t);
  const vset=vtb.filter(b=>b.result&&b.result!=='pending'&&b.result!=='nr');
  const vp=vset.reduce((a,b)=>a+((parseFloat(b.returns)||0)-(parseFloat(b.stake)||0)),0);
  const vpe=document.getElementById('t-virt-pnl');
  if(vpe){vpe.textContent=fmt(vp);vpe.style.color=vp>0?'var(--grn)':vp<0?'var(--red)':'#fb923c';}

  // ── Bet limit tile ──
  renderBetLimit();

  // ── Check-in state ──
  renderCheckIn();

  // ── Watchlist + Edge alerts ──
  if(window._todayMeetingsCache){
    const races=window._todayMeetingsCache.racecards||window._todayMeetingsCache.races||[];
    checkWatchlistRunners(races);
    renderEdgeAlerts(races);
    renderNextRace();
  }

  // ── Streak ──

  // ── Today's bets ──
  renderTodayBets(tb, vtb);
  renderRunningToday();

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
    const moodEmoji={poor:'😔',neutral:'😐',good:'🙂',great:'😄'}[log.mood||'neutral']||'😐';
    ci.innerHTML='<div style="background:rgba(45,184,122,.08);border:1px solid rgba(45,184,122,.25);border-radius:11px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;">'
      +'<div>'
        +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--grn);margin-bottom:3px;">✓ Checked in</div>'
        +(log.focus?'<div style="font-size:13px;color:var(--txt);">'+log.focus+'</div>':'<div style="font-size:12px;color:var(--mut);font-style:italic;">No focus set</div>')
      +'</div>'
      +'<span style="font-size:22px;">'+moodEmoji+'</span>'
      +'</div>';
  } else {
    // Show check-in form — restore mood button active state
    const mood=(log&&log.mood)||'neutral';
    document.querySelectorAll('#tmood-btns button').forEach(function(b){
      const m=b.getAttribute('onclick').replace("setMood('","").replace("')","");
      b.style.background=m===mood?'rgba(232,228,220,.15)':'transparent';
      b.style.borderColor=m===mood?'rgba(232,228,220,.4)':'var(--bdr)';
    });
    const tf=document.getElementById('t-focus');
    if(tf&&log&&log.focus) tf.value=log.focus;
  }
}

function setMood(mood){
  document.querySelectorAll('#tmood-btns button').forEach(function(b){
    b.style.background='transparent';b.style.borderColor='var(--bdr)';
  });
  const btn=document.getElementById('mood-'+mood);
  if(btn){btn.style.background='rgba(232,228,220,.15)';btn.style.borderColor='rgba(232,228,220,.4)';}
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
  const mood=document.querySelector('#tmood-btns button[style*="rgba(232"]');
  if(mood){const m=mood.getAttribute('onclick').replace("setMood('","").replace("')","");log.mood=m;}
  const focus=document.getElementById('t-focus');
  if(focus)log.focus=focus.value.trim();
  log.checkedIn=true;
  log.checkedInAt=Date.now();
  save();
  renderCheckIn();
}

function renderEdgeAlerts(races){
  const el=document.getElementById('t-edge-alerts');
  if(!el) return;
  const wl=getWL();
  const edges=[];
  (races||[]).forEach(function(race){
    const course=race.course||race.venue||'';
    const time=race.off||race.off_time||race.time||'';
    (race.runners||race.horses||[]).forEach(function(r){
      const name=(r.horse||r.name||'').toLowerCase().trim();
      wl.forEach(function(w){
        const wn=(w.horse||'').toLowerCase().trim();
        if(name&&wn&&name===wn){
          const mr=parseFloat(w.myRating);
          const or=parseFloat(w.currentRating);
          if(mr&&or&&mr>or){
            const edge=mr-or;
            if(!edges.find(e=>e.horse.toLowerCase()===name)){
              edges.push({horse:w.horse,course,time,edge,mr,or});
            }
          }
        }
      });
    });
  });
  if(!edges.length){el.style.display='none';return;}
  edges.sort(function(a,b){return b.edge-a.edge;});
  el.style.display='block';
  el.innerHTML='<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:11px;padding:12px 14px;">'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#4ade80;margin-bottom:8px;">⭐ Edge Running Today</div>'
    +edges.map(function(e){
      return'<div style="padding:7px 0;border-bottom:1px solid rgba(74,222,128,.1);display:flex;align-items:center;justify-content:space-between;" onclick="goTo(5)">'
        +'<div>'
          +'<div style="font-size:13px;font-weight:700;color:var(--txt);">'+e.horse+'</div>'
          +'<div style="font-family:monospace;font-size:10px;color:var(--mut);">'+e.time+' · '+e.course+'</div>'
        +'</div>'
        +'<span style="font-family:monospace;font-size:11px;font-weight:700;color:#4ade80;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25);padding:3px 8px;border-radius:8px;white-space:nowrap;">MR '+e.mr+' · OR '+e.or+' · +'+e.edge+'</span>'
        +'</div>';
    }).join('')
  +'</div>';
}

function renderTodayBets(tb, vtb){
  const le=document.getElementById('tbets');
  if(!le) return;
  const allBets=[...tb.map(b=>({...b,_type:'real'})),...vtb.map(b=>({...b,_type:'virt'}))];
  if(!allBets.length){le.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;padding:4px 0;">No bets logged today.</div>';return;}
  const bg={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
  le.innerHTML=allBets.map(function(b){
    const isV=b._type==='virt';
    const p2=isV?((b.result&&b.result!=='pending'&&b.result!=='nr')?(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0):null):pnl(b);
    const os=b.oddsDisplay||(b.odds||'—');
    const el=document.createElement('div');
    el.className='mb '+(b.result||'pending');
    el.style.borderLeftColor=isV?'#fb923c':'';
    el.style.cursor='pointer';
    el.setAttribute('onclick',isV?'openVEM("'+b.id+'")':'openEM("'+b.id+'")');
    el.innerHTML='<div class="mbl"><div class="mh">'+b.horse+(isV?' <span style="font-size:9px;color:#fb923c;font-family:monospace;">VIRT</span>':'')+'</div>'
      +'<div class="mm">'+(b.track||'—')+(b.time?' · '+b.time:'')+' · <span style="font-family:monospace;">'+os+'</span></div></div>'
      +'<div class="mbr"><span class="bdg '+(bg[b.result]||'bpend')+'">'+(b.result||'pending')+'</span>'
      +'<div class="mp '+(p2===null?'':p2>=0?'pos':'neg')+'" style="margin-top:2px;">'+(p2===null?'—':fmt(p2))+'</div></div>';
    return el.outerHTML;
  }).join('');
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
      return'<div class="mb pending" onclick="'+fn+'(\''+b.id+'\')" style="cursor:pointer;border-left-color:'+(isV?'#fb923c':'var(--red)')+';">'
        +'<div class="mbl"><div class="mh">'+b.horse+(isV?' <span style="font-family:monospace;font-size:9px;color:#fb923c;">VIRT</span>':'')+'</div>'
        +'<div class="mm">'+b.date+' · '+(b.track||'—')+' · <span style="font-family:monospace;">'+os+'</span> · '+fp(b.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bpend" style="background:rgba(196,58,58,.15);color:var(--red);">settle</span></div></div>';
    }).join('');
  }
}
function saveToday(){D.dailyLog=D.dailyLog||[];const ex=D.dailyLog.find(d=>d.date===td());const e={date:td(),checkedIn:true,mood:document.getElementById('tmood').value,notes:document.getElementById('tnotes').value.trim(),tracks:getTracks(),createdAt:Date.now()};if(ex)Object.assign(ex,e);else D.dailyLog.push(e);save();updHdr();flash('tsaved');renderToday();}


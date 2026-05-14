// ─── TODAY ─── today card, tracks, chips, next race, study reminder

// ─── TRACKS ───
function getTracks(){const l=(D.dailyLog||[]).find(d=>d.date===td());return(l&&Array.isArray(l.tracks))?l.tracks:[];}
function setTracks(t){D.dailyLog=D.dailyLog||[];let l=D.dailyLog.find(d=>d.date===td());if(!l){l={date:td(),checkedIn:false,mood:'neutral',notes:'',tracks:[],createdAt:Date.now()};D.dailyLog.push(l);}l.tracks=t;save();}
function addTrack(){const el=document.getElementById('ttrack');const v=el.value.trim();if(!v)return;const t=getTracks();if(!t.includes(v)){t.push(v);setTracks(t);}el.value='';renderChips();rfrTL();}
function rmTrack(n){setTracks(getTracks().filter(x=>x!==n));renderChips();rfrTL();}
async function loadTodayMeetings(){
  const stEl=document.getElementById('t-meetings-status');
  if(stEl)stEl.textContent='Loading…';
  const creds=getRacingCreds();
  if(!creds.username||!creds.password){if(stEl)stEl.textContent='';renderChips();return;}
  try{
    const data=await callRacingAPI('racecards/free',{});
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
        if(horseName&&wlName&&(horseName===wlName||horseName.includes(wlName)||wlName.includes(horseName))){
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
      return'<div style="padding:7px 0;border-bottom:1px solid rgba(167,139,250,.12);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;" onclick="goTo(1)" style="cursor:pointer;">'
        +'<div>'
          +'<div style="font-size:13px;font-weight:700;color:var(--txt);">'+a.horse+'</div>'
          +'<div style="font-size:11px;color:var(--mut);">'+a.time+' · '+a.course+(a.raceName?' · '+a.raceName:'')+'</div>'
          +(a.jockey?'<div style="font-size:11px;color:var(--gld);">J: '+a.jockey+'</div>':'')
        +'</div>'
        +'<span style="font-family:monospace;font-size:9px;font-weight:700;background:rgba(167,139,250,.15);color:#a78bfa;padding:3px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;cursor:pointer;">Card →</span>'
      +'</div>';
    }).join('')
  +'</div>';
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

function renderChips(){
  const el=document.getElementById('tchips');if(!el)return;
  const t=getTracks();
  el.innerHTML=t.length?t.map(n=>'<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(232,228,220,.08);border:1px solid rgba(232,228,220,.2);border-radius:20px;padding:4px 10px 4px 11px;font-size:12px;font-weight:600;color:var(--gld);">🏇 '+n+'<span onclick="rmTrack(\''+n+'\')" style="cursor:pointer;font-size:14px;opacity:.6;margin-left:1px;">×</span></div>').join(''):'<span style="font-size:12px;color:var(--mut);font-style:italic;">No courses added yet — tap Load from API</span>';
}
function rfrTL(){const c=[...new Set([...getTracks(),...TKS])];document.querySelectorAll('.tl').forEach(dl=>{dl.innerHTML=c.map(t=>`<option value="${t}">`).join('');});}

// ─── TODAY ───
function renderToday(){
  renderBetLimit();
  const t=td(),tb=D.bets.filter(b=>b.date===t);
  const set=tb.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr');
  const p=set.reduce((a,b)=>a+(pnl(b)||0),0);
  const dl=document.getElementById('tdlbl');
  if(dl)dl.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  const pe=document.getElementById('tpnl');pe.textContent=fmt(p);pe.className='sbig '+(p>0?'pos':p<0?'neg':'gld');
  renderChips();
  renderThisWeek();
  renderNextRace();
  renderStudyReminder();
  // Auto-load today's meetings if credentials set and not yet loaded
  if(getRacingCreds().username&&!document.getElementById('t-meetings-picker')?.style.display?.includes('block')){
    loadTodayMeetings();
  }
  const log=(D.dailyLog||[]).find(d=>d.date===t);
  const ci=document.getElementById('tcin');
  if(ci&&log&&log.checkedIn){ci.innerHTML=`<div style="background:rgba(45,184,122,.08);border:1px solid rgba(45,184,122,.25);border-radius:8px;padding:7px 10px;font-family:monospace;font-size:10px;color:var(--grn);">✓ Checked in today</div>`;document.getElementById('tmood').value=log.mood||'neutral';document.getElementById('tnotes').value=log.notes||'';}
  const le=document.getElementById('tbets');
  const vb=getVBank();
  const vtb=(vb.bets||[]).filter(b=>b.date===t);
  const allBets=[...tb.map(b=>({...b,_type:'real'})),...vtb.map(b=>({...b,_type:'virt'}))];
  if(!allBets.length){le.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;padding:4px 0;">No bets today.</div>';}
  else{
    const bg={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
    le.innerHTML=allBets.map(function(b){
      const isV=b._type==='virt';
      const p2=isV?((b.result&&b.result!=='pending'&&b.result!=='nr')?(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0):null):pnl(b);
      const os=b.oddsDisplay||(b.odds||'—');
      const lbl=b.horse+(isV?' <span style="font-size:9px;color:#fb923c;font-family:monospace;">VIRT</span>':'');
      const el=document.createElement('div');
      el.className='mb '+(b.result||'pending');
      el.style.borderLeftColor=isV?'#fb923c':'';
      el.style.cursor='pointer';el.setAttribute('onclick',isV?'openVEM("'+b.id+'")':'openEM("'+b.id+'")');
      el.innerHTML='<div class="mbl"><div class="mh">'+lbl+'</div><div class="mm">'+(b.track||'—')+(b.time?' · '+b.time:'')+' · <span style="font-family:monospace;">'+os+'</span></div></div>'
        +'<div class="mbr"><span class="bdg '+(bg[b.result]||'bpend')+'">'+(b.result||'pending')+'</span>'
        +'<div class="mp '+(p2===null?'':p2>=0?'pos':'neg')+'" style="margin-top:2px;">'+(p2===null?'—':fmt(p2))+'</div></div>';
      return el.outerHTML;
    }).join('');
  }

  // Outstanding: pending bets from previous days
  const allPrev=[
    ...D.bets.filter(b=>(!b.result||b.result==='pending')&&b.date!==t).map(b=>({...b,_type:'real'})),
    ...getVBank().bets.filter(b=>(!b.result||b.result==='pending')&&b.date!==t).map(b=>({...b,_type:'virt'}))
  ].sort(function(a,b){return a.date.localeCompare(b.date);});
  const owrap=document.getElementById('t-outstanding-wrap');
  const olist=document.getElementById('t-outstanding');
  const ocnt=document.getElementById('t-outstanding-count');
  if(owrap)owrap.style.display=allPrev.length?'block':'none';
  if(ocnt)ocnt.textContent=allPrev.length+' pending';
  if(olist&&allPrev.length){
    const bg2={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
    olist.innerHTML=allPrev.map(function(b){
      const isV=b._type==='virt';
      const fn=isV?'openVEM':'openEM';
      const os=b.oddsDisplay||(b.odds||'—');
      return '<div class="mb pending" onclick="'+fn+'(\''+b.id+'\')" style="cursor:pointer;border-left-color:'+(isV?'#fb923c':'var(--red)')+';">'
        +'<div class="mbl"><div class="mh">'+b.horse+(isV?' <span style="font-family:monospace;font-size:9px;color:#fb923c;">VIRT</span>':'')+'</div>'
        +'<div class="mm">'+b.date+' · '+(b.track||'—')+' · <span style="font-family:monospace;">'+os+'</span> · '+fp(b.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bpend" style="background:rgba(196,58,58,.15);color:var(--red);">update</span></div></div>';
    }).join('');
  }
}
function saveToday(){D.dailyLog=D.dailyLog||[];const ex=D.dailyLog.find(d=>d.date===td());const e={date:td(),checkedIn:true,mood:document.getElementById('tmood').value,notes:document.getElementById('tnotes').value.trim(),tracks:getTracks(),createdAt:Date.now()};if(ex)Object.assign(ex,e);else D.dailyLog.push(e);save();updHdr();flash('tsaved');renderToday();}


// ─── WATCHLIST / PUZZLE PROFILER ───

let wlView='cal', wlCalDate=new Date();

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
      if(!dateMap[e.raceDate])dateMap[e.raceDate]={entries:[],targets:[]};
      dateMap[e.raceDate].entries.push(e);
    }
    (e.targets||[]).forEach(function(t){
      if(t.date){
        if(!dateMap[t.date])dateMap[t.date]={entries:[],targets:[]};
        dateMap[t.date].targets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});
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
    const dayData=dateMap[dateStr]||{entries:[],targets:[]};
    const entries=dayData.entries;
    const dayTargets=dayData.targets;
    const isToday=dateStr===today;
    const hasBet=entries.length>0||dayTargets.length>0;
    const fixtures=getFixtureForDate(dateStr);
    const hasFixture=fixtures.length>0;
    const dotCol=dayTargets.length&&!entries.length?'#fb923c':'#e879f9';
    const fixtureBar=hasFixture?'<div style="height:3px;border-radius:2px;background:'+fixtures[0].colour+';margin:1px 2px 0;" title="'+fixtures[0].name+'"></div>':'';
    html+='<div onclick="wlSelectDay(\''+dateStr+'\')" style="cursor:pointer;padding:5px 2px;border-radius:6px;'+(isToday?'background:rgba(232,121,249,.15);':'')+'text-align:center;">'
      +'<div style="font-size:11px;color:'+(isToday?'#e879f9':hasBet?'var(--txt)':'var(--mut)'+';font-weight:'+(hasBet?'700':'400'))+';">'+d+'</div>'
      +(hasBet?'<div style="width:5px;height:5px;border-radius:50%;background:'+dotCol+';margin:1px auto 0;"></div>':'<div style="height:4px;"></div>')+fixtureBar
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
  // Gather targets from all horses that point to this date
  const dayTargets=[];
  wl.forEach(function(e){
    (e.targets||[]).forEach(function(t){
      if(t.date===dateStr)dayTargets.push({horse:e.horse,trainer:e.trainer||'',currentRating:e.currentRating||'',horseId:e.id,target:t});
    });
  });
  const el=document.getElementById('wl-cal-day-entries');if(!el)return;
  const dayFixtures=getFixtureForDate(dateStr);
  const fixtureBanner=dayFixtures.map(f=>'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9px;background:rgba(0,0,0,.2);border-left:3px solid '+f.colour+';margin-bottom:8px;"><span>'+f.emoji+'</span><div><div style="font-weight:700;font-size:13px;color:'+f.colour+';">'+f.name+'</div><div style="font-size:11px;color:var(--mut);">'+f.course+'</div></div></div>').join('');
  const dayLabel='<div style="font-family:monospace;font-size:9px;color:rgba(232,121,249,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;">'+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})+'</div>';
  let html=fixtureBanner+dayLabel;
  // Target race cards (orange accent)
  if(dayTargets.length){
    html+='<div style="font-family:monospace;font-size:9px;color:rgba(251,146,60,.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">🎯 Target Races</div>';
    html+=dayTargets.map(function(d){
      const t=d.target;
      return'<div data-wl-id="'+d.horseId+'" style="cursor:pointer;border-left:3px solid #fb923c;margin-bottom:8px;padding:10px 11px;background:rgba(251,146,60,.05);border-radius:0 8px 8px 0;">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-weight:700;font-size:14px;margin-bottom:2px;">'+d.horse+(d.currentRating?'<span style="font-family:monospace;font-size:10px;color:var(--mut);font-weight:400;margin-left:6px;">OR '+d.currentRating+'</span>':'')+'</div>'
            +(d.trainer?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">'+d.trainer+'</div>':'')
            +'<div style="font-size:12px;color:#fb923c;font-weight:600;">'+t.race+(t.track?' · '+t.track:'')+'</div>'
            +(t.condition?'<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:2px;">'+t.condition+'</div>':'')
          +'</div>'

        +'</div>'
      +'</div>';
    }).join('');
  }
  // Regular watchlist entries (observation raceDate)
  if(entries.length){
    if(dayTargets.length)html+='<div style="font-family:monospace;font-size:9px;color:rgba(232,121,249,.5);text-transform:uppercase;letter-spacing:.1em;margin:10px 0 6px;">Puzzle Profiler</div>';
    html+=entries.map(function(e){return renderWLEntry(e);}).join('');
  }
  if(!entries.length&&!dayTargets.length){
    html+='<div style="color:var(--mut);font-style:italic;font-size:13px;padding:8px 0;">No targets on '+new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'.<br><span style="font-size:12px;">Tap + to add one.</span></div>';
  }
  el.innerHTML=html;
  el.querySelectorAll('[data-wl-id]').forEach(function(el2){el2.addEventListener('click',function(){openWLForm(el2.getAttribute('data-wl-id'));});});
}

// Track which profiler groups are expanded (session only — resets to all collapsed)
const _wlGroupOpen={};

function wlToggleGroup(r){
  _wlGroupOpen[r]=!_wlGroupOpen[r];
  renderWLList();
}

function renderWLList(){
  const wl=getWL();
  const search=(document.getElementById('wl-search')||{value:''}).value.toLowerCase();
  let entries=[...wl].sort(function(a,b){return(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
  if(search)entries=entries.filter(e=>(e.horse||'').toLowerCase().includes(search)||(e.trainer||'').toLowerCase().includes(search)||(e.reasonNote||'').toLowerCase().includes(search));
  const el=document.getElementById('wl-list');if(!el)return;
  if(!entries.length){el.innerHTML='<div class="es">No profiles yet. Tap + to add a horse.</div>';return;}
  const REASON_ORDER=['eye-catcher','future-target','trainer-intel','form-study','tip-source'];
  const REASON_META={'eye-catcher':{emoji:'👁',label:'Eye Catchers',col:'#a78bfa'},'future-target':{emoji:'📰',label:'Future Targets',col:'#fb923c'},'trainer-intel':{emoji:'🗣',label:'Trainer Intel',col:'#60a5fa'},'form-study':{emoji:'📊',label:'Form Study',col:'#ef4444'},'tip-source':{emoji:'💡',label:'Tips & Sources',col:'#eab308'}};
  const groups={};
  entries.forEach(function(e){const r=e.reason||'eye-catcher';if(!groups[r])groups[r]=[];groups[r].push(e);});
  // If searching, expand all matching groups automatically
  const isSearching=!!search;
  let html='';
  REASON_ORDER.forEach(function(r){
    if(!groups[r]||!groups[r].length)return;
    const rm=REASON_META[r];
    const isOpen=isSearching||!!_wlGroupOpen[r];
    const chevron=isOpen?'▾':'›';
    html+='<div onclick="wlToggleGroup(this.dataset.wlg)" data-wlg="'+r+'" style="display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:'+(isOpen?'2':'8')+'px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);cursor:pointer;user-select:none;">'      +'<span style="font-size:14px;">'+rm.emoji+'</span>'      +'<span style="font-family:monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:'+rm.col+';flex:1;">'+rm.label+'</span>'      +'<span style="font-family:monospace;font-size:10px;background:rgba(255,255,255,.07);color:var(--mut);padding:2px 8px;border-radius:20px;">'+groups[r].length+'</span>'      +'<span style="color:'+rm.col+';font-size:14px;transition:transform .15s;">'+chevron+'</span>'    +'</div>';
    if(isOpen){
      html+='<div style="margin-bottom:10px;">'+groups[r].map(function(e){return renderWLEntry(e);}).join('')+'</div>';
    }
  });
  el.innerHTML=html;
  el.querySelectorAll('[data-wl-id]').forEach(function(el2){el2.addEventListener('click',function(ev){ev.stopPropagation();openWLForm(el2.getAttribute('data-wl-id'));});});
}

function renderWLEntry(e){
  const RMAP={'eye-catcher':{emoji:'👁',col:'#a78bfa',label:'Eye Catcher'},'future-target':{emoji:'📰',col:'#fb923c',label:'Future Target'},'trainer-intel':{emoji:'🗣',col:'#60a5fa',label:'Trainer Intel'},'form-study':{emoji:'📊',col:'#ef4444',label:'Form Study'},'tip-source':{emoji:'💡',col:'#eab308',label:'Tip / Source'}};
  const rm=RMAP[e.reason||'eye-catcher']||RMAP['eye-catcher'];
  const obs=e.observations||[];
  const targets=e.targets||[];
  const lastObs=obs.length?obs[obs.length-1]:null;
  const latestDate=lastObs?lastObs.date:(e.raceDate||'');
  const daysAgo=latestDate?(function(){const d=new Date(latestDate+'T00:00:00');const diff=Math.round((new Date()-d)/(1000*60*60*24));return diff===0?'Today':diff===1?'Yesterday':diff>0?diff+'d ago':'Upcoming';}()):'';  const isEmpty=!obs.length&&!targets.length&&!e.trainerIntel&&!e.conditionsNotes;
  return'<div class="mb" data-wl-id="'+e.id+'" style="cursor:pointer;border-left:3px solid '+rm.col+';margin-bottom:8px;padding:10px 11px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="margin-bottom:5px;"><span style="font-size:9px;font-family:monospace;padding:2px 7px;border-radius:20px;background:rgba(0,0,0,.2);border:1px solid '+rm.col+';color:'+rm.col+';font-weight:700;">'+rm.emoji+' '+rm.label+'</span>'+(e.reasonNote?'<span style="font-size:10px;color:var(--mut);font-style:italic;margin-left:6px;">'+e.reasonNote.slice(0,50)+(e.reasonNote.length>50?'…':'')+'</span>':'')+'</div>'
      +'<div style="font-weight:700;font-size:15px;margin-bottom:2px;">'+e.horse+(e.currentRating?'<span style="font-family:monospace;font-size:10px;color:var(--mut);font-weight:400;margin-left:6px;">OR '+e.currentRating+'</span>':'')+'</div>'
      +(e.trainer?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">'+e.trainer+'</div>':'')
      +(lastObs?'<div style="font-size:11px;color:var(--mut);margin-bottom:3px;">📋 <span style="color:var(--txt);">'+lastObs.raceName+(lastObs.track?' · '+lastObs.track:'')+'</span> · '+daysAgo+'</div>':'')
      +(targets.length?'<div style="margin-top:3px;">'+targets.slice(0,2).map(function(t){const tDate=t.date?(new Date(t.date+'T00:00:00')).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';return'<div style="font-size:11px;font-family:monospace;color:#fb923c;margin-bottom:1px;">🎯 '+t.race+(tDate?'<span style="color:var(--mut);"> · '+tDate+'</span>':'')+(t.track?'<span style="font-size:9px;color:var(--mut);"> · '+t.track+'</span>':'')+'</div>';}).join('')+'</div>':'')
      +(e.trainerIntel?'<div style="font-size:11px;color:var(--mut);font-style:italic;margin-top:4px;border-left:2px solid rgba(96,165,250,.3);padding-left:7px;">🗣 '+e.trainerIntel.slice(0,80)+(e.trainerIntel.length>80?'…':'')+'</div>':'')
      +(isEmpty?'<div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:4px;font-style:italic;">Tap to add notes →</div>':'')
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0;margin-left:10px;">'
        +(obs.length?'<div style="font-family:monospace;font-size:9px;color:var(--mut);">'+obs.length+' obs</div>':'')
      +'</div>'
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
  modal.className='mov open';modal.id='wl-modal';
  const going=['Firm','Good to Firm','Good','Good to Soft','Soft','Heavy'];
  const goingPrefs=e?e.goingPrefs||[]:[];
  _wlDossier.goingPrefs=goingPrefs.slice();
  const goingHtml=going.map(function(g){const sel=_wlDossier.goingPrefs.includes(g);return'<button type="button" data-going="'+g+'" onclick="wlToggleGoing(this)" style="padding:5px 10px;border-radius:20px;border:1px solid '+(sel?'#e879f9':'rgba(232,121,249,.25)')+';background:'+(sel?'rgba(232,121,249,.2)':'transparent')+';color:'+(sel?'#e879f9':'var(--mut)')+';font-family:monospace;font-size:10px;cursor:pointer;margin-right:5px;margin-bottom:5px;">'+g+'</button>';}).join('');
  const REASONS=[{value:'eye-catcher',emoji:'👁',label:'Eye Catcher'},{value:'future-target',emoji:'📰',label:'Future Target'},{value:'trainer-intel',emoji:'🗣',label:'Trainer Intel'},{value:'form-study',emoji:'📊',label:'Form Study'},{value:'tip-source',emoji:'💡',label:'Tip / Source'}];
  const curReason=e?e.reason||'eye-catcher':'eye-catcher';
  const REASON_COLS={'eye-catcher':'#a78bfa','future-target':'#fb923c','trainer-intel':'#60a5fa','form-study':'#ef4444','tip-source':'#eab308'};
  const reasonHtml=REASONS.map(function(r){const sel=r.value===curReason;const col=REASON_COLS[r.value]||'#e879f9';const selAlpha=col.replace('#','');return'<button type="button" data-reason="'+r.value+'" onclick="wlSelectReason(this)" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:10px;border:1px solid '+(sel?col:'rgba(255,255,255,.1)')+';background:'+(sel?'rgba('+parseInt(selAlpha.slice(0,2),16)+','+parseInt(selAlpha.slice(2,4),16)+','+parseInt(selAlpha.slice(4,6),16)+',.15)':'transparent')+';color:'+(sel?col:'var(--mut)')+';cursor:pointer;flex:1;min-width:0;"><span style="font-size:17px;">'+r.emoji+'</span><span style="font-family:monospace;font-size:8px;font-weight:'+(sel?'700':'400')+';text-align:center;line-height:1.2;">'+r.label+'</span></button>';}).join('');
  modal.innerHTML='<div class="mbox" style="max-width:520px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
    +'<div style="font-size:18px;font-weight:700;color:#e879f9;">'+(e?'Horse Profile':'New Profile')+'</div>'
    +'<button onclick="document.getElementById(\'wl-modal\').remove()" style="background:none;border:none;color:var(--mut);font-size:20px;cursor:pointer;">✕</button></div>'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,121,249,.5);margin-bottom:8px;">Why am I logging this horse?</div>'
    +'<div style="display:flex;gap:5px;margin-bottom:10px;" id="wlf-reasons">'+reasonHtml+'</div>'
    +'<input type="hidden" id="wlf-reason" value="'+curReason+'">'
    +'<div class="fg" style="margin-bottom:14px;"><label>In a sentence...</label><input type="text" id="wlf-reason-note" placeholder="e.g. Finished well from rear at Ascot, should improve" value="'+(e?e.reasonNote||'':'')+'" autocomplete="off"></div>'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,121,249,.5);margin-bottom:8px;">Horse</div>'
    +'<div class="g2">'
    +'<div class="fg"><label>Horse Name</label><input type="text" id="wlf-horse" value="'+(e?e.horse:p.horse||'')+'"></div>'
    +'<div class="fg"><label>Current OR</label><input type="number" id="wlf-rating" placeholder="e.g. 98" value="'+(e?e.currentRating||'':p.currentRating||'')+'"></div>'
    +'</div>'
    +'<div class="fg"><label>Trainer</label><input type="text" id="wlf-trainer" value="'+(e?e.trainer||'':p.trainer||'')+'"></div>'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,121,249,.5);margin:14px 0 8px;">Race Observations</div>'
    +'<div id="wlf-obs-list"></div>'
    +'<button onclick="wlAddObsRow()" style="width:100%;padding:8px;border:1px dashed rgba(232,121,249,.3);border-radius:7px;background:transparent;color:#e879f9;font-family:monospace;font-size:11px;cursor:pointer;margin-bottom:4px;">+ Add Observation</button>'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,121,249,.5);margin:14px 0 8px;">Trainer / Connections Intel</div>'
    +'<div class="fg"><textarea id="wlf-intel" placeholder="Notes from trainer interviews, press, paddock chat..." style="min-height:60px;">'+(e?e.trainerIntel||'':'')+'</textarea></div>'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,121,249,.5);margin:14px 0 8px;">Future Targets</div>'
    +'<div id="wlf-targets-list"></div>'
    +'<button onclick="wlAddTargetRow()" style="width:100%;padding:8px;border:1px dashed rgba(251,146,60,.3);border-radius:7px;background:transparent;color:#fb923c;font-family:monospace;font-size:11px;cursor:pointer;margin-bottom:4px;">+ Add Profile Race</button>'
    +'<div style="font-family:monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,121,249,.5);margin:14px 0 8px;">Conditions Profile</div>'
    +'<div class="fg"><label>Going Preferences</label><div id="wlf-going" style="padding:6px 0;display:flex;flex-wrap:wrap;">'+goingHtml+'</div></div>'
    +'<div class="g2">'
    +'<div class="fg"><label>Preferred Distance</label><input type="text" id="wlf-dist" placeholder="e.g. 6-7f" value="'+(e?e.distancePref||'':'')+'"></div>'
    +'<div class="fg"><label>Track Type</label><input type="text" id="wlf-track" placeholder="e.g. Flat, LH" value="'+(e?e.trackPref||'':'')+'"></div>'
    +'</div>'
    +'<div class="fg"><label>Conditions Notes</label><textarea id="wlf-cond-notes" placeholder="Your evolving view on what suits this horse..." style="min-height:52px;">'+(e?e.conditionsNotes||e.notes||'':'')+'</textarea></div>'
    +'<div style="display:flex;gap:8px;margin-top:16px;">'
    +'<button class="btn bw" style="flex:1;background:#e879f9;color:#141414;font-weight:700;" onclick="saveWLEntry(\''+(e?e.id:'')+'\')">'+( e?'Save Profile':'Create Profile')+'</button>'
    +'<button class="btn bout" onclick="document.getElementById(\'wl-modal\').remove()">Cancel</button>'
    +'</div>'
    +(e?'<button class="btn bdng bw" style="width:100%;margin-top:8px;" onclick="delWLEntry(\''+e.id+'\')">Delete Profile</button>':'')
    +'</div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',function(ev){if(ev.target===modal)modal.remove();});
  _renderObsList();_renderTargetsList();
  setTimeout(function(){const f=document.getElementById('wlf-horse');if(f)f.focus();},100);
  }catch(err){alert('Profile error: '+err.message);console.error(err);}
}

function _renderObsList(){
  const el=document.getElementById('wlf-obs-list');if(!el)return;
  if(!_wlDossier.obs.length){el.innerHTML='<div style="color:var(--mut);font-size:12px;font-style:italic;margin-bottom:8px;">No observations yet.</div>';return;}
  el.innerHTML=_wlDossier.obs.map(function(o,i){
    return'<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:8px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
      +'<span style="font-family:monospace;font-size:10px;color:var(--mut);">Observation '+(i+1)+'</span>'
      +'<button onclick="_wlDelObs('+i+')" style="background:none;border:none;color:var(--mut);font-size:14px;cursor:pointer;padding:0;">✕</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Date</label><input type="date" value="'+(o.date||'')+'" onchange="_wlDossier.obs['+i+'].date=this.value"></div>'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Result</label><select onchange="_wlDossier.obs['+i+'].result=this.value">'
      +'<option value=""'+((!o.result)?' selected':'')+'>—</option>'
      +'<option value="win"'+((o.result==="win")?' selected':'')+'>Won</option>'
      +'<option value="place"'+((o.result==="place")?' selected':'')+'>Placed</option>'
      +'<option value="loss"'+((o.result==="loss")?' selected':'')+'>Unplaced</option>'
      +'</select></div>'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Race / Track</label><input type="text" value="'+(o.raceName||'')+'" placeholder="e.g. Windsor Maiden" onchange="_wlDossier.obs['+i+'].raceName=this.value"></div>'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Going</label><input type="text" value="'+(o.going||'')+'" placeholder="e.g. Good to Firm" onchange="_wlDossier.obs['+i+'].going=this.value"></div>'
      +'</div>'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Your Notes</label><textarea style="min-height:48px;" placeholder="What you noticed..." onchange="_wlDossier.obs['+i+'].notes=this.value">'+(o.notes||'')+'</textarea></div>'
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
  if(!_wlDossier.targets.length){el.innerHTML='<div style="color:var(--mut);font-size:12px;font-style:italic;margin-bottom:8px;">No targets set.</div>';return;}
  el.innerHTML=_wlDossier.targets.map(function(t,i){
    return'<div style="background:rgba(251,146,60,.05);border:1px solid rgba(251,146,60,.2);border-radius:8px;padding:10px;margin-bottom:8px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
      +'<span style="font-family:monospace;font-size:10px;color:#fb923c;">🎯 Target '+(i+1)+'</span>'
      +'<button onclick="_wlDelTarget('+i+')" style="background:none;border:none;color:var(--mut);font-size:14px;cursor:pointer;padding:0;">✕</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Race</label><input type="text" value="'+(t.race||'')+'" placeholder="Race name" onchange="_wlDossier.targets['+i+'].race=this.value"></div>'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Track</label><input type="text" value="'+(t.track||'')+'" placeholder="e.g. Ascot" onchange="_wlDossier.targets['+i+'].track=this.value"></div>'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Date</label><input type="date" value="'+(t.date||'')+'" onchange="_wlDossier.targets['+i+'].date=this.value"></div>'
      +'<div class="fg" style="margin:0;"><label style="font-size:9px;">Condition</label><input type="text" value="'+(t.condition||'')+'" placeholder="Condition (optional)" onchange="_wlDossier.targets['+i+'].condition=this.value"></div>'
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
  if(id){const idx=wl.findIndex(x=>x.id===id);if(idx>-1)wl[idx]=entry;else wl.push(entry);}
  else wl.push(entry);
  D.watchlist=wl;save();
  document.getElementById('wl-modal').remove();
  renderWatchlist();
  if(entry.raceDate&&wlView==='cal'){wlCalDate=new Date(entry.raceDate+'T00:00:00');renderWLCal();setTimeout(function(){wlSelectDay(entry.raceDate);},100);}
}

function delWLEntry(id){
  if(!confirm('Delete this profile permanently?'))return;
  D.watchlist=(D.watchlist||[]).filter(x=>x.id!==id);save();
  document.getElementById('wl-modal').remove();
  renderWatchlist();
}



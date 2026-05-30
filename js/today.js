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
  if(bl) bl.innerHTML = '<div style="font-family:var(--font-ui);font-size:9px;color:rgba(232,228,220,.45);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Bets Today</div>'
    + '<div style="font-family:var(--font-ui);font-size:17px;font-weight:700;color:var(--gld);">2 <span class="t-muted">/ 3</span></div>';

  // ── Check-in ──
  const ci = document.getElementById('tcin');
  if(ci) ci.innerHTML = '<div style="background:rgba(45,184,122,.08);border:1px solid rgba(45,184,122,.25);border-radius:11px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;">'
    + '<div><div style="font-family:var(--font-ui);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--grn);margin-bottom:3px;">✓ Checked in</div>'
    + '<div class="t-body">Looking for a well-treated handicapper on decent ground</div></div>'
    + '<span style="font-size:22px;">🙂</span></div>';

  // ── Edge alerts ──
  const ea = document.getElementById('t-edge-alerts');
  if(ea){
    ea.style.display = 'block';
    ea.innerHTML = '<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:11px;padding:12px 14px;">'
      + '<div style="font-family:var(--font-ui);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--grn);margin-bottom:8px;">⭐ Edge Running Today</div>'
      + [
          {horse:'Midnight Envoy', course:'Ascot', time:'14:30', mr:92, or:88, edge:4},
          {horse:'Thistle Down',   course:'York',  time:'16:10', mr:85, or:82, edge:3},
        ].map(function(e){
          return '<div style="padding:7px 0;border-bottom:1px solid rgba(74,222,128,.1);display:flex;align-items:center;justify-content:space-between;">'
            + '<div><div class="t-heading">'+e.horse+'</div>'
            + '<div style="font-family:var(--font-ui);font-size:10px;color:var(--mut);">'+e.time+' · '+e.course+'</div></div>'
            + '<span style="font-family:var(--font-ui);font-size:11px;font-weight:700;color:var(--grn);background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25);padding:3px 8px;border-radius:8px;white-space:nowrap;">MR '+e.mr+' · OR '+e.or+' · +'+e.edge+'</span>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  // ── Watchlist alert ──
  const wa = document.getElementById('t-wl-alerts');
  if(wa){
    wa.style.display = 'block';
    wa.innerHTML = '<div class="wl-alert-wrap">'
      + '<div style="font-family:var(--font-ui);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#a78bfa;margin-bottom:8px;">🔔 Watchlist Running Today</div>'
      + [
          {horse:'Midnight Envoy', course:'Ascot', time:'14:30', jockey:'F. Dettori', race:'Copper Horse Stakes'},
          {horse:'Velvet Sunrise',  course:'Newmarket', time:'15:45', jockey:'R. Moore', race:'July Stakes'},
        ].map(function(a){
          return '<div style="padding:7px 0;border-bottom:1px solid rgba(167,139,250,.12);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">'
            + '<div><div class="t-heading">'+a.horse+'</div>'
            + '<div class="t-muted">'+a.time+' · '+a.course+' · '+a.race+'</div>'
            + '<div style="font-size:11px;color:var(--gld);">J: '+a.jockey+'</div></div>'
            + '<span style="font-family:var(--font-ui);font-size:9px;font-weight:700;background:rgba(167,139,250,.15);color:#a78bfa;padding:3px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;">Profile →</span>'
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
      + '<div style="font-family:var(--font-ui);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--blu);margin-bottom:6px;">⏰ Next Race</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--txt);">Ascot — 14:30</div>'
      + '<div class="t-muted">Copper Horse Stakes · 12 runners</div></div>'
      + '<div style="font-family:var(--font-ui);font-size:20px;font-weight:700;color:var(--blu);">8m</div>'
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
        +'<div class="mbl"><div class="mh">'+b.horse+(isV?' <span style="font-size:9px;color:var(--ora);font-family:var(--font-ui);">VIRT</span>':'')+'</div>'
        +'<div class="mm">'+b.track+' · '+b.time+' · <span style="font-family:var(--font-ui);">'+b.odds+'</span></div></div>'
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
    +'<div class="t-muted">'+name+(runners?' · '+runners+' runners':'')+'</div></div>'
    +'<div style="text-align:right;flex-shrink:0;"><div style="font-family:var(--font-ui);font-size:15px;font-weight:700;color:'+urgency+';">'+countdown+'</div>'
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
        +'<div style="font-family:var(--font-ui);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:'+(done?'var(--grn)':'#f59e0b')+';margin-bottom:3px;">📋 Form Study</div>'
        +'<div class="t-body">'+(done?'Done for today — good discipline.':hasBets?'You\'ve bet today. Form studied?':'Have you studied today\'s form before betting?')+'</div>'
      +'</div>'
      +(done
        ?'<span style="font-size:20px;">✅</span>'
        :'<button onclick="markStudyDone()" style="flex-shrink:0;font-family:var(--font-ui);font-size:10px;font-weight:700;padding:6px 12px;border-radius:8px;border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.1);color:var(--gld);cursor:pointer;letter-spacing:.05em;text-transform:uppercase;">Mark done</button>'
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
  if(!alerts.length){alertEl.style.display='none';window._wlAlerts=[];return;}
  window._wlAlerts=alerts; // stored for PDF generation
  alertEl.style.display='block';
  const todayStr=td();
  alertEl.innerHTML='<div class="wl-alert-wrap">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
      +'<div style="font-family:var(--font-ui);font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#a78bfa;">🔔 Watchlist Running Today</div>'
      +'<button onclick="generateWatchlistPDF()" style="font-family:var(--font-ui);font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:6px;border:1px solid rgba(167,139,250,.3);background:rgba(167,139,250,.1);color:#a78bfa;cursor:pointer;white-space:nowrap;">↓ PDF</button>'
    +'</div>'
    +alerts.map(function(a){
      const wid=(a.wlEntry&&a.wlEntry.id)?a.wlEntry.id:'';
      const alreadyReviewed=(D.reviews||[]).some(function(r){
        return r.profileId===wid&&r.date===todayStr;
      });
      return'<div style="padding:8px 0;border-bottom:1px solid rgba(167,139,250,.1);">'
        +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-family:var(--font-ui);font-size:15px;font-weight:800;letter-spacing:.5px;color:var(--txt);">'+a.horse+'</div>'
            +'<div class="t-muted">'+a.time+' · '+a.course+(a.raceName?' · '+a.raceName:'')+'</div>'
            +(a.jockey?'<div style="font-size:11px;color:var(--gld);">J: '+a.jockey+'</div>':'')
          +'</div>'
          +'<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-items:flex-end;">'
            +(alreadyReviewed
              ?'<span style="font-family:var(--font-ui);font-size:9px;font-weight:800;letter-spacing:1px;background:rgba(74,222,128,.12);color:var(--grn);padding:3px 9px;border-radius:6px;border:1px solid rgba(74,222,128,.2);">✓ Reviewed</span>'
              :'<button data-wlid="'+wid+'" data-horse="'+a.horse+'" data-course="'+a.course+'" data-time="'+a.time+'" data-race="'+(a.raceName||'')+'" class="t-wl-review-btn" style="font-family:var(--font-ui);font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;background:rgba(167,139,250,.15);color:#a78bfa;padding:4px 10px;border-radius:6px;border:1px solid rgba(167,139,250,.3);cursor:pointer;white-space:nowrap;">Review ✍️</button>'
            )
            +'<button data-wlid="'+wid+'" class="t-wl-profile-btn" style="font-family:var(--font-ui);font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;background:transparent;color:var(--mut);padding:4px 10px;border-radius:6px;border:1px solid var(--bdr);cursor:pointer;white-space:nowrap;">Profile →</button>'
          +'</div>'
        +'</div>'
      +'</div>';
    }).join('')
  +'</div>';
  setTimeout(function(){
    alertEl.querySelectorAll('.t-wl-review-btn').forEach(function(btn){
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        openWLPostRaceReview(
          btn.getAttribute('data-wlid'),
          btn.getAttribute('data-horse'),
          btn.getAttribute('data-course'),
          btn.getAttribute('data-time'),
          btn.getAttribute('data-race')
        );
      });
    });
    alertEl.querySelectorAll('.t-wl-profile-btn').forEach(function(btn){
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        var id=btn.getAttribute('data-wlid');if(id)openWLProfile(id);
      });
    });
  },0);
}

// ── WATCHLIST PDF EXPORT ──
function generateWatchlistPDF(){
  const alerts=window._wlAlerts||[];
  if(!alerts.length){alert('No watchlist horses running today.');return;}

  // Load jsPDF dynamically if not already loaded
  function _buildPDF(){
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const PW=210, PH=297, M=14, CW=PW-M*2;
    const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    // ── Colour palette ──
    const C={
      bg:[5,5,8], sur:[13,13,24], bdr:[28,28,48],
      txt:[212,216,232], mut:[58,58,92],
      pur:[139,92,246], purL:[167,139,250],
      gld:[245,158,11], grn:[74,222,128],
      blu:[96,165,250], ora:[251,146,60],
    };

    // ── Helpers ──
    function rgb(c){return{r:c[0],g:c[1],b:c[2]};}
    function setFill(c){doc.setFillColor(c[0],c[1],c[2]);}
    function setStroke(c){doc.setDrawColor(c[0],c[1],c[2]);}
    function setTxt(c){doc.setTextColor(c[0],c[1],c[2]);}
    function roundRect(x,y,w,h,r,fill,stroke){
      doc.roundedRect(x,y,w,h,r,r,fill&&stroke?'FD':fill?'F':'D');
    }

    // ── Background ──
    setFill(C.bg); doc.rect(0,0,PW,PH,'F');

    // ── Header bar ──
    setFill([18,10,40]); doc.rect(0,0,PW,22,'F');
    // purple accent line
    setFill(C.pur); doc.rect(0,21.5,PW,.5,'F');
    // 🧩 brand
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    setTxt([255,255,255]);
    doc.text('RACING',M,14);
    doc.setTextColor(C.pur[0],C.pur[1],C.pur[2]);
    doc.text('PUZZLE',M+26,14);
    // Date right-aligned
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    setTxt(C.mut);
    doc.text(today,PW-M,14,{align:'right'});

    // ── Sub-header ──
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    setTxt(C.purL);
    doc.text('WATCHLIST RUNNING TODAY',M,32);
    doc.setFontSize(7);
    doc.setFont('helvetica','normal');
    setTxt(C.mut);
    doc.text(alerts.length+' horse'+(alerts.length>1?'s':'')+' from your Puzzle Profiler',M,37);
    // divider
    setStroke(C.bdr); doc.setLineWidth(.2); doc.line(M,40,PW-M,40);

    let y=45;
    const GAP=4;

    alerts.forEach(function(a,idx){
      const w=a.wlEntry||{};
      const obs=(w.observations||[]).sort(function(x,z){return(z.date||'').localeCompare(x.date||'');});
      const tgts=w.targets||[];
      const revs=(D.reviews||[]).filter(function(r){return r.profileId===w.id;}).sort(function(x,z){return(z.date||'').localeCompare(x.date||'');});
      const lastRev=revs[0]||null;
      const mr=w.myRating?parseFloat(w.myRating):null;
      const or=w.currentRating?parseFloat(w.currentRating):null;

      // Estimate card height
      let cardH=36;
      if(w.reasonNote)cardH+=5;
      if(obs.length)cardH+=5+(Math.min(obs.length,2)*12);
      if(tgts.length)cardH+=5+8;
      if(lastRev)cardH+=5+8;
      if(w.conditionsNotes||w.trainerIntel)cardH+=5+8;
      cardH+=6;

      // Page break
      if(y+cardH>PH-16){
        doc.addPage();
        setFill(C.bg); doc.rect(0,0,PW,PH,'F');
        y=16;
      }

      // ── Card background ──
      setFill(C.sur);
      setStroke(C.bdr);
      doc.setLineWidth(.2);
      roundRect(M,y,CW,cardH,2,true,true);

      // ── Category colour bar (left edge) ──
      const REASON_COL={
        'eye-catcher':C.purL,'future-target':C.ora,
        'trainer-intel':C.blu,'form-study':[239,68,68],'tip-source':[234,179,8]
      };
      const barCol=REASON_COL[w.reason||'eye-catcher']||C.purL;
      setFill(barCol); doc.rect(M,y,1.5,cardH,'F');

      let cy=y+7;
      const TX=M+5;
      const TW=CW-8;

      // ── Horse name ──
      doc.setFont('helvetica','bold');
      doc.setFontSize(12);
      setTxt([255,255,255]);
      doc.text(a.horse,TX,cy);

      // ── Race info right-aligned ──
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      setTxt(C.mut);
      const raceStr=a.time+(a.course?' · '+a.course:'')+(a.raceName?' · '+a.raceName:'');
      doc.text(raceStr,PW-M-2,cy,{align:'right'});
      cy+=4.5;

      // ── Trainer + jockey ──
      const sub=[];
      if(w.trainer)sub.push(w.trainer);
      if(a.jockey)sub.push('J: '+a.jockey);
      if(sub.length){
        doc.setFontSize(7.5);
        setTxt(C.mut);
        doc.text(sub.join('  ·  '),TX,cy);
        cy+=4.5;
      }

      // ── Reason tag + OR/MR pills ──
      const REASON_LBL={'eye-catcher':'Eye Catcher','future-target':'Future Target','trainer-intel':'Trainer Intel','form-study':'Form Study','tip-source':'Tip Source'};
      const rlbl=REASON_LBL[w.reason]||'Eye Catcher';
      doc.setFontSize(6.5);
      doc.setFont('helvetica','bold');
      const rw=doc.getTextWidth(rlbl)+4;
      setFill([barCol[0],barCol[1],barCol[2],0.15]);
      doc.setGState(new doc.GState({opacity:.12}));
      roundRect(TX,cy-2.5,rw+2,4.5,1,true,false);
      doc.setGState(new doc.GState({opacity:1}));
      setTxt(barCol);
      doc.text(rlbl,TX+1,cy+.5);
      let pillX=TX+rw+5;

      if(or){
        const orStr='OR '+or;
        const ow=doc.getTextWidth(orStr)+4;
        doc.setGState(new doc.GState({opacity:.12}));
        setFill(C.purL); roundRect(pillX,cy-2.5,ow+2,4.5,1,true,false);
        doc.setGState(new doc.GState({opacity:1}));
        setTxt(C.purL); doc.text(orStr,pillX+1,cy+.5);
        pillX+=ow+6;
      }
      if(mr){
        const mrStr='MR '+mr;
        const mw=doc.getTextWidth(mrStr)+4;
        doc.setGState(new doc.GState({opacity:.12}));
        setFill(C.gld); roundRect(pillX,cy-2.5,mw+2,4.5,1,true,false);
        doc.setGState(new doc.GState({opacity:1}));
        setTxt(C.gld); doc.text(mrStr,pillX+1,cy+.5);
      }
      cy+=6;

      // ── Reason note ──
      if(w.reasonNote){
        doc.setFont('helvetica','italic');
        doc.setFontSize(7);
        setTxt(C.mut);
        doc.text('"'+w.reasonNote+'"',TX,cy,{maxWidth:TW-2});
        cy+=5;
      }

      // ── Divider ──
      setStroke(C.bdr); doc.setLineWidth(.15); doc.line(TX,cy,M+CW-3,cy);
      cy+=4;

      // ── Observations (last 2) ──
      if(obs.length){
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        setTxt(C.purL);
        doc.text('OBSERVATIONS ('+obs.length+')',TX,cy);
        cy+=4;
        obs.slice(0,2).forEach(function(o){
          const res=o.result||'';
          const resCol=res==='win'?C.grn:res==='place'?C.gld:res==='loss'?[248,113,113]:C.mut;
          doc.setFont('helvetica','bold');
          doc.setFontSize(7);
          setTxt(resCol);
          const resLbl=res?res.toUpperCase():'—';
          doc.text(resLbl,TX,cy);
          const resW=doc.getTextWidth(resLbl)+3;
          doc.setFont('helvetica','normal');
          setTxt(C.mut);
          const obsMeta=[(o.date||''),(o.raceName||o.going?[o.raceName,o.going].filter(Boolean).join(' · '):'')].filter(Boolean).join(' · ');
          doc.text(obsMeta,TX+resW,cy,{maxWidth:TW-resW});
          cy+=3.5;
          if(o.notes){
            doc.setFont('helvetica','italic');
            doc.setFontSize(6.5);
            setTxt(C.mut);
            const noteLines=doc.splitTextToSize(o.notes,TW-4);
            doc.text(noteLines.slice(0,2),TX+2,cy);
            cy+=noteLines.slice(0,2).length*3;
          }
          cy+=1.5;
        });
      }

      // ── Last review ──
      if(lastRev){
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        setTxt([74,222,128]);
        doc.text('LAST REVIEW',TX,cy);
        cy+=3.5;
        const vCol=lastRev.verdict==='upgrade'?C.grn:lastRev.verdict==='downgrade'?[248,113,113]:C.blu;
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        setTxt(C.mut);
        const rvStr=[(lastRev.result||'').toUpperCase(),(lastRev.verdict||'').toUpperCase(),(lastRev.date||'')].filter(Boolean).join(' · ');
        doc.text(rvStr,TX,cy,{maxWidth:TW});
        cy+=3.5;
        if(lastRev.notes){
          doc.setFont('helvetica','italic');
          doc.setFontSize(6.5);
          setTxt(C.mut);
          doc.text(doc.splitTextToSize(lastRev.notes,TW-4).slice(0,2),TX+2,cy);
          cy+=6;
        }
      }

      // ── Next target ──
      if(tgts.length){
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        setTxt(C.ora);
        doc.text('NEXT TARGET',TX,cy);
        cy+=3.5;
        const tgt=tgts[0];
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        setTxt(C.mut);
        doc.text([tgt.race,tgt.track,tgt.date].filter(Boolean).join(' · '),TX,cy,{maxWidth:TW});
        cy+=4;
      }

      // ── Trainer intel snippet ──
      if(w.trainerIntel){
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        setTxt(C.blu);
        doc.text('TRAINER INTEL',TX,cy);
        cy+=3.5;
        doc.setFont('helvetica','italic');
        doc.setFontSize(6.5);
        setTxt(C.mut);
        doc.text(doc.splitTextToSize(w.trainerIntel,TW-4).slice(0,2),TX+2,cy);
        cy+=6;
      }

      y+=cardH+GAP;
    });

    // ── Footer ──
    setFill(C.bg); doc.rect(0,PH-10,PW,10,'F');
    setStroke(C.bdr); doc.setLineWidth(.2); doc.line(M,PH-10,PW-M,PH-10);
    doc.setFont('helvetica','normal');
    doc.setFontSize(6);
    setTxt(C.mut);
    doc.text('Generated by Racing Puzzle · theracingpuzzle.github.io',M,PH-5);
    doc.text(today,PW-M,PH-5,{align:'right'});

    // ── Save / Share ──
    const fname='racing-puzzle-watchlist-'+new Date().toISOString().slice(0,10)+'.pdf';
    if(navigator.share&&navigator.canShare){
      try{
        const blob=doc.output('blob');
        const file=new File([blob],fname,{type:'application/pdf'});
        if(navigator.canShare({files:[file]})){
          navigator.share({files:[file],title:'Watchlist — '+today});
          return;
        }
      }catch(e){}
    }
    doc.save(fname);
  }

  // Load jsPDF from CDN if needed
  if(window.jspdf&&window.jspdf.jsPDF){
    _buildPDF();
  } else {
    var script=document.createElement('script');
    script.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload=function(){_buildPDF();};
    script.onerror=function(){alert('Could not load PDF library. Check your connection.');};
    document.head.appendChild(script);
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
      +'<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--txt);">'+item.label+'</div>'+(item.sub?'<div class="t-muted">'+item.sub+'</div>':'')+'</div>'
      +'<div style="font-family:var(--font-ui);font-size:10px;color:'+item.col+';flex-shrink:0;">'+dayLbl+'</div>'
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
        +'<div style="font-family:var(--font-ui);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--grn);margin-bottom:3px;">✓ Checked in</div>'
        +(log.focus?'<div class="t-body">'+log.focus+'</div>':'<div style="font-size:12px;color:var(--mut);font-style:italic;">No focus set</div>')
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
    +'<div style="font-family:var(--font-ui);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--grn);margin-bottom:8px;">⭐ Edge Running Today</div>'
    +edges.map(function(e){
      return'<div style="padding:7px 0;border-bottom:1px solid rgba(74,222,128,.1);display:flex;align-items:center;justify-content:space-between;" onclick="goTo(5)">'
        +'<div>'
          +'<div class="t-heading">'+e.horse+'</div>'
          +'<div style="font-family:var(--font-ui);font-size:10px;color:var(--mut);">'+e.time+' · '+e.course+'</div>'
        +'</div>'
        +'<span style="font-family:var(--font-ui);font-size:11px;font-weight:700;color:var(--grn);background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25);padding:3px 8px;border-radius:8px;white-space:nowrap;">MR '+e.mr+' · OR '+e.or+' · +'+e.edge+'</span>'
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
    el.innerHTML='<div class="mbl"><div class="mh">'+b.horse+(isV?' <span style="font-size:9px;color:var(--ora);font-family:var(--font-ui);">VIRT</span>':'')+'</div>'
      +'<div class="mm">'+(b.track||'—')+(b.time?' · '+b.time:'')+' · <span style="font-family:var(--font-ui);">'+os+'</span></div></div>'
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
        +'<div class="mbl"><div class="mh">'+b.horse+(isV?' <span style="font-family:var(--font-ui);font-size:9px;color:var(--ora);">VIRT</span>':'')+'</div>'
        +'<div class="mm">'+b.date+' · '+(b.track||'—')+' · <span style="font-family:var(--font-ui);">'+os+'</span> · '+fp(b.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bpend" style="background:rgba(196,58,58,.15);color:var(--red);">settle</span></div></div>';
    }).join('');
  }
}
function saveToday(){D.dailyLog=D.dailyLog||[];const ex=D.dailyLog.find(d=>d.date===td());const e={date:td(),checkedIn:true,mood:document.getElementById('tmood').value,notes:document.getElementById('tnotes').value.trim(),tracks:getTracks(),createdAt:Date.now()};if(ex)Object.assign(ex,e);else D.dailyLog.push(e);save();updHdr();flash('tsaved');renderToday();}


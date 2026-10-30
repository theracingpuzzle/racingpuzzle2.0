// ─── RACE SIMULATION ───
// A lightweight, visual "what if" race sim for real declared runners pulled from
// the Racing API. The model is deliberately simple (weighted-random progress per
// step, not real physics) — the Racing API gives no sectional/in-running data for
// either upcoming or past races, so there is no real "ghost" to recreate stride by
// stride. What this does instead: builds a believable, noisy race from each
// runner's rating, animates it, and — if the real result is already cached in this
// session (window._todayResultsCache) — shows how the sim's read compared to what
// actually happened.

let _simHorses = null;
let _simStep = 0;
let _simTotalSteps = 24;
let _simTimer = null;
let _simRunning = false;
let _simMeta = {isJumps:false, isAW:false}; // drives track styling — see simRenderTrack()

// Deterministic fallback colour for a runner with no real silk_url, so every
// horse still has a distinct, consistent identity across replays.
function _simSilkColor(name){
  if(typeof _silkColors==='function')return _silkColors(name||'');
  return {body:'#64748b',accent:'#ffffff'};
}

// Build a noisy, rating-weighted race. Returns horses sorted by finish order,
// each carrying a ._pct[] array (progress 0-100 at every animation step).
function simBuildRace(runners){
  const active = (runners||[]).filter(function(r){
    return !(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR');
  });
  const ratings = active.map(function(r){ return parseFloat(r.ofr||r.rpr||r.ts)||0; });
  const valid = ratings.filter(function(v){ return v>0; });
  const avg = valid.length ? valid.reduce(function(a,b){return a+b;},0)/valid.length : 80;
  const minR = valid.length ? Math.min.apply(null,valid) : avg-10;
  const maxR = valid.length ? Math.max.apply(null,valid) : avg+10;
  const range = Math.max(1, maxR-minR);

  const horses = active.map(function(r,i){
    const rating = ratings[i]||avg;
    // 0.55–1.0 so even a field's weakest horse still has a running chance
    const strength = 0.55 + 0.45*((rating-minR)/range);
    return {
      horse: r.horse||r.name||'', number: r.number||(i+1), draw: r.draw||'',
      jockey: r.jockey||'', silkUrl: r.silk_url||r.silk||'',
      rating: ratings[i]||null, _strength: strength, _progress: 0, _history: [0]
    };
  });

  for(let step=1; step<=_simTotalSteps; step++){
    const stretch = step > _simTotalSteps*0.75; // final quarter: class counts more, noise shrinks
    horses.forEach(function(h){
      // Sum of 3 uniforms approximates a bell curve — more realistic jostling than flat noise
      const noise = (Math.random()+Math.random()+Math.random()-1.5) * (stretch?0.35:0.55);
      const base = stretch ? (0.8+0.4*h._strength) : (0.85+0.25*h._strength);
      h._progress += Math.max(0.1, base+noise);
      h._history.push(h._progress);
    });
  }

  const maxProgress = Math.max.apply(null, horses.map(function(h){return h._progress;}));
  horses.forEach(function(h){
    // Capped at 94%, matching .sim-finish-post's position, so the winner's marker
    // center lands exactly on the post instead of clipping past the track's edge.
    h._pct = h._history.map(function(p){ return Math.min(94, (p/maxProgress)*94); });
  });
  horses.sort(function(a,b){ return b._progress-a._progress; });
  // Rough "beaten lengths" flavour — not a real measurement, just a believable gap
  const winnerProgress = horses[0]._progress;
  horses.forEach(function(h,i){
    h._beaten = i===0 ? 0 : Math.max(0.1, (winnerProgress-h._progress)/winnerProgress*28);
  });
  return horses;
}

function simOpen(idx){
  const entry=_rcSwFlatRaces[idx];
  if(!entry){return;}
  const race=entry.race, course=entry.course;
  const runners=race.runners||race.horses||[];
  const active=runners.filter(function(r){return !(r.non_runner||r.isNonRunner||(''+r.number).toUpperCase()==='NR');});
  if(active.length<2){ _simToast('Need at least 2 runners to simulate.'); return; }

  _simHorses=simBuildRace(runners);
  _simStep=0;
  _simRunning=false;
  if(_simTimer){clearTimeout(_simTimer);_simTimer=null;}

  // Flat/Jumps/All-Weather — drives the track surface and whether obstacles are drawn
  const rType=(race.type||'').trim();
  const rSurface=(race.surface||'').trim();
  const distF=parseFloat(race.distance_f);
  _simMeta={
    isJumps: rType==='Hurdle'||rType==='Chase',
    isAW: rSurface==='AW',
    furlongs: (distF&&distF>0) ? distF : 8 // sensible fallback when the API has no distance
  };

  const time=race.off||race.off_time||race.time||'';
  const name=race.race_name||race.name||race.title||'Race';
  document.getElementById('sim-title').textContent=(course||'')+' '+time;
  document.getElementById('sim-sub').textContent=name+(rType?' · '+rType:'')+(_simMeta.isAW?' (AW)':'');

  simRenderTrack();
  const ov=document.getElementById('sim-overlay');
  ov.style.display='flex';

  setTimeout(simPlay, 350); // brief beat before the gate opens
}

function simClose(){
  if(_simTimer){clearTimeout(_simTimer);_simTimer=null;}
  _simRunning=false;
  const ov=document.getElementById('sim-overlay');
  if(ov)ov.style.display='none';
}

function _simToast(msg){
  if(typeof _lgToast==='function'){_lgToast(msg);return;}
  alert(msg);
}

function simRenderTrack(){
  const body=document.getElementById('sim-body');
  const n=_simHorses.length;
  const trees=['🌳','🌲','🌳','🌲','🌳','🌲','🌳'].join('');

  const markers=_simHorses.map(function(h,i){
    const topPct=((i+0.5)/n*100).toFixed(1);
    const fc=_simSilkColor(h.horse);
    // Real silk colours when the API has them; a deterministic fallback swatch
    // otherwise, so every runner still reads as a distinct, consistent "colours".
    const silk=h.silkUrl
      ? '<img src="'+h.silkUrl+'" alt="" class="sim-silk" onerror="this.outerHTML=\'<span class=&quot;sim-silk&quot; style=&quot;background:'+fc.body+';border-color:'+fc.accent+';&quot;></span>\';">'
      : '<span class="sim-silk" style="background:'+fc.body+';border-color:'+fc.accent+';"></span>';
    return '<div id="sim-marker-'+i+'" class="sim-horse-marker" style="left:0%;top:'+topPct+'%;">'
      +'<span class="sim-horse-label">'+(h.number||(i+1))+'</span>'
      +'<span class="sim-silk-wrap">'+silk+'</span>'
      +'<span class="sim-horse-icon">🐎</span>'
    +'</div>';
  }).join('');

  const key=_simHorses.map(function(h){
    const fc=_simSilkColor(h.horse);
    const swatch=h.silkUrl
      ?'<img src="'+h.silkUrl+'" alt="" width="14" height="14" style="object-fit:contain;flex-shrink:0;" onerror="this.outerHTML=\'<span class=&quot;sim-key-swatch&quot; style=&quot;background:'+fc.body+';border-color:'+fc.accent+';&quot;></span>\';">'
      :'<span class="sim-key-swatch" style="background:'+fc.body+';border-color:'+fc.accent+';"></span>';
    return '<div class="sim-key-row">'+swatch+'<span class="sim-key-num">'+(h.number||'')+'</span><span class="sim-key-name">'+h.horse+'</span></div>';
  }).join('');

  // Jump obstacles only for Hurdle/Chase — NH Flat ("bumper") races have no jumps
  const jumps=_simMeta.isJumps
    ? [18,38,58,78].map(function(l){return '<div class="sim-jump" style="left:'+l+'%;"></div>';}).join('')
    : '';
  const courseClass='sim-course'+(_simMeta.isAW?' sim-course-aw':' sim-course-turf');

  // Furlong poles — real distance-to-go markers at every whole furlong, standing
  // just outside the rail so they never collide with the runners. The number on
  // each pole is furlongs still to run, matching how UK courses mark them.
  const F=Math.max(2, Math.round(_simMeta.furlongs||8));
  const poles=[];
  for(let k=1;k<F;k++){
    const pct=94-(94/F)*k;
    if(pct<4)continue; // too close to the stalls to read cleanly
    poles.push('<div class="sim-furlong-pole" style="left:'+pct.toFixed(1)+'%;"><span class="sim-furlong-label">'+k+'</span></div>');
  }
  const polesHtml=poles.join('');

  body.innerHTML=
    '<div class="sim-stage">'
      +'<div class="'+courseClass+'" id="sim-track">'
        +'<div class="sim-scenery">'+trees+'</div>'
        +'<div class="sim-grandstand"></div>'
        +'<div class="sim-distance-hud" id="sim-distance-hud">'+_simDistanceLabel(0)+'</div>'
        +'<div class="sim-rail sim-rail-top"><div class="sim-rail-bar"></div><div class="sim-rail-posts"></div></div>'
        +'<div class="sim-rail sim-rail-bottom"><div class="sim-rail-bar"></div><div class="sim-rail-posts"></div></div>'
        +polesHtml
        +jumps
        +'<div class="sim-finish-post"></div>'
        +'<div class="sim-runway">'+markers+'</div>'
      +'</div>'
    +'</div>'
    +'<div class="sim-key">'+key+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:16px;">'
      +'<button id="sim-skip-btn" onclick="simSkip()" class="btn bout" style="flex:1;">Skip to result</button>'
    +'</div>'
    +'<div id="sim-result-panel" style="margin-top:16px;"></div>';
}

// Live "distance to go" readout, derived from the race's real distance_f and
// how far through the animation we are — not literal, but a believable read.
function _simDistanceLabel(step){
  const F=_simMeta.furlongs||8;
  if(step>=_simTotalSteps)return 'FINISH';
  const remaining=Math.max(0, F-(F*step/_simTotalSteps));
  if(remaining<0.5)return 'FINAL FURLONG';
  return Math.ceil(remaining-0.001)+'F TO GO';
}

function simPlay(){
  if(_simRunning)return;
  _simRunning=true;
  function tick(){
    if(_simStep>=_simTotalSteps){ simFinish(); return; }
    _simStep++;
    _simHorses.forEach(function(h,i){
      const el=document.getElementById('sim-marker-'+i);
      if(el)el.style.left=h._pct[_simStep]+'%';
    });
    const hud=document.getElementById('sim-distance-hud');
    if(hud)hud.textContent=_simDistanceLabel(_simStep);
    _simTimer=setTimeout(tick, 320);
  }
  tick();
}

function simSkip(){
  if(_simTimer){clearTimeout(_simTimer);_simTimer=null;}
  _simStep=_simTotalSteps;
  _simHorses.forEach(function(h,i){
    const el=document.getElementById('sim-marker-'+i);
    if(el){el.style.transition='none';el.style.left=h._pct[_simTotalSteps]+'%';}
  });
  const hud=document.getElementById('sim-distance-hud');
  if(hud)hud.textContent=_simDistanceLabel(_simTotalSteps);
  simFinish();
}

function simFinish(){
  _simRunning=false;
  const skipBtn=document.getElementById('sim-skip-btn');
  if(skipBtn){skipBtn.textContent='Race again';skipBtn.setAttribute('onclick','simReplay()');}

  const real=_simFindRealResult();
  const rows=_simHorses.map(function(h,i){
    const pos=i+1;
    const beaten=i===0?'':(h._beaten<1?'nose–¾L':h._beaten.toFixed(1)+'L');
    return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;'+(i?'border-top:1px solid var(--bdr);':'')+'">'
      +'<span style="width:22px;font-family:var(--font);font-weight:900;color:'+(pos===1?'#f59e0b':'var(--mut)')+';">'+pos+'</span>'
      +'<span style="flex:1;font-weight:700;color:var(--txt);">'+h.horse+'</span>'
      +'<span style="font-size:11px;color:var(--mut);">'+beaten+'</span>'
    +'</div>';
  }).join('');

  let compareHtml='';
  if(real){
    const simWinner=_simHorses[0].horse;
    const matched=_normSimHorse(simWinner)===_normSimHorse(real.winner);
    compareHtml='<div style="margin-top:14px;padding:10px 12px;border-radius:8px;background:'+(matched?'rgba(74,222,128,.08)':'rgba(96,165,250,.08)')+';border:1px solid '+(matched?'rgba(74,222,128,.3)':'rgba(96,165,250,.3)')+';font-size:12px;color:var(--txt);">'
      +(matched
        ? '✅ Your sim called it — <strong>'+real.winner+'</strong> actually won.'
        : '📋 In reality, <strong>'+real.winner+'</strong> won this one' + (real.sp?' at '+real.sp:'') + '.')
    +'</div>';
  }

  document.getElementById('sim-result-panel').innerHTML=
    '<div class="bttl" style="margin-bottom:4px;">Result</div>'+rows+compareHtml;
}

function simReplay(){
  const idx=_rcSwFlatRaces.findIndex(function(e){
    return e.race && (e.race.runners||e.race.horses||[]).some(function(r){return _simHorses&&_simHorses[0]&&r.horse===_simHorses[0].horse;});
  });
  // Rebuild from the same horse list rather than re-resolving idx (cheap and avoids edge cases)
  const runners=_simHorses.map(function(h){return {horse:h.horse,number:h.number,draw:h.draw,jockey:h.jockey,silk_url:h.silkUrl,ofr:h.rating};});
  _simHorses=simBuildRace(runners);
  _simStep=0;
  simRenderTrack();
  setTimeout(simPlay, 300);
}

function _normSimHorse(s){ return (s||'').replace(/\s*\([^)]+\)\s*$/,'').toLowerCase().trim(); }

// If this race has already run and its result is sitting in the session's
// results cache, surface the real winner for the "called it or not" comparison.
function _simFindRealResult(){
  try{
    const cache=(typeof rcSwResultsData!=='undefined'&&rcSwResultsData&&rcSwResultsData.length)?rcSwResultsData
      :(window._todayResultsCache||[]);
    const title=(document.getElementById('sim-title')||{}).textContent||'';
    for(const race of cache){
      const course=race.course||race.venue||'';
      const time=race.off||race.off_time||race.time||'';
      if(!title.includes(course)||!title.includes(time))continue;
      const runners=race.runners||race.horses||[];
      const winner=runners.find(function(r){ return String(r.position||r.place||'')==='1'; });
      if(winner)return{winner:winner.horse||winner.name||'',sp:winner.sp||winner.starting_price||''};
    }
  }catch(e){}
  return null;
}

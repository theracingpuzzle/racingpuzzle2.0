const COACH_KEY_STORE='racing-edge-api-key';
function save(){
  D._updatedAt=Date.now();
  saveLocal();
  if(SUPA_URL&&SUPA_ANON&&SUPA_USER_ID) supaSync();
}

// ════════════════════════════════════════════════════════
// SUPABASE SYNC — normalized per-table operations
// ════════════════════════════════════════════════════════

let _supaSyncTimer=null;
const _supaDirty=new Set(); // tracks which tables need syncing

function _markDirty(table){_supaDirty.add(table);}

function supaSync(){
  clearTimeout(_supaSyncTimer);
  _supaSyncTimer=setTimeout(function(){_supaFlush();},1500);
}

// Returns the best available auth token — user JWT when logged in, anon key as fallback
function _rpToken(){ return window._rpAccessToken || SUPA_ANON; }

// Helper: Supabase REST fetch
async function _supaUpsert(table,rows){
  // Upsert using POST with Prefer: resolution=merge-duplicates
  if(!rows||!rows.length)return;
  const url=SUPA_URL+'/rest/v1/'+table;
  const resp=await fetch(url,{
    method:'POST',
    headers:{
      'apikey':SUPA_ANON,'Authorization':'Bearer '+_rpToken(),
      'Content-Type':'application/json',
      'Prefer':'resolution=merge-duplicates,return=minimal'
    },
    body:JSON.stringify(rows)
  });
  if(!resp.ok){
    const txt=await resp.text().catch(()=>'');
    console.error('[Supabase] upsert '+table+' failed '+resp.status+':',txt);
    throw new Error(table+' upsert failed: '+resp.status+' '+txt.slice(0,200));
  }
}

async function _supa(method,table,body,params){
  const url=SUPA_URL+'/rest/v1/'+table+(params?'?'+params:'');
  const headers={'Content-Type':'application/json','apikey':SUPA_ANON,'Authorization':'Bearer '+_rpToken()};
  if(method==='POST')headers['Prefer']='resolution=merge-duplicates';
  if(method==='DELETE')headers['Prefer']='return=minimal';
  const opts={method,headers};
  if(body)opts.body=JSON.stringify(body);
  const resp=await fetch(url,opts);
  if(!resp.ok){const e=await resp.json().catch(()=>({}));throw new Error('Supabase '+table+': '+(e.message||resp.status));}
  return resp;
}

// Supabase status banner
function showSupaBanner(msg, type){
  const el=document.getElementById('supa-banner');
  if(!el)return;
  const cols={ok:'#34d399',error:'#ef4444',info:'#60a5fa'};
  el.style.background=cols[type]||cols.info;
  el.style.color='#0d1b2a';
  el.style.display='block';
  el.textContent=msg;
  if(type==='ok') setTimeout(function(){el.style.display='none';},4000);
}

// Manual test sync — called from Settings button
async function supaRawTest(){
  const out=document.getElementById('supa-raw-out');
  if(!out)return;
  out.value='Testing...\n';
  const log=function(s){out.value+=s+'\n';};
  log('URL: '+SUPA_URL);
  log('User ID: '+SUPA_USER_ID);
  log('');
  // Test 1: ping profiles table
  try{
    log('Step 1: GET /rest/v1/profiles...');
    const r=await fetch(SUPA_URL+'/rest/v1/profiles?limit=1',{
      headers:{'apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Content-Type':'application/json'}
    });
    log('Status: '+r.status+' '+r.statusText);
    const body=await r.text();
    log('Response: '+body.slice(0,200));
  }catch(e){log('ERROR: '+e.message);}
  log('');
  // Test 2: upsert profile row
  try{
    log('Step 2: POST profile row...');
    const r=await fetch(SUPA_URL+'/rest/v1/profiles',{
      method:'POST',
      headers:{'apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify([{id:'racing-puzzle-default',display_name:'Test User'}])
    });
    log('Status: '+r.status+' '+r.statusText);
    const body=await r.text();
    log('Response: '+body.slice(0,200));
  }catch(e){log('ERROR: '+e.message);}
  log('');
  // Test 3: insert one bet row
  try{
    log('Step 3: POST test bet row...');
    const r=await fetch(SUPA_URL+'/rest/v1/bets',{
      method:'POST',
      headers:{'apikey':SUPA_ANON,'Authorization':'Bearer '+_rpToken(),'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify([{id:'test-bet-001',user_id:SUPA_USER_ID,bet_date:'2026-01-01',horse:'Test Horse',stake:10,is_virtual:false}])
    });
    log('Status: '+r.status+' '+r.statusText);
    const body=await r.text();
    log('Response: '+body.slice(0,300));
  }catch(e){log('ERROR: '+e.message);}
  log('\nDone.');
}

async function supaTestSync(){
  const statusEl=document.getElementById('supa-status');
  const setStatus=function(msg,type){
    if(statusEl){statusEl.textContent=msg;statusEl.style.color=type==='error'?'var(--red)':type==='ok'?'var(--grn)':'var(--mut)';}
    showSupaBanner(msg,type==='error'?'error':type==='ok'?'ok':'info');
  };
  setStatus('⏳ Connecting to Supabase...','info');
  try{
    const testResp=await fetch(SUPA_URL+'/rest/v1/profiles?limit=1',{
      headers:{'apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON}
    });
    if(!testResp.ok){
      const e=await testResp.json().catch(()=>({}));
      setStatus('❌ Connection failed: '+testResp.status+' '+(e.message||''),'error');
      return;
    }
    setStatus('✅ Connected — syncing...','info');
    const errors=await _supaFlushSilent();
    if(errors.length){
      setStatus('⚠️ Sync errors: '+errors[0],'error');
    } else {
      setStatus('✅ All tables synced successfully','ok');
    }
  }catch(e){
    setStatus('❌ Error: '+e.message,'error');
  }
}

// Full flush — sync everything sequentially, returns error array
async function _supaFlushSilent(){
  if(!SUPA_URL||!SUPA_ANON||!SUPA_USER_ID)return['Not configured'];
  const errors=[];
  try{await _supa('POST','profiles',[{id:SUPA_USER_ID,display_name:'Racing Puzzle User',updated_at:new Date().toISOString()}]);}
  catch(e){errors.push('profiles: '+e.message);}
  const steps=[['bank',_syncBank],['bets',_syncBets],['horse_profiles',_syncProfiles],['rules',_syncRules],['daily_log',_syncDailyLog],['settings',_syncSettings],['horse_reviews',_syncReviews],['mr_ratings',_syncRatings]];
  for(let i=0;i<steps.length;i++){
    try{await steps[i][1]();}
    catch(e){errors.push(steps[i][0]+': '+e.message);console.warn('[Supabase]',steps[i][0],e.message);}
  }
  _supaDirty.clear();
  if(errors.length){console.warn('[Supabase] errors:',errors);}
  else{console.log('[Supabase] all tables synced ✅');}
  return errors;
}

async function _supaFlush(showFeedback){
  const errors=await _supaFlushSilent();
  if(errors.length){showSupaBanner('⚠️ Sync error: '+errors[0],'error');}
  else{showSupaBanner('☁ Synced to Supabase','ok');}
}

// ── Bank ──
async function _syncBank(){
  const b=D.bank||{};const vb=D.vBank||{};
  await _supa('DELETE','bank',null,'user_id=eq.'+SUPA_USER_ID);
  await _supa('POST','bank',[{
    user_id:SUPA_USER_ID,
    real_start:b.start||0,
    real_current:b.current||0,
    virtual_start:vb.start||500,
    virtual_current:vb.current||500,
    updated_at:new Date().toISOString()
  }]);
}

// ── Bets (real + virtual merged into one table, is_virtual flag) ──
async function _syncBets(){
  const uid=SUPA_USER_ID;
  const realBets=(D.bets||[]).map(function(b){return{
    id:b.id,user_id:uid,is_virtual:false,
    bet_date:b.date,horse:b.horse,track:b.track||null,
    race_time:b.time||null,jockey:b.jockey||null,trainer:b.trainer||null,
    odds:b.odds||null,odds_display:b.oddsDisplay||null,
    stake:b.stake,bet_type:b.betType||'win',
    confidence:b.conf||null,source:b.source||null,
    pre_notes:b.notes||null,post_notes:b.postNotes||null,
    checklist_score:b.checklistScore||0,
    checklist_answers:b.checklistAnswers&&Object.keys(b.checklistAnswers).length?b.checklistAnswers:null,
    result:b.result||null,returns:b.returns||0,
    bet_banked:!!b.betBanked,
    created_at:b.createdAt?new Date(b.createdAt).toISOString():new Date().toISOString()
  };});
  const virtBets=((D.vBank&&D.vBank.bets)||[]).map(function(b){return{
    id:b.id,user_id:uid,is_virtual:true,
    bet_date:b.date,horse:b.horse,track:b.track||null,
    race_time:b.time||null,jockey:b.jockey||null,trainer:b.trainer||null,
    odds:b.odds||null,odds_display:b.oddsDisplay||null,
    stake:b.stake,bet_type:b.betType||'win',
    confidence:b.conf||null,source:b.source||null,
    pre_notes:b.notes||null,post_notes:b.postNotes||null,
    checklist_score:b.checklistScore||0,
    checklist_answers:b.checklistAnswers&&Object.keys(b.checklistAnswers).length?b.checklistAnswers:null,
    result:b.result||null,returns:b.returns||0,
    bet_banked:!!b.betBanked,
    created_at:b.createdAt?new Date(b.createdAt).toISOString():new Date().toISOString()
  };});
  const all=realBets.concat(virtBets);
  // Delete bets not in current data, then upsert all
  const ids=all.map(function(b){return b.id;});
  if(ids.length){
    // Delete rows for this user that are no longer in the app
    await _supa('DELETE','bets',null,'user_id=eq.'+uid+'&id=not.in.('+ids.join(',')+')');
  } else {
    await _supa('DELETE','bets',null,'user_id=eq.'+uid);
  }
  if(all.length) await _supaUpsert('bets',all);
}

// ── Horse Profiles + Observations + Targets ──
async function _syncProfiles(){
  const uid=SUPA_USER_ID;
  const wl=D.watchlist||[];
  const profiles=wl.map(function(e){return{
    id:e.id,user_id:uid,
    horse:e.horse,trainer:e.trainer||null,
    current_rating:e.currentRating||null,
    my_rating:e.myRating||null,
    or_history:e.orHistory||[],
    or_updated_date:e.orUpdatedDate||null,
    reason:e.reason||'eye-catcher',
    reason_note:e.reasonNote||null,
    trainer_intel:e.trainerIntel||null,
    going_prefs:e.goingPrefs||[],
    distance_pref:e.distancePref||null,
    track_pref:e.trackPref||null,
    conditions_notes:e.conditionsNotes||null,
    age:e.age||null,
    race_type:e.raceType||null,
    surface:e.surface||null,
    needs_review:e.needsReview||false,
    unraced:e.unraced||false,
    created_at:e.createdAt?new Date(e.createdAt).toISOString():new Date().toISOString(),
    updated_at:e.updatedAt?new Date(e.updatedAt).toISOString():new Date().toISOString()
  };});
  const obs=[];const targets=[];
  wl.forEach(function(e){
    (e.observations||[]).forEach(function(o){
      obs.push({id:o.id,profile_id:e.id,user_id:uid,
        obs_date:o.date||null,race_name:o.raceName||null,
        track:o.track||null,going:o.going||null,
        result:o.result||null,notes:o.notes||null,
        created_at:o.createdAt?new Date(o.createdAt).toISOString():new Date().toISOString()});
    });
    (e.targets||[]).forEach(function(t){
      targets.push({id:t.id,profile_id:e.id,user_id:uid,
        race:t.race||null,track:t.track||null,
        target_date:t.date||null,condition:t.condition||null,
        created_at:t.createdAt?new Date(t.createdAt).toISOString():new Date().toISOString()});
    });
  });
  const profileIds=profiles.map(function(p){return p.id;});
  // Upsert profiles
  if(profiles.length) await _supaUpsert('horse_profiles',profiles);
  // UPSERT ONLY — never auto-delete observations or targets during passive sync.
  // Multi-device safety: Device B does not know about observations added on Device A
  // since it last loaded. Deletions are handled explicitly in saveWLEntry/delWLEntry.
  if(obs.length) await _supaUpsert('profile_observations',obs);
  if(targets.length) await _supaUpsert('profile_targets',targets);
  // Remove profiles explicitly deleted locally (profile IDs are stable across devices)
  if(profileIds.length){
    await _supa('DELETE','horse_profiles',null,'user_id=eq.'+uid+'&id=not.in.('+profileIds.join(',')+')');
  }
}

// ── Explicit observation / target deletion (called from watchlist UI actions) ──
async function supaDeleteObsByIds(obsIds){
  if(!SUPA_URL||!SUPA_ANON||!obsIds||!obsIds.length)return;
  await _supa('DELETE','profile_observations',null,'user_id=eq.'+SUPA_USER_ID+'&id=in.('+obsIds.join(',')+')');
}
async function supaDeleteTargetsByIds(targetIds){
  if(!SUPA_URL||!SUPA_ANON||!targetIds||!targetIds.length)return;
  await _supa('DELETE','profile_targets',null,'user_id=eq.'+SUPA_USER_ID+'&id=in.('+targetIds.join(',')+')');
}
async function supaDeleteProfileObsAndTargets(profileId){
  if(!SUPA_URL||!SUPA_ANON||!profileId)return;
  await _supa('DELETE','profile_observations',null,'user_id=eq.'+SUPA_USER_ID+'&profile_id=eq.'+profileId);
  await _supa('DELETE','profile_targets',null,'user_id=eq.'+SUPA_USER_ID+'&profile_id=eq.'+profileId);
}

// ── Rules ──
async function _syncRules(){
  const uid=SUPA_USER_ID;
  // Delete all then re-insert (rules are just ordered strings, no stable IDs)
  await _supa('DELETE','rules',null,'user_id=eq.'+uid);
  const rows=(D.rules||[]).map(function(r,i){
    return{user_id:uid,rule_text:r,sort_order:i};
  });
  if(rows.length) await _supa('POST','rules',rows);
}

// ── MR Ratings ──
async function _syncRatings(){
  const uid=SUPA_USER_ID;
  const ratings=D.ratings||{};
  const rows=Object.keys(ratings).map(function(key){
    const r=ratings[key];
    return{
      id:uid+'_'+key,
      user_id:uid,
      horse:r.horse||key,
      mr:r.mr||'',
      note:r.note||'',
      or_val:String(r.or||''),
      date:r.date||null,
      updated_at:new Date().toISOString()
    };
  });
  await _supa('DELETE','mr_ratings',null,'user_id=eq.'+uid);
  if(rows.length) await _supa('POST','mr_ratings',rows);
}

// ── Daily Log ──
async function _syncDailyLog(){
  const uid=SUPA_USER_ID;
  // Deduplicate by date — last entry per date wins, preventing ON CONFLICT duplicate-row errors
  const byDate={};
  (D.dailyLog||[]).forEach(function(d){byDate[d.date]=d;});
  const rows=Object.values(byDate).map(function(d){return{
    user_id:uid,log_date:d.date,
    visited:!!d.visited,checked_in:!!d.checkedIn,
    mood:d.mood||'neutral',notes:d.notes||null,
    tracks:d.tracks||[],
    created_at:d.createdAt?new Date(d.createdAt).toISOString():new Date().toISOString()
  };});
  await _supa('DELETE','daily_log',null,'user_id=eq.'+SUPA_USER_ID);
  if(rows.length) await _supa('POST','daily_log',rows);
}

// ── Settings ──
async function _syncSettings(){
  const uid=SUPA_USER_ID;
  const s=D.settings||{};
  // Exclude special keys handled separately — prevents duplicate key in same batch
  const specialKeys=new Set(['sources','cksOwn','cksTip']);
  const rows=Object.keys(s).filter(function(k){return !specialKeys.has(k);}).map(function(k){
    return{user_id:uid,key:k,value:s[k],updated_at:new Date().toISOString()};
  });
  // Sources live in D.settings.sources — sync that (D.sources was the old location)
  const srcList=D.settings.sources||D.sources||[];
  if(srcList.length){
    rows.push({user_id:uid,key:'sources',value:JSON.stringify(srcList),updated_at:new Date().toISOString()});
  }
  rows.push({user_id:uid,key:'cksOwn',value:JSON.stringify(D.cksOwn||[]),updated_at:new Date().toISOString()});
  rows.push({user_id:uid,key:'cksTip',value:JSON.stringify(D.cksTip||[]),updated_at:new Date().toISOString()});
  await _supa('DELETE','settings',null,'user_id=eq.'+SUPA_USER_ID);
  if(rows.length) await _supa('POST','settings',rows);
}


// ════════════════════════════════════════════════════════
// SUPABASE LOAD — fetch all tables and assemble D
// ════════════════════════════════════════════════════════

async function supaLoad(){
  if(!SUPA_URL||!SUPA_ANON||!SUPA_USER_ID)return false;
  const uid=SUPA_USER_ID;
  try{
    // Fetch all tables in parallel
    const _h={'apikey':SUPA_ANON,'Authorization':'Bearer '+_rpToken()};
    const [bankRows,betRows,profileRows,obsRows,targetRows,ruleRows,logRows,settingRows,reviewRows,ratingRows]=await Promise.all([
      fetch(SUPA_URL+'/rest/v1/bank?user_id=eq.'+uid,{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/bets?user_id=eq.'+uid+'&order=created_at.asc',{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/horse_profiles?user_id=eq.'+uid,{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/profile_observations?user_id=eq.'+uid,{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/profile_targets?user_id=eq.'+uid,{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/rules?user_id=eq.'+uid+'&order=sort_order.asc',{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/daily_log?user_id=eq.'+uid+'&order=log_date.desc',{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/settings?user_id=eq.'+uid,{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/horse_reviews?user_id=eq.'+uid+'&order=date.desc',{headers:_h}).then(function(r){return r.json();}),
      fetch(SUPA_URL+'/rest/v1/mr_ratings?user_id=eq.'+uid,{headers:_h}).then(function(r){return r.json();})
    ]);

    // ── Bank ──
    if(bankRows&&bankRows.length){
      const b=bankRows[0];
      D.bank={start:b.real_start,current:b.real_current};
      D.vBank=D.vBank||{};
      D.vBank.start=b.virtual_start;
      D.vBank.current=b.virtual_current;
    } else {
      // New user — no bank row yet, start from zero
      D.bank={start:0,current:0};
      D.vBank=D.vBank||{};
      D.vBank.start=0;
      D.vBank.current=0;
    }

    // ── Bets (split back into real and virtual) ──
    if(Array.isArray(betRows)){
      D.bets=betRows.filter(function(b){return!b.is_virtual;}).map(function(b){return{
        id:b.id,date:b.bet_date,horse:b.horse,track:b.track||'',
        time:b.race_time||'',jockey:b.jockey||'',trainer:b.trainer||'',
        odds:b.odds,oddsDisplay:b.odds_display||'',
        stake:b.stake,betType:b.bet_type,conf:b.confidence,
        source:b.source||'',notes:b.pre_notes||'',postNotes:b.post_notes||'',
        checklistScore:b.checklist_score||0,checklistAnswers:b.checklist_answers||{},
        result:b.result,returns:b.returns||0,
        betBanked:!!b.bet_banked,
        createdAt:new Date(b.created_at).getTime()
      };});
      D.vBank=D.vBank||{};
      D.vBank.bets=betRows.filter(function(b){return b.is_virtual;}).map(function(b){return{
        id:b.id,date:b.bet_date,horse:b.horse,track:b.track||'',
        time:b.race_time||'',jockey:b.jockey||'',trainer:b.trainer||'',
        odds:b.odds,oddsDisplay:b.odds_display||'',
        stake:b.stake,betType:b.bet_type,conf:b.confidence,
        source:b.source||'',notes:b.pre_notes||'',postNotes:b.post_notes||'',
        checklistScore:b.checklist_score||0,checklistAnswers:b.checklist_answers||{},
        result:b.result,returns:b.returns||0,
        createdAt:new Date(b.created_at).getTime()
      };});
    }

    // ── Horse Profiles (with obs and targets assembled) ──
    if(Array.isArray(profileRows)){
      const obsMap={};const targetMap={};
      (obsRows||[]).forEach(function(o){if(!obsMap[o.profile_id])obsMap[o.profile_id]=[];obsMap[o.profile_id].push({id:o.id,date:o.obs_date||'',raceName:o.race_name||'',track:o.track||'',going:o.going||'',result:o.result||'',notes:o.notes||'',createdAt:new Date(o.created_at).getTime()});});
      (targetRows||[]).forEach(function(t){if(!targetMap[t.profile_id])targetMap[t.profile_id]=[];targetMap[t.profile_id].push({id:t.id,race:t.race||'',track:t.track||'',date:t.target_date||'',condition:t.condition||''});});
      D.watchlist=profileRows.map(function(p){return{
        id:p.id,horse:p.horse,trainer:p.trainer||'',
        currentRating:p.current_rating||'',
        myRating:p.my_rating||'',
        orHistory:p.or_history||[],
        orUpdatedDate:p.or_updated_date||null,
        reason:p.reason||'eye-catcher',
        reasonNote:p.reason_note||'',
        trainerIntel:p.trainer_intel||'',
        goingPrefs:p.going_prefs||[],
        distancePref:p.distance_pref||'',
        trackPref:p.track_pref||'',
        conditionsNotes:p.conditions_notes||'',
        age:p.age||0,
        raceType:p.race_type||'',
        surface:p.surface||'',
        needsReview:p.needs_review||false,
        unraced:p.unraced||false,
        observations:obsMap[p.id]||[],
        targets:targetMap[p.id]||[],
        createdAt:new Date(p.created_at).getTime(),
        updatedAt:new Date(p.updated_at).getTime()
      };});
    }

    // ── Rules ──
    if(Array.isArray(ruleRows)) D.rules=ruleRows.map(function(r){return r.rule_text;});

    // ── Daily Log ──
    if(Array.isArray(logRows)){
      // Deduplicate by date — last row wins (handles any pre-existing DB duplicates)
      const logByDate={};
      logRows.forEach(function(d){logByDate[d.log_date]=d;});
      D.dailyLog=Object.values(logByDate).map(function(d){return{
        date:d.log_date,visited:d.visited,checkedIn:d.checked_in,
        mood:d.mood,notes:d.notes||'',tracks:d.tracks||[],
        createdAt:new Date(d.created_at).getTime()
      };});
    }

    // ── Settings ──
    // Always reset user-specific lists so a new user never sees a previous user's data
    D.settings=D.settings||{};
    D.settings.sources=[];
    D.sources=[];
    if(Array.isArray(settingRows)){
      settingRows.forEach(function(s){
        if(s.key==='sources'){
          try{const parsed=JSON.parse(s.value);if(Array.isArray(parsed)&&parsed.length){D.settings.sources=parsed;D.sources=parsed;}}
          catch(e){}
        } else if(s.key==='cksOwn'){
          try{const parsed=JSON.parse(s.value);if(Array.isArray(parsed)&&parsed.length)D.cksOwn=parsed;}
          catch(e){}
        } else if(s.key==='cksTip'){
          try{const parsed=JSON.parse(s.value);if(Array.isArray(parsed)&&parsed.length)D.cksTip=parsed;}
          catch(e){}
        } else {
          D.settings[s.key]=s.value;
        }
      });
    }

    // ── Reviews ──
    if(Array.isArray(reviewRows)){
      D.reviews=reviewRows.map(function(r){return{
        id:r.id,profileId:r.profile_id,
        date:r.date||'',raceName:r.race_name||'',course:r.course||'',
        result:r.result||'',position:r.position||'',beatenDistance:r.beaten_distance||'',odds:r.odds||'',
        verdict:r.verdict||'',mrAdjustment:r.mr_adjustment||0,
        goingConfirmed:r.going_confirmed||'',backNextTime:r.back_next_time||'',
        notes:r.notes||'',source:r.source||'manual',
        distance:r.distance||r.race_name||'',going:r.going||'',
        needsReview:r.needs_review||false,
        createdAt:new Date(r.created_at).getTime()
      };});
    }
    // ── MR Ratings ──
    if(Array.isArray(ratingRows)){
      D.ratings={};
      ratingRows.forEach(function(r){
        const key=(r.horse||'').toLowerCase().trim();
        if(!key)return;
        D.ratings[key]={horse:r.horse,mr:r.mr||'',note:r.note||'',or:r.or_val||'',date:r.date||''};
      });
    }

    // ── needsReview flag onto watchlist entries ──
    if(Array.isArray(D.watchlist)&&Array.isArray(profileRows)){
      const nrMap={};
      profileRows.forEach(function(p){nrMap[p.id]=p.needs_review||false;});
      D.watchlist.forEach(function(w){w.needsReview=nrMap[w.id]||false;});
    }

    saveLocal();
    return true;
  }catch(e){console.warn('[Supabase] load error:',e.message);return false;}
}

// Full immediate sync (used by import)
async function _supaUpsertNow(){
  return _supaFlush();
}

function loadApiKeyField(){
  const key=localStorage.getItem(COACH_KEY_STORE)||'';
  const inp=document.getElementById('apikey-inp');
  const st=document.getElementById('apikey-status');
  if(inp){inp.value=key?'•'.repeat(Math.min(key.length,24)):'';}
  if(st){st.textContent=key?'✓ Key saved':'';st.style.color=key?'var(--grn)':'';}
  updateAIUsageDisplay();
}

function saveApiKey(){
  const val=document.getElementById('apikey-inp').value.trim();
  if(!val||val.startsWith('•')){alert('Enter a valid API key.');return;}
  localStorage.setItem(COACH_KEY_STORE,val);
  const st=document.getElementById('apikey-status');
  if(st){st.textContent='✓ Key saved';st.style.color='var(--grn)';}
  setTimeout(()=>{const el=document.getElementById('apikey-status');if(el){el.textContent='';el.style.color='';}},3000);
}
function saveAILimit(){
  const v=parseInt(document.getElementById('ai-limit-inp').value)||10;
  localStorage.setItem('racing-puzzle-ai-limit',Math.max(1,Math.min(50,v)));
  const st=document.getElementById('ai-limit-status');
  if(st){st.textContent='✓ Saved';st.style.color='var(--grn)';}
  setTimeout(function(){const el=document.getElementById('ai-limit-status');if(el)el.textContent='';},2000);
  updateAIUsageDisplay();
}

function loadAILimitField(){
  const el=document.getElementById('ai-limit-inp');
  if(el)el.value=getAIDailyLimit();
  updateAIUsageDisplay();
}


// ── Horse Reviews ──
async function _syncReviews(){
  const uid=SUPA_USER_ID;
  const reviews=D.reviews||[];
  // NEVER delete-all when reviews is empty — could be a cold start before supaLoad completes
  if(!reviews.length)return;
  const rows=reviews.map(function(r){return{
    id:r.id,user_id:uid,profile_id:r.profileId,
    date:r.date||null,race_name:r.raceName||null,course:r.course||null,
    result:r.result||null,position:r.position||null,beaten_distance:r.beatenDistance||null,
    odds:r.odds||null,
    verdict:r.verdict||null,mr_adjustment:r.mrAdjustment||0,
    going_confirmed:r.goingConfirmed||null,back_next_time:r.backNextTime||null,
    notes:r.notes||null,source:r.source||'manual',
    created_at:r.createdAt?new Date(r.createdAt).toISOString():new Date().toISOString()
  };});
  const ids=rows.map(function(r){return r.id;});
  if(ids.length){
    await _supa('DELETE','horse_reviews',null,'user_id=eq.'+uid+'&id=not.in.('+ids.join(',')+')');
  }
  await _supaUpsert('horse_reviews',rows);
}

async function exportData(){
  const btn=document.getElementById('export-btn');
  if(btn){btn.textContent='⏳ Exporting...';btn.disabled=true;}
  try{
    const uid=SUPA_USER_ID;
    const h={'apikey':SUPA_ANON,'Authorization':'Bearer '+_rpToken()};
    const get=function(table,params){
      return fetch(SUPA_URL+'/rest/v1/'+table+'?user_id=eq.'+uid+(params?'&'+params:''),{headers:h}).then(function(r){
        if(!r.ok)throw new Error(table+' fetch failed: '+r.status);
        return r.json();
      });
    };
    // Fetch all tables in parallel — raw Supabase rows, nothing left behind
    const [bankRows,betRows,profileRows,obsRows,targetRows,reviewRows,ruleRows,logRows,settingRows]=await Promise.all([
      get('bank'),
      get('bets','order=created_at.asc'),
      get('horse_profiles'),
      get('profile_observations'),
      get('profile_targets'),
      get('horse_reviews','order=date.desc'),
      get('rules','order=sort_order.asc'),
      get('daily_log','order=log_date.desc'),
      get('settings')
    ]);
    const payload={
      exportedAt:new Date().toISOString(),
      schema:'racing-puzzle-v3',
      // Raw Supabase rows — complete and restorable
      bank:bankRows||[],
      bets:betRows||[],
      horse_profiles:profileRows||[],
      profile_observations:obsRows||[],
      profile_targets:targetRows||[],
      horse_reviews:reviewRows||[],
      rules:ruleRows||[],
      daily_log:logRows||[],
      settings:settingRows||[]
    };
    const counts=[
      (betRows||[]).filter(function(b){return!b.is_virtual;}).length+' real bets',
      (betRows||[]).filter(function(b){return b.is_virtual;}).length+' virtual bets',
      (profileRows||[]).length+' horse profiles',
      (obsRows||[]).length+' observations',
      (targetRows||[]).length+' targets',
      (reviewRows||[]).length+' reviews'
    ].join(', ');
    const json=JSON.stringify(payload,null,2);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const date=new Date().toISOString().slice(0,10);
    a.href=url;a.download='racing-puzzle-export-'+date+'.json';
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);
    showSupaBanner('✅ Export complete — '+counts,'ok');
  }catch(e){
    console.error('[Export]',e);
    showSupaBanner('❌ Export failed: '+e.message,'error');
    alert('Export failed: '+e.message+'\n\nCheck your Supabase connection and try again.');
  }finally{
    if(btn){btn.textContent='Export Data';btn.disabled=false;}
  }
}

function importDataPrompt(){
  const input=document.createElement('input');
  input.type='file';input.accept='.json,application/json';
  input.onchange=function(ev){
    const file=ev.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=function(e){
      try{
        const p=JSON.parse(e.target.result);
        const isV3=p.schema==='racing-puzzle-v3';
        const isV2=p.schema==='racing-puzzle-v2';
        if(!isV3&&!isV2){
          alert('Unrecognised file format. Make sure you are importing a Racing Puzzle export.');return;
        }
        const realCount=isV3?(p.bets||[]).filter(function(b){return!b.is_virtual;}).length:(p.bets||[]).length;
        const virtCount=isV3?(p.bets||[]).filter(function(b){return b.is_virtual;}).length:(p.virtualBets||[]).length;
        const profileCount=isV3?(p.horse_profiles||[]).length:(p.watchlist||[]).length;
        const reviewCount=isV3?(p.horse_reviews||[]).length:(p.reviews||[]).length;
        const obsCount=isV3?(p.profile_observations||[]).length:0;
        const targetsCount=isV3?(p.profile_targets||[]).length:0;
        const summary=[
          realCount+' real bets',
          virtCount+' virtual bets',
          profileCount+' horse profiles',
          reviewCount+' reviews',
          obsCount+' observations',
          targetsCount+' targets'
        ].join(', ');
        if(!confirm('This will replace ALL current data with the imported file.\n\nImporting: '+summary+'\n\nAre you sure?'))return;

        if(isV3){
          // v3: raw Supabase rows — upsert directly, no translation needed
          if(!SUPA_URL||!SUPA_ANON||!SUPA_USER_ID){
            alert('Supabase not configured. Cannot import v3 backup without a connection.');return;
          }
          showSupaBanner('⏳ Importing to Supabase...','info');
          const uid=SUPA_USER_ID;
          // Re-stamp all rows with current user_id (safe for migration between accounts)
          const stamp=function(rows){return(rows||[]).map(function(r){return Object.assign({},r,{user_id:uid});});};
          const steps=[
            // Clear then restore bank
            function(){return _supa('DELETE','bank',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.bank);if(rows.length)return _supaUpsert('bank',rows);
            });},
            // Bets: delete all then upsert
            function(){return _supa('DELETE','bets',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.bets);if(rows.length)return _supaUpsert('bets',rows);
            });},
            // Profiles: delete all then upsert
            function(){return _supa('DELETE','horse_profiles',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.horse_profiles);if(rows.length)return _supaUpsert('horse_profiles',rows);
            });},
            // Observations: delete all then upsert
            function(){return _supa('DELETE','profile_observations',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.profile_observations);if(rows.length)return _supaUpsert('profile_observations',rows);
            });},
            // Targets: delete all then upsert
            function(){return _supa('DELETE','profile_targets',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.profile_targets);if(rows.length)return _supaUpsert('profile_targets',rows);
            });},
            // Reviews: delete all then upsert
            function(){return _supa('DELETE','horse_reviews',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.horse_reviews);if(rows.length)return _supaUpsert('horse_reviews',rows);
            });},
            // Rules: delete all then re-insert
            function(){return _supa('DELETE','rules',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.rules);if(rows.length)return _supaUpsert('rules',rows);
            });},
            // Daily log: delete all then re-insert
            function(){return _supa('DELETE','daily_log',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.daily_log);if(rows.length)return _supaUpsert('daily_log',rows);
            });},
            // Settings: delete all then re-insert
            function(){return _supa('DELETE','settings',null,'user_id=eq.'+uid).then(function(){
              const rows=stamp(p.settings);if(rows.length)return _supaUpsert('settings',rows);
            });}
          ];
          // Run steps sequentially
          steps.reduce(function(chain,step){return chain.then(step);},Promise.resolve())
            .then(function(){
              showSupaBanner('✅ Import complete — '+summary,'ok');
              return supaLoad();
            })
            .then(function(){saveLocal();location.reload();})
            .catch(function(err){
              console.error('[Import v3]',err);
              showSupaBanner('❌ Import failed: '+err.message,'error');
              alert('Import failed: '+err.message);
            });

        } else {
          // v2 legacy: translate local-state format back into D, then flush to Supabase
          if(Array.isArray(p.bets))D.bets=p.bets;
          if(p.bank)D.bank=p.bank;
          if(p.vBank){D.vBank=D.vBank||{};D.vBank.start=p.vBank.start;D.vBank.current=p.vBank.current;}
          if(Array.isArray(p.virtualBets)){D.vBank=D.vBank||{};D.vBank.bets=p.virtualBets;}
          if(Array.isArray(p.watchlist))D.watchlist=p.watchlist;
          if(Array.isArray(p.reviews))D.reviews=p.reviews;
          if(Array.isArray(p.rules))D.rules=p.rules;
          if(Array.isArray(p.dailyLog))D.dailyLog=p.dailyLog;
          if(p.settings)D.settings=p.settings;
          saveLocal();updHdr();
          if(SUPA_URL&&SUPA_ANON&&SUPA_USER_ID){
            showSupaBanner('⏳ Syncing to Supabase...','info');
            _supaFlushSilent().then(function(errors){
              if(errors.length){showSupaBanner('⚠️ Sync error: '+errors[0],'error');}
              else{showSupaBanner('✅ Imported — '+realCount+' bets, '+profileCount+' profiles','ok');}
              location.reload();
            }).catch(function(err){
              showSupaBanner('❌ Sync failed: '+err.message,'error');
              location.reload();
            });
          } else {
            location.reload();
          }
        }
      }catch(err){alert('Failed to parse file: '+err.message);}
    };
    reader.readAsText(file);
  };
  input.click();
}

function clrAll(){if(confirm('Delete ALL data permanently?')){if(confirm('Are you sure — this cannot be undone?')){localStorage.removeItem(SK);location.reload();}}}


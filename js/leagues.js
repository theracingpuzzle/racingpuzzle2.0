// ─── LEAGUES ────────────────────────────────────────────────────────────────
// Social prediction league system.
// Requires these Supabase tables (run once in SQL editor):
//
//   CREATE TABLE leagues (
//     id text PRIMARY KEY,
//     name text NOT NULL,
//     created_by text NOT NULL,
//     invite_code text UNIQUE NOT NULL,
//     scoring text DEFAULT 'stakes',  -- 'wins' or 'stakes'
//     created_at timestamptz DEFAULT now()
//   );
//   ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "leagues_all" ON leagues FOR ALL USING (true) WITH CHECK (true);
//
//   CREATE TABLE league_members (
//     id text PRIMARY KEY,
//     league_id text NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
//     user_id text NOT NULL,
//     display_name text,
//     joined_at timestamptz DEFAULT now(),
//     UNIQUE(league_id, user_id)
//   );
//   ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "lm_all" ON league_members FOR ALL USING (true) WITH CHECK (true);
//
//   CREATE TABLE league_picks (
//     id text PRIMARY KEY,
//     league_id text NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
//     user_id text NOT NULL,
//     pick_date date NOT NULL,
//     horse text NOT NULL,
//     course text,
//     race_time text,
//     odds numeric,
//     result text DEFAULT 'pending',   -- 'win', 'loss', 'pending'
//     returns numeric DEFAULT 0,
//     created_at timestamptz DEFAULT now()
//   );
//   ALTER TABLE league_picks ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "lp_all" ON league_picks FOR ALL USING (true) WITH CHECK (true);

// ─── State ──────────────────────────────────────────────────────────────────
let _lgMyLeagues   = [];   // leagues this user belongs to
let _lgCurrent     = null; // league object being viewed
let _lgMembers     = {};   // { leagueId: member[] }
let _lgPicks       = {};   // { leagueId: pick[] }
let _lgMyPicks     = {};   // { leagueId: pick[] } — own picks only (quick lookup)
let _lgLoaded      = false;
let _lgView        = 'list'; // 'list' | 'detail' | 'create' | 'join' | 'pick'
let _lgPickRaces   = [];   // races available to pick from (shared cache)

// ─── Supabase helpers ────────────────────────────────────────────────────────
async function _lgFetch(path, opts){
  const token=typeof _rpToken==='function'?_rpToken():'';
  const headers={'Content-Type':'application/json',apikey:SUPA_ANON,Prefer:'return=representation'};
  if(token)headers['Authorization']='Bearer '+token;
  const res=await fetch(SUPA_URL+'/rest/v1/'+path,Object.assign({headers},opts||{}));
  if(!res.ok){const e=await res.text();throw new Error(e);}
  const txt=await res.text();
  return txt?JSON.parse(txt):[];
}
function _lgGid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function _lgCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function _lgUid(){return SUPA_USER_ID||'anon';}
function _lgToday(){return typeof td==='function'?td():new Date().toISOString().slice(0,10);}

// ─── Load ────────────────────────────────────────────────────────────────────
async function lgLoad(){
  const uid=_lgUid();
  try{
    // My memberships
    const mems=await _lgFetch('league_members?user_id=eq.'+encodeURIComponent(uid)+'&select=league_id,display_name,joined_at');
    if(!mems.length){_lgMyLeagues=[];_lgLoaded=true;lgRender();return;}
    const ids=mems.map(m=>m.league_id);
    // League details
    const leagues=await _lgFetch('leagues?id=in.('+ids.map(encodeURIComponent).join(',')+')'+'&order=created_at.desc');
    _lgMyLeagues=leagues.map(function(l){
      const m=mems.find(x=>x.league_id===l.id);
      return Object.assign({},l,{myDisplayName:m?m.display_name:'',myMem:m});
    });
    // My picks (all leagues, today)
    const picks=await _lgFetch('league_picks?user_id=eq.'+encodeURIComponent(uid)+'&league_id=in.('+ids.map(encodeURIComponent).join(',')+')'+'&order=created_at.desc');
    _lgMyLeagues.forEach(function(l){
      _lgMyPicks[l.id]=picks.filter(function(p){return p.league_id===l.id;});
    });
    _lgLoaded=true;
    lgRender();
  }catch(e){
    _lgLoaded=true;
    lgRenderError('Could not load leagues. Make sure the Supabase tables are set up — see leagues.js header for SQL.');
  }
}

// Load full detail for a league (all members + all picks)
async function lgLoadDetail(leagueId){
  try{
    const [members,picks]=await Promise.all([
      _lgFetch('league_members?league_id=eq.'+encodeURIComponent(leagueId)+'&order=joined_at.asc'),
      _lgFetch('league_picks?league_id=eq.'+encodeURIComponent(leagueId)+'&order=pick_date.desc,created_at.desc'),
    ]);
    _lgMembers[leagueId]=members;
    _lgPicks[leagueId]=picks;
  }catch(e){console.warn('lgLoadDetail',e);}
}

// ─── Scoring ─────────────────────────────────────────────────────────────────
function _lgCalcScore(picks, scoring){
  if(!picks||!picks.length)return{score:0,wins:0,settled:0};
  const settled=picks.filter(function(p){return p.result==='win'||p.result==='loss';});
  const wins=picks.filter(function(p){return p.result==='win';}).length;
  let score=0;
  if(scoring==='wins'){
    score=wins;
  }else{
    // £1 level stakes
    settled.forEach(function(p){
      if(p.result==='win'){
        const dec=_lgOddsToDecimal(p.odds);
        score+=dec>0?(dec-1):0;
      }else{
        score-=1;
      }
    });
    score=Math.round(score*100)/100;
  }
  return{score,wins,settled:settled.length};
}

function _lgOddsToDecimal(odds){
  if(!odds)return 0;
  const s=String(odds).trim();
  // Already decimal
  if(!s.includes('/'))return parseFloat(s)||0;
  // Fractional e.g. 5/2
  const parts=s.split('/');
  if(parts.length===2){
    const n=parseFloat(parts[0]),d=parseFloat(parts[1]);
    if(d)return Math.round((n/d+1)*100)/100;
  }
  return 0;
}

// ─── Render (main entry) ─────────────────────────────────────────────────────
function lgRender(){
  const el=document.getElementById('lg-inner');
  if(!el)return;
  if(!_lgLoaded){
    el.innerHTML='<div style="padding:40px;text-align:center;color:var(--mut);font-size:13px;">Loading…</div>';
    return;
  }
  if(_lgView==='detail'&&_lgCurrent)  {lgRenderDetail(el);return;}
  if(_lgView==='create')              {lgRenderCreate(el);return;}
  if(_lgView==='join')                {lgRenderJoin(el);return;}
  if(_lgView==='pick')                {lgRenderPick(el);return;}
  lgRenderList(el);
}

function lgRenderError(msg){
  const el=document.getElementById('lg-inner');
  if(!el)return;
  el.innerHTML='<div class="blk" style="text-align:center;">'
    +'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:10px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    +'<div style="font-size:12px;color:var(--mut);line-height:1.6;">'+msg+'</div>'
    +'</div>';
}

// ─── Back button (shared) ─────────────────────────────────────────────────────
function _lgBackBtn(label){
  return '<button onclick="lgBack()" class="btn-refresh" style="display:inline-flex;align-items:center;gap:4px;margin-bottom:14px;">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
    +(label||'Back')
  +'</button>';
}

// ─── Screen 1: My Leagues list ───────────────────────────────────────────────
function lgRenderList(el){
  const SVG_TROPHY='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>';
  let h='';

  // Action buttons row
  h+='<div style="display:flex;gap:8px;margin-bottom:14px;">'
    +'<button onclick="lgShowJoin()" class="btn-refresh" style="flex:1;">Join a League</button>'
    +'<button onclick="lgShowCreate()" style="flex:1;padding:6px 12px;border-radius:8px;border:none;background:#10b981;color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;">+ Create</button>'
  +'</div>';

  if(!_lgMyLeagues.length){
    h+='<div class="blk" style="text-align:center;padding:30px 16px;">'
      +'<div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#10b981;margin-bottom:14px;">'+SVG_TROPHY+'</div>'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:6px;">No leagues yet</div>'
      +'<div style="font-size:12px;color:var(--mut);line-height:1.6;">Create a league or join one with a friend\'s invite code.</div>'
    +'</div>';
  }else{
    h+='<div class="blk" style="padding:0;">';
    _lgMyLeagues.forEach(function(l,idx){
      const myPicks=_lgMyPicks[l.id]||[];
      const todayPicks=myPicks.filter(function(p){return p.pick_date===_lgToday();});
      const allScore=_lgCalcScore(myPicks,l.scoring);
      const scoreVal=l.scoring==='wins'?allScore.wins+' W':(allScore.score>=0?'+':'')+allScore.score.toFixed(2);
      const scoreCol=allScore.score>0?'#10b981':allScore.score<0?'#f87171':'var(--txt)';
      h+='<div onclick="lgOpenLeague(\''+l.id+'\')" style="display:flex;align-items:center;gap:12px;padding:13px 16px;'+(idx?'border-top:1px solid var(--bdr);':'')+'cursor:pointer;">'
        +'<div style="width:36px;height:36px;border-radius:9px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.2);display:flex;align-items:center;justify-content:center;color:#10b981;flex-shrink:0;">'+SVG_TROPHY+'</div>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_lgEsc(l.name)+'</div>'
          +'<div style="font-size:10px;color:var(--mut);margin-top:1px;">'+(l.scoring==='wins'?'Win count':'£1 stakes')+(l.end_date?' · Ends '+_lgFmtDate(l.end_date):'')+(todayPicks.length?' · <span style="color:#10b981;">'+todayPicks.length+' pick'+(todayPicks.length!==1?'s':'')+'</span>':'')+'</div>'
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0;">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:900;color:'+scoreCol+';">'+scoreVal+'</div>'
          +'<div style="font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;">'+(l.scoring==='wins'?'wins':'P&L')+'</div>'
        +'</div>'
        +'<span style="color:var(--mut);font-size:16px;margin-left:2px;">›</span>'
      +'</div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
}

// ─── Screen 2: League Detail ──────────────────────────────────────────────────
async function lgOpenLeague(id){
  _lgCurrent=_lgMyLeagues.find(function(l){return l.id===id;})||null;
  if(!_lgCurrent)return;
  _lgView='detail';
  lgRender();
  await lgLoadDetail(id);
  lgRender();
}

function lgRenderDetail(el){
  const l=_lgCurrent;
  const allPicks=_lgPicks[l.id]||[];
  const members=_lgMembers[l.id]||[];
  const uid=_lgUid();

  const board=members.map(function(m){
    const mp=allPicks.filter(function(p){return p.user_id===m.user_id;});
    const s=_lgCalcScore(mp,l.scoring);
    const todayCount=mp.filter(function(p){return p.pick_date===_lgToday();}).length;
    return{m,mp,s,todayCount,isMe:m.user_id===uid};
  });
  board.sort(function(a,b){
    return l.scoring==='wins'?(b.s.wins-a.s.wins):(b.s.score-a.s.score);
  });

  const myPicks=allPicks.filter(function(p){return p.user_id===uid;});
  const todayPicks=myPicks.filter(function(p){return p.pick_date===_lgToday();});
  const isAdmin=l.created_by===uid;

  let h=_lgBackBtn('Leagues');

  // League info blk
  h+='<div class="blk" style="background:rgba(16,185,129,.05);border-color:rgba(16,185,129,.2);">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">'
      +'<div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:900;letter-spacing:.02em;color:var(--txt);">'+_lgEsc(l.name)+'</div>'
        +'<div style="font-size:10px;color:var(--mut);margin-top:2px;">'+(l.scoring==='wins'?'Win count scoring':'£1 level stakes scoring')+(l.end_date?' · Ends '+_lgFmtDate(l.end_date):'')+'</div>'
        +(_lgIsEnded(l)?'<div style="margin-top:6px;display:inline-flex;align-items:center;gap:5px;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:#f87171;">Competition Ended</div>':'')
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0;">'
        +'<div class="bttl" style="border:none;padding:0;margin-bottom:3px;">Invite</div>'
        +'<div onclick="lgCopyCode(\''+l.invite_code+'\')" style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:900;letter-spacing:.18em;color:#10b981;cursor:pointer;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:7px;padding:3px 9px;">'+l.invite_code+'</div>'
        +'<div style="font-size:9px;color:var(--mut);margin-top:2px;">tap to copy</div>'
      +'</div>'
    +'</div>'
  +'</div>';

  // Today's picks blk
  h+='<div class="blk">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
      +'<div class="bttl" style="border:none;padding:0;margin:0;">Today\'s Picks</div>'
      +(_lgIsEnded(l)
        ?'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mut);">Picks closed</span>'
        :'<button onclick="lgShowPick()" class="btn-refresh" style="color:#10b981;border-color:rgba(16,185,129,.4);">+ Add Pick</button>'
      )
    +'</div>';

  if(!todayPicks.length){
    h+='<div style="padding:12px;border-radius:8px;border:1px dashed var(--bdr);text-align:center;font-size:12px;color:var(--mut);">No picks today — tap Add Pick or use the trophy button on any runner</div>';
  }else{
    h+='<div style="display:flex;flex-direction:column;gap:6px;">';
    todayPicks.forEach(function(p){
      const res=p.result||'pending';
      const resCol=res==='win'?'#10b981':res==='loss'?'#f87171':'var(--mut)';
      const resBg=res==='win'?'rgba(16,185,129,.1)':res==='loss'?'rgba(248,113,113,.1)':'rgba(255,255,255,.04)';
      h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;background:var(--bg);border:1px solid var(--bdr);">'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:13px;font-weight:700;color:var(--txt);">'+_lgEsc(p.horse)+'</div>'
          +'<div style="font-size:10px;color:var(--mut);">'+(p.race_time||'')+(p.course?' · '+p.course:'')+(p.odds?' · '+p.odds:'')+'</div>'
        +'</div>'
        +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+resBg+';color:'+resCol+';">'+res+'</span>'
        +(res==='pending'?'<button onclick="lgRemovePick(\''+p.id+'\',\''+l.id+'\')" style="background:none;border:none;color:var(--mut);font-size:13px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;">✕</button>':'')
      +'</div>';
    });
    h+='</div>';
  }
  h+='</div>';

  // Leaderboard blk
  h+='<div class="blk">';
  h+='<div class="bttl">Leaderboard</div>';
  if(!board.length){
    h+='<div style="font-size:12px;color:var(--mut);text-align:center;padding:12px 0;">No members yet</div>';
  }else{
    board.forEach(function(entry,i){
      const pos=i===0?'1st':i===1?'2nd':i===2?'3rd':(i+1)+'th';
      const scoreDisp=l.scoring==='wins'?entry.s.wins+' W':(entry.s.score>=0?'+':'')+entry.s.score.toFixed(2);
      const scoreCol=entry.s.score>0?'#10b981':entry.s.score<0?'#f87171':'var(--txt)';
      h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 0;'+(i?'border-top:1px solid var(--bdr);':'')+'background:'+(entry.isMe?'transparent':'transparent')+';">'
        +'<div style="width:28px;text-align:center;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:900;color:'+(i<3?'var(--txt)':'var(--mut)')+';flex-shrink:0;">'+pos+'</div>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:13px;font-weight:700;color:var(--txt);">'+_lgEsc(entry.m.display_name||'Member')+(entry.isMe?' <span style="font-size:9px;color:#10b981;font-weight:800;letter-spacing:.04em;">YOU</span>':'')+'</div>'
          +'<div style="font-size:10px;color:var(--mut);">'+entry.s.settled+' settled · '+entry.s.wins+' win'+(entry.s.wins!==1?'s':'')+(entry.todayCount?' · '+entry.todayCount+' today':'')+'</div>'
        +'</div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:900;color:'+scoreCol+';flex-shrink:0;">'+scoreDisp+'</div>'
      +'</div>';
    });
  }
  h+='</div>';

  // Footer action
  h+='<div style="text-align:center;margin-top:4px;">'
    +(isAdmin
      ?'<button onclick="lgDeleteLeague(\''+l.id+'\')" style="font-size:11px;color:var(--mut);background:none;border:none;cursor:pointer;text-decoration:underline;">Delete league</button>'
      :'<button onclick="lgLeaveLeague(\''+l.id+'\')" style="font-size:11px;color:var(--mut);background:none;border:none;cursor:pointer;text-decoration:underline;">Leave league</button>'
    )
  +'</div>';

  el.innerHTML=h;
}

// ─── Screen 3: Create ─────────────────────────────────────────────────────────
function lgShowCreate(){_lgView='create';lgRender();}
function lgRenderCreate(el){
  el.innerHTML=
    _lgBackBtn('Leagues')
    +'<div class="blk">'
      +'<div class="bttl">Create League</div>'
      +'<div class="fg"><label>League Name</label><input id="lg-new-name" type="text" placeholder="e.g. Friday Night Punters" autocomplete="off" style="width:100%;box-sizing:border-box;"></div>'
      +'<div class="fg"><label>Your Display Name</label><input id="lg-new-dname" type="text" placeholder="e.g. Dan" autocomplete="off" style="width:100%;box-sizing:border-box;"></div>'
      +'<div class="fg"><label>End Date <span style="color:var(--mut);font-weight:400;">(optional)</span></label><input id="lg-new-end" type="date" style="width:100%;box-sizing:border-box;"></div>'
      +'<div class="fg"><label>Scoring Method</label>'
        +'<div class="rc-view-tog" style="width:100%;margin-top:4px;">'
          +'<button id="lg-sc-stakes" onclick="lgPickScoring(\'stakes\')" class="rc-view-btn on" style="flex:1;">£1 Stakes</button>'
          +'<button id="lg-sc-wins" onclick="lgPickScoring(\'wins\')" class="rc-view-btn off" style="flex:1;">Win Count</button>'
        +'</div>'
        +'<div style="font-size:11px;color:var(--mut);margin-top:6px;" id="lg-sc-desc">Win at 5/1 = +5pts, loss = −1pt. Rewards value hunting.</div>'
      +'</div>'
      +'<button onclick="lgCreateSubmit()" style="width:100%;padding:11px;border-radius:9px;border:none;background:#10b981;color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin-top:4px;">Create League</button>'
      +'<div id="lg-create-err" style="color:var(--red);font-size:11px;margin-top:8px;text-align:center;"></div>'
    +'</div>';
}

let _lgScoring='stakes';
function lgPickScoring(s){
  _lgScoring=s;
  const sb=document.getElementById('lg-sc-stakes');
  const wb=document.getElementById('lg-sc-wins');
  const desc=document.getElementById('lg-sc-desc');
  if(sb){sb.className='rc-view-btn '+(s==='stakes'?'on':'off');}
  if(wb){wb.className='rc-view-btn '+(s==='wins'?'on':'off');}
  if(desc)desc.textContent=s==='stakes'?'Win at 5/1 = +5pts, loss = −1pt. Rewards value hunting.':'Simply counts your winning picks.';
}

async function lgCreateSubmit(){
  const name=(document.getElementById('lg-new-name')||{value:''}).value.trim();
  const dname=(document.getElementById('lg-new-dname')||{value:''}).value.trim();
  const endDate=(document.getElementById('lg-new-end')||{value:''}).value.trim()||null;
  const errEl=document.getElementById('lg-create-err');
  if(!name){if(errEl)errEl.textContent='Please enter a league name.';return;}
  if(!dname){if(errEl)errEl.textContent='Please enter your display name.';return;}
  const uid=_lgUid();
  const leagueId=_lgGid();
  const code=_lgCode();
  try{
    await _lgFetch('leagues',{method:'POST',body:JSON.stringify({id:leagueId,name,created_by:uid,invite_code:code,scoring:_lgScoring,end_date:endDate})});
    await _lgFetch('league_members',{method:'POST',body:JSON.stringify({id:_lgGid(),league_id:leagueId,user_id:uid,display_name:dname})});
    await lgLoad();
    const l=_lgMyLeagues.find(function(x){return x.id===leagueId;});
    if(l){_lgCurrent=l;_lgView='detail';}
    lgRender();
  }catch(e){
    if(errEl)errEl.textContent='Error creating league: '+(e.message||e);
  }
}

// ─── Screen 4: Join ───────────────────────────────────────────────────────────
function lgShowJoin(){_lgView='join';lgRender();}
function lgRenderJoin(el){
  el.innerHTML=
    _lgBackBtn('Leagues')
    +'<div class="blk">'
      +'<div class="bttl">Join a League</div>'
      +'<div class="fg"><label>Invite Code</label><input id="lg-join-code" type="text" placeholder="ABC123" autocomplete="off" style="width:100%;box-sizing:border-box;text-transform:uppercase;letter-spacing:.15em;font-size:16px;" maxlength="6" oninput="this.value=this.value.toUpperCase()"></div>'
      +'<div class="fg"><label>Your Display Name</label><input id="lg-join-dname" type="text" placeholder="e.g. Dan" autocomplete="off" style="width:100%;box-sizing:border-box;"></div>'
      +'<button onclick="lgJoinSubmit()" style="width:100%;padding:11px;border-radius:9px;border:none;background:#10b981;color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin-top:4px;">Join League</button>'
      +'<div id="lg-join-err" style="color:var(--red);font-size:11px;margin-top:8px;text-align:center;"></div>'
    +'</div>';
}

async function lgJoinSubmit(){
  const code=(document.getElementById('lg-join-code')||{value:''}).value.trim().toUpperCase();
  const dname=(document.getElementById('lg-join-dname')||{value:''}).value.trim();
  const errEl=document.getElementById('lg-join-err');
  if(code.length!==6){if(errEl)errEl.textContent='Please enter a 6-character invite code.';return;}
  if(!dname){if(errEl)errEl.textContent='Please enter your display name.';return;}
  try{
    const leagues=await _lgFetch('leagues?invite_code=eq.'+encodeURIComponent(code));
    if(!leagues.length){if(errEl)errEl.textContent='No league found with that code.';return;}
    const l=leagues[0];
    const uid=_lgUid();
    // Check not already a member
    const existing=await _lgFetch('league_members?league_id=eq.'+encodeURIComponent(l.id)+'&user_id=eq.'+encodeURIComponent(uid));
    if(existing.length){if(errEl)errEl.textContent='You\'re already in this league.';return;}
    await _lgFetch('league_members',{method:'POST',body:JSON.stringify({id:_lgGid(),league_id:l.id,user_id:uid,display_name:dname})});
    await lgLoad();
    const joined=_lgMyLeagues.find(function(x){return x.id===l.id;});
    if(joined){_lgCurrent=joined;_lgView='detail';}
    lgRender();
  }catch(e){
    if(errEl)errEl.textContent='Error joining league: '+(e.message||e);
  }
}

// ─── Screen 5: Pick races ─────────────────────────────────────────────────────
function lgShowPick(){_lgView='pick';lgRender();}

function lgRenderPick(el){
  const l=_lgCurrent;
  // Use shared racecard cache
  const races=(window._todayMeetingsCache&&(window._todayMeetingsCache.racecards||window._todayMeetingsCache.races))||[];
  const todayPicks=(_lgPicks[l.id]||[]).filter(function(p){return p.user_id===_lgUid()&&p.pick_date===_lgToday();});
  const pickedNames=todayPicks.map(function(p){return(p.horse||'').toLowerCase().trim();});

  let h=_lgBackBtn(_lgEsc(l.name));

  if(!races.length){
    h+='<div class="blk" style="text-align:center;padding:30px 16px;font-size:12px;color:var(--mut);">No races loaded yet.<br>Open the Races card first to fetch today\'s cards.</div>';
  }else{
    // Flatten meetings → races
    const flat=[];
    races.forEach(function(meeting){
      const course=meeting.course||meeting.venue||'';
      if(meeting.runners){
        flat.push({race:meeting,course});
      }else{
        (meeting.races||[]).forEach(function(r){flat.push({race:r,course});});
      }
    });
    flat.sort(function(a,b){
      return(typeof timeToMins==='function'?timeToMins:function(t){return 0;})(a.race.off||a.race.time||'')
            -(typeof timeToMins==='function'?timeToMins:function(t){return 0;})(b.race.off||b.race.time||'');
    });

    flat.forEach(function(item){
      const r=item.race;
      const time=r.off||r.off_time||r.time||'—';
      const raceName=r.race_name||r.name||r.title||'Race';
      const runners=(r.runners||r.horses||[]).filter(function(x){return !x.non_runner&&!x.isNonRunner;});
      if(!runners.length)return;
      h+='<div class="blk" style="padding:0;margin-bottom:10px;overflow:hidden;">'
        +'<div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;">'
          +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:900;color:var(--txt);flex-shrink:0;">'+time+'</span>'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-size:12px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+item.course+'</div>'
            +'<div style="font-size:10px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+raceName+'</div>'
          +'</div>'
          +'<span style="color:var(--mut);">›</span>'
        +'</div>'
        +'<div style="display:none;">'
        +runners.map(function(runner){
          const horse=(typeof stripCountrySuffix==='function'?stripCountrySuffix(runner.horse||runner.name||''):runner.horse||runner.name||'');
          const jock=(typeof fmtJockey==='function'?fmtJockey(runner.jockey||''):runner.jockey||'');
          const odds=runner.sp||runner.price||runner.odds||'';
          const isPicked=pickedNames.includes(horse.toLowerCase().trim());
          return'<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid var(--bdr);">'
            +'<div style="flex:1;min-width:0;">'
              +'<div style="font-size:13px;font-weight:700;color:var(--txt);">'+horse+'</div>'
              +'<div style="font-size:10px;color:var(--mut);">'+(jock?'J: '+jock:'')+(odds?' · '+odds:'')+'</div>'
            +'</div>'
            +(isPicked
              ?'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#10b981;">Picked ✓</span>'
              :'<div id="lg-pick-wrap-'+_lgEsc(horse.replace(/\s/g,'_'))+'" style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'
                +'<input id="lg-odds-'+_lgEsc(horse.replace(/\s/g,'_'))+'" type="text" inputmode="decimal" placeholder="Odds" value="'+_lgEsc(odds)+'" style="width:64px;padding:5px 7px;font-size:12px;border-radius:7px;border:1px solid var(--bdr);background:var(--inp);color:var(--txt);text-align:center;">'
                +'<button onclick="lgConfirmPick(\''+l.id+'\',\''+horse.replace(/'/g,"\\'")+'\''+',\''+item.course.replace(/'/g,"\\'")+'\',\''+time+'\',\''+_lgEsc(horse.replace(/\s/g,'_'))+'\')" class="btn-refresh" style="color:#10b981;border-color:rgba(16,185,129,.4);white-space:nowrap;">Pick</button>'
              +'</div>'
            )
          +'</div>';
        }).join('')
        +'</div>'
      +'</div>';
    });
  }

  el.innerHTML=h;
}

// ─── Pick actions ─────────────────────────────────────────────────────────────
function lgConfirmPick(leagueId, horse, course, time, safeKey){
  const inp=document.getElementById('lg-odds-'+safeKey);
  const odds=inp?inp.value.trim():'';
  lgAddPickFromCard(leagueId, horse, course, time, odds);
}

async function lgAddPickFromCard(leagueId, horse, course, time, odds){
  const uid=_lgUid();
  const pick={id:_lgGid(),league_id:leagueId,user_id:uid,pick_date:_lgToday(),horse,course,race_time:time,odds:odds||null,result:'pending',returns:0};
  try{
    await _lgFetch('league_picks',{method:'POST',body:JSON.stringify(pick)});
    // Update local cache
    if(!_lgPicks[leagueId])_lgPicks[leagueId]=[];
    _lgPicks[leagueId].push(pick);
    if(!_lgMyPicks[leagueId])_lgMyPicks[leagueId]=[];
    _lgMyPicks[leagueId].push(pick);
    lgRender();
  }catch(e){alert('Error adding pick: '+(e.message||e));}
}

// Called from racecard runner row (external entry point)
async function lgPickFromRacecard(horse, course, time, odds){
  if(!_lgMyLeagues.length){alert('You\'re not in any leagues yet.');return;}
  // Filter to active leagues only
  const active=_lgMyLeagues.filter(function(l){return !_lgIsEnded(l);});
  if(!active.length){_lgToast('All your leagues have ended.');return;}
  if(active.length===1){
    await lgAddPickFromCard(active[0].id,horse,course,time,odds);
    _lgToast('Picked '+horse+' for '+active[0].name);
    return;
  }
  // Multiple active leagues — show bottom sheet selector
  _lgShowLeaguePicker(horse, course, time, odds, active);
}

function _lgShowLeaguePicker(horse, course, time, odds, leagues){
  // Remove any existing picker
  const old=document.getElementById('lg-picker-sheet');
  if(old)old.remove();

  const sheet=document.createElement('div');
  sheet.id='lg-picker-sheet';
  sheet.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9100;background:var(--sur);border-top:1px solid var(--bdr);border-radius:18px 18px 0 0;padding:0 0 env(safe-area-inset-bottom,0px);box-shadow:0 -4px 24px rgba(0,0,0,.3);';

  let h='<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;">'
    +'<div>'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:900;letter-spacing:.02em;color:var(--txt);">Pick for which league?</div>'
      +'<div style="font-size:11px;color:var(--mut);margin-top:1px;">'+horse+'</div>'
    +'</div>'
    +'<button onclick="document.getElementById(\'lg-picker-sheet\').remove()" style="background:none;border:none;color:var(--mut);font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;">×</button>'
  +'</div>'
  +'<div style="height:1px;background:var(--bdr);margin:0 18px;"></div>';

  leagues.forEach(function(l){
    const myPicks=(_lgMyPicks[l.id]||[]).filter(function(p){return p.pick_date===_lgToday();});
    const alreadyPicked=myPicks.some(function(p){return(p.horse||'').toLowerCase().trim()===(horse||'').toLowerCase().trim();});
    h+='<div onclick="'+( alreadyPicked ? '' : '_lgPickerSelect(\''+l.id+'\',\''+horse.replace(/'/g,"\\'")+'\''+',\''+course.replace(/'/g,"\\'")+'\',\''+time+'\',\''+odds+'\')')+'" '
      +'style="display:flex;align-items:center;gap:12px;padding:13px 18px;cursor:'+(alreadyPicked?'default':'pointer')+';'+(alreadyPicked?'opacity:.5;':'')+'border-top:1px solid var(--bdr);">'
      +'<div style="width:32px;height:32px;border-radius:8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);display:flex;align-items:center;justify-content:center;color:#10b981;flex-shrink:0;">'+SVG_TROPHY+'</div>'
      +'<div style="flex:1;">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;color:var(--txt);">'+_lgEsc(l.name)+'</div>'
        +'<div style="font-size:10px;color:var(--mut);">'+(l.end_date?'Ends '+_lgFmtDate(l.end_date)+' · ':'')+myPicks.length+' pick'+(myPicks.length!==1?'s':'')+'  today</div>'
      +'</div>'
      +(alreadyPicked
        ?'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:#10b981;">Picked ✓</span>'
        :'<span style="color:var(--mut);font-size:18px;">›</span>'
      )
    +'</div>';
  });

  h+='<div style="padding:12px 18px;"><button onclick="document.getElementById(\'lg-picker-sheet\').remove()" style="width:100%;padding:10px;border-radius:9px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;">Cancel</button></div>';

  sheet.innerHTML=h;

  // Backdrop
  const backdrop=document.createElement('div');
  backdrop.id='lg-picker-backdrop';
  backdrop.style.cssText='position:fixed;inset:0;z-index:9099;background:rgba(0,0,0,.4);';
  backdrop.onclick=function(){sheet.remove();backdrop.remove();};

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
}

async function _lgPickerSelect(leagueId, horse, course, time, odds){
  const sheet=document.getElementById('lg-picker-sheet');
  const backdrop=document.getElementById('lg-picker-backdrop');
  if(sheet)sheet.remove();
  if(backdrop)backdrop.remove();
  const l=_lgMyLeagues.find(function(x){return x.id===leagueId;});
  await lgAddPickFromCard(leagueId, horse, course, time, odds);
  _lgToast('Picked '+horse+(l?' for '+l.name:''));
}

function _lgToast(msg){
  let t=document.getElementById('lg-toast');
  if(!t){t=document.createElement('div');t.id='lg-toast';t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:8px 18px;border-radius:20px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.06em;z-index:9000;pointer-events:none;transition:opacity .3s;';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';
  setTimeout(function(){t.style.opacity='0';},2500);
}

async function lgRemovePick(pickId, leagueId){
  try{
    await _lgFetch('league_picks?id=eq.'+encodeURIComponent(pickId),{method:'DELETE'});
    if(_lgPicks[leagueId])_lgPicks[leagueId]=_lgPicks[leagueId].filter(function(p){return p.id!==pickId;});
    if(_lgMyPicks[leagueId])_lgMyPicks[leagueId]=_lgMyPicks[leagueId].filter(function(p){return p.id!==pickId;});
    lgRender();
  }catch(e){alert('Error removing pick.');}
}

// ─── Admin actions ────────────────────────────────────────────────────────────
async function lgDeleteLeague(id){
  if(!confirm('Delete this league and all picks? This cannot be undone.'))return;
  try{
    await _lgFetch('leagues?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
    _lgMyLeagues=_lgMyLeagues.filter(function(l){return l.id!==id;});
    _lgCurrent=null;_lgView='list';
    lgRender();
  }catch(e){alert('Error deleting league.');}
}

async function lgLeaveLeague(id){
  if(!confirm('Leave this league?'))return;
  const uid=_lgUid();
  try{
    await _lgFetch('league_members?league_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(uid),{method:'DELETE'});
    _lgMyLeagues=_lgMyLeagues.filter(function(l){return l.id!==id;});
    _lgCurrent=null;_lgView='list';
    lgRender();
  }catch(e){alert('Error leaving league.');}
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function lgBack(){
  if(_lgView==='detail'){_lgCurrent=null;_lgView='list';}
  else{_lgView='list';}
  lgRender();
}

function lgCopyCode(code){
  if(navigator.clipboard){navigator.clipboard.writeText(code).then(function(){_lgToast('Code copied: '+code);});}
  else{_lgToast(code);}
}

function _lgEsc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _lgFmtDate(d){if(!d)return'';try{const p=d.slice(0,10).split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _lgIsEnded(l){if(!l||!l.end_date)return false;return _lgToday()>l.end_date;}

// ─── Result sync (called from results fetch) ──────────────────────────────────
// Pass in the results array (same format as window._todayResultsCache)
// to auto-settle pending picks
async function lgSyncResults(results){
  if(!results||!results.length||!_lgMyLeagues.length)return;
  const uid=_lgUid();
  const today=_lgToday();
  for(const l of _lgMyLeagues){
    const pending=(_lgMyPicks[l.id]||[]).filter(function(p){return p.pick_date===today&&p.result==='pending';});
    for(const pick of pending){
      const hn=(pick.horse||'').toLowerCase().trim();
      for(const race of results){
        if(race.result==='void')continue;
        const runners=race.runners||race.horses||[];
        const found=runners.find(function(r){
          return(r.horse||r.name||'').toLowerCase().trim()===hn&&(r.position||r.place);
        });
        if(found){
          const pos=parseInt(found.position||found.place)||0;
          const result=pos===1?'win':'loss';
          const dec=_lgOddsToDecimal(pick.odds);
          const returns=result==='win'?dec:0;
          try{
            await _lgFetch('league_picks?id=eq.'+encodeURIComponent(pick.id),{
              method:'PATCH',
              body:JSON.stringify({result,returns}),
            });
            pick.result=result;pick.returns=returns;
          }catch(e){console.warn('lgSyncResults patch',e);}
          break;
        }
      }
    }
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
function lgInit(){
  lgRender();
  // Only hit Supabase on first open — avoids re-fetching on every swipe
  if(!_lgLoaded) lgLoad();
}

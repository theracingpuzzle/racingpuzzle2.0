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

let _lgReactions      = {};   // { pickId: { emoji: [{user_id,display_name}] } }
let _lgActivity       = [];   // activity feed for current league
let _lgActivityLeague = null;
let _lgDetailTab      = 'today'; // 'today' | 'board' | 'history' | 'feed'

// ─── Supabase helpers ────────────────────────────────────────────────────────
async function _lgFetch(path, opts){
  const token=typeof _rpToken==='function'?_rpToken():'';
  const headers={'Content-Type':'application/json',apikey:SUPA_ANON,Prefer:'return=representation'};
  if(token)headers['Authorization']='Bearer '+token;
  // Merge caller headers on top of defaults rather than replacing them
  const mergedOpts=Object.assign({},opts||{});
  if(opts&&opts.headers)mergedOpts.headers=Object.assign({},headers,opts.headers);
  else mergedOpts.headers=headers;
  const res=await fetch(SUPA_URL+'/rest/v1/'+path,mergedOpts);
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
    // Background-load full detail for each league so the list can show position
    Promise.all(_lgMyLeagues.map(function(l){return lgLoadDetail(l.id);})).then(function(){lgRender();}).catch(function(){});
  }catch(e){
    _lgLoaded=true;
    lgRenderError('Could not load leagues. Make sure the Supabase tables are set up — see leagues.js header for SQL.');
  }
}

// Load full detail for a league (all members + last 90 days of picks)
async function lgLoadDetail(leagueId){
  try{
    // 90-day window keeps payload small while covering a full season
    const cutoff=new Date(Date.now()-90*24*60*60*1000).toISOString().slice(0,10);
    const [members,picks]=await Promise.all([
      _lgFetch('league_members?league_id=eq.'+encodeURIComponent(leagueId)+'&order=joined_at.asc'),
      _lgFetch('league_picks?league_id=eq.'+encodeURIComponent(leagueId)+'&pick_date=gte.'+cutoff+'&order=pick_date.desc,created_at.desc'),
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

const SVG_TROPHY='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>';

// ─── Screen 1: My Leagues list ───────────────────────────────────────────────
function lgRenderList(el){
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
      const uid=_lgUid();
      const myPicks=_lgMyPicks[l.id]||[];
      const todayPicks=myPicks.filter(function(p){return p.pick_date===_lgToday();});
      const allScore=_lgCalcScore(myPicks,l.scoring);
      const scoreVal=l.scoring==='wins'?allScore.wins+' W':(allScore.score>=0?'+':'')+allScore.score.toFixed(2);
      const scoreCol=allScore.score>0?'#10b981':allScore.score<0?'#f87171':'var(--txt)';

      // Calculate leaderboard position if we have all members' picks loaded
      let posHtml='';
      const allMembers=_lgMembers[l.id];
      const allPicks=_lgPicks[l.id];
      if(allMembers&&allMembers.length>1&&allPicks){
        const ranked=allMembers.map(function(m){
          const mp=allPicks.filter(function(p){return p.user_id===m.user_id;});
          return{uid:m.user_id,s:_lgCalcScore(mp,l.scoring)};
        }).sort(function(a,b){
          return l.scoring==='wins'?(b.s.wins-a.s.wins):(b.s.score-a.s.score);
        });
        const pos=ranked.findIndex(function(r){return r.uid===uid;})+1;
        const total=ranked.length;
        const posLabel=pos===1?'1st':pos===2?'2nd':pos===3?'3rd':pos+'th';
        const isLast=pos===total;
        const isPodium=pos<=3&&!isLast;
        const posCol=pos===1?'#f59e0b':pos===2?'#9ca3af':pos===3?'#b45309':isLast&&total>1?'#f87171':'var(--mut)';
        const posBg=pos===1?'rgba(245,158,11,.12)':pos===2?'rgba(156,163,175,.1)':pos===3?'rgba(180,83,9,.1)':isLast&&total>1?'rgba(248,113,113,.1)':'var(--sur2)';
        const posBdr=pos===1?'rgba(245,158,11,.4)':pos===2?'rgba(156,163,175,.3)':pos===3?'rgba(180,83,9,.3)':isLast&&total>1?'rgba(248,113,113,.3)':'var(--bdr)';
        posHtml='<div style="display:inline-flex;align-items:center;gap:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:900;letter-spacing:.03em;color:'+posCol+';background:'+posBg+';border:1px solid '+posBdr+';border-radius:7px;padding:2px 9px;margin-top:5px;">'
          +(pos===1?'<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>':'')
          +posLabel+' <span style="font-size:11px;font-weight:700;opacity:.7;">of '+total+'</span>'
        +'</div>';
      }

      h+='<div onclick="lgOpenLeague(\''+l.id+'\')" style="display:flex;align-items:center;gap:12px;padding:15px 16px;'+(idx?'border-top:1px solid var(--bdr);':'')+'cursor:pointer;">'
        +'<div style="width:40px;height:40px;border-radius:10px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.2);display:flex;align-items:center;justify-content:center;color:#10b981;flex-shrink:0;">'+SVG_TROPHY+'</div>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1;">'+_lgEsc(l.name)+'</div>'
          +'<div style="font-size:12px;color:var(--mut);margin-top:2px;">'+(l.scoring==='wins'?'Win count':'£1 stakes')+(l.end_date?' · Ends '+_lgFmtDate(l.end_date):'')+(todayPicks.length?' · <span style="color:#10b981;font-weight:700;">'+todayPicks.length+' pick'+(todayPicks.length!==1?'s':'')+'</span>':'')+'</div>'
          +posHtml
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0;">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:22px;font-weight:900;color:'+scoreCol+';">'+scoreVal+'</div>'
          +'<div style="font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;">'+(l.scoring==='wins'?'wins':'P&L')+'</div>'
        +'</div>'
        +'<span style="color:var(--mut);font-size:18px;margin-left:2px;">›</span>'
      +'</div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
}

// ─── Screen 2: League Detail ──────────────────────────────────────────────────
async function lgRefreshFeed(leagueId){
  const el=document.getElementById('lg-feed-'+leagueId);
  if(el)el.innerHTML='<div style="font-size:12px;color:var(--mut);padding:8px 0;">Loading…</div>';
  await lgLoadActivity(leagueId);
  if(el)el.innerHTML=lgRenderFeed(leagueId);
}

async function lgOpenLeague(id){
  _lgCurrent=_lgMyLeagues.find(function(l){return l.id===id;})||null;
  if(!_lgCurrent)return;
  _lgDetailTab='today';
  _lgView='detail';
  lgRender();
  await lgLoadDetail(id);
  // Load reactions and activity feed in parallel
  await Promise.all([lgLoadReactions(id), lgLoadActivity(id)]);
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
  const SVG_ADMIN_KEY='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5 18 5l3 3-2.5 2.5"/></svg>';

  function lgDetailTab(tab){ _lgDetailTab=tab; lgRender(); }
  window.lgDetailTab=lgDetailTab;

  let h=_lgBackBtn('Leagues');

  // League info blk
  h+='<div class="blk" style="background:rgba(16,185,129,.05);border-color:rgba(16,185,129,.2);">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">'
      +'<div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:22px;font-weight:900;letter-spacing:.02em;color:var(--txt);">'+_lgEsc(l.name)+'</div>'
        +'<div style="font-size:13px;color:var(--mut);margin-top:3px;">'+(l.scoring==='wins'?'Win count scoring':'£1 level stakes scoring')+(l.end_date?' · Ends '+_lgFmtDate(l.end_date):'')+'</div>'
        +(function(){var admin=members.find(function(m){return m.user_id===l.created_by;});return admin?'<div style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--mut);">'+SVG_ADMIN_KEY+'<span>League Admin: <strong style="color:var(--txt);">'+_lgEsc(admin.display_name||'Unknown')+'</strong></span></div>':'';})()
        +(_lgIsEnded(l)?'<div style="margin-top:6px;display:inline-flex;align-items:center;gap:5px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:#f87171;">Competition Ended</div>':'')
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0;">'
        +'<div class="bttl" style="border:none;padding:0;margin-bottom:4px;">Invite Code</div>'
        +'<div onclick="lgCopyCode(\''+l.invite_code+'\')" style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:900;letter-spacing:.2em;color:#10b981;cursor:pointer;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:7px;padding:4px 10px;margin-bottom:6px;">'+l.invite_code+'</div>'
        +'<div style="display:flex;gap:6px;justify-content:flex-end;">'
          +'<button onclick="lgCopyCode(\''+l.invite_code+'\')" style="display:flex;align-items:center;gap:4px;padding:5px 9px;border-radius:7px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:700;letter-spacing:.05em;cursor:pointer;">'
            +'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
            +'Copy'
          +'</button>'
          +'<button onclick="lgShareWhatsApp(\''+_lgEsc(l.name)+'\',\''+l.invite_code+'\')" style="display:flex;align-items:center;gap:4px;padding:5px 9px;border-radius:7px;border:1px solid rgba(37,211,102,.4);background:rgba(37,211,102,.08);color:#25d366;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:700;letter-spacing:.05em;cursor:pointer;">'
            +'<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>'
            +'WhatsApp'
          +'</button>'
        +'</div>'
      +'</div>'
    +'</div>'
  +'</div>';

  // ── Tab bar ──────────────────────────────────────────────────────────────────
  const tabs=[
    {id:'today',label:'Today'},
    {id:'board',label:'Leaderboard'},
    {id:'history',label:'History'},
    {id:'feed',label:'Feed'},
  ];
  const missingOddsCount=(function(){
    const hp=isAdmin?allPicks:allPicks.filter(function(p){return p.user_id===uid;});
    return hp.filter(function(p){return !p.odds&&p.result==='pending';}).length;
  })();
  h+='<div style="display:flex;gap:0;border-radius:10px;overflow:hidden;border:1px solid var(--bdr);margin-bottom:12px;">'
    +tabs.map(function(t){
      const active=_lgDetailTab===t.id;
      const badge=t.id==='history'&&missingOddsCount?'<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#f59e0b;color:#000;font-size:9px;font-weight:900;margin-left:4px;">'+missingOddsCount+'</span>':'';
      return'<button onclick="lgDetailTab(\''+t.id+'\')" style="flex:1;padding:10px 4px;border:none;border-right:'+(t.id!=='feed'?'1px solid var(--bdr)':'none')+';background:'+(active?'var(--navy)':'var(--sur2)')+';color:'+(active?'#fff':'var(--mut)')+';font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:'+(active?'800':'600')+';letter-spacing:.03em;cursor:pointer;transition:background .15s;">'+t.label+badge+'</button>';
    }).join('')
  +'</div>';

  const tab=_lgDetailTab;

  // Today's picks — all members grouped
  const allTodayPicks=allPicks.filter(function(p){return p.pick_date===_lgToday();});
  if(tab==='today') h+='<div class="blk">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
      +'<div class="bttl" style="border:none;padding:0;margin:0;">Today\'s Picks</div>'
      +(_lgIsEnded(l)
        ?'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mut);">Picks closed</span>'
        :'<button onclick="lgShowPick()" class="btn-refresh" style="color:#10b981;border-color:rgba(16,185,129,.4);">+ Add Pick</button>'
      )
    +'</div>';

  if(!allTodayPicks.length){
    h+='<div style="padding:12px;border-radius:8px;border:1px dashed var(--bdr);text-align:center;font-size:12px;color:var(--mut);">No picks yet today</div>';
  }else{
    // Group by member — show each member who has picks today
    members.forEach(function(m, mi){
      const memberPicks=allTodayPicks.filter(function(p){return p.user_id===m.user_id;});
      if(!memberPicks.length)return;
      const isMe=m.user_id===uid;
      h+='<div style="'+(mi>0?'margin-top:10px;border-top:1px solid var(--bdr);padding-top:10px;':'')+'">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'
          +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:800;letter-spacing:.04em;color:'+(isMe?'#10b981':'var(--txt)')+';">'+_lgEsc(m.display_name||'Member')+'</span>'
          +(m.user_id===l.created_by?'<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--mut);background:var(--sur2);border:1px solid var(--bdr);border-radius:4px;padding:1px 6px;">'+SVG_ADMIN_KEY+' League Admin</span>':'')
          +(isMe?'<span style="font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#10b981;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);border-radius:4px;padding:1px 5px;">You</span>':'')
          +'<span style="font-size:12px;color:var(--mut);">'+memberPicks.length+' pick'+(memberPicks.length!==1?'s':'')+'</span>'
        +'</div>'
        +'<div style="display:flex;flex-direction:column;gap:5px;">';
      memberPicks.forEach(function(p){
        const res=p.result||'pending';
        const resCol=res==='win'?'#10b981':res==='loss'?'#f87171':'var(--mut)';
        const resBg=res==='win'?'rgba(16,185,129,.1)':res==='loss'?'rgba(248,113,113,.1)':'rgba(255,255,255,.04)';
        const canEditOdds=(isMe||isAdmin)&&!p.odds;
        const canOverrideOdds=(isMe||isAdmin)&&p.odds;
        h+='<div style="display:flex;flex-direction:column;gap:4px;">'
          +'<div style="display:flex;align-items:center;gap:10px;padding:8px 11px;border-radius:8px;background:var(--bg);border:1px solid '+(canEditOdds?'rgba(245,158,11,.35)':'var(--bdr)')+';'+(canEditOdds?'box-shadow:0 0 0 1px rgba(245,158,11,.15);':'')+'">'
            +'<div style="flex:1;min-width:0;">'
              +'<div style="font-size:16px;font-weight:700;color:var(--txt);">'+_lgEsc(p.horse)+'</div>'
              +'<div style="font-size:12px;color:var(--mut);">'+(p.race_time||'')+(p.course?' · '+p.course:'')+(p.odds?' · <span style="color:var(--gld);font-weight:700;">'+(p.odds_display||p.odds)+'</span>':'<span style="color:#f59e0b;"> · No odds</span>')+'</div>'
            +'</div>'
            +'<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'
              +(canEditOdds||canOverrideOdds?'<div id="lg-odds-edit-'+p.id+'">'
                +'<button onclick="lgShowOddsEdit(\''+p.id+'\',\''+_lgEsc(p.odds_display||p.odds||'')+'\')" style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:6px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.08);color:#f59e0b;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;">'
                  +'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>'
                  +(p.odds?'Edit Odds':'Add Odds')
                +'</button>'
              +'</div>':'')
              +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+resBg+';border:1px solid '+(res==='win'?'rgba(16,185,129,.25)':res==='loss'?'rgba(248,113,113,.25)':'var(--bdr)')+';color:'+resCol+';">'+res+'</span>'
              +(isMe&&res==='pending'?'<button onclick="lgRemovePick(\''+p.id+'\',\''+l.id+'\')" style="background:none;border:none;color:var(--mut);font-size:13px;cursor:pointer;padding:0;line-height:1;" title="Remove pick">✕</button>':'')
            +'</div>'
          +'</div>'
          +'<div id="lg-react-'+p.id+'" style="display:flex;gap:5px;padding:4px 0 2px 2px;">'+_lgReactionBar(p.id,l.id)+'</div>'
        +'</div>';
      });
      h+='</div></div>';
    });
    // Members with no picks today
    const membersWithPicks=new Set(allTodayPicks.map(function(p){return p.user_id;}));
    const noPicks=members.filter(function(m){return !membersWithPicks.has(m.user_id);});
    if(noPicks.length){
      h+='<div style="margin-top:10px;border-top:1px solid var(--bdr);padding-top:10px;display:flex;flex-wrap:wrap;gap:6px;">';
      noPicks.forEach(function(m){
        const isMe=m.user_id===uid;
        h+='<span style="font-size:13px;color:var(--mut);background:var(--bg);border:1px solid var(--bdr);border-radius:6px;padding:3px 8px;">'+_lgEsc(m.display_name||'Member')+(isMe?' (you)':'')+'<span style="margin-left:4px;opacity:.5;">— no pick</span></span>';
      });
      h+='</div>';
    }
  }
  if(tab==='today') h+='</div>';

  // Leaderboard blk
  if(tab==='board'){ h+='<div class="blk">';
  h+='<div class="bttl">Leaderboard</div>';
  if(!board.length){
    h+='<div style="font-size:12px;color:var(--mut);text-align:center;padding:12px 0;">No members yet</div>';
  }else{
    board.forEach(function(entry,i){
      const pos=i===0?'1st':i===1?'2nd':i===2?'3rd':(i+1)+'th';
      const scoreDisp=l.scoring==='wins'?entry.s.wins+' W':(entry.s.score>=0?'+':'')+entry.s.score.toFixed(2);
      const scoreCol=entry.s.score>0?'#10b981':entry.s.score<0?'#f87171':'var(--txt)';
      h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 0;'+(i?'border-top:1px solid var(--bdr);':'')+'background:'+(entry.isMe?'transparent':'transparent')+';">'
        +'<div style="width:32px;text-align:center;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:900;color:'+(i<3?'var(--txt)':'var(--mut)')+';flex-shrink:0;">'+pos+'</div>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:16px;font-weight:700;color:var(--txt);">'+_lgEsc(entry.m.display_name||'Member')+(entry.m.user_id===l.created_by?' <span style="display:inline-flex;align-items:center;vertical-align:middle;color:var(--mut);margin-left:3px;" title="League Admin">'+SVG_ADMIN_KEY+'</span>':'')+(entry.isMe?' <span style="font-size:11px;color:#10b981;font-weight:800;letter-spacing:.04em;">YOU</span>':'')+'</div>'
          +'<div style="font-size:12px;color:var(--mut);">'+entry.s.settled+' settled · '+entry.s.wins+' win'+(entry.s.wins!==1?'s':'')+(entry.todayCount?' · '+entry.todayCount+' today':'')+'</div>'
        +'</div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:900;color:'+scoreCol+';flex-shrink:0;">'+scoreDisp+'</div>'
      +'</div>';
    });
  }
  if(tab==='board') h+='</div>'; }

  // Pick history
  if(tab==='history'){
    const histPicks=isAdmin
      ?allPicks.slice().sort(function(a,b){return b.pick_date<a.pick_date?-1:b.pick_date>a.pick_date?1:0;})
      :allPicks.filter(function(p){return p.user_id===uid;}).sort(function(a,b){return b.pick_date<a.pick_date?-1:b.pick_date>a.pick_date?1:0;});
    const missingOdds=histPicks.filter(function(p){return !p.odds&&p.result==='pending';});
    if(histPicks.length){
      h+='<div class="blk">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
          +'<div class="bttl" style="border:none;padding:0;margin:0;">Pick History</div>'
          +(missingOdds.length?'<span style="font-size:9px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:5px;padding:2px 7px;">'+missingOdds.length+' missing odds</span>':'')
        +'</div>';
      // Group by date
      const byDate={};
      histPicks.forEach(function(p){
        const d=p.pick_date||'Unknown';
        if(!byDate[d])byDate[d]=[];
        byDate[d].push(p);
      });
      Object.keys(byDate).sort(function(a,b){return b<a?-1:b>a?1:0;}).forEach(function(date,di){
        const dateLabel=(function(){try{const p=date.slice(0,10).split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return date;}})();
        h+='<div style="'+(di?'margin-top:10px;border-top:1px solid var(--bdr);padding-top:10px;':'')+'">'
          +'<div style="font-size:12px;font-weight:700;color:var(--mut);letter-spacing:.04em;margin-bottom:6px;">'+dateLabel+'</div>'
          +'<div style="display:flex;flex-direction:column;gap:5px;">';
        byDate[date].forEach(function(p){
          const res=p.result||'pending';
          const resCol=res==='win'?'#10b981':res==='loss'?'#f87171':'var(--mut)';
          const resBg=res==='win'?'rgba(16,185,129,.1)':res==='loss'?'rgba(248,113,113,.1)':'rgba(255,255,255,.04)';
          const needsOdds=res==='pending'&&!p.odds;
          const canEdit=(p.user_id===uid||isAdmin);
          // Find member display name for admin view
          const memberName=isAdmin?(function(){const mb=members.find(function(m){return m.user_id===p.user_id;});return mb?mb.display_name:'';})():'';
          h+='<div style="display:flex;align-items:center;gap:10px;padding:8px 11px;border-radius:8px;background:var(--bg);border:1px solid '+(needsOdds?'rgba(245,158,11,.35)':'var(--bdr)')+';'+(needsOdds?'box-shadow:0 0 0 1px rgba(245,158,11,.12);':'')+'">'
            +'<div style="flex:1;min-width:0;">'
              +'<div style="font-size:16px;font-weight:700;color:var(--txt);">'+_lgEsc(p.horse)+(isAdmin&&memberName?' <span style="font-size:11px;color:var(--mut);font-weight:500;">'+_lgEsc(memberName)+'</span>':'')+'</div>'
              +'<div style="font-size:12px;color:var(--mut);">'+(p.race_time||'')+(p.course?' · '+p.course:'')+(p.odds?' · <span style="color:var(--gld);font-weight:700;">'+(p.odds_display||p.odds)+'</span>':'<span style="color:#f59e0b;"> · No odds</span>')+(res==='win'&&p.returns?' · <span style="color:#10b981;">+'+Number(p.returns).toFixed(2)+'</span>':'')+'</div>'
            +'</div>'
            +'<div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">'
              +(canEdit?'<div id="lg-odds-edit-'+p.id+'">'
                +'<button onclick="lgShowOddsEdit(\''+p.id+'\',\''+_lgEsc(p.odds_display||p.odds||'')+'\')" style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:6px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.08);color:#f59e0b;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;">'
                  +'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>'
                  +(p.odds?'Edit':'Add Odds')
                +'</button>'
              +'</div>':'')
              +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:'+resBg+';border:1px solid '+(res==='win'?'rgba(16,185,129,.25)':res==='loss'?'rgba(248,113,113,.25)':'var(--bdr)')+';color:'+resCol+';">'+res+'</span>'
            +'</div>'
          +'</div>'
          +'<div id="lg-react-'+p.id+'" style="display:flex;gap:5px;padding:4px 0 2px 2px;">'+_lgReactionBar(p.id,l.id)+'</div>';
        });
        h+='</div></div>';
      });
      h+='</div>';
    }
  }

  // Activity feed tab
  if(tab==='feed'){
    h+='<div class="blk">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
        +'<div class="bttl" style="border:none;padding:0;margin:0;">Activity</div>'
        +'<button onclick="lgRefreshFeed(\''+l.id+'\')" style="background:none;border:none;color:var(--mut);font-size:11px;cursor:pointer;padding:2px 6px;border-radius:5px;border:1px solid var(--bdr);">Refresh</button>'
      +'</div>'
      +'<div id="lg-feed-'+l.id+'">'+lgRenderFeed(l.id)+'</div>'
    +'</div>';
  }

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
      +'<button id="lg-create-btn" onclick="lgCreateSubmit()" style="width:100%;padding:11px;border-radius:9px;border:none;background:#10b981;color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin-top:4px;">Create League</button>'
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

function _lgSetBtnLoading(btnId, loading, label){
  const btn=document.getElementById(btnId);
  if(!btn)return;
  if(loading){
    btn.disabled=true;
    btn.style.opacity='0.7';
    btn.style.cursor='not-allowed';
    btn.innerHTML='<span style="display:inline-flex;align-items:center;gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:lg-spin .7s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>'+label+'</span>';
  }else{
    btn.disabled=false;
    btn.style.opacity='';
    btn.style.cursor='pointer';
    btn.textContent=label;
  }
}

async function lgCreateSubmit(){
  const name=(document.getElementById('lg-new-name')||{value:''}).value.trim();
  const dname=(document.getElementById('lg-new-dname')||{value:''}).value.trim();
  const endDate=(document.getElementById('lg-new-end')||{value:''}).value.trim()||null;
  const errEl=document.getElementById('lg-create-err');
  if(!name){if(errEl)errEl.textContent='Please enter a league name.';return;}
  if(!dname){if(errEl)errEl.textContent='Please enter your display name.';return;}
  _lgSetBtnLoading('lg-create-btn', true, 'Creating…');
  if(errEl)errEl.textContent='';
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
    _lgSetBtnLoading('lg-create-btn', false, 'Create League');
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
      +'<button id="lg-join-btn" onclick="lgJoinSubmit()" style="width:100%;padding:11px;border-radius:9px;border:none;background:#10b981;color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin-top:4px;">Join League</button>'
      +'<div id="lg-join-err" style="color:var(--red);font-size:11px;margin-top:8px;text-align:center;"></div>'
    +'</div>';
}

async function lgJoinSubmit(){
  const code=(document.getElementById('lg-join-code')||{value:''}).value.trim().toUpperCase();
  const dname=(document.getElementById('lg-join-dname')||{value:''}).value.trim();
  const errEl=document.getElementById('lg-join-err');
  if(code.length!==6){if(errEl)errEl.textContent='Please enter a 6-character invite code.';return;}
  if(!dname){if(errEl)errEl.textContent='Please enter your display name.';return;}
  _lgSetBtnLoading('lg-join-btn', true, 'Joining…');
  if(errEl)errEl.textContent='';
  try{
    const leagues=await _lgFetch('leagues?invite_code=eq.'+encodeURIComponent(code));
    if(!leagues.length){
      _lgSetBtnLoading('lg-join-btn', false, 'Join League');
      if(errEl)errEl.textContent='No league found with that code.';return;
    }
    const l=leagues[0];
    const uid=_lgUid();
    // Check not already a member
    const existing=await _lgFetch('league_members?league_id=eq.'+encodeURIComponent(l.id)+'&user_id=eq.'+encodeURIComponent(uid));
    if(existing.length){
      _lgSetBtnLoading('lg-join-btn', false, 'Join League');
      if(errEl)errEl.textContent='You\'re already in this league.';return;
    }
    await _lgFetch('league_members',{method:'POST',body:JSON.stringify({id:_lgGid(),league_id:l.id,user_id:uid,display_name:dname})});
    await lgLoad();
    const joined=_lgMyLeagues.find(function(x){return x.id===l.id;});
    if(joined){_lgCurrent=joined;_lgView='detail';}
    lgRender();
  }catch(e){
    _lgSetBtnLoading('lg-join-btn', false, 'Join League');
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
    // Filter to UK/IRE tracks only
    const ukIreTracks=(typeof TKS!=='undefined'?TKS:[]).map(function(t){return t.toLowerCase();});
    const filtered=flat.filter(function(item){
      const c=(item.course||'').toLowerCase().trim();
      return ukIreTracks.some(function(t){return c===t||c.startsWith(t)||t.startsWith(c);});
    });

    filtered.sort(function(a,b){
      return(typeof timeToMins==='function'?timeToMins:function(t){return 0;})(a.race.off||a.race.time||'')
            -(typeof timeToMins==='function'?timeToMins:function(t){return 0;})(b.race.off||b.race.time||'');
    });

    if(!filtered.length){
      h+='<div class="blk" style="text-align:center;padding:30px 16px;font-size:12px;color:var(--mut);">No UK or Irish races available today.<br>Open the Races card to fetch today\'s cards.</div>';
    }

    filtered.forEach(function(item){
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
              :(function(){
                  const isStakes=l.scoring==='stakes';
                  const safeKey=_lgEsc(horse.replace(/\s/g,'_'));
                  const oddsId='lg-odds-'+safeKey;
                  const oddsHint=isStakes
                    ?'<div style="font-size:9px;color:#f59e0b;margin-top:3px;">Odds required for scoring</div>'
                    :'<div style="font-size:9px;color:var(--mut);margin-top:3px;">Optional — for reference</div>';
                  return'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;">'
                    +'<div style="display:flex;align-items:center;gap:6px;">'
                      +'<input id="'+oddsId+'" type="text" inputmode="decimal" placeholder="'+(isStakes?'Odds*':'Odds')+'" value="'+_lgEsc(odds)+'" '
                        +'oninput="lgOddsInputChange(\''+safeKey+'\',\''+l.id+'\','+isStakes+')" '
                        +'style="width:68px;padding:5px 7px;font-size:12px;border-radius:7px;border:1px solid '+(isStakes?'rgba(245,158,11,.5)':'var(--bdr)')+';background:var(--inp);color:var(--txt);text-align:center;">'
                      +'<button id="lg-pick-btn-'+safeKey+'" onclick="lgConfirmPick(\''+l.id+'\',\''+horse.replace(/'/g,"\\'")+'\''+',\''+item.course.replace(/'/g,"\\'")+'\',\''+time+'\',\''+safeKey+'\')" class="btn-refresh" '
                        +'style="color:#10b981;border-color:rgba(16,185,129,.4);white-space:nowrap;"'
                        +'>Pick</button>'
                    +'</div>'
                    +oddsHint
                  +'</div>';
                })()
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
// Enable/disable Pick button as odds field changes (stakes leagues only)
function lgOddsInputChange(safeKey, leagueId, isStakes){
  const inp=document.getElementById('lg-odds-'+safeKey);
  if(!inp)return;
  const hasOdds=inp.value.trim().length>0;
  // Stakes leagues: amber border when empty. Win count: subtle reminder only.
  inp.style.borderColor=hasOdds?'var(--bdr)':(isStakes?'rgba(245,158,11,.6)':'rgba(245,158,11,.3)');
}

function lgConfirmPick(leagueId, horse, course, time, safeKey){
  const inp=document.getElementById('lg-odds-'+safeKey);
  const odds=inp?inp.value.trim():'';
  lgAddPickFromCard(leagueId, horse, course, time, odds);
}

// Inline odds editor for pending picks (own picks or admin editing any pick)
function lgShowOddsEdit(pickId, currentOdds){
  const wrap=document.getElementById('lg-odds-edit-'+pickId);
  if(!wrap)return;
  wrap.innerHTML='<div style="display:flex;align-items:center;gap:5px;">'
    +'<input id="lg-odds-val-'+pickId+'" type="text" inputmode="text" autocomplete="off" placeholder="e.g. 5/2" value="'+_lgEsc(currentOdds||'')+'" style="width:75px;padding:4px 7px;font-size:12px;border-radius:7px;border:1px solid rgba(245,158,11,.5);background:var(--inp);color:var(--txt);text-align:center;" autofocus>'
    +'<button onclick="lgSaveOdds(\''+pickId+'\')" style="padding:4px 9px;border-radius:7px;border:none;background:#10b981;color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Save</button>'
    +'<button onclick="lgCancelOddsEdit(\''+pickId+'\')" style="padding:4px 7px;border-radius:7px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-size:11px;cursor:pointer;">✕</button>'
  +'</div>';
  setTimeout(function(){const i=document.getElementById('lg-odds-val-'+pickId);if(i){i.focus();i.select();}},50);
}

function lgCancelOddsEdit(pickId){
  // Re-render to restore original state
  lgRender();
}

async function lgSaveOdds(pickId){
  const inp=document.getElementById('lg-odds-val-'+pickId);
  if(!inp)return;
  const oddsRaw=inp.value.trim();
  if(!oddsRaw)return;
  const wrap=document.getElementById('lg-odds-edit-'+pickId);
  if(wrap)wrap.innerHTML='<span style="font-size:10px;color:var(--mut);">Saving…</span>';
  try{
    // DB odds column is numeric — convert fractions (5/2) to decimal (3.5) before saving
    const dec=_lgOddsToDecimal(oddsRaw);
    const oddsNum=dec>0?dec:parseFloat(oddsRaw)||null;
    // Find the pick to check if it's a settled win — if so recalculate returns
    let pick=null;
    Object.values(_lgPicks).forEach(function(arr){arr.forEach(function(p){if(p.id===pickId)pick=p;});});
    const dbPatch={odds:oddsNum,odds_display:oddsRaw};
    if(pick&&pick.result==='win'&&oddsNum>0)dbPatch.returns=oddsNum;
    await _lgFetch('league_picks?id=eq.'+encodeURIComponent(pickId),{method:'PATCH',body:JSON.stringify(dbPatch)});

    // Find all other picks for the same horse/date in the same league and apply the same odds
    const matchingIds=[];
    if(pick){
      const normHorse=function(s){return(s||'').replace(/\s*\([^)]+\)\s*$/,'').toLowerCase().trim();};
      const hn=normHorse(pick.horse);
      const lid=pick.league_id;
      (_lgPicks[lid]||[]).forEach(function(p){
        if(p.id!==pickId&&normHorse(p.horse)===hn&&p.pick_date===pick.pick_date&&!p.odds){
          matchingIds.push(p.id);
        }
      });
    }
    // Patch sibling picks in parallel (no odds yet only — don't overwrite intentional different odds)
    await Promise.all(matchingIds.map(function(sid){
      const sibPatch=Object.assign({},dbPatch);
      const sib=Object.values(_lgPicks).reduce(function(f,arr){return f||(arr.find(function(p){return p.id===sid;})||null);},null);
      if(sib&&sib.result==='win'&&oddsNum>0)sibPatch.returns=oddsNum;
      return _lgFetch('league_picks?id=eq.'+encodeURIComponent(sid),{method:'PATCH',body:JSON.stringify(sibPatch)});
    }));

    // Update local cache for this pick and all siblings
    const allIds=new Set([pickId].concat(matchingIds));
    const cachePatch=Object.assign({},dbPatch);
    Object.keys(_lgPicks).forEach(function(lid){
      _lgPicks[lid]=(_lgPicks[lid]||[]).map(function(p){
        if(!allIds.has(p.id))return p;
        const cp=Object.assign({},cachePatch);
        if(p.result==='win'&&oddsNum>0)cp.returns=oddsNum; else delete cp.returns;
        return Object.assign({},p,cp);
      });
    });
    Object.keys(_lgMyPicks).forEach(function(lid){
      _lgMyPicks[lid]=(_lgMyPicks[lid]||[]).map(function(p){
        if(!allIds.has(p.id))return p;
        const cp=Object.assign({},cachePatch);
        if(p.result==='win'&&oddsNum>0)cp.returns=oddsNum; else delete cp.returns;
        return Object.assign({},p,cp);
      });
    });
    const sibCount=matchingIds.length;
    if(typeof _lgToast==='function')_lgToast('Odds saved'+(sibCount?' · applied to '+sibCount+' other pick'+(sibCount>1?'s':''):'')+ ' ✓');
    lgRender();
  }catch(e){
    if(wrap)wrap.innerHTML='<span style="font-size:10px;color:#f87171;">Error — tap to retry</span>';
  }
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
    // Write to activity feed
    const _lga=_lgMyLeagues.find(function(x){return x.id===leagueId;});
    const _lgaMembers=_lgMembers[leagueId]||[];
    const _lgaMe=_lgaMembers.find(function(m){return m.user_id===_lgUid();});
    const _lgaName=_lgaMe?_lgaMe.display_name:'Member';
    lgWriteActivity(leagueId,'pick_made',_lgaName+' picked '+horse+(time?' · '+time:'')+(course?' · '+course:''),pick.id,null);
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
        +'<div style="font-size:10px;color:var(--mut);">'+(l.scoring==='wins'?'Win count':'Stakes P&L')+' · '+(l.end_date?'Ends '+_lgFmtDate(l.end_date)+' · ':'')+myPicks.length+' pick'+(myPicks.length!==1?'s':'')+' today</div>'
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

function lgShareWhatsApp(leagueName, code){
  const appUrl='https://theracingpuzzle.github.io/?join='+code;
  const msg='Join my Racing Puzzle league *'+leagueName+'*! 🏇\n\nTap the link to join instantly:\n'+appUrl;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

// Handle ?join=CODE deep link — auto-open the join screen with code pre-filled
function lgHandleJoinLink(){
  const params=new URLSearchParams(window.location.search);
  const code=params.get('join');
  if(!code)return;
  // Clean the URL so refreshing doesn't retrigger
  window.history.replaceState({},'',window.location.pathname);
  // Wait for app to boot, then navigate to the leagues join screen with code pre-filled
  function _tryOpen(){
    if(typeof lgShowJoin==='function'&&typeof goTo==='function'){
      // Navigate to Leagues card first
      const lgIdx=(typeof CARDS!=='undefined'?CARDS.findIndex(function(c){return c.id==='leagues';}):5);
      if(lgIdx>=0)goTo(lgIdx,true);
      setTimeout(function(){
        lgShowJoin();
        setTimeout(function(){
          const inp=document.getElementById('lg-join-code');
          if(inp){inp.value=code.toUpperCase();}
        },200);
      },400);
    }else{
      setTimeout(_tryOpen,300);
    }
  }
  // Delay until after bootApp has run
  setTimeout(_tryOpen, 2000);
}

function _lgEsc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _lgFmtDate(d){if(!d)return'';try{const p=d.slice(0,10).split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _lgIsEnded(l){if(!l||!l.end_date)return false;return _lgToday()>l.end_date;}

// ─── Result sync (called from results fetch) ──────────────────────────────────
// Pass in the results array (same format as window._todayResultsCache)
// to auto-settle pending picks
async function lgSyncResults(results){
  if(!results||!results.length||!_lgMyLeagues.length)return;
  const today=_lgToday();

  // Strip country suffix e.g. "Arrest (GB)" → "arrest"
  const normHorse=function(s){return(s||'').replace(/\s*\([^)]+\)\s*$/,'').toLowerCase().trim();};

  // Build a flat lookup: horseName → {pos, going, race} from all results
  const resultMap={};
  results.forEach(function(race){
    (race.runners||race.horses||[]).forEach(function(r){
      const hn=normHorse(r.horse||r.name||'');
      if(!hn)return;
      const posRaw=r.position||r.place||'';
      const pos=parseInt(posRaw);
      if(!posRaw||isNaN(pos))return; // no result yet
      if(!resultMap[hn]){
        resultMap[hn]={pos,sp:r.sp||r.starting_price||''};
      }
    });
  });

  if(!Object.keys(resultMap).length)return; // no settled races yet

  for(const l of _lgMyLeagues){
    // Use _lgPicks (all members) not just _lgMyPicks so every member's pick gets settled
    const allPending=(_lgPicks[l.id]||[]).filter(function(p){return p.pick_date===today&&p.result==='pending';});
    for(const pick of allPending){
      const hn=normHorse(pick.horse||'');
      const res=resultMap[hn];
      if(!res)continue;

      const result=res.pos===1?'win':'loss';
      // Use pick odds if set, otherwise fall back to SP from results
      const oddsStr=pick.odds||res.sp||'';
      const dec=_lgOddsToDecimal(oddsStr);
      const returns=result==='win'&&dec>0?dec:0;

      try{
        await _lgFetch('league_picks?id=eq.'+encodeURIComponent(pick.id),{
          method:'PATCH',
          body:JSON.stringify({result,returns,odds:pick.odds||oddsStr||null}),
        });
        // Update local cache so UI reflects immediately without a reload
        pick.result=result;pick.returns=returns;
        if(!pick.odds&&oddsStr)pick.odds=oddsStr;
        // Mirror into _lgMyPicks if it's there too
        Object.keys(_lgMyPicks).forEach(function(lid){
          (_lgMyPicks[lid]||[]).forEach(function(p){
            if(p.id===pick.id){p.result=result;p.returns=returns;if(!p.odds&&oddsStr)p.odds=oddsStr;}
          });
        });
        // Write to activity feed
        const _mem=(_lgMembers[l.id]||[]).find(function(m){return m.user_id===pick.user_id;});
        const _mName=_mem?_mem.display_name:'Member';
        const _actMsg=result==='win'
          ?_mName+'\'s pick '+pick.horse+' WON'+(returns?' · +£'+Number(returns).toFixed(2):'')
          :_mName+'\'s pick '+pick.horse+' lost';
        lgWriteActivity(l.id,result==='win'?'pick_won':'pick_lost',_actMsg,pick.id,null);
      }catch(e){console.warn('lgSyncResults patch',e);}
    }
  }

  // Re-render leagues detail if it's open so standings update immediately
  if(typeof lgRender==='function'&&typeof _lgView!=='undefined'&&_lgView==='detail'){
    lgRender();
  }
  // Show a toast if any picks were settled
  const settledCount=Object.keys(resultMap).length;
  if(settledCount>0&&typeof _lgToast==='function'){
    // Only toast if we actually patched something — check silently
  }
}

// ─── Activity feed ────────────────────────────────────────────────────────────
async function lgWriteActivity(leagueId, type, message, pickId, emoji){
  try{
    const uid=_lgUid();
    const members=_lgMembers[leagueId]||[];
    const me=members.find(function(m){return m.user_id===uid;});
    const displayName=me?me.display_name:'Member';
    await _lgFetch('league_activity',{
      method:'POST',
      headers:{'Prefer':'return=minimal'},
      body:JSON.stringify({
        id:_lgGid(),
        league_id:leagueId,
        user_id:uid,
        display_name:displayName,
        type,
        message,
        pick_id:pickId||null,
        emoji:emoji||null,
        created_at:new Date().toISOString(),
      }),
    });
  }catch(e){console.warn('lgWriteActivity',e);}
}

async function lgLoadActivity(leagueId){
  try{
    const rows=await _lgFetch('league_activity?league_id=eq.'+encodeURIComponent(leagueId)+'&order=created_at.desc&limit=30&select=*');
    _lgActivity=rows||[];
    _lgActivityLeague=leagueId;
  }catch(e){_lgActivity=[];}
}

function lgRenderFeed(leagueId){
  const items=_lgActivityLeague===leagueId?_lgActivity:[];
  if(!items.length) return '<div style="font-size:13px;color:var(--mut);text-align:center;padding:20px 0;">No activity yet — make the first pick!</div>';

  function timeAgo(ts){
    const diff=Math.floor((Date.now()-new Date(ts).getTime())/1000);
    if(diff<60)return 'just now';
    if(diff<3600)return Math.floor(diff/60)+'m ago';
    if(diff<86400)return Math.floor(diff/3600)+'h ago';
    return Math.floor(diff/86400)+'d ago';
  }

  return items.map(function(a,i){
    const isWin=a.type==='pick_won';
    const isLoss=a.type==='pick_lost';
    const isPick=a.type==='pick_made';
    const isReaction=a.type==='reaction';
    const isJoin=a.type==='member_joined';
    const icon=isWin?'✅':isLoss?'❌':isReaction?(a.emoji||'🔥'):isJoin?'👋':'🏇';
    const initials=((a.display_name||'?').slice(0,1)).toUpperCase();
    const avatarCol=_lgMemberColour(a.display_name||'');
    const isMe=a.user_id===_lgUid();
    const msgCol=isWin?'#10b981':isLoss?'#f87171':'var(--txt)';
    const rowBg=isWin?'rgba(16,185,129,.04)':isLoss?'rgba(248,113,113,.04)':'transparent';
    return'<div style="display:flex;align-items:flex-start;gap:12px;padding:11px 0;'+(i>0?'border-top:1px solid var(--bdr);':'')+';background:'+rowBg+'">'
      // Avatar circle with member colour
      +'<div style="width:36px;height:36px;border-radius:50%;background:'+avatarCol+';display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-weight:900;font-size:15px;color:#fff;flex-shrink:0;'+(isMe?'box-shadow:0 0 0 2px #10b981;':'')+'">'+initials+'</div>'
      +'<div style="flex:1;min-width:0;padding-top:2px;">'
        // Event icon + message
        +'<div style="font-size:14px;color:'+msgCol+';line-height:1.45;">'+icon+' '+_lgEsc(a.message||'')+'</div>'
        +'<div style="font-size:11px;color:var(--mut);margin-top:4px;">'+timeAgo(a.created_at)+'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}

// ─── Reactions ────────────────────────────────────────────────────────────────
const LG_EMOJIS = ['💰','💥','🎯','🔥','🏆','👍','😬'];

async function lgLoadReactions(leagueId){
  try{
    // Load reactions for all picks in this league
    const rows=await _lgFetch('league_reactions?league_id=eq.'+encodeURIComponent(leagueId)+'&select=*');
    _lgReactions={};
    (rows||[]).forEach(function(r){
      if(!_lgReactions[r.pick_id])_lgReactions[r.pick_id]={};
      if(!_lgReactions[r.pick_id][r.emoji])_lgReactions[r.pick_id][r.emoji]=[];
      _lgReactions[r.pick_id][r.emoji].push({user_id:r.user_id,display_name:r.display_name});
    });
  }catch(e){console.warn('lgLoadReactions',e);}
}

async function lgReact(pickId, emoji, leagueId){
  const uid=_lgUid();
  if(!_lgReactions[pickId])_lgReactions[pickId]={};
  if(!_lgReactions[pickId][emoji])_lgReactions[pickId][emoji]=[];

  const existing=_lgReactions[pickId][emoji].find(function(r){return r.user_id===uid;});
  if(existing){
    // Toggle off — remove
    _lgReactions[pickId][emoji]=_lgReactions[pickId][emoji].filter(function(r){return r.user_id!==uid;});
    try{
      await _lgFetch('league_reactions?pick_id=eq.'+encodeURIComponent(pickId)+'&user_id=eq.'+encodeURIComponent(uid)+'&emoji=eq.'+encodeURIComponent(emoji),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
    }catch(e){console.warn('lgReact delete',e);}
  } else {
    // Add reaction
    const members=_lgMembers[leagueId]||[];
    const me=members.find(function(m){return m.user_id===uid;});
    const displayName=me?me.display_name:'Member';
    _lgReactions[pickId][emoji].push({user_id:uid,display_name:displayName});
    try{
      await _lgFetch('league_reactions',{
        method:'POST',
        headers:{'Prefer':'return=minimal'},
        body:JSON.stringify({id:_lgGid(),pick_id:pickId,league_id:leagueId,user_id:uid,display_name:displayName,emoji,created_at:new Date().toISOString()}),
      });
      // Write to activity feed
      const pick=(_lgPicks[leagueId]||[]).find(function(p){return p.id===pickId;});
      if(pick){
        const pickMember=members.find(function(m){return m.user_id===pick.user_id;});
        const pickName=pickMember?pickMember.display_name:'Member';
        const msg=displayName+' reacted '+emoji+' to '+pickName+'\'s pick — '+_lgEsc(pick.horse);
        lgWriteActivity(leagueId,'reaction',msg,pickId,emoji);
      }
    }catch(e){console.warn('lgReact add',e);}
  }
  // Re-render just the reaction bar for this pick
  const bar=document.getElementById('lg-react-'+pickId);
  if(bar)bar.innerHTML=_lgReactionBar(pickId,leagueId);
}

function _lgMemberColour(name){
  // Deterministic colour from name for avatar
  const cols=['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#14b8a6'];
  let h=0;for(let i=0;i<(name||'').length;i++)h=(h*31+name.charCodeAt(i))&0xffff;
  return cols[h%cols.length];
}

function _lgReactionBar(pickId, leagueId){
  const uid=_lgUid();
  const reactions=_lgReactions[pickId]||{};
  const hasAny=LG_EMOJIS.some(function(e){return(reactions[e]||[]).length>0;});
  // Show all emojis as small ghosts, highlight ones with reactions
  return'<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">'
    +LG_EMOJIS.map(function(emoji){
      const users=reactions[emoji]||[];
      const iMine=users.some(function(r){return r.user_id===uid;});
      const count=users.length;
      const names=users.map(function(r){return r.display_name||'Member';}).join(', ');
      const active=count>0;
      return'<button onclick="lgReact(\''+pickId+'\',\''+emoji+'\',\''+leagueId+'\')" '
        +'title="'+(names||emoji)+'" '
        +'style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;'
        +'border:1px solid '+(iMine?'rgba(16,185,129,.6)':active?'rgba(255,255,255,.15)':'rgba(255,255,255,.06)')+';'
        +'background:'+(iMine?'rgba(16,185,129,.12)':active?'rgba(255,255,255,.05)':'transparent')+';'
        +'cursor:pointer;font-size:'+(active?'14':'13')+'px;opacity:'+(active?'1':'.4')+';transition:opacity .15s,transform .1s;'
        +'line-height:1;">'
        +emoji
        +(count?'<span style="font-size:11px;font-weight:700;color:'+(iMine?'#10b981':'var(--txt)')+';">'+count+'</span>':'')
      +'</button>';
    }).join('')
  +'</div>';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
function lgInit(){
  lgRender();
  // Only hit Supabase on first open — avoids re-fetching on every swipe
  if(!_lgLoaded) lgLoad();
}

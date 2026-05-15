// ─── RACING API ─── theracingapi.com — direct Basic Auth (GitHub Pages compatible)

const RACING_CREDS_KEY = 'racing-puzzle-api';
const RACING_API_BASE  = 'https://api.theracingapi.com/v1';

function getRacingCreds(){
  try { return JSON.parse(localStorage.getItem(RACING_CREDS_KEY)||'{}'); } catch(e){ return {}; }
}

function saveRacingCreds(){
  const u = document.getElementById('racing-api-user').value.trim();
  const p = document.getElementById('racing-api-pass').value.trim();
  if(!u){ alert('Enter your username (email).'); return; }
  const existing = getRacingCreds();
  const finalPass = p || existing.password || '';
  if(!finalPass){ alert('Enter your password.'); return; }
  localStorage.setItem(RACING_CREDS_KEY, JSON.stringify({username:u, password:finalPass}));
  const st = document.getElementById('racing-api-status');
  if(st){ st.textContent='✓ Saved'; st.style.color='var(--grn)'; }
  setTimeout(()=>{ const el=document.getElementById('racing-api-status'); if(el){el.textContent='';el.style.color='';} }, 3000);
}

// Build Basic Auth header from stored credentials
function _racingAuthHeader(){
  const creds = getRacingCreds();
  if(!creds.username||!creds.password) throw new Error('Racing API credentials not set — go to Command → Settings');
  return 'Basic ' + btoa(creds.username + ':' + creds.password);
}

// Direct fetch to theracingapi.com — no proxy needed
async function callRacingAPI(endpoint, params={}){
  const auth = _racingAuthHeader();
  const qs = Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const resp = await fetch(RACING_API_BASE + '/' + endpoint + qs, {
    method: 'GET',
    headers: { 'Authorization': auth, 'Accept': 'application/json' }
  });
  if(!resp.ok){
    const e = await resp.json().catch(()=>({}));
    throw new Error(e.detail || e.error || 'API error ' + resp.status);
  }
  return await resp.json();
}

async function testRacingAPI(){
  const st = document.getElementById('racing-api-status');
  if(st){ st.innerHTML='<div style="font-family:monospace;font-size:11px;color:var(--mut);">Testing…</div>'; }
  const creds = getRacingCreds();
  const lines = ['User: '+(creds.username||'EMPTY'), 'Pass: '+(creds.password ? creds.password.length+' chars' : 'EMPTY'), '---'];
  const tests = [
    {label:'racecards/free (today)',   endpoint:'racecards/free'},
    {label:'racecards/tomorrow/free',  endpoint:'racecards/tomorrow/free'},
    {label:'results/today/free',       endpoint:'results/today/free'},
  ];
  for(const t of tests){
    try {
      const auth = _racingAuthHeader();
      const resp = await fetch(RACING_API_BASE + '/' + t.endpoint, {
        headers: { 'Authorization': auth, 'Accept': 'application/json' }
      });
      const data = await resp.json().catch(()=>({}));
      if(resp.ok){
        const cnt = (data.racecards||data.results||data.races||[]).length;
        lines.push('✓ '+t.label+' — '+cnt+' items');
      } else {
        lines.push('✗ '+t.label+' — '+resp.status+' '+(data.detail||data.error||''));
      }
    } catch(e){ lines.push('✗ '+t.label+' — '+e.message); }
  }
  if(st){
    st.innerHTML = lines.map(l =>
      '<div style="font-size:10px;font-family:monospace;line-height:1.8;color:'
      +(l.startsWith('✓')?'var(--grn)':l.startsWith('✗')?'var(--red)':'var(--mut)')+';">'+l+'</div>'
    ).join('');
  }
}

async function searchHorse(query, targetEl, onSelect){
  if(!query||query.length<2) return;
  if(targetEl) targetEl.innerHTML='<div style="color:var(--mut);font-size:13px;padding:8px;">Searching today\'s cards…</div>';
  const q = query.toLowerCase();
  try {
    const today = new Date().toISOString().slice(0,10);
    const data  = await callRacingAPI('racecards/free', {});
    const matches = [];
    const races = data.racecards || data.races || [];
    races.forEach(function(race){
      (race.runners||race.horses||[]).forEach(function(runner){
        const name = (runner.horse||runner.name||'').toLowerCase();
        if(name.includes(q)){
          matches.push({
            name:      runner.horse||runner.name,
            trainer:   runner.trainer||runner.trainerName||'',
            jockey:    runner.jockey||runner.jockeyName||'',
            age:       runner.age||'',
            rpr:       runner.rpr||runner.officialRating||'',
            course:    race.course||race.venue||'',
            raceTime:  race.time||race.off||'',
            raceName:  race.race_name||race.name||race.title||'',
            raceDate:  today,
            going:     race.going||''
          });
        }
      });
    });
    if(!matches.length){
      if(targetEl) targetEl.innerHTML='<div style="color:var(--mut);font-size:13px;padding:8px 0;">Not running today — enter details manually or check a future racecard date.</div>';
      return;
    }
    if(targetEl){
      targetEl.innerHTML = matches.map(function(m,i){
        return '<div class="mb" data-idx="'+i+'" style="cursor:pointer;margin-bottom:6px;">'
          +'<div class="mbl"><div class="mh" style="font-size:14px;">'+m.name+'</div>'
          +'<div class="mm">'+m.raceName+(m.course?' · '+m.course:'')+(m.raceTime?' · '+m.raceTime:'')+(m.trainer?' · '+m.trainer:'')+(m.jockey?' · '+m.jockey:'')+'</div></div>'
          +'<div class="mbr" style="font-family:monospace;font-size:10px;color:var(--mut);">Use →</div></div>';
      }).join('');
      targetEl.querySelectorAll('[data-idx]').forEach(function(el){
        const m = matches[parseInt(el.getAttribute('data-idx'))];
        el.addEventListener('click', function(){ if(onSelect) onSelect(m); targetEl.innerHTML=''; });
      });
    }
  } catch(e){
    if(targetEl) targetEl.innerHTML='<div style="color:var(--red);font-size:13px;padding:8px 0;">'+e.message+'</div>';
  }
}

function clearRacingCreds(){
  localStorage.removeItem(RACING_CREDS_KEY);
  const u  = document.getElementById('racing-api-user');
  const p  = document.getElementById('racing-api-pass');
  const st = document.getElementById('racing-api-status');
  if(u) u.value='';
  if(p) p.value='';
  if(st){ st.textContent='Cleared — enter credentials and save'; st.style.color='var(--gld)'; }
}

function loadRacingCredsFields(){
  const c  = getRacingCreds();
  const u  = document.getElementById('racing-api-user');
  const st = document.getElementById('racing-api-status');
  if(u) u.value = c.username||'';
  if(st && c.password){
    if(c.password.includes('•')){
      st.textContent='⚠️ Password corrupted — tap Clear & Reset';
      st.style.color='var(--red)';
    } else {
      st.textContent='✓ Password saved';
      st.style.color='var(--grn)';
    }
  }
}

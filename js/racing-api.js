// ─── RACING API ───
const RACING_CREDS_KEY='racing-puzzle-api';

function getRacingCreds(){
  try{return JSON.parse(localStorage.getItem(RACING_CREDS_KEY)||'{}');}catch(e){return {};}
}

function saveRacingCreds(){
  const u=document.getElementById('racing-api-user').value.trim();
  const p=document.getElementById('racing-api-pass').value.trim();
  if(!u){alert('Enter your username (email).');return;}
  const existing=getRacingCreds();
  // If password field shows bullets (masked), keep the existing password
  const finalPass=(p&&!p.startsWith('•'))?p:existing.password||'';
  if(!finalPass){alert('Enter your password.');return;}
  localStorage.setItem(RACING_CREDS_KEY,JSON.stringify({username:u,password:finalPass}));
  const st=document.getElementById('racing-api-status');
  if(st){st.textContent='✓ Saved';st.style.color='var(--grn)';}
  setTimeout(()=>{const el=document.getElementById('racing-api-status');if(el){el.textContent='';el.style.color='';}},3000);
}

async function callRacingAPI(endpoint, params={}){
  const creds=getRacingCreds();
  if(!creds.username||!creds.password)throw new Error('Racing API credentials not set — go to Command → Settings');
  const resp=await fetch('https://racing-proxy.theracingpuzzle.workers.dev',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({type:'racing',username:creds.username,password:creds.password,endpoint,params})
  });
  if(!resp.ok){const e=await resp.json().catch(()=>({}));throw new Error(e.error||'API error '+resp.status);}
  return await resp.json();
}

async function testRacingAPI(){
  const st=document.getElementById('racing-api-status');
  if(st){st.innerHTML='<div style="font-family:monospace;font-size:11px;color:var(--mut);">Testing…</div>';}
  const creds=getRacingCreds();
  const today=new Date().toISOString().slice(0,10);
  const lines=['User: '+(creds.username||'EMPTY'),'Pass: '+(creds.password?creds.password.length+' chars':'EMPTY'),'---'];
  const tests=[
    {label:'racecards/free (today)',endpoint:'racecards/free',params:{}},
    {label:'racecards/tomorrow/free',endpoint:'racecards/tomorrow/free',params:{}},
    {label:'results/today/free',endpoint:'results/today/free',params:{}},
  ];
  for(const t of tests){
    try{
      const resp=await fetch('https://racing-proxy.theracingpuzzle.workers.dev',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'racing',username:creds.username,password:creds.password,endpoint:t.endpoint,params:t.params})});
      const data=await resp.json().catch(()=>({}));
      if(resp.status===200){
        const cnt=(data.racecards||data.results||data.races||[]).length;
        lines.push('✓ '+t.label+' — '+cnt+' items');
      } else {
        lines.push('✗ '+t.label+' — '+resp.status+' '+(data.detail||data.error||''));
      }
    }catch(e){lines.push('✗ '+t.label+' — '+e.message);}
  }
  if(st){st.innerHTML=lines.map(l=>'<div style="font-size:10px;font-family:monospace;line-height:1.8;color:'+(l.startsWith('✓')?'var(--grn)':l.startsWith('✗')?'var(--red)':'var(--mut)')+';">'+l+'</div>').join('');}
}

async function searchHorse(query, targetEl, onSelect){
  if(!query||query.length<2)return;
  if(targetEl)targetEl.innerHTML='<div style="color:var(--mut);font-size:13px;padding:8px;">Searching today\'s cards…</div>';
  const q=query.toLowerCase();
  try{
    // Use today's racecards — available on all plans
    const today=new Date().toISOString().slice(0,10);
    const data=await callRacingAPI('racecards/free',{});
    
    // Flatten all runners across all races and find matches
    const matches=[];
    const races=(data.racecards||data.races||[]);
    races.forEach(function(race){
      const runners=race.runners||race.horses||[];
      runners.forEach(function(runner){
        const name=(runner.horse||runner.name||'').toLowerCase();
        if(name.includes(q)){
          matches.push({
            name: runner.horse||runner.name,
            trainer: runner.trainer||runner.trainerName||'',
            jockey: runner.jockey||runner.jockeyName||'',
            age: runner.age||'',
            rpr: runner.rpr||runner.officialRating||'',
            course: race.course||race.venue||'',
            raceTime: race.time||race.off||'',
            raceName: race.race_name||race.name||race.title||'',
            raceDate: today,
            going: race.going||''
          });
        }
      });
    });

    if(!matches.length){
      // No match in today's cards - show helpful message
      if(targetEl)targetEl.innerHTML='<div style="color:var(--mut);font-size:13px;padding:8px 0;">Not running today — enter details manually or check a future racecard date.</div>';
      return;
    }

    if(targetEl){
      targetEl.innerHTML=matches.map(function(m,i){
        return'<div class="mb" data-idx="'+i+'" style="cursor:pointer;margin-bottom:6px;">'
          +'<div class="mbl"><div class="mh" style="font-size:14px;">'+m.name+'</div>'
          +'<div class="mm">'+m.raceName+(m.course?' · '+m.course:'')+(m.raceTime?' · '+m.raceTime:'')+(m.trainer?' · '+m.trainer:'')+(m.jockey?' · '+m.jockey:'')+'</div></div>'
          +'<div class="mbr" style="font-family:monospace;font-size:10px;color:var(--mut);">Use →</div></div>';
      }).join('');
      targetEl.querySelectorAll('[data-idx]').forEach(function(el){
        const m=matches[parseInt(el.getAttribute('data-idx'))];
        el.addEventListener('click',function(){if(onSelect)onSelect(m);targetEl.innerHTML='';});
      });
    }
  }catch(e){
    if(targetEl)targetEl.innerHTML='<div style="color:var(--red);font-size:13px;padding:8px 0;">'+e.message+'</div>';
  }
}

function clearRacingCreds(){
  localStorage.removeItem(RACING_CREDS_KEY);
  const u=document.getElementById('racing-api-user');
  const p=document.getElementById('racing-api-pass');
  const st=document.getElementById('racing-api-status');
  if(u)u.value='';
  if(p)p.value='';
  if(st){st.textContent='Cleared — enter credentials and save';st.style.color='var(--gld)';}
}

function loadRacingCredsFields(){
  const c=getRacingCreds();
  // If found in D.settings but not localStorage, cache locally now
  if(c.username&&c.password&&!localStorage.getItem(RACING_CREDS_KEY)){
    localStorage.setItem(RACING_CREDS_KEY,JSON.stringify(c));
  }
  const u=document.getElementById('racing-api-user');
  const p=document.getElementById('racing-api-pass');
  const st=document.getElementById('racing-api-status');
  if(u)u.value=c.username||'';
  // Pre-fill password field masked so user can see it's set
  if(p&&c.password)p.value='••••••••';
  if(st){
    if(!c.username&&!c.password){
      st.textContent='No credentials saved';
      st.style.color='var(--mut)';
    } else if(c.password&&c.password.includes('•')){
      st.textContent='⚠️ Password corrupted — re-enter and save';
      st.style.color='var(--red)';
    } else {
      st.textContent='✓ Credentials saved';
      st.style.color='var(--grn)';
    }
  }
}


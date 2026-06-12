// ─── COACH ─── AI coach card, API key, usage tracking

// ─── AI USAGE TRACKING ───
const AI_USAGE_KEY='racing-puzzle-ai-usage';

function getAIUsage(){
  try{
    const s=JSON.parse(localStorage.getItem(AI_USAGE_KEY)||'{}');
    if(s.date!==td())return{date:td(),calls:0,blocked:0};
    return s;
  }catch(e){return{date:td(),calls:0,blocked:0};}
}

function trackAIUsage(){
  const usage=getAIUsage();
  usage.calls=(usage.calls||0)+1;
  localStorage.setItem(AI_USAGE_KEY,JSON.stringify(usage));
  updateAIUsageDisplay();
}

function getAIDailyLimit(){
  return parseInt(localStorage.getItem('racing-puzzle-ai-limit')||'10');
}

function checkAILimit(){
  const usage=getAIUsage();
  const limit=getAIDailyLimit();
  if(usage.calls>=limit){
    alert('Daily AI limit reached ('+limit+' calls).\n\nYou can increase this in Command → Settings → Coach.');
    return false;
  }
  return true;
}

function updateAIUsageDisplay(){
  const usage=getAIUsage();
  const limit=getAIDailyLimit();
  const el=document.getElementById('ai-usage-display');
  if(el){
    const pct=Math.min(100,Math.round(usage.calls/limit*100));
    const col=pct>=90?'var(--red)':pct>=70?'var(--gld)':'var(--grn)';
    el.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">'
      +'<span style="font-size:12px;color:var(--mut);">Today: <strong style="color:'+col+';">'+usage.calls+' / '+limit+' calls</strong></span>'
      +'<span style="font-size:11px;color:var(--mut);">~£'+(usage.calls*0.003).toFixed(3)+' est.</span>'
      +'</div>'
      +'<div style="height:5px;background:var(--sur2);border-radius:3px;overflow:hidden;">'
        +'<div style="height:100%;width:'+pct+'%;background:'+col+';border-radius:3px;transition:width .3s;"></div>'
      +'</div>';
  }
}

let coachHistory = [];

function getApiKey(){
  return localStorage.getItem(COACH_KEY_STORE)||(D.settings&&D.settings.apiKey)||'';
}

function buildCoachContext(){
  const settled = D.bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr');
  const staked = settled.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
  const returns = settled.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
  const pnlTotal = returns - staked;
  const roi = staked>0?(pnlTotal/staked*100):0;
  const wins = settled.filter(b=>b.result==='win').length;
  const sr = settled.length>0?(wins/settled.length*100):0;
  const todayBets = D.bets.filter(b=>b.date===td());
  const todayPnl = todayBets.filter(b=>b.result&&b.result!=='pending').reduce((a,b)=>a+(pnl(b)||0),0);
  const recent = [...D.bets].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5);
  const recentStr = recent.map(b=>`${b.horse} @ ${b.oddsDisplay||b.odds} (${b.result||'pending'}${b.result!=='pending'?' '+fmt(pnl(b)||0):''})`).join(', ');
  const consecutiveLosses = (()=>{
    const s=[...D.bets].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    let n=0;for(const b of s){if(b.result==='loss')n++;else if(b.result&&b.result!=='pending')break;}return n;
  })();
  const rules = (D.rules||[]).slice(0,5).join(' | ');
  return `You are a strict but fair professional horse racing betting coach. Your job is to keep the punter disciplined, profitable, and honest with themselves.

PUNTER'S CURRENT DATA:
- Bank: starting £${D.bank.start||0}, current £${D.bank.current||0} (${D.bank.start?((((D.bank.current||0)/(D.bank.start||1))*100)-100).toFixed(1)+'%':'not set'})
- All-time P&L: ${fmt(pnlTotal)} from ${settled.length} settled bets
- ROI: ${roi.toFixed(1)}%, Strike rate: ${sr.toFixed(0)}%
- Today: ${todayBets.length} bets, P&L ${fmt(todayPnl)}
- Consecutive losses: ${consecutiveLosses}
- Recent bets: ${recentStr||'none'}
- Their rules: ${rules||'none set'}
- Daily bet limit: ${D.settings&&D.settings.dailyLimit?D.settings.dailyLimit:5}

YOUR COACHING STYLE:
- Be direct, honest and firm. Don't sugarcoat bad patterns.
- If they're chasing losses, call it out plainly.
- If they're doing well, acknowledge it but keep them grounded.
- Reference their actual data when relevant (bank, recent bets, P&L).
- Keep responses concise — 2-4 sentences max unless they ask for detail.
- You know horse racing well: form study, handicaps, value betting, staking discipline.
- Never encourage reckless betting. Always steer toward process over outcome.
- If they ask about a specific horse or race, help them think through the decision logically.
- Sign off occasionally as "The Coach" but don't overdo it.`;
}

const QUICK_PROMPTS = [
  {lbl:'Should I bet?', msg:'Based on my current stats and today so far, should I be placing a bet right now?'},
  {lbl:'Check my discipline', msg:'Honestly assess my discipline and betting patterns based on my recent data.'},
  {lbl:'How\'s my bank?', msg:'How is my bank looking and what should my stake sizes be right now?'},
  {lbl:'I\'m on a losing run', msg:'I\'ve had a few losers in a row. What should I do?'},
  {lbl:'Feeling impulsive', msg:'I\'m feeling like I want to back something just to have a bet. Talk me out of it or through it.'},
];

function renderCoachCard(){
  const key = getApiKey();
  const warnEl = document.getElementById('coach-key-warn');
  if(warnEl) warnEl.style.display = key ? 'none' : 'block';

  // Quick prompts
  const qEl = document.getElementById('coach-quick');
  if(qEl && !qEl.children.length){
    qEl.innerHTML = QUICK_PROMPTS.map((p,i)=>
      '<button onclick="sendQuick('+i+')" style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:5px 11px;border-radius:16px;border:1px solid var(--bdr);background:var(--sur);color:var(--navy);cursor:pointer;white-space:nowrap;">'+p.lbl+'</button>'
    ).join('');
  }

  // Morning brief — show button if not done today, don't auto-fire
  if(coachHistory.length === 0 && key){
    const lastBriefDate = localStorage.getItem('re-brief-date');
    if(lastBriefDate !== td()){
      // Show "Get briefing" button instead of auto-calling
      const msgsEl2 = document.getElementById('coach-msgs');
      if(msgsEl2) msgsEl2.innerHTML = '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:14px;font-size:14px;line-height:1.7;color:var(--txt);">'
        +'<strong style="color:var(--navy);">Good '+( new Date().getHours()<12?'morning':'afternoon')+'. Coach ready.</strong><br><br>'
        +'<button onclick="autoMorningBrief()" style="margin-top:8px;padding:10px 18px;border-radius:10px;border:1px solid var(--bdr);background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;">📋 Get Daily Briefing</button>'
        +'<div style="margin-top:8px;font-size:11px;color:var(--mut);">Uses 1 AI call (~1,300 tokens)</div>'
        +'</div>';
      return;
    }
  }

  // Show welcome if still no messages
  const msgsEl = document.getElementById('coach-msgs');
  if(msgsEl && !msgsEl.children.length){
    const hasKey = !!key;
    if(!hasKey){
      msgsEl.innerHTML = '<div style="text-align:center;padding:28px 16px;">'
        +'<div style="font-size:36px;margin-bottom:12px;">🤖</div>'
        +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:16px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:8px;">Coach needs an API key</div>'
        +'<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:8px;">The Coach uses your own Claude API key to give you a personalised daily briefing, analyse your betting patterns, and answer questions about your data.</div>'
        +'<div style="font-size:12px;color:var(--mut);line-height:1.6;margin-bottom:18px;">Get a free key at <a href="https://console.anthropic.com" target="_blank" style="color:var(--gld2);text-decoration:none;">console.anthropic.com</a> — the Coach is very token-efficient.</div>'
        +'<button onclick="navTo(\'settings\')" style="padding:10px 22px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">Add API Key in Settings →</button>'
        +'</div>';
    } else {
      msgsEl.innerHTML = '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:14px;font-size:14px;line-height:1.7;color:var(--txt);">'
        +'<strong style="color:var(--navy);">The Coach is ready.</strong><br><br>'
        +'Tap a quick prompt below to get started.'
        +'</div>';
    }
  }
}

async function autoMorningBrief(){
  const msgsEl = document.getElementById('coach-msgs');
  if(!msgsEl) return;

  // Mark today as briefed
  localStorage.setItem('re-brief-date', td());

  const typing = appendCoachMsg('coach', '⟳ Generating your morning briefing…', true);

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const ydStr = yesterday.toISOString().slice(0,10);
  const ydBets = D.bets.filter(b=>b.date===ydStr);
  const ydPnl = ydBets.filter(b=>b.result&&b.result!=='pending').reduce((a,b)=>a+(pnl(b)||0),0);
  const ydSettled = ydBets.filter(b=>b.result&&b.result!=='pending').length;
  const todayTracks = getTracks();
  const todayLimit = D.settings&&D.settings.dailyLimit?D.settings.dailyLimit:5;
  const bankHealth = D.bank.start ? (((D.bank.current||0)/(D.bank.start||1))*100).toFixed(0) : null;

  const briefPrompt = 'Give me my morning racing briefing. Keep it to 4-5 lines max. '
    +'Cover: (1) a one-line bank status, (2) yesterday in one line ('
    +(ydSettled>0 ? ydSettled+' bets, P&L '+fmt(ydPnl) : 'no bets logged')
    +'), (3) one sharp piece of advice for today based on my patterns and data. '
    +'Be direct. No fluff. End with one practical focus for today.';

  coachHistory = [{role:'user', content: briefPrompt}];

  try{
    const key = getApiKey();
    trackAIUsage();
    const res = await fetch('/.netlify/functions/api', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        type:'coach',
        apiKey: getApiKey(),
        model:'claude-sonnet-4-20250514',
        max_tokens:300,
        system: buildCoachContext(),
        messages: coachHistory
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || '(no response)';
    if(typing) typing.remove();
    appendCoachMsg('coach', reply);
    coachHistory.push({role:'assistant', content: reply});
  } catch(e){
    if(typing) typing.remove();
    appendCoachMsg('coach', 'Morning briefing unavailable — '+e.message);
    coachHistory = [];
  }
}

function sendQuick(i){ document.getElementById('coach-inp').value = QUICK_PROMPTS[i].msg; sendCoach(); }

async function sendCoach(){
  if(!checkAILimit())return;
  const inp = document.getElementById('coach-inp');
  const msg = inp.value.trim();
  if(!msg) return;

  const key = getApiKey();
  if(!key){
    appendCoachMsg('coach','⚠️ Add your Anthropic API key in Command → Settings to use the Coach.');
    return;
  }

  inp.value = '';
  appendCoachMsg('user', msg);
  coachHistory.push({role:'user', content: msg});

  const typing = appendCoachMsg('coach', '…', true);

  try{
    trackAIUsage();
    const res = await fetch('/.netlify/functions/api', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        type:'coach',
        apiKey: getApiKey(),
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        system: buildCoachContext(),
        messages: coachHistory
      })
    });

    if(!res.ok){
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error?.message || 'API error '+res.status);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text || '(no response)';
    if(typing) typing.remove();
    appendCoachMsg('coach', reply);
    coachHistory.push({role:'assistant', content: reply});
    // Keep history short to save tokens
    if(coachHistory.length > 20) coachHistory = coachHistory.slice(-20);

  } catch(e){
    if(typing) typing.remove();
    appendCoachMsg('coach', '⚠️ Error: ' + e.message);
  }
}

function appendCoachMsg(role, text, isTyping=false){
  const el = document.getElementById('coach-msgs');
  if(!el) return null;
  const div = document.createElement('div');
  const isUser = role==='user';
  div.style.cssText = `display:flex;justify-content:${isUser?'flex-end':'flex-start'};`;
  const bubble = document.createElement('div');
  bubble.style.cssText = `max-width:85%;padding:10px 13px;border-radius:${isUser?'14px 14px 4px 14px':'14px 14px 14px 4px'};font-size:14px;line-height:1.6;`
    + (isUser
      ? 'background:var(--navy);border:1px solid var(--navy);color:#fff;'
      : 'background:var(--sur);border:1px solid var(--bdr);color:var(--txt);');
  bubble.textContent = text;
  if(isTyping) bubble.style.color = 'var(--mut)';
  div.appendChild(bubble);
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  return div;
}

function clearCoach(){
  coachHistory = [];
  const el = document.getElementById('coach-msgs');
  if(el) el.innerHTML = '';
  renderCoachCard();
}

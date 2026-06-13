// ─── UTILS ─── formatting, odds, returns

function fmt(n){const v=parseFloat(n)||0;return(v>=0?'+':'')+'£'+Math.abs(v).toFixed(2);}
// Ensures a space between jockey name and apprentice claim e.g. "J.Smith(5)" → "J.Smith (5)"
function fmtJockey(j){return(j||'—').replace(/([a-zA-Z])\(/g,'$1 (');}
function fp(n){return'£'+(parseFloat(n)||0).toFixed(2);}

function fo(s){if(!s)return 0;s=String(s).trim().toUpperCase().replace(/\s/g,'');if(s==='EVS'||s==='EVENS'||s==='1/1')return 2;const m=s.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);if(m){const n=parseFloat(m[1]),d=parseFloat(m[2]);return d>0?parseFloat((n/d+1).toFixed(4)):0;}const n=parseFloat(s);return isNaN(n)?0:n;}
function dOdds(s){return s?s:'—';}

function pnl(b){if(!b.result||b.result==='pending')return null;if(b.result==='void'||b.result==='nr')return 0;const outlay=parseFloat(b.stake)||0;return(parseFloat(b.returns)||0)-outlay;}

function flash(id){const el=document.getElementById(id);if(!el)return;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500);}

function decToFrac(dec){
  dec=parseFloat(dec);if(!dec||dec<1.01)return'—';
  const n=dec-1;
  // find common fractions
  const fracs=[[1,10],[2,10],[3,10],[4,10],[1,5],[2,9],[1,4],[3,10],[2,7],[1,3],[2,5],[1,2],[4,7],[8,13],[4,6],[8,11],[4,5],[5,6],[10,11],[1,1],[6,5],[5,4],[11,8],[6,4],[13,8],[7,4],[15,8],[2,1],[9,4],[5,2],[11,4],[3,1],[10,3],[7,2],[4,1],[9,2],[5,1],[11,2],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[14,1],[16,1],[20,1],[25,1],[33,1],[40,1],[50,1],[66,1],[100,1]];
  let best=null,bestDiff=999;
  for(const[a,b]of fracs){const d=a/b+1;const diff=Math.abs(d-dec);if(diff<bestDiff){bestDiff=diff;best=[a,b];}}
  if(best&&bestDiff<0.02)return best[0]+'/'+best[1];
  // fallback: simplify
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const num=Math.round(n*100),den=100,g=gcd(Math.abs(num),den);
  return(num/g)+'/'+(den/g);
}

function calcReturns(result,stake,odDec,betType,ewTerms){
  // For EW bets stake = total outlay (both legs); per-leg = stake/2
  stake=parseFloat(stake)||0; odDec=parseFloat(odDec)||0;
  if(!stake||!odDec)return 0;
  if(result==='win'){
    if(betType==='ew'){
      const leg=stake/2;
      let frac=0.25;const m=(ewTerms||'').match(/1\/(\d+)/);if(m)frac=1/parseInt(m[1]);
      return parseFloat((leg*odDec + leg*(frac*(odDec-1)+1)).toFixed(2));
    }
    return parseFloat((stake*odDec).toFixed(2));
  }
  if(result==='place'){
    if(betType==='ew'){
      const leg=stake/2;
      let frac=0.25;const m=(ewTerms||'').match(/1\/(\d+)/);if(m)frac=1/parseInt(m[1]);
      return parseFloat((leg*(frac*(odDec-1)+1)).toFixed(2));
    }
    if(betType==='place')return parseFloat((stake*odDec).toFixed(2));
    return 0;
  }
  if(result==='loss')return 0;
  if(result==='void'||result==='nr')return stake;
  return 0;
}

function ewOutlay(bet){
  // stake is now stored as total outlay for EW — no multiplier needed
  return parseFloat(bet.stake)||0;
}
function applyBankDelta(bet,oldResult,oldReturns){
  // Accounting model:
  //   betBanked=true  + pending   → stake was pre-deducted on log (new model)
  //   betBanked=true  + settled   → full P&L applied
  //   betBanked=false + pending   → nothing deducted yet (legacy bets before this change)
  //   betBanked=false + settled   → shouldn't happen in practice
  if(!D.bank||typeof D.bank!=='object')D.bank={start:0,current:0};
  const oldPending=!oldResult||oldResult==='pending';

  // ── Reverse previous bank impact ──
  if(bet.betBanked&&!oldPending){
    // Was settled: reverse the P&L that was applied at settlement
    const oldOutlay=ewOutlay(bet);
    const oldPnl=(parseFloat(oldReturns)||0)-oldOutlay;
    D.bank.current=parseFloat(((D.bank.current||0)-oldPnl).toFixed(2));
  } else if(bet.betBanked&&oldPending){
    // Was pending with stake pre-deducted: restore the stake
    const outlay=ewOutlay(bet);
    D.bank.current=parseFloat(((D.bank.current||0)+outlay).toFixed(2));
  }

  // ── Apply new bank impact ──
  const newPending=!bet.result||bet.result==='pending';
  if(newPending){
    // Pre-deduct stake immediately
    const outlay=ewOutlay(bet);
    D.bank.current=parseFloat(((D.bank.current||0)-outlay).toFixed(2));
    bet.betBanked=true; // flag: stake is out
  } else if(bet.result!=='nr'&&bet.result!=='void'){
    // Settled win/place/loss: apply full P&L (stake+returns netted)
    const outlay=ewOutlay(bet);
    const newPnl=(parseFloat(bet.returns)||0)-outlay;
    D.bank.current=parseFloat(((D.bank.current||0)+newPnl).toFixed(2));
    bet.betBanked=true;
  }
  // NR / void: no bank movement; betBanked unchanged
}

function calcStakeGuide(mode){
  const isVirt=mode==='virt';
  const ids=isVirt
    ?{conf:'vbconf',odds:'vbo',stake:'vbs',type:'vbtype',guide:'vb-stake-guide',content:'vb-stake-guide-content'}
    :{conf:'lbconf',odds:'lbo',stake:'lbs',type:'lbtype',guide:'lb-stake-guide',content:'lb-stake-guide-content'};
  const accentCol=isVirt?'#fb923c':'var(--gld)';
  const conf=parseInt((document.getElementById(ids.conf)||{value:'3'}).value)||3;
  const oddsRaw=(document.getElementById(ids.odds)||{value:''}).value.trim();
  const betType=(document.getElementById(ids.type)||{value:'win'}).value;
  const stakeEl=document.getElementById(ids.stake);
  const guideEl=document.getElementById(ids.guide);
  const contentEl=document.getElementById(ids.content);
  if(!guideEl||!contentEl||!stakeEl)return;
  const pv=getPointValue();
  const pts=CONF_PTS[conf-1]||2;
  const isEW=betType==='ew';
  const suggested=parseFloat((pts*pv).toFixed(2));
  const dec=fo(oddsRaw);
  const current=parseFloat(stakeEl.value)||0;
  let html='';
  if(!pv||pv<=0){
    html='<div style="font-size:12px;color:var(--gld);">⚠️ Set your point value in Command → Settings → Staking Plan.</div>';
    contentEl.innerHTML=html;guideEl.style.display='block';return;
  }
  html+='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">'
    +'<span style="font-family:monospace;font-size:18px;font-weight:700;color:'+accentCol+';">'+fp(suggested)+'</span>'
    +'<span style="font-size:11px;color:var(--mut);">'+pts+'pt × '+fp(pv)+'/pt</span>'
    +'</div>';
  if(isEW){
    html+='<div style="font-size:11px;color:var(--mut);margin-bottom:6px;">EW total stake: <strong style="color:var(--txt);">'+fp(suggested)+'</strong> ('+fp(suggested/2)+' each leg)</div>';
  }
  if(current){
    const overLimit=pv>0&&current>(CONF_PTS[4]*pv*1.5);
    html+='<div style="font-size:12px;color:'+(overLimit?'var(--red)':'var(--mut)')+';">Your stake: '+fp(current)+' = '+(pv>0?(current/pv).toFixed(2):'-')+'pts'+(overLimit?' ⚠️ exceeds 1.5× max points':'')+'</div>';
  }else{
    html+='<div style="font-size:11px;color:var(--mut);">Tap to use '+fp(suggested)+'</div>';
  }
  if(dec>=1.01)html+='<div style="font-size:11px;color:var(--mut);margin-top:4px;">Break-even: <strong style="color:var(--txt);">'+(100/dec).toFixed(1)+'%</strong> win rate at these odds</div>';
  contentEl.innerHTML=html;
  guideEl.style.display='block';
  guideEl.style.cursor='pointer';
  guideEl.title='Tap to use £'+suggested.toFixed(2);
  guideEl.onclick=function(){stakeEl.value=suggested.toFixed(2);calcStakeGuide(mode);};
}

function renderBetLimit(){
  const el=document.getElementById('tbetlimit');if(!el)return;
  const limit=D.settings&&D.settings.dailyLimit?D.settings.dailyLimit:5;
  const todayBets=D.bets.filter(b=>b.date===td());
  const todayCount=todayBets.length;
  const remaining=Math.max(0,limit-todayCount);
  const limitCol=remaining===0?'#f87171':remaining<=1?'#fbbf24':'var(--mut)';
  // Last 5 bets (real + virtual) merged and sorted by most recent
  const realBets=(D.bets||[]).map(function(b){return Object.assign({},b,{_isVirt:false});});
  const virtBets=((D.vBank&&D.vBank.bets)||[]).map(function(b){return Object.assign({},b,{_isVirt:true});});
  const last5=[].concat(realBets,virtBets).sort(function(a,b){return(b.createdAt||0)-(a.createdAt||0);}).slice(0,5);
  const dots=Array.from({length:5},function(_,i){
    const b=last5[i]||null;
    const col=b?(b._isVirt?'#ea580c':'#3b82f6'):'rgba(255,255,255,.08)';
    const title=b?(b.horse||'')+(b._isVirt?' · Virtual':' · Real'):'';
    return'<span title="'+title+'" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+col+';flex-shrink:0;"></span>';
  }).join('');
  // Single slim strip: dots · legend · spacer · bets today
  el.innerHTML=
    '<div style="display:flex;align-items:center;gap:5px;padding:5px 2px;">'
      +'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);">Last 5</span>'
      +dots
      +'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#3b82f6;margin-left:6px;"></span>'
      +'<span style="font-size:9px;color:var(--mut);">Real</span>'
      +'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ea580c;margin-left:4px;"></span>'
      +'<span style="font-size:9px;color:var(--mut);">Virtual</span>'
      +'<span style="flex:1;"></span>'
      +'<span style="font-size:11px;color:'+limitCol+';font-weight:600;">'+todayCount+' of '+limit+' bets today</span>'
    +'</div>';
}

function calcLiveStake(){calcStakeGuide('real');}

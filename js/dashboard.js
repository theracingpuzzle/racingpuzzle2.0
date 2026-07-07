// ─── DASHBOARD ─── cmd dashboard, history, stats, edit modal, tab router

// ─── CMD DASHBOARD ───
function renderDash(){} // Dashboard removed - stats is now the default tab

function renderCompare(set){
  const dc=document.getElementById('d-compare');
  const dcblk=document.getElementById('d-compare-blk');
  if(dc){
    // Real stats — calculated fresh from the real settled bets passed in
    const rStaked=set.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
    const rRets=set.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
    const p=rRets-rStaked;
    const roi=rStaked>0?(p/rStaked*100):0;
    const rW=set.filter(b=>b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'))).length;
    const sr=set.length>0?(rW/set.length*100):0;
    // Real bank change — recalculate live same way updHdr() does
    const bankStart=D.bank&&D.bank.start!=null?D.bank.start:0;
    const realBankChange=set.reduce((a,b)=>a+(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0),0);

    // Virtual stats
    const vb=getVBank();
    const vset=vb.bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='nr');
    const vStaked=vset.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
    const vRets=vset.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
    const vP=vRets-vStaked;
    const vROI=vStaked>0?(vP/vStaked*100):0;
    const vW=vset.filter(b=>b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'))).length;
    const vSR=vset.length>0?(vW/vset.length*100):0;
    const vBankChange=vset.reduce((a,b)=>a+(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0),0);

    if(!set.length&&!vset.length){
      dc.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Log real and virtual bets to see the comparison.</div>';
      if(dcblk)dcblk.style.display='none';
    } else {
      if(dcblk)dcblk.style.display='block';
      // Grid: metric | real | virtual
      const rows=[
        ['P&L',fmt(p),fmt(vP),p,vP],
        ['ROI',Math.round(roi)+'%',Math.round(vROI)+'%',roi,vROI],
        ['Strike Rate',Math.round(sr)+'%',Math.round(vSR)+'%',sr,vSR],
        ['Bank Change',fmt(realBankChange),fmt(vBankChange),realBankChange,vBankChange],
        ['Bets Settled',set.length+'',''+vset.length,0,0],
      ];
      let insight='';
      if(set.length>=3&&vset.length>=3){
        const diff=vROI-roi;
        if(diff>8)insight='Virtual ROI is beating real by '+diff.toFixed(0)+'% — you may be second-guessing yourself in real betting.';
        else if(diff<-8)insight='Real ROI is beating virtual by '+Math.abs(diff).toFixed(0)+'% — real stakes are sharpening your decisions.';
        else insight='Real and virtual performance are closely aligned — your process is consistent.';
      }
      dc.innerHTML='<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:0;border:1px solid var(--bdr);border-radius:9px;overflow:hidden;">'
        +'<div style="background:var(--sur2);padding:8px 12px;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);border-bottom:1px solid var(--bdr);"></div>'
        +'<div style="background:rgba(96,165,250,.08);padding:8px 12px;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:12px;font-weight:700;color:var(--blu);text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);">Real</div>'
        +'<div style="background:rgba(251,146,60,.12);padding:8px 12px;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:12px;font-weight:700;color:#fb923c;text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);">Virtual</div>'
        +rows.map(function(r){
          const rWin=r.length>3&&r[3]>r[4],vWin=r.length>3&&r[4]>r[3];
          return'<div style="background:var(--sur2);padding:8px 12px;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:13px;color:var(--mut);border-bottom:1px solid var(--bdr);">'+r[0]+'</div>'
            +'<div style="padding:8px 12px;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:15px;font-weight:600;text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);color:'+(r.length>3?(r[3]>=0?'var(--blu)':'var(--red)'):'var(--txt)')+';">'
              +r[1]+(rWin?' ◀':'')
            +'</div>'
            +'<div style="padding:8px 12px;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:15px;font-weight:600;text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);color:'+(r.length>3?(r[4]>=0?'#fb923c':'var(--red)'):'var(--txt)')+';">'
              +r[2]+(vWin?' ◀':'')
            +'</div>';
        }).join('')
        +'</div>'
        +(insight?'<div style="margin-top:10px;padding:9px 12px;background:rgba(232,228,220,.07);border:1px solid rgba(232,228,220,.15);border-radius:8px;font-size:15px;color:var(--txt);line-height:1.6;">'+insight+'</div>':'');
    }
  }
  }

// ─── STATS / HISTORY VIEW TOGGLE ───
// History has moved to the Profile overlay (profile button → Bet History tab)
let _statsHistView='stats';
function setStatsHistView(view){ _statsHistView='stats'; renderStats(); }

// ─── HISTORY ───
let histMode='real';
function setHistMode(m){
  histMode=m;
  document.getElementById('hist-real-section').style.display=m==='real'?'block':'none';
  document.getElementById('hist-virt-section').style.display=m==='virt'?'block':'none';
  const tr=document.getElementById('hist-tog-real'),tv=document.getElementById('hist-tog-virt');
  if(tr){tr.style.background=m==='real'?'var(--blu)':'transparent';tr.style.color=m==='real'?'white':'var(--mut)';}
  if(tv){tv.style.background=m==='virt'?'#fb923c':'transparent';tv.style.color=m==='virt'?'#141414':'var(--mut)';}
  if(m==='virt')renderVirtHist();else renderHist();
}
function renderVirtHist(){
  const vb=getVBank(),bets=vb.bets||[];
  const rf=(document.getElementById('hvfr')||{value:''}).value;
  const sf=(document.getElementById('hvfs')||{value:''}).value.toLowerCase();

  // Pending
  const pending=bets.filter(function(b){return !b.result||b.result==='pending';}).sort(function(a,b2){return (b2.createdAt||0)-(a.createdAt||0);});
  const pBlk=document.getElementById('hist-vpending-blk');
  const pEl=document.getElementById('hist-vpending');
  if(pBlk)pBlk.style.display=pending.length?'block':'none';
  if(pEl&&pending.length){
    var pHtml='';
    for(var pi=0;pi<pending.length;pi++){
      var pb=pending[pi];
      var pos=pb.oddsDisplay||(pb.odds||'—');
      pHtml+='<div class="mb pending" data-id="'+pb.id+'" data-virt="1" style="cursor:pointer;border-left-color:#fb923c;">'
        +'<div class="mbl"><div class="mh">'+pb.horse+'</div>'
        +'<div class="mm">'+fdate(pb.date)+' · '+(pb.track||'—')+' · <span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;">'+pos+'</span> · '+fp(pb.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bpend">pending</span>'
        +'<div style="font-size:12px;color:var(--mut);margin-top:3px;font-family:Barlow Condensed,Arial Narrow,sans-serif;">tap to update</div></div></div>';
    }
    pEl.innerHTML=pHtml;
    pEl.querySelectorAll('[data-id]').forEach(function(el){el.addEventListener('click',function(){openVEM(el.getAttribute('data-id'));});});
  }

  // All bets filtered
  var filtered=bets.slice().sort(function(a,b2){return (b2.createdAt||0)-(a.createdAt||0);});
  if(rf)filtered=filtered.filter(function(b){return b.result===rf;});
  if(sf)filtered=filtered.filter(function(b){return (b.horse||'').toLowerCase().indexOf(sf)>-1||(b.track||'').toLowerCase().indexOf(sf)>-1;});
  var cnt=document.getElementById('hvcnt');if(cnt)cnt.textContent=filtered.length+' bet'+(filtered.length!==1?'s':'');
  var listEl=document.getElementById('hist-virt-list');if(!listEl)return;
  if(!filtered.length){
    var isFiltered2=rf||sf;
    listEl.innerHTML=isFiltered2
      ?'<div class="es">No virtual bets match your filters.</div>'
      :'<div style="text-align:center;padding:32px 16px;">'
        +'<div style="font-size:36px;margin-bottom:12px;">🧪</div>'
        +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:18px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:8px;">No virtual bets yet</div>'
        +'<div style="font-size:15px;color:var(--mut);line-height:1.65;margin-bottom:18px;">Use the Virtual card to paper-trade selections without risking real money. Great for testing new approaches.</div>'
        +'<button onclick="navTo(\'today\')" style="padding:10px 22px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">Log a Virtual Bet →</button>'
        +'</div>';
    return;
  }
  var bg={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
  var html='';
  for(var li=0;li<filtered.length;li++){
    var b=filtered[li];
    var p2=(b.result&&b.result!=='pending'&&b.result!=='nr')?(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0):null;
    var os=b.oddsDisplay||(b.odds||'—');
    html+='<div class="mb '+(b.result||'pending')+'" data-id="'+b.id+'" data-virt="1" style="cursor:pointer;border-left-color:#fb923c;">'
      +'<div class="mbl"><div class="mh">'+b.horse+'</div>'
      +'<div class="mm">'+fdate(b.date)+' · '+(b.track||'—')+' · <span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;">'+os+'</span></div>'
      +'<div class="mm" style="margin-top:2px;">'+fp(b.stake)+' · '+(b.betType||'win').toUpperCase()+(b.source?' · '+b.source.split(' ')[0]:'')+'</div></div>'
      +'<div class="mbr"><span class="bdg '+(bg[b.result]||'bpend')+'">'+(b.result||'pend')+'</span>'
      +'<div class="mp '+(p2===null?'':p2>=0?'pos':'neg')+'" style="margin-top:3px;">'+(p2===null?'—':fmt(p2))+'</div></div></div>';
  }
  listEl.innerHTML=html;
  listEl.querySelectorAll('[data-id]').forEach(function(el){el.addEventListener('click',function(){openVEM(el.getAttribute('data-id'));});});
}
function clrVHF(){var f=document.getElementById('hvfs');var r=document.getElementById('hvfr');if(f)f.value='';if(r)r.value='';renderVirtHist();}
function clrVHF(){const f=document.getElementById('hvfs');const r=document.getElementById('hvfr');if(f)f.value='';if(r)r.value='';renderVirtHist();}
function renderHist(){
  // Pending section — action required
  const pendingEl=document.getElementById('hist-pending');
  const pendingBlk=document.getElementById('hist-pending-blk');
  const pending=D.bets.filter(b=>!b.result||b.result==='pending').sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(pendingBlk)pendingBlk.style.display=pending.length?'block':'none';
  if(pendingEl){
    pendingEl.innerHTML=pending.length?pending.map(b=>{
      const os=b.oddsDisplay||(b.odds||'—');
      return'<div class="mb pending" onclick="openEM(\''+b.id+'\')" style="cursor:pointer;">'
        +'<div class="mbl"><div class="mh">'+b.horse+'</div><div class="mm">'+fdate(b.date)+' · '+b.track+' · <span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;">'+os+'</span> · '+fp(b.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bpend">pending</span><div style="font-size:12px;color:var(--mut);margin-top:3px;font-family:Barlow Condensed,Arial Narrow,sans-serif;">tap to update</div></div></div>';
    }).join(''):'';
  }
  // Filtered list
  const rf=(document.getElementById('hfr')||{value:''}).value;
  const sf=(document.getElementById('hfs')||{value:''}).value.toLowerCase();
  let bets=[...D.bets].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(rf==='needs-review')bets=bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr'&&!b.postNotes);
  else if(rf)bets=bets.filter(b=>b.result===rf);
  if(sf)bets=bets.filter(b=>(b.horse||'').toLowerCase().includes(sf)||(b.track||'').toLowerCase().includes(sf));
  const cnt=document.getElementById('hcnt');if(cnt)cnt.textContent=bets.length+' bet'+(bets.length!==1?'s':'');
  const listEl=document.getElementById('hist-list');if(!listEl)return;
  if(!bets.length){
    const isFiltered=rf||sf;

    listEl.innerHTML=isFiltered
      ?'<div class="es">No bets match your filters.</div>'
      :'<div style="text-align:center;padding:32px 16px;">'
        +'<div style="font-size:36px;margin-bottom:12px;">📋</div>'
        +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:18px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:8px;">No bets logged yet</div>'
        +'<div style="font-size:15px;color:var(--mut);line-height:1.65;margin-bottom:18px;">Head to Today to log your first real bet. Every bet you log appears here so you can review and settle results.</div>'
        +'<button onclick="navTo(\'today\')" style="padding:10px 22px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">Log a Bet →</button>'
        +'</div>';
    return;
  }
  const bg={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
  listEl.innerHTML=bets.map(b=>{
    const p2=pnl(b),os=b.oddsDisplay||(b.odds||'—');
    return'<div class="mb '+(b.result||'pending')+'" onclick="openEM(\''+b.id+'\')" style="cursor:pointer;">'
      +'<div class="mbl">'
        +'<div class="mh">'+b.horse+'</div>'
        +'<div class="mm">'+fdate(b.date)+' · '+b.track+' · <span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;">'+os+'</span></div>'
        +'<div class="mm" style="margin-top:2px;">'+fp(b.stake)+' · '+(b.betType||'win').toUpperCase()+(b.source?' · '+b.source.split(' ')[0]:'')+'</div>'
      +'</div>'
      +'<div class="mbr">'
        +'<span class="bdg '+(bg[b.result]||'bpend')+'">'+(b.result||'pend')+'</span>'
        +'<div class="mp '+(p2===null?'':p2>=0?'pos':'neg')+'" style="margin-top:3px;">'+(p2===null?'—':fmt(p2))+'</div>'
      +'</div></div>';
  }).join('');
}
function clrHF(){const hfr=document.getElementById('hfr');const hfs=document.getElementById('hfs');if(hfr)hfr.value='';if(hfs)hfs.value='';renderHist();}

// ─── STATS ───
let _statsCache = null; // { key, html }

function _statsCacheKey(){
  const scope = window._statsScope||'both';
  const own   = window._ownStudyOnly?'1':'0';
  const rBets = D.bets||[];
  const vBets = (D.vBank&&D.vBank.bets)||[];
  // Fast checksum: sum of (returns+stake) values catches result changes on any bet
  const rSum  = rBets.reduce((a,b)=>a+(parseFloat(b.returns)||0)+(parseFloat(b.stake)||0),0).toFixed(2);
  const vSum  = vBets.reduce((a,b)=>a+(parseFloat(b.returns)||0)+(parseFloat(b.stake)||0),0).toFixed(2);
  return scope+'|'+own+'|'+rBets.length+'|'+vBets.length+'|'+rSum+'|'+vSum;
}

function invalidateStatsCache(){ _statsCache=null; }

function toggleOwnStudy(){
  window._ownStudyOnly=!window._ownStudyOnly;
  const btn=document.getElementById('st-tog-own');
  if(btn){btn.textContent='Own Study: '+(window._ownStudyOnly?'On':'Off');btn.style.background=window._ownStudyOnly?'var(--navy)':'';btn.style.color=window._ownStudyOnly?'#fff':'';btn.style.borderColor=window._ownStudyOnly?'var(--navy)':'';}
  renderStats();
}

function setStatsScope(scope){
  window._statsScope=scope;
  // Colour overrides for Real (blue) and Virtual (orange) active states;
  // Both uses the default navy from .rc-view-btn.on
  const colMap={real:'#60a5fa',virt:'#fb923c'};
  ['real','virt','both'].forEach(function(s){
    const el=document.getElementById('st-tog-'+s);if(!el)return;
    const active=s===scope;
    el.classList.toggle('on', active);
    el.classList.toggle('off', !active);
    // Override background/color for real and virt active states
    if(active&&colMap[s]){
      el.style.background=colMap[s];
      el.style.color='#141414';
    } else {
      el.style.background='';
      el.style.color='';
    }
  });
  renderStats();
}

const _STATS_ELS=['st-summary','st-insights-body','st-src-table','st-conf-table','st-type-table','st-monthly','st-trk','st-ck-impact','st-ck-signals','st-ck-table','st-ck-tip','st-jockey','st-trainer','dc-compare'];

function renderStats(){
  const ck=_statsCacheKey();
  if(_statsCache&&_statsCache.key===ck){
    _STATS_ELS.forEach(id=>{const el=document.getElementById(id);if(el&&_statsCache.els[id]!==undefined)el.innerHTML=_statsCache.els[id];});
    return;
  }
  const scope=window._statsScope||'both';
  const vbBets=getVBank().bets.filter(function(b){return b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr';});
  const realBets=D.bets.filter(function(b){return b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr';});
  // 'set' = bets used for all breakdowns (source, confidence, track etc.)
  const set=scope==='real'?realBets:scope==='virt'?vbBets:[...realBets,...vbBets.map(function(b){return Object.assign({},b,{_virt:true});})];
  const ownStudyOnly=window._ownStudyOnly||false;
  const OWN_SOURCES=['Own Form Study'];
  // Headline metrics use the scope-matched bets, filtered by own study if active
  const _allStatBets=scope==='virt'?vbBets:scope==='real'?realBets:[...realBets,...vbBets];
  const statBets=ownStudyOnly?_allStatBets.filter(b=>OWN_SOURCES.includes(b.source||'')):_allStatBets;
  const disciplineSet=ownStudyOnly?set.filter(b=>OWN_SOURCES.includes(b.source||'')):set;
  const wins=statBets.filter(b=>b.result==='win');
  const places=statBets.filter(b=>b.result==='place'&&(b.betType==='ew'||b.betType==='place'));
  const staked=statBets.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
  const rets=statBets.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
  const p=rets-staked,roi=staked>0?(p/staked*100):0;
  const sr=statBets.length>0?((wins.length+places.length)/statBets.length*100):0;
  const avg=disciplineSet.length>0?disciplineSet.reduce((a,b)=>a+(parseFloat(b.odds)||0),0)/disciplineSet.length:0;

  // If the selected scope has no bets, show empty state
  if(!set.length){
    const statsEmpty='<div style="text-align:center;padding:32px 16px;">'
      +'<div style="font-size:36px;margin-bottom:12px;">📊</div>'
      +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:18px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);margin-bottom:8px;">No settled bets yet</div>'
      +'<div style="font-size:15px;color:var(--mut);line-height:1.65;margin-bottom:18px;">Log your first bet on the Today card and mark it as a win, place or loss to see your stats here.</div>'
      +'<button onclick="navTo(\'today\')" style="padding:10px 22px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">Go to Today →</button>'
      +'</div>';
    const sumEl=document.getElementById('st-summary');if(sumEl)sumEl.innerHTML='';
    ['st-insights-body','st-src-table','st-conf-table','st-type-table','st-monthly','st-trk','st-ck-impact','st-ck-signals','st-ck-table','st-ck-tip','st-jockey','st-trainer'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.innerHTML=id==='st-insights-body'?statsEmpty:'<div style="color:var(--mut);font-style:italic;font-size:15px;padding:8px 0;">Nothing to show yet.</div>';
    });
    const dc=document.getElementById('d-compare');
    const dcblk=document.getElementById('d-compare-blk');
    if(dc)dc.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Log real and virtual bets to see the comparison.</div>';
    if(dcblk)dcblk.style.display='none';
    return;
  }

  // ── Summary block ──
  const summaryEl=document.getElementById('st-summary');
  if(summaryEl){
    const _vb=getVBank();
    const pendingCount=scope==='virt'
      ?_vb.bets.filter(function(b){return !b.result||b.result==='pending';}).length
      :scope==='real'
        ?D.bets.filter(function(b){return !b.result||b.result==='pending';}).length
        :[...D.bets,..._vb.bets].filter(function(b){return !b.result||b.result==='pending';}).length;
    // Bank: for 'both' show combined start/current across real+virtual
    const bankStart=scope==='virt'?(_vb.start||0):scope==='real'?(D.bank.start||0):((D.bank.start||0)+(_vb.start||0));
    const bankCurrent=scope==='virt'?(_vb.current||0):scope==='real'?(D.bank.current||0):((D.bank.current||0)+(_vb.current||0));
    const bankChange=bankCurrent-bankStart;
    const pCol=p>=0?'#34d399':'#f87171';
    const roiCol=roi>=0?'#34d399':'#f87171';
    const bankCol=bankChange>=0?'#34d399':'#f87171';

    const metric=function(label,value,sub,col){
      return'<div style="flex:1;min-width:0;padding:14px 8px;text-align:center;border-right:1px solid var(--bdr);last-child:border-right:none;">'
        +'<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:26px;font-weight:700;letter-spacing:-.5px;color:'+(col||'var(--txt)')+';">'+value+'</div>'
        +'<div style="font-size:11px;font-family:\'Barlow Condensed\',sans-serif;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--mut);margin-top:2px;">'+label+'</div>'
        +(sub?'<div style="font-size:11px;color:var(--mut);margin-top:1px;">'+sub+'</div>':'')
      +'</div>';
    };

    // ── Best performer helper — respects own study filter ──
    function bestOf(key){
      const map={};
      disciplineSet.forEach(function(b){
        const k=(b[key]||'').trim();if(!k||k==='Unknown')return;
        if(!map[k])map[k]={p:0,n:0,staked:0,w:0};
        map[k].p+=(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0);
        map[k].n++;
        map[k].staked+=(parseFloat(b.stake)||0);
        if(b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place')))map[k].w++;
      });
      const rows=Object.entries(map)
        .filter(function(_ref){return _ref[1].n>=2;})
        .map(function(_ref){var k=_ref[0],v=_ref[1];return{k,roi:v.staked>0?v.p/v.staked*100:0,p:v.p,n:v.n,sr:v.w/v.n*100};})
        .sort(function(a,b){return b.roi-a.roi;});
      return rows[0]||null;
    }

    const bestJockey=bestOf('jockey');
    const bestTrainer=bestOf('trainer');
    const bestSource=bestOf('source');
    const bestTrack=(function(){
      const map={};
      disciplineSet.forEach(function(b){const k=(b.track||'').trim();if(!k)return;if(!map[k])map[k]={p:0,n:0};map[k].p+=(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0);map[k].n++;});
      const rows=Object.entries(map).filter(function(_ref){return _ref[1].n>=2;}).map(function(_ref){var k=_ref[0],v=_ref[1];return{k,p:v.p,n:v.n};}).sort(function(a,b){return b.p-a.p;});
      return rows[0]||null;
    })();

    const perfCard=function(label,item,valueKey){
      if(!item)return'<div style="flex:1;min-width:0;padding:11px 10px;border-right:1px solid var(--bdr);opacity:.35;text-align:center;"><div style="font-size:12px;font-weight:700;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px;">'+label+'</div><div style="font-size:13px;color:var(--mut);">No data</div></div>';
      const val=valueKey==='p'?fmt(item.p):(item.roi>=0?'+':'')+Math.round(item.roi)+'%';
      const col=((valueKey==='p'?item.p:item.roi)>=0)?'#10b981':'#f87171';
      return'<div style="flex:1;min-width:0;padding:11px 10px;border-right:1px solid var(--bdr);overflow:hidden;">'
        +'<div style="font-size:11px;font-weight:700;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px;">'+label+'</div>'
        +'<div style="font-size:14px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;" title="'+item.k+'">'+item.k+'</div>'
        +'<div style="font-size:13px;font-weight:800;color:'+col+';">'+val+'</div>'
        +'<div style="font-size:11px;color:var(--mut);">'+item.n+' bets · '+item.sr.toFixed(0)+'% SR</div>'
      +'</div>';
    };

    summaryEl.innerHTML='<div style="border:1px solid var(--bdr);border-radius:12px;overflow:hidden;margin-bottom:14px;">'
      // Row 1 — headline numbers
      +'<div style="display:flex;border-bottom:1px solid var(--bdr);">'
        +metric('P&L',fmt(p),'from £'+Math.round(staked)+' staked',pCol)
        +metric('ROI',(roi>=0?'+':'')+Math.round(roi)+'%',statBets.length+' settled bets',roiCol)
        +metric('Strike Rate',Math.round(sr)+'%',wins.length+' wins',sr>=25?'#10b981':sr>=15?'#f59e0b':'var(--txt)')
      +'</div>'
      // Row 2 — bank / odds / pending
      +'<div style="display:flex;border-bottom:1px solid var(--bdr);">'
        +metric('Bank',fmt(bankChange),'vs '+fmt(bankStart)+' start',bankCol)
        +metric('Avg Odds',avg>0?decToFrac(avg):'—','fractional',null)
        +metric('Pending',pendingCount,'awaiting results',pendingCount>0?'#f59e0b':null)
      +'</div>'
      // Row 3 — best performers header
      +'<div style="padding:8px 12px 6px;border-bottom:1px solid var(--bdr);">'
        +'<div style="font-size:11px;font-weight:700;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.08em;text-transform:uppercase;">Best Performers (min. 2 bets, by ROI)</div>'
      +'</div>'
      // Row 4 — best jockey / trainer / source / track
      +'<div style="display:flex;">'
        +perfCard('Jockey',bestJockey,'roi')
        +perfCard('Trainer',bestTrainer,'roi')
        +(!ownStudyOnly?perfCard('Source',bestSource,'roi'):'')
        +(bestTrack?'<div style="flex:1;min-width:0;padding:11px 10px;overflow:hidden;">'
          +'<div style="font-size:11px;font-weight:700;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px;">Racecourse</div>'
          +'<div style="font-size:14px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;" title="'+bestTrack.k+'">'+bestTrack.k+'</div>'
          +'<div style="font-size:13px;font-weight:800;color:'+(bestTrack.p>=0?'#10b981':'#f87171')+';">'+fmt(bestTrack.p)+'</div>'
          +'<div style="font-size:11px;color:var(--mut);">'+bestTrack.n+' bets</div>'
        +'</div>':'<div style="flex:1;min-width:0;padding:11px 10px;opacity:.35;text-align:center;"><div style="font-size:11px;font-weight:700;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px;">Racecourse</div><div style="font-size:13px;color:var(--mut);">No data</div></div>')
      +'</div>'
    +'</div>';
  }

  // ── Auto-observations ──
  const insights=[];
  // Virtual vs Real comparison — only in 'both' mode and NOT own study
  if(scope==='both'&&!ownStudyOnly){
    const vBets2=getVBank().bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr');
    if(vBets2.length>=3&&realBets.length>=3){
      const vSt=vBets2.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
      const vRet=vBets2.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
      const vROI=vSt>0?((vRet-vSt)/vSt*100):0;
      const rSt=realBets.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
      const rRet=realBets.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
      const rROI=rSt>0?((rRet-rSt)/rSt*100):0;
      const diff=vROI-rROI;
      if(diff>8)insights.push({icon:'grn',msg:'<strong>Virtual ROI ('+Math.round(vROI)+'%) is beating real ('+Math.round(rROI)+'%) by '+diff.toFixed(0)+'%.</strong> You may be second-guessing yourself in real betting.'});
      else if(diff<-8)insights.push({icon:'up',msg:'Real ROI ('+Math.round(rROI)+'%) is beating virtual ('+Math.round(vROI)+'%) by '+Math.abs(diff).toFixed(0)+'%. Real money focus sharpens your decisions.'});
      else insights.push({icon:'chart',msg:'Virtual and real closely aligned ('+Math.round(vROI)+'% vs '+Math.round(rROI)+'% ROI). Process is consistent.'});
    }
  }
  // Best source — only when NOT in own study mode (all bets are own study then)
  const srcMap={};disciplineSet.forEach(b=>{const k=b.source||'Unknown';if(!srcMap[k])srcMap[k]={p:0,n:0,staked:0,wins:0};srcMap[k].p+=(pnl(b)||0);srcMap[k].n++;srcMap[k].staked+=(parseFloat(b.stake)||0);if(b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place')))srcMap[k].wins++;});
  const srcArr=Object.entries(srcMap).map(([k,v])=>({k,roi:v.staked>0?v.p/v.staked*100:0,p:v.p,n:v.n,sr:v.n>0?(v.wins/v.n*100):0}));
  if(!ownStudyOnly&&srcArr.length>1){
    srcArr.sort((a,b)=>b.roi-a.roi);
    const best=srcArr[0],worst=srcArr[srcArr.length-1];
    if(best.roi>0)insights.push({icon:'check',msg:'<strong style="color:var(--grn);">'+best.k+'</strong> is your best source — ROI of '+Math.round(best.roi)+'% from '+best.n+' bets.'});
    if(worst.roi<-10)insights.push({icon:'warn',msg:'<strong style="color:var(--red);">'+worst.k+'</strong> is costing you — ROI of '+Math.round(worst.roi)+'% from '+worst.n+' bets. Consider cutting it.'});
  }
  // Confidence calibration
  const highConf=disciplineSet.filter(b=>b.conf>=4),lowConf=disciplineSet.filter(b=>b.conf<=2);
  if(highConf.length>=3&&lowConf.length>=3){
    const hcROI=highConf.reduce((a,b)=>a+(pnl(b)||0),0)/highConf.reduce((a,b)=>a+(parseFloat(b.stake)||0),1)*100;
    const lcROI=lowConf.reduce((a,b)=>a+(pnl(b)||0),0)/lowConf.reduce((a,b)=>a+(parseFloat(b.stake)||0),1)*100;
    if(hcROI>lcROI+10)insights.push({icon:'target',msg:'High-confidence bets (4-5) outperform low-confidence by '+(hcROI-lcROI).toFixed(0)+'% ROI. Back your convictions more.'});
    else if(lcROI>hcROI+10)insights.push({icon:'info',msg:'Your lower-confidence bets are actually outperforming high-confidence by '+(lcROI-hcROI).toFixed(0)+'% ROI. Are you overthinking your best bets?'});
    else insights.push({icon:'chart',msg:'No significant difference between high and low confidence ROI yet. Keep logging.'});
  }
  // Chasing pattern — use scope-matched bets, not all bets
  const recentScoped=[...statBets].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,10);
  let consLosses=0;for(const b of recentScoped){if(b.result==='loss')consLosses++;else if(b.result&&b.result!=='pending')break;}
  if(consLosses>=3)insights.push({icon:'alert',msg:'You\'re on <strong style="color:var(--red);">'+consLosses+' consecutive losses</strong>. This is the highest-risk time for chasing. Step back before the next bet.'});
  // Bet frequency
  const today=disciplineSet.filter(b=>b.date===td()).length;
  if(today>=4)insights.push({icon:'clock',msg:today+' settled bets today. Volume is your enemy — quality over quantity.'});
  // Avg odds insight
  if(avg>8)insights.push({icon:'info',msg:'Your average odds are '+decToFrac(avg)+'. At this level you need a 12%+ strike rate to profit. Make sure your form study supports this.'});
  else if(avg<2.5)insights.push({icon:'info',msg:'Average odds of '+decToFrac(avg)+' — backing short-priced horses. Strike rate needs to be very high (40%+) to show profit.'});

  // SVG icon map for insight types
  const _ISVG={
    check:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    alert:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    grn:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    up:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><polyline points="18 15 12 9 6 15"/></svg>',
    chart:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mut)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    target:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    clock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  };
  const iBody=document.getElementById('st-insights-body');
  if(iBody)iBody.innerHTML=insights.length?insights.map(function(i){
    const svg=_ISVG[i.icon]||_ISVG.info;
    return'<div style="display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-bottom:1px solid var(--bdr);line-height:1.6;">'+svg+'<span>'+i.msg+'</span></div>';
  }).join(''):'<div style="color:var(--mut);font-style:italic;">Looking good — no major concerns in your current data.</div>';

  // ── Source leaderboard ──
  const srcEl=document.getElementById('st-src-table');
  if(srcEl){
    const rows=srcArr.sort((a,b)=>b.roi-a.roi);
    if(!rows.length){srcEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Not enough data.</div>';}
    else{srcEl.style.maxHeight='220px';srcEl.style.overflowY='auto';srcEl.innerHTML='<table style="width:100%;font-size:15px;border-collapse:collapse;">'
      +'<thead><tr>'
      +'<th style="text-align:left;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">Source</th>'
      +'<th style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);text-align:right;">Bets</th>'
      +'<th style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);text-align:right;">SR%</th>'
      +'<th style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);text-align:right;">P&L</th>'
      +'<th style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);text-align:right;">ROI</th>'
      +'</tr></thead><tbody>'
      +rows.map(r=>'<tr>'
        +'<td style="padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);">'+r.k+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:var(--mut);">'+r.n+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);">'+r.sr.toFixed(0)+'%</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.p>=0?'var(--grn)':'var(--red)')+';">'+fmt(r.p)+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.roi>=0?'var(--grn)':'var(--red)')+';">'+Math.round(r.roi)+'%</td>'
        +'</tr>').join('')
      +'</tbody></table>';}
  }

  // ── Checklist score vs outcome ──
  const ckEl=document.getElementById('st-ck-table');
  if(ckEl){
    const ckBets=disciplineSet.filter(function(b){return b.checklistAnswers&&Object.keys(b.checklistAnswers).length>0;});
    if(ckBets.length<3){
      ckEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Log more bets via the checklist to unlock these insights.</div>';
    } else {
      // Helper: ROI row for a subset of bets
      function ckSubStats(bb){
        if(!bb.length)return null;
        const st=bb.reduce(function(a,b){return a+(parseFloat(b.stake)||0);},0);
        const p=bb.reduce(function(a,b){return a+(pnl(b)||0);},0);
        const w=bb.filter(function(b){return b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'));}).length;
        return{n:bb.length,sr:bb.length>0?(w/bb.length*100):0,p,roi:st>0?(p/st*100):0};
      }
      function ckRow(label,bb,isGood){
        const s=ckSubStats(bb);
        if(!s)return'<tr><td style="padding:6px 0;border-bottom:1px solid var(--bdr);font-size:14px;color:var(--mut);">'+label+'</td><td colspan="3" style="text-align:center;font-size:13px;font-style:italic;color:var(--mut);padding:6px 0;border-bottom:1px solid var(--bdr);">no data</td></tr>';
        const roiCol=s.roi>=0?'var(--grn)':'var(--red)';
        const dot=isGood===true?'<span style="color:var(--grn);margin-right:4px;">●</span>':isGood===false?'<span style="color:var(--red);margin-right:4px;">●</span>':'';
        return'<tr><td style="padding:6px 0;border-bottom:1px solid var(--bdr);font-size:14px;">'+dot+label+'</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:6px 0;border-bottom:1px solid var(--bdr);color:var(--mut);font-size:13px;">'+s.n+'</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:6px 0;border-bottom:1px solid var(--bdr);font-size:13px;">'+s.sr.toFixed(0)+'%</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:6px 0;border-bottom:1px solid var(--bdr);color:'+roiCol+';font-size:13px;">'+Math.round(s.roi)+'%</td>'
          +'</tr>';
      }
      const thead='<table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:16px;">'
        +'<thead><tr>'
        +'<th style="text-align:left;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 6px;border-bottom:1px solid var(--bdr);"></th>'
        +'<th style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 6px;border-bottom:1px solid var(--bdr);text-align:right;">Bets</th>'
        +'<th style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 6px;border-bottom:1px solid var(--bdr);text-align:right;">SR%</th>'
        +'<th style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 6px;border-bottom:1px solid var(--bdr);text-align:right;">ROI</th>'
        +'</tr></thead><tbody>';
      function ckSection(title,rows){
        return'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin:14px 0 4px;">'+title+'</div>'
          +thead+rows+'</tbody></table>';
      }
      let html='';
      // 1. Research time (multi-choice)
      const rtBets=ckBets.filter(function(b){return b.checklistAnswers['research-time']!=null;});
      if(rtBets.length>=3){
        html+=ckSection('Research Time',
          ['Quick glance','10–15 mins','30+ mins','Deep study'].map(function(lbl,i){
            return ckRow(lbl,rtBets.filter(function(b){return b.checklistAnswers['research-time']===lbl;}),i===0?false:i>=2?true:null);
          }).join('')
        );
      }
      // 2. Checked form & distance
      const fdBets=ckBets.filter(function(b){return b.checklistAnswers['form-distance'];});
      if(fdBets.length>=3){
        html+=ckSection('Checked Form & Distance',
          ckRow('Yes',fdBets.filter(function(b){return b.checklistAnswers['form-distance']==='yes';}),true)
          +ckRow('No',fdBets.filter(function(b){return b.checklistAnswers['form-distance']==='no';}),false)
        );
      }
      // 3. Watched video
      const vidBets=ckBets.filter(function(b){return b.checklistAnswers['video'];});
      if(vidBets.length>=3){
        html+=ckSection('Watched Replay',
          ckRow('Yes',vidBets.filter(function(b){return b.checklistAnswers['video']==='yes';}),true)
          +ckRow('No',vidBets.filter(function(b){return b.checklistAnswers['video']==='no';}),false)
        );
      }
      // 3b. Handicap ratings — only handicap races (exclude N/A)
      const ratingsBets=ckBets.filter(function(b){return b.checklistAnswers['ratings']&&b.checklistAnswers['ratings']!=='N/A — not a handicap';});
      if(ratingsBets.length>=3){
        html+=ckSection('Handicap Ratings (handicaps only)',
          ckRow('Yes — worked ratings',ratingsBets.filter(function(b){return b.checklistAnswers['ratings']==='Yes — ratings worked';}),true)
          +ckRow('No',ratingsBets.filter(function(b){return b.checklistAnswers['ratings']==='No';}),false)
        );
      }
      // 4. Price assessment
      const priceBets=ckBets.filter(function(b){return b.checklistAnswers['price'];});
      if(priceBets.length>=3){
        html+=ckSection('Price Assessment',
          ['Value','Fair','Marginal','Forced'].map(function(lbl,i){
            return ckRow(lbl,priceBets.filter(function(b){return b.checklistAnswers['price']===lbl;}),i===0?true:i>=2?false:null);
          }).join('')
        );
      }
      // 5. Why reached for device
      const whyBets=ckBets.filter(function(b){return b.checklistAnswers['why'];});
      if(whyBets.length>=3){
        html+=ckSection('Why You Placed the Bet',
          ['Planned','Spotted it','Tipster','Impulse'].map(function(lbl,i){
            return ckRow(lbl,whyBets.filter(function(b){return b.checklistAnswers['why']===lbl;}),i===0?true:i===3?false:null);
          }).join('')
        );
      }
      // 6. Time before race
      const todBets=ckBets.filter(function(b){return b.checklistAnswers['time-of-day'];});
      if(todBets.length>=3){
        html+=ckSection('How Far in Advance',
          ['2h+ before','1–2h before','20–60 mins','Under 20 mins / race starting'].map(function(lbl,i){
            return ckRow(lbl,todBets.filter(function(b){return b.checklistAnswers['time-of-day']===lbl;}),i===0?true:i>=3?false:null);
          }).join('')
        );
      }
      ckEl.innerHTML=html||'<div style="color:var(--mut);font-style:italic;font-size:15px;">Keep logging bets to unlock per-question insights.</div>';
    }
  }
  const confEl=document.getElementById('st-conf-table');
  if(confEl){
    const confRows=[];
    for(let c=1;c<=5;c++){
      const cb=disciplineSet.filter(b=>(b.conf||3)===c);
      if(!cb.length)continue;
      const cW=cb.filter(b=>b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'))).length;
      const cSt=cb.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
      const cP=cb.reduce((a,b)=>a+(pnl(b)||0),0);
      const cROI=cSt>0?(cP/cSt*100):0;
      const confLabels=['—','Speculative','Interested','Solid','Strong','Best Bet'];
      confRows.push({c,lbl:confLabels[c],n:cb.length,sr:(cW/cb.length*100),p:cP,roi:cROI});
    }
    confEl.innerHTML=confRows.length?'<table style="width:100%;font-size:15px;border-collapse:collapse;">'
      +'<thead><tr>'
      +'<th style="text-align:left;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">Level</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">Bets</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">SR%</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">P&L</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">ROI</th>'
      +'</tr></thead><tbody>'
      +confRows.map(r=>'<tr><td style="padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);">'
        +'<span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:13px;color:var(--gld);">'+r.c+'</span> '+r.lbl+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:var(--mut);">'+r.n+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);">'+r.sr.toFixed(0)+'%</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.p>=0?'var(--grn)':'var(--red)')+';">'+fmt(r.p)+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.roi>=0?'var(--grn)':'var(--red)')+';">'+Math.round(r.roi)+'%</td></tr>').join('')
      +'</tbody></table>'
      :'<div style="color:var(--mut);font-style:italic;font-size:15px;">Not enough data.</div>';
  }

  // ── Bet type ROI ──
  const typeEl=document.getElementById('st-type-table');
  if(typeEl){
    const types=['win','ew','place'];const typeLabels={win:'Win',ew:'Each Way',place:'Place'};
    typeEl.innerHTML=types.map(t=>{
      const tb=disciplineSet.filter(b=>b.betType===t);if(!tb.length)return'';
      const tp=tb.reduce((a,b)=>a+(pnl(b)||0),0);
      const ts=tb.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
      const roi=ts>0?(tp/ts*100):0;
      return'<div class="srow"><span class="srl">'+typeLabels[t]+'<span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:12px;color:var(--mut);margin-left:6px;">x'+tb.length+'</span></span>'
        +'<span class="srv" style="display:flex;gap:12px;align-items:center;">'
        +'<span style="color:var(--mut);font-size:13px;">ROI '+Math.round(roi)+'%</span>'
        +'<span style="color:'+(tp>=0?'var(--grn)':'var(--red)')+';">'+fmt(tp)+'</span></span></div>';
    }).join('')||'<div style="color:var(--mut);font-style:italic;font-size:15px;">Not enough data.</div>';
  }

  // ── Track / Course table ──
  (function(){
    const el=document.getElementById('st-trk');if(!el)return;
    const map={};
    disciplineSet.forEach(function(b){
      const k=(b.track||'Unknown').trim();
      if(!map[k])map[k]={n:0,wins:0,places:0,p:0,staked:0};
      map[k].n++;
      map[k].staked+=(parseFloat(b.stake)||0);
      map[k].p+=(pnl(b)||0);
      if(b.result==='win')map[k].wins++;
      else if(b.result==='place'||b.result==='placed')map[k].places++;
    });
    const rows=Object.entries(map)
      .map(function([k,v]){return{k,n:v.n,wins:v.wins,places:v.places,p:v.p,staked:v.staked,sr:v.n>0?((v.wins+v.places)/v.n*100):0};})
      .sort(function(a,b){return b.n-a.n;});
    if(!rows.length){el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Not enough data.</div>';return;}
    const TH='text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);';
    el.style.maxHeight='280px';el.style.overflowY='auto';
    el.innerHTML='<table style="width:100%;font-size:14px;border-collapse:collapse;">'
      +'<thead><tr>'
      +'<th style="text-align:left;'+TH+'">Course</th>'
      +'<th style="'+TH+'">Bets</th>'
      +'<th style="'+TH+'">W</th>'
      +'<th style="'+TH+'">P</th>'
      +'<th style="'+TH+'">SR%</th>'
      +'<th style="'+TH+'">P&L</th>'
      +'</tr></thead><tbody>'
      +rows.map(function(r){
        const bd='padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);';
        const srCol=r.sr>=20?'var(--grn)':r.sr>=10?'var(--gld)':r.n>=4?'var(--red)':'var(--mut)';
        return'<tr>'
          +'<td style="'+bd+'max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+r.k+'">'+r.k+'</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;'+bd+'color:var(--mut);">'+r.n+'</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;'+bd+'color:#4ade80;font-weight:700;">'+r.wins+'</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;'+bd+'color:#fbbf24;font-weight:700;">'+r.places+'</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;'+bd+'color:'+srCol+';font-weight:700;">'+r.sr.toFixed(0)+'%</td>'
          +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;'+bd+'color:'+(r.p>=0?'var(--grn)':'var(--red)')+';">'+fmt(r.p)+'</td>'
        +'</tr>';
      }).join('')
      +'</tbody></table>';
  })();

  // ── Jockey + Trainer tables (combined real + virtual) ──
  const allBets=disciplineSet;
  function personTable(id, key){
    const el=document.getElementById(id);if(!el)return;
    const map={};
    allBets.forEach(b=>{
      const k=(b[key]||'').trim();if(!k)return;
      if(!map[k])map[k]={p:0,n:0,staked:0,w:0};
      const p2=(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0);
      map[k].p+=p2;map[k].n++;map[k].staked+=(parseFloat(b.stake)||0);
      const isWin=b.result==='win';
      const isPlace=b.result==='place'&&(b.betType==='ew'||b.betType==='place');
      if(isWin||isPlace)map[k].w++;
    });
    const rows=Object.entries(map).filter(([,v])=>v.n>=1)
      .map(([k,v])=>({k,roi:v.staked>0?v.p/v.staked*100:0,p:v.p,n:v.n,sr:v.w/v.n*100}))
      .sort((a,b)=>b.roi-a.roi);
    if(!rows.length){el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">No data yet — add jockey/trainer when logging bets.</div>';return;}
    el.style.maxHeight='220px';el.style.overflowY='auto';
    el.innerHTML='<table style="width:100%;font-size:14px;border-collapse:collapse;">'
      +'<thead><tr>'
      +'<th style="text-align:left;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Name</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Bets</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">SR%</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">P&L</th>'
      +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">ROI</th>'
      +'</tr></thead><tbody>'
      +rows.map(r=>'<tr>'
        +'<td style="padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+r.k+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:var(--mut);">'+r.n+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);">'+r.sr.toFixed(0)+'%</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:'+(r.p>=0?'var(--grn)':'var(--red)')+';">'+fmt(r.p)+'</td>'
        +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:'+(r.roi>=0?'var(--grn)':'var(--red)')+';">'+Math.round(r.roi)+'%</td>'
        +'</tr>').join('')
      +'</tbody></table>';
  }
  personTable('st-jockey','jockey');
  personTable('st-trainer','trainer');
  const monthEl=document.getElementById('st-monthly');
  if(monthEl){
    const months={};disciplineSet.forEach(b=>{const m=b.date?b.date.slice(0,7):'?';months[m]=(months[m]||0)+(pnl(b)||0);});
    const mArr=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
    if(!mArr.length){monthEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Not enough data.</div>';}
    else{
      const maxV=Math.max(...mArr.map(([,v])=>Math.abs(v)),1);
      monthEl.innerHTML='<div style="display:flex;align-items:flex-end;gap:6px;height:120px;padding-bottom:22px;">'
        +mArr.map(([m,v])=>{
          const h=Math.max(4,(Math.abs(v)/maxV*72));
          const isPos=v>=0;
          const valLabel=fmt(v).replace('+','');
          return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;cursor:default;height:100%;" title="'+m+': '+fmt(v)+'">'
            +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:8px;font-weight:700;color:'+(isPos?'var(--grn)':'var(--red)')+';margin-bottom:3px;white-space:nowrap;text-align:center;">'+(isPos?'+':'')+valLabel+'</div>'
            +'<div style="width:100%;height:'+h+'px;background:'+(isPos?'var(--grn)':'var(--red)')+';border-radius:3px 3px 0 0;min-width:8px;"></div>'
            +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:8px;color:var(--mut);transform:rotate(-45deg);white-space:nowrap;margin-top:5px;">'+m.slice(5)+'</div>'
          +'</div>';
        }).join('')
      +'</div>';
    }
  }
  // Real vs Virtual comparison — only shown in Both mode and NOT own study
  const dcblk2=document.getElementById('d-compare-blk');
  if(dcblk2) dcblk2.style.display=(scope==='both'&&!ownStudyOnly)?'block':'none';
  if(scope==='both'&&!ownStudyOnly){
    renderCompare(
      D.bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr')
    );
  }
  // By Source block — hidden in own study mode
  const srcBlk=document.getElementById('st-src-table');
  if(srcBlk){
    const srcParent=srcBlk.closest('.blk');
    if(srcParent) srcParent.style.display=ownStudyOnly?'none':'block';
  }

  // Checklist analysis
  renderCkImpact(disciplineSet);
  renderCkSignals(disciplineSet);
  renderCkTip();

  // Store rendered output in cache
  const cacheEls={};
  _STATS_ELS.forEach(id=>{const el=document.getElementById(id);if(el)cacheEls[id]=el.innerHTML;});
  _statsCache={key:_statsCacheKey(),els:cacheEls};
}

// ─── CHECKLIST IMPACT (score bands + compliance + trend) ───
function renderCkImpact(set){
  const el=document.getElementById('st-ck-impact');
  if(!el)return;

  const allBetsWithCk=set.filter(function(b){return b.checklistAnswers&&Object.keys(b.checklistAnswers).length>0;});
  const allBets=set;
  const totalBets=allBets.length;
  const ckBets=allBetsWithCk.length;
  const compliancePct=totalBets>0?Math.round(ckBets/totalBets*100):0;

  if(totalBets===0){el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">No bets yet.</div>';return;}

  // ── Compliance banner ──
  const compCol=compliancePct>=80?'var(--grn)':compliancePct>=50?'var(--gld)':'var(--red)';
  let html='<div style="display:flex;gap:10px;margin-bottom:16px;">'
    +'<div style="flex:1;background:var(--sur2);border:1px solid var(--bdr);border-radius:10px;padding:12px 14px;text-align:center;">'
      +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:24px;font-weight:700;color:'+compCol+';">'+compliancePct+'%</div>'
      +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-top:3px;">Checklist Used</div>'
    +'</div>';

  // Average score for checklist bets
  if(ckBets>0){
    const avgScore=Math.round(allBetsWithCk.reduce(function(a,b){return a+(b.checklistScore||0);},0)/ckBets);
    const scoreCol=avgScore>=75?'var(--grn)':avgScore>=50?'var(--gld)':'var(--red)';
    html+='<div style="flex:1;background:var(--sur2);border:1px solid var(--bdr);border-radius:10px;padding:12px 14px;text-align:center;">'
      +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:24px;font-weight:700;color:'+scoreCol+';">'+avgScore+'</div>'
      +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-top:3px;">Avg Score</div>'
    +'</div>';
  }
  html+='</div>';

  // ── Score bands ──
  const bands=[
    {label:'High Discipline',min:75,max:100,col:'#22c55e'},
    {label:'Solid Process',  min:50,max:74, col:'#84cc16'},
    {label:'Below Par',      min:25,max:49, col:'#f97316'},
    {label:'Rushed / Low',   min:0, max:24, col:'#ef4444'},
  ];

  const bandData=bands.map(function(band){
    const bb=allBetsWithCk.filter(function(b){
      const s=b.checklistScore||0;
      return s>=band.min&&s<=band.max;
    });
    const n=bb.length;
    const wins=bb.filter(function(b){return b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'));}).length;
    const staked=bb.reduce(function(a,b){return a+(parseFloat(b.stake)||0);},0);
    const pl=bb.reduce(function(a,b){return a+(pnl(b)||0);},0);
    const roi=staked>0?(pl/staked*100):0;
    const sr=n>0?(wins/n*100):0;
    return Object.assign({},band,{n,wins,staked,pl,roi,sr});
  });

  const maxAbs=Math.max.apply(null,bandData.map(function(b){return Math.abs(b.pl);}),1);

  if(ckBets<3){
    html+='<div style="color:var(--mut);font-style:italic;font-size:15px;">Log more checklist bets to unlock score band analysis.</div>';
    el.innerHTML=html;return;
  }

  html+='<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:8px;">Score Band Performance</div>';
  html+=bandData.map(function(b){
    if(!b.n)return'';
    const barW=Math.abs(b.pl)/maxAbs*100;
    const barCol=b.pl>=0?'var(--grn)':'var(--red)';
    return'<div style="margin-bottom:12px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">'
        +'<span style="font-size:14px;font-weight:700;color:'+b.col+';">'+b.label+'</span>'
        +'<span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:12px;color:var(--mut);">'+b.min+'–'+b.max+' score · '+b.n+' bet'+(b.n!==1?'s':'')+'</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:70px 1fr 60px 60px;gap:0;align-items:center;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:13px;margin-bottom:3px;">'
        +'<div style="color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.06em;">P&amp;L</div>'
        +'<div style="background:var(--sur2);border-radius:3px;height:8px;overflow:hidden;">'
          +'<div style="width:'+barW.toFixed(1)+'%;height:100%;background:'+barCol+';border-radius:3px;transition:width .4s;"></div>'
        +'</div>'
        +'<div style="text-align:right;color:'+barCol+';">'+fmt(b.pl)+'</div>'
        +'<div style="text-align:right;color:var(--mut);">ROI '+b.roi.toFixed(0)+'%</div>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--mut);">SR: '+b.sr.toFixed(0)+'%</div>'
    +'</div>';
  }).join('');

  // ── Month-by-month average score trend ──
  const monthScores={};
  allBetsWithCk.forEach(function(b){
    const m=b.date?b.date.slice(0,7):'?';
    if(!monthScores[m])monthScores[m]={total:0,n:0};
    monthScores[m].total+=(b.checklistScore||0);
    monthScores[m].n++;
  });
  const mArr=Object.entries(monthScores).sort(function(a,b){return a[0].localeCompare(b[0]);}).slice(-6);
  if(mArr.length>=2){
    const maxScore=100;
    html+='<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin:16px 0 8px;">Avg Discipline Score by Month</div>';
    html+='<div style="display:flex;align-items:flex-end;gap:6px;height:60px;padding-bottom:20px;">';
    html+=mArr.map(function(e){
      const avg=Math.round(e[1].total/e[1].n);
      const h=Math.max(4,(avg/maxScore*50));
      const col=avg>=75?'#22c55e':avg>=50?'#84cc16':'#f97316';
      return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;" title="'+e[0]+': avg '+avg+'">'
        +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:8px;color:var(--mut);">'+avg+'</div>'
        +'<div style="width:100%;height:'+h+'px;background:'+col+';border-radius:3px 3px 0 0;min-width:8px;"></div>'
        +'<div style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:8px;color:var(--mut);transform:rotate(-45deg);white-space:nowrap;margin-top:4px;">'+e[0].slice(5)+'</div>'
      +'</div>';
    }).join('');
    html+='</div>';
    // Trend signal
    const first=Math.round(mArr[0][1].total/mArr[0][1].n);
    const last=Math.round(mArr[mArr.length-1][1].total/mArr[mArr.length-1][1].n);
    const diff=last-first;
    if(Math.abs(diff)>=5){
      html+='<div style="font-size:14px;color:'+(diff>0?'var(--grn)':'var(--red)')+';margin-top:4px;">'
        +(diff>0?'▲ Discipline improving (+'+diff+' pts over period)':'▼ Discipline declining ('+diff+' pts over period)')
      +'</div>';
    }
  }

  el.innerHTML=html;
}

// ─── KEY DISCIPLINE SIGNALS ───
// Prominent visual cards for the questions most directly linked to discipline:
// time before race, video replays, research depth, price assessment, impulse check.
function renderCkSignals(set){
  const el=document.getElementById('st-ck-signals');
  if(!el)return;
  const ckBets=set.filter(function(b){return b.checklistAnswers&&Object.keys(b.checklistAnswers).length>0;});
  if(ckBets.length<3){
    el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Log more checklist bets to unlock these signals.</div>';
    return;
  }

  // Helper — stats for a subset
  function ss(bb){
    if(!bb||!bb.length)return null;
    const st=bb.reduce(function(a,b){return a+(parseFloat(b.stake)||0);},0);
    const p=bb.reduce(function(a,b){return a+(pnl(b)||0);},0);
    const w=bb.filter(function(b){return b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'));}).length;
    return{n:bb.length,sr:st>0?(w/bb.length*100):0,pl:p,roi:st>0?(p/st*100):0};
  }

  // Helper — render a single signal card with rows of bands
  function signalCard(title, icon, rows){
    // rows: [{label, bets, col}]
    const stats=rows.map(function(r){return{label:r.label,col:r.col,s:ss(r.bets)};}).filter(function(r){return r.s&&r.s.n>0;});
    if(!stats.length)return'';
    const maxAbs=Math.max.apply(null,stats.map(function(r){return Math.abs(r.s.pl);}),0.01);
    return'<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:12px;padding:14px;margin-bottom:12px;">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">'
        +'<span style="font-size:18px;">'+icon+'</span>'
        +'<span style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:14px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);">'+title+'</span>'
      +'</div>'
      +stats.map(function(r){
        const barW=Math.abs(r.s.pl)/maxAbs*100;
        const barCol=r.s.pl>=0?'var(--grn)':'var(--red)';
        const roiCol=r.s.roi>=0?'var(--grn)':'var(--red)';
        return'<div style="margin-bottom:10px;">'
          +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">'
            +'<span style="font-size:14px;font-weight:700;color:'+r.col+';">'+r.label+'</span>'
            +'<span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:12px;color:var(--mut);">'+r.s.n+' bet'+(r.s.n!==1?'s':'')+' · SR '+r.s.sr.toFixed(0)+'%</span>'
          +'</div>'
          +'<div style="display:flex;align-items:center;gap:8px;">'
            +'<div style="flex:1;background:var(--sur);border-radius:3px;height:7px;overflow:hidden;">'
              +'<div style="width:'+barW.toFixed(1)+'%;height:100%;background:'+barCol+';border-radius:3px;transition:width .5s;"></div>'
            +'</div>'
            +'<span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:13px;color:'+barCol+';min-width:52px;text-align:right;">'+fmt(r.s.pl)+'</span>'
            +'<span style="font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:13px;color:'+roiCol+';min-width:52px;text-align:right;">'+Math.round(r.s.roi)+'%</span>'
          +'</div>'
        +'</div>';
      }).join('')
      // Insight line — compare best vs worst band
      +(function(){
        if(stats.length<2)return'';
        const best=stats.slice().sort(function(a,b){return b.s.roi-a.s.roi;})[0];
        const worst=stats.slice().sort(function(a,b){return a.s.roi-b.s.roi;})[0];
        if(best.label===worst.label)return'';
        const diff=best.s.roi-worst.s.roi;
        if(Math.abs(diff)<5)return'';
        return'<div style="margin-top:8px;padding:7px 10px;background:rgba(232,228,220,.06);border-radius:7px;font-size:13px;color:var(--txt);line-height:1.5;">'
          +'<strong style="color:'+best.col+';">'+best.label+'</strong> outperforms <strong style="color:'+worst.col+';">'+worst.label+'</strong> by <strong>'+diff.toFixed(0)+'% ROI</strong>'
        +'</div>';
      })()
    +'</div>';
  }

  let html='';

  // ── 1. Time before race ──
  const timeBets=ckBets.filter(function(b){return b.checklistAnswers['time-of-day']!=null;});
  html+=signalCard('Time Before Race','⏱️',[
    {label:'2h+ before',       bets:timeBets.filter(function(b){return b.checklistAnswers['time-of-day']==='2h+ before';}),             col:'#22c55e'},
    {label:'1–2h before',      bets:timeBets.filter(function(b){return b.checklistAnswers['time-of-day']==='1–2h before';}),            col:'#84cc16'},
    {label:'20–60 mins',       bets:timeBets.filter(function(b){return b.checklistAnswers['time-of-day']==='20–60 mins';}),             col:'#f97316'},
    {label:'Under 20 mins',    bets:timeBets.filter(function(b){return b.checklistAnswers['time-of-day']==='Under 20 mins / race starting';}), col:'#ef4444'},
  ]);

  // ── 2. Video replay ──
  const vidBets=ckBets.filter(function(b){return b.checklistAnswers['video']!=null;});
  html+=signalCard('Video Replay Watched','🎬',[
    {label:'Watched a replay', bets:vidBets.filter(function(b){return b.checklistAnswers['video']==='yes';}), col:'#22c55e'},
    {label:'No replay watched',bets:vidBets.filter(function(b){return b.checklistAnswers['video']==='no';}),  col:'#ef4444'},
  ]);

  // ── 3. Research depth ──
  const rtBets=ckBets.filter(function(b){return b.checklistAnswers['research-time']!=null;});
  html+=signalCard('Research Depth','🔍',[
    {label:'Deep study',   bets:rtBets.filter(function(b){return b.checklistAnswers['research-time']==='Deep study';}),   col:'#22c55e'},
    {label:'30+ mins',     bets:rtBets.filter(function(b){return b.checklistAnswers['research-time']==='30+ mins';}),     col:'#84cc16'},
    {label:'10–15 mins',   bets:rtBets.filter(function(b){return b.checklistAnswers['research-time']==='10–15 mins';}),   col:'#f97316'},
    {label:'Quick glance', bets:rtBets.filter(function(b){return b.checklistAnswers['research-time']==='Quick glance';}), col:'#ef4444'},
  ]);

  // ── 4. Price assessment ──
  const priceBets=ckBets.filter(function(b){return b.checklistAnswers['price']!=null;});
  html+=signalCard('Price Assessment','💰',[
    {label:'Value',    bets:priceBets.filter(function(b){return b.checklistAnswers['price']==='Value';}),    col:'#22c55e'},
    {label:'Fair',     bets:priceBets.filter(function(b){return b.checklistAnswers['price']==='Fair';}),     col:'#84cc16'},
    {label:'Marginal', bets:priceBets.filter(function(b){return b.checklistAnswers['price']==='Marginal';}), col:'#f97316'},
    {label:'Forced',   bets:priceBets.filter(function(b){return b.checklistAnswers['price']==='Forced';}),   col:'#ef4444'},
  ]);

  // ── 5. Impulse check ──
  const whyBets=ckBets.filter(function(b){return b.checklistAnswers['why']!=null;});
  html+=signalCard('Why You Placed the Bet','🧠',[
    {label:'Planned',   bets:whyBets.filter(function(b){return b.checklistAnswers['why']==='Planned';}),   col:'#22c55e'},
    {label:'Spotted it',bets:whyBets.filter(function(b){return b.checklistAnswers['why']==='Spotted it';}),col:'#84cc16'},
    {label:'Tipster',   bets:whyBets.filter(function(b){return b.checklistAnswers['why']==='Tipster';}),   col:'#f97316'},
    {label:'Impulse',   bets:whyBets.filter(function(b){return b.checklistAnswers['why']==='Impulse';}),   col:'#ef4444'},
  ]);

  el.innerHTML=html||'<div style="color:var(--mut);font-style:italic;font-size:15px;">No checklist data yet.</div>';
}

// ─── TIP CHECKLIST PER-QUESTION ANALYSIS ───
function renderCkTip(){
  const el=document.getElementById('st-ck-tip');
  if(!el)return;

  // Tip bets = bets where source is NOT "Own Form Study" and checklist answers have tip- keys
  const scope=window._statsScope||'both';
  const vbBets=getVBank().bets;
  const allBets=scope==='real'?D.bets:scope==='virt'?vbBets:[...D.bets,...vbBets];
  const tipBets=allBets.filter(function(b){
    return b.checklistAnswers&&Object.keys(b.checklistAnswers).some(function(k){return k.startsWith('tip-');});
  });

  if(tipBets.length<3){
    el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:15px;">Log tip bets via the Tip checklist to unlock this analysis.</div>';
    return;
  }

  function tipStats(bb){
    if(!bb.length)return null;
    const st=bb.reduce(function(a,b){return a+(parseFloat(b.stake)||0);},0);
    const p=bb.reduce(function(a,b){return a+(pnl(b)||0);},0);
    const w=bb.filter(function(b){return b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'));}).length;
    return{n:bb.length,sr:bb.length>0?(w/bb.length*100):0,p,roi:st>0?(p/st*100):0};
  }

  const tipQuestions=[
    {id:'tip-source-record',label:"Respected source record"},
    {id:'tip-form-check',   label:"Checked form independently"},
    {id:'tip-reason',       label:"Understood the angle"},
    {id:'tip-price',        label:"Price was acceptable"},
    {id:'tip-field',        label:"Checked the whole field"},
    {id:'tip-conviction',   label:"Had own conviction"},
    {id:'tip-chasing',      label:"Not chasing a loss"},
    {id:'tip-stake',        label:"Same stake as own picks"},
  ];

  const thead='<table style="width:100%;font-size:14px;border-collapse:collapse;">'
    +'<thead><tr>'
    +'<th style="text-align:left;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Check</th>'
    +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Yes</th>'
    +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">SR%</th>'
    +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">ROI</th>'
    +'<th style="text-align:right;font-family:Barlow Condensed,Arial Narrow,sans-serif;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">No ROI</th>'
    +'</tr></thead><tbody>';

  const rows=tipQuestions.map(function(q){
    const answered=tipBets.filter(function(b){return b.checklistAnswers[q.id]!=null;});
    if(!answered.length)return'';
    const yes=answered.filter(function(b){return b.checklistAnswers[q.id]==='yes';});
    const no=answered.filter(function(b){return b.checklistAnswers[q.id]==='no';});
    const ys=tipStats(yes),ns=tipStats(no);
    return'<tr>'
      +'<td style="padding:7px 0 7px;border-bottom:1px solid var(--bdr);font-size:13px;max-width:130px;line-height:1.3;">'+q.label+'</td>'
      +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid var(--bdr);color:var(--mut);">'+(ys?ys.n:'—')+'</td>'
      +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid var(--bdr);">'+(ys?ys.sr.toFixed(0)+'%':'—')+'</td>'
      +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid var(--bdr);color:'+(ys?(ys.roi>=0?'var(--grn)':'var(--red)'):'var(--mut)')+';">'+(ys?yMath.round(s.roi)+'%':'—')+'</td>'
      +'<td style="font-family:Barlow Condensed,Arial Narrow,sans-serif;text-align:right;padding:7px 0;border-bottom:1px solid var(--bdr);color:'+(ns?(ns.roi>=0?'var(--grn)':'var(--red)'):'var(--mut)')+';">'+(ns?nMath.round(s.roi)+'%':'—')+'</td>'
    +'</tr>';
  }).join('');

  el.innerHTML=thead+rows+'</tbody></table>'
    +'<div style="font-size:13px;color:var(--mut);margin-top:8px;line-height:1.6;">Each row compares ROI when you answered Yes vs No on that check. A big gap means that discipline check matters.</div>';
}

// ─── CMD TAB ROUTER ───
function cTab(id,btn){document.querySelectorAll('.cpane').forEach(p=>p.classList.remove('on'));document.querySelectorAll('.ctab').forEach(b=>b.classList.remove('on'));document.getElementById('cp-'+id).classList.add('on');btn.classList.add('on');if(id==='hist')renderHist();if(id==='stats')renderStats();if(id==='rules')renderCmdRules();if(id==='set'){loadApiKeyField();loadStartBankField();loadRacingCredsFields();loadAILimitField();renderSettingsSources();}
  if(id==='cards'){rcInit();}}

// ─── EDIT MODAL ───
function openEM(id){
  const b=D.bets.find(x=>x.id===id);if(!b)return;
  _openModal(b,'real');
}
function openVEM(id){
  const vb=getVBank();const b=vb.bets.find(x=>x.id===id);if(!b)return;
  _openModal(b,'virt');
}
function _openModal(b,type){
  const isPending=!b.result||b.result==='pending';
  document.getElementById('emid').value=b.id;
  document.getElementById('emtype').value=type;
  const lbl=document.getElementById('em-type-lbl');
  if(lbl){lbl.textContent=type==='virt'?'Virtual Bet':'Real Bet';lbl.style.color=type==='virt'?'#fb923c':'var(--mut)';}
  document.getElementById('emttl').textContent=b.horse;
  const os=b.oddsDisplay||(b.odds||'—');
  document.getElementById('emsub').textContent=fdate(b.date)+(b.track?' · '+b.track:'')+(b.time?' · '+b.time:'')+' · '+os+' · '+fp(b.stake);
  const ff=document.getElementById('em-full-fields');
  if(ff)ff.style.display='block';
  document.getElementById('em-horse').value=b.horse||'';
  document.getElementById('em-track').value=b.track||'';
  document.getElementById('em-time').value=b.time||'';
  document.getElementById('em-odds').value=b.oddsDisplay||b.odds||'';
  document.getElementById('em-stake').value=b.stake||'';
  document.getElementById('em-type-sel').value=b.betType||'win';
  document.getElementById('em-jockey').value=b.jockey||'';
  document.getElementById('em-trainer').value=b.trainer||'';
  populateSourceDropdowns();
  document.getElementById('em-source').value=b.source||'Own Form Study';
  document.getElementById('em-prenotes').value=b.notes||'';
  document.getElementById('emres').value=b.result||'pending';
  document.getElementById('emret').value=b.returns||'';
  document.getElementById('emnotes').value=b.postNotes||'';
  const scr=document.getElementById('emod');scr.style.display='block';scr.scrollTop=0;
}
function closeEM(){
  document.getElementById('emod').style.display='none';
}
function saveEM(){
  const id=document.getElementById('emid').value;
  const isVirt=document.getElementById('emtype').value==='virt';
  const odRaw=document.getElementById('em-odds').value.trim();
  const od=fo(odRaw);
  const newStake=parseFloat(document.getElementById('em-stake').value)||0;
  const bt=document.getElementById('em-type-sel').value;
  const newRes=document.getElementById('emres').value;
  const newRet=parseFloat(document.getElementById('emret').value)||calcReturns(newRes,newStake||1,od||2,bt,'');
  const postNotes=document.getElementById('emnotes').value.trim();
  const horse=document.getElementById('em-horse').value.trim();
  const track=document.getElementById('em-track').value.trim();
  const time=document.getElementById('em-time').value.trim();
  const jockey=document.getElementById('em-jockey').value.trim();
  const trainer=document.getElementById('em-trainer').value.trim();
  const source=document.getElementById('em-source').value;
  const preNotes=document.getElementById('em-prenotes').value.trim();
  if(isVirt){
    const vb=getVBank();const b=vb.bets.find(x=>x.id===id);if(!b)return;
    const oldPending=!b.result||b.result==='pending';
    const oldStake=parseFloat(b.stake)||0;
    const oldReturnsV=parseFloat(b.returns)||0;
    // Step 1: fully reverse the current bank impact of this bet
    if(oldPending){
      // Pending: stake was deducted at logging, no returns applied
      vb.current=parseFloat((vb.current+oldStake).toFixed(2));
    } else if(b.result!=='nr'&&b.result!=='void'){
      // Settled: stake was deducted, returns were added
      vb.current=parseFloat((vb.current+oldStake-oldReturnsV).toFixed(2));
    }
    // Step 2: update bet fields
    if(horse)b.horse=horse;b.track=track;b.time=time;if(od>=1){b.odds=od;b.oddsDisplay=odRaw;}
    if(newStake>0)b.stake=newStake;b.betType=bt;b.jockey=jockey;b.trainer=trainer;b.source=source;b.notes=preNotes;
    b.result=newRes;b.returns=newRet;b.postNotes=postNotes;
    const finalStake=parseFloat(b.stake)||0;
    // Step 3: apply new bank impact
    if(!newRes||newRes==='pending'){
      // Still pending: deduct stake
      vb.current=parseFloat((vb.current-finalStake).toFixed(2));
    } else if(newRes!=='nr'&&newRes!=='void'){
      // Settled win/place/loss: deduct stake, add returns
      vb.current=parseFloat((vb.current-finalStake+newRet).toFixed(2));
    }
    // NR/void: returns = stake so net bank impact is zero (nothing to do)
    save();updHdr();closeEM();renderToday();renderVBMini();
    renderStats();renderHist();
    return;
  }
  const idx=D.bets.findIndex(x=>x.id===id);if(idx===-1)return;
  const b=D.bets[idx];
  const oldResult=b.result,oldReturns=b.returns;
  if(horse)b.horse=horse;b.track=track;b.time=time;if(od>=1){b.odds=od;b.oddsDisplay=odRaw;}
  if(newStake>0)b.stake=newStake;b.betType=bt;b.jockey=jockey;b.trainer=trainer;b.source=source;b.notes=preNotes;
  b.result=newRes;b.returns=newRet;b.postNotes=postNotes;
  applyBankDelta(b,oldResult,oldReturns);
  save();updHdr();closeEM();renderToday();renderNums();
  renderStats();renderHist();
}
function delBetEM(){
  if(!confirm('Delete this bet permanently?'))return;
  const id=document.getElementById('emid').value;
  const isVirt=document.getElementById('emtype').value==='virt';
  if(isVirt){
    const vb=getVBank();
    const bet=vb.bets.find(x=>x.id===id);
    if(bet){
      const isPending=!bet.result||bet.result==='pending';
      const outlay=(parseFloat(bet.stake)||0)*(bet.betType==='ew'?2:1);
      if(isPending){
        // Stake was pre-deducted on log — restore it
        vb.current=parseFloat(((vb.current||0)+outlay).toFixed(2));
      } else if(bet.result!=='nr'&&bet.result!=='void'){
        // Settled — reverse the P&L
        const betPnl=(parseFloat(bet.returns)||0)-outlay;
        vb.current=parseFloat(((vb.current||0)-betPnl).toFixed(2));
      }
    }
    vb.bets=vb.bets.filter(x=>x.id!==id);
  } else {
    const bet=D.bets.find(x=>x.id===id);
    if(bet){
      const isPending=!bet.result||bet.result==='pending';
      if(isPending&&bet.betBanked){
        // Stake was pre-deducted — restore it
        const outlay=ewOutlay(bet);
        D.bank.current=parseFloat(((D.bank.current||0)+outlay).toFixed(2));
      } else if(bet.betBanked&&bet.result&&bet.result!=='pending'&&bet.result!=='nr'&&bet.result!=='void'){
        // Settled — reverse the P&L
        const outlay=ewOutlay(bet);
        const betPnl=(parseFloat(bet.returns)||0)-outlay;
        D.bank.current=parseFloat(((D.bank.current||0)-betPnl).toFixed(2));
      }
    }
    D.bets=D.bets.filter(x=>x.id!==id);
  }
  save();updHdr();closeEM();renderVBMini();
  renderStats();renderHist();
}


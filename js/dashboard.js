// ─── DASHBOARD ─── cmd dashboard, history, stats, edit modal, tab router

// ─── CMD DASHBOARD ───
function renderDash(){} // Dashboard removed - stats is now the default tab

function renderCompare(set,p,roi,sr){
  const dc=document.getElementById('d-compare');
  const dcblk=document.getElementById('d-compare-blk');
  if(dc){
    const vb=getVBank();
    const vset=vb.bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='nr');
    const vStaked=vset.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
    const vRets=vset.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
    const vP=vRets-vStaked;
    const vROI=vStaked>0?(vP/vStaked*100):0;
    const vW=vset.filter(b=>b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'))).length;
    const vSR=vset.length>0?(vW/vset.length*100):0;
    const vBankDiff=vb.current-vb.start;

    if(!set.length&&!vset.length){
      dc.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">Log real and virtual bets to see the comparison.</div>';
      if(dcblk)dcblk.style.display='none';
    } else {
      if(dcblk)dcblk.style.display='block';
      // Grid: metric | real | virtual
      const rows=[
        ['P&L',fmt(p),fmt(vP),p,vP],
        ['ROI',roi.toFixed(1)+'%',vROI.toFixed(1)+'%',roi,vROI],
        ['Strike Rate',sr.toFixed(0)+'%',vSR.toFixed(0)+'%',sr,vSR],
        ['Bank Change',fmt(D.bank.current-(D.bank.start||0)),fmt(vBankDiff),D.bank.current-(D.bank.start||0),vBankDiff],
        ['Bets Settled',set.length+'',''+vset.length,0,0],
      ];
      let insight='';
      if(set.length>=3&&vset.length>=3){
        const diff=vROI-roi;
        if(diff>8)insight='🔍 Virtual ROI is beating real by '+diff.toFixed(0)+'% — you may be second-guessing yourself in real betting.';
        else if(diff<-8)insight='✅ Real ROI is beating virtual by '+Math.abs(diff).toFixed(0)+'% — real stakes are sharpening your decisions.';
        else insight='📊 Real and virtual performance are closely aligned — your process is consistent.';
      }
      dc.innerHTML='<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:0;border:1px solid var(--bdr);border-radius:9px;overflow:hidden;">'
        +'<div style="background:var(--sur2);padding:8px 12px;font-family:monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);border-bottom:1px solid var(--bdr);"></div>'
        +'<div style="background:rgba(96,165,250,.08);padding:8px 12px;font-family:monospace;font-size:10px;font-weight:700;color:var(--blu);text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);">Real 💷</div>'
        +'<div style="background:rgba(251,146,60,.12);padding:8px 12px;font-family:monospace;font-size:10px;font-weight:700;color:#fb923c;text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);">Virtual 📋</div>'
        +rows.map(function(r){
          const rWin=r.length>3&&r[3]>r[4],vWin=r.length>3&&r[4]>r[3];
          return'<div style="background:var(--sur2);padding:8px 12px;font-family:monospace;font-size:11px;color:var(--mut);border-bottom:1px solid var(--bdr);">'+r[0]+'</div>'
            +'<div style="padding:8px 12px;font-family:monospace;font-size:13px;font-weight:600;text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);color:'+(r.length>3?(r[3]>=0?'var(--grn)':'var(--red)'):'var(--txt)')+';">'
              +r[1]+(rWin?' ◀':'')
            +'</div>'
            +'<div style="padding:8px 12px;font-family:monospace;font-size:13px;font-weight:600;text-align:center;border-bottom:1px solid var(--bdr);border-left:1px solid var(--bdr);color:'+(r.length>3?(r[4]>=0?'#fb923c':'var(--red)'):'var(--txt)')+';">'
              +r[2]+(vWin?' ◀':'')
            +'</div>';
        }).join('')
        +'</div>'
        +(insight?'<div style="margin-top:10px;padding:9px 12px;background:rgba(232,228,220,.07);border:1px solid rgba(232,228,220,.15);border-radius:8px;font-size:13px;color:var(--txt);line-height:1.6;">'+insight+'</div>':'');
    }
  }
  }

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
        +'<div class="mm">'+pb.date+' · '+(pb.track||'—')+' · <span style="font-family:monospace;">'+pos+'</span> · '+fp(pb.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bpend">pending</span>'
        +'<div style="font-size:10px;color:var(--mut);margin-top:3px;font-family:monospace;">tap to update</div></div></div>';
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
  if(!filtered.length){listEl.innerHTML='<div class="es">No virtual bets match.</div>';return;}
  var bg={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
  var html='';
  for(var li=0;li<filtered.length;li++){
    var b=filtered[li];
    var p2=(b.result&&b.result!=='pending'&&b.result!=='nr')?(parseFloat(b.returns)||0)-(parseFloat(b.stake)||0):null;
    var os=b.oddsDisplay||(b.odds||'—');
    html+='<div class="mb '+(b.result||'pending')+'" data-id="'+b.id+'" data-virt="1" style="cursor:pointer;border-left-color:#fb923c;">'
      +'<div class="mbl"><div class="mh">'+b.horse+'</div>'
      +'<div class="mm">'+b.date+' · '+(b.track||'—')+' · <span style="font-family:monospace;">'+os+'</span></div>'
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
        +'<div class="mbl"><div class="mh">'+b.horse+'</div><div class="mm">'+b.date+' · '+b.track+' · <span style="font-family:monospace;">'+os+'</span> · '+fp(b.stake)+'</div></div>'
        +'<div class="mbr"><span class="bdg bpend">pending</span><div style="font-size:10px;color:var(--mut);margin-top:3px;font-family:monospace;">tap to update</div></div></div>';
    }).join(''):'';
  }
  // Filtered list
  const rf=(document.getElementById('hfr')||{value:''}).value;
  const sf=(document.getElementById('hfs')||{value:''}).value.toLowerCase();
  let bets=[...D.bets].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(rf)bets=bets.filter(b=>b.result===rf);
  if(sf)bets=bets.filter(b=>(b.horse||'').toLowerCase().includes(sf)||(b.track||'').toLowerCase().includes(sf));
  const cnt=document.getElementById('hcnt');if(cnt)cnt.textContent=bets.length+' bet'+(bets.length!==1?'s':'');
  const listEl=document.getElementById('hist-list');if(!listEl)return;
  if(!bets.length){listEl.innerHTML='<div class="es">No bets match.</div>';return;}
  const bg={win:'bw1',place:'bp1',loss:'bl1',pending:'bpend',void:'bnr',nr:'bnr'};
  listEl.innerHTML=bets.map(b=>{
    const p2=pnl(b),os=b.oddsDisplay||(b.odds||'—');
    return'<div class="mb '+(b.result||'pending')+'" onclick="openEM(\''+b.id+'\')" style="cursor:pointer;">'
      +'<div class="mbl">'
        +'<div class="mh">'+b.horse+'</div>'
        +'<div class="mm">'+b.date+' · '+b.track+' · <span style="font-family:monospace;">'+os+'</span></div>'
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
function toggleOwnStudy(){
  window._ownStudyOnly=!window._ownStudyOnly;
  const btn=document.getElementById('st-tog-own');
  if(btn){btn.textContent='Own Study Only: '+(window._ownStudyOnly?'On':'Off');btn.style.background=window._ownStudyOnly?'rgba(232,228,220,.15)':'transparent';btn.style.color=window._ownStudyOnly?'var(--gld)':'var(--mut)';btn.style.borderColor=window._ownStudyOnly?'var(--gld)':'var(--bdr)';}
  renderStats();
}

function setStatsScope(scope){
  window._statsScope=scope;
  const cfg={real:'#60a5fa',virt:'#fb923c',both:'var(--gld)'};
  ['real','virt','both'].forEach(function(s){
    const el=document.getElementById('st-tog-'+s);if(!el)return;
    const active=s===scope;
    el.style.background=active?cfg[s]:'transparent';
    el.style.color=active?'#141414':'var(--mut)';
    el.style.fontWeight=active?'700':'400';
  });
  renderStats();
}

function renderStats(){
  const scope=window._statsScope||'both';
  const vbBets=getVBank().bets.filter(function(b){return b.result&&b.result!=='pending'&&b.result!=='nr';});
  const realBets=D.bets.filter(function(b){return b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr';});
  const set=scope==='real'?realBets:scope==='virt'?vbBets:[...realBets,...vbBets.map(function(b){return Object.assign({},b,{_virt:true});})];
  const wins=set.filter(b=>b.result==='win');
  const places=set.filter(b=>b.result==='place'&&(b.betType==='ew'||b.betType==='place'));
  const staked=set.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
  const rets=set.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
  const p=rets-staked,roi=staked>0?(p/staked*100):0;
  const sr=set.length>0?((wins.length+places.length)/set.length*100):0;
  const avg=set.length>0?set.reduce((a,b)=>a+(parseFloat(b.odds)||0),0)/set.length:0;
  const ownStudyOnly=window._ownStudyOnly||false;
  const OWN_SOURCES=['Own Form Study'];
  const disciplineSet=ownStudyOnly?set.filter(b=>OWN_SOURCES.includes(b.source||'')):set;

  // If the selected scope has no bets, show empty state
  if(!set.length){
    const scopeLabel=scope==='real'?'real':scope==='virt'?'virtual':'settled';
    ['st-insights-body','st-src-table','st-conf-table','st-type-table','st-monthly','st-trk','st-ck-table','st-jockey','st-trainer'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">No '+scopeLabel+' bets settled yet.</div>';
    });
    const dc=document.getElementById('d-compare');
    const dcblk=document.getElementById('d-compare-blk');
    if(dc)dc.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">Log real and virtual bets to see the comparison.</div>';
    if(dcblk)dcblk.style.display='none';
    return;
  }

  // ── Auto-observations ──
  const insights=[];
  // Virtual vs Real comparison — only in 'both' mode
  if(scope==='both'){
    const vBets2=getVBank().bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='nr');
    if(vBets2.length>=3&&realBets.length>=3){
      const vSt=vBets2.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
      const vRet=vBets2.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
      const vROI=vSt>0?((vRet-vSt)/vSt*100):0;
      const rSt=realBets.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
      const rRet=realBets.reduce((a,b)=>a+(parseFloat(b.returns)||0),0);
      const rROI=rSt>0?((rRet-rSt)/rSt*100):0;
      const diff=vROI-rROI;
      if(diff>8)insights.push('🟢 <strong>Virtual ROI ('+vROI.toFixed(1)+'%) is beating real ('+rROI.toFixed(1)+'%) by '+diff.toFixed(0)+'%.</strong> You may be second-guessing yourself in real betting.');
      else if(diff<-8)insights.push('💰 Real ROI ('+rROI.toFixed(1)+'%) is beating virtual ('+vROI.toFixed(1)+'%) by '+Math.abs(diff).toFixed(0)+'%. Real money focus sharpens your decisions.');
      else insights.push('📊 Virtual and real closely aligned ('+vROI.toFixed(1)+'% vs '+rROI.toFixed(1)+'% ROI). Process is consistent.');
    }
  }
  // Best source
  const srcMap={};set.forEach(b=>{const k=b.source||'Unknown';if(!srcMap[k])srcMap[k]={p:0,n:0,staked:0};srcMap[k].p+=(pnl(b)||0);srcMap[k].n++;srcMap[k].staked+=(parseFloat(b.stake)||0);});
  const srcArr=Object.entries(srcMap).filter(([,v])=>v.n>=2).map(([k,v])=>({k,roi:v.staked>0?v.p/v.staked*100:0,p:v.p,n:v.n}));
  if(srcArr.length>1){
    srcArr.sort((a,b)=>b.roi-a.roi);
    const best=srcArr[0],worst=srcArr[srcArr.length-1];
    if(best.roi>0)insights.push('✅ <strong style="color:var(--grn);">'+best.k+'</strong> is your best source — ROI of '+best.roi.toFixed(1)+'% from '+best.n+' bets.');
    if(worst.roi<-10)insights.push('⚠️ <strong style="color:var(--red);">'+worst.k+'</strong> is costing you — ROI of '+worst.roi.toFixed(1)+'% from '+worst.n+' bets. Consider cutting it.');
  }
  // Confidence calibration
  const highConf=disciplineSet.filter(b=>b.conf>=4),lowConf=disciplineSet.filter(b=>b.conf<=2);
  if(highConf.length>=3&&lowConf.length>=3){
    const hcROI=highConf.reduce((a,b)=>a+(pnl(b)||0),0)/highConf.reduce((a,b)=>a+(parseFloat(b.stake)||0),1)*100;
    const lcROI=lowConf.reduce((a,b)=>a+(pnl(b)||0),0)/lowConf.reduce((a,b)=>a+(parseFloat(b.stake)||0),1)*100;
    if(hcROI>lcROI+10)insights.push('🎯 High-confidence bets (4-5) outperform low-confidence by '+(hcROI-lcROI).toFixed(0)+'% ROI. Back your convictions more.');
    else if(lcROI>hcROI+10)insights.push('🤔 Your lower-confidence bets are actually outperforming high-confidence by '+(lcROI-hcROI).toFixed(0)+'% ROI. Are you overthinking your best bets?');
    else insights.push('📊 No significant difference between high and low confidence ROI yet. Keep logging.');
  }
  // Chasing pattern — consecutive losses followed by big stake
  const recent=[...D.bets].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,10);
  let consLosses=0;for(const b of recent){if(b.result==='loss')consLosses++;else if(b.result&&b.result!=='pending')break;}
  if(consLosses>=3)insights.push('🚨 You\'re on <strong style="color:var(--red);">'+consLosses+' consecutive losses</strong>. This is the highest-risk time for chasing. Step back before the next bet.');
  // Bet frequency
  const today=disciplineSet.filter(b=>b.date===td()).length;
  if(today>=4)insights.push('⏱️ '+today+' settled bets today. Volume is your enemy — quality over quantity.');
  // Avg odds insight
  if(avg>8)insights.push('💡 Your average odds are '+avg.toFixed(1)+'. At this level you need a 12%+ strike rate to profit. Make sure your form study supports this.');
  else if(avg<2.5)insights.push('💡 Average odds of '+avg.toFixed(1)+' — backing short-priced horses. Strike rate needs to be very high (40%+) to show profit.');

  const iBody=document.getElementById('st-insights-body');
  if(iBody)iBody.innerHTML=insights.length?insights.map(i=>'<div style="padding:7px 0;border-bottom:1px solid var(--bdr);line-height:1.6;">'+i+'</div>').join(''):'<div style="color:var(--mut);font-style:italic;">Looking good — no major concerns in your current data.</div>';

  // ── Source leaderboard ──
  const srcEl=document.getElementById('st-src-table');
  if(srcEl){
    const rows=srcArr.sort((a,b)=>b.p-a.p);
    if(!rows.length){srcEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">Not enough data.</div>';}
    else{srcEl.innerHTML='<table style="width:100%;font-size:13px;border-collapse:collapse;">'
      +'<thead><tr><th style="text-align:left;font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">Source</th>'
      +'<th style="font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);text-align:right;">Bets</th>'
      +'<th style="font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);text-align:right;">P&L</th>'
      +'<th style="font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);text-align:right;">ROI</th></tr></thead><tbody>'
      +rows.map(r=>'<tr><td style="padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);">'+r.k+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:var(--mut);">'+r.n+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.p>=0?'var(--grn)':'var(--red)')+';">'+fmt(r.p)+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.roi>=0?'var(--grn)':'var(--red)')+';">'+r.roi.toFixed(1)+'%</td></tr>').join('')
      +'</tbody></table>';}
  }

  // ── Checklist score vs outcome ──
  const ckEl=document.getElementById('st-ck-table');
  if(ckEl){
    const bands=[{lbl:'0–5 (Low)',min:0,max:5},{lbl:'6–8 (Partial)',min:6,max:8},{lbl:'9–11 (Strong)',min:9,max:11}];
    const allCkBets=disciplineSet.filter(b=>b.checklistScore!=null);
    if(allCkBets.length<3){ckEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">Log more bets via the Pre-Bet checklist to unlock this insight.</div>';}
    else{ckEl.innerHTML='<table style="width:100%;font-size:12px;border-collapse:collapse;">'
      +'<thead><tr>'
      +'<th style="text-align:left;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Score</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Bets</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">SR%</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">P&L</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">ROI</th>'
      +'</tr></thead><tbody>'
      +bands.map(function(band){
        const bb=allCkBets.filter(b=>b.checklistScore>=band.min&&b.checklistScore<=band.max);
        if(!bb.length)return'<tr><td style="padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);">'+band.lbl+'</td><td colspan="4" style="text-align:center;font-style:italic;color:var(--mut);padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);">no data</td></tr>';
        const bst=bb.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
        const bp=bb.reduce((a,b)=>a+((parseFloat(b.returns)||0)-(parseFloat(b.stake)||0)),0);
        const bw=bb.filter(b=>b.result==='win'||(b.result==='place'&&(b.betType==='ew'||b.betType==='place'))).length;
        const bsr=bb.length>0?(bw/bb.length*100):0;
        const broi=bst>0?(bp/bst*100):0;
        const col=band.min>=9?'rgba(38,168,101,.08)':band.min>=6?'rgba(232,228,220,.06)':'rgba(196,58,58,.06)';
        return'<tr style="background:'+col+';">'
          +'<td style="padding:8px 0 8px 6px;border-bottom:1px solid rgba(28,50,80,.4);">'+band.lbl+'</td>'
          +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:var(--mut);">'+bb.length+'</td>'
          +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);">'+bsr.toFixed(0)+'%</td>'
          +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:'+(bp>=0?'var(--grn)':'var(--red)')+';">'+fmt(bp)+'</td>'
          +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:'+(broi>=0?'var(--grn)':'var(--red)')+';">'+broi.toFixed(1)+'%</td></tr>';
      }).join('')+'</tbody></table>';}
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
    confEl.innerHTML=confRows.length?'<table style="width:100%;font-size:13px;border-collapse:collapse;">'
      +'<thead><tr>'
      +'<th style="text-align:left;font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">Level</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">Bets</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">SR%</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">P&L</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--bdr);">ROI</th>'
      +'</tr></thead><tbody>'
      +confRows.map(r=>'<tr><td style="padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);">'
        +'<span style="font-family:monospace;font-size:11px;color:var(--gld);">'+r.c+'</span> '+r.lbl+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:var(--mut);">'+r.n+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);">'+r.sr.toFixed(0)+'%</td>'
        +'<td style="font-family:monospace;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.p>=0?'var(--grn)':'var(--red)')+';">'+fmt(r.p)+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:8px 0;border-bottom:1px solid rgba(28,50,80,.5);color:'+(r.roi>=0?'var(--grn)':'var(--red)')+';">'+r.roi.toFixed(1)+'%</td></tr>').join('')
      +'</tbody></table>'
      :'<div style="color:var(--mut);font-style:italic;font-size:13px;">Not enough data.</div>';
  }

  // ── Bet type ROI ──
  const typeEl=document.getElementById('st-type-table');
  if(typeEl){
    const types=['win','ew','place'];const typeLabels={win:'Win',ew:'Each Way',place:'Place'};
    typeEl.innerHTML=types.map(t=>{
      const tb=set.filter(b=>b.betType===t);if(!tb.length)return'';
      const tp=tb.reduce((a,b)=>a+(pnl(b)||0),0);
      const ts=tb.reduce((a,b)=>a+(parseFloat(b.stake)||0),0);
      const roi=ts>0?(tp/ts*100):0;
      return'<div class="srow"><span class="srl">'+typeLabels[t]+'<span style="font-family:monospace;font-size:10px;color:var(--mut);margin-left:6px;">x'+tb.length+'</span></span>'
        +'<span class="srv" style="display:flex;gap:12px;align-items:center;">'
        +'<span style="color:var(--mut);font-size:11px;">ROI '+roi.toFixed(1)+'%</span>'
        +'<span style="color:'+(tp>=0?'var(--grn)':'var(--red)')+';">'+fmt(tp)+'</span></span></div>';
    }).join('')||'<div style="color:var(--mut);font-style:italic;font-size:13px;">Not enough data.</div>';
  }

  // ── Track bar chart ──
  function bar(id,data){const el=document.getElementById(id);if(!el)return;if(!Object.keys(data).length){el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">Not enough data.</div>';return;}const mx=Math.max(...Object.values(data).map(Math.abs),1);el.innerHTML=Object.entries(data).map(([k,v])=>{const pct=Math.abs(v)/mx*100,neg=v<0,lbl=(v>=0?'+£':'-£')+Math.abs(v).toFixed(2);return'<div class="brow"><div class="blbl" title="'+k+'">'+String(k).slice(0,14)+'</div><div class="btrk"><div class="bfil '+(neg?'nb':'pb')+'" style="width:'+pct.toFixed(1)+'%;"><span class="bval">'+lbl+'</span></div></div></div>';}).join('');}
  const tkD={};set.forEach(b=>{const k=b.track||'Unknown';tkD[k]=(tkD[k]||0)+(pnl(b)||0);});
  bar('st-trk',Object.fromEntries(Object.entries(tkD).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8)));

  // ── Jockey + Trainer tables (combined real + virtual) ──
  const allBets=set; // set already contains the right scope (real/virtual/both)
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
      .sort((a,b)=>b.p-a.p).slice(0,8);
    if(!rows.length){el.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">No data yet — add jockey/trainer when logging bets.</div>';return;}
    el.innerHTML='<table style="width:100%;font-size:12px;border-collapse:collapse;">'
      +'<thead><tr>'
      +'<th style="text-align:left;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Name</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">Bets</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">SR%</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">P&L</th>'
      +'<th style="text-align:right;font-family:monospace;font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em;padding:0 0 7px;border-bottom:1px solid var(--bdr);">ROI</th>'
      +'</tr></thead><tbody>'
      +rows.map(r=>'<tr>'
        +'<td style="padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+r.k+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:var(--mut);">'+r.n+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);">'+r.sr.toFixed(0)+'%</td>'
        +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:'+(r.p>=0?'var(--grn)':'var(--red)')+';">'+fmt(r.p)+'</td>'
        +'<td style="font-family:monospace;text-align:right;padding:7px 0;border-bottom:1px solid rgba(28,50,80,.4);color:'+(r.roi>=0?'var(--grn)':'var(--red)')+';">'+r.roi.toFixed(1)+'%</td>'
        +'</tr>').join('')
      +'</tbody></table>';
  }
  personTable('st-jockey','jockey');
  personTable('st-trainer','trainer');
  const monthEl=document.getElementById('st-monthly');
  if(monthEl){
    const months={};set.forEach(b=>{const m=b.date?b.date.slice(0,7):'?';months[m]=(months[m]||0)+(pnl(b)||0);});
    const mArr=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
    if(!mArr.length){monthEl.innerHTML='<div style="color:var(--mut);font-style:italic;font-size:13px;">Not enough data.</div>';}
    else{monthEl.innerHTML='<div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding-bottom:24px;position:relative;">'
      +mArr.map(([m,v])=>{const maxV=Math.max(...mArr.map(([,v])=>Math.abs(v)),1);const h=Math.max(4,(Math.abs(v)/maxV*70));const isPos=v>=0;return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:default;" title="'+m+': '+fmt(v)+'">'
        +'<div style="width:100%;height:'+h+'px;background:'+(isPos?'var(--grn)':'var(--red)')+';border-radius:3px 3px 0 0;min-width:8px;"></div>'
        +'<div style="font-family:monospace;font-size:8px;color:var(--mut);transform:rotate(-45deg);white-space:nowrap;margin-top:4px;">'+m.slice(5)+'</div>'
        +'</div>';}).join('')+'</div>';
    }
  }
  // Real vs Virtual comparison — at the bottom of stats
  renderCompare(
    D.bets.filter(b=>b.result&&b.result!=='pending'&&b.result!=='void'&&b.result!=='nr'),
    p, roi, sr
  );
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
  document.getElementById('emsub').textContent=b.date+(b.track?' · '+b.track:'')+(b.time?' · '+b.time:'')+' · '+os+' · '+fp(b.stake);
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
  document.getElementById('em-source').value=b.source||'Own Form Study';
  document.getElementById('em-prenotes').value=b.notes||'';
  document.getElementById('emres').value=b.result||'pending';
  document.getElementById('emret').value=b.returns||'';
  document.getElementById('emnotes').value=b.postNotes||'';
  document.getElementById('emod').classList.add('open');
}
function closeEM(){
  document.getElementById('emod').classList.remove('open');
  const lbl=document.getElementById('em-type-lbl');if(lbl)lbl.style.color='var(--mut)';
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
function closeEM(){document.getElementById('emod').classList.remove('open');}
function delBetEM(){
  if(!confirm('Delete this bet permanently?'))return;
  const id=document.getElementById('emid').value;
  const isVirt=document.getElementById('emtype').value==='virt';
  if(isVirt){
    const vb=getVBank();
    const bet=vb.bets.find(x=>x.id===id);
    // Reverse virtual bank delta
    if(bet&&bet.result&&bet.result!=='pending'&&bet.result!=='nr'){
      const outlay=(parseFloat(bet.stake)||0)*(bet.betType==='ew'?2:1);
      const betPnl=(parseFloat(bet.returns)||0)-outlay;
      vb.current=parseFloat(((vb.current||0)-betPnl).toFixed(2));
    }
    vb.bets=vb.bets.filter(x=>x.id!==id);
  } else {
    const bet=D.bets.find(x=>x.id===id);
    // Reverse real bank delta if it was already banked
    if(bet&&bet.betBanked&&bet.result&&bet.result!=='pending'&&bet.result!=='nr'&&bet.result!=='void'){
      const outlay=ewOutlay(bet);
      const betPnl=(parseFloat(bet.returns)||0)-outlay;
      D.bank.current=parseFloat(((D.bank.current||0)-betPnl).toFixed(2));
    }
    D.bets=D.bets.filter(x=>x.id!==id);
  }
  save();updHdr();closeEM();renderVBMini();
  renderStats();renderHist();
}
document.getElementById('emod').addEventListener('click',e=>{if(e.target===e.currentTarget)closeEM();});


// ─── CHECKLISTS ───

function seedRules(){
  if(!D.rules||!D.rules.length){D.rules=["Never chase a loss.","Bet with the form, not with hope."];save();}
  if(!Array.isArray(D.cksOwn)||D.cksOwn.length===0){D.cksOwn=CKS_OWN.map(c=>({...c}));save();}
  if(!Array.isArray(D.cksTip)||D.cksTip.length===0){D.cksTip=CKS_TIP.map(c=>({...c}));save();}
}

function renderCmdRules(){
  seedRules();
  const el=document.getElementById('cp-rules');
  if(!el)return;
  el.innerHTML=
    '<div class="ptitle">Checklists</div>'
    +'<div class="psub">Edit your pre-bet checklists. Changes apply immediately in the bet flow.</div>'
    +'<div style="display:flex;flex-direction:column;gap:16px;">'
      +_cksSection('own','🔍 Own Study Checklist','#60a5fa',D.cksOwn)
      +_cksSection('tip','💬 Other Sources Checklist','#e879f9',D.cksTip)
    +'</div>';
}

function _cksSection(type,title,col,items){
  const rows=items.map(function(item,i){
    return '<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:10px;padding:12px 14px;margin-bottom:8px;">'
      +'<div style="display:flex;align-items:flex-start;gap:10px;">'
        +'<div style="flex:1;min-width:0;">'
          +'<input id="cks-t-'+type+'-'+i+'" value="'+_esc(item.t)+'" oninput="_cksDirty()" '
            +'style="width:100%;box-sizing:border-box;background:transparent;border:none;border-bottom:1px solid var(--bdr);color:var(--txt);font-size:13px;font-weight:600;padding:2px 0 4px;margin-bottom:6px;outline:none;">'
          +'<input id="cks-s-'+type+'-'+i+'" value="'+_esc(item.s)+'" oninput="_cksDirty()" '
            +'style="width:100%;box-sizing:border-box;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.06);color:var(--mut);font-size:11px;font-style:italic;padding:2px 0 4px;outline:none;">'
        +'</div>'
        +'<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">'
          +(i>0?'<button onclick="_cksMoveItem(\''+type+'\','+i+',-1)" style="background:transparent;border:none;color:var(--mut);cursor:pointer;font-size:13px;padding:2px 5px;">↑</button>':'<span style="width:24px;display:block;height:21px;"></span>')
          +(i<items.length-1?'<button onclick="_cksMoveItem(\''+type+'\','+i+',1)" style="background:transparent;border:none;color:var(--mut);cursor:pointer;font-size:13px;padding:2px 5px;">↓</button>':'<span style="width:24px;display:block;height:21px;"></span>')
          +'<button onclick="_cksDelItem(\''+type+'\','+i+')" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:2px 5px;">×</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');

  return '<div class="blk">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">'
      +'<div style="font-size:15px;font-weight:700;color:var(--txt);">'+title+'</div>'
      +'<span style="font-family:monospace;font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid '+col+';color:'+col+';">'+items.length+' items</span>'
    +'</div>'
    +rows
    +'<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">'
      +'<button onclick="_cksAddItem(\''+type+'\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:7px 14px;border-radius:8px;border:1px solid '+col+';background:transparent;color:'+col+';cursor:pointer;">+ Add Item</button>'
      +'<button id="cks-save-'+type+'" onclick="_cksSave(\''+type+'\')" style="font-family:monospace;font-size:10px;font-weight:700;padding:7px 14px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur2);color:var(--mut);cursor:pointer;transition:all .2s;">Save Changes</button>'
      +'<span id="cks-status-'+type+'" style="font-family:monospace;font-size:11px;color:var(--grn);align-self:center;"></span>'
    +'</div>'
  +'</div>';
}

function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}

function _cksDirty(){
  ['own','tip'].forEach(function(t){
    const btn=document.getElementById('cks-save-'+t);
    if(btn){btn.style.background='rgba(96,165,250,.1)';btn.style.color='#60a5fa';btn.style.borderColor='#60a5fa';}
  });
}

function _cksReadItems(type){
  const list=type==='own'?D.cksOwn:D.cksTip;
  return list.map(function(_,i){
    const t=(document.getElementById('cks-t-'+type+'-'+i)||{}).value||''
    const s=(document.getElementById('cks-s-'+type+'-'+i)||{}).value||''
    return{t:t.trim(),s:s.trim()};
  }).filter(function(c){return c.t;});
}

function _cksSave(type){
  const items=_cksReadItems(type);
  if(type==='own')D.cksOwn=items;else D.cksTip=items;
  save();
  renderCmdRules();
  setTimeout(function(){
    const st=document.getElementById('cks-status-'+type);
    if(st){st.textContent='✓ Saved';setTimeout(function(){if(st)st.textContent='';},2500);}
  },50);
}

function _cksAddItem(type){
  const items=_cksReadItems(type);
  items.push({t:'New check',s:'Describe what to verify'});
  if(type==='own')D.cksOwn=items;else D.cksTip=items;
  save();renderCmdRules();
  setTimeout(function(){
    const inp=document.getElementById('cks-t-'+type+'-'+(items.length-1));
    if(inp){inp.select();inp.focus();}
  },60);
}

function _cksDelItem(type,i){
  if(!confirm('Remove this checklist item?'))return;
  const items=_cksReadItems(type);
  items.splice(i,1);
  if(type==='own')D.cksOwn=items;else D.cksTip=items;
  save();renderCmdRules();
}

function _cksMoveItem(type,i,dir){
  const items=_cksReadItems(type);
  const j=i+dir;if(j<0||j>=items.length)return;
  const tmp=items[i];items[i]=items[j];items[j]=tmp;
  if(type==='own')D.cksOwn=items;else D.cksTip=items;
  save();renderCmdRules();
}

function renderSwRules(){}
function addRule(){}
function delRule(){}

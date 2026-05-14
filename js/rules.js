// ─── RULES ───

// ─── RULES ───
function seedRules(){if(!D.rules||!D.rules.length){D.rules=["Never chase a loss. Each bet must stand on its own merits.","Bet with the form, not with hope. Every selection needs an articulatable edge.","Maximum 2% of current bank per single bet. <strong>5-star selections only</strong> may go to 3%.","Shop for best odds every time. Never accept the first price.","Do not bet in races with fewer than 5 runners unless graded/listed.","No betting after 9pm. Fatigue ruins decisions.","Keep a post-race note on every selection — the review is where the learning happens.","Handicaps: check weight carried, OR ceiling, and whether the horse is unexposed (+).","Trainer & jockey stats for the course/going matter — context is everything.","Monthly review: ROI, best/worst categories. Adjust, don't react."];save();}}
function rlHtml(rules){return rules.map((r,i)=>`<div class="ri"><div class="rn">${i+1}</div><div class="rt">${r}</div><button onclick="delRule(${i})" style="background:transparent;border:none;color:var(--mut);font-size:16px;cursor:pointer;padding:0 3px;opacity:.5;align-self:flex-start;">×</button></div>`).join('');}
function renderSwRules(){/* removed panel */}
function renderCmdRules(){seedRules();const el=document.getElementById('rls-cmd');if(el)el.innerHTML=rlHtml(D.rules);}
function addRule(src){const id=src==='cmd'?'rlinp-cmd':'rlinp-sw';const inp=document.getElementById(id);const v=inp.value.trim();if(!v)return;D.rules.push(v);save();inp.value='';renderSwRules();renderCmdRules();}
function delRule(i){if(!confirm('Remove this rule?'))return;D.rules.splice(i,1);save();renderSwRules();renderCmdRules();}

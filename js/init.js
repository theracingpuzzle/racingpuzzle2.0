// ─── INIT ─── runs after all other modules are loaded (must be last script tag)

load();
setTimeout(function(){ if (typeof _supaPing === 'function') _supaPing(); }, 800);

// Record today's visit for streak tracking
(function recordVisit() {
  D.dailyLog = D.dailyLog || [];
  if (!D.dailyLog.find(function(d){ return d.date === td(); })) {
    D.dailyLog.push({date:td(), visited:true, checkedIn:false, mood:'neutral', notes:'', tracks:[], createdAt:Date.now()});
    try { localStorage.setItem(SK, JSON.stringify(D)); } catch(e) {}
  }
})();

bldDots();
goTo(0, true);
updHdr();
renderPrebet();
renderToday();
rfrTL();
renderChips();
seedRules();

const _cd = document.getElementById('cdate');
if (_cd) _cd.value = td();

const it = getTracks();
if (it.length === 1) {
  const _lbt = document.getElementById('lbt');
  if (_lbt) _lbt.value = it[0];
}

// Auto-navigate to Coach if API key set and no brief today
if (getApiKey() && localStorage.getItem('re-brief-date') !== td()) {
  setTimeout(() => goTo(3, false), 600);
}

// ─── SUPABASE PING ───
function _supaPing() {
  if (!SUPA_URL || !SUPA_ANON) return;
  const dot = document.getElementById('supa-dot');
  if (dot) { dot.style.background = '#f59e0b'; dot.title = 'Supabase: connecting...'; }
  fetch(SUPA_URL + '/rest/v1/profiles?limit=1', {
    headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
  }).then(function(r) {
    const dot = document.getElementById('supa-dot');
    if (r.ok) {
      if (dot) { dot.style.background = '#34d399'; dot.title = 'Supabase: connected ✅'; }
    } else {
      if (dot) { dot.style.background = '#ef4444'; dot.title = 'Supabase: error ' + r.status; }
    }
  }).catch(function(e) {
    const dot = document.getElementById('supa-dot');
    if (dot) { dot.style.background = '#ef4444'; dot.title = 'Supabase: ' + e.message; }
  });
}

function enterApp() {
  const s = document.getElementById('splash');
  s.style.transition = 'opacity .35s ease';
  s.style.opacity = '0';
  setTimeout(function(){ s.style.display = 'none'; }, 360);
}

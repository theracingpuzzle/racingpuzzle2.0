// ─── INIT ─── boot sequence — Supabase loads before app renders

load(); // load localStorage immediately (offline fallback)
bldDots();

// ─── STARTUP: pull Supabase first, then enter app ───
(async function boot() {
  const dot = document.getElementById('supa-dot');
  const splash = document.getElementById('splash');
  const splashStatus = document.getElementById('splash-status');

  // Show loading state on splash
  if (splashStatus) {
    splashStatus.textContent = 'Syncing your data…';
    splashStatus.style.display = 'block';
  }

  if (SUPA_URL && SUPA_ANON) {
    if (dot) { dot.style.background = '#f59e0b'; dot.title = 'Supabase: syncing...'; }
    try {
      await supaLoad(); // pull latest from Supabase — overwrites localStorage
      if (dot) { dot.style.background = '#34d399'; dot.title = 'Supabase: synced ✅'; }
      // Cache credentials to localStorage so they survive offline / new device
      if (D.settings && D.settings.racingCreds) {
        const rc = typeof D.settings.racingCreds === 'string' ? JSON.parse(D.settings.racingCreds) : D.settings.racingCreds;
        if (rc.username && rc.password) localStorage.setItem(RACING_CREDS_KEY, JSON.stringify(rc));
      }
      if (D.settings && D.settings.apiKey) {
        localStorage.setItem(COACH_KEY_STORE, D.settings.apiKey);
      }
    } catch(e) {
      // Offline or error — continue with localStorage data
      if (dot) { dot.style.background = '#f59e0b'; dot.title = 'Supabase: offline'; }
    }
  }

  // Hide splash status
  if (splashStatus) splashStatus.style.display = 'none';

  // Now render with correct data
  goTo(0, true);
  updHdr();
  renderToday();
  renderBkCard();
  if(typeof renderCmdRules==='function')renderCmdRules();
  rfrTL();
  renderChips();
  seedRules();
  renderSourceDropdowns();

  const _cd = document.getElementById('cdate');
  if (_cd) _cd.value = td();

  const it = getTracks();
  if (it.length === 1) {
    const _lbt = document.getElementById('lbt');
    if (_lbt) _lbt.value = it[0];
  }

  // Pre-fetch today's meetings so watchlist/edge alerts show on Today
  // without requiring the user to visit the Races card first
  setTimeout(function(){
    if(typeof loadTodayMeetings === 'function') loadTodayMeetings();
  }, 800);
})();

// ─── SUPABASE PING (settings test button) ───
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
  // Refresh header and bank display once app is visible
  updHdr();
  renderBkCard();
}

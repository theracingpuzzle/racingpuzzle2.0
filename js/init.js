// ─── INIT ─── boot sequence — Auth → Supabase → App render

load(); // load localStorage immediately (offline fallback)
bldDots();

// ── Main boot ─────────────────────────────────────────────────────────────────
// Called after auth confirms a valid session (or on login success)
async function bootApp() {
  const dot          = document.getElementById('supa-dot');
  const splashStatus = document.getElementById('splash-status');

  if (splashStatus) { splashStatus.textContent = 'Syncing your data…'; splashStatus.style.display = 'block'; }

  if (SUPA_URL && SUPA_ANON && SUPA_USER_ID) {
    if (dot) { dot.style.background = '#f59e0b'; dot.title = 'Supabase: syncing...'; }
    try {
      await supaLoad();
      if (dot) { dot.style.background = '#34d399'; dot.title = 'Supabase: synced ✅'; }
      if (D.settings && D.settings.racingCreds) {
        const rc = typeof D.settings.racingCreds === 'string' ? JSON.parse(D.settings.racingCreds) : D.settings.racingCreds;
        if (rc.username && rc.password) localStorage.setItem(RACING_CREDS_KEY, JSON.stringify(rc));
      }
      if (D.settings && D.settings.apiKey) {
        localStorage.setItem(COACH_KEY_STORE, D.settings.apiKey);
      }
    } catch(e) {
      if (dot) { dot.style.background = '#f59e0b'; dot.title = 'Supabase: offline'; }
    }
  }

  if (splashStatus) splashStatus.style.display = 'none';

  // Show the signed-in user email in settings (if element exists)
  const emailEl = document.getElementById('auth-user-email');
  if (emailEl && window._rpUserEmail) emailEl.textContent = window._rpUserEmail;

  goTo(0, true);
  updHdr();
  renderToday();
  renderBkCard();
  if (typeof renderCmdRules === 'function') renderCmdRules();
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

  setTimeout(function() {
    if (typeof loadTodayMeetings === 'function') loadTodayMeetings();
  }, 800);
}

// ── Auth-first startup ─────────────────────────────────────────────────────────
(async function startup() {
  try {
    const hasSession = await authInit();
    if (hasSession) {
      // Already logged in — go straight to app
      await bootApp();
    } else {
      // No session — show login screen, hide splash enter button
      authShowLogin();
      // Show splash without the Enter button while login is visible
      const enterBtn = document.querySelector('#splash button');
      if (enterBtn) enterBtn.style.display = 'none';
    }
  } catch(e) {
    console.error('[Auth] init failed:', e.message);
    // Auth unavailable — fall back to showing app with local data
    await bootApp();
  }
})();

// ─── SUPABASE PING (settings test button) ───
function _supaPing() {
  if (!SUPA_URL || !SUPA_ANON) return;
  const dot = document.getElementById('supa-dot');
  if (dot) { dot.style.background = '#f59e0b'; dot.title = 'Supabase: connecting...'; }
  fetch(SUPA_URL + '/rest/v1/profiles?limit=1', {
    headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + (window._rpAccessToken || SUPA_ANON) }
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
  setTimeout(function() { s.style.display = 'none'; }, 360);
  updHdr();
  renderBkCard();
}

// ─── INIT ─── boot sequence — Auth → Supabase → App render

load(); // load localStorage immediately (offline fallback)
bldDots();

// ── Main boot ─────────────────────────────────────────────────────────────────
// Called after auth confirms a valid session (or on login success)
async function bootApp() {
  const dot          = document.getElementById('supa-dot');
  const splashStatus = document.getElementById('splash-status');

  if (SUPA_URL && SUPA_ANON && SUPA_USER_ID) {
    if (splashStatus) splashStatus.textContent = 'Syncing your data…';
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

  // Show user initial in the header profile button
  if (window._rpUserEmail) {
    const btn = document.getElementById('hdr-profile-btn');
    if (btn) {
      const initial = window._rpUserEmail.charAt(0).toUpperCase();
      btn.innerHTML = '<span style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:14px;font-weight:900;color:var(--gld2);">' + initial + '</span>';
    }
  }

  goTo(0, true);
  updHdr();
  renderToday();
  renderBkCard();
  if (typeof renderCmdRules === 'function') renderCmdRules();
  rfrTL();
  renderChips();
  seedRules();
  if (typeof renderSources === 'function') renderSources();

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

  // Load league memberships in the background so the trophy button
  // shows on racecards without needing to visit the Leagues card first
  setTimeout(function() {
    if (typeof lgLoad === 'function' && !_lgLoaded) lgLoad();
  }, 1500);

  // Show onboarding for new users — after data loaded so we can detect empty state
  if (typeof obMaybeShow === 'function') obMaybeShow();

}

// ── Auth-first startup ─────────────────────────────────────────────────────────
(async function startup() {
  try {
    const hasSession = await authInit();
    if (hasSession) {
      await bootApp();
    } else {
      authShowLogin();
    }
  } catch(e) {
    console.error('[Auth] init failed:', e.message);
    // Try to render with whatever local data we have
    try { await bootApp(); } catch(e2) { console.error('[Boot] failed:', e2.message); }
  } finally {
    // Always dismiss the splash — no matter what happened above
    const _splash = document.getElementById('splash');
    if (_splash) _splash.style.display = 'none';
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
  if (!s) return;
  s.style.display = 'none';
  updHdr();
  renderBkCard();
}

// ─── AUTH ─── Supabase Auth — session management, sign in/up/out
// Uses the Supabase JS client (loaded via CDN) purely for auth.
// All data REST calls stay in supabase.js but use the user's JWT
// via window._rpAccessToken instead of the anon key.

let _rpAuthClient = null;
let _rpSession    = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Called from init.js before anything else. Returns true if a session exists.
async function authInit() {
  _rpAuthClient = window.supabase.createClient(SUPA_URL, SUPA_ANON, {
    auth: {
      persistSession:   true,
      autoRefreshToken: true,
      storageKey:       'rp-auth-session'
    }
  });

  // Keep window._rpAccessToken in sync whenever the token refreshes
  _rpAuthClient.auth.onAuthStateChange(function(event, session) {
    _rpSession = session;
    if (session) {
      SUPA_USER_ID           = session.user.id;
      window._rpAccessToken  = session.access_token;
      window._rpUserEmail    = session.user.email;
      // Save push subscription now that we have a valid token and user ID
      if (typeof notifSavePushSubscription === 'function' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        notifSavePushSubscription();
      }
    } else {
      window._rpAccessToken  = null;
      window._rpUserEmail    = null;
    }
    // When Supabase redirects back after password reset, event = 'PASSWORD_RECOVERY'
    if (event === 'PASSWORD_RECOVERY') {
      authShowResetForm();
    }
  });

  // Check for a password-recovery hash in the URL (#type=recovery&access_token=...)
  // Supabase embeds these as URL fragments which the client SDK picks up automatically.
  const hash = window.location.hash || '';
  if (hash.includes('type=recovery')) {
    // Let the SDK parse the fragment and fire PASSWORD_RECOVERY via onAuthStateChange
    // We just need a session from the fragment — getSession() handles it.
    const { data } = await _rpAuthClient.auth.getSession();
    if (data && data.session) {
      _rpSession             = data.session;
      SUPA_USER_ID           = data.session.user.id;
      window._rpAccessToken  = data.session.access_token;
      window._rpUserEmail    = data.session.user.email;
    }
    authShowResetForm();
    return false; // don't boot the app yet — user must set password first
  }

  const { data } = await _rpAuthClient.auth.getSession();
  if (data && data.session) {
    _rpSession             = data.session;
    SUPA_USER_ID           = data.session.user.id;
    window._rpAccessToken  = data.session.access_token;
    window._rpUserEmail    = data.session.user.email;
    return true;          // already logged in
  }
  return false;           // no session — caller shows login screen
}

// ── Sign in ───────────────────────────────────────────────────────────────────
async function authSignIn(email, password) {
  const { data, error } = await _rpAuthClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  SUPA_USER_ID           = data.session.user.id;
  window._rpAccessToken  = data.session.access_token;
  window._rpUserEmail    = data.session.user.email;
  return data.session;
}

// ── Sign up ───────────────────────────────────────────────────────────────────
async function authSignUp(email, password) {
  const { data, error } = await _rpAuthClient.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  // If email confirmation is disabled in Supabase, session is available immediately
  if (data.session) {
    SUPA_USER_ID           = data.session.user.id;
    window._rpAccessToken  = data.session.access_token;
    window._rpUserEmail    = data.session.user.email;
    return { session: data.session, needsConfirmation: false };
  }
  // Email confirmation required — session not yet active
  return { session: null, needsConfirmation: true, email };
}

// ── Sign out ──────────────────────────────────────────────────────────────────
async function authSignOut() {
  await _rpAuthClient.auth.signOut();
  SUPA_USER_ID           = null;
  window._rpAccessToken  = null;
  window._rpUserEmail    = null;
  // Clear local state and reload so login screen appears
  localStorage.removeItem('rp-auth-session');
  location.reload();
}

// ── UI helpers ────────────────────────────────────────────────────────────────
var _authCurrentMode = 'signin';

function authShowLogin() {
  const el = document.getElementById('auth-overlay');
  if (!el) return;
  el.style.display = 'flex';
  authGoHome();
}

function authHideLogin() {
  const el = document.getElementById('auth-overlay');
  if (el) el.style.display = 'none';
}

function authGoHome() {
  const home   = document.getElementById('auth-home');
  const form   = document.getElementById('auth-form-screen');
  if (home) home.style.display = 'flex';
  if (form) form.style.display = 'none';
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.textContent = '';
}

function authGoForm(mode) {
  const home = document.getElementById('auth-home');
  const form = document.getElementById('auth-form-screen');
  if (home) home.style.display = 'none';
  if (form) form.style.display = 'flex';
  authSetMode(mode || 'signin');
}

// ── Profile modal ─────────────────────────────────────────────────────────────
function profileOpen() {
  const overlay = document.getElementById('profile-overlay');
  if (!overlay) return;

  // Populate email + avatar initials
  const email    = window._rpUserEmail || '—';
  const emailEl  = document.getElementById('profile-email');
  const avatarEl = document.getElementById('profile-avatar');
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = email && email !== '—'
    ? email.charAt(0).toUpperCase()
    : '?';

  // Populate stats from global state D
  const betsEl     = document.getElementById('profile-stat-bets');
  const profilesEl = document.getElementById('profile-stat-profiles');
  const bankEl     = document.getElementById('profile-stat-bank');
  if (typeof D !== 'undefined') {
    if (betsEl)     betsEl.textContent     = (D.bets || []).length;
    if (profilesEl) profilesEl.textContent = (D.watchlist || []).length;
    if (bankEl) {
      const b = (D.bank && D.bank.current) || 0;
      bankEl.textContent = '£' + (b % 1 === 0 ? b : b.toFixed(0));
    }
  }

  // Always open on Account tab
  profileTab('account');
  overlay.style.display = 'flex';
}

function profileTab(tab) {
  const panels = { account: 'prof-panel-account', history: 'prof-panel-history' };
  const tabs   = { account: 'prof-tab-account',   history: 'prof-tab-history'   };
  Object.keys(panels).forEach(function(k) {
    const panel = document.getElementById(panels[k]);
    const btn   = document.getElementById(tabs[k]);
    const active = k === tab;
    if (panel) panel.style.display = active ? 'block' : 'none';
    if (btn) {
      btn.style.color       = active ? 'var(--navy)' : 'var(--mut)';
      btn.style.borderBottomColor = active ? 'var(--navy)' : 'transparent';
    }
  });
  // Render history when switching to it
  if (tab === 'history') {
    if (typeof renderHist === 'function') renderHist();
    if (typeof renderVirtHist === 'function' && document.getElementById('hist-virt-section') && document.getElementById('hist-virt-section').style.display !== 'none') renderVirtHist();
  }
}

function profileClose() {
  const overlay = document.getElementById('profile-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Form submit handler ───────────────────────────────────────────────────────
async function authSubmit(mode) {
  const email    = (document.getElementById('auth-email')   || {}).value.trim();
  const password = (document.getElementById('auth-password')|| {}).value;
  const errEl    = document.getElementById('auth-error');
  const btn      = document.getElementById('auth-submit-btn');

  if (!email || !password) {
    if (errEl) errEl.textContent = 'Please enter your email and password.';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…'; }
  if (errEl) errEl.textContent = '';

  try {
    if (mode === 'signup') {
      const result = await authSignUp(email, password);
      if (result.needsConfirmation) {
        // Email confirmation required — try signing in anyway (works if confirmation
        // is disabled in Supabase dashboard; fails gracefully if it is enabled)
        if (btn) btn.textContent = 'Signing in…';
        try {
          await authSignIn(email, password);
          // Sign-in worked — carry on into the app
        } catch(_) {
          // Confirmation genuinely required — tell the user
          if (errEl) { errEl.style.color = '#34d399'; errEl.textContent = 'Account created! Check your email to confirm, then sign in.'; }
          authSetMode('signin');
          return;
        }
      }
    } else {
      await authSignIn(email, password);
    }
    // Success — hide login overlay and boot straight into the app
    authHideLogin();
    await bootApp();
  } catch(e) {
    if (errEl) { errEl.style.color = '#ef4444'; errEl.textContent = e.message; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = mode === 'signup' ? 'Create Account' : 'Sign In'; }
  }
}

// ── Toggle between sign-in, sign-up and forgot-password ──────────────────────
function authSetMode(mode) {
  _authCurrentMode = mode;
  const isForgot = mode === 'forgot';
  const isSignup = mode === 'signup';
  const btn      = document.getElementById('auth-submit-btn');
  const toggle   = document.getElementById('auth-toggle-text');
  const forgotLk = document.getElementById('auth-forgot-link');
  const title    = document.getElementById('auth-title');
  const errEl    = document.getElementById('auth-error');
  const pwHint   = document.getElementById('auth-pw-hint');
  const pwField  = document.getElementById('auth-password');

  if (errEl)  errEl.textContent = '';

  if (isForgot) {
    if (title)   title.textContent    = 'Reset Password';
    if (btn)     btn.textContent      = 'Send Reset Email';
    if (btn)     btn.onclick          = function(){ authSendReset(); };
    if (toggle)  toggle.innerHTML     = '<a href="#" onclick="authSetMode(\'signin\');return false;" style="color:rgba(255,255,255,.35);text-decoration:none;">← Back to Sign In</a>';
    if (forgotLk) forgotLk.style.display = 'none';
    const tosHintF = document.getElementById('auth-tos-hint');
    if (tosHintF) tosHintF.style.display = 'none';
    const pwWrap = document.getElementById('auth-pw-wrap');
    if (pwWrap) pwWrap.style.display = 'none';
    if (pwHint)  pwHint.style.display = 'none';
    return;
  }

  // Restore password field if coming back from forgot
  const pwWrap2 = document.getElementById('auth-pw-wrap');
  if (pwWrap2) pwWrap2.style.display = '';

  if (btn)    btn.textContent      = isSignup ? 'Create Account' : 'Sign In';
  if (btn)    btn.onclick          = function(){ authSubmit(mode); };
  if (toggle) toggle.innerHTML     = isSignup
    ? 'Already have an account? <a href="#" onclick="authSetMode(\'signin\');return false;" style="color:var(--gld2);text-decoration:none;font-weight:700;">Sign in</a>'
    : 'New here? <a href="#" onclick="authSetMode(\'signup\');return false;" style="color:var(--gld2);text-decoration:none;font-weight:700;">Create an account</a>';
  if (title)  title.textContent    = isSignup ? 'Create Account' : 'Welcome Back';
  if (pwHint) pwHint.style.display = isSignup ? 'block' : 'none';
  if (forgotLk) forgotLk.style.display = isSignup ? 'none' : 'block';
  const tosHint = document.getElementById('auth-tos-hint');
  if (tosHint) tosHint.style.display = isSignup ? 'block' : 'none';
}

// ── Send password-reset email ─────────────────────────────────────────────────
async function authSendReset() {
  const emailEl = document.getElementById('auth-email');
  const errEl   = document.getElementById('auth-error');
  const btn     = document.getElementById('auth-submit-btn');
  const email   = (emailEl || {}).value.trim();

  if (!email) {
    if (errEl) errEl.textContent = 'Please enter your email address.';
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  if (errEl) errEl.textContent = '';

  try {
    const { error } = await _rpAuthClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw new Error(error.message);
    if (errEl) { errEl.style.color = '#34d399'; errEl.textContent = 'Reset email sent! Check your inbox.'; }
    if (btn)   { btn.disabled = false; btn.textContent = 'Resend Email'; }
  } catch(e) {
    if (errEl) { errEl.style.color = '#ef4444'; errEl.textContent = e.message; }
    if (btn)   { btn.disabled = false; btn.textContent = 'Send Reset Email'; }
  }
}

// ── Show the set-new-password overlay (after reset-link redirect) ─────────────
function authShowResetForm() {
  // Hide the normal auth overlay and any splash
  const authOv  = document.getElementById('auth-overlay');
  const splash  = document.getElementById('splash');
  const resetOv = document.getElementById('auth-reset-overlay');
  if (authOv)  authOv.style.display  = 'none';
  if (splash)  splash.style.display  = 'none';
  if (resetOv) resetOv.style.display = 'flex';
  // Clean the recovery hash from the URL bar without reloading
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

// ── Save the new password ─────────────────────────────────────────────────────
async function authSetNewPassword() {
  const pwEl   = document.getElementById('reset-password');
  const errEl  = document.getElementById('reset-error');
  const btn    = document.querySelector('#auth-reset-overlay button');
  const pw     = (pwEl || {}).value;

  if (!pw || pw.length < 6) {
    if (errEl) errEl.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Updating…'; }
  if (errEl) errEl.textContent = '';

  try {
    const { error } = await _rpAuthClient.auth.updateUser({ password: pw });
    if (error) throw new Error(error.message);
    // Success — password updated, session is active, boot the app
    const resetOv = document.getElementById('auth-reset-overlay');
    if (resetOv) resetOv.style.display = 'none';
    await bootApp();
  } catch(e) {
    if (errEl) { errEl.style.color = '#ef4444'; errEl.textContent = e.message; }
    if (btn)   { btn.disabled = false; btn.textContent = 'Update Password'; }
  }
}

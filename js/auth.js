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
    } else {
      window._rpAccessToken  = null;
      window._rpUserEmail    = null;
    }
  });

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
function authShowLogin() {
  const el = document.getElementById('auth-overlay');
  if (el) el.style.display = 'flex';
}

function authHideLogin() {
  const el = document.getElementById('auth-overlay');
  if (el) el.style.display = 'none';
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

// ── Toggle between sign-in and sign-up ────────────────────────────────────────
function authSetMode(mode) {
  const isSignup = mode === 'signup';
  const btn      = document.getElementById('auth-submit-btn');
  const toggle   = document.getElementById('auth-toggle-text');
  const title    = document.getElementById('auth-title');
  const errEl    = document.getElementById('auth-error');
  const pwHint   = document.getElementById('auth-pw-hint');
  if (btn)    btn.textContent      = isSignup ? 'Create Account' : 'Sign In';
  if (btn)    btn.onclick          = function(){ authSubmit(mode); };
  if (toggle) toggle.innerHTML     = isSignup
    ? 'Already have an account? <a href="#" onclick="authSetMode(\'signin\');return false;" style="color:var(--gld2);text-decoration:none;font-weight:700;">Sign in</a>'
    : 'New here? <a href="#" onclick="authSetMode(\'signup\');return false;" style="color:var(--gld2);text-decoration:none;font-weight:700;">Create an account</a>';
  if (title)  title.textContent    = isSignup ? 'Create Account' : 'Welcome Back';
  if (errEl)  errEl.textContent    = '';
  if (pwHint) pwHint.style.display = isSignup ? 'block' : 'none';
}

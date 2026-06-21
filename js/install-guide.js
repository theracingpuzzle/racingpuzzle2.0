// ─── PWA INSTALL GUIDE ────────────────────────────────────────────────────────
// Shows platform-specific instructions for adding the app to the home screen.
// Auto-shown once after first login. Re-accessible from Settings → Data.

const _IG_KEY = 'rp-install-guide-seen';

// ── Platform detection ────────────────────────────────────────────────────────
function _igPlatform() {
  const ua = navigator.userAgent || '';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return 'installed';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua);
  const isChrome = /chrome|chromium|crios/i.test(ua);
  const isEdge = /edg\//i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isMac = /macintosh/i.test(ua);
  const isDesktop = !isIOS && !isAndroid;

  if (isIOS && isSafari) return 'ios-safari';
  if (isIOS && isChrome) return 'ios-chrome';
  if (isIOS) return 'ios-safari'; // fallback for other iOS browsers
  if (isAndroid && isChrome) return 'android-chrome';
  if (isAndroid) return 'android-chrome';
  if (isDesktop && isEdge) return 'desktop-edge';
  if (isDesktop && isChrome) return 'desktop-chrome';
  if (isDesktop && isSafari && isMac) return 'desktop-safari';
  if (isDesktop && isFirefox) return 'desktop-firefox';
  return 'desktop-chrome'; // sensible default
}

// ── Install prompt capture (Chrome/Edge/Android) ──────────────────────────────
let _igDeferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  _igDeferredPrompt = e;
  // Show install button in guide if it's open
  const btn = document.getElementById('ig-native-btn');
  if (btn) btn.style.display = 'flex';
});
window.addEventListener('appinstalled', function() {
  _igDeferredPrompt = null;
  localStorage.setItem(_IG_KEY, '1');
  igClose();
  // Show a toast if possible
  if (typeof _lgToast === 'function') _lgToast('App installed! 🎉');
});

// ── Platform content ──────────────────────────────────────────────────────────
function _igContent(platform) {
  const SHARE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
  const MENU_SVG  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
  const ADD_SVG   = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
  const INSTALL_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

  const step = function(num, icon, text) {
    return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--bdr);">'
      + '<div style="width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">' + num + '</div>'
      + '<div style="flex:1;">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">'
          + '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;background:var(--sur2);border:1px solid var(--bdr);color:var(--navy);flex-shrink:0;">' + icon + '</span>'
          + '<span style="font-size:13px;font-weight:600;color:var(--txt);">' + text + '</span>'
        + '</div>'
      + '</div>'
    + '</div>';
  };

  const configs = {
    'ios-safari': {
      label: 'iPhone / iPad — Safari',
      emoji: '🍎',
      note: 'Must use <strong>Safari</strong> — other iOS browsers cannot install web apps.',
      steps: [
        step(1, SHARE_SVG,  'Tap the <strong>Share</strong> button in the bottom toolbar'),
        step(2, ADD_SVG,    'Scroll down and tap <strong>"Add to Home Screen"</strong>'),
        step(3, '✓',        'Tap <strong>Add</strong> in the top-right corner'),
      ],
      showNative: false,
    },
    'ios-chrome': {
      label: 'iPhone / iPad — Chrome',
      emoji: '🍎',
      note: 'Chrome on iOS uses Safari\'s engine. Tap the Share icon (not Chrome\'s menu) to install.',
      steps: [
        step(1, SHARE_SVG, 'Tap the <strong>Share</strong> icon at the bottom of the screen'),
        step(2, ADD_SVG,   'Scroll down and tap <strong>"Add to Home Screen"</strong>'),
        step(3, '✓',       'Tap <strong>Add</strong> to confirm'),
      ],
      showNative: false,
    },
    'android-chrome': {
      label: 'Android — Chrome',
      emoji: '🤖',
      note: 'Chrome may show an automatic install banner. If not, use the menu below.',
      steps: [
        step(1, MENU_SVG,   'Tap the <strong>⋮ menu</strong> in the top-right corner'),
        step(2, ADD_SVG,    'Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>'),
        step(3, '✓',        'Tap <strong>Install</strong> to confirm'),
      ],
      showNative: true,
    },
    'desktop-chrome': {
      label: 'Desktop — Chrome',
      emoji: '💻',
      note: 'Look for the install icon <strong>⊕</strong> in the address bar on the right.',
      steps: [
        step(1, INSTALL_SVG, 'Click the <strong>install icon ⊕</strong> in the address bar (far right)'),
        step(2, '✓',         'Click <strong>Install</strong> in the popup'),
        step(3, '🚀',        'Racing Puzzle opens as its own window — pin it to your taskbar'),
      ],
      showNative: true,
    },
    'desktop-edge': {
      label: 'Desktop — Edge',
      emoji: '💻',
      note: 'Edge shows an install icon in the address bar when the app is installable.',
      steps: [
        step(1, INSTALL_SVG, 'Click the <strong>install icon</strong> in the address bar (top right)'),
        step(2, '✓',         'Click <strong>Install</strong> in the popup'),
        step(3, '🚀',        'Pin Racing Puzzle to your taskbar for quick access'),
      ],
      showNative: true,
    },
    'desktop-safari': {
      label: 'Mac — Safari',
      emoji: '🖥',
      note: 'Requires macOS Sonoma (14) or later with Safari 17+.',
      steps: [
        step(1, SHARE_SVG, 'Click <strong>File</strong> in the menu bar → <strong>"Add to Dock…"</strong>'),
        step(2, '✓',       'Click <strong>Add</strong> in the dialog'),
        step(3, '🚀',      'Racing Puzzle appears in your Dock and opens as a standalone app'),
      ],
      showNative: false,
    },
    'desktop-firefox': {
      label: 'Desktop — Firefox',
      emoji: '🦊',
      note: 'Firefox does not support installing PWAs. Use Chrome or Edge for the best experience.',
      steps: [
        step(1, '🌐', 'Open <strong>Racing Puzzle</strong> in <strong>Chrome</strong> or <strong>Edge</strong>'),
        step(2, INSTALL_SVG, 'Click the <strong>install icon ⊕</strong> in the address bar'),
        step(3, '✓',  'Click <strong>Install</strong> — done!'),
      ],
      showNative: false,
    },
  };

  return configs[platform] || configs['desktop-chrome'];
}

// ── Render modal ──────────────────────────────────────────────────────────────
function igShow() {
  const existing = document.getElementById('ig-modal');
  if (existing) { existing.style.display = 'flex'; return; }

  const platform = _igPlatform();
  if (platform === 'installed') {
    if (typeof _lgToast === 'function') _lgToast('App is already installed ✓');
    return;
  }

  const cfg = _igContent(platform);
  const hasNative = cfg.showNative && _igDeferredPrompt;

  const modal = document.createElement('div');
  modal.id = 'ig-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.5);';

  modal.innerHTML =
    '<div style="width:100%;max-width:480px;background:var(--sur);border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,16px);box-shadow:0 -4px 32px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto;">'

      // Handle bar
      + '<div style="display:flex;justify-content:center;padding:10px 0 4px;">'
        + '<div style="width:36px;height:4px;border-radius:2px;background:var(--bdr);"></div>'
      + '</div>'

      // Header
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px 0;">'
        + '<div>'
          + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:900;letter-spacing:.02em;color:var(--navy);">' + cfg.emoji + ' Add to Home Screen</div>'
          + '<div style="font-size:11px;color:var(--mut);margin-top:2px;">' + cfg.label + '</div>'
        + '</div>'
        + '<button onclick="igClose()" style="background:none;border:none;color:var(--mut);font-size:22px;cursor:pointer;padding:4px;line-height:1;">×</button>'
      + '</div>'

      // Note
      + (cfg.note ? '<div style="margin:12px 20px 4px;padding:10px 12px;border-radius:9px;background:rgba(30,58,95,.06);border:1px solid rgba(30,58,95,.12);font-size:12px;color:var(--txt);line-height:1.5;">' + cfg.note + '</div>' : '')

      // Steps
      + '<div style="padding:4px 20px 16px;">'
        + cfg.steps.join('')
      + '</div>'

      // Native install button (Chrome/Edge/Android only — shown when browser fires beforeinstallprompt)
      + '<div id="ig-native-btn" style="display:' + (hasNative ? 'flex' : 'none') + ';margin:0 20px 12px;gap:10px;">'
        + '<button onclick="igNativeInstall()" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--navy);color:#fff;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;">Install Now</button>'
      + '</div>'

      // Platform switcher
      + '<div style="padding:0 20px 8px;">'
        + '<div style="font-size:10px;color:var(--mut);margin-bottom:6px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">Wrong device?</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:5px;">'
          + ['ios-safari','android-chrome','desktop-chrome','desktop-safari'].map(function(p) {
              const labels = {'ios-safari':'iPhone/iPad','android-chrome':'Android','desktop-chrome':'Chrome PC','desktop-safari':'Mac Safari'};
              const active = p === platform;
              return '<button onclick="igSwitchPlatform(\'' + p + '\')" style="padding:4px 10px;border-radius:6px;border:1px solid '+(active?'var(--navy)':'var(--bdr)')+';background:'+(active?'var(--navy)':'transparent')+';color:'+(active?'#fff':'var(--mut)')+';font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:700;cursor:pointer;">' + labels[p] + '</button>';
            }).join('')
        + '</div>'
      + '</div>'

      // Dismiss
      + '<div style="padding:8px 20px 16px;border-top:1px solid var(--bdr);display:flex;gap:8px;">'
        + '<button onclick="igDismiss()" style="flex:1;padding:11px;border-radius:9px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Maybe Later</button>'
        + '<button onclick="igDismissPermanent()" style="padding:11px 16px;border-radius:9px;border:1px solid var(--bdr);background:transparent;color:var(--mut);font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">Don\'t Show Again</button>'
      + '</div>'

    + '</div>';

  // Tap backdrop to close
  modal.addEventListener('click', function(e) { if (e.target === modal) igClose(); });
  document.body.appendChild(modal);
}

function igClose() {
  const m = document.getElementById('ig-modal');
  if (m) m.style.display = 'none';
}

function igDismiss() {
  igClose();
}

function igDismissPermanent() {
  localStorage.setItem(_IG_KEY, '1');
  const m = document.getElementById('ig-modal');
  if (m) m.remove();
}

function igSwitchPlatform(platform) {
  const m = document.getElementById('ig-modal');
  if (m) m.remove();
  const cfg = _igContent(platform);
  const hasNative = cfg.showNative && _igDeferredPrompt;

  // Re-render with new platform — reuse igShow logic
  const _origPlatform = _igPlatform;
  window._igPlatform = _igPlatform;
  // Temporarily override platform detection
  window._igForcePlatform = platform;
  igShow._forced = platform;

  // Quick re-render by patching and calling igShow
  const saved = window._igContent;
  igShow();
  // Patch the native button
  const btn = document.getElementById('ig-native-btn');
  if (btn) btn.style.display = hasNative ? 'flex' : 'none';
}

async function igNativeInstall() {
  if (!_igDeferredPrompt) return;
  _igDeferredPrompt.prompt();
  const result = await _igDeferredPrompt.userChoice;
  if (result.outcome === 'accepted') {
    _igDeferredPrompt = null;
    igDismissPermanent();
  }
}

// ── Auto-show once after login ────────────────────────────────────────────────
function igMaybeShow() {
  // Don't show if already installed or permanently dismissed
  if (localStorage.getItem(_IG_KEY)) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (window.navigator.standalone === true) return;
  // Delay slightly so the app finishes rendering first
  setTimeout(igShow, 2500);
}

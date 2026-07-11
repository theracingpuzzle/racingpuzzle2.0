// ─── ONBOARDING ─── first-run wizard for new users

const OB_STEPS = ['welcome', 'bank', 'sources'];
let _obStep = 0;

// ── Entry point ───────────────────────────────────────────────────
// Called from init.js after bootApp(). Shows only for new users.
function obMaybeShow() {
  // Already completed or has existing data — skip
  if (D.onboardingComplete) return;
  if ((D.bets && D.bets.length > 0) || (D.watchlist && D.watchlist.length > 0)) {
    D.onboardingComplete = true; save(); return;
  }
  _obStep = 0;
  obShow();
}

function obShow() {
  const el = document.getElementById('ob-overlay');
  if (el) el.style.display = 'flex';
  obRender();
}

function obHide() {
  const el = document.getElementById('ob-overlay');
  if (el) el.style.display = 'none';
}

function obSkip() {
  D.onboardingComplete = true;
  save();
  obHide();
}

function obNext() {
  _obStep++;
  if (_obStep >= OB_STEPS.length) {
    obComplete();
  } else {
    obRender();
  }
}

function obComplete() {
  D.onboardingComplete = true;
  save();
  obHide();
  // Refresh UI so bank and sources take effect immediately
  updHdr();
  renderBkCard();
  if (typeof renderSources === 'function') renderSources();
  if (typeof renderSetSources === 'function') renderSetSources();
}

// ── Dots ─────────────────────────────────────────────────────────
function obRenderDots() {
  const el = document.getElementById('ob-dots');
  if (!el) return;
  el.innerHTML = OB_STEPS.map(function(_, i) {
    const active = i === _obStep;
    return '<div style="width:' + (active ? '20' : '6') + 'px;height:6px;border-radius:3px;background:' +
      (active ? 'var(--gld2)' : 'rgba(255,255,255,.2)') + ';transition:all .25s;"></div>';
  }).join('');
}

// ── Render current step ───────────────────────────────────────────
function obRender() {
  obRenderDots();
  const step = OB_STEPS[_obStep];
  const el = document.getElementById('ob-content');
  if (!el) return;

  if (step === 'welcome')  el.innerHTML = obStepWelcome();
  if (step === 'bank')     el.innerHTML = obStepBank();
  if (step === 'sources')  el.innerHTML = obStepSources();
}

// ── Step styles (shared) ─────────────────────────────────────────
const _OB_CARD  = 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:24px 20px;margin-bottom:24px;';
const _OB_LBL   = 'display:block;font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:7px;';
const _OB_INPUT = 'width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;font-family:var(--font);font-size:16px;outline:none;';
const _OB_BTN   = 'width:100%;padding:15px;border-radius:10px;border:none;background:var(--gld2);color:#fff;font-family:var(--font);font-size:14px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;';
const _OB_BTN_S = 'width:100%;padding:13px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.45);font-family:var(--font);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;margin-top:10px;';

// ─────────────────────────────────────────────────────────────────
// STEP 1 — Welcome
// ─────────────────────────────────────────────────────────────────
function obStepWelcome() {
  return '<div style="text-align:center;margin-bottom:32px;">'
    + '<div style="font-size:48px;margin-bottom:16px;">🏇</div>'
    + '<div style="font-family:var(--font);font-size:30px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#fff;line-height:1.1;margin-bottom:10px;">'
    +   'Your betting,<br><span style="color:var(--gld2);">your edge.</span>'
    + '</div>'
    + '<div style="font-size:14px;color:rgba(255,255,255,.55);line-height:1.65;margin-top:14px;">'
    +   'Racing Puzzle helps you track every bet, build detailed horse profiles, and understand where your real edge lies.'
    + '</div>'
    + '</div>'

    + '<div style="' + _OB_CARD + '">'
    + _obFeatureRow('📊', 'Track real & virtual bets', 'Log every bet with odds, stake, notes and results.')
    + _obFeatureRow('🐴', 'Puzzle Profiler', 'Build a private diary on every horse you follow.')
    + _obFeatureRow('⭐', 'Find your edge', 'Your My Rating vs Official Rating — see where you outthink the market.')
    + '</div>'

    + '<button style="' + _OB_BTN + '" onclick="obNext()">Get Started →</button>';
}

function _obFeatureRow(emoji, title, desc) {
  return '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;">'
    + '<div style="font-size:20px;flex-shrink:0;margin-top:1px;">' + emoji + '</div>'
    + '<div>'
    +   '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:2px;">' + title + '</div>'
    +   '<div style="font-size:12px;color:rgba(255,255,255,.45);line-height:1.5;">' + desc + '</div>'
    + '</div>'
    + '</div>';
}

// ─────────────────────────────────────────────────────────────────
// STEP 2 — Set Starting Bank
// ─────────────────────────────────────────────────────────────────
function obStepBank() {
  return '<div style="margin-bottom:24px;">'
    + '<div style="font-family:var(--font);font-size:26px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#fff;margin-bottom:8px;">Set your bank</div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;">This is your starting bankroll. The app uses this to track your P&L and ROI over time. You can change it any time in Settings.</div>'
    + '</div>'

    + '<div style="' + _OB_CARD + '">'

    // Real bank
    + '<div style="margin-bottom:18px;">'
    +   '<label style="' + _OB_LBL + '">Real Bank (£)</label>'
    +   '<input id="ob-bank-real" type="number" min="0" step="1" placeholder="e.g. 500" style="' + _OB_INPUT + '" '
    +     'oninput="obBankPreview()">'
    +   '<div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:6px;">Your actual betting bank in pounds.</div>'
    + '</div>'

    // Virtual bank
    + '<div>'
    +   '<label style="' + _OB_LBL + '">Virtual Bank (£)</label>'
    +   '<input id="ob-bank-virt" type="number" min="0" step="1" placeholder="e.g. 500" style="' + _OB_INPUT + '" '
    +     'oninput="obBankPreview()">'
    +   '<div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:6px;">A paper-trading bank to test selections without real money.</div>'
    + '</div>'

    + '</div>'

    + '<button style="' + _OB_BTN + '" onclick="obSaveBank()">Save & Continue →</button>'
    + '<button style="' + _OB_BTN_S + '" onclick="obNext()">Skip for now</button>';
}

function obBankPreview() { /* live preview could go here */ }

function obSaveBank() {
  const real = parseFloat(document.getElementById('ob-bank-real').value) || 0;
  const virt = parseFloat(document.getElementById('ob-bank-virt').value) || 0;
  D.bank = { start: real, current: real };
  if (!D.vBank) D.vBank = {};
  D.vBank.start = virt;
  D.vBank.current = virt;
  save();
  obNext();
}

// ─────────────────────────────────────────────────────────────────
// STEP 3 — Bet Sources
// ─────────────────────────────────────────────────────────────────
const OB_SOURCE_SUGGESTIONS = [
  'Own Form Study', 'Tissue Price', 'Racing Post NB',
  'Tipster', 'Trainer Intel', 'Paddock Watch'
];

function obStepSources() {
  return '<div style="margin-bottom:24px;">'
    + '<div style="font-family:var(--font);font-size:26px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#fff;margin-bottom:8px;">Your sources</div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;">Where do your bets come from? Add your sources so you can track which ones are profitable. You can add more any time in Settings.</div>'
    + '</div>'

    + '<div style="' + _OB_CARD + '">'

    // Quick-add suggestion chips
    + '<div style="font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:10px;">Quick add</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;" id="ob-suggestions">'
    + OB_SOURCE_SUGGESTIONS.map(function(s) {
        return '<button onclick="obAddSuggestion(\'' + s.replace(/'/g, "\\'") + '\')" '
          + 'style="padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.6);font-family:var(--font);font-size:12px;font-weight:600;cursor:pointer;">+ ' + s + '</button>';
      }).join('')
    + '</div>'

    // Custom input
    + '<div style="font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px;">Or type your own</div>'
    + '<div style="display:flex;gap:8px;">'
    +   '<input id="ob-src-input" type="text" placeholder="e.g. My Trainer Contact" maxlength="40" '
    +     'style="flex:1;' + _OB_INPUT + 'font-size:14px;" '
    +     'onkeydown="if(event.key===\'Enter\')obAddCustomSource()">'
    +   '<button onclick="obAddCustomSource()" '
    +     'style="padding:12px 16px;border-radius:10px;border:none;background:var(--gld2);color:#fff;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0;">Add</button>'
    + '</div>'

    // Added sources list
    + '<div id="ob-src-list" style="margin-top:14px;"></div>'

    + '</div>'

    + '<button style="' + _OB_BTN + '" onclick="obComplete()">Finish Setup ✓</button>'
    + '<button style="' + _OB_BTN_S + '" onclick="obComplete()">Skip for now</button>';
}

function obAddSuggestion(label) {
  _obSourceAdd(label);
  // Dim the tapped chip
  const btns = document.querySelectorAll('#ob-suggestions button');
  btns.forEach(function(b) {
    if (b.textContent.replace('+ ', '') === label) {
      b.style.opacity = '.3';
      b.disabled = true;
    }
  });
}

function obAddCustomSource() {
  const inp = document.getElementById('ob-src-input');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;
  _obSourceAdd(val);
  inp.value = '';
}

function _obSourceAdd(label) {
  if (!D.settings) D.settings = {};
  if (!D.settings.sources) D.settings.sources = [];
  if (D.settings.sources.some(function(s) {
    return (typeof s === 'object' ? s.label : s) === label;
  })) return; // already exists
  D.settings.sources.push(label);
  save();
  _obRenderSourceList();
}

function _obRenderSourceList() {
  const el = document.getElementById('ob-src-list');
  if (!el) return;
  const sources = (D.settings && D.settings.sources) || [];
  if (!sources.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div style="font-family:var(--font);font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:8px;">Added</div>'
    + sources.map(function(s, i) {
        const label = typeof s === 'object' ? s.label : s;
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);">'
          + '<span style="font-size:13px;color:#fff;">' + label + '</span>'
          + '<button onclick="obRemoveSource(' + i + ')" style="font-size:10px;color:rgba(255,255,255,.35);background:transparent;border:none;cursor:pointer;padding:2px 6px;">✕</button>'
          + '</div>';
      }).join('');
}

function obRemoveSource(i) {
  if (!D.settings || !D.settings.sources) return;
  D.settings.sources.splice(i, 1);
  save();
  _obRenderSourceList();
}

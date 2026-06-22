// ─── NOTIFICATIONS ─── local push notifications for Racing Puzzle
// Strategy: we use the Notifications API + Service Worker to fire *local*
// scheduled notifications — no push server needed.
// Notifications fire when:
//   1. A Profiler horse is declared to run today (fired after loadTodayMeetings)
//   2. 30 minutes before a shortlisted horse's race time

const NOTIF_PERM_KEY   = 'rp-notif-permission';  // 'granted'|'denied'|'default'
const NOTIF_FIRED_KEY  = 'rp-notif-fired-';       // + date string, stores array of notif IDs fired

// VAPID public key — must match VAPID_PUBLIC_KEY secret in the Cloudflare Worker
// Generate once: see worker-cron.js instructions
const VAPID_PUBLIC_KEY = typeof window._VAPID_PUBLIC_KEY !== 'undefined' ? window._VAPID_PUBLIC_KEY : '';

// ── Permission state ──────────────────────────────────────────────────────────
function notifPermission() {
  return (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
}

function notifSupported() {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

// ── Request permission + subscribe to Web Push ────────────────────────────────
async function notifRequestPermission() {
  if (!notifSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  localStorage.setItem(NOTIF_PERM_KEY, result);
  if (result === 'granted') await notifSavePushSubscription();
  renderNotifSettings();
  return result;
}

// ── Save Web Push subscription to Supabase (enables background alerts) ────────
async function notifSavePushSubscription() {
  console.log('[notif] notifSavePushSubscription called');
  if (!VAPID_PUBLIC_KEY) { console.warn('[notif] No VAPID_PUBLIC_KEY'); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    console.log('[notif] SW ready');
    const key = VAPID_PUBLIC_KEY.replace(/-/g,'+').replace(/_/g,'/');
    const raw = Uint8Array.from(atob(key), c => c.charCodeAt(0));
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: raw,
    });
    console.log('[notif] Push subscribed:', sub.endpoint);
    const j = sub.toJSON();
    const userId = typeof SUPA_USER_ID !== 'undefined' ? SUPA_USER_ID : null;
    console.log('[notif] userId:', userId, '| token:', window._rpAccessToken ? 'set' : 'missing');
    if (!userId || !j.endpoint) { console.warn('[notif] Missing userId or endpoint'); return; }
    const resp = await fetch(SUPA_URL + '/rest/v1/push_subscriptions', {
      method: 'POST',
      headers: {
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + (window._rpAccessToken || SUPA_ANON),
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        endpoint: j.endpoint,
        p256dh: j.keys.p256dh,
        auth: j.keys.auth,
      }),
    });
    console.log('[notif] Supabase response:', resp.status, await resp.text());
  } catch(e) {
    console.error('[notif] Push subscription failed:', e);
  }
}

// ── Fire an immediate notification via the SW registration ───────────────────
async function notifFire(title, body, tag, icon) {
  if (notifPermission() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body:    body  || '',
      icon:    icon  || './icons/icon-192.png',
      badge:         './icons/icon-192.png',
      tag:     tag   || 'rp-' + Date.now(),
      vibrate: [200, 100, 200],
    });
  } catch(e) {
    // SW not ready — fall back to basic Notification
    try { new Notification(title, { body, icon, tag }); } catch(_) {}
  }
}

// ── Schedule a notification at a specific time (setTimeout-based) ─────────────
// Returns a timeout ID so it can be cancelled.
function notifSchedule(title, body, tag, fireAt) {
  const delay = fireAt - Date.now();
  if (delay < 0) return null;  // already past
  return setTimeout(function() {
    notifFire(title, body, tag);
  }, delay);
}

// Keep track of scheduled timeouts so we can cancel on re-schedule
const _notifScheduled = {};

// ── Cancel all pending notification timers ────────────────────────────────────
function notifCancelAll() {
  Object.keys(_notifScheduled).forEach(function(k) {
    clearTimeout(_notifScheduled[k]);
    delete _notifScheduled[k];
  });
}

// ── Main: schedule notifications from today's meetings ───────────────────────
// Called from today.js after loadTodayMeetings resolves.
function notifScheduleToday(races, watchlistAlerts) {
  if (!notifSupported() || notifPermission() !== 'granted') return;

  notifCancelAll();

  const todayKey = NOTIF_FIRED_KEY + (typeof td === 'function' ? td() : new Date().toISOString().slice(0, 10));
  const fired = JSON.parse(localStorage.getItem(todayKey) || '[]');

  // 1. "Running Today" — fire immediately when we detect a Profiler horse is running
  (watchlistAlerts || []).forEach(function(alert) {
    const tag = 'rp-running-' + alert.horse.replace(/\s+/g, '-').toLowerCase();
    if (fired.includes(tag)) return;  // already fired today

    const body = alert.time + ' · ' + alert.course
      + (alert.edge > 0 ? ' · ⭐ MR edge +' + alert.edge + ' pts' : '');

    notifFire('🏇 Running Today — ' + alert.horse, body, tag);
    fired.push(tag);
    localStorage.setItem(todayKey, JSON.stringify(fired));
  });

  // 2. "Race in 30 minutes" — scheduled alerts for Profiler horses
  (watchlistAlerts || []).forEach(function(alert) {
    const tag = 'rp-30min-' + alert.horse.replace(/\s+/g, '-').toLowerCase();
    if (fired.includes(tag)) return;

    // Parse race time to a Date
    const fireAt = _notifParseRaceTime(alert.time, -30);
    if (!fireAt) return;

    const tid = notifSchedule(
      '⏰ Race in 30 mins — ' + alert.horse,
      alert.time + ' · ' + alert.course,
      tag,
      fireAt
    );
    if (tid) _notifScheduled[tag] = tid;
  });
}

// Parse "14:30" → today's Date at 14:30, offset by `minutesBefore`
function _notifParseRaceTime(timeStr, minutesBefore) {
  if (!timeStr || timeStr === '—') return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  // Apply the same PM convention used elsewhere: before 09:30 = evening
  if (h < 9 || (h === 9 && m < 30)) h += 12;
  const now  = new Date();
  const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + (minutesBefore || 0), 0, 0);
  return fire.getTime();
}

// ── Settings UI ──────────────────────────────────────────────────────────────
function renderNotifSettings() {
  const el = document.getElementById('notif-settings-block');
  if (!el) return;

  const supported = notifSupported();
  const perm      = notifPermission();

  if (!supported) {
    el.innerHTML = '<div style="font-size:12px;color:var(--mut);">Push notifications are not supported in this browser.</div>';
    return;
  }

  if (perm === 'granted') {
    const disabled = localStorage.getItem('rp-notif-disabled') === '1';
    if (disabled) {
      el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        +   '<div style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>'
        +   '<span style="font-size:13px;color:var(--txt);">Notifications disabled</span>'
        + '</div>'
        + '<button onclick="notifReEnable()" class="btn bblu" style="font-size:11px;padding:5px 12px;">Re-enable</button>'
        + '</div>'
        + '<div style="font-size:11px;color:var(--mut);margin-top:8px;line-height:1.6;">Background alerts are off. Tap Re-enable to start receiving them again.</div>';
      return;
    }
    const paused = localStorage.getItem('rp-notif-paused') === '1';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      +   '<div style="width:8px;height:8px;border-radius:50%;background:'+(paused?'#f59e0b':'#34d399')+';flex-shrink:0;"></div>'
      +   '<span style="font-size:13px;color:var(--txt);">Notifications '+(paused?'paused':'enabled')+'</span>'
      + '</div>'
      + '<div style="display:flex;gap:8px;">'
      +   '<button onclick="notifTest()" class="btn bout" style="font-size:11px;padding:5px 12px;">Test</button>'
      +   '<button onclick="notifTogglePause()" class="btn bout" style="font-size:11px;padding:5px 12px;">'+(paused?'Resume':'Pause')+'</button>'
      +   '<button onclick="notifDisable()" class="btn bout" style="font-size:11px;padding:5px 12px;color:var(--red);border-color:var(--red);">Disable</button>'
      + '</div>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--mut);margin-top:8px;line-height:1.6;">'
      + (paused ? 'Alerts are paused — the Worker will skip your pushes until you resume.' : 'Background alerts enabled — you\'ll get a push 30 minutes before any Profiler horse runs, even if the app is closed.')
      + '</div>';
  } else if (perm === 'denied') {
    el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
      +   '<div style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>'
      +   '<span style="font-size:13px;color:var(--txt);">Notifications blocked</span>'
      + '</div>'
      + '<div style="font-size:12px;color:var(--mut);line-height:1.6;">You\'ve blocked notifications for this site. To enable them, tap the lock/info icon in your browser address bar and allow notifications, then reload the app.</div>';
  } else {
    el.innerHTML = '<div style="font-size:13px;color:var(--mut);margin-bottom:12px;line-height:1.6;">'
      + 'Get alerted when your Profiler horses are running today, and 30 minutes before race time.'
      + '</div>'
      + '<button onclick="notifRequestPermission()" class="btn bblu">Enable Notifications</button>';
  }
}

// ── Pause / resume (client-side flag, Worker skips paused users) ──────────────
function notifTogglePause() {
  const paused = localStorage.getItem('rp-notif-paused') === '1';
  localStorage.setItem('rp-notif-paused', paused ? '0' : '1');
  // Update the paused flag on the subscription row so the Worker respects it
  if (typeof SUPA_URL !== 'undefined' && typeof SUPA_USER_ID !== 'undefined' && SUPA_USER_ID) {
    fetch(SUPA_URL + '/rest/v1/push_subscriptions?user_id=eq.' + encodeURIComponent(SUPA_USER_ID), {
      method: 'PATCH',
      headers: {
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + (window._rpAccessToken || SUPA_ANON),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paused: !paused }),
    });
  }
  renderNotifSettings();
}

// ── Disable — removes subscription from Supabase and unsubscribes SW ─────────
async function notifReEnable() {
  localStorage.removeItem('rp-notif-disabled');
  await notifSavePushSubscription();
  renderNotifSettings();
}

async function notifDisable() {
  if (!confirm('Disable background alerts? You can re-enable them here at any time.')) return;
  // Remove from Supabase
  if (typeof SUPA_URL !== 'undefined' && typeof SUPA_USER_ID !== 'undefined' && SUPA_USER_ID) {
    await fetch(SUPA_URL + '/rest/v1/push_subscriptions?user_id=eq.' + encodeURIComponent(SUPA_USER_ID), {
      method: 'DELETE',
      headers: {
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + (window._rpAccessToken || SUPA_ANON),
      },
    });
  }
  // Unsubscribe the SW push subscription
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch(e) {}
  localStorage.removeItem('rp-notif-paused');
  localStorage.setItem('rp-notif-disabled', '1');
  renderNotifSettings();
}

async function notifTest() {
  await notifFire(
    '🏇 Racing Puzzle',
    'Notifications are working! You\'ll be alerted when your horses run.',
    'rp-test-' + Date.now()
  );
}

// ── Auto-init: render settings block on load ──────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  renderNotifSettings();
});

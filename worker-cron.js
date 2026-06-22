// ─── RACING PUZZLE — Cloudflare Worker Cron Handler ──────────────────────────
//
// ADD THIS CODE to your existing racing-proxy Worker.
//
// 1. Paste the helpers and handleScheduled() into your Worker file.
// 2. Add the scheduled event listener at the bottom.
// 3. In wrangler.toml add:
//      [triggers]
//      crons = ["*/15 10-21 * * *"]
// 4. Add these Worker secrets (wrangler secret put <NAME>):
//      VAPID_PUBLIC_KEY   — base64url-encoded P-256 public key
//      VAPID_PRIVATE_KEY  — base64url-encoded P-256 private key (pkcs8)
//      SUPA_URL           — your Supabase project URL
//      SUPA_SERVICE_KEY   — Supabase service role key (not anon — needs to read all users)
// 5. Create these Supabase tables (run the SQL below in the Supabase SQL editor).
//
// ─── SUPABASE SQL ─────────────────────────────────────────────────────────────
//
// -- Push subscriptions (one row per user device)
// CREATE TABLE push_subscriptions (
//   id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id    text NOT NULL,
//   endpoint   text NOT NULL,
//   p256dh     text NOT NULL,
//   auth       text NOT NULL,
//   created_at timestamptz DEFAULT now(),
//   UNIQUE(user_id, endpoint)
// );
//
// -- Daily racecard cache (one row per date — avoids hammering Racing API)
// CREATE TABLE racecard_cache (
//   cache_date  date PRIMARY KEY,
//   data        jsonb NOT NULL,
//   fetched_at  timestamptz DEFAULT now()
// );
//
// -- Sent notifications log (prevents duplicate pushes)
// CREATE TABLE push_sent (
//   id         text PRIMARY KEY,   -- e.g. "rp-30min-2026-06-22-kings-castle"
//   user_id    text NOT NULL,
//   sent_at    timestamptz DEFAULT now()
// );
//
// ─── GENERATE VAPID KEYS ──────────────────────────────────────────────────────
// Run this once in your browser console, then save the output as Worker secrets:
//
// (async () => {
//   const kp = await crypto.subtle.generateKey(
//     { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
//   );
//   const pub  = await crypto.subtle.exportKey('raw',   kp.publicKey);
//   const priv = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
//   const b64  = b => btoa(String.fromCharCode(...new Uint8Array(b)))
//     .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
//   console.log('VAPID_PUBLIC_KEY=' + b64(pub));
//   console.log('VAPID_PRIVATE_KEY=' + b64(priv));
// })();
//
// Then in index.html add before notifications.js loads:
//   <script>window._VAPID_PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE';</script>
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Utilities ─────────────────────────────────────────────────────────────────

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function b64urlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concatBufs(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function normHorse(s) {
  return (s || '').replace(/\([^)]*\)/g, '').replace(/[''`]/g, "'").trim().toLowerCase();
}

function timeToMins(t) {
  if (!t) return 0;
  const parts = t.split(':');
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (h < 9 || (h === 9 && m < 30)) h += 12; // evening flat convention
  return h * 60 + m;
}

// ── HKDF using Web Crypto ─────────────────────────────────────────────────────
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key, length * 8
  );
  return new Uint8Array(bits);
}

// ── Web Push payload encryption (RFC 8291 / aes128gcm) ───────────────────────
async function encryptWebPush(plaintext, p256dhB64, authB64) {
  const receiverPub = b64urlDecode(p256dhB64);
  const authSecret  = b64urlDecode(authB64);
  const salt        = crypto.getRandomValues(new Uint8Array(16));

  // Sender ephemeral key pair
  const senderKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const senderPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderKP.publicKey)
  );

  // ECDH shared secret
  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, true, []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKP.privateKey, 256)
  );

  // PRK_key = HKDF(salt=auth, ikm=shared, info="WebPush: info\0"+ua_pub+as_pub, len=32)
  const keyInfo = concatBufs(
    new TextEncoder().encode('WebPush: info\x00'),
    receiverPub,
    senderPubRaw
  );
  const prk = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  // CEK = HKDF(salt, prk, "Content-Encoding: aes128gcm\0\1", 16)
  const cekInfo = concatBufs(new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), new Uint8Array([1]));
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // NONCE = HKDF(salt, prk, "Content-Encoding: nonce\0\1", 12)
  const nonceInfo = concatBufs(new TextEncoder().encode('Content-Encoding: nonce\x00'), new Uint8Array([1]));
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Encrypt with AES-128-GCM — append 0x02 padding delimiter
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plainBytes = new TextEncoder().encode(plaintext);
  const padded = concatBufs(plainBytes, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  );

  // aes128gcm record: salt(16) + rs(4 BE) + keyidlen(1) + keyid(65) + ciphertext
  const header = new Uint8Array(21 + senderPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = senderPubRaw.length;
  header.set(senderPubRaw, 21);

  return concatBufs(header, ciphertext);
}

// ── VAPID JWT ─────────────────────────────────────────────────────────────────
async function vapidJWT(audience, privateKeyB64, subject) {
  const b64json = obj => btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const header  = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: subject };
  const unsigned = b64json(header) + '.' + b64json(payload);

  const keyData = b64urlDecode(privateKeyB64);
  const key = await crypto.subtle.importKey(
    'pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned))
  );
  return unsigned + '.' + b64urlEncode(sig);
}

// ── Send a Web Push notification ──────────────────────────────────────────────
async function sendWebPush(sub, payload, vapidPub, vapidPriv, subject) {
  const endpoint = sub.endpoint;
  const audience = new URL(endpoint).origin;
  const jwt  = await vapidJWT(audience, vapidPriv, subject);
  const body = await encryptWebPush(JSON.stringify(payload), sub.p256dh, sub.auth);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidPub}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body,
  });
  return resp.status;
}

// ── Supabase REST helper ───────────────────────────────────────────────────────
async function supaFetch(env, path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': env.SUPA_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPA_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(env.SUPA_URL + '/rest/v1' + path, opts);
}

// ── Main cron handler ─────────────────────────────────────────────────────────
async function handleScheduled(env) {
  // Determine UK local time (BST = UTC+1 Jun-Oct, GMT = UTC Nov-May)
  const now    = new Date();
  const month  = now.getUTCMonth(); // 0-based
  const isDST  = month >= 2 && month <= 9; // rough BST window
  const ukTime = new Date(now.getTime() + (isDST ? 3600000 : 0));
  const ukHour = ukTime.getUTCHours();

  // Only run during racing hours
  if (ukHour < 10 || ukHour >= 21) return;

  const todayStr = ukTime.toISOString().slice(0, 10);
  const nowMins  = ukTime.getUTCHours() * 60 + ukTime.getUTCMinutes();

  // ── 1. Get racecard (cached or fresh) ──────────────────────────────────────
  let races = null;
  const cacheResp = await supaFetch(env, `/racecard_cache?cache_date=eq.${todayStr}&select=data,fetched_at`);
  const cacheRows = await cacheResp.json();

  if (cacheRows.length) {
    const age = (Date.now() - new Date(cacheRows[0].fetched_at).getTime()) / 60000;
    if (age < 120) races = cacheRows[0].data; // use cache if < 2 hours old
  }

  if (!races) {
    // Fetch from Racing API via the proxy endpoint the Worker already handles
    try {
      const apiResp = await fetch(`https://api.theracingapi.com/v1/racecards/free`, {
        headers: { 'Authorization': 'Basic ' + btoa(`${env.RACING_API_USER}:${env.RACING_API_PASS}`) }
      });
      const apiData = await apiResp.json();
      races = apiData.racecards || apiData.races || [];
      // Cache it
      await supaFetch(env, '/racecard_cache', 'POST', {
        cache_date: todayStr,
        data: races,
        fetched_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Racecard fetch failed:', e);
      return;
    }
  }

  if (!races.length) return;

  // ── 2. Get all push subscriptions ─────────────────────────────────────────
  const subsResp = await supaFetch(env, '/push_subscriptions?select=*');
  const subs = await subsResp.json();
  if (!subs.length) return;

  const userIds = [...new Set(subs.map(s => s.user_id))];

  // ── 3. Per-user: check watchlist against upcoming races ───────────────────
  for (const userId of userIds) {
    const sub = subs.find(s => s.user_id === userId);
    if (!sub) continue;

    const wlResp = await supaFetch(env, `/horse_profiles?user_id=eq.${encodeURIComponent(userId)}&select=horse`);
    const watchlist = await wlResp.json();
    if (!watchlist.length) continue;

    const watched = new Set(watchlist.map(w => normHorse(w.horse)));

    // Find races 25–40 mins away with a watched horse
    const alerts = [];
    for (const race of races) {
      const raceMins  = timeToMins(race.time || race.off || '');
      const minsUntil = raceMins - nowMins;
      if (minsUntil < 25 || minsUntil > 40) continue;

      const runners = race.runners || race.horses || [];
      for (const runner of runners) {
        const horseName = runner.horse || runner.name || '';
        if (watched.has(normHorse(horseName))) {
          alerts.push({
            horse:      horseName,
            time:       race.time || race.off || '',
            course:     race.course || race.venue || '',
            minsUntil:  Math.round(minsUntil),
          });
        }
      }
    }

    // ── 4. Send push for each new alert ────────────────────────────────────
    for (const alert of alerts) {
      const slug     = alert.horse.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const notifId  = `rp-30min-${todayStr}-${userId.slice(-6)}-${slug}`;

      // Skip if already sent
      const sentResp = await supaFetch(env, `/push_sent?id=eq.${encodeURIComponent(notifId)}&select=id`);
      const sent = await sentResp.json();
      if (sent.length) continue;

      try {
        const status = await sendWebPush(
          sub,
          {
            title: `⏰ Race in ${alert.minsUntil} mins — ${alert.horse}`,
            body:  `${alert.time} · ${alert.course}`,
            tag:   notifId,
          },
          env.VAPID_PUBLIC_KEY,
          env.VAPID_PRIVATE_KEY,
          'mailto:dan.hill7@hotmail.com'
        );

        // 410 Gone = subscription expired, clean it up
        if (status === 410) {
          await supaFetch(env, `/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, 'DELETE');
        }
      } catch (e) {
        console.error('Push send failed:', e);
      }

      // Mark as sent regardless (avoid retry spam on error)
      await supaFetch(env, '/push_sent', 'POST', {
        id:      notifId,
        user_id: userId,
        sent_at: new Date().toISOString(),
      });
    }
  }
}

// ── Add this to your existing Worker's event listeners ────────────────────────
//
// addEventListener('scheduled', event => {
//   event.waitUntil(handleScheduled(event));
// });
//
// If your Worker uses ES module syntax (export default), use:
//
// export default {
//   async fetch(request, env) { /* your existing fetch handler */ },
//   async scheduled(event, env) { await handleScheduled(env); },
// };

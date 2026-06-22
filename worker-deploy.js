const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

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
  if (h < 9 || (h === 9 && m < 30)) h += 12;
  return h * 60 + m;
}

// ── HKDF ─────────────────────────────────────────────────────────────────────

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

  const senderKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const senderPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderKP.publicKey)
  );

  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, true, []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKP.privateKey, 256)
  );

  const keyInfo = concatBufs(
    new TextEncoder().encode('WebPush: info\x00'),
    receiverPub,
    senderPubRaw
  );
  const prk = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  const cekInfo = concatBufs(new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), new Uint8Array([1]));
  const cek = await hkdf(salt, prk, cekInfo, 16);

  const nonceInfo = concatBufs(new TextEncoder().encode('Content-Encoding: nonce\x00'), new Uint8Array([1]));
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plainBytes = new TextEncoder().encode(plaintext);
  const padded = concatBufs(plainBytes, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  );

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

// ── Cron: check watchlists and send push alerts ───────────────────────────────

async function handleScheduled(env) {
  const now    = new Date();
  const month  = now.getUTCMonth();
  const isDST  = month >= 2 && month <= 9;
  const ukTime = new Date(now.getTime() + (isDST ? 3600000 : 0));
  const ukHour = ukTime.getUTCHours();

  if (ukHour < 10 || ukHour >= 21) return;

  const todayStr = ukTime.toISOString().slice(0, 10);
  const nowMins  = ukTime.getUTCHours() * 60 + ukTime.getUTCMinutes();

  // Get racecard — use cache if < 2 hours old, else fetch fresh
  let races = null;
  const cacheResp = await supaFetch(env, `/racecard_cache?cache_date=eq.${todayStr}&select=data,fetched_at`);
  const cacheRows = await cacheResp.json();
  if (cacheRows.length) {
    const ageMin = (Date.now() - new Date(cacheRows[0].fetched_at).getTime()) / 60000;
    if (ageMin < 120) races = cacheRows[0].data;
  }

  if (!races) {
    try {
      const apiResp = await fetch('https://api.theracingapi.com/v1/racecards/free', {
        headers: {
          'Authorization': 'Basic ' + btoa(`${env.RACING_API_USER}:${env.RACING_API_PASS}`),
          'Accept': 'application/json',
        }
      });
      const apiData = await apiResp.json();
      races = apiData.racecards || apiData.races || [];
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

  const subsResp = await supaFetch(env, '/push_subscriptions?select=*&paused=eq.false');
  const subs = await subsResp.json();
  if (!subs.length) return;

  const isMorning = ukHour === 8; // morning summary fires during the 8am cron window
  const userIds = [...new Set(subs.map(s => s.user_id))];

  for (const userId of userIds) {
    const sub = subs.find(s => s.user_id === userId);
    if (!sub) continue;

    const wlResp = await supaFetch(env, `/horse_profiles?user_id=eq.${encodeURIComponent(userId)}&select=horse`);
    const watchlist = await wlResp.json();
    if (!watchlist.length) continue;

    const watched = new Set(watchlist.map(w => normHorse(w.horse)));

    // Find all watched horses running today
    const todayRunners = [];
    for (const race of races) {
      const runners = race.runners || race.horses || [];
      for (const runner of runners) {
        const horseName = runner.horse || runner.name || '';
        if (watched.has(normHorse(horseName))) {
          todayRunners.push({
            horse:  horseName,
            time:   race.time || race.off || '',
            course: race.course || race.venue || '',
          });
        }
      }
    }

    // ── Morning summary — one notification listing all runners today ──────────
    if (isMorning && todayRunners.length) {
      const summaryId = `rp-morning-${todayStr}-${userId.slice(-6)}`;
      const sentResp  = await supaFetch(env, `/push_sent?id=eq.${encodeURIComponent(summaryId)}&select=id`);
      const sent      = await sentResp.json();
      if (!sent.length) {
        const title = todayRunners.length === 1
          ? `🏇 ${todayRunners[0].horse} runs today`
          : `🏇 ${todayRunners.length} Profiler horses run today`;
        const body = todayRunners.map(r => `${r.horse} · ${r.time} ${r.course}`).join('\n');
        try {
          const status = await sendWebPush(
            sub,
            { title, body, tag: summaryId },
            env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY,
            'mailto:dan.hill7@hotmail.com'
          );
          if (status === 410) {
            await supaFetch(env, `/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, 'DELETE');
          }
        } catch(e) { console.error('Morning push failed:', e); }
        await supaFetch(env, '/push_sent', 'POST', { id: summaryId, user_id: userId, sent_at: new Date().toISOString() });
      }
    }

    // ── Pre-race alerts — 15 to 30 mins before each race ─────────────────────
    const preRaceAlerts = todayRunners.filter(r => {
      const minsUntil = timeToMins(r.time) - nowMins;
      return minsUntil >= 15 && minsUntil <= 30;
    }).map(r => ({ ...r, minsUntil: Math.round(timeToMins(r.time) - nowMins) }));

    for (const alert of preRaceAlerts) {
      const slug    = alert.horse.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const notifId = `rp-prerace-${todayStr}-${userId.slice(-6)}-${slug}`;

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
          env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY,
          'mailto:dan.hill7@hotmail.com'
        );
        if (status === 410) {
          await supaFetch(env, `/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, 'DELETE');
        }
      } catch(e) { console.error('Pre-race push failed:', e); }

      await supaFetch(env, '/push_sent', 'POST', { id: notifId, user_id: userId, sent_at: new Date().toISOString() });
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      const { endpoint, params } = await request.json();

      const username = env.RACING_API_USER;
      const password = env.RACING_API_PASS;

      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Racing API credentials not configured on server' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

      const qs = (params && Object.keys(params).length)
        ? '?' + new URLSearchParams(params).toString()
        : '';

      const resp = await fetch('https://api.theracingapi.com/v1/' + endpoint + qs, {
        headers: {
          'Authorization': 'Basic ' + btoa(username + ':' + password),
          'Accept': 'application/json',
          'User-Agent': 'RacingPuzzleApp/1.0'
        }
      });

      const rawText = await resp.text();

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        return new Response(JSON.stringify({
          error: 'Upstream returned non-JSON response',
          status: resp.status,
          detail: rawText.slice(0, 300)
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || 'Worker error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }
  },

  async scheduled(event, env) {
    await handleScheduled(env);
  }
};

// ─── Racing Puzzle Admin Dashboard ───────────────────────────────────────────
// Run: node server.js
// Open: http://localhost:3001
//
// Requires your Supabase SERVICE ROLE key (not the anon key).
// Get it: Supabase Dashboard → Project Settings → API → service_role secret
// ─────────────────────────────────────────────────────────────────────────────

const SUPA_URL      = 'https://stsmantobrvejfykstrl.supabase.co';
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c21hbnRvYnJ2ZWpmeWtzdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI4ODQwMCwiZXhwIjoyMDkzODY0NDAwfQ.0PKHSNiJGXxbEyb9ONEBngTfTQpiz4MuZk_rGHKI9X0';

// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3001;

function supaFetch(endpoint, params) {
  const url = new URL(SUPA_URL + endpoint);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetch(url.toString(), {
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type':  'application/json',
    }
  });
}

async function getStats() {
  const now        = new Date();
  const todayStr   = now.toISOString().slice(0, 10);
  const week7      = new Date(now - 7  * 86400000).toISOString();
  const week30     = new Date(now - 30 * 86400000).toISOString();

  // ── 1. Auth users (requires service role) ──────────────────────────────────
  let allUsers = [], totalUsers = 0, newToday = 0, newWeek = 0;
  try {
    const res  = await fetch(`${SUPA_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
    });
    const body = await res.json();
    allUsers   = body.users || [];
    totalUsers = allUsers.length;
    newToday   = allUsers.filter(u => u.created_at && u.created_at.slice(0,10) === todayStr).length;
    newWeek    = allUsers.filter(u => u.created_at && u.created_at >= week7).length;
  } catch(e) { console.error('Auth users error:', e.message); }

  // Recent 8 signups
  const recentSignups = allUsers
    .sort((a, b) => b.created_at > a.created_at ? 1 : -1)
    .slice(0, 8)
    .map(u => ({ email: u.email, created_at: u.created_at }));

  // ── 2. Bets ────────────────────────────────────────────────────────────────
  let totalBets = 0, betsToday = 0, betsWeek = 0, recentBets = [];
  try {
    const res  = await supaFetch('/rest/v1/bets', { select: 'user_id,bet_date,horse,track,stake,result,is_virtual', 'is_virtual': 'eq.false', order: 'created_at.desc', limit: 1000 });
    const bets = await res.json();
    if (Array.isArray(bets)) {
      totalBets  = bets.length;
      betsToday  = bets.filter(b => b.bet_date === todayStr).length;
      betsWeek   = bets.filter(b => b.bet_date && b.bet_date >= todayStr.slice(0,7) + '-01').length;
      recentBets = bets.slice(0, 8).map(b => ({ horse: b.horse, track: b.track, stake: b.stake, result: b.result, date: b.bet_date }));
    }
  } catch(e) { console.error('Bets error:', e.message); }

  // ── 3. Activity — daily_log ────────────────────────────────────────────────
  let activeToday = 0, active7d = 0, active30d = 0;
  try {
    const res  = await supaFetch('/rest/v1/daily_log', { select: 'user_id,log_date,checked_in', order: 'log_date.desc', limit: 5000 });
    const logs = await res.json();
    if (Array.isArray(logs)) {
      const todaySet = new Set(logs.filter(l => l.log_date === todayStr).map(l => l.user_id));
      const w7Set    = new Set(logs.filter(l => l.log_date >= week7.slice(0,10)).map(l => l.user_id));
      const w30Set   = new Set(logs.filter(l => l.log_date >= week30.slice(0,10)).map(l => l.user_id));
      activeToday = todaySet.size;
      active7d    = w7Set.size;
      active30d   = w30Set.size;
    }
  } catch(e) { console.error('Daily log error:', e.message); }

  // ── 4. Retention ───────────────────────────────────────────────────────────
  const retention7d  = totalUsers > 0 ? Math.round(active7d  / totalUsers * 100) : 0;
  const retention30d = totalUsers > 0 ? Math.round(active30d / totalUsers * 100) : 0;

  return {
    ts: new Date().toISOString(),
    users:  { total: totalUsers, newToday, newWeek, recent: recentSignups },
    bets:   { total: totalBets, today: betsToday, thisMonth: betsWeek, recent: recentBets },
    activity: { activeToday, active7d, active30d },
    retention: { d7: retention7d, d30: retention30d }
  };
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/stats') {
    if (SERVICE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'SERVICE_KEY not configured — edit admin/server.js and paste your Supabase service role key.' }));
      return;
    }
    try {
      const stats = await getStats();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(stats));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Serve dashboard.html for everything else
  const file = path.join(__dirname, 'dashboard.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Racing Puzzle Admin  →  http://localhost:${PORT}\n`);
  if (SERVICE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('  ⚠️  Add your Supabase service role key to admin/server.js first.\n');
  }
});

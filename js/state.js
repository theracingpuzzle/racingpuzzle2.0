// ─── STATE ───
// Central data object — single source of truth
let D = {
  bets: [], bank: {start:0, current:0}, rules: [], dailyLog: [],
  impulse: [], vBank: {start:500, current:500, bets:[]}, watchlist: []
};

function load() {
  try {
    const s = localStorage.getItem(SK);
    if (s) {
      const p = JSON.parse(s);
      D = {...D, ...p};
      ['bets','rules','dailyLog','impulse','watchlist'].forEach(k => {
        if (!Array.isArray(D[k])) D[k] = [];
      });
      if (!D.bank || typeof D.bank !== 'object') D.bank = {start:0, current:0};
      if (!D.vBank || typeof D.vBank !== 'object') D.vBank = {start:500, current:500, bets:[]};
      if (!Array.isArray(D.vBank.bets)) D.vBank.bets = [];
      if (Array.isArray(D.watchlist)) {
        D.watchlist.forEach(w => { if (w.notes && !w.conditionsNotes) w.conditionsNotes = w.notes; });
      }
    }
  } catch(e) {}
}

function saveLocal() {
  try { localStorage.setItem(SK, JSON.stringify(D)); } catch(e) {}
}

// save() is defined in supabase.js and calls saveLocal + queues Supabase sync

function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function td()  { return new Date().toISOString().slice(0,10); }

// Time helpers
// Times before 9:30 treated as PM (covers evening flat meetings)
function timeToMins(t) {
  if (!t) return 9999;
  const p = String(t).split(':');
  if (p.length < 2) return 9999;
  const h = parseInt(p[0])||0, m = parseInt(p[1])||0, raw = h*60+m;
  return raw < 570 ? raw + 720 : raw;
}
function cmpTime(a, b) { return timeToMins(a) - timeToMins(b); }

const CONF_PTS = [1, 1.5, 2, 2.5, 3]; // points per confidence level 1–5
function getPointValue() { return parseFloat((D.settings && D.settings.pointValue) || 5); }

// ─── HELP / HOW TO USE ────────────────────────────────────────────────────────
// Full-screen overlay explaining every feature. Self-documenting: pulls live
// counts from D (bets, profiles, reviews) so the guide reflects real usage.

function helpOpen(startSection) {
  const existing = document.getElementById('help-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'help-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3000;background:var(--bg);display:flex;flex-direction:column;overflow:hidden;';
  modal.innerHTML = _helpBuildHTML(startSection || 'overview');
  document.body.appendChild(modal);
}

function helpClose() {
  const m = document.getElementById('help-modal');
  if (m) m.remove();
}

function helpSection(id) {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  modal.querySelectorAll('.help-pane').forEach(function(p) {
    p.style.display = p.getAttribute('data-help') === id ? '' : 'none';
  });
  modal.querySelectorAll('.help-nav-btn').forEach(function(b) {
    const on = b.getAttribute('data-help-btn') === id;
    b.style.background = on ? 'var(--navy)' : 'transparent';
    b.style.color = on ? '#fff' : 'var(--mut)';
    b.style.borderColor = on ? 'var(--navy)' : 'var(--bdr)';
  });
}

function _helpBuildHTML(activeSection) {
  // Live stats from real data
  const bets = (D.bets || []).length;
  const profiles = (D.watchlist || []).length;
  const reviews = (D.reviews || []).length;
  const targets = (D.watchlist || []).reduce(function(a, e) { return a + (e.targets || []).length; }, 0);
  const realBank = D.bank ? parseFloat(D.bank.current || 0).toFixed(2) : '0.00';
  const vBank = D.vBank ? parseFloat(D.vBank.current || 0).toFixed(2) : '0.00';

  const _s = function(id, label, icon) {
    const on = id === activeSection;
    return '<button class="help-nav-btn" data-help-btn="' + id + '" onclick="helpSection(\'' + id + '\')" style="display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:9px;border:1px solid ' + (on ? 'var(--navy)' : 'var(--bdr)') + ';background:' + (on ? 'var(--navy)' : 'transparent') + ';color:' + (on ? '#fff' : 'var(--mut)') + ';font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;white-space:nowrap;text-align:left;">'
      + icon + '<span>' + label + '</span>'
      + '</button>';
  };

  const _h2 = function(t, col) {
    return '<div style="font-family:var(--font);font-size:17px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:' + (col || 'var(--txt)') + ';margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid ' + (col || 'var(--bdr)') + '40;">' + t + '</div>';
  };

  const _card = function(title, body, col) {
    return '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:14px 16px;margin-bottom:10px;' + (col ? 'border-left:3px solid ' + col + ';' : '') + '">'
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:' + (col || 'var(--mut)') + ';margin-bottom:6px;">' + title + '</div>'
      + '<div style="font-size:13px;color:var(--txt);line-height:1.65;">' + body + '</div>'
      + '</div>';
  };

  const _tip = function(text) {
    return '<div style="display:flex;gap:8px;padding:9px 12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:8px;margin-bottom:8px;">'
      + '<span style="font-size:14px;flex-shrink:0;">💡</span>'
      + '<span style="font-size:12px;color:var(--txt);line-height:1.6;">' + text + '</span>'
      + '</div>';
  };

  const _step = function(n, text) {
    return '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">'
      + '<div style="width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;font-family:var(--font);font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">' + n + '</div>'
      + '<div style="font-size:13px;color:var(--txt);line-height:1.6;flex:1;">' + text + '</div>'
      + '</div>';
  };

  const _stat = function(n, l, col) {
    return '<div style="text-align:center;padding:12px 8px;background:var(--sur);border:1px solid var(--bdr);border-radius:10px;">'
      + '<div style="font-size:22px;font-weight:900;color:' + (col || 'var(--gld)') + ';">' + n + '</div>'
      + '<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin-top:3px;">' + l + '</div>'
      + '</div>';
  };

  // ── NAV ───────────────────────────────────────────────────────────────────
  const nav = '<div style="flex-shrink:0;padding:12px 14px;border-bottom:1px solid var(--bdr);display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;">'
    + _s('overview', 'Overview', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>')
    + _s('today', 'Today', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/></svg>')
    + _s('races', 'Races', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v14M5 3l14 5L5 11"/></svg>')
    + _s('tracker', 'Tracker', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>')
    + _s('bets', 'Bet Log', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>')
    + _s('stats', 'Stats', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V9M8 15V5M12 15V11M16 15V7"/></svg>')
    + _s('coach', 'Coach', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 1 5 5c0 2.05-1.23 3.81-3 4.58V13a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.42C8.23 10.81 7 9.05 7 7a5 5 0 0 1 5-5z"/><path d="M9 17h6"/><path d="M10 20h4"/></svg>')
    + _s('leagues', 'Leagues', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>')
    + '</div>';

  // ── PANE: OVERVIEW ────────────────────────────────────────────────────────
  const pOverview = '<div class="help-pane" data-help="overview" style="' + (activeSection === 'overview' ? '' : 'display:none;') + '">'
    + _h2('Racing Puzzle', '#F5A623')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.7;margin-bottom:18px;">A private racing intelligence tool — helping you research horses, track your betting, and build an edge over time. Everything stays on your device and your Supabase account.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:18px;">'
      + _stat(bets, 'Bets logged', '#60a5fa')
      + _stat(profiles, 'Horse profiles', '#a78bfa')
      + _stat(reviews, 'Race reviews', '#34d399')
      + _stat(targets, 'Race targets', '#f59e0b')
    + '</div>'
    + _h2('How it fits together')
    + _step('1', '<strong>Build profiles</strong> in the <strong>Tracker</strong> — one profile per horse you\'re following. Add going preferences, distance, target races and a reason for watching.')
    + _step('2', '<strong>Rate horses</strong> with your own My Rating (MR) on the Races card. The gap between MR and Official Rating (OR) is your <em>edge</em>.')
    + _step('3', '<strong>Check Today</strong> every morning — horses from your Tracker that are declared to run appear here automatically with a conditions match score.')
    + _step('4', '<strong>Log bets</strong> on the races card or Today card. Use the checklist before placing to stay disciplined.')
    + _step('5', '<strong>Write a review</strong> after every race — win, place or lose. Reviews feed the ideal conditions system and keep your ratings current.')
    + _step('6', '<strong>Monitor Stats</strong> — P&L, ROI, strike rate by confidence, jockey, track. Find what\'s working and cut what isn\'t.')
    + _tip('Start with 3–5 horses you know well. Build the habit of reviewing every run, and the data compounds quickly.')
    + '</div>';

  // ── PANE: TODAY ───────────────────────────────────────────────────────────
  const pToday = '<div class="help-pane" data-help="today" style="' + (activeSection === 'today' ? '' : 'display:none;') + '">'
    + _h2('Today Card', '#ef4444')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:14px;">Your morning briefing — shows every horse from your Tracker that is confirmed in today\'s declared runners. Loads from the Racing API at the start of each day.</div>'
    + _card('Conditions Score', 'Each runner shows a score like <strong>2 of 3</strong> — how many of their ideal conditions (going, distance, class) today\'s race matches. Green = all met. Orange = partial. Red = none.', '#ef4444')
    + _card('Edge', 'If you\'ve set a My Rating on a horse, the edge (MR minus OR) is shown. A positive edge means you rate them higher than the official handicapper.', '#4ade80')
    + _card('Notifications', 'Enable notifications in Settings → Notifications to get an alert when a profiler horse is running and again 30 minutes before race time. The app needs to be open or in a background tab.', '#60a5fa')
    + _tip('Tap any horse card on the Today page to open a full bet entry pre-filled with jockey, trainer and race details.')
    + _tip('If conditions aren\'t loading, tap the Races tab first to load today\'s card, then return to Today.')
    + '</div>';

  // ── PANE: RACES ───────────────────────────────────────────────────────────
  const pRaces = '<div class="help-pane" data-help="races" style="' + (activeSection === 'races' ? '' : 'display:none;') + '">'
    + _h2('Races Card', '#93c5fd')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:14px;">Live racecards for today from the Racing API. Browse by meeting, filter by race type, and deep-dive any runner.</div>'
    + _card('MR — My Rating', 'Tap the <strong>MR —</strong> chip on any runner to log your own rating. This is separate from the official OR and is used to calculate your edge. Ratings sync across all devices.', '#f59e0b')
    + _card('Shortlist', 'Tap the ▼ icon on any runner in your Tracker to see their full profile panel inline — going prefs, ratings chart, last review — without leaving the racecard.')
    + _card('Bet from Racecard', 'Tap the 📄 icon on any runner to open the full bet entry form pre-filled with horse, jockey, trainer and race time.', '#60a5fa')
    + _card('Profiler Badge', 'Horses already in your Tracker show a coloured left border and reason icon (👁 Eye Catcher, 📊 Form Study etc.) on the racecard so you spot them instantly.')
    + _tip('If a horse you\'ve rated (MR) appears with a higher mark than their OR, the green "▲ +N edge" badge shows next to their name.')
    + '</div>';

  // ── PANE: TRACKER ─────────────────────────────────────────────────────────
  const pTracker = '<div class="help-pane" data-help="tracker" style="' + (activeSection === 'tracker' ? '' : 'display:none;') + '">'
    + _h2('Tracker (Profiler)', 'var(--clr-watch)')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:14px;">Your private stable. One profile per horse — build intelligence over time through observations, reviews and targets.</div>'
    + _card('Horse Profile', '<strong>Why Logged</strong> — reason for tracking (Eye Catcher, Trainer Intel, Future Target etc.)<br><br><strong>Intel tab</strong> — ideal conditions auto-built from win/place reviews. Going, distance and class ranges are derived automatically as you add reviews.<br><br><strong>History tab</strong> — every race review as a timeline. Result dot coloured by outcome.<br><br><strong>Targets tab</strong> — upcoming races you\'re aiming at. Past unreviewed targets flag for attention.<br><br><strong>Bets tab</strong> — betting record for this horse with P&L and ROI.')
    + _card('Readiness Status', 'Each profile has a status bar: <strong>Watching → Interesting → On Radar → Ready to Back → Cold</strong>. Tap it to change. The list view groups and filters by this.', '#10b981')
    + _card('Reviews', 'After every run, tap <strong>+ Review</strong> on the profile. Fill in result, position, going, distance, class and your verdict (Upgrade / Hold / Downgrade). Reviews build the ideal conditions and MR adjustment history automatically.', '#4ade80')
    + _card('Calendar View', 'Switch to Calendar (top right of Tracker) to see all targets, reviews and observations on a monthly timeline. Past unreviewed targets show a red dot.', '#f59e0b')
    + _card('Running Today', 'If any profiler horses are in today\'s declared runners, a green <strong>Running Today</strong> panel appears at the top of the list automatically.', '#10b981')
    + _tip('The Needs Attention filter finds profiles with no reviews, past targets not written up, or missing race data. Clear these regularly to keep your data clean.')
    + _tip('Use the Puzzle Report (Coach tab in profile) to get an AI assessment of a horse\'s form, level and race targets.')
    + '</div>';

  // ── PANE: BET LOG ─────────────────────────────────────────────────────────
  const pBets = '<div class="help-pane" data-help="bets" style="' + (activeSection === 'bets' ? '' : 'display:none;') + '">'
    + _h2('Bet Logger', '#fb923c')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:14px;">Track every real and virtual bet. The app maintains two banks — real money and a virtual paper-trading bank — so you can test selections risk-free.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">'
      + _stat('£' + realBank, 'Real Bank', '#60a5fa')
      + _stat('£' + vBank, 'Virtual Bank', '#fb923c')
    + '</div>'
    + _card('Logging a Bet', 'Tap <strong>Log Bet</strong> on any horse from Today or Races. Fill in stake, bet type (Win / E/W / Place), confidence level and your pre-bet checklist. Odds can be entered as decimals or fractions.', '#fb923c')
    + _card('Pre-Bet Checklist', 'A set of discipline questions before every bet — research time, source quality, going match, motivation to bet. Your score feeds the Stats card so you can see if higher-scored bets perform better.', '#f59e0b')
    + _card('Settling Results', 'After the race, open the bet and tap <strong>Settle</strong>. Enter the result and your returns. The bank updates automatically.', '#4ade80')
    + _card('Virtual Bets', 'Use the Virtual bank to paper-trade without risking real money. Toggle to Virtual when logging. Both banks appear in Stats so you can compare your real vs. virtual performance.')
    + _card('E/W Bets', 'Each Way bets store the total outlay (stake × 2). So a £5 E/W bet logs as £10 stake — £5 win, £5 place.')
    + _tip('Set your Starting Bank in Settings → Banks so the bankroll chart in Stats tracks from the right baseline.')
    + '</div>';

  // ── PANE: STATS ───────────────────────────────────────────────────────────
  const pStats = '<div class="help-pane" data-help="stats" style="' + (activeSection === 'stats' ? '' : 'display:none;') + '">'
    + _h2('Stats Card', '#60a5fa')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:14px;">A full breakdown of your betting performance. All metrics update live as you log and settle bets.</div>'
    + _card('Key Metrics', '<strong>P&L</strong> — total profit/loss<br><strong>ROI</strong> — return on investment as a %<br><strong>Strike Rate</strong> — % of bets that win<br><strong>Avg Odds</strong> — weighted average starting price')
    + _card('Bankroll Chart', 'Running bank balance over time. Slopes down after losses, up after wins. The shape tells you more than any single number — look for drawdown periods and recovery.')
    + _card('By Confidence', 'See if your 3-star bets outperform your 1-star bets. If not, your confidence calibration needs work — or the low-confidence bets aren\'t worth placing.')
    + _card('By Source / Jockey / Track', 'Break down P&L by where the selection came from, which jockey, which track. Find your profitable angles and double down on them.')
    + _tip('Stats separate Real and Virtual banks. Switch between them at the top of the card.')
    + '</div>';

  // ── PANE: COACH ───────────────────────────────────────────────────────────
  const pCoach = '<div class="help-pane" data-help="coach" style="' + (activeSection === 'coach' ? '' : 'display:none;') + '">'
    + _h2('The Coach', '#a855f7')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:14px;">An AI betting coach powered by Claude. It reads your betting data and gives honest, constructive feedback — not tips, but process improvement.</div>'
    + _card('What it does', 'The Coach analyses your recent bets, win rate, confidence scoring and patterns. It identifies if you\'re over-betting certain tracks, chasing losses, or ignoring your own checklist signals.', '#a855f7')
    + _card('Puzzle Report', 'On any horse profile, tap <strong>Puzzle Report</strong> to generate an AI assessment of that horse — its form trajectory, ideal conditions, projected level and when to back it.', '#a855f7')
    + _card('Setup', 'Add your Claude API key in Settings → Setup → AI Coach API Key. You can get a key from console.anthropic.com. The key is stored locally and never sent anywhere except Anthropic\'s API.')
    + _tip('The Coach works best after you\'ve logged at least 20 bets. The more data, the more specific the feedback.')
    + '</div>';

  // ── PANE: LEAGUES ────────────────────────────────────────────────────────
  const pLeagues = '<div class="help-pane" data-help="leagues" style="' + (activeSection === 'leagues' ? '' : 'display:none;') + '">'
    + _h2('Leagues', '#10b981')
    + '<div style="font-size:13px;color:var(--mut);line-height:1.65;margin-bottom:14px;">Compete with friends on selections without real money changing hands. Pick a horse from any racecard, score points based on finishing position and odds.</div>'
    + _card('Creating a League', 'Tap <strong>+ New League</strong>, give it a name and share the join code with friends. You\'re the admin — you control the scoring rules and can see all picks.')
    + _card('Making Picks', 'On any racecard, tap the 🏆 trophy icon on a runner to add them to your league pick for that race. One pick per race per player.')
    + _card('Scoring', 'Points are awarded based on your league\'s rules — typically points for a win, fewer for a place. The leaderboard updates after results are confirmed.')
    + _tip('Leagues are great for keeping a group engaged through a festival week — Cheltenham, Royal Ascot, Glorious Goodwood.')
    + '</div>';

  return '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--bdr);background:var(--sur);flex-shrink:0;">'
      + '<button onclick="helpClose()" style="background:none;border:none;color:var(--mut);font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;padding:0;display:flex;align-items:center;gap:5px;">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Close'
      + '</button>'
      + '<div style="flex:1;font-family:var(--font);font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;text-align:center;">How to Use</div>'
      + '<div style="width:48px;"></div>'
    + '</div>'
    + nav
    + '<div style="flex:1;overflow-y:auto;padding:16px 14px 32px;-webkit-overflow-scrolling:touch;">'
      + pOverview + pToday + pRaces + pTracker + pBets + pStats + pCoach + pLeagues
    + '</div>';
}

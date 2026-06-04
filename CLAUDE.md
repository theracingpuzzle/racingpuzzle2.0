# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A single-page progressive web app (PWA) for horse racing bet tracking and analysis. No build step, no framework, no package manager — plain HTML/CSS/JS served directly from the filesystem or any static host. Open `index.html` in a browser to run it.

## Architecture

### JS Load Order (critical)
Scripts are loaded in this exact order in `index.html` and must stay that way:
```
config.js → state.js → utils.js → supabase.js → racing-api.js →
racecards.js → ui-shell.js → today.js → betting.js → rules.js →
dashboard.js → virtual.js → watchlist.js → coach.js → init.js
```
`init.js` is the entry point — it calls `load()` (state), then `supaLoad()` (Supabase), then renders all cards.

### Global State
`D` in `state.js` is the single source of truth — a plain object persisted to `localStorage` under the key `SK` (`'racing-edge-v2'`). Shape:
- `D.bets` — real bet log
- `D.vBank.bets` — virtual bet log
- `D.bank` — `{start, current}` real bank
- `D.vBank` — `{start, current, bets}` virtual bank
- `D.watchlist`, `D.rules`, `D.dailyLog`, `D.reviews`, `D.impulse`
- `D.settings` — API keys, Racing API credentials, staking plan

`save()` (in `supabase.js`) = `saveLocal()` + debounced Supabase upsert. Always call `save()` after mutating `D`, never `saveLocal()` alone unless intentionally skipping remote sync.

### Dual Persistence
- **localStorage** — instant, offline-capable. Primary read path on boot.
- **Supabase** — remote sync via REST. `supaLoad()` pulls on boot and overwrites localStorage. `supaSync()` debounces writes (1500ms). Tables: `bets`, `vbets`, `bank`, `vbank`, `watchlist`, `rules`, `settings`, `reviews`, `daily_log`.

### External APIs
- **Racing API** — proxied through `https://racing-proxy.theracingpuzzle.workers.dev` (Cloudflare Worker). Credentials stored in `D.settings.racingCreds` (Supabase-synced) and cached in `localStorage` under `RACING_CREDS_KEY`. `callRacingAPI(endpoint, params)` in `racing-api.js` is the single call site.
- **Claude API** (Coach card) — called directly from `coach.js` with the user's own API key stored in `D.settings.apiKey`.

### UI Modes
Two parallel UI modes exist side by side:
- **Swipe mode** — card-based swipe navigation (`#sw-shell` / `#deck`). Cards defined in `CARDS` array in `config.js`.
- **CMD mode** — traditional tab/command interface.
Toggle via `setMode('sw'|'cmd')` in `ui-shell.js`.

### Racecard Cache
`window._todayMeetingsCache` is a shared in-memory cache between `racecards.js` and `today.js` to avoid double-fetching the same API call in one session.

## Key Conventions

- **IDs over classes** for JS targeting — nearly all DOM lookups use `getElementById`.
- **Inline styles** are common and intentional — the app generates large amounts of dynamic HTML as template strings.
- **No module system** — all functions are global. Name collisions are avoided by prefixing (e.g. `rcSw*` for racecard swipe functions).
- **`gid()`** generates IDs for new records (`Date.now().toString(36) + random`).
- **`td()`** returns today's date as `YYYY-MM-DD`.
- **`timeToMins(t)`** normalises race times: anything before 09:30 is treated as PM (evening flat meetings).
- EW bets store **total outlay** (stake × 2), not per-leg stake. A one-time migration in `state.js` handles legacy data.

## Config Constants (`config.js`)
- `SK` — localStorage key
- `SUPA_URL` / `SUPA_ANON` — Supabase project URL and anon key
- `SUPA_USER_ID` — user identifier (currently a fixed string; auth not yet implemented)
- `CARDS` — swipe card definitions (id, label, colour, comingSoon flag)
- `TKS` — sorted list of UK/IRE racecourses
- `CKS` / `CKS_OWN` / `CKS_TIP` — pre-bet checklist question definitions

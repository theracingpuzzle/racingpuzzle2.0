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
- **Supabase** — remote sync via REST. `supaLoad()` pulls on boot and overwrites localStorage. `supaSync()` debounces writes (1500ms).

## Verified Supabase Schema

All tables confirmed against live DB export. **Never add columns to JS sync without adding them to the DB first.**

### `bank`
| Column | Type | Nullable |
|---|---|---|
| id | uuid PK | NO |
| user_id | text | NO |
| real_start | numeric | YES (default 0) |
| real_current | numeric | YES (default 0) |
| virtual_start | numeric | YES (default 500) |
| virtual_current | numeric | YES (default 500) |
| updated_at | timestamptz | YES |

### `bets`
Single table for real **and** virtual bets — distinguished by `is_virtual` boolean.
| Column | Type | Nullable |
|---|---|---|
| id | text PK | NO |
| user_id | text | NO |
| bet_date | date | NO |
| horse | text | NO |
| track | text | YES |
| race_time | text | YES |
| jockey | text | YES |
| trainer | text | YES |
| odds | numeric | YES |
| odds_display | text | YES |
| stake | numeric | NO |
| bet_type | text | YES (default 'win') |
| confidence | smallint | YES |
| source | text | YES |
| pre_notes | text | YES |
| post_notes | text | YES |
| checklist_score | smallint | YES (default 0) |
| result | text | YES |
| returns | numeric | YES (default 0) |
| bet_banked | boolean | YES (default false) |
| is_virtual | boolean | YES (default false) |
| created_at | timestamptz | YES |

### `bet_stats`
DB-level view/aggregate — **read only, never written by JS**.

### `daily_log`
| Column | Type | Nullable |
|---|---|---|
| id | uuid PK | NO |
| user_id | text | NO |
| log_date | date | NO |
| visited | boolean | YES |
| checked_in | boolean | YES |
| mood | text | YES (default 'neutral') |
| notes | text | YES |
| tracks | text[] | YES |
| created_at | timestamptz | YES |

### `horse_profiles`
| Column | Type | Nullable |
|---|---|---|
| id | text PK | NO |
| user_id | text | NO |
| horse | text | NO |
| trainer | text | YES |
| current_rating | text | YES |
| my_rating | text | YES |
| or_history | jsonb | YES (default []) |
| reason | text | YES (default 'eye-catcher') |
| reason_note | text | YES |
| trainer_intel | text | YES |
| going_prefs | text[] | YES (default {}) |
| distance_pref | text | YES |
| track_pref | text | YES |
| conditions_notes | text | YES |
| needs_review | boolean | YES (default false) |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

### `horse_reviews`
Post-race reviews linked to a horse profile. Synced by `_syncReviews()` in `supabase.js`.
| Column | Type | Nullable |
|---|---|---|
| id | text PK | NO |
| user_id | text | NO |
| profile_id | text | NO |
| date | date | YES |
| race_name | text | YES |
| course | text | YES |
| result | text | YES |
| position | text | YES |
| beaten_distance | text | YES |
| verdict | text | YES |
| mr_adjustment | integer | YES (default 0) |
| going_confirmed | text | YES |
| back_next_time | text | YES |
| notes | text | YES |
| source | text | YES (default 'manual') |
| created_at | timestamptz | YES |

> ⚠️ The JS reads `r.needs_review` from this table but **`needs_review` does not exist** in `horse_reviews` — it only exists on `horse_profiles`. The JS fallback `||false` masks this silently.

### `profile_observations`
Race observations attached to a profile. Synced by `_syncProfiles()`.
| Column | Type | Nullable |
|---|---|---|
| id | text PK | NO |
| profile_id | text | NO |
| user_id | text | NO |
| obs_date | date | YES |
| race_name | text | YES |
| track | text | YES |
| going | text | YES |
| result | text | YES |
| notes | text | YES |
| created_at | timestamptz | YES |

### `profile_race_results`
Exists in DB (`id`, `profile_id`, `user_id`, `result_date`, `track`) but is **not read or written by any JS code**. Likely a legacy or unused table.

### `profile_targets`
Race targets attached to a profile. Synced by `_syncProfiles()`.
| Column | Type | Nullable |
|---|---|---|
| id | text PK | NO |
| profile_id | text | NO |
| user_id | text | NO |
| race | text | YES |
| track | text | YES |
| target_date | date | YES |
| condition | text | YES |
| created_at | timestamptz | YES |

### `rules` / `settings`
Simple key/value and ordered text rows — no complex schema.

## Known Schema Discrepancies
1. **`horse_reviews.needs_review`** — JS reads this field but it does not exist in the DB. Masked by `||false`. Safe to add the column or remove the read.
2. **`profile_race_results`** — table exists in DB but is completely unused by the JS. Do not write to it without understanding its purpose first.
3. **`bet_stats`** — likely a DB view. Never attempt to upsert/insert into it.

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

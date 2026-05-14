// ─── CONFIG ───
// App key & Supabase credentials
const SK = 'racing-edge-v2';
const SUPA_URL = 'https://stsmantobrvejfykstrl.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c21hbnRvYnJ2ZWpmeWtzdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODg0MDAsImV4cCI6MjA5Mzg2NDQwMH0.mNxwB3lIBpTUNBXWIFJ6ODzrMFG4onvU4WIYsduo83E';
let SUPA_USER_ID = 'racing-puzzle-default'; // update when auth is added

// ─── SWIPE CARDS ───
const CARDS = [
  {id:'today',  lbl:'Today',          col:'var(--gld)'},
  {id:'cards',  lbl:'Racecards',      col:'#60a5fa'},
  {id:'results',lbl:'Results',        col:'#fb923c'},
  {id:'coach',  lbl:'Coach',          col:'#cc44aa'},
  {id:'bank',   lbl:'Bank',           col:'#f0aa44'},
  {id:'watch',  lbl:'Puzzle Profiler',col:'#e879f9'}
];

// ─── TRACKS ───
const TKS = ['Ascot','Aintree','Ayr','Bath','Brighton','Carlisle','Catterick','Chelmsford City','Cheltenham','Chester','Chepstow','Cork','Curragh','Doncaster','Down Royal','Dundalk','Epsom','Exeter','Fakenham','Ffos Las','Galway','Goodwood','Gowran Park','Hamilton','Haydock','Hereford','Hexham','Huntingdon','Kelso','Kempton','Leopardstown','Leicester','Limerick','Lingfield','Ludlow','Market Rasen','Musselburgh','Naas','Navan','Newbury','Newcastle','Newmarket','Newton Abbot','Nottingham','Perth','Plumpton','Pontefract','Punchestown','Redcar','Ripon','Salisbury','Sandown','Sedgefield','Sligo','Southwell','Stratford','Taunton','Thirsk','Tipperary','Towcester','Tramore','Uttoxeter','Warwick','Wincanton','Windsor','Wolverhampton','Worcester','Yarmouth','York'].sort();

// ─── PRE-BET CHECKLIST ───
const CKS = [
  {t:'I can state in one sentence exactly why this horse wins',s:"If I can't articulate it clearly, I'm guessing"},
  {t:'My reason is based on my own form study — not a tip or gut feel',s:'I did the work. Not borrowed conviction from a tweet or forum'},
  {t:'Going is suitable — horse has proven form on today\'s ground',s:'Check last 3+ runs on similar conditions, not just assumed'},
  {t:'Distance is proven or the step up/down is well evidenced',s:'Won or placed over this trip, or clear form reason to back the change'},
  {t:'Race conditions suit — class, weights, and draw considered',s:'How does the race set up? Is my horse getting in well or fighting uphill?'},
  {t:'I have estimated the true probability and the price is value',s:'My P% is meaningfully greater than what the odds imply'},
  {t:'I have assessed the whole field — not tunnel-visioned on my pick',s:'Are others well-treated, unexpectedly dangerous, or drifting for a reason?'},
  {t:'I am NOT chasing a loss or trying to recover a bad run',s:'This bet stands entirely on its own merits — yesterday is irrelevant'},
  {t:'This is NOT a boredom or entertainment bet',s:'There is genuine evidence here — not just an itch to have something on'},
  {t:'Stake fits the staking plan — not inflated or reduced by emotion',s:'Following the rules, not the feeling. Same unit as always'}
];

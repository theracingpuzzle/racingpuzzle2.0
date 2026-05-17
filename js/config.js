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
  {id:'bank',   lbl:'Bank',           col:'#f0aa44'},
  {id:'watch',  lbl:'Puzzle Profiler',col:'#e879f9'},
  {id:'coach',  lbl:'Coach',          col:'#cc44aa', comingSoon:true}
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

// ─── OWN SELECTION CHECKLIST ───
const CKS_OWN = [
  {
    id:'research-time',
    t:'How long did I spend researching?',
    s:'Quick glance → Deep study',
    type:'scale',
    scaleMin:'Quick glance',scaleMax:'Deep study'
  },
  {
    id:'form-distance',
    t:'Did I check the distance and form lines?',
    s:'Have I read the form and confirmed the trip suits?',
    type:'yes-no',
    goodAnswer:'yes'
  },
  {
    id:'video',
    t:'Did I watch a replay or race video?',
    s:'Did I actually see how this horse moves and races?',
    type:'yes-no',
    goodAnswer:'yes'
  },
  {
    id:'ratings',
    t:'If a handicap — did I work on the ratings?',
    s:'Have I compared official ratings and looked for the edge?',
    type:'multi',
    options:[
      {label:'Yes — ratings worked',score:100},
      {label:'N/A — not a handicap',score:75},
      {label:'No',score:0}
    ]
  },
  {
    id:'price',
    t:'Is the price right?',
    s:'Am I backing value or just backing the horse?',
    type:'multi',
    options:[
      {label:'Value',score:100},
      {label:'Fair',score:75},
      {label:'Marginal',score:25},
      {label:'Forced',score:0}
    ]
  },
  {
    id:'why',
    t:'Why did I reach for the phone?',
    s:'Was this planned research or an impulse?',
    type:'multi',
    options:[
      {label:'Planned',score:100},
      {label:'Spotted it',score:75},
      {label:'Tipster',score:50},
      {label:'Impulse',score:0}
    ]
  },
  {
    id:'time-of-day',
    t:'Time of day',
    s:'Captured automatically — morning research scores highest',
    type:'auto',
    autoCapture:'time-of-day',
    bands:[
      {before:12,label:'Morning',score:100},
      {before:17,label:'Afternoon',score:75},
      {before:20,label:'Evening',score:50},
      {before:24,label:'Late',score:25}
    ]
  }
];


// ─── TIP / SOURCE CHECKLIST ───
const CKS_TIP = [
  {id:'tip-source-record',t:"I know and respect this source's long-term track record",s:"One big winner doesn't make a reliable source — what's the full picture?",type:'yes-no',goodAnswer:'yes'},
  {id:'tip-form-check',t:'I have independently looked at the form myself',s:"Not just taking their word — I've checked going, distance, and class",type:'yes-no',goodAnswer:'yes'},
  {id:'tip-reason',t:'I understand the actual reason this horse is being backed',s:'Trainer move, handicap mark, course form — I know the angle, not just the name',type:'yes-no',goodAnswer:'yes'},
  {id:'tip-price',t:'The price on offer is acceptable',s:'Value still has to exist even when following someone else',type:'yes-no',goodAnswer:'yes'},
  {id:'tip-field',t:'I have checked the whole field',s:'A quick scan — am I aware of the likely dangers?',type:'yes-no',goodAnswer:'yes'},
  {id:'tip-conviction',t:'I am not backing this just because the source sounds confident',s:'Confidence is not edge. I must have my own reasons to agree',type:'yes-no',goodAnswer:'yes'},
  {id:'tip-chasing',t:'I am NOT chasing a loss or trying to recover a bad run',s:'This bet stands entirely on its own merits — yesterday is irrelevant',type:'yes-no',goodAnswer:'yes'},
  {id:'tip-stake',t:"Stake is the same as I'd use for my own selections",s:"Tips don't get bigger stakes — the discipline stays constant",type:'yes-no',goodAnswer:'yes'}
];


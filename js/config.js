// ─── CONFIG ───
// ─── CARD ACCENT COLOURS ───
// Single source of truth for JS-generated inline styles.
// Must match --clr-watch (and siblings) in app.css :root.
const CLR_WATCH    = '#f59e0b';            /* must match --clr-watch in app.css :root */
const CLR_WATCH_A1 = 'rgba(245,158,11,.06)';
const CLR_WATCH_A2 = 'rgba(245,158,11,.1)';
const CLR_WATCH_A3 = 'rgba(245,158,11,.15)';
const CLR_WATCH_A4 = 'rgba(245,158,11,.2)';
const CLR_WATCH_A5 = 'rgba(245,158,11,.3)';
const CLR_WATCH_A6 = 'rgba(245,158,11,.35)';
const CLR_WATCH_A7 = 'rgba(245,158,11,.4)';
const CLR_WATCH_A8 = 'rgba(245,158,11,.5)';

// App key & Supabase credentials
const SK = 'racing-edge-v2';
const SUPA_URL = 'https://stsmantobrvejfykstrl.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c21hbnRvYnJ2ZWpmeWtzdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODg0MDAsImV4cCI6MjA5Mzg2NDQwMH0.mNxwB3lIBpTUNBXWIFJ6ODzrMFG4onvU4WIYsduo83E';
let SUPA_USER_ID = 'racing-puzzle-default'; // update when auth is added

// ─── SWIPE CARDS ───
const CARDS = [
  {id:'today',    lbl:'Today',    col:'#ef4444'},
  {id:'cards',    lbl:'Races',    col:'#93c5fd'},
  {id:'results',  lbl:'Results',  col:'#fb923c'},
  {id:'watch',    lbl:'Tracker',  col:CLR_WATCH},
  {id:'stats',    lbl:'Stats',    col:'#60a5fa'},
  {id:'leagues',  lbl:'Leagues',  col:'#10b981'},
  {id:'settings', lbl:'Settings', col:'#94a3b8'},
];

// ─── TRACKS ───
const TKS = ['Eagle Farm','Greyville','Ascot','Aintree','Ayr','Bath','Brighton','Carlisle','Catterick','Chelmsford City','Cheltenham','Chester','Chepstow','Cork','Curragh','Doncaster','Down Royal','Dundalk','Epsom','Exeter','Fakenham','Ffos Las','Galway','Goodwood','Gowran Park','Hamilton','Haydock','Hereford','Hexham','Huntingdon','Kelso','Kempton','Leopardstown','Leicester','Limerick','Lingfield','Ludlow','Market Rasen','Musselburgh','Naas','Navan','Newbury','Newcastle','Newmarket','Newton Abbot','Nottingham','Perth','Plumpton','Pontefract','Punchestown','Redcar','Ripon','Salisbury','Sandown','Sedgefield','Sligo','Southwell','Stratford','Taunton','Thirsk','Tipperary','Towcester','Tramore','Uttoxeter','Warwick','Wincanton','Windsor','Wolverhampton','Worcester','Yarmouth','York'].sort();

// ─── PRE-BET CHECKLIST ───
// ─── OWN SELECTION CHECKLIST ───
const CKS_OWN = [
  {
    id:'research-time',
    t:'How long did I spend researching?',
    s:'Be honest — this shapes your score',
    type:'multi',
    options:[
      {label:'Quick glance',score:0},
      {label:'10–15 mins',score:33},
      {label:'30+ mins',score:66},
      {label:'Deep study',score:100}
    ]
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
    t:'Did I work on the handicap ratings?',
    s:'Have I compared official ratings and looked for the edge?',
    type:'multi',
    autoSkipIfNotHandicap:true,
    options:[
      {label:'Yes — ratings worked',score:100},
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
    t:'How far in advance?',
    s:'Captured automatically — the earlier before the race, the better',
    type:'auto',
    autoCapture:'time-before-race',
    bands:[
      {minsMin:120, label:'2h+ before',  score:100},
      {minsMin:60,  label:'1–2h before', score:75},
      {minsMin:20,  label:'20–60 mins',  score:50},
      {minsMin:0,   label:'Under 20 mins / race starting', score:25}
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


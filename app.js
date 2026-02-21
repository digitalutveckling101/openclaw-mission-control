const $ = (id) => document.getElementById(id);
const APP_PASSWORD = 'Biggie-2026!'; // ändra direkt
if (sessionStorage.getItem('mc_unlocked') !== '1') {
  const p = prompt('Mission Control lösenord:');
  if (p !== APP_PASSWORD) {
    document.body.innerHTML = '<div style="display:grid;place-items:center;height:100vh;background:#070c12;color:#e7f0f5;font-family:Inter,Arial">⛔ Access denied</div>';
    throw new Error('Locked');
  }
  sessionStorage.setItem('mc_unlocked','1');
}

const saveIds = ['dbIdeas','dbResearch','dbScript','dbFilming','pjBacklog','pjProgress','pjReview','pjDone','revGoal','revNow','timelineText','intelText','meetingsText','subsNow','subsGoal','crmText','pipeText','coreText'];
const API_STATE = '/api/state';
let remoteUpdatedAt = null;
let pushTimer = null;
let applyingRemote = false;

function getSyncSecret(){
  return localStorage.getItem('mc_sync_secret') || '';
}
function ensureSyncSecret(){
  let s = getSyncSecret();
  if (!s) {
    s = prompt('SYNC_SECRET (sätt samma som i Vercel env):') || '';
    if (s) localStorage.setItem('mc_sync_secret', s);
  }
  return s;
}
const defaultAgents = [
  {name:'atlas', role:'CTO / Coder', model:'GPT-5.3 Codex'},
  {name:'iris', role:'Creative Director', model:'Claude-4.6'},
  {name:'nexus', role:'Project Manager', model:'GPT-5.3 Codex'},
  {name:'herald', role:'Marketing', model:'Gemini'},
  {name:'ops', role:'DevOps / SysAdmin', model:'GPT-5.3 Codex'},
  {name:'quill', role:'Content Lead', model:'Claude-4.6'},
  {name:'sentinel', role:'QA Director', model:'Gemini'},
  {name:'scout', role:'Researcher', model:'Gemini'}
];

function setTab(tab){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===tab));
}

document.querySelectorAll('.tab').forEach(b=> b.onclick = ()=> setTab(b.dataset.tab));

function renderAgents(){
  const agents = JSON.parse(localStorage.getItem('mc_agents') || 'null') || defaultAgents;
  const wrap = $('agentsGrid');
  wrap.innerHTML = '';
  agents.forEach(a => {
    const c = document.createElement('article');
    c.className = 'agent-card';
    c.innerHTML = `<h5>🧠 ${a.name}</h5><div class='muted'>${a.role}</div><div class='muted'>${a.model}</div><div class='status' style='margin-top:6px'>● READY</div><button class='send'>Send Task</button>`;
    wrap.appendChild(c);
  });
}

function updateBars(){
  const goal = Number($('revGoal').value||0), now = Number($('revNow').value||0);
  const p = goal ? Math.min(100, now/goal*100) : 0;
  $('revBar').style.width = p + '%';
  $('revText').textContent = `${now.toLocaleString()} / ${goal.toLocaleString()} SEK (${p.toFixed(1)}%)`;

  const sGoal = Number($('subsGoal').value||5000), sNow = Number($('subsNow').value||0);
  const s = sGoal ? Math.min(100, sNow/sGoal*100) : 0;
  $('subsBar').style.width = s + '%';
  $('subsText').textContent = `${sNow.toLocaleString()} / ${sGoal.toLocaleString()} subs (${s.toFixed(1)}%)`;
}

function collectState(){
  const data = {};
  saveIds.forEach(id=> data[id] = $(id).value);
  return data;
}

function setSyncStatus(text){ const el = $('syncStatus'); if (el) el.textContent = text; }

async function pushRemote(state){
  try {
    setSyncStatus('Syncar…');
    const secret = ensureSyncSecret();
    const headers = {'Content-Type':'application/json'};
    if (secret) headers['x-sync-secret'] = secret;

    const res = await fetch(API_STATE, {
      method:'POST',
      headers,
      body: JSON.stringify({ state })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Sync failed');
    if (json?.updated_at) remoteUpdatedAt = json.updated_at;
    setSyncStatus('Synkad ✅');
  } catch (_) { setSyncStatus('Sync fel ⚠️'); }
}

function schedulePush(state){
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushRemote(state), 700);
}

function applyState(data){
  applyingRemote = true;
  saveIds.forEach(id => { if (data[id] !== undefined) $(id).value = data[id]; });
  localStorage.setItem('mc_v2', JSON.stringify(data));
  updateBars();
  $('kpiIdeas').textContent = ($('dbIdeas').value.match(/\n/g)?.length || 0) + 1;
  $('kpiProgress').textContent = ($('pjProgress').value.match(/\n/g)?.length || 0) + 1;
  applyingRemote = false;
}

function save(){
  const data = collectState();
  localStorage.setItem('mc_v2', JSON.stringify(data));
  updateBars();
  $('kpiIdeas').textContent = ($('dbIdeas').value.match(/\n/g)?.length || 0) + 1;
  $('kpiProgress').textContent = ($('pjProgress').value.match(/\n/g)?.length || 0) + 1;
  if (!applyingRemote) schedulePush(data);
}

function load(){
  const data = JSON.parse(localStorage.getItem('mc_v2') || '{}');
  saveIds.forEach(id => { if (data[id] !== undefined) $(id).value = data[id]; });
  if(!data.revGoal) $('revGoal').value = 30000;
  if(!data.subsNow) $('subsNow').value = 107;
  if(!data.dbIdeas) $('dbIdeas').value = 'Stripe launch plan\nVBC content engine (TikTok + LinkedIn)\nMission Control V3 polish\n7-dagars carousel batch';
  if(!data.dbResearch) $('dbResearch').value = 'Målgrupp: svenska entreprenörer/konsulter\nLinkedIn carousel best practices\nFunnel: views -> profile -> DM -> Stripe';
  if(!data.dbScript) $('dbScript').value = 'Hook: Bygg förtroende, inte viralitet\nFramework #2: Trovärdighetskontot\nCTA: Skriv START för mall';
  if(!data.dbFilming) $('dbFilming').value = 'Spela in kort voiceover till dagens post\nPublicera TikTok manuellt\nPublicera LinkedIn karusell manuellt';

  if(!data.pjBacklog) $('pjBacklog').value = 'Postiz automation (senare)\nClerk/Supabase auth för Mission Control\nLarry Sverige skill-pack';
  if(!data.pjProgress) $('pjProgress').value = 'Mission Control V2 UI\nStripe go-live prep\nCarousel demos V4 humans';
  if(!data.pjReview) $('pjReview').value = 'VBC onboarding copy\nPricing/paywall copy\nMission Control nav + UX';
  if(!data.pjDone) $('pjDone').value = 'OpenAI Codex auth kopplad\nTelegram export importerad (621 msgs)\nBiggie Core Stack skapad';

  if(!data.timelineText) $('timelineText').value = '2026-02-20 - Mission Control V2 live\n2026-02-20 - GitHub + Vercel deploy\n2026-02-21 - Stripe implementation\n2026-02-22 - 7-dagars content sprint start';

  if(!data.intelText) $('intelText').value = 'Fokus: intäkt före tool-jakt.\nModel stability först (Codex + compaction).\nBudskap: Build trust, not virality.';
  if(!data.meetingsText) $('meetingsText').value = 'Action: Slutför Stripe setup.\nAction: Publicera 1 TikTok + 1 LinkedIn/dag.\nAction: Iterera creatives från feedback.';
  if(!data.crmText) $('crmText').value = 'Lead 1 | Warm | Följ upp med demo\nLead 2 | DM startad | Skicka case\nLead 3 | Trial | Nurture';
  if(!data.pipeText) $('pipeText').value = 'Carousel: 5 misstag som dödar förtroende\nCarousel: Från kaos till content-system\nPost: Varför views != kunder';

  if(!data.coreText) {
    $('coreText').value = 'Biggie Core Stack\n- Kort sikt: Stripe + content som konverterar\n- Fokus: TikTok + LinkedIn (manual mode)\n- Anti-chaos: en ship/day, dokumentera allt';
  }

  updateBars();
}

async function pullRemote(){
  try {
    const res = await fetch(API_STATE);
    const json = await res.json();
    if (!json || !json.state) return;
    if (!remoteUpdatedAt || (json.updated_at && json.updated_at !== remoteUpdatedAt)) {
      remoteUpdatedAt = json.updated_at || remoteUpdatedAt;
      applyState(json.state);
      setSyncStatus('Uppdaterad ↻');
    }
  } catch (_) {}
}

$('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  const found = [...document.querySelectorAll('.tab')].find(t => t.textContent.toLowerCase().includes(q));
  if(found && q.length>1) setTab(found.dataset.tab);
});

saveIds.forEach(id => $(id).addEventListener('input', save));

$('loadCore').onclick = async () => {
  try {
    const res = await fetch('../BIGGIE_CORE_STACK.md');
    if (!res.ok) throw new Error('Kunde inte läsa filen');
    $('coreText').value = await res.text();
    save();
    alert('Core Stack laddad från fil ✅');
  } catch (e) {
    alert('Kunde inte läsa fil automatiskt. Kör via http-server eller klistra in manuellt.');
  }
};
$('saveCore').onclick = save;
$('syncNow').onclick = () => pushRemote(collectState());

setInterval(()=> $('clock').textContent = new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'}), 1000);
$('clock').textContent = new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});

renderAgents();
load();
pullRemote();
setInterval(pullRemote, 10000);

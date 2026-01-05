import { missions } from "./data/missions.js";
import { penalties, banRedemption, reentryQuest, systemBreach } from "./data/penalties.js";
import { shopTickets } from "./data/shop.js";
import { rulesText } from "./data/rules.js";

/**
 * Minimal state (localStorage)
 * - minutesMax, minutesEarned, xp, level, streak
 * - todayKey for daily streak update
 * - history array
 * - activeBan { level, name, endsAtMs }
 */

const LS_KEY = "timearena_uxui_state_v1";

const defaultState = {
  userName: "Nikita",
  minutesMax: 120,
  minutesEarned: 0,
  xp: 0,
  level: 1,
  streak: 0,
  lastSeenDayKey: "",
  history: [],
  activeBan: null, // { level, name, endsAtMs }
  theme: "dark",
};

function dayKey(d = new Date()){
  // local date signature
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  }catch(e){
    return structuredClone(defaultState);
  }
}

function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function addHistory(type, title, details = ""){
  state.history.unshift({
    at: Date.now(),
    type,
    title,
    details,
  });
  // keep minimal
  state.history = state.history.slice(0, 60);
  saveState();
}

function calcLevelFromXp(xp){
  // simple curve: 0-99 => Lv1, 100-249 => Lv2, 250-449 => Lv3, ...
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 450) return 3;
  if (xp < 700) return 4;
  if (xp < 1000) return 5;
  return 6;
}

function formatHMS(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const hh = String(Math.floor(s/3600)).padStart(2,"0");
  const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${hh}:${mm}:${ss}`;
}

const state = loadState();

/** Daily streak logic (minimal):
 * if new day -> streak +1 (since they opened the app).
 * Later we can change to streak based on missions.
 */
(function initDaily(){
  const today = dayKey();
  if(state.lastSeenDayKey !== today){
    // if yesterday was lastSeen -> keep streak+1, else reset to 1
    if(state.lastSeenDayKey){
      const last = new Date(state.lastSeenDayKey + "T00:00:00");
      const now = new Date(today + "T00:00:00");
      const diffDays = Math.round((now - last) / (24*3600*1000));
      if(diffDays === 1) state.streak = Math.max(0, state.streak) + 1;
      else state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.lastSeenDayKey = today;
    addHistory("system", "New Day 🌅", `Streak: ${state.streak}`);
    saveState();
  }
})();

/** Theme init */
document.documentElement.dataset.theme = state.theme || "dark";

const viewRoot = document.getElementById("viewRoot");

const statMax = document.getElementById("statMax");
const statEarned = document.getElementById("statEarned");
const statXp = document.getElementById("statXp");
const statLevel = document.getElementById("statLevel");
const statStreak = document.getElementById("statStreak");

const dailyGreeting = document.getElementById("dailyGreeting");
const dailyMessage = document.getElementById("dailyMessage");

const penaltyStrip = document.getElementById("penaltyStrip");
const penaltyTitle = document.getElementById("penaltyTitle");
const penaltyCountdown = document.getElementById("penaltyCountdown");

document.getElementById("toggleThemeBtn").addEventListener("click", () => {
  state.theme = (state.theme === "dark") ? "light" : "dark";
  document.documentElement.dataset.theme = state.theme;
  saveState();
});

document.getElementById("openPenaltiesBtn").addEventListener("click", () => {
  navigate("penalties");
});

function renderTop(){
  dailyGreeting.textContent = `Salut, ${state.userName}! 👋`;

  const messages = [
    "Bun venit în arenă. Azi facem progres! ⚔️",
    "Questurile de azi te așteaptă. Hai! 🚀",
    "Câștigăm timp curat, nu negociem! 🛡️",
    "Streak-ul e foc. Ține-l aprins! 🔥",
    "Un pas mic azi = Level up mâine! 🆙",
  ];
  // deterministic-ish daily message
  const idx = (new Date().getDate() + state.streak) % messages.length;
  dailyMessage.textContent = messages[idx];

  statMax.textContent = String(state.minutesMax);
  statEarned.textContent = String(state.minutesEarned);
  statXp.textContent = String(state.xp);
  state.level = calcLevelFromXp(state.xp);
  statLevel.textContent = String(state.level);
  statStreak.textContent = String(state.streak);
}

function isBanActive(){
  if(!state.activeBan) return false;
  return Date.now() < state.activeBan.endsAtMs;
}

function clearBanIfExpired(){
  if(state.activeBan && Date.now() >= state.activeBan.endsAtMs){
    addHistory("ban", "Ban expirat ✅", state.activeBan.name);
    state.activeBan = null;
    saveState();
  }
}

function renderPenaltyStrip(){
  clearBanIfExpired();

  if(isBanActive()){
    penaltyStrip.classList.remove("hidden");
    penaltyTitle.textContent = state.activeBan.name;
    const left = state.activeBan.endsAtMs - Date.now();
    penaltyCountdown.textContent = `Reactivare în: ${formatHMS(left)}`;
  } else {
    penaltyStrip.classList.add("hidden");
  }
}

setInterval(() => {
  renderPenaltyStrip();
}, 1000);

/** Actions */
function applyMissionReward(m){
  if(isBanActive()){
    addHistory("blocked", "Reward blocat (BAN) 🔴", m.title);
    alert("⚠️ Există un BAN activ. Nu se pot câștiga bonusuri acum.");
    return;
  }

  // reward parsing minimal:
  // +X min OR +X XP
  const r = m.reward;
  if(r.includes("min")){
    const n = parseInt(r.replace(/[^0-9]/g,""), 10) || 0;
    state.minutesEarned = Math.min(state.minutesMax, state.minutesEarned + n);
  }
  if(r.toUpperCase().includes("XP")){
    const n = parseInt(r.replace(/[^0-9]/g,""), 10) || 0;
    state.xp += n;
  } else {
    // implicit XP for completed mission
    state.xp += 10;
  }

  state.level = calcLevelFromXp(state.xp);
  addHistory("mission", `✅ ${m.title}`, `Reward: ${m.reward}`);
  saveState();
  renderTop();
}

function applyPenaltyByName(pName){
  // find penalty by level name match
  const p = penalties.find(x => x.name === pName) || penalties.find(x => pName.includes(x.name.split(" ")[0]));
  if(!p){
    alert("Penalty not found.");
    return;
  }

  // durations -> seconds
  const duration = p.durationSeconds;
  if(duration > 0){
    state.activeBan = {
      level: p.level,
      name: p.name,
      endsAtMs: Date.now() + duration*1000,
    };
  }

  // quick effects (minimal)
  if(p.level >= 2){
    state.minutesEarned = Math.max(0, state.minutesEarned - 20);
  } else if(p.level === 1){
    state.minutesEarned = Math.max(0, state.minutesEarned - 10);
  }

  addHistory("penalty", `⚠️ ${p.name}`, p.desc);
  saveState();
  renderTop();
  renderPenaltyStrip();
}

function resetToday(){
  state.minutesEarned = 0;
  addHistory("system", "Reset zi (test) 🔄", "Minute câștigate = 0");
  saveState();
  renderTop();
}

/** Navigation */
const navButtons = Array.from(document.querySelectorAll(".navbtn"));
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    navigate(btn.dataset.view);
  });
});

function setActiveNav(view){
  navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === view));
}

function navigate(view){
  setActiveNav(view);
  renderTop();
  renderPenaltyStrip();

  if(view === "dashboard") renderDashboard();
  if(view === "missions") renderMissions();
  if(view === "shop") renderShop();
  if(view === "penalties") renderPenalties();
  if(view === "rules") renderRules();
  if(view === "history") renderHistory();
}

function card(html){
  return `<section class="card">${html}</section>`;
}

/** Views */
function renderDashboard(){
  const pct = Math.round((state.minutesEarned / Math.max(1,state.minutesMax))*100);

  viewRoot.innerHTML = `
    ${card(`
      <h2>My Time Plan 🗺️</h2>
      <p>Ținta de azi: câștigi timp prin questuri. Îl cheltui în Magazin.</p>
      <div class="big-number">${state.minutesEarned} <span style="font-size:14px;color:var(--muted)">min</span></div>
      <div class="sub-number">din max ${state.minutesMax} min • Progres: ${pct}%</div>
      <div class="progressbar"><div style="width:${pct}%"></div></div>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <button class="btn primary" id="playBtn">PLAY ▶</button>
        <button class="btn ghost" id="resetBtn">Reset (test)</button>
      </div>
    `)}

    <div class="row">
      ${card(`
        <h2>Locked Time 🔒</h2>
        <p>Deblochezi minute prin misiuni și obiceiuri.</p>
        <div class="big-number">${Math.max(0, state.minutesMax - state.minutesEarned)} <span style="font-size:14px;color:var(--muted)">min</span></div>
      `)}
      ${card(`
        <h2>Streak & Level 🔥</h2>
        <p>Ține streak-ul aprins și urcă level-ul.</p>
        <div class="big-number">Lv ${state.level}</div>
        <div class="sub-number">Streak: ${state.streak} zile • XP: ${state.xp}</div>
      `)}
    </div>

    ${card(`
      <h2>Quick Actions ⚡</h2>
      <p>Teste rapide (minim funcțional) — ulterior le legăm de reguli/flow.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn" data-ban="Scratch Damage 🟡">Scratch Damage 🟡</button>
        <button class="btn" data-ban="Penalty Zone 🟠">Penalty Zone 🟠</button>
        <button class="btn" data-ban="Daily Ban 🔴">Daily Ban 🔴</button>
      </div>
    `)}
  `;

  document.getElementById("playBtn").addEventListener("click", () => {
    alert("▶ PLAY: În v1, Play doar confirmă că intri în joc. Mai târziu legăm timer-ul real.");
    addHistory("system", "PLAY ▶", "A început sesiunea (demo)");
    saveState();
  });

  document.getElementById("resetBtn").addEventListener("click", resetToday);

  viewRoot.querySelectorAll("[data-ban]").forEach(b => {
    b.addEventListener("click", () => applyPenaltyByName(b.dataset.ban));
  });
}

function renderMissions(){
  const html = missions.map(cat => {
    const items = cat.items.map(m => `
      <div class="item">
        <div class="item-title">${m.title}</div>
        <div class="item-meta">
          <span class="chip ok">Reward: ${m.reward}</span>
          <span class="chip danger">Penalty: ${m.penalty}</span>
        </div>
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn primary" data-do="complete" data-title="${encodeURIComponent(m.title)}">Complete ✅</button>
          <button class="btn" data-do="fail" data-pen="${encodeURIComponent(m.penalty)}">Fail ❌</button>
        </div>
      </div>
    `).join("");

    return `
      <section class="card">
        <h2>${cat.category}</h2>
        <p>${cat.desc}</p>
        <hr class="sep"/>
        <div class="list">${items}</div>
      </section>
    `;
  }).join("");

  viewRoot.innerHTML = html;

  // bind actions
  viewRoot.querySelectorAll('[data-do="complete"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const title = decodeURIComponent(btn.dataset.title);
      // find mission by title
      for(const cat of missions){
        const m = cat.items.find(x => x.title === title);
        if(m){ applyMissionReward(m); break; }
      }
    });
  });

  viewRoot.querySelectorAll('[data-do="fail"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const penText = decodeURIComponent(btn.dataset.pen);
      // map penalty keywords to levels
      // minimal mapping:
      if(penText.includes("Game Over")) applyPenaltyByName("Game Over Temporar ☠️");
      else if(penText.includes("Season Ban")) applyPenaltyByName("Season Ban 🟥");
      else if(penText.includes("Daily Ban")) applyPenaltyByName("Daily Ban 🔴");
      else if(penText.includes("Penalty Zone")) applyPenaltyByName("Penalty Zone 🟠");
      else applyPenaltyByName("Scratch Damage 🟡");
    });
  });
}

function renderShop(){
  const locked = isBanActive();
  const html = `
    ${card(`
      <h2>Magazin 🎟️</h2>
      <p>Cheltuie minutele câștigate. (În demo, doar scădem minutele.)</p>
      <div class="big-number">${state.minutesEarned} <span style="font-size:14px;color:var(--muted)">min</span></div>
      <div class="sub-number">${locked ? "🔴 BAN activ: unele opțiuni pot fi blocate." : "🟢 Poți cumpăra ticket-uri."}</div>
    `)}

    ${shopTickets.map(group => `
      <section class="card">
        <h2>${group.category}</h2>
        <p>${group.desc}</p>
        <hr class="sep"/>
        <div class="list">
          ${group.items.map(it => `
            <div class="item">
              <div class="item-title">${it.title}</div>
              <div class="item-meta">
                <span class="chip warn">Cost: ${it.costMinutes} min</span>
                <span class="chip">${it.note}</span>
              </div>
              <div style="margin-top:10px;">
                <button class="btn primary" data-buy="${encodeURIComponent(it.title)}" data-cost="${it.costMinutes}">Cumpără 🎟️</button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `).join("")}
  `;
  viewRoot.innerHTML = html;

  viewRoot.querySelectorAll("[data-buy]").forEach(btn => {
    btn.addEventListener("click", () => {
      const title = decodeURIComponent(btn.dataset.buy);
      const cost = parseInt(btn.dataset.cost, 10) || 0;

      if(isBanActive()){
        alert("🔴 BAN activ: Magazin limitat. (În v1 blocăm cumpărarea.)");
        addHistory("blocked", "Cumpărare blocată (BAN) 🔴", title);
        saveState();
        return;
      }

      if(state.minutesEarned < cost){
        alert("❌ Nu ai destule minute.");
        return;
      }
      state.minutesEarned -= cost;
      addHistory("shop", `🎟️ ${title}`, `Cost: ${cost} min`);
      saveState();
      renderTop();
      renderShop();
    });
  });
}

function renderPenalties(){
  const active = isBanActive();

  const cards = penalties.map(p => `
    <div class="item">
      <div class="item-title">Lv ${p.level} • ${p.name}</div>
      <div class="item-meta">
        <span class="chip ${p.level>=3 ? "danger" : p.level===2 ? "warn" : ""}">Durată: ${p.durationLabel}</span>
        <span class="chip">Efecte: ${p.effects}</span>
      </div>
      <p style="margin-top:8px;">${p.desc}</p>
      <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn primary" data-applypen="${encodeURIComponent(p.name)}">Aplică (test)</button>
        ${p.reentry ? `<button class="btn" data-reentry="1">Re-Entry Quest 🔧</button>` : ``}
      </div>
    </div>
  `).join("");

  const redemptionRows = banRedemption.map(r => `
    <div class="item">
      <div class="item-title">${r.type}</div>
      <div class="item-meta">
        <span class="chip warn">Zile fixe: ${r.fixedDays}</span>
        <span class="chip ok">Puncte/zi: ${r.pointsPerDay}</span>
        <span class="chip">${r.redeemable}</span>
      </div>
      <p style="margin-top:8px;">Regulă: dacă NU atinge punctele, ziua NU scade.</p>
    </div>
  `).join("");

  const reentrySteps = reentryQuest.map(s => `
    <div class="item">
      <div class="item-title">${s.stage}. ${s.name}</div>
      <div class="item-meta">
        <span class="chip ${s.required ? "danger" : ""}">${s.required ? "OBLIGATORIU" : "Opțional"}</span>
        <span class="chip">${s.whatItDoes}</span>
      </div>
    </div>
  `).join("");

  const breachRows = systemBreach.map(b => `
    <div class="item">
      <div class="item-title">${b.situation}</div>
      <div class="item-meta">
        <span class="chip danger">Clasificare: ${b.classification}</span>
        <span class="chip warn">Ban: ${b.banApplied}</span>
      </div>
    </div>
  `).join("");

  viewRoot.innerHTML = `
    ${card(`
      <h2>Penalități ⚠️ (Damage Cards)</h2>
      <p>Penalitățile sunt pe niveluri. Unele blochează bonusurile, streak-ul și accesul.</p>
      <div class="sub-number">${active ? "🔴 Ban activ acum. Vezi sus countdown-ul." : "🟢 Niciun ban activ."}</div>
    `)}

    <section class="card">
      <h2>Niveluri de Ban & Efecte 🎚️</h2>
      <p>Aplicarea e strictă: clar, proporțional, imposibil de negociat.</p>
      <hr class="sep"/>
      <div class="list">${cards}</div>
    </section>

    <section class="card">
      <h2>Sistem de Răscumpărare 🧮</h2>
      <p>Răscumpărarea este un „grind” corect: puncte/zi. Fără puncte → ziua nu scade.</p>
      <hr class="sep"/>
      <div class="list">${redemptionRows}</div>
    </section>

    <section class="card">
      <h2>Re-Entry Quest (OBLIGATORIU) 🧾🔧</h2>
      <p>Fără Re-entry → banul rămâne activ.</p>
      <hr class="sep"/>
      <div class="list">${reentrySteps}</div>
    </section>

    <section class="card">
      <h2>System Breach (caz extrem) 🚨</h2>
      <p>Încălcări grave → ban mare.</p>
      <hr class="sep"/>
      <div class="list">${breachRows}</div>
    </section>
  `;

  viewRoot.querySelectorAll("[data-applypen]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = decodeURIComponent(btn.dataset.applypen);
      applyPenaltyByName(name);
      renderPenalties();
    });
  });

  viewRoot.querySelectorAll("[data-reentry]").forEach(btn => {
    btn.addEventListener("click", () => {
      alert("🔧 Re-Entry Quest: în v1 e informativ. Mai târziu îl facem flow cu pași și validări.");
    });
  });
}

function renderRules(){
  viewRoot.innerHTML = `
    ${card(`
      <h2>Regulile TimeArena 📜</h2>
      <p>Reguli simple, clare. Jocul merge doar dacă regulile sunt respectate.</p>
    `)}

    <section class="card">
      <h2>Time Rules ⏱️</h2>
      <div class="list">
        ${rulesText.map(r => `
          <div class="item">
            <div class="item-title">${r.title}</div>
            <div class="item-meta"><span class="chip">${r.icon}</span><span class="chip ok">${r.short}</span></div>
            <p style="margin-top:8px;">${r.long}</p>
          </div>
        `).join("")}
      </div>
    </section>

    ${card(`
      <h2>Note ⚔️</h2>
      <p>• Bonusurile pot fi blocate de banuri (Lv 2+).<br/>
         • Lv 3+ înseamnă ban real cu countdown.<br/>
         • Fără re-entry, banul rămâne.</p>
    `)}
  `;
}

function renderHistory(){
  const rows = state.history.map(h => {
    const d = new Date(h.at);
    const stamp = `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    return `
      <div class="item">
        <div class="item-title">${h.title}</div>
        <div class="item-meta">
          <span class="chip">${h.type}</span>
          <span class="chip">${stamp}</span>
        </div>
        ${h.details ? `<p style="margin-top:8px;">${h.details}</p>` : ``}
      </div>
    `;
  }).join("");

  viewRoot.innerHTML = `
    ${card(`
      <h2>Istoric 📊</h2>
      <p>Ultimele acțiuni din joc (demo).</p>
    `)}

    <section class="card">
      <h2>Log</h2>
      <hr class="sep"/>
      <div class="list">
        ${rows || `<div class="item"><div class="item-title">Nimic încă…</div><p style="margin-top:8px;">Completează o misiune sau cumpără un ticket.</p></div>`}
      </div>
    </section>

    ${card(`
      <h2>Admin (demo)</h2>
      <p>Doar pentru test UI.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn" id="clearHistoryBtn">Șterge istoric 🧹</button>
        <button class="btn" id="clearBanBtn">Șterge ban ✅</button>
      </div>
    `)}
  `;

  document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    state.history = [];
    saveState();
    renderHistory();
  });

  document.getElementById("clearBanBtn").addEventListener("click", () => {
    state.activeBan = null;
    saveState();
    renderPenaltyStrip();
    renderHistory();
  });
}

/** Boot */
renderTop();
renderPenaltyStrip();
navigate("dashboard");

export const penalties = [
  {
    level: 0,
    name: "No Reward ⚪",
    desc: "Ai uitat / n-ai finalizat. Nu primești reward azi.",
    effects: "Bonus: ❌ • Streak: 🟢 • Durată: —",
    durationLabel: "—",
    durationSeconds: 0,
    reentry: false
  },
  {
    level: 1,
    name: "Scratch Damage 🟡",
    desc: "Neatenție, întreruperi, mică abatere.",
    effects: "Bonus: ❌ • Streak: 🟢 • Durată: instant",
    durationLabel: "instant",
    durationSeconds: 0,
    reentry: false
  },
  {
    level: 2,
    name: "Penalty Zone 🟠",
    desc: "Victimizare, cerșit, negociere prin plâns, insistențe.",
    effects: "Bonus: 🔴 • Streak: 🟡 • Durată: instant",
    durationLabel: "instant",
    durationSeconds: 0,
    reentry: true
  },
  {
    level: 3,
    name: "Daily Ban 🔴",
    desc: "Minciună, refuz școală, încălcări serioase.",
    effects: "Bonus: 🔴 • Streak: 🔴 • Durată: 1 zi",
    durationLabel: "24h",
    durationSeconds: 24 * 3600,
    reentry: true
  },
  {
    level: 4,
    name: "Cooldown Extins ⚫",
    desc: "Repetare Daily Ban / escaladare.",
    effects: "Bonus: 🔴 • Streak: 🔴 • Durată: 2–3 zile",
    durationLabel: "72h (demo)",
    durationSeconds: 72 * 3600,
    reentry: true
  },
  {
    level: 5,
    name: "Season Ban 🟥",
    desc: "Abateri grave. Acces puternic restricționat.",
    effects: "Bonus: 🔴 • Streak: 🔴 • Durată: 1–2 săpt",
    durationLabel: "7 zile (demo)",
    durationSeconds: 7 * 24 * 3600,
    reentry: true
  },
  {
    level: 6,
    name: "Game Over Temporar ☠️",
    desc: "System Breach. Resetare serioasă a accesului.",
    effects: "Bonus: 🔴 • Streak: 🔴 • Durată: 30 zile",
    durationLabel: "30 zile",
    durationSeconds: 30 * 24 * 3600,
    reentry: true
  }
];

export const banRedemption = [
  { type: "Daily Ban 🔴", fixedDays: "0", pointsPerDay: "100p", redeemable: "🟢 Da" },
  { type: "Cooldown ⚫", fixedDays: "1 zi", pointsPerDay: "120p", redeemable: "🟢 Da" },
  { type: "Season Ban 🟥", fixedDays: "3 zile", pointsPerDay: "150p", redeemable: "🟢 Da" },
  { type: "Game Over ☠️", fixedDays: "7 zile", pointsPerDay: "200p", redeemable: "🟡 După ziua 7" }
];

export const reentryQuest = [
  { stage: 1, name: "Raportul Eroului 🧾", required: true, whatItDoes: "Explică greșeala clar, fără scuze" },
  { stage: 2, name: "Misiune de Reparație 🔧", required: true, whatItDoes: "Faptă concretă care repară" },
  { stage: 3, name: "Zi de Probă 🟡", required: true, whatItDoes: "Fără bonusuri, doar misiuni" },
  { stage: 4, name: "Re-activare Joc 🟢", required: true, whatItDoes: "Acces controlat înapoi" }
];

export const systemBreach = [
  { situation: "Telefon ascuns 🚨", classification: "System Breach", banApplied: "Season Ban 🟥" },
  { situation: "5–9h peste limită ⛔", classification: "System Breach", banApplied: "Season Ban 🟥 (1–2 săpt)" },
  { situation: "Acces fără permisiune 🔐", classification: "System Breach", banApplied: "Game Over Temporar ☠️" },
  { situation: "Minciună + ascundere ☠️", classification: "System Breach", banApplied: "Game Over Temporar ☠️ (30 zile)" }
];

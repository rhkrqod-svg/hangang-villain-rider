const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const bellsEl = document.getElementById("bells");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const bellBtn = document.getElementById("bellBtn");
const specialBtn = document.getElementById("specialBtn");
const nameEntry = document.getElementById("nameEntry");
const playerNameInput = document.getElementById("playerName");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const leaderboardEl = document.getElementById("leaderboard");

const keys = new Set();
const hold = new Set();
const CHARACTER_SCALE = 0.7;
const BELL_COOLDOWN = 1.5;
const MAX_BELLS = 50;
const MAX_HEALTH = 200;
const LEADERBOARD_KEY = "hangang-villain-rider-leaderboard";
const MAX_LEADERBOARD = 10;
const MAX_NAME_UNITS = 20;
let pendingScore = null;

const gameArt = {
  background: new Image(),
  backgroundReady: false,
};

gameArt.background.onload = () => {
  gameArt.backgroundReady = true;
};
gameArt.background.src = "assets/hangang-arcade-bg.png";

const villainTypes = [
  { name: "\uc5ed\uc8fc\ud589\ub7ec", color: "#ff5c5c", hp: 1, radius: 25, wobble: 0.8, score: 80, speedScale: 1.22 },
  { name: "\ud0a5\ubcf4\ub4dc\ud3ed\uc8fc\uc871", color: "#ffc857", hp: 1, radius: 22, wobble: 1.3, score: 95, hitScale: 0.56, visualScale: 0.8 },
  { name: "\uae38\ub9c9\uc218\ub2e4\ub2e8", color: "#f97316", hp: 2, radius: 31, wobble: 0.35, score: 140, speedScale: 0.72 },
  { name: "\ub7ec\ub2dd\ud06c\ub8e8", color: "#2563eb", hp: 2, radius: 62, wobble: 0, score: 190, speedScale: 0.42, straight: true, hitScale: 0.981, visualScale: 1.404 },
  { name: "\ub178\ube0c\ub808\ub07c \ud53d\uc2dc", color: "#111827", hp: 2, radius: 29, wobble: 1.9, score: 170, skid: true },
  { name: "\ub9c9\uac78\ub9ac \ub77c\uc774\ub354", color: "#a16207", hp: 2, radius: 32, wobble: 1.6, score: 155, speedScale: 0.5, drunken: true },
];

const backgroundThemes = [
  {
    skyTop: "#79d7ff",
    skyBottom: "#147fa7",
    river: "#1591bd",
    park: "#1f8f65",
    road: "#53605d",
    roadDark: "#24302f",
    rail: "#e0d0a8",
    stripe: "#eafff4",
    glow: "#f8d66d",
    skyline: "#28516a",
  },
  {
    skyTop: "#ffb15e",
    skyBottom: "#6e3a74",
    river: "#455aa4",
    park: "#47613b",
    road: "#514f57",
    roadDark: "#27252d",
    rail: "#ffd083",
    stripe: "#fff1c9",
    glow: "#ff7a59",
    skyline: "#412f58",
  },
  {
    skyTop: "#101a3d",
    skyBottom: "#07101d",
    river: "#12365e",
    park: "#123629",
    road: "#3b4348",
    roadDark: "#171c22",
    rail: "#9cc8ff",
    stripe: "#cbe9ff",
    glow: "#68e5ff",
    skyline: "#18243b",
  },
  {
    skyTop: "#27123f",
    skyBottom: "#082b37",
    river: "#0b6e8f",
    park: "#154b45",
    road: "#40484c",
    roadDark: "#111b1f",
    rail: "#d9f46f",
    stripe: "#dcfff4",
    glow: "#ff4fd8",
    skyline: "#242052",
  },
];

const game = {
  running: false,
  paused: false,
  over: false,
  time: 0,
  score: 0,
  health: 100,
  bells: 10,
  bellCooldown: 0,
  speed: 280,
  spawnTimer: 0,
  itemTimer: 2.5,
  invincible: 0,
  transformTimer: 0,
  riderTimer: 0,
  riderFlash: 0,
  bossLevel: 0,
  nextBossAt: 5000,
  boss: null,
  bossProjectiles: [],
  nextMarathonAt: 10000,
  marathonTimer: 0,
  marathonSpawnTimer: 0,
  marathonRunners: [],
  comboText: [],
  player: {
    x: 220,
    y: 620,
    radius: 25,
    hitScale: CHARACTER_SCALE,
    tilt: 0,
  },
  villains: [],
  blasts: [],
  items: [],
  particles: [],
};

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetGame() {
  game.running = true;
  game.paused = false;
  game.over = false;
  game.time = 0;
  game.score = 0;
  game.health = 100;
  game.bells = 10;
  game.bellCooldown = 0;
  game.speed = 280;
  game.spawnTimer = 1.2;
  game.itemTimer = 3.1;
  game.invincible = 0;
  game.transformTimer = 0;
  game.riderTimer = 0;
  game.riderFlash = 0;
  game.bossLevel = 0;
  game.nextBossAt = 5000;
  game.boss = null;
  game.bossProjectiles = [];
  game.nextMarathonAt = 10000;
  game.marathonTimer = 0;
  game.marathonSpawnTimer = 0;
  game.marathonRunners = [];
  game.comboText = [];
  game.villains = [];
  game.blasts = [];
  game.items = [];
  game.particles = [];

  const road = roadBounds();
  game.player.x = (road.left + road.right) / 2;
  game.player.y = road.bottom - 82;
  pendingScore = null;
  nameEntry.hidden = true;
  overlay.hidden = true;
  pauseBtn.textContent = "II";
  updateHud();
}

function updateHud() {
  scoreEl.textContent = formatDistance(game.score);
  scoreEl.title = `${Math.floor(game.score)}m`;
  healthEl.textContent = Math.max(0, Math.round(game.health));
  bellsEl.textContent = game.bells;
  bellBtn.disabled = !game.running || game.paused || game.over || game.bells <= 0 || game.bellCooldown > 0;
  specialBtn.disabled = !game.running || game.paused || game.over || game.bells < 10 || game.riderTimer > 0 || game.transformTimer > 0;
  specialBtn.classList.toggle("ready", !specialBtn.disabled);
  specialBtn.textContent = game.riderTimer > 0 ? Math.ceil(Math.min(10, game.riderTimer)) : "\ubcc0\uc2e0";
}

function formatDistance(distance) {
  const meters = Math.floor(distance);
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatDistanceDetail(distance) {
  const meters = Math.floor(distance);
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km (${meters}m)`;
}

function nameUnit(char) {
  return /[^\x00-\x7F]/.test(char) ? 2 : 1;
}

function limitPlayerName(value) {
  let units = 0;
  let result = "";
  for (const char of Array.from(value)) {
    const cost = nameUnit(char);
    if (units + cost > MAX_NAME_UNITS) break;
    units += cost;
    result += char;
  }
  return result;
}

function cleanPlayerName(value) {
  const name = limitPlayerName(value.replace(/\s+/g, " ").trim());
  return name || "\ub77c\uc774\ub354";
}

function loadLeaderboard() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
      .map((entry) => ({
        name: cleanPlayerName(entry.name),
        score: Math.max(0, Math.floor(entry.score)),
        date: Number.isFinite(entry.date) ? entry.date : 0,
      }))
      .sort((a, b) => b.score - a.score || a.date - b.date)
      .slice(0, MAX_LEADERBOARD);
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, MAX_LEADERBOARD)));
  } catch {
    // Ranking still works during the current screen even if browser storage is blocked.
  }
}

function rankIndexFor(score, entries = loadLeaderboard()) {
  const meters = Math.floor(score);
  const betterIndex = entries.findIndex((entry) => meters > entry.score);
  if (betterIndex >= 0) return betterIndex;
  return entries.length < MAX_LEADERBOARD ? entries.length : -1;
}

function renderLeaderboard() {
  const entries = loadLeaderboard();
  leaderboardEl.replaceChildren();
  for (let i = 0; i < MAX_LEADERBOARD; i += 1) {
    const entry = entries[i];
    const row = document.createElement("li");
    const rank = document.createElement("span");
    const name = document.createElement("span");
    const distance = document.createElement("span");
    rank.className = "rank";
    name.className = "name";
    distance.className = "distance";
    rank.textContent = `${i + 1}\uc704`;
    name.textContent = entry ? entry.name : "\ube44\uc5b4 \uc788\uc74c";
    distance.textContent = entry ? formatDistance(entry.score) : "-";
    row.append(rank, name, distance);
    leaderboardEl.append(row);
  }
}

function submitLeaderboardName() {
  if (pendingScore === null) return;
  const entries = loadLeaderboard();
  const rankIndex = rankIndexFor(pendingScore, entries);
  if (rankIndex < 0) {
    pendingScore = null;
    nameEntry.hidden = true;
    renderLeaderboard();
    return;
  }

  entries.splice(rankIndex, 0, {
    name: cleanPlayerName(playerNameInput.value),
    score: Math.floor(pendingScore),
    date: Date.now(),
  });
  const ranked = entries.slice(0, MAX_LEADERBOARD);
  saveLeaderboard(ranked);
  pendingScore = null;
  nameEntry.hidden = true;
  overlayText.textContent = "\ub7ad\ud0b9 \ub4f1\ub85d \uc644\ub8cc! \ub2e4\uc2dc \ub2ec\ub824\ubcfc\uae4c\uc694?";
  startBtn.textContent = "\uc7ac\ucd9c\ubc1c";
  renderLeaderboard();
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mixColor(a, b, amount) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const mixed = ca.map((channel, index) => Math.round(channel + (cb[index] - channel) * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function currentTheme(t) {
  const duration = 12;
  const raw = t / duration;
  const index = Math.floor(raw) % backgroundThemes.length;
  const next = (index + 1) % backgroundThemes.length;
  const local = raw - Math.floor(raw);
  const blend = local * local * (3 - 2 * local);
  const theme = {};
  for (const key of Object.keys(backgroundThemes[index])) {
    theme[key] = mixColor(backgroundThemes[index][key], backgroundThemes[next][key], blend);
  }
  return theme;
}

function roadBounds() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const roadWidth = Math.min(w * 0.82, 390);
  const left = (w - roadWidth) / 2;
  const right = left + roadWidth;
  return {
    left,
    right,
    top: Math.max(0, h * 0.02),
    bottom: h,
    width: roadWidth,
  };
}

function spawnVillain() {
  const road = roadBounds();
  const type = villainTypes[Math.floor(Math.random() * villainTypes.length)];
  const extraSpeed = Math.min(150, Math.max(0, game.time - 8) * 4.6);
  const x = rand(road.left + type.radius + 18, road.right - type.radius - 18);
  game.villains.push({
    ...type,
    x,
    y: -type.radius - rand(20, 120),
    hp: type.hp,
    baseX: x,
    phase: rand(0, Math.PI * 2),
    speed: (game.speed + extraSpeed + rand(-16, 52)) * (type.speedScale || 1),
    hitFlash: 0,
    hitScale: type.hitScale || CHARACTER_SCALE,
    visualScale: type.visualScale || 1,
  });
}

function spawnItem(kindOverride) {
  const road = roadBounds();
  const kind = kindOverride || (Math.random() < 0.73 ? "bell" : "water");
  const x = rand(road.left + 36, road.right - 36);
  game.items.push({
    kind,
    x,
    y: -42,
    radius: 21,
    speed: game.speed * 0.82,
    phase: rand(0, Math.PI * 2),
  });
}

function startBoss() {
  const road = roadBounds();
  game.bossLevel += 1;
  const bossHp = game.bossLevel + 2;
  game.boss = {
    x: (road.left + road.right) / 2,
    y: -110,
    targetY: canvas.clientHeight * 0.2,
    radius: 66,
    hitScale: CHARACTER_SCALE,
    level: game.bossLevel,
    hp: bossHp,
    maxHp: bossHp,
    fireTimer: 1.6,
    phase: 0,
    hurt: 0,
  };
  game.nextBossAt += 10000;
  game.villains = [];
  game.items = [];
  game.bossProjectiles = [];
  game.health = Math.max(game.health, 50);
  game.invincible = Math.max(game.invincible, 1.4);
  game.comboText.push({
    text: `\ubcf4\uc2a4 ${game.bossLevel}\ub2e8\uacc4 \ub4f1\uc7a5!`,
    x: game.boss.x,
    y: canvas.clientHeight * 0.28,
    age: 0,
    life: 1.3,
    color: "#ffd66d",
  });
}

function startMarathonLegion() {
  const road = roadBounds();
  game.nextMarathonAt += 10000;
  game.marathonTimer = 11;
  game.marathonSpawnTimer = 0;
  game.marathonRunners = [];
  game.villains = [];
  game.items = [];
  game.bossProjectiles = [];
  game.health = Math.max(game.health, 70);
  game.bells = Math.max(game.bells, 10);
  game.invincible = Math.max(game.invincible, 2.2);

  for (let row = 0; row < 7; row += 1) {
    spawnMarathonWave(-row * 96 - 40, row % 2 === 0 ? 0 : 1);
  }

  game.comboText.push({
    text: "\ub9c8\ub77c\ud1a4 \uad70\ub2e8!",
    x: (road.left + road.right) / 2,
    y: canvas.clientHeight * 0.32,
    age: 0,
    life: 1.5,
    color: "#ffb4b4",
  });
}

function spawnMarathonWave(y, offsetSeed) {
  const road = roadBounds();
  const lanes = 5;
  const gap = road.width / lanes;
  for (let i = 0; i < lanes; i += 1) {
    if ((i + offsetSeed) % 5 === 3 && Math.random() < 0.35) continue;
    game.marathonRunners.push({
      x: road.left + gap * (i + 0.5) + rand(-10, 10),
      y: y + rand(-12, 12),
      radius: 22,
      hitScale: CHARACTER_SCALE,
      speed: rand(185, 250),
      phase: rand(0, Math.PI * 2),
      color: i % 2 === 0 ? "#ef4444" : "#2563eb",
      dead: false,
    });
  }
}

function ringBell() {
  if (!game.running || game.paused || game.over || game.bells <= 0 || game.bellCooldown > 0) return;
  game.bells -= 1;
  game.bellCooldown = BELL_COOLDOWN;
  game.blasts.push({
    x: game.player.x,
    y: game.player.y - 58,
    vx: game.player.tilt * 80,
    vy: -690,
    radius: 40,
    spin: 0,
    trail: [],
    life: 1.55,
    age: 0,
    bossHit: false,
  });
  burst(game.player.x, game.player.y - 58, "#ffc857", 16, 240);
  updateHud();
}

function useSpecial() {
  if (!game.running || game.paused || game.over || game.bells < 10 || game.riderTimer > 0 || game.transformTimer > 0) return;
  game.bells -= 10;
  game.transformTimer = 1.85;
  game.riderTimer = 11.85;
  game.riderFlash = 0.9;
  game.invincible = Math.max(game.invincible, 12);
  burst(game.player.x, game.player.y - 18, "#68e5ff", 34, 380);
  burst(game.player.x, game.player.y - 18, "#ffd66d", 24, 300);
  game.comboText.push({
    text: "\ub85c\ub4dc\ub77c\uc774\ub354!",
    x: game.player.x,
    y: game.player.y - 92,
    age: 0,
    life: 1.2,
    color: "#dffcff",
  });
  updateHud();
}

function burst(x, y, color, count, power) {
  for (let i = 0; i < count; i += 1) {
    const a = rand(0, Math.PI * 2);
    const s = rand(power * 0.25, power);
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      radius: rand(2, 5),
      color,
      life: rand(0.24, 0.62),
      age: 0,
    });
  }
}

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = hitRadius(a) + hitRadius(b);
  return dx * dx + dy * dy < r * r;
}

function hitRadius(entity) {
  return entity.radius * (entity.hitScale || 1);
}

function damagePlayer(amount, x, y) {
  if (game.invincible > 0) return;
  game.health -= amount;
  game.invincible = 0.85;
  burst(x, y, "#ff5c5c", 18, 260);
  game.comboText.push({ text: "\ucda9\ub3cc!", x, y: y - 28, age: 0, life: 0.7, color: "#ffb4b4" });
  if (game.health <= 0) endGame();
}

function defeatVillain(villain, reason) {
  game.score += villain.score;
  burst(villain.x, villain.y, "#31d6a4", 20, 270);
  game.comboText.push({
    text: reason || "\ud1f4\uce58!",
    x: villain.x,
    y: villain.y - 34,
    age: 0,
    life: 0.9,
    color: "#b7ffdf",
  });
  villain.dead = true;
}

function defeatBoss() {
  if (!game.boss) return;
  const defeatedLevel = game.boss.level;
  burst(game.boss.x, game.boss.y, "#ffd66d", 42, 420);
  burst(game.boss.x, game.boss.y + 20, "#68e5ff", 36, 360);
  game.comboText.push({
    text: `${defeatedLevel}\ub2e8\uacc4 4\ub95c \uc790\uc804\uac70 \ud1f4\uce58!`,
    x: game.boss.x,
    y: game.boss.y - 72,
    age: 0,
    life: 1.4,
    color: "#fff0b3",
  });
  game.score += 1000 + defeatedLevel * 250;
  game.boss = null;
  game.bossProjectiles = [];
}

function pickup(item) {
  if (item.kind === "bell") {
    game.bells = Math.min(MAX_BELLS, game.bells + 2);
    game.comboText.push({ text: "\ubca8 +2", x: item.x, y: item.y - 28, age: 0, life: 0.8, color: "#fff0b3" });
    burst(item.x, item.y, "#ffc857", 12, 180);
  } else {
    game.health = Math.min(MAX_HEALTH, game.health + 18);
    game.comboText.push({ text: "\ud68c\ubcf5", x: item.x, y: item.y - 28, age: 0, life: 0.8, color: "#b9fbc0" });
    burst(item.x, item.y, "#31d6a4", 12, 180);
  }
  item.dead = true;
  updateHud();
}

function updateBoss(dt, playerPowered) {
  const boss = game.boss;
  if (!boss) return;

  const road = roadBounds();
  boss.phase += dt;
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.x = (road.left + road.right) / 2 + Math.sin(boss.phase * 1.7) * road.width * 0.12;
  boss.y += (boss.targetY - boss.y) * Math.min(1, dt * 2.8);
  boss.fireTimer -= dt;

  if (boss.fireTimer <= 0) {
    const enrage = boss.hp <= Math.ceil(boss.maxHp / 2) ? 1 : 0;
    const count = Math.min(8, boss.level + 1 + enrage);
    for (let i = 0; i < count; i += 1) {
      game.bossProjectiles.push({
        x: boss.x + (i - (count - 1) / 2) * Math.max(26, 46 - boss.level * 2),
        y: boss.y + 62,
        vx: rand(-32, 32),
        vy: rand(225 + boss.level * 12, 285 + boss.level * 15),
        radius: 22,
        rotation: rand(-0.4, 0.4),
        phase: rand(0, Math.PI * 2),
        age: 0,
      });
    }
    burst(boss.x, boss.y + 38, playerPowered ? "#68e5ff" : "#ff7a59", 10, 120);
    game.comboText.push({
      text: "\uae54\uae54\uae54!",
      x: boss.x,
      y: boss.y + 104,
      age: 0,
      life: 0.72,
      color: "#ffd66d",
    });
    const pressure = Math.min(0.55, boss.level * 0.07);
    boss.fireTimer = boss.hp <= Math.ceil(boss.maxHp / 2) ? rand(0.95 - pressure, 1.25 - pressure) : rand(1.25 - pressure, 1.7 - pressure);
    boss.fireTimer = Math.max(0.58, boss.fireTimer);
  }
}

function updateMarathonLegion(dt, playerPowered) {
  game.marathonTimer = Math.max(0, game.marathonTimer - dt);
  game.marathonSpawnTimer -= dt;

  if (game.marathonSpawnTimer <= 0 && game.marathonTimer > 0) {
    spawnMarathonWave(-58, Math.floor(game.time * 3));
    game.marathonSpawnTimer = 0.42;
  }

  for (const runner of game.marathonRunners) {
    runner.phase += dt * 9;
    runner.y += runner.speed * dt;
    runner.x += Math.sin(runner.phase) * 16 * dt;

    if (!runner.dead && circleHit(game.player, runner)) {
      if (playerPowered) {
        runner.dead = true;
        game.score += 45;
        burst(runner.x, runner.y, "#68e5ff", 10, 180);
      } else {
        runner.y += 34;
        damagePlayer(24, runner.x, runner.y);
      }
    }
  }

  if (game.marathonTimer <= 0) {
    game.marathonRunners = [];
    game.invincible = Math.max(game.invincible, 0.8);
    game.comboText.push({
      text: "\ub9c8\ub77c\ud1a4 \uad70\ub2e8 \ud1b5\uacfc!",
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight * 0.32,
      age: 0,
      life: 1.2,
      color: "#dffcff",
    });
  }
}

function update(dt) {
  if (!game.running || game.paused || game.over) return;

  if (!game.boss && game.score >= game.nextMarathonAt) startMarathonLegion();
  const marathonActive = game.marathonTimer > 0;
  if (!marathonActive && !game.boss && game.score >= game.nextBossAt) startBoss();
  const bossActive = Boolean(game.boss);
  const riderActive = game.riderTimer > 0;
  const transformActive = game.transformTimer > 0;
  game.transformTimer = Math.max(0, game.transformTimer - dt);
  game.riderTimer = Math.max(0, game.riderTimer - dt);
  game.riderFlash = Math.max(0, game.riderFlash - dt);
  game.bellCooldown = Math.max(0, game.bellCooldown - dt);
  game.time += dt;
  game.score += bossActive || marathonActive ? 0 : dt * (22 + game.time * 0.65) * (riderActive ? 2.6 : 1);
  const distanceSpeed = game.score / 250;
  game.speed = (bossActive ? 170 + game.boss.level * 10 : marathonActive ? 230 : 280 + Math.min(170, Math.max(0, game.time - 6) * 6.0) + distanceSpeed) + (riderActive ? 210 : 0);
  game.invincible = riderActive ? Math.max(game.invincible, 0.2) : Math.max(0, game.invincible - dt);

  const road = roadBounds();
  const player = game.player;
  let vx = 0;
  let vy = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW") || hold.has("up")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS") || hold.has("down")) vy += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || hold.has("left")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD") || hold.has("right")) vx += 1;
  const len = Math.hypot(vx, vy) || 1;
  const playerEdge = hitRadius(player);
  player.x = clamp(player.x + (vx / len) * (riderActive ? 500 : 390) * dt, road.left + playerEdge + 8, road.right - playerEdge - 8);
  player.y = clamp(player.y + (vy / len) * (riderActive ? 430 : 360) * dt, canvas.clientHeight * 0.45, road.bottom - playerEdge - 18);
  player.tilt += (vx * 0.34 - player.tilt) * Math.min(1, dt * 10);

  if (marathonActive) {
    updateMarathonLegion(dt, riderActive || transformActive);
  }

  game.spawnTimer -= dt;
  if (!bossActive && !marathonActive && game.spawnTimer <= 0) {
    spawnVillain();
    game.spawnTimer = rand(0.82, 1.38) * Math.max(0.62, 1 - game.time / 105);
  }

  game.itemTimer -= dt;
  if (game.itemTimer <= 0) {
    spawnItem(bossActive || marathonActive ? "bell" : undefined);
    game.itemTimer = bossActive || marathonActive ? rand(2.0, 2.8) : rand(4.4, 7.2);
  }

  if (game.boss) {
    updateBoss(dt, riderActive || transformActive);
  }

  for (const villain of game.villains) {
    villain.y += villain.speed * (villain.skid ? 1.08 : 1) * dt;
    villain.phase += dt * (villain.skid ? 5.8 : 3.2);
    if (villain.skid) {
      const skidRange = road.width * 0.29;
      villain.x = clamp(
        villain.baseX + Math.sin(villain.phase) * skidRange + Math.sin(villain.phase * 2.3) * 13,
        road.left + villain.radius + 10,
        road.right - villain.radius - 10,
      );
    } else if (villain.drunken) {
      villain.x = clamp(
        villain.baseX + Math.sin(villain.phase * 0.82) * villain.radius * villain.wobble + Math.sin(villain.phase * 2.25) * 11,
        road.left + villain.radius + 10,
        road.right - villain.radius - 10,
      );
    } else if (villain.straight) {
      villain.x = villain.baseX;
    } else {
      villain.x = villain.baseX + Math.sin(villain.phase) * villain.radius * villain.wobble;
    }
    villain.hitFlash = Math.max(0, villain.hitFlash - dt);
    if (circleHit(player, villain)) {
      if (riderActive || transformActive) {
        defeatVillain(villain, "\ub3cc\ud30c!");
      } else {
        damagePlayer(villain.hp === 2 ? 17 : 11, villain.x, villain.y);
        villain.y += 72;
        if (!villain.straight) villain.baseX += villain.x > player.x ? 20 : -20;
      }
    }
  }

  for (const item of game.items) {
    item.y += item.speed * dt;
    item.phase += dt * 4;
    item.x += Math.sin(item.phase) * 0.28;
    if (circleHit(player, item)) pickup(item);
  }

  for (const blast of game.blasts) {
    blast.age += dt;
    blast.x += blast.vx * dt;
    blast.y += blast.vy * dt;
    blast.spin += dt * 18;
    blast.trail.push({ x: blast.x, y: blast.y, age: 0 });
    for (const point of blast.trail) point.age += dt;
    blast.trail = blast.trail.filter((point) => point.age < 0.28);
    if (game.boss && !blast.bossHit) {
      const dx = game.boss.x - blast.x;
      const dy = game.boss.y - blast.y;
      if (Math.hypot(dx, dy) < blast.radius + hitRadius(game.boss)) {
        blast.bossHit = true;
        game.boss.hp -= 1;
        game.boss.hurt = 0.22;
        burst(blast.x, blast.y, "#ffc857", 28, 330);
        game.comboText.push({
          text: "\ubcf4\uc2a4 \uba85\uc911!",
          x: game.boss.x,
          y: game.boss.y - 84,
          age: 0,
          life: 0.9,
          color: "#fff0b3",
        });
        if (game.boss.hp <= 0) defeatBoss();
      }
    }
    for (const villain of game.villains) {
      if (villain.dead) continue;
      const dx = villain.x - blast.x;
      const dy = villain.y - blast.y;
      if (Math.hypot(dx, dy) < blast.radius + hitRadius(villain) + 8) {
        villain.hp = 0;
        villain.hitFlash = 0.12;
        defeatVillain(villain, "\uc74c\ud30c \uba85\uc911!");
      }
    }
    for (const runner of game.marathonRunners) {
      if (runner.dead) continue;
      const dx = runner.x - blast.x;
      const dy = runner.y - blast.y;
      if (Math.hypot(dx, dy) < blast.radius + hitRadius(runner) + 8) {
        runner.dead = true;
        game.score += 45;
        burst(runner.x, runner.y, "#68e5ff", 12, 190);
      }
    }
  }

  for (const projectile of game.bossProjectiles) {
    projectile.age += dt;
    projectile.y += projectile.vy * dt;
    projectile.x += Math.sin(projectile.age * 9 + projectile.phase) * 24 * dt;
    projectile.rotation += dt * 5;
    if (circleHit(player, projectile)) {
      if (riderActive || transformActive) {
        projectile.dead = true;
        burst(projectile.x, projectile.y, "#68e5ff", 12, 180);
      } else {
        projectile.dead = true;
        damagePlayer(18, projectile.x, projectile.y);
      }
    }
  }

  for (const p of game.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }

  for (const text of game.comboText) text.age += dt;

  const h = canvas.clientHeight;
  game.villains = game.villains.filter((v) => !v.dead && v.y < h + 110);
  game.items = game.items.filter((i) => !i.dead && i.y < h + 70);
  game.blasts = game.blasts.filter((b) => !b.dead && b.age < b.life && b.y > -80);
  game.bossProjectiles = game.bossProjectiles.filter((p) => !p.dead && p.y < h + 80);
  game.marathonRunners = game.marathonRunners.filter((r) => !r.dead && r.y < h + 90);
  game.particles = game.particles.filter((p) => p.age < p.life);
  game.comboText = game.comboText.filter((t) => t.age < t.life);

  updateHud();
}

function drawBackground(w, h, t) {
  const road = roadBounds();
  const theme = currentTheme(t);
  const hasArtBackground = gameArt.backgroundReady;

  if (hasArtBackground) {
    drawCoverImage(gameArt.background, w, h);
    const artTint = ctx.createLinearGradient(0, 0, 0, h);
    artTint.addColorStop(0, theme.skyTop);
    artTint.addColorStop(0.48, theme.skyBottom);
    artTint.addColorStop(1, theme.roadDark);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = artTint;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(0.44, theme.skyBottom);
    sky.addColorStop(1, theme.roadDark);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  }

  if (hasArtBackground) ctx.globalAlpha = 0.32;
  drawSkyline(w, h, road, theme, t);
  drawRiver(w, h, road, theme, t);
  drawPark(w, h, road, theme, t);
  drawBridge(w, h, road, theme, t);
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.roadDark;
  if (hasArtBackground) ctx.globalAlpha = 0.74;
  ctx.fillRect(road.left - 22, 0, road.width + 44, h);

  const roadGradient = ctx.createLinearGradient(road.left, 0, road.right, 0);
  roadGradient.addColorStop(0, theme.roadDark);
  roadGradient.addColorStop(0.11, theme.road);
  roadGradient.addColorStop(0.5, "#60706b");
  roadGradient.addColorStop(0.89, theme.road);
  roadGradient.addColorStop(1, theme.roadDark);
  ctx.fillStyle = roadGradient;
  ctx.fillRect(road.left, 0, road.width, h);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let y = ((t * 95) % 72) - 72; y < h + 72; y += 72) {
    ctx.beginPath();
    ctx.moveTo(road.left, y);
    ctx.lineTo(road.right, y + 18);
    ctx.stroke();
  }

  const laneWidth = road.width / 4;
  ctx.strokeStyle = theme.stripe;
  ctx.lineWidth = 3;
  ctx.setLineDash([24, 32]);
  ctx.lineDashOffset = t * 190;
  for (const x of [road.left + laneWidth, road.left + laneWidth * 3]) {
    ctx.beginPath();
    ctx.moveTo(x, -50);
    ctx.lineTo(x, h + 50);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const centerX = road.left + road.width / 2;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(centerX, -50);
  ctx.lineTo(centerX, h + 50);
  ctx.stroke();
  ctx.strokeStyle = "#ffd34d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - 4, -50);
  ctx.lineTo(centerX - 4, h + 50);
  ctx.moveTo(centerX + 4, -50);
  ctx.lineTo(centerX + 4, h + 50);
  ctx.stroke();

  ctx.fillStyle = theme.rail;
  ctx.fillRect(road.left - 18, 0, 7, h);
  ctx.fillRect(road.right + 11, 0, 7, h);

  drawRoadGlow(w, h, road, theme, t);
}

function drawTree(x, y, scale) {
  ctx.fillStyle = "#523f2b";
  ctx.fillRect(x - 4 * scale, y + 12 * scale, 8 * scale, 34 * scale);
  ctx.fillStyle = "#2f8c57";
  ctx.beginPath();
  ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#37a66a";
  ctx.beginPath();
  ctx.arc(x + 12 * scale, y - 12 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawRiver(w, h, road, theme, t) {
  const riverWidth = Math.max(road.left - 18, 30);
  const riverGradient = ctx.createLinearGradient(0, 0, riverWidth, 0);
  riverGradient.addColorStop(0, theme.skyBottom);
  riverGradient.addColorStop(0.45, theme.river);
  riverGradient.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = riverGradient;
  ctx.fillRect(0, 0, road.left - 18, h);

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 18; i += 1) {
    const y = ((i * 94 + t * 86) % (h + 130)) - 70;
    const x = 8 + Math.sin(t + i) * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(Math.max(36, road.left - 42), y + Math.sin(i) * 8);
    ctx.stroke();
  }
}

function drawPark(w, h, road, theme, t) {
  ctx.fillStyle = theme.park;
  ctx.fillRect(road.right + 18, 0, w - road.right - 18, h);

  for (let i = 0; i < 12; i += 1) {
    const y = ((i * 118 + t * 126) % (h + 170)) - 90;
    const x = road.right + 30 + (i % 3) * 28;
    drawTree(x, y, 0.82 + (i % 4) * 0.08);
  }
}

function drawSkyline(w, h, road, theme, t) {
  const baseY = h * 0.2;
  ctx.fillStyle = theme.skyline;
  for (let i = 0; i < 8; i += 1) {
    const buildingW = 18 + (i % 3) * 9;
    const buildingH = 42 + (i % 4) * 16;
    const x = ((i * 42 - t * 22) % (w + 120)) - 80;
    ctx.fillRect(x, baseY - buildingH, buildingW, buildingH);

    ctx.fillStyle = i % 2 === 0 ? "rgba(255, 218, 120, 0.75)" : "rgba(130, 229, 255, 0.7)";
    for (let y = baseY - buildingH + 8; y < baseY - 7; y += 12) {
      ctx.fillRect(x + 5, y, 4, 4);
      if (buildingW > 24) ctx.fillRect(x + 15, y, 4, 4);
    }
    ctx.fillStyle = theme.skyline;
  }
}

function drawBridge(w, h, road, theme, t) {
  const y = ((t * 145) % (h + 280)) - 140;
  if (y < -120 || y > h + 70) return;

  ctx.strokeStyle = theme.rail;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(w / 2, y - 54, w, y);
  ctx.stroke();

  ctx.lineWidth = 2;
  for (let x = 24; x < w; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 18, y - 48);
    ctx.stroke();
  }
}

function drawCoverImage(image, w, h) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * 1.04;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawRoadGlow(w, h, road, theme, t) {
  for (let i = 0; i < 7; i += 1) {
    const y = ((i * 130 + t * 165) % (h + 150)) - 70;
    const leftX = road.left - 22;
    const rightX = road.right + 22;
    ctx.fillStyle = theme.glow;
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.arc(leftX, y, 4, 0, Math.PI * 2);
    ctx.arc(rightX, y + 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.fillRect(leftX - 22, y + 4, 44, 2);
    ctx.fillRect(rightX - 22, y + 22, 44, 2);
    ctx.globalAlpha = 1;
  }
}

function drawPlayer() {
  const p = game.player;
  const riderActive = game.riderTimer > 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt);
  ctx.scale(CHARACTER_SCALE, CHARACTER_SCALE);
  if (riderActive) ctx.scale(1.2, 1.2);

  if (!riderActive && game.invincible > 0 && Math.floor(game.time * 18) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  if (riderActive) {
    ctx.globalAlpha = 0.24 + Math.sin(game.time * 18) * 0.06;
    ctx.fillStyle = "#dffcff";
    ctx.beginPath();
    ctx.ellipse(0, 12, 58, 92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.42 + Math.sin(game.time * 18) * 0.08;
    ctx.fillStyle = "#68e5ff";
    ctx.beginPath();
    ctx.ellipse(0, 4, 46, 82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#ffd66d";
    ctx.beginPath();
    ctx.moveTo(-32, 44);
    ctx.lineTo(-48, 72 + Math.sin(game.time * 16) * 5);
    ctx.lineTo(-18, 55);
    ctx.moveTo(32, 44);
    ctx.lineTo(48, 72 + Math.cos(game.time * 16) * 5);
    ctx.lineTo(18, 55);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = "#101516";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -24, 12, 0, Math.PI * 2);
  ctx.arc(0, 24, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = riderActive ? "#1f2937" : "#111827";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(-13, 2);
  ctx.lineTo(0, 24);
  ctx.lineTo(13, 2);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "#101516";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, -23);
  ctx.lineTo(-24, -5);
  ctx.moveTo(12, -23);
  ctx.lineTo(24, -5);
  ctx.moveTo(-8, 0);
  ctx.lineTo(-18, 17);
  ctx.moveTo(8, 0);
  ctx.lineTo(18, 17);
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.fillStyle = "#05070a";
  ctx.beginPath();
  ctx.roundRect(-11, -5, 22, 16, 6);
  ctx.fill();

  ctx.fillStyle = "#05070a";
  ctx.beginPath();
  ctx.roundRect(-16, -36, 32, 34, 8);
  ctx.fill();
  if (riderActive) {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.roundRect(-25, -34, 15, 15, 5);
    ctx.roundRect(10, -34, 15, 15, 5);
    ctx.fill();
    ctx.fillStyle = "#ffd66d";
    ctx.beginPath();
    ctx.moveTo(-18, -35);
    ctx.lineTo(-35, -25);
    ctx.lineTo(-18, -18);
    ctx.moveTo(18, -35);
    ctx.lineTo(35, -25);
    ctx.lineTo(18, -18);
    ctx.fill();
  }
  ctx.fillStyle = riderActive ? "#111827" : "#0b0f14";
  ctx.beginPath();
  ctx.moveTo(-11, -32);
  ctx.lineTo(0, -8);
  ctx.lineTo(11, -32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = riderActive ? "#334155" : "#1f2937";
  ctx.fillRect(-13, -28, 26, 5);
  if (riderActive) {
    ctx.fillStyle = "#ffd66d";
    ctx.beginPath();
    ctx.arc(0, -23, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#68e5ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -23, 10 + Math.sin(game.time * 12) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#0b1117";
  ctx.beginPath();
  ctx.arc(-24, -5, 5, 0, Math.PI * 2);
  ctx.arc(24, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0b0f14";
  ctx.beginPath();
  ctx.ellipse(0, -48, 10, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#05070a";
  ctx.beginPath();
  ctx.ellipse(0, -56, 17, 11, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(15, -50);
  ctx.quadraticCurveTo(0, -44, -15, -50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = riderActive ? "#1f2937" : "#111827";
  ctx.beginPath();
  ctx.ellipse(0, -56, 11, 5, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = riderActive ? "#334155" : "#111827";
  ctx.beginPath();
  ctx.moveTo(11, -55);
  ctx.lineTo(riderActive ? 29 : 23, -52);
  ctx.lineTo(11, -49);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.roundRect(-11, -50, 22, 5, 3);
  ctx.fill();

  if (riderActive) {
    ctx.fillStyle = "#ffd66d";
    ctx.beginPath();
    ctx.moveTo(-5, -63);
    ctx.lineTo(0, -78);
    ctx.lineTo(5, -63);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(-4, -49, 6, 3, -0.15, 0, Math.PI * 2);
    ctx.ellipse(6, -49, 6, 3, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#111827";
  ctx.fillRect(-15, -7, 30, 7);
  ctx.fillStyle = riderActive ? "#334155" : "#1f2937";
  ctx.fillRect(-6, -10, 12, 11);

  ctx.fillStyle = "#05070a";
  ctx.fillRect(11, -27, 10, 7);
  ctx.fillStyle = riderActive ? "#334155" : "#111827";
  ctx.fillRect(13, -25, 6, 3);

  ctx.restore();
}

function drawRiderTimer(w, h) {
  if (game.riderTimer <= 0) return;
  const road = roadBounds();
  const barW = road.width * 0.62;
  const x = road.left + (road.width - barW) / 2;
  const y = 18;
  ctx.save();
  ctx.fillStyle = "rgba(4, 16, 20, 0.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, barW, 12, 8);
  ctx.fill();
  ctx.fillStyle = "#68e5ff";
  ctx.beginPath();
  ctx.roundRect(x, y, barW * (Math.min(10, game.riderTimer) / 10), 12, 8);
  ctx.fill();
  ctx.font = "800 12px Malgun Gothic, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#dffcff";
  ctx.fillText(`ROAD RIDER ${Math.ceil(Math.min(10, game.riderTimer))}s`, w / 2, y + 28);
  ctx.restore();
}

function drawTransformScene(w, h) {
  if (game.transformTimer <= 0) return;
  const progress = 1 - game.transformTimer / 1.85;
  const beltX = w / 2;
  const beltY = h * 0.56;
  const deviceStartX = game.player.x + 16;
  const deviceStartY = game.player.y - 28;
  const ease = progress * progress * (3 - 2 * progress);
  const deviceX = deviceStartX + (beltX - deviceStartX) * ease;
  const deviceY = deviceStartY + (beltY - deviceStartY) * ease;
  const flash = Math.max(0, Math.sin(progress * Math.PI));

  ctx.save();
  ctx.fillStyle = `rgba(3, 8, 12, ${0.34 + flash * 0.18})`;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = `rgba(104, 229, 255, ${0.24 + flash * 0.48})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(beltX, beltY, 48 + i * 34 + progress * 52, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.roundRect(beltX - 74, beltY - 14, 148, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#68e5ff";
  ctx.beginPath();
  ctx.roundRect(beltX - 26, beltY - 24, 52, 48, 10);
  ctx.fill();
  ctx.fillStyle = "#10201e";
  ctx.fillRect(beltX - 16, beltY - 8, 32, 16);

  ctx.fillStyle = "#0b1520";
  ctx.beginPath();
  ctx.roundRect(deviceX - 16, deviceY - 22, 32, 44, 7);
  ctx.fill();
  ctx.fillStyle = "#7dd3fc";
  ctx.fillRect(deviceX - 10, deviceY - 15, 20, 18);
  ctx.fillStyle = "#dffcff";
  ctx.fillRect(deviceX - 7, deviceY + 8, 14, 4);

  if (progress > 0.72) {
    ctx.globalAlpha = (progress - 0.72) / 0.28;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, beltY - 3, w, 6);
    ctx.globalAlpha = 1;
  }

  ctx.font = "900 30px Malgun Gothic, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#68e5ff";
  ctx.shadowBlur = 18;
  ctx.fillText("\ub85c\ub4dc\ub77c\uc774\ub354 \ubcc0\uc2e0", w / 2, h * 0.26);
  ctx.font = "800 15px Malgun Gothic, sans-serif";
  ctx.fillStyle = "#dffcff";
  ctx.fillText("\uac00\ubbfc \ubaa8\ub4c8 \uc7a5\ucc29", w / 2, h * 0.31);
  ctx.restore();
}

function drawBoss() {
  if (!game.boss) return;
  const b = game.boss;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(CHARACTER_SCALE, CHARACTER_SCALE);
  ctx.globalAlpha = b.hurt > 0 && Math.floor(game.time * 28) % 2 === 0 ? 0.55 : 1;

  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 66, 76, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.roundRect(-68, -18, 136, 58, 12);
  ctx.fill();
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.roundRect(-58, -52, 116, 42, 14);
  ctx.fill();
  ctx.fillStyle = "#7c2d12";
  ctx.fillRect(-54, -3, 108, 22);

  ctx.fillStyle = "#111827";
  for (const wheel of [
    [-52, 42],
    [-18, 47],
    [18, 47],
    [52, 42],
  ]) {
    ctx.beginPath();
    ctx.arc(wheel[0], wheel[1], 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(-24, -6, 12, 0, Math.PI * 2);
  ctx.arc(24, -6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(-29, -9, 3, 0, Math.PI * 2);
  ctx.arc(19, -9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 8, 20, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  ctx.font = "900 12px Malgun Gothic, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("4\ub95c \uc790\uc804\uac70", 0, 72);
  ctx.restore();

  drawBossHealth();
}

function drawBossHealth() {
  if (!game.boss) return;
  const road = roadBounds();
  const w = road.width * 0.72;
  const x = road.left + (road.width - w) / 2;
  const y = 52;
  ctx.save();
  ctx.fillStyle = "rgba(6, 12, 16, 0.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 15, 9);
  ctx.fill();
  ctx.fillStyle = "#ff5c5c";
  ctx.beginPath();
  ctx.roundRect(x, y, w * (game.boss.hp / game.boss.maxHp), 15, 9);
  ctx.fill();
  ctx.font = "900 13px Malgun Gothic, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff4d6";
  ctx.fillText(`\ubcf4\uc2a4 ${game.boss.level}\ub2e8\uacc4: \ud55c\uac15 4\ub95c \uc790\uc804\uac70 (${game.boss.hp}/${game.boss.maxHp})`, x + w / 2, y - 7);
  ctx.restore();
}

function drawBossProjectile(projectile) {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.rotation + Math.sin(projectile.age * 8) * 0.12);
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.roundRect(-34, -16, 68, 32, 14);
  ctx.fill();
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.moveTo(-10, 13);
  ctx.lineTo(-2, 30);
  ctx.lineTo(10, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 3;
  ctx.strokeRect(-26, -10, 52, 20);
  ctx.font = "900 11px Malgun Gothic, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7c2d12";
  ctx.fillText("\uae54\uae54!", 0, 1);
  ctx.restore();
}

function drawMarathonRunner(runner) {
  ctx.save();
  ctx.translate(runner.x, runner.y);
  ctx.scale(CHARACTER_SCALE, CHARACTER_SCALE);
  const step = Math.sin(runner.phase) * 5;
  ctx.globalAlpha = runner.dead ? 0.35 : 1;

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-10, 24);
  ctx.lineTo(-18, 40 + step);
  ctx.moveTo(10, 24);
  ctx.lineTo(18, 40 - step);
  ctx.moveTo(-14, 4);
  ctx.lineTo(-26, 17 - step);
  ctx.moveTo(14, 4);
  ctx.lineTo(26, 17 + step);
  ctx.stroke();

  ctx.fillStyle = runner.color;
  ctx.beginPath();
  ctx.roundRect(-17, -10, 34, 38, 9);
  ctx.fill();
  ctx.fillStyle = "#f4d5b5";
  ctx.beginPath();
  ctx.arc(0, -25, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.fillRect(-9, -34, 18, 8);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 10px Malgun Gothic, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RUN", 0, 7);
  ctx.restore();
}

function drawMarathonOverlay(w) {
  if (game.marathonTimer <= 0) return;
  const road = roadBounds();
  const barW = road.width * 0.72;
  const x = road.left + (road.width - barW) / 2;
  const y = 78;
  ctx.save();
  ctx.fillStyle = "rgba(10, 8, 12, 0.78)";
  ctx.beginPath();
  ctx.roundRect(x, y, barW, 16, 9);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.roundRect(x, y, barW * (game.marathonTimer / 11), 16, 9);
  ctx.fill();
  ctx.font = "900 14px Malgun Gothic, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff4d6";
  ctx.fillText(`\ub9c8\ub77c\ud1a4 \uad70\ub2e8 ${Math.ceil(game.marathonTimer)}s`, w / 2, y - 8);
  ctx.restore();
}

function drawVillainLabel(v, yOffset, weight = 800) {
  ctx.fillStyle = "#ffffff";
  ctx.font = `${weight} ${12 / CHARACTER_SCALE}px Malgun Gothic, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineWidth = 4 / CHARACTER_SCALE;
  ctx.strokeStyle = "rgba(6, 12, 16, 0.62)";
  ctx.strokeText(v.name, 0, yOffset);
  ctx.fillText(v.name, 0, yOffset);
}

function drawVillain(v) {
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.scale(CHARACTER_SCALE, CHARACTER_SCALE);

  if (v.name === "\ub7ec\ub2dd\ud06c\ub8e8") {
    ctx.scale(v.visualScale || 1, v.visualScale || 1);
    const step = Math.sin(v.phase * 1.6) * 2.8;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 48, 48, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
    ctx.beginPath();
    ctx.roundRect(-42, -62, 84, 120, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(-39, -58, 78, 112);
    ctx.setLineDash([]);

    const drawCrewRunner = (x, y, color, index) => {
      const gait = Math.sin(v.phase * 2.2 + index * 0.8) * 4;
      ctx.save();
      ctx.translate(x, y + step);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.lineTo(-12, 19 + gait);
      ctx.moveTo(5, 8);
      ctx.lineTo(12, 19 - gait);
      ctx.moveTo(-6, -5);
      ctx.lineTo(-14, 5 - gait);
      ctx.moveTo(6, -5);
      ctx.lineTo(14, 5 + gait);
      ctx.stroke();

      ctx.fillStyle = v.hitFlash > 0 ? "#ffffff" : color;
      ctx.beginPath();
      ctx.roundRect(-9, -12, 18, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#f4d5b5";
      ctx.beginPath();
      ctx.arc(0, -22, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.fillRect(-5, -28, 10, 5);
      ctx.restore();
    };

    let runnerIndex = 0;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const x = col === 0 ? -18 : 18;
        const y = -40 + row * 23;
        const color = row % 2 === 0 ? (col === 0 ? "#2563eb" : "#ef4444") : (col === 0 ? "#16a34a" : "#f97316");
        drawCrewRunner(x, y, color, runnerIndex);
        runnerIndex += 1;
      }
    }

    drawVillainLabel(v, v.radius + 25, 900);
    ctx.restore();
    return;
  }

  if (v.name === "\uc5ed\uc8fc\ud589\ub7ec") {
    const bob = Math.sin(v.phase * 1.8) * 2.5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 38, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#071114";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 28, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#d9f7ff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(Math.cos(angle) * 17, 28 + Math.sin(angle) * 17);
      ctx.stroke();
    }

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, 31);
    ctx.moveTo(-22, 4);
    ctx.lineTo(22, 4);
    ctx.moveTo(-18, 6);
    ctx.lineTo(-5, 18);
    ctx.moveTo(18, 6);
    ctx.lineTo(5, 18);
    ctx.stroke();

    ctx.fillStyle = v.hitFlash > 0 ? "#ffffff" : "#ff5c5c";
    ctx.beginPath();
    ctx.roundRect(-16, -18 + bob, 32, 34, 9);
    ctx.fill();
    ctx.fillStyle = "#fff4d6";
    ctx.beginPath();
    ctx.arc(0, -34 + bob, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(-5, -36 + bob, 3, 4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(6, -36 + bob, 3, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, -27 + bob);
    ctx.quadraticCurveTo(0, -31 + bob, 7, -27 + bob);
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(0, -45 + bob, 17, 10, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(16, -39 + bob);
    ctx.quadraticCurveTo(0, -33 + bob, -16, -39 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-10, -43 + bob, 20, 4);

    drawVillainLabel(v, v.radius + 24, 900);
    ctx.restore();
    return;
  }

  if (v.name === "\uae38\ub9c9\uc218\ub2e4\ub2e8") {
    const lean = Math.sin(v.phase * 1.4) * 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.23)";
    ctx.beginPath();
    ctx.ellipse(0, 40, 51, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawBackCyclist = (x, color, phaseShift) => {
      const pedal = Math.sin(v.phase + phaseShift) * 4;
      ctx.save();
      ctx.translate(x, lean);
      ctx.strokeStyle = "#101516";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 29, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 29);
      ctx.lineTo(-10, 19);
      ctx.lineTo(8, 19);
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-8, 7);
      ctx.lineTo(-18, 19 + pedal);
      ctx.moveTo(8, 7);
      ctx.lineTo(18, 19 - pedal);
      ctx.moveTo(-12, -11);
      ctx.lineTo(-22, 2);
      ctx.moveTo(12, -11);
      ctx.lineTo(22, 2);
      ctx.stroke();

      ctx.fillStyle = v.hitFlash > 0 ? "#ffffff" : color;
      ctx.beginPath();
      ctx.roundRect(-15, -20, 30, 32, 8);
      ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.arc(0, -35, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4d5b5";
      ctx.beginPath();
      ctx.arc(0, -30, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawBackCyclist(-21, "#f97316", 0);
    drawBackCyclist(21, "#fb923c", Math.PI);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(-34, -54, 13, 8, -0.2, 0, Math.PI * 2);
    ctx.ellipse(34, -52, 13, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(-38, -54, 2, 0, Math.PI * 2);
    ctx.arc(-31, -54, 2, 0, Math.PI * 2);
    ctx.arc(30, -52, 2, 0, Math.PI * 2);
    ctx.arc(37, -52, 2, 0, Math.PI * 2);
    ctx.fill();

    drawVillainLabel(v, v.radius + 26, 900);
    ctx.restore();
    return;
  }

  if (v.name === "\ud0a5\ubcf4\ub4dc\ud3ed\uc8fc\uc871") {
    ctx.scale(v.visualScale || 1, v.visualScale || 1);
    const lean = Math.sin(v.phase * 1.9) * 0.08;
    const bob = Math.sin(v.phase * 2.6) * 2.2;
    ctx.rotate(lean - 0.06);

    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(2, 39, 43, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.36)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-45, 18);
    ctx.lineTo(-20, 25);
    ctx.moveTo(-42, 32);
    ctx.lineTo(-18, 36);
    ctx.moveTo(48, 12);
    ctx.lineTo(24, 23);
    ctx.stroke();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(22, 31, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(22, 31, 10, 0, Math.PI * 2);
    ctx.moveTo(22, 21);
    ctx.lineTo(22, 41);
    ctx.moveTo(12, 31);
    ctx.lineTo(32, 31);
    ctx.stroke();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-25, 31, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-30, 18);
    ctx.lineTo(25, 18);
    ctx.stroke();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-24, 14);
    ctx.lineTo(20, 14);
    ctx.stroke();

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(20, 17);
    ctx.lineTo(5, -45 + bob);
    ctx.stroke();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, 17);
    ctx.lineTo(5, -45 + bob);
    ctx.stroke();

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-19, -48 + bob);
    ctx.lineTo(31, -48 + bob);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.roundRect(-25, -52 + bob, 13, 8, 4);
    ctx.roundRect(26, -52 + bob, 13, 8, 4);
    ctx.fill();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-11, -11 + bob);
    ctx.lineTo(-25, 16);
    ctx.moveTo(5, -7 + bob);
    ctx.lineTo(8, 16);
    ctx.moveTo(-13, -28 + bob);
    ctx.lineTo(-4, -47 + bob);
    ctx.moveTo(10, -29 + bob);
    ctx.lineTo(19, -47 + bob);
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(-25, 18, 8, 4, 0.1, 0, Math.PI * 2);
    ctx.ellipse(8, 17, 8, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = v.hitFlash > 0 ? "#ffffff" : "#2563eb";
    ctx.beginPath();
    ctx.roundRect(-19, -37 + bob, 35, 37, 8);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(-6, -34 + bob);
    ctx.lineTo(7, -34 + bob);
    ctx.lineTo(2, -8 + bob);
    ctx.lineTo(-8, -8 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -34 + bob);
    ctx.lineTo(-21, -15 + bob);
    ctx.moveTo(13, -34 + bob);
    ctx.lineTo(18, -13 + bob);
    ctx.stroke();

    ctx.fillStyle = "#f4d5b5";
    ctx.beginPath();
    ctx.arc(-2, -53 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(-3, -62 + bob, 15, 9, -0.2, Math.PI, Math.PI * 2);
    ctx.lineTo(12, -56 + bob);
    ctx.quadraticCurveTo(-2, -49 + bob, -17, -56 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(2, -54 + bob, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, -47 + bob);
    ctx.quadraticCurveTo(-2, -43 + bob, 7, -47 + bob);
    ctx.stroke();

    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.moveTo(-32, 19);
    ctx.lineTo(-48, 25 + Math.sin(v.phase * 6) * 3);
    ctx.lineTo(-32, 31);
    ctx.closePath();
    ctx.fill();

    drawVillainLabel(v, v.radius + 27, 900);
    ctx.restore();
    return;
  }

  if (v.name === "\ub9c9\uac78\ub9ac \ub77c\uc774\ub354") {
    const sway = Math.sin(v.phase * 0.9) * 0.2 + Math.sin(v.phase * 2.4) * 0.06;
    const bob = Math.sin(v.phase * 1.7) * 2.4;
    ctx.rotate(sway);

    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 42, 44, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-55, -10);
    ctx.quadraticCurveTo(-38, -18, -24, -6);
    ctx.moveTo(48, 1);
    ctx.quadraticCurveTo(32, -10, 17, 2);
    ctx.moveTo(-50, 27);
    ctx.quadraticCurveTo(-31, 18, -12, 28);
    ctx.stroke();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(-27, 31, 16, 0, Math.PI * 2);
    ctx.arc(29, 31, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    for (const wheelX of [-27, 29]) {
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6 + v.phase * 0.18;
        ctx.beginPath();
        ctx.moveTo(wheelX, 31);
        ctx.lineTo(wheelX + Math.cos(angle) * 14, 31 + Math.sin(angle) * 14);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-27, 31);
    ctx.lineTo(-6, 2);
    ctx.lineTo(28, 31);
    ctx.lineTo(1, 31);
    ctx.lineTo(-6, 2);
    ctx.moveTo(-6, 2);
    ctx.lineTo(14, -12);
    ctx.moveTo(28, 31);
    ctx.lineTo(22, -16);
    ctx.stroke();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(7, -18);
    ctx.lineTo(35, -17);
    ctx.moveTo(-11, 3 + bob);
    ctx.lineTo(-25, 23);
    ctx.moveTo(8, 4 + bob);
    ctx.lineTo(19, 25);
    ctx.moveTo(-13, -20 + bob);
    ctx.lineTo(-23, -3);
    ctx.moveTo(12, -20 + bob);
    ctx.lineTo(25, -14);
    ctx.stroke();

    ctx.fillStyle = v.hitFlash > 0 ? "#ffffff" : "#7c2d12";
    ctx.beginPath();
    ctx.roundRect(-18, -34 + bob, 36, 39, 10);
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.roundRect(-12, -31 + bob, 24, 9, 4);
    ctx.fill();

    ctx.fillStyle = "#f1d2ad";
    ctx.beginPath();
    ctx.arc(1, -50 + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d1d5db";
    ctx.beginPath();
    ctx.ellipse(-2, -60 + bob, 16, 9, -0.25, Math.PI, Math.PI * 2);
    ctx.lineTo(12, -54 + bob);
    ctx.quadraticCurveTo(0, -48 + bob, -17, -54 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-4, -51 + bob, 2, 0, Math.PI * 2);
    ctx.arc(6, -51 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-7, -43 + bob);
    ctx.quadraticCurveTo(0, -39 + bob, 8, -43 + bob);
    ctx.moveTo(-5, -46 + bob);
    ctx.quadraticCurveTo(0, -43 + bob, 5, -46 + bob);
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-43, -4 + bob, 12, 22, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.ellipse(-37, -5 + bob, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(-25, 24, 8, 4, -0.1, 0, Math.PI * 2);
    ctx.ellipse(19, 26, 8, 4, 0.1, 0, Math.PI * 2);
    ctx.fill();

    drawVillainLabel(v, v.radius + 28, 900);
    ctx.restore();
    return;
  }

  if (v.skid) {
    const skidLean = Math.sin(v.phase) * 0.28;
    ctx.rotate(skidLean);

    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-44, 38);
    ctx.quadraticCurveTo(-12, 48, 32, 34);
    ctx.moveTo(-34, 48);
    ctx.quadraticCurveTo(-6, 56, 38, 43);
    ctx.stroke();

    ctx.fillStyle = v.hitFlash > 0 ? "#ffffff" : "#facc15";
    ctx.beginPath();
    ctx.moveTo(-36, 4);
    ctx.quadraticCurveTo(-4, -28, 42, -18);
    ctx.quadraticCurveTo(12, -5, -8, 20);
    ctx.quadraticCurveTo(20, 14, 48, 5);
    ctx.quadraticCurveTo(4, 38, -42, 25);
    ctx.quadraticCurveTo(-56, 17, -36, 4);
    ctx.fill();

    ctx.strokeStyle = "#0b1117";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-24, 24, 13, 0, Math.PI * 2);
    ctx.arc(24, 24, 13, 0, Math.PI * 2);
    ctx.moveTo(-24, 24);
    ctx.lineTo(0, 2);
    ctx.lineTo(24, 24);
    ctx.lineTo(-2, 24);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.roundRect(-10, -15, 26, 26, 7);
    ctx.fill();
    ctx.fillStyle = "#f4d5b5";
    ctx.beginPath();
    ctx.arc(6, -28, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-2, -39, 18, 7);

    drawVillainLabel(v, v.radius + 26, 800);
    ctx.restore();
    return;
  }

  ctx.fillStyle = v.hitFlash > 0 ? "#ffffff" : v.color;
  ctx.beginPath();
  ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.arc(-8, -4, 4, 0, Math.PI * 2);
  ctx.arc(9, -4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-10, 10);
  ctx.quadraticCurveTo(0, 3, 11, 10);
  ctx.stroke();

  if (v.name === "\ud0a5\ubcf4\ub4dc\ud3ed\uc8fc\uc871") {
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-22, 24);
    ctx.lineTo(24, 24);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${12 / CHARACTER_SCALE}px Malgun Gothic, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(v.name, 0, v.radius + 18);
  ctx.restore();
}

function drawItem(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.fillStyle = item.kind === "bell" ? "#ffc857" : "#31d6a4";
  ctx.beginPath();
  ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#10201e";
  ctx.font = "800 21px Segoe UI Emoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.kind === "bell" ? "\ud83d\udd14" : "+", 0, 1);
  ctx.restore();
}

function drawBlast(blast) {
  ctx.save();
  for (const point of blast.trail) {
    const alpha = 1 - point.age / 0.28;
    ctx.globalAlpha = alpha * 0.42;
    ctx.strokeStyle = "#ffd66d";
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 18 + alpha * 20, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.fillStyle = "#68e5ff";
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 12 * alpha, 4 * alpha, 20 * alpha, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.translate(blast.x, blast.y);
  const pulse = Math.sin(blast.spin * 0.8) * 4;

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#fff4d6";
  ctx.beginPath();
  ctx.ellipse(0, 0, blast.radius + 15 + pulse, blast.radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (let i = 0; i < 4; i += 1) {
    const r = 16 + i * 12 + pulse;
    ctx.strokeStyle = i % 2 === 0 ? "#ffd66d" : "#68e5ff";
    ctx.lineWidth = Math.max(2, 7 - i);
    ctx.globalAlpha = 0.95 - i * 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -blast.radius - 13);
  ctx.quadraticCurveTo(14, -22, 0, -5);
  ctx.quadraticCurveTo(-14, -22, 0, -blast.radius - 13);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawParticles() {
  for (const p of game.particles) {
    const alpha = 1 - p.age / p.life;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloatingText() {
  ctx.textAlign = "center";
  ctx.font = "800 22px Malgun Gothic, sans-serif";
  for (const text of game.comboText) {
    const alpha = 1 - text.age / text.life;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y - text.age * 42);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const visualTime = game.time * (game.riderTimer > 0 ? 1.85 : 1);
  drawBackground(w, h, visualTime);

  for (const item of game.items) drawItem(item);
  for (const blast of game.blasts) drawBlast(blast);
  for (const villain of game.villains) drawVillain(villain);
  for (const runner of game.marathonRunners) drawMarathonRunner(runner);
  drawBoss();
  for (const projectile of game.bossProjectiles) drawBossProjectile(projectile);
  drawPlayer();
  drawParticles();
  drawFloatingText();
  drawRiderTimer(w, h);
  drawMarathonOverlay(w);
  drawTransformScene(w, h);

  if (!game.running) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "800 18px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\ud55c\uac15 \uc790\uc804\uac70\uae38", w / 2, h * 0.6);
  }
}

function endGame() {
  game.over = true;
  game.running = false;
  overlay.hidden = false;
  const finalScore = Math.floor(game.score);
  const rankIndex = rankIndexFor(finalScore);
  if (rankIndex >= 0) {
    pendingScore = finalScore;
    nameEntry.hidden = false;
    playerNameInput.value = "";
    overlayText.textContent = `${formatDistanceDetail(finalScore)} \uc8fc\ud589. ${rankIndex + 1}\uc704 \uae30\ub85d! \uc774\ub984\uc744 \uc785\ub825\ud558\uc138\uc694.`;
    setTimeout(() => playerNameInput.focus(), 0);
  } else {
    pendingScore = null;
    nameEntry.hidden = true;
    overlayText.textContent = `${formatDistanceDetail(finalScore)} \uc8fc\ud589. \ub2e4\uc2dc \ub2ec\ub824\ubcfc\uae4c\uc694?`;
  }
  startBtn.textContent = "\uc7ac\ucd9c\ubc1c";
  renderLeaderboard();
}

function togglePause() {
  if (!game.running || game.over) return;
  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? ">" : "II";
  overlay.hidden = !game.paused;
  nameEntry.hidden = true;
  overlayText.textContent = "\uc7a0\uc2dc \uc26c\ub294 \uc911";
  startBtn.textContent = "\uacc4\uc18d";
  renderLeaderboard();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", () => {
  fitCanvas();
  if (!game.running) draw();
});

["contextmenu", "selectstart", "dragstart"].forEach((eventName) => {
  document.addEventListener(eventName, (event) => event.preventDefault());
});

window.addEventListener("keydown", (event) => {
  if (event.target === playerNameInput) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ControlLeft", "ControlRight"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "Space") ringBell();
  if (event.code === "KeyR" || event.code === "ControlLeft" || event.code === "ControlRight") useSpecial();
  if (event.code === "KeyP") togglePause();
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

document.querySelectorAll("[data-hold]").forEach((button) => {
  const direction = button.dataset.hold;
  const press = (event) => {
    event.preventDefault();
    hold.add(direction);
  };
  const release = () => hold.delete(direction);
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

playerNameInput.addEventListener("input", () => {
  const limited = limitPlayerName(playerNameInput.value);
  if (playerNameInput.value !== limited) playerNameInput.value = limited;
});

playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitLeaderboardName();
  }
});

saveScoreBtn.addEventListener("click", submitLeaderboardName);

startBtn.addEventListener("click", () => {
  if (game.paused && game.running) {
    game.paused = false;
    overlay.hidden = true;
    nameEntry.hidden = true;
    pauseBtn.textContent = "II";
    return;
  }
  resetGame();
});
pauseBtn.addEventListener("click", togglePause);
bellBtn.addEventListener("click", ringBell);
specialBtn.addEventListener("click", useSpecial);

fitCanvas();
updateHud();
renderLeaderboard();
draw();
requestAnimationFrame(frame);

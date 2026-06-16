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

const keys = new Set();
const hold = new Set();

const villainTypes = [
  { name: "역주행러", color: "#ff5c5c", hp: 1, radius: 25, wobble: 0.8, score: 80 },
  { name: "킥보드폭주족", color: "#ffc857", hp: 1, radius: 22, wobble: 1.3, score: 95 },
  { name: "셀카봉러", color: "#a78bfa", hp: 1, radius: 24, wobble: 0.45, score: 75 },
  { name: "길막수다단", color: "#f97316", hp: 2, radius: 31, wobble: 0.35, score: 140 },
  { name: "돗자리확장러", color: "#38bdf8", hp: 2, radius: 34, wobble: 0.2, score: 150 },
];

const game = {
  running: false,
  paused: false,
  over: false,
  time: 0,
  score: 0,
  health: 100,
  bells: 3,
  speed: 310,
  spawnTimer: 0,
  itemTimer: 2.5,
  invincible: 0,
  comboText: [],
  player: {
    x: 250,
    y: 360,
    radius: 25,
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
  game.bells = 3;
  game.speed = 310;
  game.spawnTimer = 1.35;
  game.itemTimer = 3.2;
  game.invincible = 0;
  game.comboText = [];
  game.villains = [];
  game.blasts = [];
  game.items = [];
  game.particles = [];
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  game.player.x = Math.max(126, w * 0.22);
  game.player.y = h * 0.56;
  overlay.hidden = true;
  pauseBtn.textContent = "Ⅱ";
  updateHud();
}

function updateHud() {
  scoreEl.textContent = `${Math.floor(game.score)}m`;
  healthEl.textContent = Math.max(0, Math.round(game.health));
  bellsEl.textContent = game.bells;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function laneBounds() {
  const h = canvas.clientHeight;
  return {
    top: h * 0.24,
    bottom: h * 0.88,
  };
}

function spawnVillain() {
  const bounds = laneBounds();
  const type = villainTypes[Math.floor(Math.random() * villainTypes.length)];
  const extraSpeed = Math.min(165, Math.max(0, game.time - 8) * 4.9);
  game.villains.push({
    ...type,
    x: canvas.clientWidth + type.radius + rand(20, 140),
    y: rand(bounds.top + type.radius, bounds.bottom - type.radius),
    hp: type.hp,
    baseY: 0,
    phase: rand(0, Math.PI * 2),
    speed: game.speed + extraSpeed + rand(-18, 58),
    hitFlash: 0,
  });
  game.villains[game.villains.length - 1].baseY = game.villains[game.villains.length - 1].y;
}

function spawnItem() {
  const bounds = laneBounds();
  const kind = Math.random() > 0.44 ? "bell" : "water";
  game.items.push({
    kind,
    x: canvas.clientWidth + 38,
    y: rand(bounds.top + 36, bounds.bottom - 36),
    radius: 20,
    speed: game.speed * 0.86,
    phase: rand(0, Math.PI * 2),
  });
}

function ringBell() {
  if (!game.running || game.paused || game.over || game.bells <= 0) return;
  game.bells -= 1;
  game.blasts.push({
    x: game.player.x + 22,
    y: game.player.y,
    radius: 18,
    maxRadius: 170,
    life: 0.36,
    age: 0,
  });
  burst(game.player.x + 32, game.player.y, "#ffc857", 14, 220);
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
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

function damagePlayer(amount, x, y) {
  if (game.invincible > 0) return;
  game.health -= amount;
  game.invincible = 0.85;
  burst(x, y, "#ff5c5c", 18, 260);
  game.comboText.push({ text: "충돌!", x, y: y - 28, age: 0, life: 0.7, color: "#ffb4b4" });
  if (game.health <= 0) endGame();
}

function defeatVillain(villain, reason) {
  game.score += villain.score;
  burst(villain.x, villain.y, "#31d6a4", 20, 270);
  game.comboText.push({
    text: reason || "퇴치!",
    x: villain.x,
    y: villain.y - 34,
    age: 0,
    life: 0.9,
    color: "#b7ffdf",
  });
  villain.dead = true;
}

function pickup(item) {
  if (item.kind === "bell") {
    game.bells = Math.min(9, game.bells + 2);
    game.comboText.push({ text: "벨 +2", x: item.x, y: item.y - 28, age: 0, life: 0.8, color: "#fff0b3" });
    burst(item.x, item.y, "#ffc857", 12, 180);
  } else {
    game.health = Math.min(100, game.health + 18);
    game.comboText.push({ text: "회복", x: item.x, y: item.y - 28, age: 0, life: 0.8, color: "#b9fbc0" });
    burst(item.x, item.y, "#31d6a4", 12, 180);
  }
  item.dead = true;
  updateHud();
}

function update(dt) {
  if (!game.running || game.paused || game.over) return;

  game.time += dt;
  game.score += dt * (22 + game.time * 0.65);
  game.speed = 305 + Math.min(175, Math.max(0, game.time - 6) * 6.2);
  game.invincible = Math.max(0, game.invincible - dt);

  const bounds = laneBounds();
  const player = game.player;
  let vx = 0;
  let vy = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW") || hold.has("up")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS") || hold.has("down")) vy += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || hold.has("left")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD") || hold.has("right")) vx += 1;
  const len = Math.hypot(vx, vy) || 1;
  player.x = clamp(player.x + (vx / len) * 420 * dt, 66, canvas.clientWidth * 0.54);
  player.y = clamp(player.y + (vy / len) * 420 * dt, bounds.top + player.radius, bounds.bottom - player.radius);
  player.tilt += ((vy * 0.28) - player.tilt) * Math.min(1, dt * 10);

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnVillain();
    game.spawnTimer = rand(0.86, 1.42) * Math.max(0.62, 1 - game.time / 105);
  }

  game.itemTimer -= dt;
  if (game.itemTimer <= 0) {
    spawnItem();
    game.itemTimer = rand(4.6, 7.4);
  }

  for (const villain of game.villains) {
    villain.x -= villain.speed * dt;
    villain.phase += dt * 3.2;
    villain.y = villain.baseY + Math.sin(villain.phase) * villain.radius * villain.wobble;
    villain.hitFlash = Math.max(0, villain.hitFlash - dt);
    if (circleHit(player, villain)) {
      damagePlayer(villain.hp === 2 ? 17 : 11, villain.x, villain.y);
      villain.x -= 80;
      villain.baseY += villain.y > player.y ? 28 : -28;
    }
  }

  for (const item of game.items) {
    item.x -= item.speed * dt;
    item.phase += dt * 4;
    item.y += Math.sin(item.phase) * 0.28;
    if (circleHit(player, item)) pickup(item);
  }

  for (const blast of game.blasts) {
    blast.age += dt;
    blast.radius = 18 + (blast.maxRadius - 18) * (blast.age / blast.life);
    for (const villain of game.villains) {
      if (villain.dead) continue;
      const dx = villain.x - blast.x;
      const dy = villain.y - blast.y;
      if (Math.hypot(dx, dy) < blast.radius + villain.radius) {
        villain.hp -= 1;
        villain.hitFlash = 0.12;
        villain.x += 72;
        if (villain.hp <= 0) defeatVillain(villain, "퇴치!");
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

  game.villains = game.villains.filter((v) => !v.dead && v.x > -90);
  game.items = game.items.filter((i) => !i.dead && i.x > -60);
  game.blasts = game.blasts.filter((b) => b.age < b.life);
  game.particles = game.particles.filter((p) => p.age < p.life);
  game.comboText = game.comboText.filter((t) => t.age < t.life);

  updateHud();
}

function drawBackground(w, h, t) {
  const bounds = laneBounds();
  ctx.fillStyle = "#216f86";
  ctx.fillRect(0, 0, w, h * 0.22);

  ctx.fillStyle = "#1a7c5b";
  ctx.fillRect(0, h * 0.18, w, h * 0.1);

  ctx.fillStyle = "#3c4644";
  ctx.fillRect(0, bounds.top - 18, w, bounds.bottom - bounds.top + 36);

  ctx.fillStyle = "#525d59";
  ctx.fillRect(0, bounds.top, w, bounds.bottom - bounds.top);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.44)";
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 26]);
  ctx.lineDashOffset = -t * 160;
  for (let y = bounds.top + (bounds.bottom - bounds.top) / 3; y < bounds.bottom; y += (bounds.bottom - bounds.top) / 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = "#d7d1aa";
  ctx.fillRect(0, bounds.bottom + 18, w, Math.max(36, h - bounds.bottom - 18));

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 16; i += 1) {
    const x = ((i * 160 - t * 65) % (w + 190)) - 80;
    ctx.fillRect(x, h * 0.11 + Math.sin(i + t) * 8, 70, 3);
  }

  ctx.fillStyle = "#243030";
  for (let i = 0; i < 9; i += 1) {
    const x = ((i * 220 - t * 120) % (w + 260)) - 120;
    drawTree(x, bounds.top - 30, 0.9 + (i % 3) * 0.1);
  }
}

function drawTree(x, y, scale) {
  ctx.fillStyle = "#523f2b";
  ctx.fillRect(x - 4 * scale, y - 28 * scale, 8 * scale, 34 * scale);
  ctx.fillStyle = "#2f8c57";
  ctx.beginPath();
  ctx.arc(x, y - 42 * scale, 22 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#37a66a";
  ctx.beginPath();
  ctx.arc(x + 12 * scale, y - 54 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt);

  if (game.invincible > 0 && Math.floor(game.time * 18) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  ctx.strokeStyle = "#101516";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-18, 15, 13, 0, Math.PI * 2);
  ctx.arc(23, 15, 13, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#31d6a4";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-18, 15);
  ctx.lineTo(3, -10);
  ctx.lineTo(23, 15);
  ctx.lineTo(-3, 15);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#f4d5b5";
  ctx.beginPath();
  ctx.arc(4, -27, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#115e59";
  ctx.fillRect(-8, -20, 24, 26);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, -39, 17, 8);
  ctx.fillStyle = "#ff5c5c";
  ctx.fillRect(14, -37, 9, 4);

  ctx.restore();
}

function drawVillain(v) {
  ctx.save();
  ctx.translate(v.x, v.y);

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

  if (v.name === "셀카봉러") {
    ctx.strokeStyle = "#d7d7d7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(16, -12);
    ctx.lineTo(39, -34);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.fillRect(34, -42, 17, 12);
  }

  if (v.name === "킥보드폭주족") {
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-22, 24);
    ctx.lineTo(24, 24);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 12px Malgun Gothic, sans-serif";
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
  ctx.fillText(item.kind === "bell" ? "🔔" : "+", 0, 1);
  ctx.restore();
}

function drawBlast(blast) {
  const alpha = 1 - blast.age / blast.life;
  ctx.strokeStyle = `rgba(255, 200, 87, ${alpha})`;
  ctx.lineWidth = 8 * alpha + 2;
  ctx.beginPath();
  ctx.arc(blast.x, blast.y, blast.radius, 0, Math.PI * 2);
  ctx.stroke();
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
  drawBackground(w, h, game.time);

  for (const item of game.items) drawItem(item);
  for (const blast of game.blasts) drawBlast(blast);
  for (const villain of game.villains) drawVillain(villain);
  drawPlayer();
  drawParticles();
  drawFloatingText();

  if (!game.running) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "800 18px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("한강 자전거길", w / 2, h * 0.52);
  }
}

function endGame() {
  game.over = true;
  game.running = false;
  overlay.hidden = false;
  overlayText.textContent = `${Math.floor(game.score)}m 주행. 다시 달려볼까요?`;
  startBtn.textContent = "재출발";
}

function togglePause() {
  if (!game.running || game.over) return;
  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? "▶" : "Ⅱ";
  overlay.hidden = !game.paused;
  overlayText.textContent = "잠시 쉬는 중";
  startBtn.textContent = "계속";
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

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "Space") ringBell();
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

startBtn.addEventListener("click", () => {
  if (game.paused && game.running) {
    game.paused = false;
    overlay.hidden = true;
    pauseBtn.textContent = "Ⅱ";
    return;
  }
  resetGame();
});
pauseBtn.addEventListener("click", togglePause);
bellBtn.addEventListener("click", ringBell);

fitCanvas();
draw();
requestAnimationFrame(frame);

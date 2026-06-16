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
  { name: "\uc5ed\uc8fc\ud589\ub7ec", color: "#ff5c5c", hp: 1, radius: 25, wobble: 0.8, score: 80 },
  { name: "\ud0a5\ubcf4\ub4dc\ud3ed\uc8fc\uc871", color: "#ffc857", hp: 1, radius: 22, wobble: 1.3, score: 95 },
  { name: "\uc140\uce74\ubd09\ub7ec", color: "#a78bfa", hp: 1, radius: 24, wobble: 0.45, score: 75 },
  { name: "\uae38\ub9c9\uc218\ub2e4\ub2e8", color: "#f97316", hp: 2, radius: 31, wobble: 0.35, score: 140 },
  { name: "\ub3d7\uc790\ub9ac\ud655\uc7a5\ub7ec", color: "#38bdf8", hp: 2, radius: 34, wobble: 0.2, score: 150 },
];

const game = {
  running: false,
  paused: false,
  over: false,
  time: 0,
  score: 0,
  health: 100,
  bells: 3,
  speed: 280,
  spawnTimer: 0,
  itemTimer: 2.5,
  invincible: 0,
  comboText: [],
  player: {
    x: 220,
    y: 620,
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
  game.speed = 280;
  game.spawnTimer = 1.2;
  game.itemTimer = 3.1;
  game.invincible = 0;
  game.comboText = [];
  game.villains = [];
  game.blasts = [];
  game.items = [];
  game.particles = [];

  const road = roadBounds();
  game.player.x = (road.left + road.right) / 2;
  game.player.y = road.bottom - 82;
  overlay.hidden = true;
  pauseBtn.textContent = "II";
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
    speed: game.speed + extraSpeed + rand(-16, 52),
    hitFlash: 0,
  });
}

function spawnItem() {
  const road = roadBounds();
  const kind = Math.random() > 0.44 ? "bell" : "water";
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

function ringBell() {
  if (!game.running || game.paused || game.over || game.bells <= 0) return;
  game.bells -= 1;
  game.blasts.push({
    x: game.player.x,
    y: game.player.y - 24,
    radius: 18,
    maxRadius: 164,
    life: 0.36,
    age: 0,
  });
  burst(game.player.x, game.player.y - 28, "#ffc857", 14, 220);
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

function pickup(item) {
  if (item.kind === "bell") {
    game.bells = Math.min(9, game.bells + 2);
    game.comboText.push({ text: "\ubca8 +2", x: item.x, y: item.y - 28, age: 0, life: 0.8, color: "#fff0b3" });
    burst(item.x, item.y, "#ffc857", 12, 180);
  } else {
    game.health = Math.min(100, game.health + 18);
    game.comboText.push({ text: "\ud68c\ubcf5", x: item.x, y: item.y - 28, age: 0, life: 0.8, color: "#b9fbc0" });
    burst(item.x, item.y, "#31d6a4", 12, 180);
  }
  item.dead = true;
  updateHud();
}

function update(dt) {
  if (!game.running || game.paused || game.over) return;

  game.time += dt;
  game.score += dt * (22 + game.time * 0.65);
  game.speed = 280 + Math.min(170, Math.max(0, game.time - 6) * 6.0);
  game.invincible = Math.max(0, game.invincible - dt);

  const road = roadBounds();
  const player = game.player;
  let vx = 0;
  let vy = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW") || hold.has("up")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS") || hold.has("down")) vy += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || hold.has("left")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD") || hold.has("right")) vx += 1;
  const len = Math.hypot(vx, vy) || 1;
  player.x = clamp(player.x + (vx / len) * 390 * dt, road.left + player.radius + 8, road.right - player.radius - 8);
  player.y = clamp(player.y + (vy / len) * 360 * dt, canvas.clientHeight * 0.45, road.bottom - player.radius - 18);
  player.tilt += (vx * 0.34 - player.tilt) * Math.min(1, dt * 10);

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnVillain();
    game.spawnTimer = rand(0.82, 1.38) * Math.max(0.62, 1 - game.time / 105);
  }

  game.itemTimer -= dt;
  if (game.itemTimer <= 0) {
    spawnItem();
    game.itemTimer = rand(4.4, 7.2);
  }

  for (const villain of game.villains) {
    villain.y += villain.speed * dt;
    villain.phase += dt * 3.2;
    villain.x = villain.baseX + Math.sin(villain.phase) * villain.radius * villain.wobble;
    villain.hitFlash = Math.max(0, villain.hitFlash - dt);
    if (circleHit(player, villain)) {
      damagePlayer(villain.hp === 2 ? 17 : 11, villain.x, villain.y);
      villain.y += 72;
      villain.baseX += villain.x > player.x ? 20 : -20;
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
    blast.radius = 18 + (blast.maxRadius - 18) * (blast.age / blast.life);
    for (const villain of game.villains) {
      if (villain.dead) continue;
      const dx = villain.x - blast.x;
      const dy = villain.y - blast.y;
      if (Math.hypot(dx, dy) < blast.radius + villain.radius) {
        villain.hp -= 1;
        villain.hitFlash = 0.12;
        villain.y -= 78;
        if (villain.hp <= 0) defeatVillain(villain, "\ud1f4\uce58!");
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
  game.blasts = game.blasts.filter((b) => b.age < b.life);
  game.particles = game.particles.filter((p) => p.age < p.life);
  game.comboText = game.comboText.filter((t) => t.age < t.life);

  updateHud();
}

function drawBackground(w, h, t) {
  const road = roadBounds();
  ctx.fillStyle = "#216f86";
  ctx.fillRect(0, 0, road.left, h);

  ctx.fillStyle = "#1a7c5b";
  ctx.fillRect(road.right, 0, w - road.right, h);

  ctx.fillStyle = "#313a39";
  ctx.fillRect(road.left - 18, 0, road.width + 36, h);

  ctx.fillStyle = "#525d59";
  ctx.fillRect(road.left, 0, road.width, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 28]);
  ctx.lineDashOffset = t * 170;
  for (let x = road.left + road.width / 3; x < road.right; x += road.width / 3) {
    ctx.beginPath();
    ctx.moveTo(x, -40);
    ctx.lineTo(x, h + 40);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 18; i += 1) {
    const y = ((i * 130 + t * 72) % (h + 170)) - 90;
    ctx.fillRect(road.left * 0.2 + Math.sin(i) * 18, y, Math.max(45, road.left * 0.62), 3);
  }

  for (let i = 0; i < 10; i += 1) {
    const y = ((i * 150 + t * 125) % (h + 210)) - 110;
    const x = road.right + 28 + (i % 2) * 38;
    drawTree(x, y, 0.9 + (i % 3) * 0.08);
  }

  ctx.fillStyle = "rgba(215, 209, 170, 0.9)";
  ctx.fillRect(road.left - 18, 0, 8, h);
  ctx.fillRect(road.right + 10, 0, 8, h);
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
  ctx.arc(0, -24, 12, 0, Math.PI * 2);
  ctx.arc(0, 24, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#31d6a4";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(-13, 2);
  ctx.lineTo(0, 24);
  ctx.lineTo(13, 2);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#f4d5b5";
  ctx.beginPath();
  ctx.arc(0, -48, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#115e59";
  ctx.beginPath();
  ctx.roundRect(-13, -34, 26, 35, 7);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-10, -59, 20, 8);
  ctx.fillStyle = "#ff5c5c";
  ctx.fillRect(7, -57, 9, 4);

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

  if (v.name === "\uc140\uce74\ubd09\ub7ec") {
    ctx.strokeStyle = "#d7d7d7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(16, -12);
    ctx.lineTo(39, -34);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.fillRect(34, -42, 17, 12);
  }

  if (v.name === "\ud0a5\ubcf4\ub4dc\ud3ed\uc8fc\uc871") {
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
  ctx.fillText(item.kind === "bell" ? "\ud83d\udd14" : "+", 0, 1);
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
    ctx.fillText("\ud55c\uac15 \uc790\uc804\uac70\uae38", w / 2, h * 0.6);
  }
}

function endGame() {
  game.over = true;
  game.running = false;
  overlay.hidden = false;
  overlayText.textContent = `${Math.floor(game.score)}m \uc8fc\ud589. \ub2e4\uc2dc \ub2ec\ub824\ubcfc\uae4c\uc694?`;
  startBtn.textContent = "\uc7ac\ucd9c\ubc1c";
}

function togglePause() {
  if (!game.running || game.over) return;
  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? ">" : "II";
  overlay.hidden = !game.paused;
  overlayText.textContent = "\uc7a0\uc2dc \uc26c\ub294 \uc911";
  startBtn.textContent = "\uacc4\uc18d";
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
    pauseBtn.textContent = "II";
    return;
  }
  resetGame();
});
pauseBtn.addEventListener("click", togglePause);
bellBtn.addEventListener("click", ringBell);

fitCanvas();
draw();
requestAnimationFrame(frame);

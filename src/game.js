const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const ui = {
  menu: document.getElementById("menuOverlay"),
  play: document.getElementById("playButton"),
  journalButton: document.getElementById("journalButton"),
  menuJournal: document.getElementById("openJournalFromMenu"),
  restart: document.getElementById("restartButton"),
  journal: document.getElementById("journalPanel"),
  closeJournal: document.getElementById("closeJournal"),
  tabs: [...document.querySelectorAll(".tabs button")],
  panels: [...document.querySelectorAll(".journal-content")],
  toast: document.getElementById("toast"),
  jokuHp: document.getElementById("jokuHp"),
  jokuMana: document.getElementById("jokuMana"),
  jolieHp: document.getElementById("jolieHp"),
  jolieMana: document.getElementById("jolieMana"),
  bondFill: document.getElementById("bondFill"),
  bondText: document.getElementById("bondText"),
  progressFill: document.getElementById("progressFill"),
  sceneName: document.getElementById("sceneName"),
  stickBase: document.getElementById("stickBase"),
  stickKnob: document.getElementById("stickKnob"),
  touchControls: document.getElementById("touchControls"),
  touchButtons: [...document.querySelectorAll("[data-action]")]
};

const world = {
  width: 2580,
  height: 760,
  gravity: 1850
};

const view = {
  x: 0,
  y: 0,
  width: 960,
  height: 540,
  scaleX: 1,
  scaleY: 1
};

const bg = new Image();
bg.src = "assets/enchanted-forest-bg.png";

const keys = new Set();
const justPressed = new Set();
const particles = [];
const projectiles = [];
const effects = [];
let platforms = [];
let enemies = [];
let orbs = [];
let hazards = [];
let lastTime = 0;
let elapsed = 0;
let state = "menu";
let activeHeroId = "joku";
let toastTimer = 0;
let flash = 0;

const mobile = {
  pointerId: null,
  x: 0,
  y: 0,
  jump: false,
  active: false
};

const bond = {
  value: 0,
  handTimer: 0,
  hugTimer: 0,
  kissTimer: 0,
  gateOpened: false
};

const scenes = [
  { at: 0, name: "Heartfall Grove" },
  { at: 0.34, name: "Mushroom Bridge" },
  { at: 0.67, name: "Orchid Falls" },
  { at: 0.9, name: "Moonlit Gate" }
];

const heroes = {
  joku: createHero({
    id: "joku",
    name: "Joku",
    role: "Host",
    x: 160,
    y: 510,
    colors: {
      coat: "#1c57a5",
      accent: "#6fe7ff",
      hair: "#071b38",
      skin: "#f3c9aa",
      glow: "#52d8ff",
      support: "#69bdf9"
    }
  }),
  jolie: createHero({
    id: "jolie",
    name: "Jolie",
    role: "Guest",
    x: 230,
    y: 510,
    colors: {
      coat: "#ef6cab",
      accent: "#ffd0e5",
      hair: "#6e392d",
      skin: "#f5cbb3",
      glow: "#ff8dc7",
      support: "#ff9ccc"
    }
  })
};

function createHero(config) {
  return {
    ...config,
    width: 38,
    height: 76,
    vx: 0,
    vy: 0,
    facing: 1,
    hp: 100,
    mana: 100,
    maxHp: 100,
    maxMana: 100,
    onGround: false,
    invulnerable: 0,
    shield: 0,
    castPose: 0,
    hurtPose: 0,
    romancePose: 0,
    cooldowns: {
      primary: 0,
      secondary: 0,
      support: 0,
      bond: 0
    },
    supporter: {
      x: config.x - 55,
      y: config.y + 34,
      bob: 0
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, window.innerWidth);
  const height = Math.max(360, window.innerHeight);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const aspect = width / height;
  view.height = clamp(960 / Math.max(aspect, 0.55), 540, 680);
  view.width = view.height * aspect;
  view.scaleX = canvas.width / view.width;
  view.scaleY = canvas.height / view.height;
}

function resetGame() {
  state = "playing";
  elapsed = 0;
  flash = 0;
  activeHeroId = "joku";
  bond.value = 10;
  bond.handTimer = 0;
  bond.hugTimer = 0;
  bond.kissTimer = 0;
  bond.gateOpened = false;
  projectiles.length = 0;
  particles.length = 0;
  effects.length = 0;
  hazards.length = 0;
  buildWorld();
  Object.assign(heroes.joku, createHero({
    id: "joku",
    name: "Joku",
    role: "Host",
    x: 160,
    y: 510,
    colors: heroes.joku.colors
  }));
  Object.assign(heroes.jolie, createHero({
    id: "jolie",
    name: "Jolie",
    role: "Guest",
    x: 230,
    y: 510,
    colors: heroes.jolie.colors
  }));
  ui.menu.classList.add("hidden");
  showToast("Heartfall Grove awakens.");
}

function buildWorld() {
  platforms = [
    { x: -80, y: 646, w: 650, h: 90, kind: "ground" },
    { x: 560, y: 676, w: 315, h: 72, kind: "bridge" },
    { x: 920, y: 600, w: 275, h: 62, kind: "mushroom" },
    { x: 1280, y: 548, w: 270, h: 58, kind: "mushroom" },
    { x: 1625, y: 514, w: 330, h: 62, kind: "moss" },
    { x: 2030, y: 602, w: 270, h: 68, kind: "mushroom" },
    { x: 2265, y: 648, w: 390, h: 96, kind: "gate" },
    { x: 690, y: 445, w: 185, h: 34, kind: "floater" },
    { x: 1515, y: 392, w: 210, h: 34, kind: "floater" }
  ];

  orbs = [
    ...makeOrbLine(420, 560, 5, 54, "water"),
    ...makeOrbLine(910, 520, 4, 62, "flower"),
    ...makeOrbLine(1290, 464, 4, 62, "water"),
    ...makeOrbLine(1660, 430, 5, 52, "flower"),
    ...makeOrbLine(2050, 526, 5, 48, "water"),
    { x: 2360, y: 552, r: 18, type: "heart", taken: false }
  ];

  enemies = [
    createEnemy("bramble", 720, 612),
    createEnemy("wisp", 1030, 510),
    createEnemy("bramble", 1350, 485),
    createEnemy("wisp", 1700, 430),
    createEnemy("bramble", 2030, 540),
    createEnemy("murkheart", 2380, 560)
  ];
}

function makeOrbLine(x, y, count, gap, type) {
  return Array.from({ length: count }, (_, index) => ({
    x: x + index * gap,
    y: y - Math.sin(index * 0.85) * 22,
    r: type === "heart" ? 18 : 13,
    type,
    taken: false,
    bob: rand(0, Math.PI * 2)
  }));
}

function createEnemy(type, x, y) {
  const data = {
    bramble: { hp: 52, r: 24, speed: 55, damage: 11, color: "#5d245d" },
    wisp: { hp: 38, r: 21, speed: 42, damage: 8, color: "#80367c" },
    murkheart: { hp: 240, r: 54, speed: 24, damage: 16, color: "#3d173f" }
  }[type];
  return {
    type,
    x,
    y,
    baseY: y,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: data.hp,
    maxHp: data.hp,
    r: data.r,
    speed: data.speed,
    damage: data.damage,
    color: data.color,
    hurt: 0,
    cooldown: rand(0.5, 2.5),
    alive: true,
    snared: 0
  };
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  toastTimer = 2.4;
}

function startLoop(time = 0) {
  lastTime = time;
  requestAnimationFrame(loop);
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  if (state === "playing") {
    update(dt);
  } else {
    updateAmbient(dt);
  }
  draw();
  updateUi();
  justPressed.clear();
  requestAnimationFrame(loop);
}

function update(dt) {
  elapsed += dt;
  toastTimer -= dt;
  if (toastTimer <= 0) ui.toast.classList.remove("show");
  flash = Math.max(0, flash - dt * 1.8);

  updateCooldowns(heroes.joku, dt);
  updateCooldowns(heroes.jolie, dt);
  updateBond(dt);
  updateHero(heroes.joku, dt, getHeroControl("joku"));
  updateHero(heroes.jolie, dt, getHeroControl("jolie"));
  updateSupporter(heroes.joku, dt);
  updateSupporter(heroes.jolie, dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateHazards(dt);
  updateParticles(dt);
  collectOrbs();
  updateCamera(dt);
  checkGate();
}

function updateAmbient(dt) {
  elapsed += dt;
  updateParticles(dt);
  if (Math.random() < dt * 5) {
    addParticle(rand(view.x, view.x + view.width), rand(80, 520), "#ff95cb", 1.3, {
      vx: rand(-18, 22),
      vy: rand(10, 32),
      size: rand(2, 5),
      shape: "petal"
    });
  }
}

function updateCooldowns(hero, dt) {
  for (const key of Object.keys(hero.cooldowns)) {
    hero.cooldowns[key] = Math.max(0, hero.cooldowns[key] - dt);
  }
  hero.invulnerable = Math.max(0, hero.invulnerable - dt);
  hero.shield = Math.max(0, hero.shield - dt);
  hero.castPose = Math.max(0, hero.castPose - dt);
  hero.hurtPose = Math.max(0, hero.hurtPose - dt);
  hero.romancePose = Math.max(0, hero.romancePose - dt);
  hero.mana = Math.min(hero.maxMana, hero.mana + dt * 9);
}

function getHeroControl(id) {
  const isJoku = id === "joku";
  const leftKey = isJoku ? "KeyA" : "ArrowLeft";
  const rightKey = isJoku ? "KeyD" : "ArrowRight";
  const jumpKey = isJoku ? "KeyW" : "ArrowUp";
  const primaryKey = isJoku ? "KeyF" : "KeyK";
  const secondaryKey = isJoku ? "KeyG" : "KeyL";
  const supportKey = isJoku ? "KeyH" : "KeyP";

  let x = 0;
  if (keys.has(leftKey)) x -= 1;
  if (keys.has(rightKey)) x += 1;

  const usingMobile = activeHeroId === id && mobile.active;
  if (usingMobile) x = mobile.x;

  const jump = justPressed.has(jumpKey) || (usingMobile && mobile.jump);
  const manual =
    x !== 0 ||
    keys.has(leftKey) ||
    keys.has(rightKey) ||
    keys.has(jumpKey) ||
    justPressed.has(primaryKey) ||
    justPressed.has(secondaryKey) ||
    justPressed.has(supportKey) ||
    usingMobile;

  return {
    x,
    jump,
    manual,
    primary: justPressed.has(primaryKey),
    secondary: justPressed.has(secondaryKey),
    support: justPressed.has(supportKey),
    bond: justPressed.has("KeyB") || justPressed.has("KeyQ")
  };
}

function updateHero(hero, dt, control) {
  const other = hero.id === "joku" ? heroes.jolie : heroes.joku;
  const speed = bond.handTimer > 0 ? 275 : 250;
  const accel = hero.onGround ? 16 : 8;
  let inputX = control.x;
  let wantsJump = control.jump;

  if (!control.manual && state === "playing") {
    const target = other.x - other.facing * 70;
    const dx = target - hero.x;
    if (Math.abs(dx) > 36) inputX = Math.sign(dx);
    if (other.y + 30 < hero.y && hero.onGround && Math.abs(dx) < 180) wantsJump = true;
    const nearest = nearestEnemy(hero, 340);
    if (nearest && hero.cooldowns.primary <= 0 && hero.mana > 24) {
      castSkill(hero, "primary");
    }
  }

  if (control.primary) castSkill(hero, "primary");
  if (control.secondary) castSkill(hero, "secondary");
  if (control.support) castSkill(hero, "support");
  if (control.bond) castBond();

  hero.vx += (inputX * speed - hero.vx) * Math.min(1, accel * dt);
  if (Math.abs(inputX) > 0.05) hero.facing = Math.sign(inputX);
  if (wantsJump && hero.onGround) {
    hero.vy = -690;
    hero.onGround = false;
    burst(hero.x, hero.y + hero.height / 2, hero.colors.glow, 12, 100);
  }

  hero.vy += world.gravity * dt;
  hero.x += hero.vx * dt;
  hero.y += hero.vy * dt;
  hero.onGround = false;

  for (const platform of platforms) {
    const half = hero.width / 2;
    const feet = hero.y + hero.height / 2;
    const prevFeet = feet - hero.vy * dt;
    const withinX = hero.x + half > platform.x && hero.x - half < platform.x + platform.w;
    if (withinX && prevFeet <= platform.y + 10 && feet >= platform.y && hero.vy >= 0) {
      hero.y = platform.y - hero.height / 2;
      hero.vy = 0;
      hero.onGround = true;
    }
  }

  hero.x = clamp(hero.x, 40, world.width - 40);
  if (hero.y > world.height + 160) {
    hero.hp = Math.max(1, hero.hp - 18);
    hero.x = Math.max(120, other.x - 70);
    hero.y = other.y - 90;
    hero.vx = 0;
    hero.vy = -160;
    hero.invulnerable = 1.6;
    showToast(`${hero.name} returns to the path.`);
  }
}

function updateSupporter(hero, dt) {
  const offset = hero.id === "joku" ? -54 : 54;
  const targetX = hero.x - hero.facing * offset;
  const targetY = hero.y + 22 + Math.sin(elapsed * 4 + (hero.id === "joku" ? 0 : 1.4)) * 8;
  hero.supporter.x += (targetX - hero.supporter.x) * Math.min(1, dt * 7);
  hero.supporter.y += (targetY - hero.supporter.y) * Math.min(1, dt * 7);
  hero.supporter.bob += dt * 6;
}

function updateBond(dt) {
  const d = distance(heroes.joku, heroes.jolie);
  if (d < 130) bond.value = Math.min(100, bond.value + dt * 4.8);
  if (bond.handTimer > 0) {
    bond.handTimer = Math.max(0, bond.handTimer - dt);
    bond.value = Math.min(100, bond.value + dt * 10);
    heroes.joku.shield = Math.max(heroes.joku.shield, 0.08);
    heroes.jolie.shield = Math.max(heroes.jolie.shield, 0.08);
  }
  bond.hugTimer = Math.max(0, bond.hugTimer - dt);
  bond.kissTimer = Math.max(0, bond.kissTimer - dt);
}

function castSkill(hero, type) {
  if (hero.cooldowns[type] > 0) return false;

  if (hero.id === "joku") {
    if (type === "primary") {
      if (!spend(hero, 14)) return false;
      hero.cooldowns.primary = 0.34;
      hero.castPose = 0.22;
      projectiles.push({
        x: hero.x + hero.facing * 30,
        y: hero.y - 8,
        vx: hero.facing * 630,
        vy: -20,
        r: 17,
        life: 0.85,
        damage: 28,
        owner: hero.id,
        type: "water"
      });
      spray(hero.x + hero.facing * 28, hero.y - 8, "#66e3ff", 10, hero.facing);
      return true;
    }
    if (type === "secondary") {
      if (!spend(hero, 30)) return false;
      hero.cooldowns.secondary = 2.2;
      hero.castPose = 0.4;
      hero.invulnerable = 0.46;
      hero.vx = hero.facing * 520;
      hero.vy = -360;
      effects.push({ type: "phoenix", x: hero.x, y: hero.y - 10, life: 0.54, max: 0.54, facing: hero.facing });
      areaDamage(hero.x + hero.facing * 60, hero.y, 84, 36, "phoenix");
      burst(hero.x, hero.y, "#60e7ff", 30, 220);
      return true;
    }
    if (type === "support") {
      if (!spend(hero, 24)) return false;
      hero.cooldowns.support = 3.6;
      hero.shield = 3.2;
      hero.castPose = 0.25;
      const target = nearestEnemy(hero, 520);
      const angle = target ? Math.atan2(target.y - hero.y, target.x - hero.x) : hero.facing > 0 ? 0 : Math.PI;
      projectiles.push({
        x: hero.supporter.x,
        y: hero.supporter.y - 18,
        vx: Math.cos(angle) * 520,
        vy: Math.sin(angle) * 520,
        r: 18,
        life: 1.1,
        damage: 22,
        owner: hero.id,
        type: "paw-blue"
      });
      showToast("Blue dog casts Azure Bark Guard.");
      burst(hero.supporter.x, hero.supporter.y, "#75c7ff", 18, 150);
      return true;
    }
  }

  if (type === "primary") {
    if (!spend(hero, 13)) return false;
    hero.cooldowns.primary = 0.42;
    hero.castPose = 0.28;
    for (let i = -1; i <= 1; i += 1) {
      projectiles.push({
        x: hero.x + hero.facing * 28,
        y: hero.y - 10,
        vx: hero.facing * (500 + Math.abs(i) * 40),
        vy: i * 95 - 20,
        r: 14,
        life: 0.92,
        damage: 22,
        owner: hero.id,
        type: "flower"
      });
    }
    burst(hero.x + hero.facing * 24, hero.y - 15, "#ff94ca", 12, 110);
    return true;
  }
  if (type === "secondary") {
    if (!spend(hero, 28)) return false;
    hero.cooldowns.secondary = 2.8;
    hero.castPose = 0.42;
    hazards.push({
      type: "vine",
      x: hero.x + hero.facing * 95,
      y: hero.y + 35,
      r: 90,
      life: 3.4,
      tick: 0
    });
    showToast("Jolie plants Vine Promise.");
    burst(hero.x + hero.facing * 80, hero.y + 24, "#ff9fce", 24, 160);
    return true;
  }
  if (type === "support") {
    if (!spend(hero, 30)) return false;
    hero.cooldowns.support = 4.4;
    hero.castPose = 0.28;
    heroes.joku.hp = Math.min(heroes.joku.maxHp, heroes.joku.hp + 20);
    heroes.jolie.hp = Math.min(heroes.jolie.maxHp, heroes.jolie.hp + 26);
    heroes.joku.shield = Math.max(heroes.joku.shield, 1.8);
    heroes.jolie.shield = Math.max(heroes.jolie.shield, 1.8);
    effects.push({ type: "heal", x: hero.supporter.x, y: hero.supporter.y, life: 1.2, max: 1.2 });
    showToast("Pink panda blooms Honeyheart healing.");
    return true;
  }
  return false;
}

function spend(hero, amount) {
  if (hero.mana < amount) {
    showToast(`${hero.name} needs more magic.`);
    return false;
  }
  hero.mana -= amount;
  return true;
}

function castBond() {
  const joku = heroes.joku;
  const jolie = heroes.jolie;
  if (joku.cooldowns.bond > 0 || jolie.cooldowns.bond > 0) return;
  if (distance(joku, jolie) > 118) {
    showToast("Move close for a bond skill.");
    return;
  }

  joku.cooldowns.bond = 1.2;
  jolie.cooldowns.bond = 1.2;
  if (bond.value >= 96) {
    bond.value = 40;
    bond.kissTimer = 1.5;
    joku.romancePose = 1.5;
    jolie.romancePose = 1.5;
    flash = 1;
    effects.push({ type: "heart-phoenix", x: (joku.x + jolie.x) / 2, y: (joku.y + jolie.y) / 2, life: 1.4, max: 1.4 });
    for (const enemy of enemies) {
      if (enemy.alive) damageEnemy(enemy, enemy.type === "murkheart" ? 135 : 999, "heart");
    }
    showToast("Heart Bloom Phoenix!");
    return;
  }

  if (bond.value >= 48 || joku.hp < 52 || jolie.hp < 52) {
    bond.value = Math.min(100, bond.value + 18);
    bond.hugTimer = 1.1;
    joku.romancePose = 1.1;
    jolie.romancePose = 1.1;
    joku.hp = Math.min(joku.maxHp, joku.hp + 24);
    jolie.hp = Math.min(jolie.maxHp, jolie.hp + 24);
    effects.push({ type: "hug", x: (joku.x + jolie.x) / 2, y: (joku.y + jolie.y) / 2, life: 1.1, max: 1.1 });
    showToast("Hug restores both hearts.");
    return;
  }

  bond.handTimer = 4.5;
  bond.value = Math.min(100, bond.value + 12);
  joku.romancePose = 0.8;
  jolie.romancePose = 0.8;
  showToast("Hold Hand creates a shared shield.");
}

function nearestEnemy(hero, range) {
  let best = null;
  let bestDistance = range;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const d = Math.hypot(enemy.x - hero.x, enemy.y - hero.y);
    if (d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function areaDamage(x, y, radius, damage, source) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const d = Math.hypot(enemy.x - x, enemy.y - y);
    if (d < radius + enemy.r) damageEnemy(enemy, damage, source);
  }
}

function damageEnemy(enemy, amount, source) {
  enemy.hp -= amount;
  enemy.hurt = 0.18;
  const color = source === "flower" ? "#ff8ec4" : source === "heart" ? "#ffe092" : "#68e7ff";
  burst(enemy.x, enemy.y, color, enemy.type === "murkheart" ? 28 : 14, 180);
  if (source === "vine") enemy.snared = Math.max(enemy.snared, 1.3);
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    bond.value = Math.min(100, bond.value + (enemy.type === "murkheart" ? 34 : 12));
    addDefeatLoot(enemy);
    showToast(enemy.type === "murkheart" ? "The Murkheart curse breaks." : "Shadow fades into petals.");
  }
}

function addDefeatLoot(enemy) {
  const type = enemy.type === "murkheart" ? "heart" : Math.random() > 0.5 ? "water" : "flower";
  const count = enemy.type === "murkheart" ? 8 : 3;
  for (let i = 0; i < count; i += 1) {
    orbs.push({
      x: enemy.x + rand(-28, 28),
      y: enemy.y + rand(-48, -16),
      r: type === "heart" ? 15 : 12,
      type,
      taken: false,
      bob: rand(0, 6)
    });
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.cooldown -= dt;
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.snared = Math.max(0, enemy.snared - dt);
    const target = distance(enemy, heroes.joku) < distance(enemy, heroes.jolie) ? heroes.joku : heroes.jolie;
    enemy.facing = target.x >= enemy.x ? 1 : -1;

    if (enemy.type === "wisp") {
      enemy.y = enemy.baseY + Math.sin(elapsed * 2 + enemy.x * 0.01) * 28;
      if (enemy.snared <= 0) enemy.x += Math.sin(elapsed * 0.8 + enemy.baseY) * enemy.speed * dt * 0.35;
      if (enemy.cooldown <= 0 && Math.abs(target.x - enemy.x) < 520) {
        enemy.cooldown = rand(2.0, 3.2);
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * 310,
          vy: Math.sin(angle) * 310,
          r: 10,
          life: 2.1,
          damage: enemy.damage,
          owner: "enemy",
          type: "thorn"
        });
      }
    } else {
      const move = enemy.snared > 0 ? 0 : enemy.facing * enemy.speed * dt;
      enemy.x += move;
      if (enemy.type === "murkheart" && enemy.cooldown <= 0) {
        enemy.cooldown = rand(2.6, 3.8);
        hazards.push({ type: "curse", x: target.x, y: target.y + 35, r: 78, life: 1.6, tick: 0 });
        showToast("Murkheart casts jealousy vines.");
      }
    }

    for (const hero of [heroes.joku, heroes.jolie]) {
      if (hero.invulnerable > 0) continue;
      const hitRange = enemy.r + hero.width * 0.45;
      if (Math.hypot(hero.x - enemy.x, hero.y - enemy.y) < hitRange) {
        hurtHero(hero, enemy.damage);
        const push = hero.x < enemy.x ? -1 : 1;
        hero.vx = push * 360;
        hero.vy = -180;
      }
    }
  }
}

function hurtHero(hero, amount) {
  const reduction = hero.shield > 0 || bond.handTimer > 0 ? 0.48 : 1;
  hero.hp = Math.max(0, hero.hp - amount * reduction);
  hero.invulnerable = 0.85;
  hero.hurtPose = 0.3;
  burst(hero.x, hero.y - 10, hero.colors.glow, 10, 120);
  if (hero.hp <= 0) {
    hero.hp = 45;
    hero.x = hero.id === "joku" ? heroes.jolie.x - 62 : heroes.joku.x + 62;
    hero.y = Math.min(heroes.joku.y, heroes.jolie.y) - 70;
    hero.vy = -220;
    bond.value = Math.max(0, bond.value - 18);
    showToast(`${hero.name} is revived by the bond.`);
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === "flower") p.vy += Math.sin(elapsed * 8 + p.x) * dt * 60;
    if (p.type === "water" || p.type === "paw-blue") addTrail(p);
    if (p.type === "flower") addParticle(p.x, p.y, "#ff96c9", 0.55, { size: rand(2, 4), shape: "petal" });

    if (p.owner === "enemy") {
      for (const hero of [heroes.joku, heroes.jolie]) {
        if (hero.invulnerable <= 0 && Math.hypot(hero.x - p.x, hero.y - p.y) < p.r + hero.width * 0.45) {
          hurtHero(hero, p.damage);
          p.life = 0;
        }
      }
    } else {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.r + p.r) {
          damageEnemy(enemy, p.damage, p.type.includes("flower") ? "flower" : "water");
          p.life = p.type === "flower" ? Math.min(p.life, 0.08) : 0;
          break;
        }
      }
    }

    if (p.life <= 0 || p.x < -100 || p.x > world.width + 100 || p.y > world.height + 120) {
      projectiles.splice(i, 1);
    }
  }
}

function updateHazards(dt) {
  for (let i = hazards.length - 1; i >= 0; i -= 1) {
    const h = hazards[i];
    h.life -= dt;
    h.tick -= dt;
    if (h.type === "vine") {
      if (h.tick <= 0) {
        h.tick = 0.34;
        areaDamage(h.x, h.y, h.r, 9, "vine");
      }
      for (let j = 0; j < 3; j += 1) {
        addParticle(h.x + rand(-h.r, h.r), h.y + rand(-20, 12), "#ff9fce", 0.6, {
          vx: rand(-10, 10),
          vy: rand(-35, -5),
          size: rand(2, 4),
          shape: "petal"
        });
      }
    } else {
      if (h.tick <= 0) {
        h.tick = 0.46;
        for (const hero of [heroes.joku, heroes.jolie]) {
          if (Math.hypot(hero.x - h.x, hero.y - h.y) < h.r && hero.invulnerable <= 0) hurtHero(hero, 8);
        }
      }
      addParticle(h.x + rand(-h.r, h.r), h.y + rand(-28, 8), "#9f4a9d", 0.75, {
        vx: rand(-12, 12),
        vy: rand(-42, -8),
        size: rand(2, 5)
      });
    }
    if (h.life <= 0) hazards.splice(i, 1);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity || 0) * dt;
    p.spin += dt * p.spinSpeed;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = effects.length - 1; i >= 0; i -= 1) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) effects.splice(i, 1);
  }

  if (state === "playing" && Math.random() < dt * 10) {
    addParticle(view.x + rand(-20, view.width + 20), view.y + rand(40, view.height - 80), "#ffa5cf", rand(1, 2.4), {
      vx: rand(-12, 26),
      vy: rand(8, 28),
      size: rand(2, 5),
      shape: "petal"
    });
  }
}

function collectOrbs() {
  for (const orb of orbs) {
    if (orb.taken) continue;
    const nearJoku = Math.hypot(orb.x - heroes.joku.x, orb.y - heroes.joku.y) < orb.r + 38;
    const nearJolie = Math.hypot(orb.x - heroes.jolie.x, orb.y - heroes.jolie.y) < orb.r + 38;
    if (nearJoku || nearJolie) {
      orb.taken = true;
      const color = orb.type === "flower" ? "#ff91c8" : orb.type === "heart" ? "#ffe285" : "#65dcff";
      burst(orb.x, orb.y, color, orb.type === "heart" ? 20 : 12, 130);
      if (orb.type === "water") heroes.joku.mana = Math.min(heroes.joku.maxMana, heroes.joku.mana + 22);
      if (orb.type === "flower") heroes.jolie.mana = Math.min(heroes.jolie.maxMana, heroes.jolie.mana + 22);
      if (orb.type === "heart") {
        bond.value = Math.min(100, bond.value + 20);
        heroes.joku.hp = Math.min(heroes.joku.maxHp, heroes.joku.hp + 12);
        heroes.jolie.hp = Math.min(heroes.jolie.maxHp, heroes.jolie.hp + 12);
      } else {
        bond.value = Math.min(100, bond.value + 4);
      }
    }
  }
}

function updateCamera(dt) {
  const center = (heroes.joku.x + heroes.jolie.x) / 2;
  const spread = Math.abs(heroes.joku.x - heroes.jolie.x);
  const targetX = clamp(center - view.width * 0.46 + spread * 0.08, 0, Math.max(0, world.width - view.width));
  const highHero = Math.min(heroes.joku.y, heroes.jolie.y);
  const targetY = clamp(highHero - view.height * 0.55, 0, Math.max(0, world.height - view.height));
  view.x += (targetX - view.x) * Math.min(1, dt * 4.2);
  view.y += (targetY - view.y) * Math.min(1, dt * 3.4);
}

function checkGate() {
  const boss = enemies.find((enemy) => enemy.type === "murkheart");
  const progress = getProgress();
  if (boss && !boss.alive && !bond.gateOpened) {
    bond.gateOpened = true;
    showToast("Moonlit Gate opens for Joku and Jolie.");
  }
  if (bond.gateOpened && progress > 0.95 && distance(heroes.joku, heroes.jolie) < 130) {
    state = "complete";
    bond.value = 100;
    ui.menu.classList.remove("hidden");
    ui.menu.querySelector(".kicker").textContent = "Moonlit Gate cleared";
    ui.menu.querySelector("h1").textContent = "Jolie Joku Adventure";
    ui.menu.querySelector("p").textContent =
      "The forest is healed. Joku and Jolie leave Heartfall Grove hand in hand with the blue dog and pink panda dancing beside them.";
    showToast("Adventure complete.");
  }
}

function getProgress() {
  const x = Math.max(heroes.joku.x, heroes.jolie.x);
  return clamp(x / (world.width - 220), 0, 1);
}

function draw() {
  ctx.setTransform(view.scaleX, 0, 0, view.scaleY, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  drawBackground();
  ctx.save();
  ctx.translate(-view.x, -view.y);
  drawWorldDetails();
  drawHazards();
  drawOrbs();
  drawProjectiles();
  drawEnemies();
  drawBondEffects();
  drawSupporter(heroes.joku);
  drawSupporter(heroes.jolie);
  drawHero(heroes.joku);
  drawHero(heroes.jolie);
  drawEffects();
  drawParticles();
  drawForeground();
  ctx.restore();
  if (flash > 0) {
    ctx.globalAlpha = flash * 0.24;
    ctx.fillStyle = "#fff3d4";
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.globalAlpha = 1;
  }
}

function drawBackground() {
  ctx.save();
  ctx.fillStyle = "#082533";
  ctx.fillRect(0, 0, view.width, view.height);
  if (bg.complete && bg.naturalWidth) {
    const parallaxX = -view.x * 0.28;
    const parallaxY = -view.y * 0.12;
    const bgW = Math.max(world.width * 0.72, view.width + 200);
    const bgH = world.height;
    ctx.globalAlpha = 0.96;
    ctx.drawImage(bg, parallaxX, parallaxY, bgW, bgH);
    ctx.drawImage(bg, parallaxX + bgW - 2, parallaxY, bgW, bgH);
    ctx.globalAlpha = 1;
  }

  const sky = ctx.createLinearGradient(0, 0, 0, view.height);
  sky.addColorStop(0, "rgba(48, 184, 255, 0.12)");
  sky.addColorStop(0.55, "rgba(14, 76, 91, 0.02)");
  sky.addColorStop(1, "rgba(0, 8, 12, 0.35)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.restore();
}

function drawWorldDetails() {
  drawMoonGate();
  for (const platform of platforms) drawPlatform(platform);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#7ff0ff";
  for (let i = 0; i < 6; i += 1) {
    const x = 360 + i * 370;
    const y = 676 + Math.sin(elapsed + i) * 3;
    ctx.beginPath();
    ctx.ellipse(x, y, 110, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatform(p) {
  ctx.save();
  const radius = p.kind === "mushroom" ? 28 : 18;
  roundedRect(p.x, p.y, p.w, p.h, radius);
  const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  grad.addColorStop(0, p.kind === "mushroom" ? "#d97843" : "#3b8050");
  grad.addColorStop(0.18, p.kind === "mushroom" ? "#f0a066" : "#72c56d");
  grad.addColorStop(0.22, "#263f32");
  grad.addColorStop(1, "#1a2525");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = p.kind === "mushroom" ? "rgba(255, 239, 196, 0.48)" : "rgba(191, 255, 183, 0.55)";
  for (let i = 0; i < p.w; i += 42) {
    ctx.beginPath();
    ctx.ellipse(p.x + i + 18, p.y + 10 + Math.sin(i) * 3, rand(10, 18), rand(3, 6), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (p.kind === "floater") {
    ctx.strokeStyle = "rgba(131, 255, 218, 0.34)";
    ctx.lineWidth = 2;
    for (let i = 20; i < p.w; i += 36) {
      ctx.beginPath();
      ctx.moveTo(p.x + i, p.y + p.h - 2);
      ctx.bezierCurveTo(p.x + i - 8, p.y + p.h + 20, p.x + i + 14, p.y + p.h + 34, p.x + i, p.y + p.h + 54);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawMoonGate() {
  const x = 2420;
  const y = 558;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = bond.gateOpened ? 1 : 0.7;
  ctx.strokeStyle = bond.gateOpened ? "#ffe49b" : "#75dfff";
  ctx.lineWidth = 8;
  ctx.shadowBlur = bond.gateOpened ? 32 : 16;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(-62, 86);
  ctx.bezierCurveTo(-72, -30, -34, -98, 0, -48);
  ctx.bezierCurveTo(34, -98, 72, -30, 62, 86);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(0, 36 - i * 24, 24 + i * 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrbs() {
  for (const orb of orbs) {
    if (orb.taken) continue;
    const y = orb.y + Math.sin(elapsed * 3 + orb.bob) * 7;
    const color = orb.type === "flower" ? "#ff90c6" : orb.type === "heart" ? "#ffe08b" : "#68dbff";
    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    if (orb.type === "heart") {
      drawHeartPath(orb.x, y, orb.r);
    } else {
      ctx.arc(orb.x, y, orb.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    ctx.save();
    if (p.type === "water") {
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.shadowBlur = 22;
      ctx.shadowColor = "#61e5ff";
      ctx.fillStyle = "#78eaff";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, 0, p.r * 0.9, -0.9, 1.2);
      ctx.stroke();
    } else if (p.type === "flower") {
      ctx.translate(p.x, p.y);
      ctx.rotate(elapsed * 8);
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ff8ec4";
      for (let i = 0; i < 5; i += 1) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.fillStyle = i % 2 ? "#ffd1e5" : "#ff7cba";
        ctx.beginPath();
        ctx.ellipse(0, -p.r * 0.52, p.r * 0.34, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff5a2";
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "paw-blue") {
      drawPaw(p.x, p.y, p.r, "#8fe9ff");
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#b64aa0";
      ctx.fillStyle = "#a64491";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.r);
      ctx.lineTo(p.x + p.r * 0.55, p.y + p.r);
      ctx.lineTo(p.x - p.r * 0.55, p.y + p.r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawHazards() {
  for (const h of hazards) {
    ctx.save();
    const a = clamp(h.life, 0, 1);
    if (h.type === "vine") {
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = "#ff8fc4";
      ctx.strokeStyle = "#78e09c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.r, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 9; i += 1) {
        const angle = (i / 9) * Math.PI * 2 + elapsed;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y + 4);
        ctx.quadraticCurveTo(
          h.x + Math.cos(angle) * h.r * 0.4,
          h.y - 42,
          h.x + Math.cos(angle) * h.r,
          h.y + Math.sin(angle) * 18
        );
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.42 * a;
      ctx.fillStyle = "#773077";
      ctx.strokeStyle = "#d458ad";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.r, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(enemy.facing, 1);
    ctx.globalAlpha = enemy.hurt > 0 ? 0.72 : 1;
    ctx.shadowBlur = enemy.type === "murkheart" ? 28 : 15;
    ctx.shadowColor = "#a54092";

    if (enemy.type === "wisp") {
      ctx.fillStyle = "#3c1946";
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.r * 1.05, enemy.r * 1.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff5baf";
      ctx.beginPath();
      ctx.ellipse(-8, -2, 4, 8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(8, -2, 4, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#9c4a9d";
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 8, enemy.r * 0.8);
        ctx.quadraticCurveTo(i * 14, enemy.r * 1.6, i * 5, enemy.r * 2.1);
        ctx.stroke();
      }
    } else if (enemy.type === "murkheart") {
      ctx.fillStyle = "#321232";
      ctx.beginPath();
      drawHeartPath(0, -2, enemy.r * 1.08);
      ctx.fill();
      ctx.strokeStyle = "#ff5ba8";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = "#1d071f";
      ctx.lineWidth = 6;
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 26, Math.sin(angle) * 18);
        ctx.lineTo(Math.cos(angle) * 76, Math.sin(angle) * 48);
        ctx.stroke();
      }
      ctx.fillStyle = "#ff6bbb";
      ctx.beginPath();
      ctx.arc(-15, -8, 7, 0, Math.PI * 2);
      ctx.arc(15, -8, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#35153b";
      ctx.beginPath();
      ctx.ellipse(0, 4, enemy.r * 1.2, enemy.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a071d";
      ctx.lineWidth = 5;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 8, 8);
        ctx.quadraticCurveTo(i * 18, 24, i * 30, 9);
        ctx.stroke();
      }
      ctx.fillStyle = "#ff617a";
      ctx.beginPath();
      ctx.arc(-9, -4, 4, 0, Math.PI * 2);
      ctx.arc(9, -4, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    drawEnemyHealth(enemy);
    ctx.restore();
  }
}

function drawEnemyHealth(enemy) {
  const w = enemy.type === "murkheart" ? 92 : 46;
  const y = -enemy.r - 18;
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  roundedRect(-w / 2, y, w, 7, 4);
  ctx.fill();
  ctx.fillStyle = enemy.type === "murkheart" ? "#ff70af" : "#ff6678";
  roundedRect(-w / 2, y, w * clamp(enemy.hp / enemy.maxHp, 0, 1), 7, 4);
  ctx.fill();
}

function drawBondEffects() {
  const joku = heroes.joku;
  const jolie = heroes.jolie;
  if (bond.handTimer > 0 || distance(joku, jolie) < 120) {
    const alpha = bond.handTimer > 0 ? 0.9 : 0.24;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = bond.handTimer > 0 ? "#ffe7a0" : "#ffaad4";
    ctx.lineWidth = bond.handTimer > 0 ? 5 : 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(joku.x + 14 * joku.facing, joku.y - 8);
    ctx.bezierCurveTo(
      (joku.x + jolie.x) / 2,
      Math.min(joku.y, jolie.y) - 62,
      (joku.x + jolie.x) / 2,
      Math.min(joku.y, jolie.y) - 62,
      jolie.x + 14 * jolie.facing,
      jolie.y - 8
    );
    ctx.stroke();
    ctx.restore();
  }
}

function drawHero(hero) {
  const t = elapsed * 8;
  const walk = Math.sin(t + hero.x * 0.04) * Math.min(1, Math.abs(hero.vx) / 160);
  ctx.save();
  ctx.translate(hero.x, hero.y);
  ctx.scale(hero.facing, 1);
  if (hero.invulnerable > 0 && Math.floor(elapsed * 18) % 2 === 0) ctx.globalAlpha = 0.62;

  if (hero.id === "joku") drawJoku(hero, walk);
  else drawJolie(hero, walk);

  if (hero.shield > 0) {
    ctx.globalAlpha = 0.36 + Math.sin(elapsed * 12) * 0.08;
    ctx.strokeStyle = hero.id === "joku" ? "#7de8ff" : "#ffaad4";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.ellipse(0, -10, 42, 58, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawJoku(hero, walk) {
  const colors = hero.colors;
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = colors.glow;
  drawPhoenixWings(hero);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#1b1721";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 18);
  ctx.lineTo(-15 + walk * 5, 38);
  ctx.moveTo(10, 18);
  ctx.lineTo(15 - walk * 5, 38);
  ctx.stroke();

  ctx.fillStyle = colors.coat;
  roundedRect(-18, -28, 36, 52, 10);
  ctx.fill();
  ctx.fillStyle = "#f7fbff";
  ctx.beginPath();
  ctx.moveTo(-8, -26);
  ctx.lineTo(9, -26);
  ctx.lineTo(2, 16);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffd36c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-17, -8);
  ctx.lineTo(16, -12);
  ctx.moveTo(-13, 6);
  ctx.lineTo(11, 4);
  ctx.stroke();

  drawArm(-16, -12, -31, 4 + walk * 6, colors.skin, colors.coat);
  drawArm(16, -12, 31, 0 - walk * 5, colors.skin, colors.coat);
  drawHead(colors.skin, colors.hair, colors.accent, "joku");
  ctx.restore();
}

function drawPhoenixWings(hero) {
  const flap = Math.sin(elapsed * 5) * 5 + (hero.castPose > 0 ? 8 : 0);
  ctx.save();
  ctx.globalAlpha = 0.84;
  ctx.fillStyle = "#6fe7ff";
  ctx.strokeStyle = "#d8f8ff";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let i = 0; i < 7; i += 1) {
      ctx.beginPath();
      const length = 54 + i * 8;
      const y = -22 + i * 8 + flap * 0.28;
      ctx.moveTo(4, -20);
      ctx.quadraticCurveTo(-36 - i * 9, y - 36 - flap, -length, y);
      ctx.quadraticCurveTo(-34 - i * 8, y + 8, 0, -4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawJolie(hero, walk) {
  const colors = hero.colors;
  ctx.save();
  ctx.shadowBlur = 16;
  ctx.shadowColor = colors.glow;
  drawPetalAura(hero);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#3a2430";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, 18);
  ctx.lineTo(-13 + walk * 5, 39);
  ctx.moveTo(9, 18);
  ctx.lineTo(13 - walk * 5, 39);
  ctx.stroke();

  ctx.fillStyle = colors.coat;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(24, 20);
  ctx.quadraticCurveTo(0, 34, -24, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.moveTo(-13, -24);
  ctx.lineTo(13, -24);
  ctx.lineTo(6, 10);
  ctx.lineTo(-7, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff2a7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -8, 13, 0.1, Math.PI - 0.1);
  ctx.stroke();

  drawArm(-16, -12, -30, 0 + walk * 4, colors.skin, colors.coat);
  drawArm(16, -12, 31, 5 - walk * 6, colors.skin, colors.coat);
  drawHead(colors.skin, colors.hair, colors.accent, "jolie");
  ctx.restore();
}

function drawPetalAura(hero) {
  ctx.save();
  for (let i = 0; i < 7; i += 1) {
    const angle = elapsed * 1.4 + i * 0.9;
    const x = Math.cos(angle) * (34 + Math.sin(elapsed + i) * 5);
    const y = -12 + Math.sin(angle) * 48;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.56;
    ctx.fillStyle = i % 2 ? "#ffd0e5" : "#ff80bd";
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawArm(sx, sy, ex, ey, skin, sleeve) {
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo((sx + ex) / 2, sy + 12, ex, ey);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(ex, ey, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(skin, hair, accent, heroId) {
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -50, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hair;
  ctx.beginPath();
  if (heroId === "joku") {
    ctx.moveTo(-18, -53);
    ctx.quadraticCurveTo(-8, -76, 5, -65);
    ctx.quadraticCurveTo(20, -71, 19, -48);
    ctx.quadraticCurveTo(7, -60, -4, -52);
    ctx.quadraticCurveTo(-10, -60, -18, -53);
  } else {
    ctx.moveTo(-18, -56);
    ctx.quadraticCurveTo(-4, -76, 15, -60);
    ctx.quadraticCurveTo(24, -42, 14, -29);
    ctx.quadraticCurveTo(0, -38, -15, -30);
    ctx.quadraticCurveTo(-24, -42, -18, -56);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#13202a";
  ctx.beginPath();
  ctx.arc(-6, -51, 2, 0, Math.PI * 2);
  ctx.arc(7, -51, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8c5b4f";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(1, -46, 5, 0.15, Math.PI - 0.15);
  ctx.stroke();

  if (heroId === "jolie") {
    drawSmallFlower(14, -66, 6, accent);
  } else {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-16, -61);
    ctx.lineTo(-3, -70);
    ctx.lineTo(-8, -55);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSmallFlower(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i += 1) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.6, r * 0.38, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff0a4";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSupporter(hero) {
  if (hero.id === "joku") drawBlueDog(hero.supporter.x, hero.supporter.y, hero.facing, hero.colors.support);
  else drawPinkPanda(hero.supporter.x, hero.supporter.y, hero.facing, hero.colors.support);
}

function drawBlueDog(x, y, facing, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  const bob = Math.sin(elapsed * 8) * 3;
  ctx.translate(0, bob);
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(21, -8, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e7fbff";
  ctx.beginPath();
  ctx.moveTo(14, -19);
  ctx.lineTo(9, -35);
  ctx.lineTo(27, -21);
  ctx.closePath();
  ctx.moveTo(28, -18);
  ctx.lineTo(41, -30);
  ctx.lineTo(39, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-22, -1);
  ctx.quadraticCurveTo(-38, -18, -28, -28);
  ctx.stroke();
  ctx.fillStyle = "#061a24";
  ctx.beginPath();
  ctx.arc(25, -10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(30, -4, 5, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawPinkPanda(x, y, facing, color) {
  ctx.save();
  ctx.translate(x, y + Math.sin(elapsed * 7 + 1) * 3);
  ctx.scale(facing, 1);
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.fillStyle = "#ffd8e8";
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, -17, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(8, -30, 7, 0, Math.PI * 2);
  ctx.arc(28, -30, 7, 0, Math.PI * 2);
  ctx.arc(12, -18, 5, 0, Math.PI * 2);
  ctx.arc(24, -18, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#301622";
  ctx.beginPath();
  ctx.arc(14, -18, 2, 0, Math.PI * 2);
  ctx.arc(25, -18, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#301622";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(20, -12, 5, 0.1, Math.PI - 0.1);
  ctx.stroke();
  drawSmallFlower(-9, -2, 5, "#ff89c2");
  ctx.restore();
}

function drawEffects() {
  for (const effect of effects) {
    const age = 1 - effect.life / effect.max;
    ctx.save();
    ctx.globalAlpha = clamp(effect.life / effect.max, 0, 1);
    if (effect.type === "phoenix") {
      ctx.translate(effect.x, effect.y);
      ctx.scale(effect.facing, 1);
      ctx.shadowBlur = 36;
      ctx.shadowColor = "#64e8ff";
      ctx.fillStyle = "#7deeff";
      ctx.beginPath();
      ctx.moveTo(-40 + age * 120, 0);
      ctx.quadraticCurveTo(25 + age * 80, -80, 120 + age * 80, -18);
      ctx.quadraticCurveTo(40 + age * 80, 18, -40 + age * 120, 0);
      ctx.fill();
    } else if (effect.type === "heal" || effect.type === "hug") {
      const color = effect.type === "heal" ? "#ffafd5" : "#ffe098";
      ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 24;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(0, 0, 40 + age * 70, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = i * 0.78 + elapsed;
        drawSmallFlower(Math.cos(a) * (35 + age * 50), Math.sin(a) * (20 + age * 32), 5, color);
      }
    } else if (effect.type === "heart-phoenix") {
      ctx.translate(effect.x, effect.y);
      ctx.scale(1 + age * 3.3, 1 + age * 2.2);
      ctx.shadowBlur = 36;
      ctx.shadowColor = "#ffe19a";
      const grad = ctx.createLinearGradient(-80, -60, 120, 60);
      grad.addColorStop(0, "#55ddff");
      grad.addColorStop(0.48, "#ffe59a");
      grad.addColorStop(1, "#ff80bd");
      ctx.fillStyle = grad;
      ctx.beginPath();
      drawHeartPath(0, -4, 36);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = p.glow || 0;
    ctx.shadowColor = p.color;
    if (p.shape === "petal") {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.62, p.size * 1.55, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawForeground() {
  ctx.save();
  ctx.globalAlpha = 0.52;
  ctx.fillStyle = "#031219";
  for (let i = 0; i < 12; i += 1) {
    const x = view.x + ((i * 190 - view.x * 0.4) % (view.width + 260)) - 100;
    const h = 60 + Math.sin(i * 2.1) * 25;
    ctx.beginPath();
    ctx.moveTo(x, world.height);
    ctx.quadraticCurveTo(x + 20, world.height - h, x + 42, world.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawHeartPath(x, y, r) {
  ctx.moveTo(x, y + r * 0.45);
  ctx.bezierCurveTo(x - r * 1.15, y - r * 0.28, x - r * 0.55, y - r * 1.2, x, y - r * 0.54);
  ctx.bezierCurveTo(x + r * 0.55, y - r * 1.2, x + r * 1.15, y - r * 0.28, x, y + r * 0.45);
}

function drawPaw(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 5, r * 0.55, 0, Math.PI * 2);
  ctx.arc(-r * 0.62, -r * 0.28, r * 0.27, 0, Math.PI * 2);
  ctx.arc(0, -r * 0.48, r * 0.3, 0, Math.PI * 2);
  ctx.arc(r * 0.62, -r * 0.28, r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function addTrail(p) {
  addParticle(p.x - p.vx * 0.012, p.y - p.vy * 0.012, p.type === "paw-blue" ? "#aeefff" : "#78eaff", 0.35, {
    vx: rand(-18, 18),
    vy: rand(-18, 18),
    size: rand(2, 5),
    glow: 8
  });
}

function burst(x, y, color, count, force) {
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(force * 0.25, force);
    addParticle(x, y, color, rand(0.45, 0.95), {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: rand(2, 6),
      gravity: rand(20, 80),
      glow: 12,
      shape: Math.random() > 0.5 ? "petal" : "spark"
    });
  }
}

function spray(x, y, color, count, facing) {
  for (let i = 0; i < count; i += 1) {
    addParticle(x, y, color, rand(0.3, 0.7), {
      vx: facing * rand(70, 240),
      vy: rand(-90, 70),
      size: rand(2, 5),
      gravity: 60,
      glow: 8
    });
  }
}

function addParticle(x, y, color, life, options = {}) {
  particles.push({
    x,
    y,
    vx: options.vx || 0,
    vy: options.vy || 0,
    life,
    maxLife: life,
    color,
    size: options.size || 3,
    gravity: options.gravity || 0,
    glow: options.glow || 0,
    shape: options.shape || "spark",
    spin: rand(0, Math.PI * 2),
    spinSpeed: rand(-4, 4)
  });
}

function updateUi() {
  ui.jokuHp.style.width = `${clamp(heroes.joku.hp / heroes.joku.maxHp, 0, 1) * 100}%`;
  ui.jokuMana.style.width = `${clamp(heroes.joku.mana / heroes.joku.maxMana, 0, 1) * 100}%`;
  ui.jolieHp.style.width = `${clamp(heroes.jolie.hp / heroes.jolie.maxHp, 0, 1) * 100}%`;
  ui.jolieMana.style.width = `${clamp(heroes.jolie.mana / heroes.jolie.maxMana, 0, 1) * 100}%`;
  ui.bondFill.style.width = `${bond.value}%`;
  ui.bondText.textContent = `${Math.round(bond.value)}%`;
  const progress = getProgress();
  ui.progressFill.style.width = `${progress * 100}%`;
  const scene = [...scenes].reverse().find((item) => progress >= item.at);
  ui.sceneName.textContent = scene?.name || scenes[0].name;

  for (const button of ui.touchButtons) {
    const action = button.dataset.action;
    if (action === "skill1" || action === "skill2" || action === "support") {
      button.classList.toggle("flower", activeHeroId === "jolie" && action !== "support");
      button.classList.toggle("water", activeHeroId === "joku" && action !== "support");
    }
  }
}

function setupEvents() {
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    if (!keys.has(event.code)) justPressed.add(event.code);
    keys.add(event.code);
    if (event.code === "Enter" && state !== "playing") resetGame();
    if (event.code === "Tab") {
      event.preventDefault();
      activeHeroId = activeHeroId === "joku" ? "jolie" : "joku";
      showToast(`${activeHeroId === "joku" ? "Joku" : "Jolie"} leads.`);
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  ui.play.addEventListener("click", resetGame);
  ui.restart.addEventListener("click", resetGame);
  ui.journalButton.addEventListener("click", openJournal);
  ui.menuJournal.addEventListener("click", openJournal);
  ui.closeJournal.addEventListener("click", closeJournal);

  for (const tab of ui.tabs) {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  }

  for (const button of ui.touchButtons) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handleTouchAction(button.dataset.action);
    });
  }

  setupJoystick();
}

function isGameKey(code) {
  return [
    "KeyA",
    "KeyD",
    "KeyW",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyK",
    "KeyL",
    "KeyP",
    "KeyQ",
    "KeyB",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "Tab",
    "Space",
    "Enter"
  ].includes(code);
}

function handleTouchAction(action) {
  if (state !== "playing" && action !== "switch") resetGame();
  if (action === "switch") {
    activeHeroId = activeHeroId === "joku" ? "jolie" : "joku";
    showToast(`${activeHeroId === "joku" ? "Joku" : "Jolie"} leads.`);
    return;
  }
  const hero = heroes[activeHeroId];
  if (action === "skill1") castSkill(hero, "primary");
  if (action === "skill2") castSkill(hero, "secondary");
  if (action === "support") castSkill(hero, "support");
  if (action === "bond") castBond();
}

function setupJoystick() {
  const base = ui.stickBase;
  const knob = ui.stickKnob;
  const resetStick = () => {
    mobile.pointerId = null;
    mobile.x = 0;
    mobile.y = 0;
    mobile.jump = false;
    mobile.active = false;
    knob.style.transform = "translate(-50%, -50%)";
  };
  base.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state !== "playing") resetGame();
    mobile.pointerId = event.pointerId;
    mobile.active = true;
    base.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  base.addEventListener("pointermove", (event) => {
    if (event.pointerId === mobile.pointerId) updateStick(event);
  });
  base.addEventListener("pointerup", resetStick);
  base.addEventListener("pointercancel", resetStick);

  function updateStick(event) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const max = rect.width * 0.33;
    const mag = Math.hypot(dx, dy);
    const scale = mag > max ? max / mag : 1;
    const kx = dx * scale;
    const ky = dy * scale;
    mobile.x = clamp(dx / max, -1, 1);
    mobile.y = clamp(dy / max, -1, 1);
    mobile.jump = mobile.y < -0.48;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  }
}

function openJournal() {
  ui.journal.classList.add("open");
  ui.journal.setAttribute("aria-hidden", "false");
}

function closeJournal() {
  ui.journal.classList.remove("open");
  ui.journal.setAttribute("aria-hidden", "true");
}

function setTab(tabName) {
  for (const tab of ui.tabs) tab.classList.toggle("active", tab.dataset.tab === tabName);
  for (const panel of ui.panels) panel.classList.toggle("active", panel.dataset.panel === tabName);
}

resize();
buildWorld();
setupEvents();
startLoop();

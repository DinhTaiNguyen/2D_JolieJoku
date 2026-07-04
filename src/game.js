const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const ui = {
  menu: document.getElementById("menuOverlay"),
  mapOverlay: document.getElementById("mapOverlay"),
  hostButton: document.getElementById("hostButton"),
  joinButton: document.getElementById("joinButton"),
  offlineButton: document.getElementById("playOfflineButton"),
  roomCode: document.getElementById("roomCodeInput"),
  lobbyStatus: document.getElementById("lobbyStatus"),
  mapGrid: document.getElementById("mapGrid"),
  playerStatus: document.getElementById("playerStatus"),
  roomBadge: document.getElementById("roomBadge"),
  inviteHelp: document.getElementById("inviteHelp"),
  startMap: document.getElementById("startSelectedMapButton"),
  backToLobby: document.getElementById("backToLobbyButton"),
  musicButton: document.getElementById("musicButton"),
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
  roleBadge: document.getElementById("roleBadge"),
  bossHud: document.getElementById("bossHud"),
  bossName: document.getElementById("bossName"),
  bossHp: document.getElementById("bossHp"),
  chapterBanner: document.getElementById("chapterBanner"),
  chapterKicker: document.getElementById("chapterKicker"),
  chapterTitle: document.getElementById("chapterTitle"),
  chapterSubtitle: document.getElementById("chapterSubtitle"),
  stickBase: document.getElementById("stickBase"),
  stickKnob: document.getElementById("stickKnob"),
  touchButtons: [...document.querySelectorAll("[data-action]")]
};

const bg = new Image();
bg.src = "assets/enchanted-forest-bg.png";

const world = { width: 3600, height: 790, gravity: 1850 };
const view = { x: 0, y: 0, width: 960, height: 540, scaleX: 1, scaleY: 1 };
const keys = new Set();
const justPressed = new Set();
const particles = [];
let projectiles = [];
const effects = [];
let platforms = [];
let enemies = [];
let orbs = [];
let hazards = [];
let lastTime = 0;
let elapsed = 0;
let state = "menu";
let selectedMapId = "heartfall";
let currentMapId = "heartfall";
let activeHeroId = "joku";
let toastTimer = 0;
let chapterBannerTimer = 0;
let bossBannerKey = "";
let flash = 0;
let entitySeed = 1;

const mobile = { pointerId: null, x: 0, y: 0, jump: false, active: false };
const queuedActions = { primary: false, secondary: false, support: false, bond: false };
const bond = { value: 0, handTimer: 0, hugTimer: 0, kissTimer: 0, gateOpened: false };

const MAPS = [
  {
    id: "heartfall",
    name: "Heartfall Grove",
    subtitle: "Waterfalls, giant mushrooms, and the first promise.",
    monsters: "Shadow Bramble, Thorn Wisp, Murkheart",
    bossIntro: "Murkheart roots the waterfall bridge and throws thorn curse fields.",
    gradient: "linear-gradient(145deg, #0d5e78, #3f9d78 46%, #ff8fbd)",
    tint: "rgba(57, 207, 238, 0.16)",
    accent: "#67e4ff",
    bloom: "#ff94cb",
    ground: "#74c56d",
    cap: "#f0a066",
    width: 3850,
    musicRoot: 261.63,
    stages: ["Heartfall Grove", "Mushroom Bridge", "Orchid Falls", "Moonlit Gate"],
    waves: [
      ["bramble", 690, 612],
      ["wisp", 980, 505],
      ["bramble", 1340, 545],
      ["wisp", 1700, 438],
      ["bramble", 2200, 596],
      ["murkheart", 3460, 558]
    ]
  },
  {
    id: "lotus",
    name: "Lotus Lantern Marsh",
    subtitle: "Soft lantern water, lily bridges, and tricky jumping imps.",
    monsters: "Lantern Imp, Glassfin Serpent, Lotus Queen",
    bossIntro: "The Lotus Queen turns lantern light into sweeping marsh curses.",
    gradient: "linear-gradient(145deg, #104b5b, #41a89f 44%, #ffd36c)",
    tint: "rgba(255, 211, 108, 0.15)",
    accent: "#80ffe0",
    bloom: "#ffd36c",
    ground: "#68d68f",
    cap: "#ffd36c",
    width: 4200,
    musicRoot: 293.66,
    stages: ["Lantern Bank", "Lily Path", "Glassfin Pool", "Lotus Queen"],
    waves: [
      ["lanternImp", 620, 515],
      ["glassfin", 980, 620],
      ["lanternImp", 1390, 430],
      ["glassfin", 1880, 570],
      ["bramble", 2460, 606],
      ["lotusQueen", 3770, 560]
    ]
  },
  {
    id: "crystal",
    name: "Crystal Tide Ruins",
    subtitle: "Ancient blue ruins where reflections try to separate them.",
    monsters: "Crystal Knight, Mirror Wisp, Tide Golem",
    bossIntro: "The Tide Golem guards the vault with heavy crystal waves.",
    gradient: "linear-gradient(145deg, #183c7a, #42c7d8 48%, #8e9cff)",
    tint: "rgba(117, 164, 255, 0.18)",
    accent: "#9bf4ff",
    bloom: "#b3a2ff",
    ground: "#5fc0c7",
    cap: "#8e9cff",
    width: 4550,
    musicRoot: 329.63,
    stages: ["Blue Ruins", "Mirror Steps", "Tide Vault", "Golem Door"],
    waves: [
      ["crystalKnight", 740, 604],
      ["mirrorWisp", 1180, 460],
      ["crystalKnight", 1680, 520],
      ["mirrorWisp", 2310, 430],
      ["glassfin", 3000, 600],
      ["tideGolem", 4120, 558]
    ]
  },
  {
    id: "aurora",
    name: "Aurora Petal Peaks",
    subtitle: "Floating highlands, aurora moths, and wind-swept petals.",
    monsters: "Aurora Moth, Starshade, Thorn Knight",
    bossIntro: "Sky Warden dives through aurora wind and punishes lonely heroes.",
    gradient: "linear-gradient(145deg, #243468, #44b6a8 44%, #ff9fd2)",
    tint: "rgba(255, 159, 210, 0.18)",
    accent: "#a7fff1",
    bloom: "#ff9fd2",
    ground: "#8bd375",
    cap: "#ff9fd2",
    width: 4700,
    musicRoot: 349.23,
    stages: ["Aurora Rise", "Petal Wind", "Starshade Nest", "Sky Kiss"],
    waves: [
      ["auroraMoth", 700, 480],
      ["starshade", 1090, 610],
      ["auroraMoth", 1650, 410],
      ["thornKnight", 2260, 596],
      ["starshade", 3180, 530],
      ["skyWarden", 4310, 548]
    ]
  },
  {
    id: "eternal",
    name: "Eternal Heart Gate",
    subtitle: "The final long road where every bond skill matters.",
    monsters: "Gatekeeper, Eternal Wisp, Heart Eclipse",
    bossIntro: "Heart Eclipse is the final vow-breaker. Stay close and spend bond wisely.",
    gradient: "linear-gradient(145deg, #13273f, #2f8ab5 42%, #ff6fae)",
    tint: "rgba(255, 111, 174, 0.22)",
    accent: "#7deeff",
    bloom: "#ffe59a",
    ground: "#63d2a0",
    cap: "#ff8dbd",
    width: 5050,
    musicRoot: 392.0,
    stages: ["Promise Road", "Twin Falls", "Eclipse Bridge", "Eternal Gate"],
    waves: [
      ["gatekeeper", 760, 596],
      ["eternalWisp", 1280, 452],
      ["gatekeeper", 1850, 570],
      ["mirrorWisp", 2560, 430],
      ["skyWarden", 3440, 520],
      ["heartEclipse", 4650, 548]
    ]
  }
];

const MONSTERS = {
  bramble: { name: "Shadow Bramble", family: "ground", hp: 96, r: 27, speed: 64, damage: 15, color: "#4e235c", glow: "#d452ad" },
  wisp: { name: "Thorn Wisp", family: "flying", hp: 70, r: 23, speed: 52, damage: 12, color: "#73317d", glow: "#ff74bb" },
  murkheart: { name: "Murkheart", family: "boss", hp: 430, r: 60, speed: 26, damage: 22, color: "#321238", glow: "#ff6bbb" },
  lanternImp: { name: "Lantern Imp", family: "flying", hp: 82, r: 24, speed: 74, damage: 14, color: "#83652a", glow: "#ffd36c" },
  glassfin: { name: "Glassfin Serpent", family: "serpent", hp: 125, r: 34, speed: 82, damage: 18, color: "#206b87", glow: "#82f2ff" },
  lotusQueen: { name: "Lotus Queen", family: "boss", hp: 510, r: 62, speed: 24, damage: 22, color: "#7e3769", glow: "#ffd36c" },
  crystalKnight: { name: "Crystal Knight", family: "ground", hp: 150, r: 32, speed: 56, damage: 20, color: "#315b9d", glow: "#a8f6ff" },
  mirrorWisp: { name: "Mirror Wisp", family: "flying", hp: 92, r: 25, speed: 58, damage: 15, color: "#4d4e9c", glow: "#b7adff" },
  tideGolem: { name: "Tide Golem", family: "boss", hp: 580, r: 66, speed: 22, damage: 25, color: "#225f80", glow: "#8ff3ff" },
  auroraMoth: { name: "Aurora Moth", family: "flying", hp: 98, r: 27, speed: 76, damage: 16, color: "#3f8392", glow: "#a7fff1" },
  starshade: { name: "Starshade", family: "serpent", hp: 132, r: 33, speed: 86, damage: 20, color: "#533c87", glow: "#ff9fd2" },
  thornKnight: { name: "Thorn Knight", family: "ground", hp: 165, r: 33, speed: 58, damage: 22, color: "#4c6040", glow: "#ff9fd2" },
  skyWarden: { name: "Sky Warden", family: "boss", hp: 620, r: 66, speed: 24, damage: 26, color: "#405a89", glow: "#ffadd4" },
  gatekeeper: { name: "Gatekeeper", family: "ground", hp: 180, r: 35, speed: 62, damage: 23, color: "#294e5c", glow: "#ffe59a" },
  eternalWisp: { name: "Eternal Wisp", family: "flying", hp: 120, r: 27, speed: 66, damage: 18, color: "#74325f", glow: "#ffe59a" },
  heartEclipse: { name: "Heart Eclipse", family: "boss", hp: 760, r: 72, speed: 23, damage: 30, color: "#35172b", glow: "#ff6fae" }
};

const net = {
  ws: null,
  role: "solo",
  code: "1234567",
  players: { host: false, guest: false },
  connected: false,
  selectedMap: "heartfall",
  remoteInput: emptyInput(),
  inputTimer: 0,
  snapshotTimer: 0,
  lastSnapshotAt: 0
};

const serverConfig = {
  checked: false,
  websocket: false,
  lanUrls: []
};

const music = {
  ctx: null,
  master: null,
  on: false,
  timer: 0,
  step: 0,
  nextTime: 0
};

const heroes = {
  joku: createHero("joku", "Joku", "Host", 160, 520, {
    coat: "#1c57a5",
    accent: "#6fe7ff",
    hair: "#071b38",
    skin: "#f3c9aa",
    glow: "#52d8ff",
    support: "#69bdf9"
  }),
  jolie: createHero("jolie", "Jolie", "Guest", 230, 520, {
    coat: "#ef6cab",
    accent: "#ffd0e5",
    hair: "#6e392d",
    skin: "#f5cbb3",
    glow: "#ff8dc7",
    support: "#ff9ccc"
  })
};

function emptyInput() {
  return { x: 0, jump: false, primary: false, secondary: false, support: false, bond: false };
}

function createHero(id, name, role, x, y, colors) {
  return {
    id,
    name,
    role,
    colors,
    x,
    y,
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
    cooldowns: { primary: 0, secondary: 0, support: 0, bond: 0 },
    supporter: { x: x - 55, y: y + 34, bob: 0 }
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

function mapById(id) {
  return MAPS.find((map) => map.id === id) || MAPS[0];
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
  view.height = clamp(960 / Math.max(aspect, 0.55), 540, 690);
  view.width = view.height * aspect;
  view.scaleX = canvas.width / view.width;
  view.scaleY = canvas.height / view.height;
}

function renderMapCards() {
  ui.mapGrid.innerHTML = "";
  for (const map of MAPS) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "map-card";
    card.dataset.mapId = map.id;
    card.style.setProperty("--map-gradient", map.gradient);
    card.innerHTML = `<b>${map.name}</b><span>${map.subtitle}</span><small>${map.monsters}</small>`;
    card.addEventListener("click", () => selectMap(map.id, true));
    ui.mapGrid.append(card);
  }
  updateMapCards();
}

function selectMap(mapId, notify = false) {
  selectedMapId = mapId;
  net.selectedMap = mapId;
  updateMapCards();
  if (notify && net.role === "host") sendNet({ type: "selectMap", mapId });
  const map = mapById(mapId);
  ui.playerStatus.textContent = net.role === "guest"
    ? `${map.name} selected. Waiting for Joku to start.`
    : `${map.name} selected. Ready for a shared chapter.`;
}

function updateMapCards() {
  for (const card of [...ui.mapGrid.children]) {
    const isSelected = card.dataset.mapId === selectedMapId;
    card.classList.toggle("selected", isSelected);
    card.disabled = net.role === "guest";
  }
  ui.startMap.disabled = net.role === "guest";
}

function showLobby(message = "") {
  state = "menu";
  ui.menu.classList.remove("hidden");
  ui.mapOverlay.classList.add("hidden");
  ui.lobbyStatus.textContent = message || `Ready to create or join room ${ui.roomCode.value || "1234567"}.`;
  updateRoleBadge();
  updateTouchButtons();
}

function showMapSelect(message = "") {
  state = "map";
  ui.menu.classList.add("hidden");
  ui.mapOverlay.classList.remove("hidden");
  ui.roomBadge.textContent = net.role === "solo" ? "Offline" : `Code ${net.code}`;
  ui.playerStatus.textContent = message || playerStatusText();
  ui.inviteHelp.textContent = inviteHelpText();
  updateMapCards();
  updateRoleBadge();
  updateTouchButtons();
}

function playerStatusText() {
  if (net.role === "solo") return "Offline test mode. You can control both heroes.";
  if (net.players.host && net.players.guest) return "Joku and Jolie are connected. Host chooses the chapter.";
  if (net.role === "host") return `Room ${net.code} is hosted. Waiting for Jolie to join.`;
  return `Joined room ${net.code}. Waiting for Joku to choose the chapter.`;
}

function inviteHelpText() {
  if (net.role === "solo") return "Offline mode is for testing on one device.";
  const base = `Share this game page and code ${net.code}.`;
  if (net.role === "guest") return "You are Jolie. Wait for Joku to choose and start the chapter.";
  if (serverConfig.lanUrls.length) {
    return `${base} Same Wi-Fi URL: ${serverConfig.lanUrls[0]}`;
  }
  if (["localhost", "127.0.0.1", ""].includes(location.hostname)) {
    return `${base} For another phone, use the deployed URL or your computer LAN IP, not 127.0.0.1.`;
  }
  return `${base} Jolie taps Join as Jolie on the same URL.`;
}

function resetGame(mapId = selectedMapId) {
  const map = mapById(mapId);
  currentMapId = map.id;
  selectedMapId = map.id;
  world.width = map.width;
  state = "playing";
  elapsed = 0;
  flash = 0;
  bond.value = 14;
  bond.handTimer = 0;
  bond.hugTimer = 0;
  bond.kissTimer = 0;
  bond.gateOpened = false;
  bossBannerKey = "";
  projectiles.length = 0;
  particles.length = 0;
  effects.length = 0;
  hazards.length = 0;
  buildWorld(map.id);
  Object.assign(heroes.joku, createHero("joku", "Joku", "Host", 160, 520, heroes.joku.colors));
  Object.assign(heroes.jolie, createHero("jolie", "Jolie", "Guest", 230, 520, heroes.jolie.colors));
  activeHeroId = net.role === "guest" ? "jolie" : "joku";
  ui.menu.classList.add("hidden");
  ui.mapOverlay.classList.add("hidden");
  updateRoleBadge();
  updateTouchButtons();
  updateUi();
  showChapterBanner("Chapter begins", map.name, map.subtitle, 3);
  showToast(`${map.name} begins.`);
  startMusic();
}

function buildWorld(mapId) {
  const map = mapById(mapId);
  entitySeed = 1;
  platforms = [
    { x: -100, y: 646, w: 610, h: 95, kind: "ground" }
  ];
  let x = 520;
  let wave = 0;
  while (x < map.width - 520) {
    const w = 260 + (wave % 3) * 70;
    const y = 636 - ((wave % 4) * 34);
    platforms.push({ x, y: clamp(y, 470, 666), w, h: 68, kind: wave % 2 ? "mushroom" : "moss" });
    if (wave % 2 === 0) platforms.push({ x: x + 120, y: clamp(y - 150, 330, 520), w: 190, h: 34, kind: "floater" });
    x += w + 150 + (wave % 4) * 22;
    wave += 1;
  }
  platforms.push({ x: map.width - 470, y: 648, w: 560, h: 100, kind: "gate" });

  orbs = [];
  for (let i = 0; i < 11; i += 1) {
    const type = i % 3 === 0 ? "heart" : i % 2 === 0 ? "flower" : "water";
    orbs.push(...makeOrbLine(430 + i * 310, 535 - (i % 4) * 38, type === "heart" ? 1 : 3, 50, type));
  }

  enemies = map.waves.map(([type, enemyX, enemyY]) => createEnemy(type, enemyX, enemyY));
  const nonBossWaves = map.waves.filter(([type]) => MONSTERS[type]?.family !== "boss");
  for (let i = 0; i < nonBossWaves.length; i += 1) {
    const [type, enemyX, enemyY] = nonBossWaves[i];
    if (i % 2 === 0 || map.id === "eternal") {
      const elite = createEnemy(type, enemyX + 180 + i * 32, clamp(enemyY - 38, 390, 620));
      elite.hp = Math.round(elite.hp * 1.22);
      elite.maxHp = elite.hp;
      elite.damage = Math.round(elite.damage * 1.12);
      elite.r += 3;
      elite.glow = map.bloom;
      enemies.push(elite);
    }
  }
}

function makeOrbLine(x, y, count, gap, type) {
  return Array.from({ length: count }, (_, index) => ({
    id: `orb-${entitySeed++}`,
    x: x + index * gap,
    y: y - Math.sin(index * 0.85) * 20,
    r: type === "heart" ? 18 : 13,
    type,
    taken: false,
    bob: rand(0, Math.PI * 2)
  }));
}

function createEnemy(type, x, y) {
  const data = MONSTERS[type] || MONSTERS.bramble;
  return {
    id: `enemy-${entitySeed++}`,
    type,
    name: data.name,
    family: data.family,
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
    glow: data.glow,
    hurt: 0,
    cooldown: rand(0.6, 2.4),
    alive: true,
    snared: 0
  };
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  toastTimer = 2.5;
}

function showChapterBanner(kicker, title, subtitle, duration = 2.6) {
  ui.chapterKicker.textContent = kicker;
  ui.chapterTitle.textContent = title;
  ui.chapterSubtitle.textContent = subtitle;
  ui.chapterBanner.classList.add("show");
  chapterBannerTimer = duration;
}

function startLoop(time = 0) {
  lastTime = time;
  requestAnimationFrame(loop);
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  if (state === "playing") {
    if (net.role === "guest") updateGuest(dt);
    else update(dt);
  } else {
    updateAmbient(dt);
  }
  updateNetwork(dt);
  updateMusic(dt);
  draw();
  updateUi();
  justPressed.clear();
  clearQueuedActions();
  requestAnimationFrame(loop);
}

function update(dt) {
  elapsed += dt;
  tickToast(dt);
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
  updateBossAlert();
  updateCamera(dt);
  checkGate();
}

function updateGuest(dt) {
  elapsed += dt;
  tickToast(dt);
  flash = Math.max(0, flash - dt * 1.8);
  updateSupporter(heroes.joku, dt);
  updateSupporter(heroes.jolie, dt);
  updateParticles(dt);
  updateBossAlert();
  updateCamera(dt);
  if (Date.now() - net.lastSnapshotAt > 5000) {
    ui.playerStatus.textContent = "Waiting for host screen sync...";
  }
}

function updateAmbient(dt) {
  elapsed += dt;
  tickToast(dt);
  updateParticles(dt);
  if (Math.random() < dt * 7) {
    const map = mapById(selectedMapId);
    addParticle(rand(view.x, view.x + view.width), rand(80, 520), Math.random() > 0.5 ? map.bloom : map.accent, 1.4, {
      vx: rand(-18, 24),
      vy: rand(10, 34),
      size: rand(2, 5),
      shape: "petal"
    });
  }
}

function tickToast(dt) {
  toastTimer -= dt;
  if (toastTimer <= 0) ui.toast.classList.remove("show");
  chapterBannerTimer -= dt;
  if (chapterBannerTimer <= 0) ui.chapterBanner.classList.remove("show");
}

function updateCooldowns(hero, dt) {
  for (const key of Object.keys(hero.cooldowns)) hero.cooldowns[key] = Math.max(0, hero.cooldowns[key] - dt);
  hero.invulnerable = Math.max(0, hero.invulnerable - dt);
  hero.shield = Math.max(0, hero.shield - dt);
  hero.castPose = Math.max(0, hero.castPose - dt);
  hero.hurtPose = Math.max(0, hero.hurtPose - dt);
  hero.romancePose = Math.max(0, hero.romancePose - dt);
  hero.mana = Math.min(hero.maxMana, hero.mana + dt * 10);
}

function getHeroControl(id) {
  if (net.role === "host" && id === "jolie") return consumeRemoteInput();
  if (net.role === "guest") return emptyInput();

  const isAssigned = net.role === "solo" ? activeHeroId === id : id === "joku";
  const control = isAssigned ? readLocalInput(id) : emptyInput();
  control.manual = isAssigned && (Math.abs(control.x) > 0.05 || control.jump || control.primary || control.secondary || control.support || control.bond);
  if (net.role === "solo" && !isAssigned) return autoPartnerControl(id);
  return control;
}

function readLocalInput(id) {
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
  if (activeHeroId === id && mobile.active) x = mobile.x;
  return {
    x,
    jump: justPressed.has(jumpKey) || (activeHeroId === id && mobile.jump),
    primary: justPressed.has(primaryKey) || queuedActions.primary,
    secondary: justPressed.has(secondaryKey) || queuedActions.secondary,
    support: justPressed.has(supportKey) || queuedActions.support,
    bond: justPressed.has("KeyB") || justPressed.has("KeyQ") || queuedActions.bond,
    manual: true
  };
}

function readAssignedInput() {
  const id = net.role === "guest" ? "jolie" : "joku";
  activeHeroId = id;
  return readLocalInput(id);
}

function autoPartnerControl(id) {
  const hero = heroes[id];
  const other = id === "joku" ? heroes.jolie : heroes.joku;
  const control = emptyInput();
  const target = other.x - other.facing * 72;
  const dx = target - hero.x;
  if (Math.abs(dx) > 38) control.x = Math.sign(dx);
  if (other.y + 30 < hero.y && hero.onGround && Math.abs(dx) < 190) control.jump = true;
  const nearest = nearestEnemy(hero, 330);
  if (nearest && hero.cooldowns.primary <= 0 && hero.mana > 28) control.primary = true;
  return control;
}

function consumeRemoteInput() {
  const control = { ...net.remoteInput, manual: true };
  net.remoteInput.primary = false;
  net.remoteInput.secondary = false;
  net.remoteInput.support = false;
  net.remoteInput.bond = false;
  return control;
}

function clearQueuedActions() {
  queuedActions.primary = false;
  queuedActions.secondary = false;
  queuedActions.support = false;
  queuedActions.bond = false;
}

function updateHero(hero, dt, control) {
  const other = hero.id === "joku" ? heroes.jolie : heroes.joku;
  const speed = bond.handTimer > 0 ? 286 : 258;
  const accel = hero.onGround ? 16 : 8;
  let inputX = control.x || 0;
  let wantsJump = control.jump;

  if (control.primary) castSkill(hero, "primary");
  if (control.secondary) castSkill(hero, "secondary");
  if (control.support) castSkill(hero, "support");
  if (control.bond) castBond();

  hero.vx += (inputX * speed - hero.vx) * Math.min(1, accel * dt);
  if (Math.abs(inputX) > 0.05) hero.facing = Math.sign(inputX);
  if (wantsJump && hero.onGround) {
    hero.vy = -705;
    hero.onGround = false;
    burst(hero.x, hero.y + hero.height / 2, hero.colors.glow, 14, 110);
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
    if (withinX && prevFeet <= platform.y + 12 && feet >= platform.y && hero.vy >= 0) {
      hero.y = platform.y - hero.height / 2;
      hero.vy = 0;
      hero.onGround = true;
    }
  }

  hero.x = clamp(hero.x, 40, world.width - 40);
  if (hero.y > world.height + 180) {
    hero.hp = Math.max(1, hero.hp - 16);
    hero.x = Math.max(120, other.x - 70);
    hero.y = other.y - 90;
    hero.vx = 0;
    hero.vy = -180;
    hero.invulnerable = 1.5;
    showToast(`${hero.name} returns to the path.`);
  }
}

function updateSupporter(hero, dt) {
  const offset = hero.id === "joku" ? -58 : 58;
  const targetX = hero.x - hero.facing * offset;
  const targetY = hero.y + 23 + Math.sin(elapsed * 4 + (hero.id === "joku" ? 0 : 1.4)) * 8;
  hero.supporter.x += (targetX - hero.supporter.x) * Math.min(1, dt * 7);
  hero.supporter.y += (targetY - hero.supporter.y) * Math.min(1, dt * 7);
  hero.supporter.bob += dt * 6;
}

function updateBond(dt) {
  const d = distance(heroes.joku, heroes.jolie);
  if (d < 140) bond.value = Math.min(100, bond.value + dt * 5.4);
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
  if (hero.id === "joku") return castJoku(hero, type);
  return castJolie(hero, type);
}

function castJoku(hero, type) {
  if (type === "primary") {
    if (!spend(hero, 16)) return false;
    hero.cooldowns.primary = 0.36;
    hero.castPose = 0.28;
    for (const offset of [-13, 0, 13]) {
      projectiles.push({
        x: hero.x + hero.facing * 32,
        y: hero.y - 8 + offset,
        vx: hero.facing * (670 - Math.abs(offset) * 2),
        vy: -20 + offset * 1.8,
        r: offset === 0 ? 19 : 15,
        life: 0.98,
        damage: offset === 0 ? 34 : 22,
        owner: hero.id,
        type: "water"
      });
    }
    effects.push({ type: "tidal-ring", x: hero.x + hero.facing * 44, y: hero.y - 6, life: 0.58, max: 0.58, color: "#72edff" });
    spray(hero.x + hero.facing * 28, hero.y - 8, "#66e3ff", 18, hero.facing);
    return true;
  }
  if (type === "secondary") {
    if (!spend(hero, 34)) return false;
    hero.cooldowns.secondary = 2.15;
    hero.castPose = 0.5;
    hero.invulnerable = 0.62;
    hero.vx = hero.facing * 610;
    hero.vy = -395;
    effects.push({ type: "phoenix", x: hero.x, y: hero.y - 10, life: 0.74, max: 0.74, facing: hero.facing });
    effects.push({ type: "tidal-ring", x: hero.x + hero.facing * 82, y: hero.y, life: 0.85, max: 0.85, color: "#7df1ff" });
    areaDamage(hero.x + hero.facing * 95, hero.y, 138, 58, "phoenix");
    burst(hero.x, hero.y, "#60e7ff", 48, 270);
    return true;
  }
  if (type === "support") {
    if (!spend(hero, 26)) return false;
    hero.cooldowns.support = 3.8;
    hero.shield = 4.4;
    const target = nearestEnemy(hero, 560);
    const angle = target ? Math.atan2(target.y - hero.y, target.x - hero.x) : hero.facing > 0 ? 0 : Math.PI;
    projectiles.push({ x: hero.supporter.x, y: hero.supporter.y - 18, vx: Math.cos(angle) * 600, vy: Math.sin(angle) * 600, r: 22, life: 1.35, damage: 38, owner: hero.id, type: "paw-blue" });
    effects.push({ type: "tidal-ring", x: hero.supporter.x, y: hero.supporter.y - 10, life: 0.75, max: 0.75, color: "#8fe9ff" });
    areaDamage(hero.supporter.x, hero.supporter.y - 10, 86, 18, "water");
    showToast("Blue dog casts Azure Bark Guard.");
    burst(hero.supporter.x, hero.supporter.y, "#75c7ff", 28, 180);
    return true;
  }
  return false;
}

function castJolie(hero, type) {
  if (type === "primary") {
    if (!spend(hero, 15)) return false;
    hero.cooldowns.primary = 0.44;
    hero.castPose = 0.34;
    for (let i = -2; i <= 2; i += 1) {
      projectiles.push({
        x: hero.x + hero.facing * 30,
        y: hero.y - 10,
        vx: hero.facing * (545 + Math.abs(i) * 35),
        vy: i * 68 - 22,
        r: i === 0 ? 17 : 14,
        life: 1.05,
        damage: i === 0 ? 30 : 22,
        owner: hero.id,
        type: "flower"
      });
    }
    effects.push({ type: "bloom-ring", x: hero.x + hero.facing * 48, y: hero.y - 8, life: 0.7, max: 0.7, color: "#ff94ca" });
    burst(hero.x + hero.facing * 24, hero.y - 15, "#ff94ca", 22, 140);
    return true;
  }
  if (type === "secondary") {
    if (!spend(hero, 32)) return false;
    hero.cooldowns.secondary = 2.9;
    hero.castPose = 0.5;
    hazards.push({ type: "vine", x: hero.x + hero.facing * 112, y: hero.y + 35, r: 128, life: 4.2, tick: 0, power: 14 });
    effects.push({ type: "bloom-ring", x: hero.x + hero.facing * 106, y: hero.y + 16, life: 1.0, max: 1.0, color: "#ff9fce" });
    showToast("Jolie plants Vine Promise.");
    burst(hero.x + hero.facing * 80, hero.y + 24, "#ff9fce", 38, 190);
    return true;
  }
  if (type === "support") {
    if (!spend(hero, 34)) return false;
    hero.cooldowns.support = 4.6;
    heroes.joku.hp = Math.min(heroes.joku.maxHp, heroes.joku.hp + 32);
    heroes.jolie.hp = Math.min(heroes.jolie.maxHp, heroes.jolie.hp + 36);
    heroes.joku.shield = Math.max(heroes.joku.shield, 2.6);
    heroes.jolie.shield = Math.max(heroes.jolie.shield, 2.6);
    effects.push({ type: "heal", x: hero.supporter.x, y: hero.supporter.y, life: 1.35, max: 1.35 });
    effects.push({ type: "bloom-ring", x: hero.supporter.x, y: hero.supporter.y, life: 0.95, max: 0.95, color: "#ffadd4" });
    areaDamage(hero.supporter.x, hero.supporter.y, 138, 28, "flower");
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
  if (distance(joku, jolie) > 130) {
    showToast("Move close for a bond skill.");
    return;
  }
  joku.cooldowns.bond = 1.2;
  jolie.cooldowns.bond = 1.2;
  if (bond.value >= 96) {
    bond.value = 44;
    bond.kissTimer = 1.5;
    joku.romancePose = 1.5;
    jolie.romancePose = 1.5;
    flash = 1;
    effects.push({ type: "heart-phoenix", x: (joku.x + jolie.x) / 2, y: (joku.y + jolie.y) / 2, life: 1.4, max: 1.4 });
    for (const enemy of enemies) if (enemy.alive) damageEnemy(enemy, enemy.family === "boss" ? 230 : 999, "heart");
    showToast("Heart Bloom Phoenix!");
    return;
  }
  if (bond.value >= 50 || joku.hp < 52 || jolie.hp < 52) {
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
    if (Math.hypot(enemy.x - x, enemy.y - y) < radius + enemy.r) damageEnemy(enemy, damage, source);
  }
}

function damageEnemy(enemy, amount, source) {
  enemy.hp -= amount;
  enemy.hurt = 0.18;
  const color = source === "flower" ? "#ff8ec4" : source === "heart" ? "#ffe092" : "#68e7ff";
  burst(enemy.x, enemy.y, color, enemy.family === "boss" ? 30 : 15, 180);
  if (source === "vine") enemy.snared = Math.max(enemy.snared, 1.35);
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    bond.value = Math.min(100, bond.value + (enemy.family === "boss" ? 34 : 10));
    addDefeatLoot(enemy);
    showToast(enemy.family === "boss" ? `${enemy.name} is healed.` : `${enemy.name} fades into light.`);
  }
}

function addDefeatLoot(enemy) {
  const count = enemy.family === "boss" ? 8 : 3;
  for (let i = 0; i < count; i += 1) {
    const type = enemy.family === "boss" ? "heart" : i % 2 ? "flower" : "water";
    orbs.push({ id: `orb-${entitySeed++}`, x: enemy.x + rand(-28, 28), y: enemy.y + rand(-52, -14), r: type === "heart" ? 15 : 12, type, taken: false, bob: rand(0, 6) });
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
    const moveScale = enemy.snared > 0 ? 0.15 : 1;

    if (enemy.family === "flying") {
      enemy.y = enemy.baseY + Math.sin(elapsed * 2.1 + enemy.x * 0.01) * 30;
      enemy.x += Math.sin(elapsed * 0.85 + enemy.baseY) * enemy.speed * dt * 0.38 * moveScale;
      shootAtTarget(enemy, target, dt, 310);
    } else if (enemy.family === "serpent") {
      enemy.x += enemy.facing * enemy.speed * dt * 0.65 * moveScale;
      enemy.y = enemy.baseY + Math.sin(elapsed * 3 + enemy.x * 0.02) * 12;
      shootAtTarget(enemy, target, dt, 260);
    } else {
      enemy.x += enemy.facing * enemy.speed * dt * moveScale;
      if (enemy.family === "boss" && enemy.cooldown <= 0) {
        enemy.cooldown = rand(2.4, 3.6);
        bossAttack(enemy, target);
      }
    }

    for (const hero of [heroes.joku, heroes.jolie]) {
      if (hero.invulnerable > 0) continue;
      if (Math.hypot(hero.x - enemy.x, hero.y - enemy.y) < enemy.r + hero.width * 0.45) {
        hurtHero(hero, enemy.damage);
        const push = hero.x < enemy.x ? -1 : 1;
        hero.vx = push * 360;
        hero.vy = -180;
      }
    }
  }
}

function bossAttack(enemy, target) {
  hazards.push({ type: "curse", x: target.x, y: target.y + 36, r: 92, life: 2.1, tick: 0, color: enemy.glow, power: Math.max(10, enemy.damage * 0.52) });
  effects.push({ type: "boss-ring", x: enemy.x, y: enemy.y, life: 0.82, max: 0.82, color: enemy.glow });
  const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  for (let i = -2; i <= 2; i += 1) {
    const angle = aim + i * 0.18;
    projectiles.push({
      x: enemy.x + Math.cos(angle) * enemy.r * 0.75,
      y: enemy.y + Math.sin(angle) * enemy.r * 0.4,
      vx: Math.cos(angle) * 390,
      vy: Math.sin(angle) * 390,
      r: 13,
      life: 2.2,
      damage: Math.round(enemy.damage * 0.72),
      owner: "enemy",
      type: "thorn",
      color: enemy.glow
    });
  }
  showToast(`${enemy.name} casts a curse field.`);
}

function shootAtTarget(enemy, target) {
  if (enemy.cooldown > 0 || Math.abs(target.x - enemy.x) > 560) return;
  enemy.cooldown = rand(1.8, 3.0);
  const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 320, vy: Math.sin(angle) * 320, r: 10, life: 2.1, damage: enemy.damage, owner: "enemy", type: "thorn", color: enemy.glow });
}

function hurtHero(hero, amount) {
  const reduction = hero.shield > 0 || bond.handTimer > 0 ? 0.48 : 1;
  hero.hp = Math.max(0, hero.hp - amount * reduction);
  hero.invulnerable = 0.85;
  hero.hurtPose = 0.3;
  burst(hero.x, hero.y - 10, hero.colors.glow, 10, 120);
  if (hero.hp <= 0) {
    const other = hero.id === "joku" ? heroes.jolie : heroes.joku;
    hero.hp = 45;
    hero.x = other.x + (hero.id === "joku" ? -62 : 62);
    hero.y = other.y - 70;
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

    if (p.life <= 0 || p.x < -100 || p.x > world.width + 100 || p.y > world.height + 150) projectiles.splice(i, 1);
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
        areaDamage(h.x, h.y, h.r, h.power || 9, "vine");
      }
      for (let j = 0; j < 3; j += 1) addParticle(h.x + rand(-h.r, h.r), h.y + rand(-20, 12), "#ff9fce", 0.6, { vx: rand(-10, 10), vy: rand(-35, -5), size: rand(2, 4), shape: "petal" });
    } else {
      if (h.tick <= 0) {
        h.tick = 0.46;
        for (const hero of [heroes.joku, heroes.jolie]) if (Math.hypot(hero.x - h.x, hero.y - h.y) < h.r && hero.invulnerable <= 0) hurtHero(hero, h.power || 8);
      }
      addParticle(h.x + rand(-h.r, h.r), h.y + rand(-28, 8), h.color || "#9f4a9d", 0.75, { vx: rand(-12, 12), vy: rand(-42, -8), size: rand(2, 5) });
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
  if (state === "playing" && Math.random() < dt * 12) {
    const map = mapById(currentMapId);
    addParticle(view.x + rand(-20, view.width + 20), view.y + rand(40, view.height - 80), Math.random() > 0.5 ? map.bloom : map.accent, rand(1, 2.4), { vx: rand(-12, 26), vy: rand(8, 28), size: rand(2, 5), shape: "petal" });
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
        bond.value = Math.min(100, bond.value + 18);
        heroes.joku.hp = Math.min(heroes.joku.maxHp, heroes.joku.hp + 12);
        heroes.jolie.hp = Math.min(heroes.jolie.maxHp, heroes.jolie.hp + 12);
      } else {
        bond.value = Math.min(100, bond.value + 4);
      }
    }
  }
}

function getBoss() {
  return enemies.find((enemy) => enemy.family === "boss") || null;
}

function updateBossAlert() {
  if (state !== "playing") return;
  const boss = getBoss();
  if (!boss || !boss.alive) return;
  const frontHeroX = Math.max(heroes.joku.x, heroes.jolie.x);
  const nearBoss = frontHeroX > boss.x - view.width * 0.92 || boss.hp < boss.maxHp;
  const key = `${currentMapId}-${boss.id}`;
  if (!nearBoss || bossBannerKey === key) return;
  bossBannerKey = key;
  const map = mapById(currentMapId);
  showChapterBanner("Boss awakened", boss.name, map.bossIntro, 2.8);
  showToast(`${boss.name} blocks the gate.`);
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
  const boss = enemies.find((enemy) => enemy.family === "boss");
  const progress = getProgress();
  if (boss && !boss.alive && !bond.gateOpened) {
    bond.gateOpened = true;
    showToast(`${mapById(currentMapId).name} is healed. Reach the gate together.`);
  }
  if (bond.gateOpened && progress > 0.96 && distance(heroes.joku, heroes.jolie) < 145) {
    completeChapter();
  }
}

function completeChapter() {
  if (state !== "playing") return;
  state = "complete";
  bond.value = 100;
  showToast("Chapter complete.");
  setTimeout(() => {
    if (net.role === "guest") showMapSelect("Chapter cleared. Waiting for Joku to choose the next journey.");
    else showMapSelect("Chapter cleared. Choose another map for the long journey.");
  }, 900);
}

function getProgress() {
  return clamp(Math.max(heroes.joku.x, heroes.jolie.x) / (world.width - 220), 0, 1);
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
  const map = mapById(state === "playing" || state === "complete" ? currentMapId : selectedMapId);
  ctx.save();
  ctx.fillStyle = "#061a24";
  ctx.fillRect(0, 0, view.width, view.height);
  if (bg.complete && bg.naturalWidth) {
    const parallaxX = -view.x * 0.24;
    const parallaxY = -view.y * 0.1;
    const bgW = Math.max(world.width * 0.68, view.width + 200);
    const bgH = world.height;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(bg, parallaxX, parallaxY, bgW, bgH);
    ctx.drawImage(bg, parallaxX + bgW - 2, parallaxY, bgW, bgH);
  }
  ctx.fillStyle = map.tint;
  ctx.fillRect(0, 0, view.width, view.height);
  const sky = ctx.createLinearGradient(0, 0, 0, view.height);
  sky.addColorStop(0, "rgba(86, 225, 255, 0.11)");
  sky.addColorStop(0.45, "rgba(255, 149, 207, 0.05)");
  sky.addColorStop(1, "rgba(0, 8, 12, 0.38)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, view.height);
  drawMapSignatureBackdrop(map);
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = map.accent;
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 260 - view.x * 0.08) % (view.width + 260)) - 80;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 80, 160, x - 40, 330, x + 70, view.height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMapSignatureBackdrop(map) {
  ctx.save();
  if (map.id === "heartfall") {
    for (let i = 0; i < 4; i += 1) {
      const x = ((i * 310 - view.x * 0.15) % (view.width + 360)) - 110;
      const stream = ctx.createLinearGradient(x, 70, x + 88, view.height);
      stream.addColorStop(0, "rgba(156, 240, 255, 0.08)");
      stream.addColorStop(0.35, "rgba(156, 240, 255, 0.2)");
      stream.addColorStop(1, "rgba(255, 255, 255, 0.03)");
      ctx.fillStyle = stream;
      roundedRect(x, 64, 82, view.height + 60, 32);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 26, 95);
      ctx.bezierCurveTo(x + 54, 210, x + 14, 350, x + 58, view.height);
      ctx.stroke();
    }
  } else if (map.id === "lotus") {
    for (let i = 0; i < 9; i += 1) {
      const x = ((i * 175 - view.x * 0.18) % (view.width + 220)) - 80;
      const y = 148 + (i % 4) * 38 + Math.sin(elapsed * 0.8 + i) * 9;
      ctx.strokeStyle = "rgba(255, 230, 160, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, y - 22);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 211, 108, 0.28)";
      roundedRect(x - 12, y - 20, 24, 34, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(128, 255, 224, 0.16)";
      ctx.beginPath();
      ctx.ellipse(x, y + 58, 54, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (map.id === "crystal") {
    for (let i = 0; i < 10; i += 1) {
      const x = ((i * 220 - view.x * 0.12) % (view.width + 260)) - 90;
      const h = 150 + (i % 4) * 42;
      ctx.fillStyle = i % 2 ? "rgba(179, 162, 255, 0.2)" : "rgba(155, 244, 255, 0.22)";
      ctx.beginPath();
      ctx.moveTo(x, view.height);
      ctx.lineTo(x + 28, view.height - h);
      ctx.lineTo(x + 68, view.height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  } else if (map.id === "aurora") {
    for (let band = 0; band < 3; band += 1) {
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = band % 2 ? map.bloom : map.accent;
      ctx.lineWidth = 22 - band * 4;
      ctx.beginPath();
      for (let x = -40; x <= view.width + 40; x += 36) {
        const y = 106 + band * 48 + Math.sin((x + view.x * 0.22) * 0.012 + elapsed * 0.55 + band) * 32;
        if (x === -40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (map.id === "eternal") {
    const gateX = view.width * 0.5 - (view.x / world.width - 0.5) * 260;
    ctx.strokeStyle = "rgba(255, 229, 154, 0.14)";
    ctx.lineWidth = 7;
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2 + elapsed * 0.06;
      ctx.beginPath();
      ctx.moveTo(gateX, 210);
      ctx.lineTo(gateX + Math.cos(angle) * 520, 210 + Math.sin(angle) * 310);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 111, 174, 0.14)";
    ctx.beginPath();
    drawHeartPath(gateX, 198, 62);
    ctx.fill();
  }
  ctx.restore();
}

function drawWorldDetails() {
  drawMoonGate();
  for (const platform of platforms) drawPlatform(platform);
  drawScenicMagic();
  const map = mapById(currentMapId);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = map.accent;
  for (let i = 0; i < 9; i += 1) {
    const x = 330 + i * 450;
    const y = 690 + Math.sin(elapsed + i) * 3;
    ctx.beginPath();
    ctx.ellipse(x, y, 130, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawScenicMagic() {
  const map = mapById(currentMapId);
  ctx.save();
  for (let i = 0; i < 18; i += 1) {
    const x = 360 + i * 210;
    if (x < view.x - 220 || x > view.x + view.width + 220) continue;
    const y = 285 + Math.sin(elapsed * 1.2 + i) * 42 + (i % 3) * 46;
    const color = i % 2 ? map.bloom : map.accent;
    ctx.globalAlpha = 0.42;
    ctx.shadowBlur = 24;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 18 + Math.sin(elapsed * 2 + i) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = color;
    if (i % 2) {
      drawSmallFlower(x, y, 8, color);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.58;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x - 4, y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < 22; i += 1) {
    const x = 220 + i * 175;
    if (x < view.x - 180 || x > view.x + view.width + 180) continue;
    const baseY = 616 - (i % 4) * 34 + Math.sin(elapsed + i) * 3;
    if (map.id === "heartfall") {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = i % 2 ? map.cap : "#7deeff";
      ctx.shadowBlur = 14;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.ellipse(x, baseY, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
      for (let d = -1; d <= 1; d += 1) {
        ctx.beginPath();
        ctx.arc(x + d * 9, baseY - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (map.id === "lotus") {
      ctx.globalAlpha = 0.68;
      ctx.strokeStyle = "rgba(255, 231, 160, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, baseY - 4);
      ctx.lineTo(x, baseY - 60);
      ctx.stroke();
      ctx.fillStyle = map.bloom;
      roundedRect(x - 11, baseY - 66, 22, 28, 7);
      ctx.fill();
      drawSmallFlower(x + 24, baseY - 10, 7, "#ffd36c");
    } else if (map.id === "crystal") {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = i % 2 ? "#9bf4ff" : "#b3a2ff";
      ctx.shadowBlur = 16;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.moveTo(x, baseY + 10);
      ctx.lineTo(x + 13, baseY - 54);
      ctx.lineTo(x + 30, baseY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.stroke();
    } else if (map.id === "aurora") {
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = i % 2 ? map.bloom : map.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 28, baseY - 70);
      ctx.quadraticCurveTo(x + 20, baseY - 115 + Math.sin(elapsed + i) * 18, x + 62, baseY - 76);
      ctx.stroke();
      drawSmallFlower(x, baseY - 28, 6, map.bloom);
    } else if (map.id === "eternal") {
      ctx.globalAlpha = 0.62;
      ctx.strokeStyle = i % 2 ? "#ffe59a" : map.bloom;
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 14;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      drawHeartPath(x, baseY - 20, 18);
      ctx.stroke();
      drawTinySparkle(x + 24, baseY - 42, 4, "#ffe59a");
    }
  }
  ctx.restore();
}

function drawPlatform(p) {
  const map = mapById(currentMapId);
  ctx.save();
  const radius = p.kind === "mushroom" ? 28 : 18;
  roundedRect(p.x, p.y, p.w, p.h, radius);
  const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  grad.addColorStop(0, p.kind === "mushroom" ? map.cap : map.ground);
  grad.addColorStop(0.2, p.kind === "mushroom" ? "#ffe1ad" : "#a8f199");
  grad.addColorStop(0.24, "#263f32");
  grad.addColorStop(1, "#172928");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = p.kind === "mushroom" ? "rgba(255, 244, 206, 0.5)" : "rgba(209, 255, 194, 0.55)";
  for (let i = 0; i < p.w; i += 44) {
    ctx.beginPath();
    ctx.ellipse(p.x + i + 18, p.y + 10 + Math.sin(i) * 3, 12 + (i % 3) * 4, 4 + (i % 2), 0, 0, Math.PI * 2);
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
  const map = mapById(currentMapId);
  const x = world.width - 250;
  const y = 558;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = bond.gateOpened ? 1 : 0.72;
  ctx.strokeStyle = bond.gateOpened ? "#ffe49b" : map.accent;
  ctx.lineWidth = 8;
  ctx.shadowBlur = bond.gateOpened ? 34 : 18;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(-62, 86);
  ctx.bezierCurveTo(-72, -30, -34, -98, 0, -48);
  ctx.bezierCurveTo(34, -98, 72, -30, 62, 86);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
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
    if (orb.type === "heart") drawHeartPath(orb.x, y, orb.r);
    else ctx.arc(orb.x, y, orb.r, 0, Math.PI * 2);
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
      ctx.shadowBlur = 28;
      ctx.shadowColor = "#61e5ff";
      const waterGrad = ctx.createLinearGradient(-p.r * 1.8, 0, p.r * 1.8, 0);
      waterGrad.addColorStop(0, "rgba(255, 255, 255, 0.92)");
      waterGrad.addColorStop(0.44, "#78eaff");
      waterGrad.addColorStop(1, "#1a8ef2");
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, 0, p.r * 0.9, -0.9, 1.2);
      ctx.stroke();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = "#d8f8ff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-p.r * 2.7, -p.r * 0.35);
      ctx.quadraticCurveTo(-p.r * 1.3, p.r * 0.6, p.r * 0.5, p.r * 0.18);
      ctx.stroke();
    } else if (p.type === "flower") {
      ctx.translate(p.x, p.y);
      ctx.rotate(elapsed * 8);
      ctx.shadowBlur = 24;
      ctx.shadowColor = "#ff8ec4";
      for (let i = 0; i < 8; i += 1) {
        ctx.rotate((Math.PI * 2) / 8);
        ctx.fillStyle = i % 2 ? "#ffd1e5" : "#ff7cba";
        ctx.beginPath();
        ctx.ellipse(0, -p.r * 0.55, p.r * 0.28, p.r * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff5a2";
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === "paw-blue") {
      drawPaw(p.x, p.y, p.r, "#8fe9ff");
    } else {
      ctx.shadowBlur = 18;
      ctx.shadowColor = p.color || "#b64aa0";
      const thornGrad = ctx.createLinearGradient(p.x, p.y - p.r, p.x, p.y + p.r);
      thornGrad.addColorStop(0, "#fff3d8");
      thornGrad.addColorStop(0.36, p.color || "#b64aa0");
      thornGrad.addColorStop(1, "#160719");
      ctx.fillStyle = thornGrad;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.r);
      ctx.lineTo(p.x + p.r * 0.55, p.y + p.r);
      ctx.lineTo(p.x - p.r * 0.55, p.y + p.r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawHazards() {
  for (const h of hazards) {
    ctx.save();
    const a = clamp(h.life, 0, 1);
    if (h.type === "vine") {
      ctx.globalAlpha = 0.62 * a;
      const vineGlow = ctx.createRadialGradient(h.x, h.y, 12, h.x, h.y, h.r);
      vineGlow.addColorStop(0, "rgba(255, 245, 162, 0.55)");
      vineGlow.addColorStop(0.42, "rgba(255, 143, 196, 0.38)");
      vineGlow.addColorStop(1, "rgba(120, 224, 156, 0.1)");
      ctx.fillStyle = vineGlow;
      ctx.strokeStyle = "#78e09c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.r, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2 + elapsed;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y + 4);
        ctx.quadraticCurveTo(h.x + Math.cos(angle) * h.r * 0.4, h.y - 42, h.x + Math.cos(angle) * h.r, h.y + Math.sin(angle) * 18);
        ctx.stroke();
        if (i % 3 === 0) drawSmallFlower(h.x + Math.cos(angle) * h.r * 0.72, h.y + Math.sin(angle) * 16 - 8, 6, "#ff9fce");
      }
    } else {
      ctx.globalAlpha = 0.42 * a;
      const curseGrad = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r);
      curseGrad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
      curseGrad.addColorStop(0.38, h.color || "#773077");
      curseGrad.addColorStop(1, "rgba(34, 4, 40, 0.04)");
      ctx.fillStyle = curseGrad;
      ctx.strokeStyle = "#f3b5e0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.r, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = h.color || "#f3b5e0";
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2 + elapsed * 0.9;
        ctx.beginPath();
        ctx.moveTo(h.x + Math.cos(angle) * h.r * 0.22, h.y + Math.sin(angle) * 13);
        ctx.lineTo(h.x + Math.cos(angle) * h.r * 0.82, h.y + Math.sin(angle) * 21);
        ctx.stroke();
      }
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
    ctx.shadowBlur = enemy.family === "boss" ? 28 : 16;
    ctx.shadowColor = enemy.glow;
    if (enemy.family === "flying") drawFlyingEnemy(enemy);
    else if (enemy.family === "serpent") drawSerpentEnemy(enemy);
    else if (enemy.family === "boss") drawBossEnemy(enemy);
    else drawGroundEnemy(enemy);
    drawEnemyHealth(enemy);
    ctx.restore();
  }
}

function drawFlyingEnemy(enemy) {
  const wingBeat = Math.sin(elapsed * 9 + enemy.x * 0.02);
  ctx.globalAlpha *= 0.86;
  ctx.fillStyle = enemy.glow;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.ellipse(enemy.r * 1.2, -3, enemy.r * 0.95, enemy.r * 0.35, wingBeat * 0.24, 0, Math.PI * 2);
    ctx.ellipse(enemy.r * 1.6, 9, enemy.r * 0.58, enemy.r * 0.24, -wingBeat * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const body = ctx.createRadialGradient(-8, -9, 4, 0, 0, enemy.r * 1.35);
  body.addColorStop(0, enemy.glow);
  body.addColorStop(0.38, enemy.color);
  body.addColorStop(1, "#140719");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, enemy.r * 1.05, enemy.r * 1.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.r * 0.85, elapsed, elapsed + Math.PI * 1.25);
  ctx.stroke();
  ctx.fillStyle = "#fff3d8";
  ctx.beginPath();
  ctx.arc(-8, -3, 4, 0, Math.PI * 2);
  ctx.arc(8, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#160719";
  ctx.beginPath();
  ctx.arc(-7, -3, 1.8, 0, Math.PI * 2);
  ctx.arc(9, -3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = enemy.glow;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 9, -enemy.r * 0.88);
    ctx.lineTo(i * 15, -enemy.r * 1.26);
    ctx.stroke();
  }
}

function drawSerpentEnemy(enemy) {
  for (let i = -3; i <= 3; i += 1) {
    const bob = Math.sin(elapsed * 4 + i * 0.9) * 5;
    const shade = i % 2 ? enemy.color : "#163348";
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(i * 15, 4 + bob, enemy.r * 0.48, enemy.r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = enemy.glow;
  for (let i = -3; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * 15, -7 + Math.sin(elapsed * 4 + i) * 4, 5, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const headGrad = ctx.createRadialGradient(enemy.r * 0.8, -7, 3, enemy.r * 0.72, -2, enemy.r * 0.72);
  headGrad.addColorStop(0, enemy.glow);
  headGrad.addColorStop(0.5, enemy.color);
  headGrad.addColorStop(1, "#0f1b28");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(enemy.r * 0.86, -1, enemy.r * 0.62, enemy.r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07131a";
  ctx.beginPath();
  ctx.arc(enemy.r * 0.9, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(enemy.r * 1.1, 7);
  ctx.lineTo(enemy.r * 1.22, 15);
  ctx.lineTo(enemy.r * 0.98, 10);
  ctx.closePath();
  ctx.fill();
}

function drawGroundEnemy(enemy) {
  const body = ctx.createLinearGradient(-enemy.r, -enemy.r, enemy.r, enemy.r);
  body.addColorStop(0, enemy.glow);
  body.addColorStop(0.28, enemy.color);
  body.addColorStop(1, "#160719");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, enemy.r * 1.18, enemy.r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = enemy.glow;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 9, -enemy.r * 0.42);
    ctx.quadraticCurveTo(i * 13, -enemy.r * 0.92, i * 21, -enemy.r * 1.12);
    ctx.stroke();
  }

  ctx.strokeStyle = "#160719";
  ctx.lineWidth = 5;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 8, 8);
    ctx.quadraticCurveTo(i * 18, 26, i * 30, 9);
    ctx.stroke();
  }
  ctx.fillStyle = enemy.glow;
  ctx.beginPath();
  ctx.arc(-9, -4, 4, 0, Math.PI * 2);
  ctx.arc(9, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff3d8";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(0, 13, enemy.r * 0.46, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBossEnemy(enemy) {
  const pulse = 0.5 + Math.sin(elapsed * 3.4 + enemy.x) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.22 + pulse * 0.12;
  ctx.strokeStyle = enemy.glow;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, -2, enemy.r * (1.55 + i * 0.32 + pulse * 0.08), enemy.r * (0.92 + i * 0.18), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = enemy.glow;
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + elapsed * 0.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * enemy.r * 0.92, Math.sin(angle) * enemy.r * 0.55);
    ctx.lineTo(Math.cos(angle + 0.18) * enemy.r * 1.34, Math.sin(angle + 0.18) * enemy.r * 0.82);
    ctx.lineTo(Math.cos(angle - 0.18) * enemy.r * 1.34, Math.sin(angle - 0.18) * enemy.r * 0.82);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (enemy.type === "lotusQueen") {
    ctx.fillStyle = enemy.glow;
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2 + Math.sin(elapsed) * 0.08;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -enemy.r * 1.05, enemy.r * 0.22, enemy.r * 0.54, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  if (enemy.type === "tideGolem") {
    ctx.fillStyle = "#9bf4ff";
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 28, -enemy.r * 0.8);
      ctx.lineTo(i * 28 + 13, -enemy.r * 1.5 - Math.abs(i) * 6);
      ctx.lineTo(i * 28 + 28, -enemy.r * 0.72);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (enemy.type === "skyWarden") {
    ctx.fillStyle = "rgba(255, 173, 212, 0.62)";
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(enemy.r * 0.78 + i * 10, -8 + i * 7, enemy.r * 0.5, enemy.r * 0.16, -0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  if (enemy.type === "heartEclipse") {
    ctx.strokeStyle = "#ffe59a";
    ctx.lineWidth = 6;
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0, -4, enemy.r * (1.42 + i * 0.24), enemy.r * (0.78 + i * 0.12), elapsed * 0.6 + i, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const bossGrad = ctx.createRadialGradient(-enemy.r * 0.25, -enemy.r * 0.35, enemy.r * 0.2, 0, 0, enemy.r * 1.28);
  bossGrad.addColorStop(0, enemy.glow);
  bossGrad.addColorStop(0.35, enemy.color);
  bossGrad.addColorStop(1, "#130714");
  ctx.fillStyle = bossGrad;
  ctx.beginPath();
  drawHeartPath(0, -2, enemy.r * 1.08);
  ctx.fill();
  ctx.strokeStyle = enemy.glow;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "#160719";
  ctx.lineWidth = 6;
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + Math.sin(elapsed) * 0.1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 25, Math.sin(angle) * 18);
    ctx.lineTo(Math.cos(angle) * 78, Math.sin(angle) * 50);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -2, enemy.r * 0.58, 0.15, Math.PI * 1.2);
  ctx.stroke();
  ctx.fillStyle = enemy.glow;
  ctx.beginPath();
  ctx.arc(-16, -8, 7, 0, Math.PI * 2);
  ctx.arc(16, -8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#160719";
  ctx.beginPath();
  ctx.arc(-14, -8, 2.7, 0, Math.PI * 2);
  ctx.arc(18, -8, 2.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemyHealth(enemy) {
  const w = enemy.family === "boss" ? 104 : 48;
  const y = -enemy.r - 18;
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  roundedRect(-w / 2, y, w, 7, 4);
  ctx.fill();
  ctx.fillStyle = enemy.glow;
  roundedRect(-w / 2, y, w * clamp(enemy.hp / enemy.maxHp, 0, 1), 7, 4);
  ctx.fill();
}

function drawBondEffects() {
  const joku = heroes.joku;
  const jolie = heroes.jolie;
  if (bond.handTimer > 0 || distance(joku, jolie) < 130) {
    const alpha = bond.handTimer > 0 ? 0.9 : 0.24;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = bond.handTimer > 0 ? "#ffe7a0" : "#ffaad4";
    ctx.lineWidth = bond.handTimer > 0 ? 5 : 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(joku.x + 14 * joku.facing, joku.y - 8);
    ctx.bezierCurveTo((joku.x + jolie.x) / 2, Math.min(joku.y, jolie.y) - 62, (joku.x + jolie.x) / 2, Math.min(joku.y, jolie.y) - 62, jolie.x + 14 * jolie.facing, jolie.y - 8);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHero(hero) {
  const t = elapsed * 8;
  const walk = Math.sin(t + hero.x * 0.04) * Math.min(1, Math.abs(hero.vx) / 160);
  ctx.save();
  ctx.translate(hero.x, hero.y);
  if (state === "playing" && hero.id === activeHeroId) {
    ctx.save();
    ctx.globalAlpha = 0.62 + Math.sin(elapsed * 5) * 0.12;
    ctx.strokeStyle = hero.colors.glow;
    ctx.fillStyle = hero.colors.glow;
    ctx.shadowBlur = 18;
    ctx.shadowColor = hero.colors.glow;
    ctx.beginPath();
    ctx.ellipse(0, 46, 38, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -5, 53, -0.2, Math.PI * 1.2);
    ctx.stroke();
    ctx.restore();
  }
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
  ctx.shadowBlur = 22;
  ctx.shadowColor = colors.glow;
  drawPhoenixWings(hero);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#101925";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 18);
  ctx.lineTo(-15 + walk * 5, 38);
  ctx.moveTo(10, 18);
  ctx.lineTo(15 - walk * 5, 38);
  ctx.stroke();

  ctx.strokeStyle = "#73e7ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-15 + walk * 5, 38);
  ctx.lineTo(-22 + walk * 4, 42);
  ctx.moveTo(15 - walk * 5, 38);
  ctx.lineTo(22 - walk * 4, 42);
  ctx.stroke();

  const tailGrad = ctx.createLinearGradient(-26, -18, 26, 34);
  tailGrad.addColorStop(0, "#0e376f");
  tailGrad.addColorStop(0.48, colors.coat);
  tailGrad.addColorStop(1, "#6fe7ff");
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(-18, -14);
  ctx.quadraticCurveTo(-34, 12, -22, 46);
  ctx.quadraticCurveTo(-5, 33, 0, 18);
  ctx.quadraticCurveTo(5, 33, 22, 46);
  ctx.quadraticCurveTo(34, 12, 18, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(216, 248, 255, 0.65)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const coatGrad = ctx.createLinearGradient(-18, -30, 18, 24);
  coatGrad.addColorStop(0, "#2d6ec1");
  coatGrad.addColorStop(0.58, colors.coat);
  coatGrad.addColorStop(1, "#0c2b5b");
  ctx.fillStyle = coatGrad;
  roundedRect(-18, -28, 36, 52, 10);
  ctx.fill();
  ctx.strokeStyle = "#ffd36c";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.fillStyle = "#f7fbff";
  ctx.beginPath();
  ctx.moveTo(-8, -26);
  ctx.lineTo(9, -26);
  ctx.lineTo(2, 16);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffe7a0";
  roundedRect(-20, -7, 40, 7, 4);
  ctx.fill();
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(0, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.bezierCurveTo(7, -1, 5, 6, 0, 9);
  ctx.bezierCurveTo(-5, 6, -7, -1, 0, -9);
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
  ctx.strokeStyle = "#d8f8ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(25, 5 - walk * 5);
  ctx.quadraticCurveTo(42, -5, 51, -24);
  ctx.stroke();
  ctx.fillStyle = "#7deeff";
  ctx.beginPath();
  ctx.ellipse(53, -28, 7, 15, -0.5, 0, Math.PI * 2);
  ctx.fill();
  drawHead(colors.skin, colors.hair, colors.accent, "joku");
  ctx.restore();
}

function drawPhoenixWings(hero) {
  const flap = Math.sin(elapsed * 5) * 5 + (hero.castPose > 0 ? 8 : 0);
  ctx.save();
  ctx.globalAlpha = 0.9;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    for (let i = 0; i < 9; i += 1) {
      const length = 48 + i * 8;
      const y = -28 + i * 7 + flap * 0.24;
      const feather = ctx.createLinearGradient(0, -35, -length, y + 10);
      feather.addColorStop(0, "rgba(255, 255, 255, 0.92)");
      feather.addColorStop(0.3, "rgba(119, 238, 255, 0.88)");
      feather.addColorStop(1, "rgba(31, 116, 227, 0.16)");
      ctx.fillStyle = feather;
      ctx.strokeStyle = i % 2 ? "rgba(216, 248, 255, 0.72)" : "rgba(100, 232, 255, 0.9)";
      ctx.lineWidth = i < 3 ? 2.4 : 1.5;
      ctx.beginPath();
      ctx.moveTo(4, -20);
      ctx.quadraticCurveTo(-34 - i * 8, y - 42 - flap, -length, y);
      ctx.quadraticCurveTo(-38 - i * 6, y + 9, 0, -4);
      ctx.fill();
      ctx.stroke();
      if (i % 3 === 0) drawTinySparkle(-length * 0.62, y - 8, 3.5, "#d8f8ff");
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.quadraticCurveTo(-52, -64 - flap, -112, 6);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawJolie(hero, walk) {
  const colors = hero.colors;
  ctx.save();
  ctx.shadowBlur = 18;
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

  ctx.fillStyle = "rgba(255, 190, 220, 0.45)";
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * 9, 19, 9, 27, i * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  const dressGrad = ctx.createLinearGradient(0, -32, 0, 34);
  dressGrad.addColorStop(0, "#ffd5e8");
  dressGrad.addColorStop(0.32, colors.coat);
  dressGrad.addColorStop(1, "#bf3d86");
  ctx.fillStyle = dressGrad;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(24, 20);
  ctx.quadraticCurveTo(0, 34, -24, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff0a7";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.moveTo(-13, -24);
  ctx.lineTo(13, -24);
  ctx.lineTo(6, 10);
  ctx.lineTo(-7, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff5a2";
  ctx.beginPath();
  ctx.arc(0, -12, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff2a7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -8, 13, 0.1, Math.PI - 0.1);
  ctx.stroke();

  drawArm(-16, -12, -30, 0 + walk * 4, colors.skin, colors.coat);
  drawArm(16, -12, 31, 5 - walk * 6, colors.skin, colors.coat);
  ctx.strokeStyle = "#78e09c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(29, 6 - walk * 6);
  ctx.quadraticCurveTo(44, -8, 53, -31);
  ctx.stroke();
  drawSmallFlower(55, -35, 8, "#ff96c9");
  drawHead(colors.skin, colors.hair, colors.accent, "jolie");
  ctx.restore();
}

function drawPetalAura() {
  ctx.save();
  for (let i = 0; i < 12; i += 1) {
    const angle = elapsed * 1.35 + i * 0.62;
    const x = Math.cos(angle) * (36 + Math.sin(elapsed + i) * 7);
    const y = -13 + Math.sin(angle) * 50;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.48 + (i % 3) * 0.08;
    ctx.fillStyle = i % 2 ? "#ffd0e5" : "#ff80bd";
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5 + (i % 3), 10 + (i % 4), 0, 0, Math.PI * 2);
    ctx.fill();
    if (i % 4 === 0) drawTinySparkle(0, -12, 3, "#fff5a2");
    ctx.restore();
  }
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#78e09c";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -9, 44, -0.3, Math.PI * 1.15);
  ctx.stroke();
  ctx.restore();
}

function drawArm(sx, sy, ex, ey, skin, sleeve) {
  ctx.strokeStyle = "rgba(24, 12, 26, 0.45)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo((sx + ex) / 2, sy + 12, ex, ey);
  ctx.stroke();
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo((sx + ex) / 2, sy + 12, ex, ey);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx + 1, sy - 1);
  ctx.quadraticCurveTo((sx + ex) / 2, sy + 7, ex - 1, ey - 1);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(ex, ey, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(skin, hair, accent, heroId) {
  const skinGrad = ctx.createRadialGradient(-6, -56, 3, 0, -50, 20);
  skinGrad.addColorStop(0, "#fff2da");
  skinGrad.addColorStop(0.58, skin);
  skinGrad.addColorStop(1, "#d99c83");
  ctx.fillStyle = skinGrad;
  ctx.beginPath();
  ctx.arc(0, -50, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 130, 160, 0.28)";
  ctx.beginPath();
  ctx.ellipse(-9, -47, 4, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(10, -47, 4, 2, 0, 0, Math.PI * 2);
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

  ctx.strokeStyle = heroId === "joku" ? "#4bdfff" : "#ffadd4";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  if (heroId === "joku") {
    ctx.moveTo(-13, -61);
    ctx.quadraticCurveTo(-2, -70, 11, -61);
  } else {
    ctx.moveTo(-10, -63);
    ctx.quadraticCurveTo(5, -72, 18, -58);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#13202a";
  ctx.beginPath();
  ctx.ellipse(-6, -51, 2.4, 3.2, 0, 0, Math.PI * 2);
  ctx.ellipse(7, -51, 2.4, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-6.8, -52.2, 0.8, 0, Math.PI * 2);
  ctx.arc(6.2, -52.2, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8c5b4f";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(1, -46, 5, 0.15, Math.PI - 0.15);
  ctx.stroke();

  if (heroId === "jolie") {
    drawSmallFlower(14, -66, 6, accent);
    drawSmallFlower(4, -68, 4.2, "#ffd0e5");
    ctx.strokeStyle = "#fff2a7";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(5, -64, 15, Math.PI * 1.1, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-16, -61);
    ctx.lineTo(-3, -70);
    ctx.lineTo(-8, -55);
    ctx.closePath();
    ctx.fill();
    drawTinySparkle(-9, -65, 3.5, "#d8f8ff");
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

function drawTinySparkle(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.35);
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();
  ctx.restore();
}

function drawSupporter(hero) {
  if (hero.id === "joku") drawBlueDog(hero.supporter.x, hero.supporter.y, hero.facing, hero.colors.support);
  else drawPinkPanda(hero.supporter.x, hero.supporter.y, hero.facing, hero.colors.support);
}

function drawBlueDog(x, y, facing, color) {
  ctx.save();
  ctx.translate(x, y + Math.sin(elapsed * 8) * 3);
  ctx.scale(facing, 1);
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  const body = ctx.createLinearGradient(-25, -16, 28, 14);
  body.addColorStop(0, "#d9f8ff");
  body.addColorStop(0.34, color);
  body.addColorStop(1, "#2d87d9");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(21, -8, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.78;
  ctx.beginPath();
  ctx.ellipse(-7, 2, 9, 7, 0.1, 0, Math.PI * 2);
  ctx.ellipse(19, -5, 7, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

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

  ctx.fillStyle = "#1d76c8";
  ctx.beginPath();
  ctx.ellipse(-2, -6, 10, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd36c";
  roundedRect(-9, -12, 14, 7, 3);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-22, -1);
  ctx.quadraticCurveTo(-38, -18, -28, -28);
  ctx.stroke();
  ctx.strokeStyle = "#e7fbff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-23, 0);
  ctx.quadraticCurveTo(-34, -14, -28, -24);
  ctx.stroke();

  ctx.fillStyle = "#0f3150";
  for (const px of [-13, 0, 13]) {
    ctx.beginPath();
    ctx.ellipse(px, 13, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#061a24";
  ctx.beginPath();
  ctx.arc(25, -10, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(24.2, -11, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(30, -4, 5, 0.1, Math.PI - 0.1);
  ctx.stroke();
  drawTinySparkle(8, -19, 3, "#d8f8ff");
  ctx.restore();
}

function drawPinkPanda(x, y, facing, color) {
  ctx.save();
  ctx.translate(x, y + Math.sin(elapsed * 7 + 1) * 3);
  ctx.scale(facing, 1);
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  const body = ctx.createRadialGradient(10, -16, 4, 0, 0, 32);
  body.addColorStop(0, "#fff7fb");
  body.addColorStop(0.55, "#ffd8e8");
  body.addColorStop(1, "#ff9ccc");
  ctx.fillStyle = body;
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

  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(-4, 2, 8, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#ff7fba";
  roundedRect(-18, -6, 12, 16, 5);
  ctx.fill();
  ctx.fillStyle = "#ffe59a";
  ctx.beginPath();
  drawHeartPath(-12, 0, 4);
  ctx.fill();

  ctx.fillStyle = "#301622";
  ctx.beginPath();
  ctx.arc(14, -18, 2, 0, Math.PI * 2);
  ctx.arc(25, -18, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(13.4, -18.8, 0.6, 0, Math.PI * 2);
  ctx.arc(24.4, -18.8, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#301622";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(20, -12, 5, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = "#ff72b2";
  for (const px of [-10, 3, 14]) {
    ctx.beginPath();
    ctx.ellipse(px, 17, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawSmallFlower(-9, -2, 5, "#ff89c2");
  drawSmallFlower(4, -26, 4, "#ffd0e5");
  drawTinySparkle(30, -8, 3, "#fff5a2");
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
    } else if (effect.type === "tidal-ring" || effect.type === "bloom-ring" || effect.type === "boss-ring") {
      const color = effect.color || (effect.type === "tidal-ring" ? "#72edff" : effect.type === "boss-ring" ? "#ff6fae" : "#ff94ca");
      ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = effect.type === "boss-ring" ? 7 : effect.type === "tidal-ring" ? 5 : 4;
      ctx.shadowBlur = 30;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(0, 0, (effect.type === "boss-ring" ? 62 : 18) + age * 112, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.34;
      ctx.beginPath();
      ctx.arc(0, 0, (effect.type === "boss-ring" ? 92 : 44) + age * 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = clamp(effect.life / effect.max, 0, 1);
      if (effect.type === "boss-ring") {
        ctx.lineWidth = 3;
        for (let i = 0; i < 12; i += 1) {
          const a = (Math.PI * 2 * i) / 12 + elapsed;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 44, Math.sin(a) * 30);
          ctx.lineTo(Math.cos(a) * (108 + age * 72), Math.sin(a) * (70 + age * 44));
          ctx.stroke();
        }
      }
      if (effect.type === "bloom-ring") {
        for (let i = 0; i < 10; i += 1) {
          const a = (Math.PI * 2 * i) / 10 + elapsed * 1.4;
          drawSmallFlower(Math.cos(a) * (38 + age * 75), Math.sin(a) * (24 + age * 45), 4.5, color);
        }
      }
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
  const map = mapById(currentMapId);
  ctx.globalAlpha = 0.5;
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
  ctx.globalAlpha = 0.76;
  for (let i = 0; i < 18; i += 1) {
    const x = view.x + ((i * 145 - view.x * 0.55) % (view.width + 220)) - 80;
    const y = world.height - 28 + Math.sin(elapsed * 1.2 + i) * 4;
    const color = i % 2 ? map.bloom : map.accent;
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    if (map.id === "crystal") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + 18);
      ctx.lineTo(x + 8, y - 34);
      ctx.lineTo(x + 20, y + 18);
      ctx.closePath();
      ctx.fill();
    } else if (i % 3 === 0) {
      drawSmallFlower(x, y - 14, 7, color);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
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
  addParticle(p.x - p.vx * 0.012, p.y - p.vy * 0.012, p.type === "paw-blue" ? "#aeefff" : "#78eaff", 0.35, { vx: rand(-18, 18), vy: rand(-18, 18), size: rand(2, 5), glow: 8 });
}

function burst(x, y, color, count, force) {
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(force * 0.25, force);
    addParticle(x, y, color, rand(0.45, 0.95), { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: rand(2, 6), gravity: rand(20, 80), glow: 12, shape: Math.random() > 0.5 ? "petal" : "spark" });
  }
}

function spray(x, y, color, count, facing) {
  for (let i = 0; i < count; i += 1) {
    addParticle(x, y, color, rand(0.3, 0.7), { vx: facing * rand(70, 240), vy: rand(-90, 70), size: rand(2, 5), gravity: 60, glow: 8 });
  }
}

function addParticle(x, y, color, life, options = {}) {
  particles.push({ x, y, vx: options.vx || 0, vy: options.vy || 0, life, maxLife: life, color, size: options.size || 3, gravity: options.gravity || 0, glow: options.glow || 0, shape: options.shape || "spark", spin: rand(0, Math.PI * 2), spinSpeed: rand(-4, 4) });
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
  const map = mapById(currentMapId);
  const sceneIndex = clamp(Math.floor(progress * map.stages.length), 0, map.stages.length - 1);
  ui.sceneName.textContent = map.stages[sceneIndex] || map.name;
  const boss = getBoss();
  const bossVisible = state === "playing" && boss && boss.alive && (boss.hp < boss.maxHp || Math.max(heroes.joku.x, heroes.jolie.x) > boss.x - view.width * 1.15);
  ui.bossHud.classList.toggle("show", Boolean(bossVisible));
  ui.bossHud.setAttribute("aria-hidden", bossVisible ? "false" : "true");
  if (boss) {
    ui.bossName.textContent = boss.name;
    ui.bossHp.style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
  }
  updateRoleBadge();
  updateTouchButtons();
  ui.musicButton.classList.toggle("active", music.on);
}

function updateRoleBadge() {
  ui.roleBadge.classList.toggle("joku", net.role === "host");
  ui.roleBadge.classList.toggle("jolie", net.role === "guest");
  if (net.role === "host") {
    ui.roleBadge.textContent = net.players.guest
      ? "Joku phone - ocean phoenix host"
      : `Joku phone - hosting code ${net.code}`;
    return;
  }
  if (net.role === "guest") {
    ui.roleBadge.textContent = "Jolie phone - flower power guest";
    return;
  }
  if (state === "playing") {
    ui.roleBadge.textContent = `Solo test - ${activeHeroId === "joku" ? "Joku" : "Jolie"} leads`;
    return;
  }
  ui.roleBadge.textContent = `Room code ${ui.roomCode.value || "1234567"}`;
}

function updateTouchButtons() {
  for (const button of ui.touchButtons) {
    const action = button.dataset.action;
    const isSwitch = action === "switch";
    button.disabled = isSwitch ? net.role !== "solo" || state !== "playing" : state !== "playing";
    if (isSwitch) {
      button.setAttribute("aria-label", net.role === "solo" ? "Switch active hero" : "Online mode locks each phone to its hero");
    }
  }
}

async function connectRoom(role) {
  const code = sanitizeCode(ui.roomCode.value);
  ui.roomCode.value = code;
  net.code = code;
  closeSocket();
  const health = await checkServerHealth();
  if (!health.ok) {
    ui.lobbyStatus.textContent = health.message;
    showToast("Host needs the Node server.");
    return;
  }
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${location.host}`;
  try {
    const ws = new WebSocket(wsUrl);
    let opened = false;
    net.ws = ws;
    net.role = role;
    ui.lobbyStatus.textContent = role === "host" ? `Hosting room ${code}...` : `Joining room ${code}...`;
    ws.addEventListener("open", () => {
      opened = true;
      net.connected = true;
      ws.send(JSON.stringify({ type: role, code }));
    });
    ws.addEventListener("message", (event) => handleNetMessage(JSON.parse(event.data)));
    ws.addEventListener("close", () => {
      net.connected = false;
      if (!opened) {
        ui.lobbyStatus.textContent = "Room server refused the connection. Start with node server.mjs, then reload.";
        return;
      }
      if (state !== "menu" && net.role !== "solo") showToast("Room connection closed.");
    });
    ws.addEventListener("error", () => {
      ui.lobbyStatus.textContent = "Could not connect. Run with npm start or node server.mjs.";
    });
  } catch {
    ui.lobbyStatus.textContent = "Could not connect. Run with npm start or node server.mjs.";
  }
}

async function checkServerHealth() {
  if (location.protocol === "file:" || !location.host) {
    return { ok: false, message: "Host/join cannot work from a file. Run node server.mjs and open http://127.0.0.1:5173/." };
  }
  try {
    const response = await fetch("/health", { cache: "no-store" });
    if (!response.ok) throw new Error("Health endpoint missing");
    const data = await response.json();
    serverConfig.checked = true;
    serverConfig.websocket = Boolean(data.websocket);
    return data.websocket
      ? { ok: true }
      : { ok: false, message: "This server does not support game rooms. Run node server.mjs." };
  } catch {
    return { ok: false, message: "Host/join needs the Jolie Joku Node server. Run node server.mjs, not a static server." };
  }
}

async function loadServerConfig() {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    serverConfig.checked = true;
    serverConfig.websocket = Boolean(data.websocket);
    serverConfig.lanUrls = Array.isArray(data.lanUrls) ? data.lanUrls : [];
  } catch {
    serverConfig.checked = true;
  }
}

function handleNetMessage(message) {
  if (message.type === "error") {
    ui.lobbyStatus.textContent = message.message;
    showToast(message.message);
    return;
  }
  if (message.type === "hosted" || message.type === "joined") {
    net.role = message.role;
    net.code = message.code;
    net.players = message.players || net.players;
    selectedMapId = message.selectedMap || selectedMapId;
    showMapSelect(playerStatusText());
    return;
  }
  if (message.type === "room") {
    net.players = message.players || net.players;
    if (message.selectedMap) selectMap(message.selectedMap, false);
    if (state === "map") ui.playerStatus.textContent = playerStatusText();
    return;
  }
  if (message.type === "mapSelected") {
    selectMap(message.mapId, false);
    return;
  }
  if (message.type === "startMap") {
    resetGame(message.mapId);
    return;
  }
  if (message.type === "input" && net.role === "host") {
    net.remoteInput = { ...emptyInput(), ...message.input };
    return;
  }
  if (message.type === "snapshot" && net.role === "guest") {
    applySnapshot(message.snapshot);
    return;
  }
  if (message.type === "roomClosed") {
    showLobby(message.message || "Room closed.");
  }
  if (message.type === "backToMap") {
    showMapSelect("Host returned to map select.");
  }
}

function updateNetwork(dt) {
  if (net.role === "guest" && state === "playing" && net.connected) {
    net.inputTimer -= dt;
    if (net.inputTimer <= 0) {
      net.inputTimer = 1 / 24;
      sendNet({ type: "input", input: readAssignedInput() });
    }
  }
  if (net.role === "host" && state === "playing" && net.connected) {
    net.snapshotTimer -= dt;
    if (net.snapshotTimer <= 0) {
      net.snapshotTimer = 1 / 12;
      sendNet({ type: "snapshot", snapshot: makeSnapshot() });
    }
  }
}

function makeSnapshot() {
  return {
    mapId: currentMapId,
    elapsed,
    worldWidth: world.width,
    viewX: view.x,
    viewY: view.y,
    state,
    bond: { ...bond },
    heroes: {
      joku: pickHero(heroes.joku),
      jolie: pickHero(heroes.jolie)
    },
    enemies: enemies.map((enemy) => ({ id: enemy.id, type: enemy.type, x: enemy.x, y: enemy.y, baseY: enemy.baseY, facing: enemy.facing, hp: enemy.hp, alive: enemy.alive, hurt: enemy.hurt, snared: enemy.snared })),
    orbs: orbs.map((orb) => ({ id: orb.id, taken: orb.taken })),
    hazards: hazards.slice(0, 18).map((h) => ({ type: h.type, x: h.x, y: h.y, r: h.r, life: h.life, tick: h.tick, color: h.color, power: h.power })),
    effects: effects.slice(0, 24).map((e) => ({ type: e.type, x: e.x, y: e.y, life: e.life, max: e.max, color: e.color, facing: e.facing })),
    projectiles: projectiles.slice(0, 18).map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, r: p.r, life: p.life, type: p.type, owner: p.owner, color: p.color }))
  };
}

function pickHero(hero) {
  return {
    x: hero.x,
    y: hero.y,
    vx: hero.vx,
    vy: hero.vy,
    facing: hero.facing,
    hp: hero.hp,
    mana: hero.mana,
    shield: hero.shield,
    invulnerable: hero.invulnerable,
    castPose: hero.castPose,
    hurtPose: hero.hurtPose,
    romancePose: hero.romancePose
  };
}

function applySnapshot(snapshot) {
  if (!snapshot) return;
  if (snapshot.mapId && snapshot.mapId !== currentMapId) resetGame(snapshot.mapId);
  net.lastSnapshotAt = Date.now();
  elapsed = snapshot.elapsed || elapsed;
  world.width = snapshot.worldWidth || world.width;
  Object.assign(bond, snapshot.bond || {});
  applyHero(heroes.joku, snapshot.heroes?.joku);
  applyHero(heroes.jolie, snapshot.heroes?.jolie);
  for (const incoming of snapshot.enemies || []) {
    const enemy = enemies.find((item) => item.id === incoming.id);
    if (enemy) Object.assign(enemy, incoming);
  }
  for (const incoming of snapshot.orbs || []) {
    const orb = orbs.find((item) => item.id === incoming.id);
    if (orb) orb.taken = incoming.taken;
  }
  hazards = (snapshot.hazards || []).map((h) => ({ ...h }));
  effects.length = 0;
  effects.push(...(snapshot.effects || []).map((effect) => ({ ...effect })));
  projectiles = (snapshot.projectiles || []).map((p) => ({ ...p, damage: 0 }));
}

function applyHero(hero, incoming) {
  if (!incoming) return;
  Object.assign(hero, incoming);
}

function sendNet(payload) {
  if (net.ws?.readyState === WebSocket.OPEN) net.ws.send(JSON.stringify(payload));
}

function closeSocket() {
  if (net.ws) net.ws.close();
  net.ws = null;
  net.connected = false;
}

function sanitizeCode(code) {
  return String(code || "1234567").replace(/[^\w-]/g, "").slice(0, 12) || "1234567";
}

function setupMusic() {
  if (music.ctx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  music.ctx = new AudioContext();
  music.master = music.ctx.createGain();
  music.master.gain.value = 0.12;
  music.master.connect(music.ctx.destination);
}

function startMusic() {
  setupMusic();
  if (!music.ctx) return;
  music.ctx.resume();
  music.on = true;
  music.nextTime = music.ctx.currentTime;
}

function toggleMusic() {
  setupMusic();
  if (!music.ctx) return;
  music.on = !music.on;
  if (music.on) {
    music.ctx.resume();
    music.nextTime = music.ctx.currentTime;
    showToast("Music on.");
  } else {
    showToast("Music off.");
  }
}

function updateMusic() {
  if (!music.on || !music.ctx || !music.master) return;
  const now = music.ctx.currentTime;
  const map = mapById(currentMapId);
  while (music.nextTime < now + 0.28) {
    scheduleMusicStep(map, music.nextTime, music.step);
    music.step += 1;
    music.nextTime += 0.28;
  }
}

function scheduleMusicStep(map, time, step) {
  const root = map.musicRoot;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  const chordRoots = [0, 5, 3, 7];
  const chord = chordRoots[Math.floor(step / 8) % chordRoots.length];
  if (step % 2 === 0) playTone(root * interval(chord - 12), time, 0.54, "sine", 0.09);
  const note = scale[(step + Math.floor(step / 8)) % scale.length] + chord;
  playTone(root * interval(note), time + 0.02, 0.18, "triangle", 0.045);
  if (step % 4 === 2) playTone(root * interval(note + 12), time + 0.07, 0.22, "sine", 0.035);
  if (step % 8 === 0) playNoise(time, 0.13, 0.035);
}

function interval(semitones) {
  return 2 ** (semitones / 12);
}

function playTone(freq, start, duration, type, gain) {
  const osc = music.ctx.createOscillator();
  const amp = music.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.025);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(music.master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playNoise(start, duration, gain) {
  const buffer = music.ctx.createBuffer(1, music.ctx.sampleRate * duration, music.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = music.ctx.createBufferSource();
  const amp = music.ctx.createGain();
  source.buffer = buffer;
  amp.gain.value = gain;
  source.connect(amp);
  amp.connect(music.master);
  source.start(start);
}

function setupEvents() {
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    if (!keys.has(event.code)) justPressed.add(event.code);
    keys.add(event.code);
    if (event.code === "Enter" && state === "menu") {
      net.role = "solo";
      showMapSelect("Offline test mode. Choose any chapter.");
    }
    if (event.code === "Tab" && net.role === "solo") {
      event.preventDefault();
      activeHeroId = activeHeroId === "joku" ? "jolie" : "joku";
      showToast(`${activeHeroId === "joku" ? "Joku" : "Jolie"} leads.`);
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  ui.hostButton.addEventListener("click", () => connectRoom("host"));
  ui.joinButton.addEventListener("click", () => connectRoom("join"));
  ui.offlineButton.addEventListener("click", () => {
    closeSocket();
    net.role = "solo";
    net.players = { host: true, guest: true };
    showMapSelect("Offline test mode. Choose any chapter.");
  });
  ui.startMap.addEventListener("click", () => {
    if (net.role === "guest") return;
    if (net.role === "host") sendNet({ type: "startMap", mapId: selectedMapId });
    resetGame(selectedMapId);
  });
  ui.backToLobby.addEventListener("click", () => showLobby());
  ui.restart.addEventListener("click", () => {
    if (state === "playing" || state === "complete") resetGame(currentMapId);
    else showMapSelect();
  });
  ui.musicButton.addEventListener("click", toggleMusic);
  ui.journalButton.addEventListener("click", openJournal);
  ui.menuJournal.addEventListener("click", openJournal);
  ui.closeJournal.addEventListener("click", closeJournal);
  ui.roomCode.addEventListener("input", () => {
    ui.roomCode.value = sanitizeCode(ui.roomCode.value);
    ui.lobbyStatus.textContent = `Ready to create or join room ${ui.roomCode.value || "1234567"}.`;
  });
  for (const tab of ui.tabs) tab.addEventListener("click", () => setTab(tab.dataset.tab));
  for (const button of ui.touchButtons) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handleTouchAction(button.dataset.action);
    });
  }
  setupJoystick();
}

function isGameKey(code) {
  return ["KeyA", "KeyD", "KeyW", "KeyF", "KeyG", "KeyH", "KeyK", "KeyL", "KeyP", "KeyQ", "KeyB", "ArrowLeft", "ArrowRight", "ArrowUp", "Tab", "Space", "Enter"].includes(code);
}

function handleTouchAction(action) {
  if (state !== "playing" && action !== "switch") return;
  if (action === "switch") {
    if (net.role !== "solo") return;
    activeHeroId = activeHeroId === "joku" ? "jolie" : "joku";
    showToast(`${activeHeroId === "joku" ? "Joku" : "Jolie"} leads.`);
    return;
  }
  if (action === "skill1") queuedActions.primary = true;
  if (action === "skill2") queuedActions.secondary = true;
  if (action === "support") queuedActions.support = true;
  if (action === "bond") queuedActions.bond = true;
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
    if (state !== "playing") return;
    mobile.pointerId = event.pointerId;
    mobile.active = true;
    activeHeroId = net.role === "guest" ? "jolie" : net.role === "host" ? "joku" : activeHeroId;
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
renderMapCards();
buildWorld(currentMapId);
setupEvents();
loadServerConfig();
showLobby();
startLoop();

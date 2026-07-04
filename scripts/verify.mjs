import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = process.argv[2] || "http://127.0.0.1:5173/";
const rootDir = new URL("../", import.meta.url);
const outDir = new URL("tmp/", rootDir);
const profileDir = new URL(`tmp/chrome-profile-${Date.now()}/`, rootDir);
const profilePath = fileURLToPath(profileDir);
const port = 9237 + Math.floor(Math.random() * 500);

const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
];

const chromePath = chromeCandidates.find((path) => existsSync(path));
if (!chromePath) {
  throw new Error("Chrome or Edge was not found.");
}

await mkdir(outDir, { recursive: true });
await mkdir(profileDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`,
  "about:blank"
], { stdio: "ignore" });

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.handleMessage(event));
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
      return;
    }
    for (const listener of this.listeners) listener(message);
  }

  async send(method, params = {}, sessionId) {
    await this.ready;
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.ws.send(JSON.stringify(payload));
    return promise;
  }

  onEvent(callback) {
    this.listeners.push(callback);
  }

  waitFor(method, sessionId, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter((listener) => listener !== handler);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const handler = (message) => {
        if (message.method === method && (!sessionId || message.sessionId === sessionId)) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter((listener) => listener !== handler);
          resolve(message.params || {});
        }
      };
      this.listeners.push(handler);
    });
  }

  close() {
    this.ws.close();
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForVersion() {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {
      await delay(120);
    }
  }
  throw new Error("Chrome remote debugging did not start.");
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Evaluation failed");
  }
  return result.result?.value;
}

async function press(client, sessionId, code) {
  await evaluate(client, sessionId, `
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "${code}", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "${code}", bubbles: true }));
    true;
  `);
}

async function createPage(client, viewport, label, errors) {
  const target = await client.send("Target.createTarget", { url: "about:blank" });
  const attached = await client.send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true
  });
  const sessionId = attached.sessionId;
  client.onEvent((message) => {
    if (message.sessionId !== sessionId) return;
    if (message.method === "Runtime.exceptionThrown") {
      errors.push(`${label} exception: ${message.params.exceptionDetails.text}`);
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      errors.push(`${label} log: ${message.params.entry.text}`);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(`${label} console: ${message.params.args.map((arg) => arg.value || arg.description).join(" ")}`);
    }
  });
  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);
  await client.send("Log.enable", {}, sessionId);
  await client.send("Emulation.setDeviceMetricsOverride", viewport, sessionId);
  const loaded = client.waitFor("Page.loadEventFired", sessionId, 9000);
  await client.send("Page.navigate", { url }, sessionId);
  await loaded;
  await delay(1000);
  return sessionId;
}

async function screenshot(client, sessionId, filename) {
  const result = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true }, sessionId);
  await writeFile(new URL(filename, outDir), Buffer.from(result.data, "base64"));
}

const errors = [];
let client;

try {
  const version = await waitForVersion();
  client = new CdpClient(version.webSocketDebuggerUrl);

  const host = await createPage(client, {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  }, "host", errors);

  const desktopLoad = await evaluate(client, host, `(() => {
    const canvas = document.getElementById("gameCanvas");
    const nodes = [...document.querySelectorAll(".hero-card, .stage-card")];
    const rects = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const overlaps = [];
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([i, j]);
      }
    }
    return {
      title: document.title,
      canvas: { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight },
      menuVisible: !document.getElementById("menuOverlay").classList.contains("hidden"),
      hostButton: Boolean(document.getElementById("hostButton")),
      joinButton: Boolean(document.getElementById("joinButton")),
      heroCards: document.querySelectorAll(".hero-card").length,
      overlaps
    };
  })()`);

  await evaluate(client, host, `document.getElementById("hostButton").click(); true;`);
  await delay(700);

  const guest = await createPage(client, {
    width: 1180,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  }, "guest", errors);
  await evaluate(client, guest, `document.getElementById("joinButton").click(); true;`);
  await delay(900);

  const lobbyState = await evaluate(client, host, `(() => ({
    hostMapVisible: !document.getElementById("mapOverlay").classList.contains("hidden"),
    roomBadge: document.getElementById("roomBadge").textContent,
    playerStatus: document.getElementById("playerStatus").textContent,
    selectedCards: document.querySelectorAll(".map-card.selected").length,
    mapCards: document.querySelectorAll(".map-card").length
  }))()`);

  await evaluate(client, host, `document.querySelector('[data-map-id="crystal"]').click(); true;`);
  await delay(350);
  const guestMapState = await evaluate(client, guest, `(() => ({
    mapVisible: !document.getElementById("mapOverlay").classList.contains("hidden"),
    selectedMap: document.querySelector(".map-card.selected")?.dataset.mapId,
    startDisabled: document.getElementById("startSelectedMapButton").disabled,
    playerStatus: document.getElementById("playerStatus").textContent
  }))()`);

  await evaluate(client, host, `document.getElementById("startSelectedMapButton").click(); true;`);
  await delay(1600);
  await press(client, host, "KeyF");
  await press(client, guest, "KeyK");
  await press(client, host, "KeyG");
  await press(client, guest, "KeyL");
  await press(client, host, "KeyB");
  await delay(1600);

  const hostPlay = await evaluate(client, host, `(() => {
    const canvas = document.getElementById("gameCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const data = context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 14, 14).data;
    let energy = 0;
    for (let i = 0; i < data.length; i += 4) energy += data[i] + data[i + 1] + data[i + 2];
    return {
      menuHidden: document.getElementById("menuOverlay").classList.contains("hidden"),
      mapHidden: document.getElementById("mapOverlay").classList.contains("hidden"),
      sceneName: document.getElementById("sceneName").textContent,
      bondText: document.getElementById("bondText").textContent,
      toastText: document.getElementById("toast").textContent,
      canvasEnergy: energy
    };
  })()`);

  const guestPlay = await evaluate(client, guest, `(() => {
    const canvas = document.getElementById("gameCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const data = context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 14, 14).data;
    let energy = 0;
    for (let i = 0; i < data.length; i += 4) energy += data[i] + data[i + 1] + data[i + 2];
    return {
      menuHidden: document.getElementById("menuOverlay").classList.contains("hidden"),
      mapHidden: document.getElementById("mapOverlay").classList.contains("hidden"),
      sceneName: document.getElementById("sceneName").textContent,
      bondText: document.getElementById("bondText").textContent,
      canvasEnergy: energy
    };
  })()`);

  await evaluate(client, host, `document.getElementById("journalButton").click(); true;`);
  await delay(350);
  const journalState = await evaluate(client, host, `(() => ({
    open: document.getElementById("journalPanel").classList.contains("open"),
    tabs: [...document.querySelectorAll(".tabs button")].map((button) => button.textContent.trim()),
    activePanel: document.querySelector(".journal-content.active")?.dataset.panel
  }))()`);
  await screenshot(client, host, "verify-host.png");
  await screenshot(client, guest, "verify-guest.png");

  const mobileHost = await createPage(client, {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  }, "mobile-host", errors);
  await evaluate(client, mobileHost, `document.getElementById("hostButton").click(); true;`);
  await delay(700);

  const mobileGuest = await createPage(client, {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  }, "mobile-guest", errors);
  await evaluate(client, mobileGuest, `document.getElementById("joinButton").click(); true;`);
  await delay(900);

  const mobileMapState = await evaluate(client, mobileHost, `(() => ({
    hostMapVisible: !document.getElementById("mapOverlay").classList.contains("hidden"),
    hostRole: document.getElementById("roleBadge").textContent,
    hostPlayerStatus: document.getElementById("playerStatus").textContent,
    hostTouchDisplay: getComputedStyle(document.getElementById("touchControls")).display
  }))()`);

  await evaluate(client, mobileHost, `document.querySelector('[data-map-id="heartfall"]').click(); true;`);
  await delay(250);
  await evaluate(client, mobileHost, `document.getElementById("startSelectedMapButton").click(); true;`);
  await delay(1500);
  await evaluate(client, mobileHost, `
    document.querySelector('[data-action="skill1"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 41 }));
    true;
  `);
  await evaluate(client, mobileGuest, `
    document.querySelector('[data-action="skill1"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 42 }));
    true;
  `);
  await delay(700);

  const mobileHostPlay = await evaluate(client, mobileHost, `(() => {
    const controls = document.getElementById("touchControls");
    const canvas = document.getElementById("gameCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const data = context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 14, 14).data;
    let energy = 0;
    for (let i = 0; i < data.length; i += 4) energy += data[i] + data[i + 1] + data[i + 2];
    const buttons = [...document.querySelectorAll(".skill-button")].map((button) => ({
      action: button.dataset.action,
      disabled: button.disabled
    }));
    return {
      mapHidden: document.getElementById("mapOverlay").classList.contains("hidden"),
      role: document.getElementById("roleBadge").textContent,
      touchDisplay: getComputedStyle(controls).display,
      switchDisabled: document.querySelector('[data-action="switch"]').disabled,
      buttons,
      canvasEnergy: energy
    };
  })()`);

  const mobileGuestPlay = await evaluate(client, mobileGuest, `(() => {
    const controls = document.getElementById("touchControls");
    const canvas = document.getElementById("gameCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const data = context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 14, 14).data;
    let energy = 0;
    for (let i = 0; i < data.length; i += 4) energy += data[i] + data[i + 1] + data[i + 2];
    return {
      mapHidden: document.getElementById("mapOverlay").classList.contains("hidden"),
      role: document.getElementById("roleBadge").textContent,
      touchDisplay: getComputedStyle(controls).display,
      switchDisabled: document.querySelector('[data-action="switch"]').disabled,
      skillDisabled: document.querySelector('[data-action="skill1"]').disabled,
      canvasEnergy: energy
    };
  })()`);

  const mobileLayoutState = await evaluate(client, mobileHost, `(() => {
    const hud = [...document.querySelectorAll(".hero-card, .stage-card, .network-role-badge")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
    });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      hud
    };
  })()`);
  await screenshot(client, mobileHost, "verify-mobile-host.png");
  await screenshot(client, mobileGuest, "verify-mobile-guest.png");

  const report = {
    url,
    chromePath,
    desktopLoad,
    lobbyState,
    guestMapState,
    hostPlay,
    guestPlay,
    journalState,
    mobileMapState,
    mobileHostPlay,
    mobileGuestPlay,
    mobileLayoutState,
    screenshots: [
      "tmp/verify-host.png",
      "tmp/verify-guest.png",
      "tmp/verify-mobile-host.png",
      "tmp/verify-mobile-guest.png"
    ],
    errors
  };
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  if (client) client.close();
  chrome.kill();
  await Promise.race([
    new Promise((resolve) => chrome.once("exit", resolve)),
    delay(1400)
  ]);
  await delay(200);
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}

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

  const desktop = await createPage(client, {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  }, "desktop", errors);

  const desktopLoad = await evaluate(client, desktop, `(() => {
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
      heroCards: document.querySelectorAll(".hero-card").length,
      overlaps
    };
  })()`);

  await evaluate(client, desktop, `document.getElementById("playButton").click(); true;`);
  await delay(1200);
  await press(client, desktop, "KeyF");
  await press(client, desktop, "KeyG");
  await press(client, desktop, "KeyH");
  await press(client, desktop, "KeyB");
  await delay(1200);

  const desktopPlay = await evaluate(client, desktop, `(() => {
    const canvas = document.getElementById("gameCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const data = context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 14, 14).data;
    let energy = 0;
    for (let i = 0; i < data.length; i += 4) energy += data[i] + data[i + 1] + data[i + 2];
    return {
      menuHidden: document.getElementById("menuOverlay").classList.contains("hidden"),
      sceneName: document.getElementById("sceneName").textContent,
      bondText: document.getElementById("bondText").textContent,
      toastText: document.getElementById("toast").textContent,
      canvasEnergy: energy
    };
  })()`);

  await evaluate(client, desktop, `document.getElementById("journalButton").click(); true;`);
  await delay(350);
  const journalState = await evaluate(client, desktop, `(() => ({
    open: document.getElementById("journalPanel").classList.contains("open"),
    tabs: [...document.querySelectorAll(".tabs button")].map((button) => button.textContent.trim()),
    activePanel: document.querySelector(".journal-content.active")?.dataset.panel
  }))()`);
  await screenshot(client, desktop, "verify-desktop.png");

  const mobile = await createPage(client, {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  }, "mobile", errors);
  const mobileState = await evaluate(client, mobile, `(() => {
    const controls = document.getElementById("touchControls");
    const hud = [...document.querySelectorAll(".hero-card, .stage-card")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
    });
    return {
      touchDisplay: getComputedStyle(controls).display,
      viewport: { width: innerWidth, height: innerHeight },
      hud
    };
  })()`);
  await screenshot(client, mobile, "verify-mobile.png");

  const report = {
    url,
    chromePath,
    desktopLoad,
    desktopPlay,
    journalState,
    mobileState,
    screenshots: [
      "tmp/verify-desktop.png",
      "tmp/verify-mobile.png"
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

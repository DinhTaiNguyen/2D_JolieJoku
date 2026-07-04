import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";

const root = resolve(".");
const port = Number(process.env.PORT || 5173);
const rooms = new Map();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    if (pathname === "/health") {
      sendJson(res, { ok: true, websocket: true, defaultCode: "1234567" });
      return;
    }
    if (pathname === "/config.json") {
      sendJson(res, { ok: true, websocket: true, defaultCode: "1234567", lanUrls: getLanUrls() });
      return;
    }
    const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = resolve(join(root, clean === "/" ? "index.html" : clean));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, "index.html");
    }
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error.message);
  }
});

server.on("upgrade", (req, socket) => {
  if (req.headers.upgrade?.toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }

  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const client = createWsClient(socket);
  client.onMessage = (message) => handleClientMessage(client, message);
  client.onClose = () => leaveRoom(client);
});

function createWsClient(socket) {
  const client = {
    socket,
    buffer: Buffer.alloc(0),
    roomCode: "",
    role: "",
    onMessage: null,
    onClose: null,
    send(payload) {
      if (socket.destroyed) return;
      const body = Buffer.from(JSON.stringify(payload));
      let header;
      if (body.length < 126) {
        header = Buffer.from([0x81, body.length]);
      } else if (body.length < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(body.length, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(body.length), 2);
      }
      socket.write(Buffer.concat([header, body]));
    }
  };

  socket.on("data", (chunk) => readFrames(client, chunk));
  socket.on("close", () => client.onClose?.());
  socket.on("error", () => client.onClose?.());
  return client;
}

function readFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);

  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (client.buffer.length < offset + 2) return;
      length = client.buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (client.buffer.length < offset + 8) return;
      length = Number(client.buffer.readBigUInt64BE(offset));
      offset += 8;
    }

    const maskOffset = offset;
    if (masked) offset += 4;
    if (client.buffer.length < offset + length) return;

    if (opcode === 0x8) {
      client.socket.end();
      return;
    }

    let payload = client.buffer.subarray(offset, offset + length);
    if (masked) {
      const mask = client.buffer.subarray(maskOffset, maskOffset + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }

    client.buffer = client.buffer.subarray(offset + length);
    if (opcode === 0x1) {
      client.onMessage?.(payload.toString("utf8"));
    }
  }
}

function handleClientMessage(client, raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    client.send({ type: "error", message: "Invalid message." });
    return;
  }

  if (message.type === "host") {
    const code = sanitizeCode(message.code);
    leaveRoom(client);
    const existing = rooms.get(code);
    if (existing?.host) {
      existing.host.socket.destroy();
      leaveRoom(existing.host);
    }
    const room = rooms.get(code) || createRoom(code);
    room.host = client;
    room.state = "map";
    client.roomCode = code;
    client.role = "host";
    client.send({ type: "hosted", code, role: "host", players: players(room) });
    broadcastRoom(room);
    return;
  }

  if (message.type === "join") {
    const code = sanitizeCode(message.code);
    leaveRoom(client);
    const room = rooms.get(code);
    if (!room?.host) {
      client.send({ type: "error", message: `Room ${code} is not hosted yet.` });
      return;
    }
    if (room.guest) {
      room.guest.socket.destroy();
      leaveRoom(room.guest);
    }
    room.guest = client;
    client.roomCode = code;
    client.role = "guest";
    client.send({ type: "joined", code, role: "guest", players: players(room), selectedMap: room.selectedMap });
    broadcastRoom(room);
    return;
  }

  const room = rooms.get(client.roomCode);
  if (!room) {
    client.send({ type: "error", message: "You are not in a room." });
    return;
  }

  if (message.type === "selectMap" && client.role === "host") {
    room.selectedMap = String(message.mapId || "heartfall");
    room.state = "map";
    relay(room, { type: "mapSelected", mapId: room.selectedMap });
    return;
  }

  if (message.type === "startMap" && client.role === "host") {
    room.selectedMap = String(message.mapId || room.selectedMap || "heartfall");
    room.state = "playing";
    relay(room, { type: "startMap", mapId: room.selectedMap, startedAt: Date.now() });
    return;
  }

  if (message.type === "input" && client.role === "guest") {
    room.host?.send({ type: "input", from: "guest", input: message.input || {} });
    return;
  }

  if (message.type === "snapshot" && client.role === "host") {
    room.guest?.send({ type: "snapshot", snapshot: message.snapshot });
    return;
  }

  if (message.type === "backToMap" && client.role === "host") {
    room.state = "map";
    relay(room, { type: "backToMap" });
  }
}

function createRoom(code) {
  const room = {
    code,
    host: null,
    guest: null,
    selectedMap: "heartfall",
    state: "map"
  };
  rooms.set(code, room);
  return room;
}

function leaveRoom(client) {
  if (!client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room) return;

  if (room.host === client) {
    room.host = null;
    room.guest?.send({ type: "roomClosed", message: "Host left the room." });
  }
  if (room.guest === client) {
    room.guest = null;
  }

  const code = client.roomCode;
  client.roomCode = "";
  client.role = "";

  if (!room.host && !room.guest) {
    rooms.delete(code);
  } else {
    broadcastRoom(room);
  }
}

function relay(room, payload) {
  room.host?.send(payload);
  room.guest?.send(payload);
}

function broadcastRoom(room) {
  relay(room, {
    type: "room",
    code: room.code,
    players: players(room),
    selectedMap: room.selectedMap,
    state: room.state
  });
}

function players(room) {
  return {
    host: Boolean(room.host),
    guest: Boolean(room.guest)
  };
}

function sanitizeCode(code) {
  return String(code || "1234567").replace(/[^\w-]/g, "").slice(0, 12) || "1234567";
}

server.listen(port, () => {
  console.log(`Jolie Joku Adventure running at http://127.0.0.1:${port}/`);
  for (const url of getLanUrls()) {
    console.log(`Same Wi-Fi phone URL: ${url}`);
  }
});

function sendJson(res, payload) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(payload));
}

function getLanUrls() {
  const urls = [];
  for (const values of Object.values(networkInterfaces())) {
    for (const info of values || []) {
      if (info.family === "IPv4" && !info.internal) {
        urls.push(`http://${info.address}:${port}/`);
      }
    }
  }
  return urls;
}

# Jolie Joku Adventure

A 2D online co-op web game for Joku and Jolie, designed for smooth desktop and mobile play.
Joku hosts with invitation code `1234567`, Jolie joins, and both players enter the same
map-selection screen before starting a synchronized chapter.

## Local run

Run the bundled Node server so host/join WebSocket rooms work:

```powershell
node server.mjs
```

Then open `http://localhost:5173`.

## Two-player hosting

1. Joku opens the game and taps `Host as Joku`.
2. Jolie opens the same game URL and taps `Join as Jolie`.
3. Both use invitation code `1234567`.
4. If playing on the same Wi-Fi, use the `Same Wi-Fi phone URL` printed by `server.mjs`.

Important: `127.0.0.1` and `localhost` only work on the device running the server. Your
girlfriend cannot join by opening `127.0.0.1` on her phone unless the server is running on
that same phone. For calls from different networks, deploy the Node app and both open the
deployed URL.

## Deploy

Deploy as a small Node app, not as static-only hosting, because real host/join play uses
WebSockets. Use `npm start` or `node server.mjs` on a host that supports WebSockets, such as
Render, Railway, Fly.io, or a VPS.

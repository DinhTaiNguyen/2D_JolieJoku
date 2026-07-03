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

## Deploy

Deploy as a small Node app, not as static-only hosting, because real host/join play uses
WebSockets. Use `npm start` or `node server.mjs` on a host that supports WebSockets, such as
Render, Railway, Fly.io, or a VPS.

/**
 * Express server stub — Phase 4 will implement routes:
 *   /scan-ai, /run-jsx, /parse-excel, /generate-excel,
 *   /preview-image, /config/load, /config/save, /dialog/*
 *
 * Runs on localhost:3799.
 * For Phase 1, the server startup is stubbed (express not yet installed).
 */

import http from 'node:http';

const PORT = 3799;

export function startServer(): void {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  });

  server.listen(PORT, () => {
    console.log(`[templator] HTTP server listening on http://localhost:${PORT}`);
  });
}

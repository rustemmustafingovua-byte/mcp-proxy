#!/usr/bin/env node
/**
 * mcp-proxy — one endpoint, many MCP servers, with keys, limits and logs.
 *
 *   mcp-proxy --servers ./servers.json --key $MCP_PROXY_KEY --port 8790
 *
 * servers.json:
 *   { "web": { "url": "https://example.com/mcp" },
 *     "local": { "command": ["npx", "-y", "some-mcp-server"] } }
 */
import { readFileSync } from "node:fs"
import { Proxy } from "../src/index.js"

const argv = process.argv.slice(2)
const arg = (n, d) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : d
}

const cfgPath = arg("--servers")
if (!cfgPath) {
  console.error('usage: mcp-proxy --servers <file.json> [--key <bearer>] [--port 8790]')
  process.exit(2)
}
const servers = JSON.parse(readFileSync(cfgPath, "utf8"))
const port = Number(arg("--port", 8790))

const proxy = new Proxy({
  apiKey: arg("--key", process.env.MCP_PROXY_KEY || ""),
  rpm: Number(arg("--rpm", 60)),
  servers,
})

const http = await import("node:http")
http
  .createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? Buffer.concat(chunks).toString() : undefined
    const url = new URL(req.url, "http://localhost")
    const server = url.searchParams.get("server") || Object.keys(servers)[0]

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ ok: true, servers: Object.keys(servers), stats: proxy.log.stats() }))
    }
    if (url.pathname === "/logs") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify(proxy.log.recent(Number(url.searchParams.get("n") || 20)), null, 2))
    }
    if (url.pathname.startsWith("/replay/")) {
      const out = await proxy.replay(url.pathname.split("/").pop())
      res.writeHead(out.status, { "Content-Type": "application/json" })
      return res.end(JSON.stringify(out.body ?? out))
    }

    const out = await proxy.handle({
      server,
      method: req.method,
      path: url.pathname,
      client: req.headers["x-client"] || req.socket.remoteAddress,
      headers: req.headers,
      body,
    })
    res.writeHead(out.status, { "Content-Type": "application/json" })
    res.end(JSON.stringify(out.body ?? out))
  })
  .listen(port, () => {
    console.log(`[mcp-proxy] http://127.0.0.1:${port}  servers: ${Object.keys(servers).join(", ")}`)
    console.log(`[mcp-proxy] client key: ${proxy.apiKey ? "required" : "open (set --key to require one)"}`)
  })

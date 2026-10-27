/**
 * mcp-proxy — one endpoint in front of many MCP servers.
 *
 * Adds the things a shared MCP endpoint needs and individual servers do not:
 *   - a single client key (Bearer)
 *   - per-client rate limiting
 *   - an append-only request log
 *   - replay of the last N calls (useful when a tool misbehaves)
 *   - routing by server name
 */
import { randomUUID } from "node:crypto"

export class RateLimiter {
  constructor(rpm) {
    this.rpm = rpm || 0
    this.hits = new Map()
  }

  allow(key, now = Date.now()) {
    if (!this.rpm) return { allowed: true }
    const list = (this.hits.get(key) || []).filter((t) => t > now - 60000)
    if (list.length >= this.rpm) {
      this.hits.set(key, list)
      return { allowed: false, retryAfter: Math.ceil((list[0] + 60000 - now) / 1000) }
    }
    list.push(now)
    this.hits.set(key, list)
    return { allowed: true }
  }
}

export class RequestLog {
  constructor(limit = 500) {
    this.limit = limit
    this.entries = []
  }

  add(entry) {
    const e = { id: randomUUID(), at: new Date().toISOString(), ...entry }
    this.entries.push(e)
    if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit)
    return e
  }

  recent(n = 20, server) {
    let list = this.entries
    if (server) list = list.filter((e) => e.server === server)
    return list.slice(-n).reverse()
  }

  stats() {
    const byServer = {}
    let errors = 0
    let ms = 0
    for (const e of this.entries) {
      byServer[e.server] = (byServer[e.server] || 0) + 1
      if (e.error) errors++
      ms += e.durationMs || 0
    }
    return {
      total: this.entries.length,
      errors,
      avgMs: this.entries.length ? Math.round(ms / this.entries.length) : 0,
      byServer,
    }
  }
}

/** Strip everything but the method and path from a URL for logging. */
export function safeUrl(url) {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return String(url).slice(0, 120)
  }
}

/**
 * The proxy's request pipeline. Transport-specific work is injected, so the
 * logic is testable without any server running.
 */
export class Proxy {
  /**
   * @param {object} opts
   * @param {string} [opts.apiKey] required Bearer key for clients
   * @param {number} [opts.rpm] per-client rate limit
   * @param {object} [opts.servers] name -> { command, args, env } | { url, headers }
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || ""
    this.limiter = new RateLimiter(opts.rpm)
    this.log = new RequestLog(opts.logLimit)
    this.servers = opts.servers || {}
    this.transport = opts.transport || null
    this.maxBodyBytes = opts.maxBodyBytes || 10 * 1024 * 1024
    this.timeoutMs = opts.timeoutMs || 0
    for (const [name, s] of Object.entries(this.servers)) {
      if (s.command && (!Array.isArray(s.command) || !s.command.every((x) => typeof x === "string"))) {
        throw new Error(`Server "${name}" command must be an array of strings`)
      }
      if (s.url && typeof s.url !== "string") {
        throw new Error(`Server "${name}" url must be a string`)
      }
    }
  }

  /** Check the client key. */
  authorize(headers = {}) {
    if (!this.apiKey) return { ok: true }
    const raw = headers.authorization || headers.Authorization || ""
    const token = raw.replace(/^Bearer\s+/i, "")
    return token === this.apiKey ? { ok: true } : { ok: false, status: 401, reason: "invalid client key" }
  }

  /** Route a request to a backend and record it. */
  async handle(request) {
    const auth = this.authorize(request.headers || {})
    if (!auth.ok) {
      this.log.add({ server: request.server || "-", error: auth.reason, durationMs: 0 })
      return { status: auth.status, body: { error: auth.reason } }
    }
    const client = request.client || request.headers?.["x-client"] || "anonymous"
    const limit = this.limiter.allow(client)
    if (!limit.allowed) {
      this.log.add({ server: request.server || "-", error: "rate limited", durationMs: 0, client })
      return { status: 429, body: { error: "rate limit exceeded", retryAfter: limit.retryAfter } }
    }
    if (this.maxBodyBytes && typeof request.body === "string" && Buffer.byteLength(request.body) > this.maxBodyBytes) {
      return { status: 413, body: { error: "Request body too large" } }
    }
    if (!this.transport) {
      this.log.add({ server: request.server || "-", error: "no transport configured", durationMs: 0, client })
      return { status: 503, body: { error: "no transport configured" } }
    }
    const started = Date.now()
    try {
      const out = await new Promise((resolve, reject) => {
        const timer = this.timeoutMs > 0
          ? setTimeout(() => reject(new Error(`upstream timeout after ${this.timeoutMs}ms`)), this.timeoutMs)
          : null
        Promise.resolve(this.transport(request))
          .then(val => { if (timer) clearTimeout(timer); resolve(val) })
          .catch(err => { if (timer) clearTimeout(timer); reject(err) })
      })
      this.log.add({
        server: request.server || "-",
        method: request.method,
        path: request.path,
        client,
        durationMs: Date.now() - started,
        status: out.status,
        body: request.body,
      })
      return out
    } catch (err) {
      const isTimeout = err?.message?.includes("timeout") || false
      this.log.add({
        server: request.server || "-",
        method: request.method,
        path: request.path,
        client,
        durationMs: Date.now() - started,
        error: String(err?.message ?? err).slice(0, 300),
        body: request.body,
      })
      return { status: isTimeout ? 504 : 502, body: { error: isTimeout ? "upstream timeout" : "upstream failure" } }
    }
  }

  /** Replay a recorded call through the same pipeline. */
  async replay(id) {
    const entry = this.log.entries.find((e) => e.id === id)
    if (!entry) return { status: 404, body: { error: "no such call" } }
    return this.handle({
      server: entry.server,
      method: entry.method,
      path: entry.path,
      client: "replay",
      headers: {},
      body: entry.body,
    })
  }
}

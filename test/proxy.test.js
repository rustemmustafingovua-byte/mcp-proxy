import { test } from "node:test"
import assert from "node:assert/strict"
import { Proxy, RateLimiter, safeUrl, RequestLog } from "../src/index.js"

test("rate limiter blocks after the cap", () => {
  const rl = new RateLimiter(2)
  assert.equal(rl.allow("a").allowed, true)
  assert.equal(rl.allow("a").allowed, true)
  const third = rl.allow("a")
  assert.equal(third.allowed, false)
  assert.ok(third.retryAfter > 0)
  assert.equal(rl.allow("b").allowed, true, "limits are per client")
})

test("the client key is enforced", async () => {
  const p = new Proxy({ apiKey: "s3cret", transport: async () => ({ status: 200, body: { ok: true } }) })
  const bad = await p.handle({ headers: { authorization: "Bearer nope" } })
  assert.equal(bad.status, 401)
  const good = await p.handle({ headers: { authorization: "Bearer s3cret" } })
  assert.equal(good.status, 200)
})

test("calls are logged with duration and stats", async () => {
  const p = new Proxy({ transport: async () => ({ status: 200, body: { ok: true } }) })
  await p.handle({ server: "web", method: "POST", path: "/mcp", client: "c1" })
  await p.handle({ server: "web", method: "POST", path: "/mcp", client: "c1" })
  const stats = p.log.stats()
  assert.equal(stats.total, 2)
  assert.equal(stats.byServer.web, 2)
  assert.equal(p.log.recent(1)[0].server, "web")
})

test("a failing backend becomes a 502 and is logged as an error", async () => {
  const p = new Proxy({ transport: async () => { throw new Error("boom") } })
  const out = await p.handle({ server: "x" })
  assert.equal(out.status, 502)
  assert.equal(p.log.stats().errors, 1)
})

test("logs keep query strings out", () => {
  assert.equal(safeUrl("https://a.b/mcp?token=secret"), "https://a.b/mcp")
})

test("replay preserves body for non-POST methods", async () => {
  const p = new Proxy({ transport: async (req) => ({ status: 200, body: { ok: true, method: req.method } }) })
  await p.handle({ server: "web", method: "GET", path: "/mcp", client: "c1", body: undefined })
  const recent = p.log.recent(1)
  assert.equal(recent[0].body, undefined)
  assert.equal(recent[0].method, "GET")
})

test("servers config validates command arrays and url strings", () => {
  assert.throws(() => new Proxy({ servers: { bad: { command: "not-array" } } }), /command must be an array/)
  assert.throws(() => new Proxy({ servers: { bad: { url: 123 } } }), /url must be a string/)
  assert.doesNotThrow(() => new Proxy({ servers: { good: { url: "https://ok" } } }))
})

test("maxBodyBytes rejects oversized payloads in transport", async () => {
  const p = new Proxy({ transport: async () => ({ status: 200, body: { ok: true } }), maxBodyBytes: 10 })
  const out = await p.handle({ server: "web", method: "POST", path: "/mcp", client: "c1", body: "this is longer than ten bytes" })
  assert.equal(out.status, 413)
})

test("a non-Error throw still becomes a 502", async () => {
  const p = new Proxy({ transport: async () => { throw "string-error" } })
  const out = await p.handle({ server: "x" })
  assert.equal(out.status, 502)
  assert.equal(p.log.stats().errors, 1)
})

test("missing server defaults to '-' in logs", async () => {
  const p = new Proxy({ transport: async () => ({ status: 200, body: { ok: true } }) })
  await p.handle({})
  const recent = p.log.recent(1)
  assert.equal(recent[0].server, "-")
})

test("authorize passes with empty headers when apiKey is not set", () => {
  const p = new Proxy({})
  const res = p.authorize({})
  assert.equal(res.ok, true)
})

test("authorize rejects with non-Bearer token", () => {
  const p = new Proxy({ apiKey: "secret" })
  const res = p.authorize({ authorization: "nope" })
  assert.equal(res.ok, false)
  assert.equal(res.status, 401)
})

test("timeoutMs wraps transport and returns 504 on slow backend", async () => {
  const p = new Proxy({
    transport: async () => new Promise(() => {}), // never resolves
    timeoutMs: 200,
  })
  const out = await p.handle({ server: "x" })
  assert.equal(out.status, 504)
  assert.equal(out.body.error, "upstream timeout")
  assert.equal(p.log.stats().errors, 1)
})

test("timeoutMs does not fire when transport is fast", async () => {
  const p = new Proxy({
    transport: async () => ({ status: 200, body: { ok: true } }),
    timeoutMs: 5000,
  })
  const out = await p.handle({ server: "x" })
  assert.equal(out.status, 200)
  assert.equal(p.log.stats().errors, 0)
})

test("non-string body bypasses maxBodyBytes check", async () => {
  const p = new Proxy({
    transport: async () => ({ status: 200, body: { ok: true } }),
    maxBodyBytes: 10,
  })
  const out = await p.handle({ server: "web", method: "POST", path: "/mcp", client: "c1", body: 12345 })
  assert.equal(out.status, 200)
})

test("replay with missing id returns 404", async () => {
  const p = new Proxy({ transport: async () => ({ status: 200, body: { ok: true } }) })
  const out = await p.replay("does-not-exist")
  assert.equal(out.status, 404)
})

test("request log caps entries at limit", () => {
  const log = new RequestLog(3)
  log.add({ server: "a" })
  log.add({ server: "b" })
  log.add({ server: "c" })
  log.add({ server: "d" })
  assert.equal(log.entries.length, 3)
  assert.equal(log.entries[0].server, "b")
})

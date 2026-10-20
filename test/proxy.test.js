import { test } from "node:test"
import assert from "node:assert/strict"
import { Proxy, RateLimiter, safeUrl } from "../src/index.js"

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

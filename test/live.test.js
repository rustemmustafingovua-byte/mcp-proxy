// Integration test against the real service. Skipped unless LIVE=1.
//   LIVE=1 npm test
import { test } from "node:test"
import assert from "node:assert/strict"

const LIVE = process.env.LIVE === "1"
const skip = LIVE ? false : "set LIVE=1 to run the integration test"

import { Proxy } from "../src/index.js"

test("routes a request through the proxy", { skip }, async () => {
  const proxy = new Proxy({
    apiKey: "test-key",
    transport: async (req) => ({ status: 200, body: { ok: true, server: req.server } }),
  })
  const res = await proxy.handle({
    server: "demo",
    method: "POST",
    path: "/mcp",
    client: "test",
    headers: { authorization: "Bearer test-key" },
  })
  assert.equal(res.status, 200)
  assert.equal(proxy.log.stats().total, 1)
  const denied = await proxy.handle({ server: "demo", headers: { authorization: "Bearer wrong" } })
  assert.equal(denied.status, 401)
})

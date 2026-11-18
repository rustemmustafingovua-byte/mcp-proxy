import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { RequestLog } from "../src/index.js"

test("logs are appended to disk and read back", () => {
  const tmpFile = join(tmpdir(), `mcp-proxy-test-${Date.now()}.jsonl`)
  try {
    const logger = new RequestLog(100, { logFile: tmpFile })
    logger.add({ server: "weather", method: "POST", path: "/tools/call", durationMs: 42 })
    logger.add({ server: "db", method: "GET", path: "/health", durationMs: 5 })

    assert.ok(existsSync(tmpFile))
    const read = RequestLog.readLogs(tmpFile)
    assert.equal(read.length, 2)
    assert.equal(read[0].server, "weather")
    assert.equal(read[1].server, "db")
  } finally {
    if (existsSync(tmpFile)) rmSync(tmpFile, { force: true })
  }
})

test("rotation occurs at configurable size", () => {
  const tmpFile = join(tmpdir(), `mcp-proxy-rot-${Date.now()}.jsonl`)
  try {
    // Configured small size of 200 bytes
    const logger = new RequestLog(100, { logFile: tmpFile, maxBytes: 200, maxBackups: 2 })

    // Add several entries to cross 200 bytes
    for (let i = 0; i < 10; i++) {
      logger.add({ server: "test-server", message: `Sample payload number ${i}`, durationMs: 10 + i })
    }

    assert.ok(existsSync(tmpFile), "Active log file exists")
    assert.ok(existsSync(`${tmpFile}.1`), "Rotated log file .1 exists")

    // The active file size is kept under/near maxBytes
    assert.ok(statSync(tmpFile).size > 0)

    // Reading rotated logs back
    const rotated = RequestLog.readLogs(`${tmpFile}.1`)
    assert.ok(rotated.length > 0)
    assert.equal(rotated[0].server, "test-server")
  } finally {
    if (existsSync(tmpFile)) rmSync(tmpFile, { force: true })
    if (existsSync(`${tmpFile}.1`)) rmSync(`${tmpFile}.1`, { force: true })
    if (existsSync(`${tmpFile}.2`)) rmSync(`${tmpFile}.2`, { force: true })
  }
})

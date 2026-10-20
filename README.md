<div align="center">

<img src="docs/social-preview.png" alt="mcp-proxy" width="100%">

# mcp-proxy

**One endpoint, many MCP servers, with keys, limits and logs.**

[![CI](https://github.com/rustemmustafingovua-byte/mcp-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/rustemmustafingovua-byte/mcp-proxy/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mcp-proxy?color=cb3837&logo=npm)](https://www.npmjs.com/package/mcp-proxy)
[![license](https://img.shields.io/badge/license-MIT-8b949e?logo=opensourceinitiative)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-3c873a?logo=node.js)](https://nodejs.org)
[![paid](https://img.shields.io/badge/USDC-0x8aC6a229f254980CCd3Dd35CF5E1B7c08880B40E-2775ca?logo=ethereum)](https://base.org)

[**Docs**](https://rustemmustafingovua-byte.github.io/mcp-proxy/) · [Issues](https://github.com/rustemmustafingovua-byte/mcp-proxy/issues) · [Discussions](https://github.com/rustemmustafingovua-byte/mcp-proxy/discussions)

</div>

---

One endpoint in front of many MCP servers. mcp-proxy adds the things a shared MCP endpoint needs and a single server does not: a client key, per-client rate limits, an append-only request log, replay of past calls, and routing by server name.

## Install

```bash
npm i -g mcp-proxy
```

<details>
<summary>Без npm-логина — из tarball релиза</summary>

```bash
npm i -g https://github.com/rustemmustafingovua-byte/mcp-proxy/releases/download/v0.1.0/mcp-proxy-0.1.0.tgz
```

</details>
## What it does

| | |
|---|---|
| **A single client key** | one Bearer token for every backend |
| **Per-client rate limits** | sliding window, Retry-After on the 429 |
| **Append-only request log** | who called what, how long it took, what failed |
| **Replay** | re-run a recorded call with /replay/<id> |


## Usage

```bash
mcp-proxy --servers servers.json --key $MCP_PROXY_KEY --port 8790
```

## CLI

```
mcp-proxy — One endpoint, many MCP servers, with keys, limits and logs.

USAGE
  mcp-proxy --servers servers.json --key $MCP_PROXY_KEY --port 8790

COMMANDS / OPTIONS
  --servers <file>  JSON map of server name -> {url} or {command}
  --key <bearer>    require this client key (default: $MCP_PROXY_KEY)
  --port <n>        port to listen on (default 8790)
  --rpm <n>         per-client request limit (default 60)

Endpoints:
  GET  /health                 status and stats
  GET  /logs?n=20              recent calls
  POST /replay/<id>            replay a recorded call
  POST /?server=<name>         proxy a request to one backend

MIT · https://github.com/rustemmustafingovua-byte
```

## Part of a portfolio

| Project | What it does |
|---|---|
| [`opencode-free-stack`](https://github.com/rustemmustafingovua-byte/opencode-free-stack) | route to free models, fall back automatically |
| [`free-web-mcp`](https://github.com/rustemmustafingovua-byte/free-web-mcp) | web search for agents, zero credits |
| [`agent-x402`](https://github.com/rustemmustafingovua-byte/agent-x402) | pay per API call in USDC with a spend policy |

## Donate

MIT, forever. USDC on Base:

```
0x8aC6a229f254980CCd3Dd35CF5E1B7c08880B40E
```

## License

MIT © rustemmustafingovua-byte

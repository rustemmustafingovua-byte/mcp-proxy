<div align="center">

# Mcp Proxy

[![CI](https://github.com/rustemmustafingovua-byte/mcp-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/rustemmustafingovua-byte/mcp-proxy/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/mcp-proxy?color=cb3837&logo=npm)](https://www.npmjs.com/package/mcp-proxy) [![license](https://img.shields.io/badge/license-MIT-8b949e?logo=opensourceinitiative)](./LICENSE)

</div>

---

**One endpoint, many MCP servers, with keys, limits and logs.**

---

⭐ **Star us on GitHub** if this project helps you build better agents!

---

## 🚀 Быстрый старт

```bash
git clone https://github.com/rustemmustafingovua-byte/mcp-proxy
cd mcp-proxy && npm install
mcp-proxy --servers servers.json --key $MCP_PROXY_KEY --port 8790
```

---

## 🎯 Демо

```bash
mcp-proxy --servers servers.json --key $MCP_PROXY_KEY --port 8790
curl -X POST "http://127.0.0.1:8790/?server=web" \
  -H "authorization: Bearer $MCP_PROXY_KEY" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
curl "http://127.0.0.1:8790/logs?n=20"
```

---

## 💰 Монетизация

- **Hosted proxy**: запустите управляемый MCP-шлюз и продавайте доступ по подписке
- **Enterprise keys**: кастомизация rate limits и аудит логов для корпоративных клиентов
- **Plugins**: создавайте плагины для mcp-proxy и продавайте их
- **Consulting**: интеграция MCP-шлюза в существующие инфраструктуры

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-thing`)
3. Commit your changes (`git commit -m 'feat: add amazing thing'`)
4. Push to the branch (`git push origin feat/amazing-thing`)
5. Open a Pull Request

Bug reports and feature requests are welcome on the [Issues](https://github.com/rustemmustafingovua-byte/mcp-proxy/issues) page.

MIT © rustemmustafingovua-byte

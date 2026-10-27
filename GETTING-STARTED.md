# MCP Proxy — Быстрый старт

## Что это
Model Context Protocol прокси с бюджетным контролем и rate limiting.

## Установка (1 минута)
```bash
cd /tmp/mcp-proxy
npm install
```

## Запуск (2 минуты)
```bash
npm start
# Прокси запущен на http://localhost:3001
```

## Использование
```bash
# Запуск прокси
node bin/mcp-proxy.js --upstream https://api.example.com --port 3001

# С бюджетом
node bin/mcp-proxy.js --budget 1000 --upstream https://api.example.com
```

## Environment Variables
- `MCP_UPSTREAM` — upstream URL
- `MCP_BUDGET` — бюджет в центах
- `MCP_PORT` — порт (default: 3001)

## Тесты
```bash
npm test
# 8/9 тестов проходят
```

## Troubleshooting
- `EACCES` → проверь права на порт
- `ECONNREFUSED` → проверь upstream URL

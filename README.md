# Anvora

A full-stack, multi-tenant WhatsApp automation platform built with NestJS, Next.js, PostgreSQL, Redis, BullMQ, Socket.IO, and Baileys.

Developed by **Anas Nashat Ahmed** ([@anasnashat](https://github.com/anasnashat)). I designed and implemented the platform architecture, API, dashboard, authentication, job queues, real-time instance lifecycle, and production deployment workflow.

> [!IMPORTANT]
> This project uses the unofficial Baileys WhatsApp Web API. It is intended for learning and portfolio demonstration. Review WhatsApp's terms and obtain recipient consent before using it with real accounts or messages.

## Highlights

- JWT dashboard authentication and API-key messaging access
- Multiple WhatsApp instances with live QR-code connection updates
- Queued, retried, scheduled, text, and media messages
- Contacts, reusable templates, delivery history, and usage metrics
- Per-account quotas, request validation, and rate limiting
- Docker Compose development stack and GitHub Actions checks

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web | Next.js 16, React 19, Tailwind CSS | Dashboard and API consumer UI |
| API | NestJS 11, Swagger, Socket.IO | Authentication, validation, REST API, live QR events |
| Data | PostgreSQL, Prisma | Users, instances, contacts, templates, message history |
| Jobs | Redis, BullMQ | Delayed delivery, retry, and rate-controlled processing |
| WhatsApp | Baileys | WhatsApp Web sessions and message delivery |

## Run locally

Requirements: Node.js 20+, PostgreSQL, and Redis. Docker Desktop is the shortest setup path.

```bash
cp .env.example .env
# Replace every placeholder in .env with strong, unique values.
docker compose up --build
```

Open the dashboard at `http://localhost:3001` and API documentation at `http://localhost:3000/docs`.

For local development without Docker:

```bash
cd backend
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run start:dev
```

```bash
cd frontend
npm ci
npm run dev
```

## API example

After creating an account and connecting an instance:

```bash
curl -X POST http://localhost:3000/api/v1/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wsk_your_key" \
  -d '{"to":"201001234567","message":"Hello from the API"}'
```

## Quality checks

```bash
cd backend && npm run lint && npm test -- --runInBand && npm run build
cd frontend && npm run lint && npm run build
```

## Security

- Never commit `.env`, WhatsApp session files, API keys, access tokens, or uploaded media.
- Use different random values of at least 32 characters for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Rotate all credentials and reconnect WhatsApp sessions if this repository was ever shared before the sensitive files were removed.
- See [SECURITY.md](SECURITY.md) for reporting guidance and the current security scope.

## License

Copyright © 2026 Anas Nashat Ahmed.

Anvora is source-available under the [PolyForm Noncommercial License 1.0.0 with an additional corporate-use restriction](LICENSE). It may be used, studied, modified, and shared for educational and other noncommercial purposes. Corporate use, resale, paid services, or revenue-generating use requires a separate written license from the author.

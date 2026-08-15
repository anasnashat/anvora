# Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Create only the writable runtime directories; application files stay read-only.
RUN install -d -o node -g node /app/auth_info_baileys /app/uploads

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]

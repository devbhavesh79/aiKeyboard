# LangFlow Production Deployment & Infrastructure Guide

## Docker Architecture
The backend container is built with Node.js 20 Alpine:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN npm ci --only=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## Environment Variables
- `PORT`: Server listen port (default 3000).
- `GEMINI_API_KEY`: API key for Google Gemini (`gemini-3.8-flash`).
- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string for distributed rate-limiting.

## Health Probes
- Liveness Probe: `GET /health` (expects 200 OK).
- Readiness Probe: `GET /ready` (expects 200 OK with internal dependency status).

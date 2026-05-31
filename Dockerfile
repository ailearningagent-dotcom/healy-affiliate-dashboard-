# ─── Stage 1: Dependencies & Build ────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./
RUN npm install

# Copy source files and build
COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/marketai.db

# Create the data directory for SQLite persistence
RUN mkdir -p /app/data

# Copy standalone output (includes all necessary node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]

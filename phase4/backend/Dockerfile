# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm ci

COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npx prisma generate

COPY src/ ./src/
RUN npm run db:generate || true
RUN npm run build || true

# ---- Production stage ----
FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/src ./src/

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "src/index.js"]

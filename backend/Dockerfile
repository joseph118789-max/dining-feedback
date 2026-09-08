# ---- Build stage ----
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npx prisma generate && echo "Schema hash: $(cat prisma/schema.prisma | md5sum | cut -d' ' -f1)"

# ---- Production stage ----
FROM node:20-bookworm-slim

RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends postgresql-client ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY sql/ ./sql/
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN useradd -m -u 1001 -s /bin/bash nodejs && \
    chmod +x /docker-entrypoint.sh && \
    chmod -R 755 /app/node_modules && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
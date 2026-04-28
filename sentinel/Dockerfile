FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --production=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build 2>/dev/null || echo "No build step defined — skipping"
RUN npm prune --production

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S sentinel && \
    adduser -S sentinel -u 1001 -G sentinel
WORKDIR /app
COPY --from=build --chown=sentinel:sentinel /app/node_modules ./node_modules
COPY --from=build --chown=sentinel:sentinel /app/dist ./dist
COPY --from=build --chown=sentinel:sentinel /app/package.json ./package.json
RUN mkdir -p /data/audit && chown sentinel:sentinel /data/audit
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1
ENV NODE_ENV=production
ENV SENTINEL_PORT=3001
EXPOSE 3001
USER sentinel
CMD ["node", "dist/index.js"]

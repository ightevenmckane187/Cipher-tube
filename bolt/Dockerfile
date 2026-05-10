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
RUN addgroup -g 1001 -S bolt && \
    adduser -S bolt -u 1001 -G bolt
WORKDIR /app
COPY --from=build --chown=bolt:bolt /app/node_modules ./node_modules
COPY --from=build --chown=bolt:bolt /app/dist ./dist
COPY --from=build --chown=bolt:bolt /app/package.json ./package.json
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3002/health || exit 1
ENV NODE_ENV=production
ENV BOLT_PORT=3002
EXPOSE 3002
USER bolt
CMD ["node", "dist/index.js"]

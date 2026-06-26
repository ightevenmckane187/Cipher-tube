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
RUN addgroup -g 1001 -S palette && \
    adduser -S palette -u 1001 -G palette
WORKDIR /app
COPY --from=build --chown=palette:palette /app/node_modules ./node_modules
COPY --from=build --chown=palette:palette /app/dist ./dist
COPY --from=build --chown=palette:palette /app/package.json ./package.json
COPY --from=build --chown=palette:palette /app/themes ./themes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3003/health || exit 1
ENV NODE_ENV=production
ENV PALETTE_PORT=3003
EXPOSE 3003
USER palette
CMD ["node", "dist/index.js"]

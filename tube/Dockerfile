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
RUN addgroup -g 1001 -S tube && \
    adduser -S tube -u 1001 -G tube
WORKDIR /app
COPY --from=build --chown=tube:tube /app/node_modules ./node_modules
COPY --from=build --chown=tube:tube /app/dist ./dist
COPY --from=build --chown=tube:tube /app/package.json ./package.json
RUN mkdir -p /app/certs && chown tube:tube /app/certs
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1
ENV NODE_ENV=production
ENV TUBE_PORT=3000
EXPOSE 3000
USER tube
CMD ["node", "dist/index.js"]

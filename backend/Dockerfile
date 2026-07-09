# Build from the repo root: docker build -f backend/Dockerfile .
# (npm workspaces need the root manifest + lockfile, plus the sibling
# shared/ workspace backend/lib/circuitTools.js imports from.)
FROM node:22-bookworm-slim

# arduino-cli + the AVR core - matches exactly what backend/lib/arduinoCli.js
# already checks for via getToolchainStatus()/compileSketch(); no app code
# changes needed here, just making the image satisfy what it already probes.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh && \
    arduino-cli core install arduino:avr && \
    apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so `npm ci` is cache-hit unless a dependency actually
# changed, before copying the (much more frequently changing) source.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json
RUN npm ci --workspace=backend --workspace=shared

COPY backend backend
COPY shared shared

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "index.js"]

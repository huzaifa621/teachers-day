FROM node:22-slim

# Chromium (for Puppeteer, via renderer.js) + ffmpeg's runtime deps.
# ffmpeg itself is not installed here — ffmpeg-static ships its own binary.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Skip Puppeteer's own Chromium download — point it at the system package
# above instead (smaller image, and puppeteer.launch() picks this up
# automatically without any code change).
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY assets ./assets

EXPOSE 4173
CMD ["node", "src/index.js"]

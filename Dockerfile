# syntax=docker/dockerfile:1

############################
# 1) Build stage – unchanged
############################
FROM node:18-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

############################
# 2) Runtime stage (Ubuntu 24.04)
############################
FROM ubuntu:24.04

# Install Node 18 LTS from Ubuntu repos
RUN apt-get update && apt-get install -y --no-install-recommends \
      nodejs npm \
      ffmpeg=7:6.1.1-3ubuntu5 \
      wget \
  && rm -rf /var/lib/apt/lists/*

# npm in Ubuntu bundles corepack; enable pnpm/yarn if you need them
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

# same dirs / env / health-check
RUN mkdir -p temp output cache debug_videos logs storage \
 && mkdir -p /app/storage/generations /app/output /app/cache \
 && chmod -R 777 /app/storage /app/output /app/cache
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD []
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

FROM node:24.22.1-trixie-slim@sha256:43b9ba1142b8dcf33fa8f922ca1be85714adc444e0586c7cf7726daaeabc1bea AS base

ENV CI=true HUSKY=0

RUN mkdir /app && chown node:node /app
WORKDIR /app

COPY package.json .bun-version ./
RUN --mount=type=cache,id=vinted-dev-npm,target=/root/.npm npm install --global "pnpm@$(node -p 'require("./package.json").packageManager.split("@")[1]')" "bun@$(cat .bun-version)"

RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

USER node
COPY --chown=node:node --parents package.json pnpm-lock.yaml pnpm-workspace.yaml apps/*/package.json packages/*/package.json ./
RUN --mount=type=cache,id=vinted-dev-pnpm-meta,target=/home/node/.cache/pnpm,uid=1000,gid=1000 \
    pnpm install --frozen-lockfile --filter "api..."
COPY --chown=node:node . .

FROM base AS dev

ENV NODE_ENV=development
WORKDIR /app/apps/api
EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bun", "--watch", "src/index.ts"]

FROM node:24.22.1-trixie-slim@sha256:43b9ba1142b8dcf33fa8f922ca1be85714adc444e0586c7cf7726daaeabc1bea AS prod-deps

ENV CI=true HUSKY=0

RUN mkdir /app && chown node:node /app
WORKDIR /app

COPY package.json ./
RUN npm install --global "pnpm@$(node -p 'require("./package.json").packageManager.split("@")[1]')"

USER node
COPY --chown=node:node . .
RUN pnpm install --frozen-lockfile --prod --filter "api..."
RUN rm -r packages/testing
RUN find node_modules -type f \( -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' -o -name '*.map' \) -delete

FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS bun

FROM debian:trixie-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad AS production

RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
RUN useradd --uid 1000 --create-home --shell /bin/sh bun

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app
COPY --from=prod-deps --chown=bun:bun /app/package.json ./
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=prod-deps --chown=bun:bun /app/packages ./packages
COPY --from=prod-deps --chown=bun:bun /app/apps/api ./apps/api

USER bun
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
    CMD ["bun", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bun", "src/index.ts"]

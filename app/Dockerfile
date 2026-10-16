# One image recipe for both apps: docker build --target api|web .
FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SHOW_DEMO=1
# prisma generate only needs a syntactically valid URL at build time
RUN export DATABASE_URL=postgresql://build:build@localhost:5432/build \
 && pnpm --filter @fjm/shared build \
 && pnpm --filter api build \
 && pnpm --filter web build

FROM build AS api
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter api exec prisma migrate deploy && pnpm --filter api start:prod"]

FROM build AS web
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]

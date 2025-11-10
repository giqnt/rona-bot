# Base stage
FROM oven/bun AS base
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

# Migration stage
FROM node AS migration
WORKDIR /app

COPY --from=base /app /app
COPY ./src/db ./src/db
COPY ./drizzle ./drizzle
COPY drizzle.config.ts ./

CMD ["npm", "run", "db:migrate"]

# Build stage
FROM base AS build

COPY ./src ./src

ENV NODE_ENV=production
RUN bun build \
	--compile \
	--minify-syntax \
	--minify-whitespace \
    --sourcemap \
	--outfile out/app \
	./src/main.ts

# Production stage
FROM gcr.io/distroless/base AS production
WORKDIR /app

COPY --from=build /app/out/app .

ENV NODE_ENV=production
CMD ["./app"]

FROM node:20.11.1

WORKDIR /usr/src/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY . .

EXPOSE 9898

CMD ["pnpm", "start"]

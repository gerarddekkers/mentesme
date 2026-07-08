# Backend (apps/api) — container voor AWS eu-west-1 (App Runner / ECS Fargate).
# Bouwen vanuit de repo-root:  docker build -f apps/api/Dockerfile -t zorgdossier-api .

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace @zorgdossier/api --include-workspace-root
COPY apps/api apps/api
RUN npm run build --workspace @zorgdossier/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --workspace @zorgdossier/api --include-workspace-root
COPY --from=build /app/apps/api/dist apps/api/dist
EXPOSE 4000
ENV PORT=4000
CMD ["node", "apps/api/dist/index.js"]

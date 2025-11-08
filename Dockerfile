# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4173

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]

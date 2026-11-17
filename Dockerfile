FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
FROM node:22-alpine AS api
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/engine.ts src/engine.ts
COPY src/geopolitics/engine.ts src/geopolitics/engine.ts
COPY server server
ENV NODE_ENV=production BIND_HOST=0.0.0.0
USER node
EXPOSE 3001
CMD ["node","--import","tsx","server/index.ts"]

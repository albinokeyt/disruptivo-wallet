FROM node:22-alpine AS webbuild
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
COPY --from=webbuild /app/web/dist ./web/dist
EXPOSE 8080
CMD ["node", "src/index.js"]

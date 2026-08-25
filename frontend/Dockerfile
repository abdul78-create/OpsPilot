# Stage 1: Build the Next.js 15 app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Next.js static export output (out/)
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 80 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || wget --no-verbose --tries=1 --spider http://localhost:10000 || exit 1

CMD ["nginx", "-g", "daemon off;"]

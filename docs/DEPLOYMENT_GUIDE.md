# OPSPILOT PRODUCTION DEPLOYMENT GUIDE
Version 1.0.0 · Last Updated: August 2026

---

## 1. Overview & Deployment Targets

OpsPilot can be deployed to:
1. **Docker Compose Stack** (Self-hosted VM / EC2 / DigitalOcean Droplet)
2. **Render / Fly.io / AWS ECS** (Managed Cloud Containers)
3. **Kubernetes Cluster** (Helm Chart / Kustomize)

---

## 2. Option A: Docker Compose Self-Hosted Deployment

### Prerequisites
- Ubuntu 22.04 LTS / Debian 12 / RHEL 9 server
- Docker Engine 24.0+ & Docker Compose v2.20+
- Port 80 & 443 open in Security Group / Firewall

### Step-by-Step Instructions

1. **Clone Repository & Configure Environment**:
   ```bash
   git clone https://github.com/opspilot/opspilot.git /opt/opspilot
   cd /opt/opspilot

   cp .env.example .env
   ```

2. **Configure Security Keys in `.env`**:
   ```env
   NODE_ENV=production
   JWT_SECRET=generate_strong_64char_random_hex_key
   GITHUB_WEBHOOK_SECRET=generate_strong_32char_webhook_key
   DATABASE_URL=postgresql://opspilot:StrongDbPassword@opspilot_postgres:5432/opspilot_db?schema=public
   REDIS_URL=redis://opspilot_redis:6379
   ```

3. **Deploy Container Stack**:
   ```bash
   docker compose up --build -d
   ```

4. **Verify Container Health**:
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```

---

## 3. Option B: Render Managed Deployment

### Components Setup on Render

1. **PostgreSQL Database**:
   - Create Managed PostgreSQL instance (Postgres 16)
   - Copy Internal Connection String → set `DATABASE_URL`

2. **Redis Instance**:
   - Create Managed Redis (Redis 7)
   - Copy Internal Connection URL → set `REDIS_URL`

3. **Web Service (Backend Engine)**:
   - Environment: `Docker` (using root `Dockerfile`)
   - Build Command: Automatic
   - Health Check Path: `/v1/health`
   - Set Environment Variables: `JWT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `DATABASE_URL`, `REDIS_URL`

4. **Static Site (Frontend Dashboard)**:
   - Build Command: `npm --prefix frontend run build`
   - Publish Directory: `frontend/out`
   - Rewrite Rule: `/*` → `/index.html`

---

## 4. Reverse Proxy & SSL Setup (Nginx + Let's Encrypt)

If deploying to a domain (e.g., `app.opspilot.io`):

```bash
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot --nginx -d app.opspilot.io
```

Nginx SSL location block configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name app.opspilot.io;

    ssl_certificate /etc/letsencrypt/live/app.opspilot.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.opspilot.io/privkey.pem;

    location / {
        root /opt/opspilot/frontend/out;
        try_files $uri $uri.html /index.html;
    }

    location /v1/ {
        proxy_pass http://127.0.0.1:3000/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # SSE Log Streaming support
    location /v1/pipeline-runs/ {
        proxy_pass http://127.0.0.1:3000/v1/pipeline-runs/;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## 5. Maintenance & Backup Operations

### Database Backup Command
```bash
docker exec opspilot_postgres pg_dump -U opspilot opspilot_db > opspilot_backup_$(date +%Y%m%d).sql
```

### Database Restore Command
```bash
cat opspilot_backup.sql | docker exec -i opspilot_postgres psql -U opspilot -d opspilot_db
```

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  OpsPilot AI — Automated Let's Encrypt Certificate Initializer
#  Domains: opspilot.ai, www.opspilot.ai, api.opspilot.ai
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DOMAINS=("opspilot.ai" "www.opspilot.ai" "api.opspilot.ai")
RSA_KEY_SIZE=4096
DATA_PATH="./infrastructure/certbot"
EMAIL="admin@opspilot.ai" # Contact email for Let's Encrypt expiry notices
STAGING=0 # Set to 1 if testing to avoid rate limits

echo "======================================================="
echo "  OpsPilot Automated Let's Encrypt TLS Initializer"
echo "======================================================="

if [ -d "$DATA_PATH" ]; then
    read -p "Existing certbot data found. Replace existing certificates? (y/N) " decision
    if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
        exit 0
    fi
fi

mkdir -p "$DATA_PATH/conf/live/${DOMAINS[0]}"
mkdir -p "$DATA_PATH/www"

# 1. Generate Dummy Certificates for Initial Nginx Startup
echo "### Creating dummy certificates for initial Nginx boot..."
path="/etc/letsencrypt/live/${DOMAINS[0]}"
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

# 2. Start Nginx Gateway
echo "### Starting Nginx gateway service on port 80/443..."
docker compose -f docker-compose.prod.yml up --force-recreate -d proxy

# 3. Delete Dummy Certificate
echo "### Deleting dummy certificates..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/${DOMAINS[0]} && \
  rm -Rf /etc/letsencrypt/archive/${DOMAINS[0]} && \
  rm -Rf /etc/letsencrypt/renewal/${DOMAINS[0]}.conf" certbot

# 4. Request Real Let's Encrypt Certificate
echo "### Requesting real Let's Encrypt TLS certificate for ${DOMAINS[*]}..."
domain_args=""
for domain in "${DOMAINS[@]}"; do
    domain_args="$domain_args -d $domain"
done

staging_arg=""
if [ $STAGING -ne 0 ]; then staging_arg="--staging"; fi

docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $domain_args \
    --email $EMAIL \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot

# 5. Reload Nginx Gateway with Real TLS Certificates
echo "### Reloading Nginx gateway with trusted Let's Encrypt TLS certificates..."
docker compose -f docker-compose.prod.yml exec proxy nginx -s reload

echo "✓ Production TLS Certificate successfully issued and installed for: ${DOMAINS[*]}"

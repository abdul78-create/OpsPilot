#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  OpsPilot AI — Production Cloud VM Bootstrap Script
#  Target OS: Ubuntu 22.04 / 24.04 LTS (x86_64 / arm64)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

echo "======================================================="
echo "  OpsPilot AI Production Cloud VM Bootstrap Initializer"
echo "======================================================="

# 1. System Updates & Prerequisites
echo "[1/6] Updating system packages & installing core utilities..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    jq

# 2. Hardened UFW Firewall Configuration
echo "[2/6] Configuring UFW firewall rules..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP / ACME Challenge'
sudo ufw allow 443/tcp comment 'HTTPS TLS Gateway'
echo "y" | sudo ufw enable
sudo ufw status verbose

# 3. Docker Official Repository & Engine Installation
echo "[3/6] Installing Docker CE and Docker Compose v2..."
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker "$USER"
fi

# 4. Directory Structure Creation
echo "[4/6] Creating deployment directory topology..."
DEPLOY_ROOT="/opt/opspilot"
sudo mkdir -p "${DEPLOY_ROOT}/infrastructure/certs"
sudo mkdir -p "${DEPLOY_ROOT}/infrastructure/nginx"
sudo mkdir -p "${DEPLOY_ROOT}/backups/postgres"
sudo chown -R "$USER":"$USER" "${DEPLOY_ROOT}"

# 5. Production Kernel Hardening Parameters
echo "[5/6] Applying sysctl kernel memory & networking optimizations..."
sudo tee -a /etc/sysctl.d/99-opspilot.conf << 'EOF'
# OpsPilot Production Sysctl Optimizations
vm.max_map_count=262144
net.core.somaxconn=1024
net.ipv4.tcp_max_syn_backlog=2048
net.ipv4.ip_local_port_range=1024 65535
EOF
sudo sysctl --system

echo "[6/6] Bootstrap completed successfully!"
echo "Next step: copy deployment manifests to /opt/opspilot and run init-letsencrypt.sh"

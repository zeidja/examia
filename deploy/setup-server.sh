#!/bin/bash
# One-time server setup for Examia on Hostinger (Ubuntu/Debian)
# Run as root: bash setup-server.sh

set -e
EXAMIA_DIR="/var/www/examia"
REPO_URL="${EXAMIA_REPO_URL:-https://github.com/zeidja/examia.git}"

echo "==> Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

echo "==> Installing Node.js 20.x..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
node -v
npm -v

echo "==> Installing Nginx..."
apt-get install -y nginx

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Creating app directory..."
mkdir -p "$EXAMIA_DIR"
cd "$EXAMIA_DIR"

if [ ! -d ".git" ]; then
    echo "==> Cloning repository (set EXAMIA_REPO_URL if private)..."
    git clone "$REPO_URL" .
else
    echo "==> Repo already cloned, skipping."
fi

echo "==> Backend: install deps..."
cd "$EXAMIA_DIR/backend"
npm ci --omit=dev

echo "==> Backend .env..."
if [ ! -f .env ]; then
    echo "Create $EXAMIA_DIR/backend/.env with your values (see backend/.env.example)."
    cp -n .env.example .env 2>/dev/null || true
fi

echo "==> Frontend: install deps and build..."
cd "$EXAMIA_DIR/frontend"
npm ci
npm run build

echo "==> Starting backend with PM2..."
cd "$EXAMIA_DIR/backend"
pm2 delete examia-backend 2>/dev/null || true
pm2 start server.js --name examia-backend
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "==> Nginx config..."
cp "$EXAMIA_DIR/deploy/nginx-examia.conf" /etc/nginx/sites-available/examia
ln -sf /etc/nginx/sites-available/examia /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== Setup done. Next steps:"
echo "1. Edit $EXAMIA_DIR/backend/.env with real MONGODB_URI, JWT_SECRET, OPENAI_API_KEY, SMTP, etc."
echo "2. Set CLIENT_URL=http://187.77.74.33 (your server IP)"
echo "3. Run: pm2 restart examia-backend"
echo "4. Open http://187.77.74.33 in browser"
echo ""

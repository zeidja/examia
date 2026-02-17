#!/bin/bash
# Deploy/update Examia on server. Run from repo root on server or via GitHub Actions.
set -e
EXAMIA_DIR="${EXAMIA_DIR:-/var/www/examia}"
cd "$EXAMIA_DIR"

echo "==> Pulling latest..."
git fetch origin
git reset --hard origin/main

echo "==> Backend: install and restart..."
cd "$EXAMIA_DIR/backend"
npm ci --omit=dev
pm2 restart examia-backend --update-env

echo "==> Frontend: install and build..."
cd "$EXAMIA_DIR/frontend"
npm ci
npm run build

echo "==> Reload nginx..."
nginx -t && systemctl reload nginx

echo "==> Deploy done."

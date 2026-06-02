# Examia deployment (Hostinger, IP only)

Deploy the app at **http://187.77.74.33**. Every push to `main` will auto-deploy via GitHub Actions.

---

## 1. One-time server setup

SSH into the server:

```bash
ssh root@187.77.74.33
```

Run the setup script (clone repo, install Node/Nginx/PM2, build frontend, configure nginx):

```bash
# If your repo is public:
curl -sSL https://raw.githubusercontent.com/zeidja/examia/main/deploy/setup-server.sh -o setup.sh
# Or clone the repo first and run:
# git clone https://github.com/zeidja/examia.git /tmp/examia
# bash /tmp/examia/deploy/setup-server.sh

# Set your repo URL if different (default: zeidja/examia):
export EXAMIA_REPO_URL=https://github.com/zeidja/examia.git
# For private repo use: https://YOUR_TOKEN@github.com/zeidja/examia.git

# Run setup (installs to /var/www/examia):
bash deploy/setup-server.sh
```

**Or** copy the repo to the server and run from inside it:

```bash
cd /var/www
git clone https://github.com/zeidja/examia.git
cd examia
# Edit deploy/setup-server.sh and set EXAMIA_REPO_URL if needed, then:
bash deploy/setup-server.sh
```

After setup:

1. Edit `/var/www/examia/backend/.env` with real values (see `backend/.env.example`).
2. Set **CLIENT_URL=http://187.77.74.33** (no trailing slash).
3. Restart backend: `pm2 restart examia-backend`.
4. Open **http://187.77.74.33** in the browser.

---

## 2. Auto-deploy on push (GitHub Actions)

GitHub’s runners often **cannot SSH to Hostinger on port 22** (`dial tcp …:22: i/o timeout`) because the VPS firewall blocks unknown IPs. Use the **webhook deploy** below (HTTP on port 80, already open for the app).

### Option A — Webhook deploy (recommended)

**On the server** (SSH from your computer still works):

```bash
ssh root@187.77.74.33

# Generate a long random secret
openssl rand -hex 32

# Add to backend env (use the value from above)
nano /var/www/examia/backend/.env
```

Add:

```env
DEPLOY_WEBHOOK_SECRET=paste-the-hex-secret-here
EXAMIA_DIR=/var/www/examia
```

Deploy the webhook route once (pull latest `main` manually if needed):

```bash
cd /var/www/examia && git pull origin main
cd backend && npm ci --omit=dev
pm2 restart examia-backend
```

Test from your laptop:

```bash
curl -sS -X POST -H "X-Deploy-Token: YOUR_SECRET" http://187.77.74.33/api/deploy/webhook
# Expect: {"message":"Deploy started"} and HTTP 202
```

**In GitHub** → **Settings → Secrets and variables → Actions**, add:

| Name | Value | Example |
|------|--------|---------|
| `DEPLOY_URL` | App base URL (no trailing slash) | `http://187.77.74.33` |
| `DEPLOY_WEBHOOK_SECRET` | Same value as server `.env` | (your hex secret) |

Push to `main` → workflow calls the webhook → server runs `deploy/deploy.sh`.

You can remove `DEPLOY_HOST` / `DEPLOY_SSH_KEY` secrets if you only use the webhook.

### Option B — SSH deploy (fallback)

Only works if port **22** is open to [GitHub Actions IP ranges](https://api.github.com/meta) (Hostinger firewall → allow SSH from those IPs, or disable “SSH only from whitelist”).

| Name | Value |
|------|--------|
| `DEPLOY_HOST` | `187.77.74.33` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | Private deploy key (see below) |
| `DEPLOY_PORT` | Optional, default `22` |

Create deploy key and add public key to `~/.ssh/authorized_keys` on the server (same as before). **Do not set** `DEPLOY_WEBHOOK_SECRET` if you want SSH-only; the workflow uses SSH when webhook secrets are empty.

### Troubleshooting

| Error | Fix |
|--------|-----|
| `dial tcp …:22: i/o timeout` | Use **Option A (webhook)** or open port 22 to GitHub Actions IPs in Hostinger. |
| Webhook `401` | `DEPLOY_WEBHOOK_SECRET` must match exactly on server and GitHub. |
| Webhook `503` | Set `DEPLOY_WEBHOOK_SECRET` in `/var/www/examia/backend/.env` and `pm2 restart examia-backend`. |
| Webhook `500` deploy script not found | Run `setup-server.sh` or clone repo to `/var/www/examia`. |

---

## 3. Manual deploy (optional)

SSH and run:

```bash
ssh root@187.77.74.33
cd /var/www/examia && bash deploy/deploy.sh
```

---

## Summary

- **App URL:** http://187.77.74.33  
- **Backend:** PM2 process `examia-backend` on port 5001.  
- **Frontend:** Nginx serves `frontend/dist` and proxies `/api` to the backend.  
- **Updates:** Push to `main` → GitHub Actions runs → server runs `deploy/deploy.sh`.

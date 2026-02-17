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

So that every push to `main` updates the server:

1. In GitHub: **Repo → Settings → Secrets and variables → Actions**.
2. Add these **Repository secrets**:

   | Name            | Value                    | Secret? |
   |-----------------|--------------------------|--------|
   | `DEPLOY_HOST`   | `187.77.74.33`           | Yes    |
   | `DEPLOY_USER`   | `root`                   | Yes    |
   | `DEPLOY_SSH_KEY`| Server SSH private key   | Yes    |

3. **Create deploy key on server** (so GitHub Actions can SSH in):

   On your **local machine** (or server):

   ```bash
   ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key -N ""
   ```

   - Add **public** key to the server:
     ```bash
     # Copy deploy_key.pub content to server's authorized_keys
     ssh root@187.77.74.33 "mkdir -p ~/.ssh && echo 'PASTE_deploy_key.pub_CONTENT' >> ~/.ssh/authorized_keys"
     ```
   - In GitHub: **Settings → Secrets → DEPLOY_SSH_KEY** → paste the **private** key content (`deploy_key`).
   - Delete local private key after: `rm deploy_key deploy_key.pub`

4. Push to `main`; the **Deploy to Server** workflow will run and execute `deploy/deploy.sh` on the server (pull, install, build, restart).

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

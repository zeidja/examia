import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

function tokensMatch(given, expected) {
  if (!given || !expected) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

let deploying = false;

/**
 * POST /api/deploy/webhook
 * Header: X-Deploy-Token: <DEPLOY_WEBHOOK_SECRET>
 * Starts deploy/deploy.sh on the server (for GitHub Actions when SSH:22 is blocked).
 */
export function deployWebhook(req, res) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ message: 'Deploy webhook is not configured on the server (set DEPLOY_WEBHOOK_SECRET).' });
  }

  const token = req.headers['x-deploy-token'];
  if (!tokensMatch(token, secret)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (deploying) {
    return res.status(409).json({ message: 'Deploy already in progress' });
  }

  const examiaDir = process.env.EXAMIA_DIR || '/var/www/examia';
  const script = path.join(examiaDir, 'deploy/deploy.sh');
  if (!fs.existsSync(script)) {
    return res.status(500).json({ message: `Deploy script not found: ${script}` });
  }

  deploying = true;
  res.status(202).json({ message: 'Deploy started' });

  const child = spawn('bash', [script], {
    cwd: examiaDir,
    env: { ...process.env, EXAMIA_DIR: examiaDir },
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const log = (prefix, chunk) => {
    const text = chunk.toString().trimEnd();
    if (text) console.log(`[deploy] ${prefix}`, text);
  };

  child.stdout?.on('data', (d) => log('stdout', d));
  child.stderr?.on('data', (d) => log('stderr', d));
  child.on('close', (code) => {
    deploying = false;
    console.log(`[deploy] finished with exit code ${code}`);
  });
  child.on('error', (err) => {
    deploying = false;
    console.error('[deploy] spawn error', err);
  });
}

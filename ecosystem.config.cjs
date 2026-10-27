/**
 * pm2 process file for the dashboard. One process in fork mode: the SSE
 * fan-out, rate limiter and mock simulation live in process memory.
 *
 *   npm ci && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "johood-dashboard",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "512M",
      env: { NODE_ENV: "production" },
      // Secrets come from .env.production next to this file (read by Next.js).
      time: true,
    },
  ],
};

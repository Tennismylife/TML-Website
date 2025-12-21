/**
 * PM2 ecosystem file for managing the refresh-mvs listener.
 * Replace placeholders (cwd, env DATABASE_URL, out_file paths, user home if needed) before use.
 */

module.exports = {
  apps: [
    {
      name: 'refresh-mvs',
      script: './scripts/refresh-mvs-listener.js',
      // Working directory for the app (set to your deployment path)
      cwd: '/var/www/TML-Website',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        // Prefer DATABASE_URL from the environment; fallback to placeholder for local dev
        DATABASE_URL: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/tennis',
        MV_REFRESH_DEBOUNCE_MS: process.env.MV_REFRESH_DEBOUNCE_MS || '5000',
        REFRESH_CONCURRENTLY: process.env.REFRESH_CONCURRENTLY || '0'
      },
      out_file: '/var/log/refresh-mvs/out.log',
      error_file: '/var/log/refresh-mvs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
};

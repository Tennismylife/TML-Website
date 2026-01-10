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
        MV_REFRESH_DEBOUNCE_MS: '5000',
        REFRESH_CONCURRENTLY: '0'
      },
      out_file: '/var/log/refresh-mvs/out.log',
      error_file: '/var/log/refresh-mvs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    },
    // Main web server (PM2): start with `pm2 start deploy/ecosystem.config.js --env production`
    {
      name: 'tml',
      script: './server.js',
      cwd: '/var/www/TML-Website',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      env_production: {
        NODE_ENV: 'production',
        // IMPORTANT: These are placeholders for convenience. Do NOT commit real secrets to VCS.
        // Prefer setting real values via `pm2 restart tml --update-env` or an external env file
        // (e.g. /etc/default/tml) with secure permissions (chmod 600).
        PORT: '3000',
        NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-71D4H6D4VN',
        GA4_MEASUREMENT_ID: 'G-71D4H6D4VN',
        GA4_API_SECRET: 'uamHcS3AT1miokEH0aeGtg',
        GA4_FALLBACK_DEBUG: '1',
        REDIS_URL: 'redis://127.0.0.1:6379',
        DATABASE_URL: 'postgresql://postgres:miapasswords@localhost:5432/tennis',
        SENTRY_DSN: '',
        OTHER_ENV: ''
      },
      out_file: '/var/log/tml/out.log',
      error_file: '/var/log/tml/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
};

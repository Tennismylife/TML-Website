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
        // Replace the DATABASE_URL placeholder with your real connection string
        DATABASE_URL: 'postgres://user:pass@localhost:5432/tennis',
        MV_REFRESH_DEBOUNCE_MS: '5000',
        REFRESH_CONCURRENTLY: '0'
      },
      out_file: '/var/log/refresh-mvs/out.log',
      error_file: '/var/log/refresh-mvs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
};

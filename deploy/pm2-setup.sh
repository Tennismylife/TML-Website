#!/usr/bin/env bash
set -euo pipefail

# deploy/pm2-setup.sh
# Usage:
#   sudo ./deploy/pm2-setup.sh /var/www/tml-website deploy "postgres://user:pass@host:5432/tennis"

APP_DIR=${1:-/var/www/TML-Website}
SERVICE_USER=${2:-deploy}
# Allow DATABASE_URL to be provided as 3rd arg or via env var DATABASE_URL
DATABASE_URL=${3:-${DATABASE_URL:-}}

if [ -z "$DATABASE_URL" ]; then
  echo "Usage: $0 <app_dir> <service_user> <DATABASE_URL>"
  echo "Or set DATABASE_URL env variable before running the script."
  exit 1
fi

# Ensure pm2 is installed globally
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing pm2 globally..."
  npm install -g pm2
fi

# Ensure log directory exists and is owned by service user
sudo mkdir -p /var/log/refresh-mvs
sudo chown $SERVICE_USER:$SERVICE_USER /var/log/refresh-mvs

# Prepare a temporary ecosystem file with the provided values
TMP_ECOSYS="$APP_DIR/deploy/ecosystem.config.tmp.js"
cp "$APP_DIR/deploy/ecosystem.config.js" "$TMP_ECOSYS"
sed -i "s|/path/to/your/app|$APP_DIR|g" "$TMP_ECOSYS"
sed -i "s|postgres://user:pass@localhost:5432/tennis|$DATABASE_URL|g" "$TMP_ECOSYS"

# Start the process (production env)
cd "$APP_DIR"
# Install production deps if needed
npm ci --omit=dev || true
# Create an env file for the service (optional) so the process has access to DATABASE_URL
echo "DATABASE_URL=\"$DATABASE_URL\"" > "$APP_DIR/deploy/refresh-mvs.env"
echo "MV_REFRESH_DEBOUNCE_MS=${MV_REFRESH_DEBOUNCE_MS:-5000}" >> "$APP_DIR/deploy/refresh-mvs.env"
echo "REFRESH_CONCURRENTLY=${REFRESH_CONCURRENTLY:-0}" >> "$APP_DIR/deploy/refresh-mvs.env"

# Optionally create an env file for the main web process so PM2 can load site-specific envs (e.g., NEXT_PUBLIC_SITE_URL)
SITE_URL=${4:-${NEXT_PUBLIC_SITE_URL:-https://stats.tennismylife.org}}
# Create or overwrite a tml env file with canonical site origin and DATABASE_URL
echo "NEXT_PUBLIC_SITE_URL=\"${SITE_URL}\"" > "$APP_DIR/deploy/tml.env"
echo "DATABASE_URL=\"$DATABASE_URL\"" >> "$APP_DIR/deploy/tml.env"
# You can add additional production envs here as needed

# Start via pm2 with the tmp ecosystem (it reads env from the file we created)
pm2 start "$TMP_ECOSYS" --env production
pm2 save

# Configure PM2 to startup on boot for the service user
# This will print a command that may need sudo; we try to run it to register systemd unit
STARTUP_CMD=$(pm2 startup systemd -u "$SERVICE_USER" --hp "/home/$SERVICE_USER" | tail -n 1)
if [ -n "$STARTUP_CMD" ]; then
  echo "Running recommended startup command: $STARTUP_CMD"
  # print it for user's info and run it
  echo "$STARTUP_CMD"
  sudo sh -c "$STARTUP_CMD" || true
fi

echo "PM2 configured and refresh-mvs started. Run 'pm2 status' to check." 

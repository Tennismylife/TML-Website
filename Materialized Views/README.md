Materialized Views - Automation

Goal
----
Provide an event-driven way to refresh materialized views when source tables are updated, plus a fallback cron/one-shot mechanism.

Files
-----
- `mv_notify_trigger.sql`: creates a `notify_mvs()` trigger function and example triggers on common tables (Match, Player, Tournament, PlayerTournament, Ranking). Run on your DB once to install triggers.
- `run_all_mvs.sh`: Linux-friendly script that executes .sql files (useful for cron or manual runs).
- `run_all_mvs.bat`: Windows equivalent (already present).

Recommended (event-driven) setup
--------------------------------
1. Run `mv_notify_trigger.sql` in your Postgres DB (psql -f mv_notify_trigger.sql). Adjust table names in the script if your schema uses different names.
2. Start the listener as a long-running process (systemd, docker sidecar, etc.):

   DATABASE_URL=postgres://user:pass@localhost:5432/tennis node scripts/refresh-mvs-listener.js

   - LISTENs for `mvs_needs_refresh` notifications and refreshes MVs after a short debounce.
   - Set environment variable `MV_REFRESH_DEBOUNCE_MS` to tweak debounce delay (default 5000 ms).
   - Set `REFRESH_CONCURRENTLY=1` to attempt `REFRESH MATERIALIZED VIEW CONCURRENTLY`, but ensure your MVs have the required indexes.

Fallback (cron / periodic) setup
-------------------------------
If you prefer periodic refreshes, you can either:

- Use the one-shot mode from the listener script in a cron job:
  DATABASE_URL=... node scripts/refresh-mvs-listener.js --once

- Or call the shell script directly with correct PG environment variables:
  PGPASSWORD=... PGUSER=postgres PGDATABASE=tennis ./Materialized\ Views/run_all_mvs.sh

Systemd unit example
--------------------
Place `/etc/systemd/system/refresh-mvs.service` with this content (example):

```
[Unit]
Description=Refresh materialized views listener
After=network.target

[Service]
Environment=DATABASE_URL=postgres://user:pass@localhost:5432/tennis
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node /path/to/your/app/scripts/refresh-mvs-listener.js
Restart=always
User=youruser

[Install]
WantedBy=multi-user.target
```

Security note
-------------
Ensure the service runs under a user with minimal privileges and that `DATABASE_URL` is kept secret (use a secrets manager or environment file).

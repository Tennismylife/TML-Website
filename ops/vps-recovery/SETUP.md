# VPS Recovery Watchdog setup

This watchdog is designed to run entirely on GitHub-hosted runners. The local PC is not involved after initial setup.

## GitHub Actions secrets

Configure these repository Actions secrets:

- `WATCHDOG_ARMED` — keep `false` until the dry-run succeeds; set to `true` only when ready.
- `WATCHDOG_HOST` — VPS public IP or hostname.
- `WATCHDOG_PORT` — TCP port used for health checks (SSH is recommended).
- `IONOS_CP_USER` — dedicated IONOS Cloud Panel user name.
- `IONOS_CP_PASSWORD` — password for that dedicated Cloud Panel user.
- `IONOS_SERVER_LABEL` — the exact server name/label shown in Infrastructure > Servers.

Do not commit any of these values to the repository.

## IONOS account

Create a dedicated Cloud Panel user under Management > Users. Prefer a dedicated role which can display the target server and perform only the actions required to restart it. Do not use the primary IONOS account for the automation.

The dedicated Cloud Panel user must be able to sign in at:

`https://cloudpanel.ionos.com/login.php`

For this recovery-only user, do not require interactive 2FA unless the workflow is later extended to generate a TOTP code from a GitHub Secret.

## Safe commissioning

1. Add all secrets but keep `WATCHDOG_ARMED=false`.
2. Open Actions > VPS Recovery Watchdog > Run workflow.
3. Leave `login_test=true` and run it.
4. The dry-run must log that login, server selection and the Restart action were found, while explicitly not confirming the restart.
5. Only after the dry-run succeeds, change `WATCHDOG_ARMED` to `true`.

## Runtime behavior

Every five minutes GitHub checks the configured TCP port. A scheduled restart is attempted only after five failed checks, followed by a second three-attempt confirmation. The workflow then logs in to IONOS, chooses the configured server, requests Restart and waits for the VPS to become reachable again.

GitHub scheduled workflows can be delayed under load, so this is intended as automatic recovery rather than real-time failover.

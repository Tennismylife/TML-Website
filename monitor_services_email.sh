#!/bin/bash

TO_EMAIL="tuo@email.com"
SUBJECT_PREFIX="[Monitor Servizi]"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/service-monitor.log"

# Crea log se non esiste
touch "$LOG_FILE"
echo "$(date) - Script avviato" >> "$LOG_FILE"

send_email() {
    local subject="$1"
    local body="$2"
    echo -e "$body" | mail -s "$subject" "$TO_EMAIL"
}

while true; do
    # Controlla Node.js (tennis-cache)
    pm2 describe tennis-cache | grep status | grep -q "online"
    if [ $? -ne 0 ]; then
        echo "$(date) - Node.js non risponde, riavvio..." >> "$LOG_FILE"
        pm2 restart tennis-cache
        send_email "$SUBJECT_PREFIX Node.js riavviato" "Node.js tennis-cache è stato riavviato sul VPS $(hostname) alle $(date)"
    else
        echo "$(date) - Node.js OK" >> "$LOG_FILE"
    fi

    # Controlla Nginx
    if ! systemctl is-active --quiet nginx; then
        echo "$(date) - Nginx non attivo, riavvio..." >> "$LOG_FILE"
        systemctl restart nginx
        send_email "$SUBJECT_PREFIX Nginx riavviato" "Nginx è stato riavviato sul VPS $(hostname) alle $(date)"
    fi

    # Controlla Postgres
    if ! systemctl is-active --quiet postgresql; then
        echo "$(date) - Postgres non attivo, riavvio..." >> "$LOG_FILE"
        systemctl restart postgresql
        send_email "$SUBJECT_PREFIX Postgres riavviato" "Postgres è stato riavviato sul VPS $(hostname) alle $(date)"
    fi

    sleep 10  # ciclo veloce per test
done

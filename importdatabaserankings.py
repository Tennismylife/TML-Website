import os
import glob
import psycopg2
import csv
from datetime import datetime
from collections import defaultdict

# ---------------------------
# Configurazione
PROJECT_DIR = r"C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TML-Rankings-Database\TML Rankings"
CSV_FOLDER = PROJECT_DIR  # Cartella contenente tutti i CSV

# Parametri DB
USER = "postgres"
PASSWORD = "postgres"
DBNAME = "tennis"
HOST = "localhost"
PORT = 5432

# ---------------------------
# Connessione PostgreSQL
def get_connection():
    return psycopg2.connect(
        dbname=DBNAME,
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=PORT
    )

# ---------------------------
# Creazione schema RankingDate e Ranking
def create_schema():
    print("🔹 Creazione schema RankingDate e Ranking...")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('DROP TABLE IF EXISTS "Ranking" CASCADE;')
            cur.execute('DROP TABLE IF EXISTS "RankingDate" CASCADE;')
            cur.execute("""
            CREATE TABLE "RankingDate" (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL
            );
            """)
            cur.execute("""
            CREATE TABLE "Ranking" (
                id SERIAL PRIMARY KEY,
                rank INT NOT NULL,
                points INT NOT NULL,
                "playerId" VARCHAR(255) NOT NULL,
                "rankingDateId" INT REFERENCES "RankingDate"(id),
                UNIQUE("rankingDateId", "playerId")
            );
            """)
    print("✅ Schema creato da zero.")

# ---------------------------
# Funzione di conversione sicura per interi
def safe_int(value, default=0):
    try:
        return int(value)
    except (ValueError, TypeError):
        return default

# ---------------------------
# Import CSV multipli con filtro primi 200
def import_csv_folder():
    print(f"🔹 Import CSV dalla cartella {CSV_FOLDER}...")
    csv_files = glob.glob(os.path.join(CSV_FOLDER, "*.csv"))
    if not csv_files:
        print("❌ Nessun CSV trovato nella cartella!")
        return

    generated_id_counter = 1
    with get_connection() as conn:
        with conn.cursor() as cur:
            total_files = len(csv_files)
            for idx_file, csv_file in enumerate(sorted(csv_files), 1):
                print(f"\n📂 Elaborazione file {idx_file}/{total_files}: {os.path.basename(csv_file)}")
                rows_by_date = defaultdict(list)

                with open(csv_file, newline="", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        rows_by_date[row["date"]].append(row)

                total_dates = len(rows_by_date)
                processed_dates = 0

                for date_str, rows in sorted(rows_by_date.items()):
                    processed_dates += 1
                    # Ordina per rank e prendi solo primi 200
                    rows_sorted = sorted(rows, key=lambda x: safe_int(x["rank"]))[:200]

                    try:
                        date = datetime.strptime(date_str, "%Y%m%d").date()
                    except ValueError:
                        print(f"⚠️ Data malformata ignorata: {date_str}")
                        continue

                    # RankingDate
                    cur.execute("""
                        INSERT INTO "RankingDate" (date)
                        VALUES (%s)
                        ON CONFLICT (date) DO NOTHING;
                    """, (date,))
                    cur.execute('SELECT id FROM "RankingDate" WHERE date = %s;', (date,))
                    ranking_date_id = cur.fetchone()[0]

                    for row in rows_sorted:
                        rank = safe_int(row.get("rank"))
                        points = safe_int(row.get("points"))
                        player_id = row.get("id", "").strip()

                        if not player_id:
                            player_id = f"TEMP{generated_id_counter:04d}"
                            generated_id_counter += 1

                        cur.execute("""
                            INSERT INTO "Ranking" (rank, points, "playerId", "rankingDateId")
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT ("rankingDateId", "playerId") DO NOTHING;
                        """, (rank, points, player_id, ranking_date_id))

                    print(f"📅 Importata data {date} ({processed_dates}/{total_dates})")

        conn.commit()
    print("\n✅ Tutti i CSV importati con successo!")

# ---------------------------
# Main
def main():
    create_schema()
    import_csv_folder()

if __name__ == "__main__":
    main()

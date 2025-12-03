import os
import sys
import subprocess
import importlib.util
import pandas as pd
import re
import psycopg2
from psycopg2.extras import execute_values

# === Pacchetti runtime necessari ===
def ensure_package(package_name):
    if importlib.util.find_spec(package_name) is None:
        print(f"Pacchetto '{package_name}' non trovato. Installazione in corso...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        print(f"✅ '{package_name}' installato con successo.")
    else:
        print(f"'{package_name}' è già installato.")

ensure_package("openpyxl")
ensure_package("psycopg2-binary")

# === Percorsi ===
BASE_PATH = r"C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\ATP Rankings for Website"
EXCEL_FILE = os.path.join(BASE_PATH, "Collection.xlsx")
OUTPUT_FILE = os.path.join(BASE_PATH, "collection.csv")
ALL_MATCHES_FILE = os.path.join(BASE_PATH, "allmatches.csv")  # aggiornato

# === Parametri Excel/Parsing ===
YEAR_MIN, YEAR_MAX = 1973, 1989
TARGET_COLUMNS = {
    "TOURNAMENT": "tournament",
    "START DATE": "start_date",
    "PRIZE MONEY": "prize_money",
    "ATP CATEGORY": "atp_category",
}
OUTPUT_ORDER = ["year", "tournament", "start_date", "prize_money", "atp_category"]

# === Parametri Postgres ===
DB_USER = "postgres"
DB_PASS = "postgres"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "tennis"
TABLE_NAME = "RankingTable"

# === Funzioni di utilità ===
def normalize_headers(cols):
    norm = {}
    for c in cols:
        if c is None:
            continue
        key = str(c).strip().upper().replace("\u00a0", " ")
        key = " ".join(key.split())
        norm[c] = key
    return norm

def find_column(df, wanted_upper):
    mapping = normalize_headers(df.columns)
    for orig, up in mapping.items():
        if up == wanted_upper:
            return orig
    for orig, up in mapping.items():
        if wanted_upper.replace(" ", "") == up.replace(" ", ""):
            return orig
    return None

def clean_prize_money(value):
    """
    Pulisce e formatta i prize money:
    es. '€200000' -> '$200.000'
    """
    if value is None:
        return ""
    s = str(value)
    if s.strip() == "":
        return ""
    digits = re.sub(r"[^\d]", "", s)
    if not digits:
        return ""
    formatted = "{:,}".format(int(digits)).replace(",", ".")
    return f"${formatted}"

def drop_and_create_table_pg(conn):
    table = f'"{TABLE_NAME}"'
    ddl = f"""
        DROP TABLE IF EXISTS {table};
        CREATE TABLE {table} (
            "id" INTEGER PRIMARY KEY,
            "year" TEXT NOT NULL,
            "tournament" TEXT NOT NULL,
            "start_date" TEXT,
            "prize_money" TEXT,
            "atp_category" TEXT,
            "tourney_id" TEXT
        );
        CREATE INDEX ON {table} ("year");
        CREATE INDEX ON {table} ("tournament");
        CREATE INDEX ON {table} ("start_date");
    """
    with conn.cursor() as cur:
        cur.execute(ddl)
    conn.commit()
    print(f"🗑️ Tabella {table} cancellata e ricreata.")

def save_to_postgres(final_df):
    print("🗂️ Scrivo nel database Postgres...")
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT,
        )
        drop_and_create_table_pg(conn)
        # ✅ Includiamo esplicitamente la colonna year nel DB
        rows = final_df[["id", "year", "tournament", "start_date", "prize_money", "atp_category", "tourney_id"]].values.tolist()
        table = f'"{TABLE_NAME}"'
        cols = '("id", "year", "tournament", "start_date", "prize_money", "atp_category", "tourney_id")'
        insert_sql = f"INSERT INTO {table} {cols} VALUES %s"
        with conn.cursor() as cur:
            execute_values(cur, insert_sql, rows, page_size=10000)
        conn.commit()
        print(f"✅ Dati inseriti in Postgres: {len(rows)} righe")
    except Exception as e:
        print(f"ERRORE Postgres: {e}", file=sys.stderr)
        if conn:
            conn.rollback()
        sys.exit(5)
    finally:
        if conn:
            conn.close()

# === Main ===
def main():
    if os.path.exists(OUTPUT_FILE):
        try:
            os.remove(OUTPUT_FILE)
            print(f"🗑️ File precedente eliminato: {OUTPUT_FILE}")
        except Exception as e:
            print(f"ERRORE eliminazione file: {e}", file=sys.stderr)
            sys.exit(1)

    if not os.path.exists(EXCEL_FILE):
        print(f"ERRORE: file non trovato: {EXCEL_FILE}", file=sys.stderr)
        sys.exit(1)

    print(f"📘 Leggo Excel: {EXCEL_FILE}")
    try:
        xls = pd.ExcelFile(EXCEL_FILE)
    except Exception as e:
        print(f"ERRORE apertura Excel: {e}", file=sys.stderr)
        sys.exit(1)

    all_parts = []
    sheets_processed = 0
    sheets_skipped = 0
    total_rows_in = 0
    total_rows_out = 0

    for sheet in xls.sheet_names:
        if not (sheet.isdigit() and YEAR_MIN <= int(sheet) <= YEAR_MAX):
            continue
        print(f"\nElaboro foglio: {sheet} ...")
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name=sheet, dtype=str, engine="openpyxl")
        except Exception as e:
            print(f"  - ERRORE lettura foglio {sheet}: {e}. Foglio saltato.")
            sheets_skipped += 1
            continue
        df = df.dropna(how="all")
        if df.empty:
            print(f"  - Nessun dato nel foglio {sheet}, salto.")
            sheets_skipped += 1
            continue
        total_rows_in += len(df)
        col_map = {}
        missing = []
        for wanted, out_name in TARGET_COLUMNS.items():
            orig = find_column(df, wanted_upper=wanted)
            if orig is None:
                missing.append(wanted)
            else:
                col_map[out_name] = orig
        if missing:
            print(f"  - Attenzione: nel foglio {sheet} mancano le colonne: {', '.join(missing)}. Foglio saltato.")
            sheets_skipped += 1
            continue
        part = df[[col_map["tournament"], col_map["start_date"], col_map["prize_money"], col_map["atp_category"]]].copy()
        part.columns = ["tournament", "start_date", "prize_money", "atp_category"]
        for c in part.columns:
            part[c] = part[c].astype(str).str.replace("\u00a0", " ", regex=False).str.strip()
        parsed_dates = pd.to_datetime(part["start_date"], errors="coerce")
        part["start_date"] = parsed_dates.dt.strftime("%Y-%m-%d")
        part["start_date"] = part["start_date"].fillna("")
        part["prize_money"] = part["prize_money"].apply(clean_prize_money)
        part["year"] = sheet
        part = part[OUTPUT_ORDER]
        part = part.dropna(how="all", subset=["tournament", "start_date", "prize_money", "atp_category"])
        if part.empty:
            print(f"  - Dopo pulizia nessuna riga valida, salto foglio {sheet}.")
            sheets_skipped += 1
            continue
        all_parts.append(part)
        sheets_processed += 1
        total_rows_out += len(part)
        print(f"  - Righe raccolte: {len(part)}")

    if not all_parts:
        print("Nessun dato da salvare.", file=sys.stderr)
        print(f"Statistiche: fogli elaborati={sheets_processed}, fogli saltati={sheets_skipped}, righe in={total_rows_in}, righe out={total_rows_out}")
        sys.exit(2)

    final_df = pd.concat(all_parts, ignore_index=True)
    final_df.insert(0, "id", range(1, len(final_df) + 1))  # ID temporaneo

    # === Merge con allmatches.csv usando il campo year di allmatches ===
    if not os.path.exists(ALL_MATCHES_FILE):
        print(f"ERRORE: file allmatches.csv non trovato: {ALL_MATCHES_FILE}", file=sys.stderr)
        sys.exit(1)

    matches_df = pd.read_csv(ALL_MATCHES_FILE, dtype=str)
    matches_df["tourney_date"] = pd.to_datetime(matches_df["tourney_date"], format="%Y%m%d", errors="coerce")

    # Merge usando direttamente il campo year presente in allmatches
    matches_unique = matches_df.sort_values("tourney_date").drop_duplicates(subset=["year", "tournament"])

    merged_df = final_df.merge(
        matches_unique[["year", "tournament", "tourney_date", "tourney_id"]],
        how="left",
        left_on=["year", "tournament"],
        right_on=["year", "tournament"]
    )

    # Aggiorna start_date solo se tourney_date esiste
    merged_df["start_date"] = merged_df["tourney_date"].dt.strftime("%Y-%m-%d").combine_first(merged_df["start_date"])
    merged_df["tourney_id"] = merged_df["tourney_id"]

    # Colonne finali
    final_cols = ["id", "year", "tournament", "start_date", "prize_money", "atp_category", "tourney_id"]
    final_df = merged_df[final_cols]
    final_df["id"] = range(1, len(final_df) + 1)

    # Salva CSV
    final_df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    # Scrivi su Postgres
    save_to_postgres(final_df)

    print(f"\n✅ CSV creato e aggiornato con tourney_id: {OUTPUT_FILE}")
    print(f"   Righe totali: {len(final_df)}")
    print(f"   Colonne: {', '.join(final_df.columns)}")
    print(f"   Fogli elaborati: {sheets_processed} | Fogli saltati: {sheets_skipped}")
    print(f"   Righe in ingresso: {total_rows_in} | Righe in uscita: {total_rows_out}")
    print(f"   Database: {DB_NAME} | Tabella: {TABLE_NAME}")

if __name__ == "__main__":
    main()

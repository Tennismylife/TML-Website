import subprocess
import sys
import pandas as pd
from sqlalchemy import create_engine, text
import logging
import chardet

# ---------------------------
# Funzione per installare moduli se mancanti
def install_module(module, pip_name=None):
    try:
        __import__(module)
        print(f"Modulo '{module}' già installato.")
    except ImportError:
        print(f"Modulo '{module}' non trovato. Installazione in corso...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name or module])

# Controllo/installazione dei moduli necessari
for module, pip_name in [("pandas", None), ("sqlalchemy", "SQLAlchemy"), ("psycopg2", "psycopg2-binary"), ("chardet", None)]:
    install_module(module, pip_name)

# ---------------------------
# Parametri di connessione
db_user = "postgres"
db_pass = "Matlab1985911"
db_host = "87.106.40.188"
db_port = "5432"
db_name = "tennis"

# Percorso del CSV dei match
csv_file = "allmatches.csv"

# Nome della tabella da aggiornare
table_name = "Match"

# ---------------------------
# Funzione robusta per leggere CSV
def safe_read_csv(path):
    with open(path, "rb") as f:
        rawdata = f.read(100000)
        result = chardet.detect(rawdata)

    encoding = result["encoding"]
    confidence = result["confidence"]
    print(f"Rilevata codifica CSV: {encoding} (confidenza {confidence:.2f})")

    if not encoding or encoding.lower() in ["ascii", "ansi"]:
        encoding = "utf-8"
        print(f"⚠️ Codifica forzata a {encoding}")

    try:
        df = pd.read_csv(
            path,
            encoding=encoding,
            quotechar='"',
            doublequote=True,
            na_values=['', 'NA'],
            on_bad_lines="skip"
        )
        print(f"CSV letto correttamente con encoding {encoding}. Righe: {len(df)}")
        return df
    except UnicodeDecodeError as e:
        print(f"Errore con codifica {encoding}: {e}")
        print("➡️ Riprovo con 'latin1'...")
        df = pd.read_csv(
            path,
            encoding="latin1",
            quotechar='"',
            doublequote=True,
            na_values=['', 'NA'],
            on_bad_lines="skip"
        )
        print(f"CSV letto correttamente con encoding latin1. Righe: {len(df)}")
        return df

# ---------------------------
# Lettura CSV
try:
    df = safe_read_csv(csv_file)
except Exception as e:
    print(f"Errore nella lettura del CSV: {e}")
    sys.exit(1)

# ---------------------------
# Escludi la colonna 'indoor' se presente
if 'indoor' in df.columns:
    df = df.drop(columns=['indoor'])
    print("Colonna 'indoor' rimossa dal DataFrame.")

# Forza 'tourney_id' come stringa senza decimali
if 'tourney_id' in df.columns:
    df['tourney_id'] = df['tourney_id'].astype('Int64').astype(str).fillna('')

# Pulizia eventuali virgolette residue
for col in df.select_dtypes(include='object').columns:
    df[col] = df[col].str.replace('"', '', regex=False)

# Conversione colonne data/numero se esistono
if 'tourney_date' in df.columns:
    df['tourney_date'] = pd.to_datetime(df['tourney_date'], format='%Y%m%d', errors='coerce')

numeric_cols = [
    'draw_size', 'winner_seed', 'winner_ht', 'winner_age', 'winner_rank', 'winner_rank_points',
    'loser_seed', 'loser_ht', 'loser_age', 'loser_rank', 'loser_rank_points', 'match_num',
    'best_of', 'minutes', 'w_ace', 'w_df', 'w_svpt', 'w_1stIn', 'w_1stWon', 'w_2ndWon', 'w_SvGms', 'w_bpSaved', 'w_bpFaced',
    'l_ace', 'l_df', 'l_svpt', 'l_1stIn', 'l_1stWon', 'l_2ndWon', 'l_SvGms', 'l_bpSaved', 'l_bpFaced'
]

for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

# ---------------------------
# Crea connessione a PostgreSQL
try:
    engine = create_engine(f'postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}')
except Exception as e:
    print(f"Errore nella connessione al DB: {e}")
    sys.exit(1)

# Abilita log SQL per debug
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# ---------------------------
# Funzione per creare la tabella se non esiste
def create_table_if_not_exists():
    try:
        with engine.begin() as conn:
            print(f"Verifico esistenza tabella '{table_name}'...")

            conn.execute(text(f'''
                CREATE TABLE IF NOT EXISTS "{table_name}" (
                    temp_id SERIAL PRIMARY KEY
                )
            '''))

            # Ora provo a far creare lo schema corretto da pandas (solo se vuota)
            empty = pd.read_sql(text(f'SELECT COUNT(*) AS c FROM "{table_name}"'), conn)['c'][0] == 0

            if empty:
                print("Tabella vuota: creo schema reale con to_sql()...")
                df.head(0).to_sql(table_name, conn, if_exists='replace', index=False)
                print(f"Struttura tabella '{table_name}' creata correttamente.")
            else:
                print(f"La tabella '{table_name}' esiste già.")
    except Exception as e:
        print(f"Errore nella creazione della tabella: {e}")
        sys.exit(1)

# ---------------------------
# CREA TABELLA (prima esecuzione)
create_table_if_not_exists()

# ---------------------------
# Sostituzione dati senza cancellare la tabella
try:
    with engine.begin() as conn:
        conn.execute(text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE'))
        print(f"Tabella '{table_name}' svuotata correttamente.")

        df.to_sql(table_name, conn, if_exists='append', index=False, method='multi', chunksize=1000)
        print(f"Dati importati con successo nella tabella '{table_name}'!")

        result = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
        count = result.scalar()
        print(f"Numero di righe nella tabella '{table_name}': {count}")

        result = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5'))
        print("Prime 5 righe della tabella:")
        for row in result:
            print(row)

except Exception as e:
    print(f"Errore durante l'importazione nel DB: {e}")
    sys.exit(1)

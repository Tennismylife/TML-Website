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
db_pass = "postgres"
db_host = "localhost"
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
# Forza 'tourney_id' come stringa senza decimali
if 'tourney_id' in df.columns:
    df['tourney_id'] = df['tourney_id'].apply(lambda x: str(int(float(x))) if pd.notna(x) else '')

# Pulizia eventuali virgolette residue (versione veloce)
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
# Sostituzione dati senza cancellare la tabella
try:
    with engine.begin() as conn:
        # Svuota la tabella (TRUNCATE) mantenendo la struttura e le materialized view
        conn.execute(text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE'))
        print(f"Tabella '{table_name}' svuotata correttamente.")

        # Inserisci i dati dal DataFrame
        df.to_sql(table_name, conn, if_exists='append', index=False, method='multi', chunksize=1000)
        print(f"Dati importati con successo nella tabella '{table_name}'!")

        # Controlla il numero di righe importate
        result = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
        count = result.scalar()
        print(f"Numero di righe nella tabella '{table_name}': {count}")

        # Mostra le prime 5 righe
        result = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5'))
        print("Prime 5 righe della tabella:")
        for row in result:
            print(row)
except Exception as e:
    print(f"Errore durante l'importazione nel DB: {e}")
    sys.exit(1)

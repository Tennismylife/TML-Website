import subprocess
import sys
import pandas as pd
from sqlalchemy import create_engine, text
import logging
import json

# ---------------------------
# Funzione per installare moduli se mancanti
def install_module(module):
    try:
        __import__(module)
        print(f"Modulo '{module}' già installato.")
    except ImportError:
        print(f"Modulo '{module}' non trovato. Installazione in corso...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", module])

# Controllo/installazione dei moduli necessari
for module in ["pandas", "SQLAlchemy", "psycopg2-binary"]:
    install_module(module)

# ---------------------------
# Parametri di connessione
db_user = "postgres"
db_pass = "postgres"
db_host = "localhost"
db_port = "5432"
db_name = "tennis"

# Percorso del JSON
json_file = "tournaments.json"

# Nome della tabella da creare
table_name = "Tournament"

# ---------------------------
# Leggi il JSON
try:
    df = pd.read_json(json_file, convert_dates=False)
    print(f"JSON letto correttamente. Numero di righe: {len(df)}")
except Exception as e:
    print(f"Errore nella lettura del JSON: {e}")
    sys.exit(1)

# ---------------------------
# Pulizia eventuali virgolette residue
df = df.applymap(lambda x: x.replace('"', '') if isinstance(x, str) else x)

# ---------------------------
# Converti eventuali colonne di data (es. start_date, end_date) in formato PostgreSQL
for col in ['start_date', 'end_date']:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')

# ---------------------------
# Converti colonne complesse (dict/list) in stringhe JSON
for col in df.columns:
    if df[col].dtype == 'object':
        df[col] = df[col].apply(lambda x: json.dumps(x) if isinstance(x, (dict, list)) else x)

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
# Importa JSON in PostgreSQL
try:
    with engine.begin() as conn:
        # Elimina la tabella se esiste
        conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))
        print(f"Tabella '{table_name}' eliminata (se esisteva).")
        
        # Scrivi il DataFrame in PostgreSQL
        df.to_sql(table_name, conn, if_exists='fail', index=False, method='multi', chunksize=5000)
        print(f"JSON importato con successo nella tabella '{table_name}'!")
        
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

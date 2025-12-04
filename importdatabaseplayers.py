import os
import subprocess
import sys
import pandas as pd
from sqlalchemy import create_engine, text
import logging
import chardet

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
for module in ["pandas", "SQLAlchemy", "psycopg2-binary", "chardet"]:
    install_module(module)

# ---------------------------
# Parametri di connessione
db_user = "postgres"
db_pass = "postgres"
db_host = "localhost"
db_port = "5432"
db_name = "tennis"


db_user = "postgres"
db_pass = "Matlab1985911"
db_host = "87.106.40.188"
db_port = "5432"
db_name = "tennis"


# Percorso del CSV
csv_file = "ATP_Database.csv"
table_name = "Player"

# ---------------------------
# Rileva automaticamente la codifica del CSV
with open(csv_file, "rb") as f:
    rawdata = f.read(100000)
    result = chardet.detect(rawdata)
encoding = result['encoding']
print(f"Rilevata codifica CSV: {encoding}")

# Leggi il CSV gestendo virgolette e valori vuoti
try:
    df = pd.read_csv(
        csv_file,
        encoding=encoding,
        quotechar='"',
        doublequote=True,
        na_values=['', 'NA']
    )
    print(f"CSV letto correttamente. Numero di righe: {len(df)}")
except Exception as e:
    print(f"Errore nella lettura del CSV: {e}")
    sys.exit(1)

# Pulizia eventuali virgolette residue
df = df.applymap(lambda x: x.replace('"', '') if isinstance(x, str) else x)

# Converti 'birthdate' in formato data PostgreSQL
if 'birthdate' in df.columns:
    df['birthdate'] = pd.to_datetime(df['birthdate'], format='%Y%m%d', errors='coerce')

# ---------------------------
# Crea id univoco se manca
if 'id' not in df.columns:
    df['id'] = [f"P{str(i+1).zfill(4)}" for i in range(len(df))]
    print("Colonna 'id' creata automaticamente.")

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
# Importa CSV in PostgreSQL
try:
    with engine.begin() as conn:
        # Elimina la tabella se esiste
        conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))
        print(f"Tabella '{table_name}' eliminata (se esisteva).")
        
        # Scrivi il DataFrame in PostgreSQL
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        print(f"CSV importato con successo nella tabella '{table_name}'!")
        
        # Imposta PRIMARY KEY su id
        conn.execute(text(f'ALTER TABLE "{table_name}" ADD PRIMARY KEY (id);'))
        print("Colonna 'id' impostata come PRIMARY KEY.")
        
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

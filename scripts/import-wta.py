"""Load annual Official WTA match CSVs into the wta schema of local tennis."""

import argparse
from collections import defaultdict
import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
MATCH_FIELDS = """
tourney_name surface draw_size tourney_level tourney_date match_num
winner_id winner_seed winner_entry winner_name winner_hand winner_ht winner_ioc
winner_age winner_rank winner_rank_points loser_id loser_seed loser_entry loser_name
loser_hand loser_ht loser_ioc loser_age loser_rank loser_rank_points score best_of
round minutes w_ace w_df w_svpt w_1stIn w_1stWon w_2ndWon w_SvGms w_bpSaved w_bpFaced
l_ace l_df l_svpt l_1stIn l_1stWon l_2ndWon l_SvGms l_bpSaved l_bpFaced
""".split()
INTEGER_FIELDS = {
    "draw_size", "match_num", "best_of", "minutes",
    *(f"{side}_{field}" for side in ("winner", "loser") for field in ("seed", "ht", "rank", "rank_points")),
    *(c for c in MATCH_FIELDS if c.startswith(("w_", "l_"))),
}
ROUND_ORDER = {r: i for i, r in enumerate("Q1 Q2 Q3 Q4 R128 R96 R64 R48 R32 R16 RR QF SF BR F W".split())}
LEVELS = {"1000": "M", "PM": "M", "P5": "M", "YEC": "F"}
TEAM_EVENT_NAME = re.compile(
    r"^(?:Fed Cup|Federation Cup|Billie Jean King Cup|BJK Cup|Wightman Cup|United Cup|Hopman Cup)\b",
    re.IGNORECASE,
)


def stable_number(value):
    return int.from_bytes(hashlib.sha256(value.encode()).digest()[:4], "big") % 2147483647 + 1


def slug(value):
    ascii_name = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


def integer(value):
    if not value:
        return None
    try:
        number = Decimal(value)
    except InvalidOperation:
        return None
    return int(number) if number.is_finite() and number == number.to_integral_value() else None


def load_files(directory, allow_partial):
    entries = sorted(f for f in directory.iterdir() if re.fullmatch(r"[0-9]{4}_wta\.csv", f.name))
    players, tournaments, appearances = {}, defaultdict(dict), {}
    matches, occurrences, used_tournament_ids = [], {}, {}
    match_ids = set()
    skipped = []
    loaded = 0
    for entry in entries:
        try:
            stream = entry.open(encoding="utf-8-sig", newline="")
        except PermissionError:
            skipped.append(entry.name)
            continue
        with stream:
            reader = csv.DictReader(stream)
            if not {"tourney_id", *MATCH_FIELDS}.issubset(reader.fieldnames or ()):
                raise ValueError(f"Unexpected columns in {entry.name}")
            for source in reader:
                row = {field: (source[field] or "").strip() or None for field in MATCH_FIELDS}
                for field in INTEGER_FIELDS:
                    row[field] = integer(row[field])
                year = int(entry.name[:4])
                raw_id = source["tourney_id"].strip()
                if not raw_id:
                    raise ValueError(f"Missing tournament ID in {entry.name}:{reader.line_num}")
                prefixed = re.fullmatch(r"[0-9]{4}-(.+)", raw_id)
                event_id = raw_id if prefixed else f"{year}-{raw_id}"
                tournament_key = prefixed[1] if prefixed else raw_id
                tournament_id = int(tournament_key) if tournament_key.isdecimal() else -stable_number(tournament_key)
                if used_tournament_ids.setdefault(tournament_id, tournament_key) != tournament_key:
                    raise ValueError(f"Colliding tournament ID: {tournament_key}")
                date = datetime.strptime(row["tourney_date"], "%Y%m%d").date().isoformat() if row["tourney_date"] else None
                row["tourney_date"] = date
                row["tourney_level"] = LEVELS.get(row["tourney_level"], row["tourney_level"]) or "Unknown"
                row["surface"] = row["surface"] or "Unknown"
                score = (row["score"] or "").upper()
                played = bool(score) and score not in {"W/O", "WO", "DEF", "TO PLAY"} and "WEA" not in score
                level = row["tourney_level"]
                surface = row["surface"]
                title = row["tourney_name"] or raw_id
                if date:
                    tournaments[tournament_id].setdefault(event_id, (
                        date, str(year), title, level, surface, source.get("indoor") == "I",
                    ))
                for side in ("winner", "loser"):
                    player_id = row[f"{side}_id"]
                    if not player_id:
                        continue
                    previous = players.get(player_id, (None, None, None))
                    players[player_id] = (
                        row[f"{side}_name"] or previous[0],
                        row[f"{side}_hand"] or previous[1],
                        row[f"{side}_ioc"] or previous[2],
                    )
                    if not date or not row["round"]:
                        continue
                    reached = "W" if side == "winner" and row["round"] == "F" else row["round"]
                    key = (player_id, event_id)
                    if key not in appearances or ROUND_ORDER.get(reached, -1) > ROUND_ORDER.get(appearances[key][5], -1):
                        appearances[key] = (player_id, event_id, tournament_id, title, year, reached, surface, level, row["draw_size"], date)
                # Include an occurrence counter for source rows with an identical match key.
                key = (event_id, row["match_num"], row["winner_id"], row["loser_id"], row["round"])
                occurrence = occurrences.get(key, 0)
                occurrences[key] = occurrence + 1
                match_id = stable_number(json.dumps([*key, occurrence]))
                while match_id in match_ids:
                    match_id = match_id % 2147483647 + 1
                match_ids.add(match_id)
                team_event = level == "D" or bool(TEAM_EVENT_NAME.match(title))
                matches.append((match_id, year, str(tournament_id), event_id, played, team_event, *(row[field] for field in MATCH_FIELDS)))
        loaded += 1
    if skipped:
        print("Unreadable files:", ", ".join(skipped), flush=True)
    if not matches or (skipped and not allow_partial):
        raise SystemExit("No import performed. Restore access or explicitly pass --allow-partial.")
    print(f"{loaded}/{len(entries)} CSVs: {len(matches)} matches, {len(players)} players, {len(tournaments)} tournaments", flush=True)
    return matches, players, tournaments, appearances


def player_rows(players):
    names = defaultdict(list)
    for player_id, (name, _, _) in players.items():
        names[slug(name or "") or f"player-{player_id}"].append(player_id)
    for base, ids in names.items():
        for player_id in sorted(ids):
            name, hand, ioc = players[player_id]
            player_slug = base if len(ids) == 1 else f"{base}-{player_id}"
            yield player_id, name or player_id, name, player_slug, hand, ioc


def tournament_rows(tournaments):
    names = defaultdict(list)
    for tournament_id, editions in tournaments.items():
        rows = sorted(editions.values())
        names[slug(rows[-1][2]) or "tournament"].append((tournament_id, rows))
    for base, events in names.items():
        for tournament_id, rows in sorted(events):
            dates, years, titles, levels, surfaces, indoors = zip(*rows)
            tournament_slug = base if len(events) == 1 else f"{base}-{tournament_id}"
            yield (tournament_id, tournament_slug, dates[0], dates[-1],
                   *(json.dumps(x, ensure_ascii=False) for x in (years, titles, levels, surfaces, indoors)))


def copy_rows(file, table, fields, rows):
    columns = ", ".join(f'"{name}"' for name in fields)
    file.write(f'COPY wta."{table}" ({columns}) FROM STDIN WITH (FORMAT CSV);\n')
    csv.writer(file, lineterminator="\n").writerows(rows)
    file.write("\\.\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--pg-bin", type=Path, help="Directory containing pg_dump and psql")
    parser.add_argument("--allow-partial", action="store_true", help="Allow unreadable annual files to be skipped")
    args = parser.parse_args()
    matches, players, tournaments, appearances = load_files(args.source, args.allow_partial)
    url = next(line.split("=", 1)[1] for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines()
               if line.startswith("DATABASE_URL="))
    db = urlsplit(url.strip().strip('\"\''))
    if db.hostname not in {"localhost", "127.0.0.1", "::1"} or db.path != "/tennis":
        raise SystemExit("The importer expects the local tennis database.")
    connection = ["-h", db.hostname, "-p", str(db.port or 5432), "-U", unquote(db.username or ""), "-d", "tennis"]
    env = {**os.environ, "PGPASSWORD": unquote(db.password or ""), "PGCLIENTENCODING": "UTF8"}

    def pg(name):
        return str(args.pg_bin / (name + (".exe" if os.name == "nt" else ""))) if args.pg_bin else name

    excluded = ("Match_backup_*", "LaverCupDoubles", "RankingMissingPoints", "RankingSourceConflict", "RankingUnresolvedIdentity")
    dump = subprocess.check_output([
        pg("pg_dump"), *connection, "--schema=public", "--schema-only", "--no-owner", "--no-acl",
        *(flag for table in excluded for flag in ("--exclude-table", f'public."{table}"' if "*" not in table else f'public."Match_backup_"*')),
    ], env=env).decode("utf-8")
    # pg_dump qualifies all dependencies. Translate the entire dependency graph, including MV indexes.
    ddl = re.sub(r"(?m)^SET transaction_timeout = 0;\r?\n", "", dump)
    ddl = ddl.replace("CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS wta;")
    ddl = re.sub(r'(?<![\w"])public\.', "wta.", ddl)
    ddl = ddl.replace("COMMENT ON SCHEMA public", "COMMENT ON SCHEMA wta")
    ddl = ddl.replace("'mvs_needs_refresh'", "'wta_mvs_needs_refresh'")
    views = re.findall(r"(?m)^CREATE MATERIALIZED VIEW wta\.([\w\"]+) AS", ddl)
    if not views or "CREATE TABLE wta.\"Match\"" not in ddl:
        raise SystemExit("The ATP schema dump lacks the expected tables or materialized views.")
    with tempfile.TemporaryDirectory() as tmp:
        sql_path = Path(tmp) / "wta.sql"
        with sql_path.open("w", encoding="utf-8", newline="") as file:
            file.write(
                "SELECT pg_advisory_xact_lock(hashtext('tml-wta-import'));\n"
                "SELECT NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                "WHERE n.nspname='wta' AND c.relname='Match') AS initialize \\gset\n"
                "\\if :initialize\n"
            )
            file.write(ddl)
            file.write(
                '\n\\endif\nTRUNCATE wta."PlayerTournament", wta."Ranking", wta."RankingDate",'
                ' wta."Match", wta."Player", wta."Tournament" RESTART IDENTITY;\n'
            )
            copy_rows(file, "Player", ("id", "player", "atpname", "slug", "hand", "ioc"), player_rows(players))
            copy_rows(file, "Tournament", ("id", "slug", "startDate", "endDate", "years", "name", "category", "surfaces", "indoor"), tournament_rows(tournaments))
            copy_rows(file, "Match", ("id", "year", "tourney_id", "event_id", "status", "team_event", *MATCH_FIELDS), matches)
            copy_rows(file, "PlayerTournament", ("player_id", "event_id", "tourney_id", "tourney_name", "year", "round", "surface", "tourney_level", "draw_size", "tourney_date"), appearances.values())
            for view in views:
                file.write(f"\\echo Refreshing wta.{view}\n")
                file.write(f"REFRESH MATERIALIZED VIEW wta.{view};\n")
        subprocess.run([
            pg("psql"), *connection, "-X", "-v", "ON_ERROR_STOP=1",
            "--single-transaction", "--file", str(sql_path),
        ], env=env, check=True)


if __name__ == "__main__":
    main()

from flask import Flask, jsonify, request, make_response 

import psycopg2
from psycopg2 import sql
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor

from dotenv import load_dotenv
from os import environ

from datetime import datetime
from utils import TEAM_ABBRV_TO_NAME_DICT, TEAM_NAME_TO_ABBRV_DICT

_ = load_dotenv()
DB_NAME = environ.get("DB_NAME")
DB_USER = environ.get("DB_USER")
DB_PASS = environ.get("DB_PASSWORD")
DB_HOST = environ.get("DB_HOST")
DB_PORT = environ.get("DB_PORT")

api = Flask(__name__)

with api.app_context():
    TEAMS_JSON = jsonify({"teams": TEAM_NAME_TO_ABBRV_DICT}) # don't want to jsonify every single time
    connection_pool = ThreadedConnectionPool(1, 10, 
                                             dbname=DB_NAME, 
                                             user=DB_USER, password=DB_PASS, 
                                             host=DB_HOST, port=DB_PORT, 
                                             cursor_factory=RealDictCursor)
    conn = connection_pool.getconn()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM plays LIMIT 0")
        PLAYS_COLUMNS = set(desc[0] for desc in cur.description)
    connection_pool.putconn(conn)

@api.route("/plays")
def plays():
    query = "SELECT {} FROM plays WHERE 1=1 "
    data_tuple = ()
    fields = request.args.get("fields")

    if not fields:
        return make_response(f"Must include desired fields as query parameter. Available fields: {PLAYS_COLUMNS}", 400)

    # only take valid fields
    fields = [ sql.Identifier(f) for f in fields.split(",") if f in PLAYS_COLUMNS ] 
    to_replace = sql.Identifier("game_date")
    for i in range(len(fields)):
        if fields[i] == to_replace:
            fields[i] = sql.SQL("to_char(game_date, 'YYYY-MM-DD') as game_date")
            break

    team = request.args.get("team")
    player = request.args.get("player")
    try:
        player = int(player)
    except:
        player = None
    if (not team or team.upper() not in TEAM_ABBRV_TO_NAME_DICT) and not player:
        return make_response("Must specify team (valid 3 letter abbreviation) or player (by bam_id)", 400)

    pos = request.args.get("position")
    valid_pitcher_pos = pos in {"P", "p"} # [Pitcher]
    valid_batter_pos = pos in {"H", "h", "B", "b"} # [H]itter, [B]atter

    if team:
        if valid_pitcher_pos: 
            query += " AND pitcher_team = %s "
            data_tuple += (team,)
        elif valid_batter_pos:
            query += " AND batter_team = %s "
            data_tuple += (team,)
        else:
            query += " AND (batter_team = %s OR pitcher_team = %s) "
            data_tuple += (team, team)

    if player:
        if valid_pitcher_pos:
            query += " AND pitcher_bam_id = %s "
            data_tuple += (player,)
        elif valid_batter_pos:
            query += " AND batter_bam_id = %s "
            data_tuple += (player,)
        else:
            query += " AND (batter_bam_id = %s OR pitcher_bam_id = %s)"
            data_tuple += (player, player)
    
    start_date = request.args.get("start_date")
    if start_date:
        end_date = request.args.get("end_date")
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            return make_response("Invalid date format (use YYYY-MM-DD)", 400)
        query += " AND game_date >= %s "
        data_tuple += (start_date,)

        if end_date: # ignored if no start_date
            try:
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return make_response("Invalid date format (use YYYY-MM-DD)", 400)
            query += " AND game_date <= %s "
            data_tuple += (end_date,) 

    end_pa = request.args.get("end_pa")
    if end_pa and end_pa.lower().startswith('t'):
        query += " AND event_type is not null AND event_type != 'caught_stealing_2b' AND event_type != 'caught_stealing_3b' AND event_type != 'caught_stealing_home'"

    query += "ORDER BY game_date ASC, at_bat_number ASC, pitch_seq ASC;"
    
    conn = connection_pool.getconn()
    with conn.cursor() as cur:
        cur.execute( sql.SQL(query).format( sql.SQL(", ").join(fields) ),
                    data_tuple)
        rows = cur.fetchall()

    connection_pool.putconn(conn)
    return jsonify({"plays": rows})

@api.route("/players")
def players():
    query = """SELECT id, name_first, name_last FROM PLAYERS
                WHERE 1=1 
            """
    team = request.args.get("team")
    data_tuple = ()
    if team:
        query += " AND team = %s "
        data_tuple += (team.upper(),)

    conn = connection_pool.getconn()
    with conn.cursor() as cur:
        cur.execute(query, data_tuple)
        rows = cur.fetchall()

    connection_pool.putconn(conn)
    return jsonify({"players": rows}) 

@api.route("/teams")
def teams():
    return TEAMS_JSON 

if __name__ == "__main__":    
    api.run()


from flask import Flask, jsonify, request
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from os import environ

_ = load_dotenv()
DB_NAME = environ.get("DB_NAME")
DB_USER = environ.get("DB_USER")
DB_PASS = environ.get("DB_PASSWORD")
DB_HOST = environ.get("DB_HOST")
DB_PORT = environ.get("DB_PORT")

api = Flask(__name__)

@api.route("/plays/")
def plays():
    conn = connection_pool.getconn()
    query = "SELECT * FROM PLAYS WHERE batter_name_last = 'Cronenworth';"
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    connection_pool.putconn(conn)
    return jsonify(rows)


if __name__ == "__main__":
    connection_pool = ThreadedConnectionPool(1, 10, 
                                             dbname=DB_NAME, 
                                             user=DB_USER, password=DB_PASS, 
                                             host=DB_HOST, port=DB_PORT, 
                                             cursor_factory=RealDictCursor)
    api.run()


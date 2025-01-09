import sqlite3
import json


class KVStorage:
    def __init__(self, db_file):
        self.db_file = db_file
        self.conn = sqlite3.connect(db_file)
        self.create_table()

    def create_table(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS key_value_store (
                key TEXT PRIMARY KEY,
                value TEXT,
                term INTEGER,
                index INTEGER
            )
        ''')
        self.conn.commit()

    def put(self, key, value, term, index):
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO key_value_store (key, value, term, index) 
            VALUES (?, ?, ?, ?)
        ''', (key, json.dumps(value), term, index))
        self.conn.commit()

    def get(self, key):
        cursor = self.conn.cursor()
        cursor.execute('SELECT value FROM key_value_store WHERE key = ?', (key,))
        row = cursor.fetchone()
        return json.loads(row[0]) if row else None
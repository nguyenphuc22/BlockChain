# storage.py
import sqlite3
import json
import threading


class KVStorage:
    def __init__(self, db_file):
        self.db_file = db_file
        self.conn = sqlite3.connect(db_file, check_same_thread=False)
        self.lock = threading.Lock()
        self.create_tables()

    def create_tables(self):
        with self.lock:
            cursor = self.conn.cursor()
            # Table for committed logs
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS committed_logs (
                    id INTEGER PRIMARY KEY,
                    term INTEGER,
                    data TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            # Table for key-value pairs
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS key_value_store (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    last_updated_index INTEGER,
                    FOREIGN KEY (last_updated_index) REFERENCES committed_logs (id)
                )
            ''')
            self.conn.commit()

    def commit_log(self, index, term, data):
        """Commit a log entry to storage"""
        with self.lock:
            cursor = self.conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO committed_logs (id, term, data)
                    VALUES (?, ?, ?)
                ''', (index, term, json.dumps(data)))

                # If data contains key-value updates, store them
                if isinstance(data, dict) and 'key' in data and 'value' in data:
                    cursor.execute('''
                        INSERT OR REPLACE INTO key_value_store (key, value, last_updated_index)
                        VALUES (?, ?, ?)
                    ''', (data['key'], json.dumps(data['value']), index))

                self.conn.commit()
                return True
            except sqlite3.Error as e:
                print(f"Error committing log: {e}")
                return False

    def get_value(self, key):
        """Get value for a key from storage"""
        with self.lock:
            cursor = self.conn.cursor()
            cursor.execute('''
                SELECT value FROM key_value_store WHERE key = ?
            ''', (key,))
            row = cursor.fetchone()
            return json.loads(row[0]) if row else None

    def get_last_committed_index(self):
        """Get the index of the last committed log"""
        with self.lock:
            cursor = self.conn.cursor()
            cursor.execute('SELECT MAX(id) FROM committed_logs')
            result = cursor.fetchone()
            return result[0] if result[0] is not None else 0

    def get_log_entry(self, index):
        """Get a specific log entry by index"""
        with self.lock:
            cursor = self.conn.cursor()
            cursor.execute('''
                SELECT term, data FROM committed_logs 
                WHERE index = ?
            ''', (index,))
            row = cursor.fetchone()
            if row:
                return {
                    'term': row[0],
                    'data': json.loads(row[1])
                }
            return None

    def close(self):
        """Close the database connection"""
        with self.lock:
            self.conn.close()
import sqlite3
from datetime import date
from config import DATABASE_PATH


def get_db():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_message TEXT,
            ai_response TEXT,
            root_cause TEXT,
            literature_ref TEXT,
            emotion TEXT,
            scene TEXT,
            symptom TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS butterflies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            name TEXT DEFAULT '蓝色小蝴蝶',
            released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );
    """)
    db.commit()
    db.close()


def save_session(user_message, ai_response, root_cause, literature_ref, emotion, scene, symptom):
    db = get_db()
    cur = db.execute(
        "INSERT INTO sessions (user_message, ai_response, root_cause, literature_ref, emotion, scene, symptom) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_message, ai_response, root_cause, literature_ref, emotion, scene, symptom),
    )
    sid = cur.lastrowid
    db.commit()
    db.close()
    return sid


def release_butterfly(session_id=None):
    db = get_db()
    cur = db.execute("INSERT INTO butterflies (session_id) VALUES (?)", (session_id,))
    bid = cur.lastrowid
    db.commit()
    db.close()
    return bid


def get_butterfly_count():
    db = get_db()
    cnt = db.execute("SELECT COUNT(*) as cnt FROM butterflies").fetchone()["cnt"]
    db.close()
    return cnt


def get_stats():
    db = get_db()
    total_butterflies = db.execute("SELECT COUNT(*) as cnt FROM butterflies").fetchone()["cnt"]
    total_sessions = db.execute("SELECT COUNT(*) as cnt FROM sessions").fetchone()["cnt"]
    today = date.today().isoformat()
    today_sessions = db.execute(
        "SELECT COUNT(*) as cnt FROM sessions WHERE date(created_at) = ?", (today,)
    ).fetchone()["cnt"]
    db.close()
    return {
        "total_butterflies": total_butterflies,
        "total_sessions": total_sessions,
        "today_sessions": today_sessions,
    }

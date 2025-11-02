# Initializes the sqlite database

import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'users.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Creates the Table
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'teacher', 'student')),
    api_token TEXT NOT NULL
)
''')

# Pre-register admin user
cursor.execute('''
INSERT OR IGNORE INTO users (email, password, user_type, api_token)
VALUES ('admin@admin.com', '111', 'admin', 'admintoken123')
''')

# Pre-register teacher user
cursor.execute('''
INSERT OR IGNORE INTO users (email, password, user_type, api_token)
VALUES ('teacher@teacher.com', '123', 'teacher', 'teachertoken123')
''')

# Pre-register student user
cursor.execute('''
INSERT OR IGNORE INTO users (email, password, user_type, api_token)
VALUES ('john@john.com', '123', 'student', 'studenttoken123')
''')

conn.commit()
conn.close()
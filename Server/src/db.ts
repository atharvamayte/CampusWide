import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Keep the database in server/data in both development and production.
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = resolve(currentDirectory, "../data");

mkdirSync(dataDirectory, { recursive: true });

export const DATABASE_PATH = resolve(dataDirectory, "campuswide.sqlite");

export const db = new DatabaseSync(DATABASE_PATH, {
  timeout: 5000,
});

// Database settings.
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
`);

// Create the schema. Existing tables and records are left untouched.
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    nexconn_user_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    initials TEXT NOT NULL,
    department TEXT NOT NULL,
    branch TEXT NOT NULL CHECK (
      branch IN ('Comp', 'IT', 'AIML', 'AIDS', 'Civil', 'Mechanical')
    ),
    academic_year TEXT NOT NULL CHECK (
      academic_year IN ('FY', 'SY', 'TY')
    ),
    division TEXT NOT NULL CHECK (
      division IN ('A', 'B', 'C', 'D')
    ),
    bio TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Only approved, active memberships belong in this table.
  CREATE TABLE IF NOT EXISTS memberships (
    student_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Member',
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (student_id, club_id),

    FOREIGN KEY (student_id)
      REFERENCES students(id) ON DELETE CASCADE,

    FOREIGN KEY (club_id)
      REFERENCES clubs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS club_applications (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN ('pending', 'accepted', 'declined', 'cancelled', 'removed')
      ),
    reviewed_by_student_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
      REFERENCES students(id) ON DELETE CASCADE,

    FOREIGN KEY (club_id)
      REFERENCES clubs(id) ON DELETE CASCADE,

    FOREIGN KEY (reviewed_by_student_id)
      REFERENCES students(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS club_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    club_id TEXT,
    role TEXT NOT NULL CHECK (
      (club_id IS NULL AND role = 'global_admin')
      OR
      (club_id IS NOT NULL AND role IN ('admin', 'moderator'))
    ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
      REFERENCES students(id) ON DELETE CASCADE,

    FOREIGN KEY (club_id)
      REFERENCES clubs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS club_announcements (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL,
    author_student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 1
      CHECK (is_published IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (club_id)
      REFERENCES clubs(id) ON DELETE CASCADE,

    FOREIGN KEY (author_student_id)
      REFERENCES students(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    sender_student_id TEXT NOT NULL,
    recipient_student_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN ('pending', 'accepted', 'declined', 'cancelled')
      ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (sender_student_id != recipient_student_id),

    FOREIGN KEY (sender_student_id)
      REFERENCES students(id) ON DELETE CASCADE,

    FOREIGN KEY (recipient_student_id)
      REFERENCES students(id) ON DELETE CASCADE
  );

  -- Useful indexes for the queries we'll use in the app.
  CREATE INDEX IF NOT EXISTS idx_memberships_student
    ON memberships(student_id, status);

  CREATE INDEX IF NOT EXISTS idx_memberships_club
    ON memberships(club_id, status);

  CREATE INDEX IF NOT EXISTS idx_applications_student
    ON club_applications(student_id, status);

  CREATE INDEX IF NOT EXISTS idx_applications_club
    ON club_applications(club_id, status);

  CREATE INDEX IF NOT EXISTS idx_announcements_club
    ON club_announcements(club_id, is_published, created_at);

  CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient
    ON friend_requests(recipient_student_id, status);

  CREATE INDEX IF NOT EXISTS idx_friend_requests_sender
    ON friend_requests(sender_student_id, status);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_global_admin_per_student
    ON club_admins(student_id)
    WHERE club_id IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_club_admin_record
    ON club_admins(student_id, club_id)
    WHERE club_id IS NOT NULL;

      -- Independent passwordless demo sessions for judges.
  CREATE TABLE IF NOT EXISTS demo_sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    nexconn_user_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Friendships and requests between demo sessions.
  -- These are kept separate from real seeded student friendships.
  CREATE TABLE IF NOT EXISTS demo_friend_requests (
    id TEXT PRIMARY KEY,
    sender_session_id TEXT NOT NULL,
    recipient_session_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN ('pending', 'accepted', 'declined', 'cancelled')
      ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (sender_session_id != recipient_session_id),

    FOREIGN KEY (sender_session_id)
      REFERENCES demo_sessions(id) ON DELETE CASCADE,

    FOREIGN KEY (recipient_session_id)
      REFERENCES demo_sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_demo_friend_requests_recipient
    ON demo_friend_requests(recipient_session_id, status);

  CREATE INDEX IF NOT EXISTS idx_demo_friend_requests_sender
    ON demo_friend_requests(sender_session_id, status);

      -- Judge friendships and requests involving either judges or students.
  -- Seeded student friendships remain in the original friend_requests table.
  CREATE TABLE IF NOT EXISTS demo_friend_connections (
    id TEXT PRIMARY KEY,

    sender_session_id TEXT,
    sender_student_id TEXT,

    recipient_session_id TEXT,
    recipient_student_id TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN ('pending', 'accepted', 'declined', 'cancelled')
      ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (sender_session_id IS NOT NULL AND sender_student_id IS NULL)
      OR
      (sender_session_id IS NULL AND sender_student_id IS NOT NULL)
    ),

    CHECK (
      (recipient_session_id IS NOT NULL AND recipient_student_id IS NULL)
      OR
      (recipient_session_id IS NULL AND recipient_student_id IS NOT NULL)
    ),

    CHECK (
      sender_session_id IS NULL
      OR recipient_session_id IS NULL
      OR sender_session_id != recipient_session_id
    ),

    CHECK (
      sender_student_id IS NULL
      OR recipient_student_id IS NULL
      OR sender_student_id != recipient_student_id
    ),

    FOREIGN KEY (sender_session_id)
      REFERENCES demo_sessions(id) ON DELETE CASCADE,

    FOREIGN KEY (recipient_session_id)
      REFERENCES demo_sessions(id) ON DELETE CASCADE,

    FOREIGN KEY (sender_student_id)
      REFERENCES students(id) ON DELETE CASCADE,

    FOREIGN KEY (recipient_student_id)
      REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_demo_connections_sender
    ON demo_friend_connections(
      sender_session_id,
      sender_student_id,
      status
    );

  CREATE INDEX IF NOT EXISTS idx_demo_connections_recipient
    ON demo_friend_connections(
      recipient_session_id,
      recipient_student_id,
      status
    );
`);

console.log(`[Database] Connected: ${DATABASE_PATH}`);
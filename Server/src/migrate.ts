import { db } from "./db.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type FriendshipStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "removed";

type FriendshipRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
};

type CommunityMembership = {
  userId: string;
  clubId: string;
  joinedAt: string;
};

type FriendshipFile = {
  requests: FriendshipRequest[];
};

type CommunityFile = {
  applications: unknown[];
  memberships: CommunityMembership[];
};

const dataDirectory = resolve(process.cwd(), "data");

const friendshipPath = resolve(dataDirectory, "friendships.json");
const communityPath = resolve(dataDirectory, "communities.json");

function readJson<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }

  const contents = readFileSync(filePath, "utf8");
  return JSON.parse(contents) as T;
}

function getStudentId(nexconnUserId: string): string {
  const result = db
    .prepare(`
      SELECT id
      FROM students
      WHERE nexconn_user_id = ?
    `)
    .get(nexconnUserId) as { id: string } | undefined;

  if (!result) {
    throw new Error(
      `No student found for Nexconn ID: ${nexconnUserId}`,
    );
  }

  return result.id;
}

function validateFriendships(requests: FriendshipRequest[]): void {
  const allowedStatuses: FriendshipStatus[] = [
    "pending",
    "accepted",
    "declined",
    "cancelled",
    "removed",
  ];

  for (const request of requests) {
    if (!allowedStatuses.includes(request.status)) {
      throw new Error(
        `Unsupported friendship status "${request.status}" for ${request.id}`,
      );
    }

    getStudentId(request.fromUserId);
    getStudentId(request.toUserId);
  }
}

function validateMemberships(
  memberships: CommunityMembership[],
): void {
  const checkClub = db.prepare(`
    SELECT id FROM clubs WHERE id = ?
  `);

  for (const membership of memberships) {
    getStudentId(membership.userId);

    if (!checkClub.get(membership.clubId)) {
      throw new Error(
        `Club not found during migration: ${membership.clubId}`,
      );
    }
  }
}

function rebuildFriendRequestsTable(): void {
  // Create a replacement table with support for the "removed" status.
  db.exec(`
    CREATE TABLE friend_requests_new (
      id TEXT PRIMARY KEY,
      sender_student_id TEXT NOT NULL,
      recipient_student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
          status IN (
            'pending',
            'accepted',
            'declined',
            'cancelled',
            'removed'
          )
        ),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CHECK (sender_student_id != recipient_student_id),

      FOREIGN KEY (sender_student_id)
        REFERENCES students(id) ON DELETE CASCADE,

      FOREIGN KEY (recipient_student_id)
        REFERENCES students(id) ON DELETE CASCADE
    );

    -- Preserve anything that might already be in SQLite.
    INSERT INTO friend_requests_new (
      id,
      sender_student_id,
      recipient_student_id,
      status,
      created_at,
      updated_at
    )
    SELECT
      id,
      sender_student_id,
      recipient_student_id,
      status,
      created_at,
      updated_at
    FROM friend_requests;

    DROP TABLE friend_requests;

    ALTER TABLE friend_requests_new
      RENAME TO friend_requests;

    CREATE INDEX idx_friend_requests_recipient
      ON friend_requests(recipient_student_id, status);

    CREATE INDEX idx_friend_requests_sender
      ON friend_requests(sender_student_id, status);
  `);
}

const insertFriendRequest = db.prepare(`
  INSERT OR IGNORE INTO friend_requests (
    id,
    sender_student_id,
    recipient_student_id,
    status,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertMembership = db.prepare(`
  INSERT INTO memberships (
    student_id,
    club_id,
    role,
    status,
    joined_at
  )
  VALUES (?, ?, ?, 'active', ?)
  ON CONFLICT(student_id, club_id)
  DO UPDATE SET
    role = excluded.role,
    status = 'active',
    joined_at = excluded.joined_at
`);

const getMigrationMarker = db.prepare(`
  SELECT value
  FROM app_meta
  WHERE key = ?
`);

const saveMigrationMarker = db.prepare(`
  INSERT INTO app_meta (key, value)
  VALUES (?, ?)
`);

try {
  const migrationMarker = getMigrationMarker.get(
    "json_migration_v1",
  ) as { value: string } | undefined;

  if (migrationMarker) {
    console.log("[Migration] JSON data has already been migrated.");
  } else {
    // Read and validate everything before changing the database.
    const friendshipData = readJson<FriendshipFile>(friendshipPath);
    const communityData = readJson<CommunityFile>(communityPath);

    if (
      !Array.isArray(friendshipData.requests) ||
      !Array.isArray(communityData.memberships) ||
      !Array.isArray(communityData.applications)
    ) {
      throw new Error("One of the JSON files has an invalid structure.");
    }

    // Applications are currently empty in your supplied JSON.
    // Stop rather than silently discard anything added before migration.
    if (communityData.applications.length > 0) {
      throw new Error(
        "Club applications are no longer empty. Migration paused so their exact record structure can be handled safely.",
      );
    }

    validateFriendships(friendshipData.requests);
    validateMemberships(communityData.memberships);

    db.exec("BEGIN IMMEDIATE");

    rebuildFriendRequestsTable();

    for (const request of friendshipData.requests) {
      insertFriendRequest.run(
        request.id,
        getStudentId(request.fromUserId),
        getStudentId(request.toUserId),
        request.status,
        request.createdAt,
        request.updatedAt,
      );
    }

    for (const membership of communityData.memberships) {
      const studentId = getStudentId(membership.userId);

      const role =
        studentId === "student-001" &&
        membership.clubId === "ncc"
          ? "Cadet"
          : "Member";

      insertMembership.run(
        studentId,
        membership.clubId,
        role,
        membership.joinedAt,
      );
    }

    saveMigrationMarker.run("json_migration_v1", "completed");

    db.exec("COMMIT");

    console.log("[Migration] Completed successfully.");
    console.log(
      `[Migration] Friend requests imported: ${friendshipData.requests.length}`,
    );
    console.log(
      `[Migration] Club memberships imported: ${communityData.memberships.length}`,
    );
    console.log(
      `[Migration] Club applications imported: ${communityData.applications.length}`,
    );
  }

  const friendshipCount = db
    .prepare("SELECT COUNT(*) AS count FROM friend_requests")
    .get() as { count: number };

  const membershipCount = db
    .prepare("SELECT COUNT(*) AS count FROM memberships")
    .get() as { count: number };

  console.log(`[Database] Total friend requests: ${friendshipCount.count}`);
  console.log(`[Database] Total memberships: ${membershipCount.count}`);

  const foreignKeyErrors = db
    .prepare("PRAGMA foreign_key_check")
    .all();

  if (foreignKeyErrors.length > 0) {
    throw new Error("Foreign-key check failed after migration.");
  }

  console.log("[Database] Foreign-key check passed.");
} catch (error) {
  try {
    db.exec("ROLLBACK");
  } catch {
    // No active transaction to roll back.
  }

  console.error("[Migration] Failed:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
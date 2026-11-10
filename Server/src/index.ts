import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { db } from "./db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// =======================================
// MIDDLEWARE
// =======================================

app.use(cors({
  origin: /^http:\/\/localhost:\d+$/,
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: [
    "Content-Type",
    "x-campuswide-user-id",
  ],
}));

app.use(express.json({ limit: "10kb" }));

// =======================================
// DATABASE TYPES AND HELPERS
// =======================================

type StudentRow = {
  id: string;
  nexconn_user_id: string;
  display_name: string;
  initials: string;
  department: string;
  branch: string;
  academic_year: string;
  division: string;
  bio: string;
  is_active: number;
};

type ClubRow = {
  id: string;
  name: string;
  category: string;
  description: string;
};

type FriendRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "removed";

type FriendRequestViewRow = {
  id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
};

type ApplicationStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled";

type ApplicationRow = {
  id: string;
  student_id: string;
  club_id: string;
  message: string;
  status: ApplicationStatus;
  reviewed_by_student_id: string | null;
  created_at: string;
  updated_at: string;
  applicant_user_id?: string;
  applicant_name?: string;
  club_name?: string;
};

function findStudentById(
  studentId: string,
): StudentRow | undefined {
  return db.prepare(`
    SELECT *
    FROM students
    WHERE id = ?
      AND is_active = 1
  `).get(studentId) as StudentRow | undefined;
}

function findStudentByNexconnId(
  nexconnUserId: string,
): StudentRow | undefined {
  return db.prepare(`
    SELECT *
    FROM students
    WHERE nexconn_user_id = ?
      AND is_active = 1
  `).get(nexconnUserId) as StudentRow | undefined;
}

function findStudentByLoginKey(
  loginKey: string,
): StudentRow | undefined {
  return db.prepare(`
    SELECT s.*
    FROM student_accounts AS a
    JOIN students AS s ON s.id = a.student_id
    WHERE a.login_key = ?
      AND s.is_active = 1
  `).get(loginKey) as StudentRow | undefined;
}

function toStudentProfile(student: StudentRow) {
  return {
    userId: student.nexconn_user_id,
    name: student.display_name,
    initials: student.initials,
    department: student.department,
    branch: student.branch,
    year: student.academic_year,
    division: student.division,
    bio: student.bio,
  };
}

function getCurrentDemoUser(
  req: Request,
  res: Response,
): StudentRow | null {
  const nexconnUserId = req.header("x-campuswide-user-id");

  if (!nexconnUserId) {
    res.status(401).json({
      error: "User identity is required.",
    });
    return null;
  }

  const student = findStudentByNexconnId(nexconnUserId);

  if (!student) {
    res.status(403).json({
      error: "Unknown CampusWide demo user.",
    });
    return null;
  }

  return student;
}

function findClub(clubId: string): ClubRow | undefined {
  return db.prepare(`
    SELECT *
    FROM clubs
    WHERE id = ?
  `).get(clubId) as ClubRow | undefined;
}

function isClubMember(
  studentId: string,
  clubId: string,
): boolean {
  const result = db.prepare(`
    SELECT 1 AS found
    FROM memberships
    WHERE student_id = ?
      AND club_id = ?
      AND status = 'active'
    LIMIT 1
  `).get(studentId, clubId);

  return Boolean(result);
}

function canManageClub(
  studentId: string,
  clubId: string,
): boolean {
  const result = db.prepare(`
    SELECT 1 AS allowed
    FROM club_admins
    WHERE student_id = ?
      AND (
        (club_id IS NULL AND role = 'global_admin')
        OR
        (club_id = ? AND role IN ('admin', 'moderator'))
      )
    LIMIT 1
  `).get(studentId, clubId);

  return Boolean(result);
}

function isGlobalAdmin(studentId: string): boolean {
  const result = db.prepare(`
    SELECT 1 AS allowed
    FROM club_admins
    WHERE student_id = ?
      AND club_id IS NULL
      AND role = 'global_admin'
    LIMIT 1
  `).get(studentId);

  return Boolean(result);
}

function withTransaction<T>(callback: () => T): T {
  db.exec("BEGIN IMMEDIATE");

  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// =======================================
// FRIEND REQUEST HELPERS
// =======================================

const friendRequestSelect = `
  SELECT
    fr.id,
    fr.status,
    fr.created_at,
    fr.updated_at,
    sender.nexconn_user_id AS from_user_id,
    sender.display_name AS from_name,
    recipient.nexconn_user_id AS to_user_id,
    recipient.display_name AS to_name
  FROM friend_requests AS fr
  JOIN students AS sender
    ON sender.id = fr.sender_student_id
  JOIN students AS recipient
    ON recipient.id = fr.recipient_student_id
`;

function getFriendRequestView(
  requestId: string,
): FriendRequestViewRow | undefined {
  return db.prepare(`
    ${friendRequestSelect}
    WHERE fr.id = ?
  `).get(requestId) as FriendRequestViewRow | undefined;
}

function presentRequest(request: FriendRequestViewRow) {
  return {
    id: request.id,
    from: {
      userId: request.from_user_id,
      name: request.from_name,
    },
    to: {
      userId: request.to_user_id,
      name: request.to_name,
    },
    status: request.status,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  };
}

function areAlreadyFriends(
  firstStudentId: string,
  secondStudentId: string,
): boolean {
  const result = db.prepare(`
    SELECT 1 AS found
    FROM friend_requests
    WHERE status = 'accepted'
      AND (
        (
          sender_student_id = ?
          AND recipient_student_id = ?
        )
        OR
        (
          sender_student_id = ?
          AND recipient_student_id = ?
        )
      )
    LIMIT 1
  `).get(
    firstStudentId,
    secondStudentId,
    secondStudentId,
    firstStudentId,
  );

  return Boolean(result);
}

// =======================================
// COMMUNITY HELPERS
// =======================================

function getApplicationView(
  applicationId: string,
): ApplicationRow | undefined {
  return db.prepare(`
    SELECT
      a.*,
      s.nexconn_user_id AS applicant_user_id,
      s.display_name AS applicant_name,
      c.name AS club_name
    FROM club_applications AS a
    JOIN students AS s
      ON s.id = a.student_id
    JOIN clubs AS c
      ON c.id = a.club_id
    WHERE a.id = ?
  `).get(applicationId) as ApplicationRow | undefined;
}

function presentApplication(application: ApplicationRow) {
  return {
    id: application.id,
    applicantUserId: application.applicant_user_id,
    clubId: application.club_id,
    motivation: application.message,
    status: application.status,
    submittedAt: application.created_at,
    updatedAt: application.updated_at,
    ...(application.club_name
      ? { clubName: application.club_name }
      : {}),
  };
}

function getStudentMemberships(studentId: string) {
  return db.prepare(`
    SELECT
      m.club_id AS clubId,
      c.name AS clubName,
      m.role,
      m.joined_at AS joinedAt
    FROM memberships AS m
    JOIN clubs AS c ON c.id = m.club_id
    WHERE m.student_id = ?
      AND m.status = 'active'
    ORDER BY c.name
  `).all(studentId) as {
    clubId: string;
    clubName: string;
    role: string;
    joinedAt: string;
  }[];
}

// =======================================
// BASIC ROUTES
// =======================================

app.get("/", (_req, res) => {
  res.json({
    message: "CampusWide API is running!",
  });
});

app.get("/api/health", (_req, res) => {
  try {
    db.prepare("SELECT 1").get();

    return res.json({
      status: "healthy",
      service: "CampusWide Server",
      database: "connected",
    });
  } catch {
    return res.status(500).json({
      status: "unhealthy",
      service: "CampusWide Server",
      database: "disconnected",
    });
  }
});

// =======================================
// STUDENT DIRECTORY — DATABASE-BACKED
// =======================================

app.get("/api/students", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const rows = db.prepare(`
    SELECT
      s.*,
      GROUP_CONCAT(m.club_id) AS club_ids,
      CASE
        WHEN MAX(
          CASE WHEN m.role = 'Cadet' THEN 1 ELSE 0 END
        ) = 1
        THEN 'NCC Cadet'
        ELSE 'Student'
      END AS profile_role
    FROM students AS s
    LEFT JOIN memberships AS m
      ON m.student_id = s.id
      AND m.status = 'active'
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY s.id
  `).all() as (StudentRow & {
    club_ids: string | null;
    profile_role: string;
  })[];

  const students = rows.map((student) => ({
    id: student.id,
    chatUserId: student.nexconn_user_id,
    name: student.display_name,
    initials: student.initials,
    department: student.department,
    branch: student.branch,
    year: student.academic_year,
    division: student.division,
    clubs: student.club_ids
      ? student.club_ids.split(",")
      : [],
    role: student.profile_role,
    bio: student.bio,
  }));

  return res.json({ students });
});

// =======================================
// NEXCONN TOKEN
// =======================================

type NexconnResponse = {
  code?: number;
  result?: {
    userId?: string;
    accessToken?: string;
  };
};

app.post("/api/chat/token", async (req, res) => {
  const demoUserId = req.body?.demoUserId;

  if (typeof demoUserId !== "string") {
    return res.status(403).json({
      error: "Unknown demo user.",
    });
  }

  const student = findStudentByLoginKey(demoUserId);

  if (!student) {
    return res.status(403).json({
      error: "Unknown demo user.",
    });
  }

  const appKey = process.env.NEXCONN_APP_KEY;
  const appSecret = process.env.NEXCONN_APP_SECRET;
  const apiBaseUrl = process.env.NEXCONN_API_BASE_URL;

  if (!appKey || !appSecret || !apiBaseUrl) {
    return res.status(500).json({
      error: "Nexconn server configuration is incomplete.",
    });
  }

  const nonce = randomBytes(9).toString("hex");
  const timestamp = Date.now().toString();

  const signature = createHash("sha1")
    .update(`${appSecret}${nonce}${timestamp}`)
    .digest("hex");

  try {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/+$/, "")}/v4/auth/access-token/issue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "App-Key": appKey,
          "Nonce": nonce,
          "Timestamp": timestamp,
          "Signature": signature,
          "X-Request-ID": randomUUID(),
        },
        body: JSON.stringify({
          userId: student.nexconn_user_id,
          name: student.display_name,
        }),
      },
    );

    const data = await response.json() as NexconnResponse;

    if (
      !response.ok ||
      data.code !== 0 ||
      !data.result?.accessToken
    ) {
      console.error(
        "Nexconn token request failed:",
        data.code,
      );

      return res.status(502).json({
        error: "Nexconn could not issue an access token.",
        nexconnCode: data.code ?? null,
      });
    }

    return res.json({
      userId: data.result.userId || student.nexconn_user_id,
      token: data.result.accessToken,
      name: student.display_name,
    });
  } catch (error) {
    console.error("Nexconn connection error:", error);

    return res.status(502).json({
      error: "Could not reach Nexconn.",
    });
  }
});

// =======================================
// FRIEND LIST
// =======================================

app.get("/api/friends", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const friends = db.prepare(`
    SELECT
      friend.nexconn_user_id AS userId,
      friend.display_name AS name,
      fr.updated_at AS friendsSince
    FROM friend_requests AS fr
    JOIN students AS friend
      ON friend.id = CASE
        WHEN fr.sender_student_id = ?
        THEN fr.recipient_student_id
        ELSE fr.sender_student_id
      END
    WHERE fr.status = 'accepted'
      AND (
        fr.sender_student_id = ?
        OR fr.recipient_student_id = ?
      )
    ORDER BY friend.display_name
  `).all(
    currentUser.id,
    currentUser.id,
    currentUser.id,
  );

  return res.json({ friends });
});

// =======================================
// REMOVE FRIEND
// =======================================

app.delete("/api/friends/:friendUserId", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const friendUserId = String(req.params.friendUserId);
  const friend = findStudentByNexconnId(friendUserId);

  if (!friend) {
    return res.status(404).json({
      error: "Student not found.",
    });
  }

  if (friend.id === currentUser.id) {
    return res.status(400).json({
      error: "You cannot remove yourself.",
    });
  }

  const friendship = db.prepare(`
    SELECT id
    FROM friend_requests
    WHERE status = 'accepted'
      AND (
        (
          sender_student_id = ?
          AND recipient_student_id = ?
        )
        OR
        (
          sender_student_id = ?
          AND recipient_student_id = ?
        )
      )
    LIMIT 1
  `).get(
    currentUser.id,
    friend.id,
    friend.id,
    currentUser.id,
  ) as { id: string } | undefined;

  if (!friendship) {
    return res.status(404).json({
      error: "Friendship not found.",
    });
  }

  db.prepare(`
    UPDATE friend_requests
    SET status = 'removed',
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), friendship.id);

  return res.json({
    message: "Friend removed successfully.",
  });
});

// =======================================
// FRIEND REQUEST LIST
// =======================================

app.get("/api/friends/requests", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const incomingRows = db.prepare(`
    ${friendRequestSelect}
    WHERE fr.status = 'pending'
      AND fr.recipient_student_id = ?
    ORDER BY fr.created_at DESC
  `).all(currentUser.id) as FriendRequestViewRow[];

  const outgoingRows = db.prepare(`
    ${friendRequestSelect}
    WHERE fr.status = 'pending'
      AND fr.sender_student_id = ?
    ORDER BY fr.created_at DESC
  `).all(currentUser.id) as FriendRequestViewRow[];

  return res.json({
    incoming: incomingRows.map(presentRequest),
    outgoing: outgoingRows.map(presentRequest),
  });
});

// =======================================
// SEND FRIEND REQUEST
// =======================================

app.post("/api/friends/requests", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const targetUserId = req.body?.targetUserId;

  if (typeof targetUserId !== "string") {
    return res.status(400).json({
      error: "Recipient user ID is required.",
    });
  }

  const targetUser = findStudentByNexconnId(targetUserId);

  if (!targetUser) {
    return res.status(404).json({
      error: "Student not found.",
    });
  }

  if (targetUser.id === currentUser.id) {
    return res.status(400).json({
      error: "You cannot send a friend request to yourself.",
    });
  }

  if (areAlreadyFriends(currentUser.id, targetUser.id)) {
    return res.status(409).json({
      error: "You are already friends.",
    });
  }

  const existingOutgoing = db.prepare(`
    SELECT id
    FROM friend_requests
    WHERE sender_student_id = ?
      AND recipient_student_id = ?
      AND status = 'pending'
    LIMIT 1
  `).get(
    currentUser.id,
    targetUser.id,
  ) as { id: string } | undefined;

  if (existingOutgoing) {
    const request = getFriendRequestView(existingOutgoing.id);

    return res.json({
      message: "Friend request already sent.",
      request: request ? presentRequest(request) : null,
    });
  }

  const existingIncoming = db.prepare(`
    SELECT id
    FROM friend_requests
    WHERE sender_student_id = ?
      AND recipient_student_id = ?
      AND status = 'pending'
    LIMIT 1
  `).get(
    targetUser.id,
    currentUser.id,
  ) as { id: string } | undefined;

  if (existingIncoming) {
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE friend_requests
      SET status = 'accepted',
          updated_at = ?
      WHERE id = ?
        AND status = 'pending'
    `).run(now, existingIncoming.id);

    const request = getFriendRequestView(existingIncoming.id);

    return res.json({
      message: "You are now friends!",
      automaticallyAccepted: true,
      request: request ? presentRequest(request) : null,
    });
  }

  const now = new Date().toISOString();
  const requestId = randomUUID();

  db.prepare(`
    INSERT INTO friend_requests (
      id,
      sender_student_id,
      recipient_student_id,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(
    requestId,
    currentUser.id,
    targetUser.id,
    now,
    now,
  );

  const request = getFriendRequestView(requestId);

  return res.status(201).json({
    message: "Friend request sent.",
    request: request ? presentRequest(request) : null,
  });
});

// =======================================
// ACCEPT FRIEND REQUEST
// =======================================

app.post("/api/friends/requests/:requestId/accept", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const requestId = String(req.params.requestId);
  const request = db.prepare(`
    SELECT *
    FROM friend_requests
    WHERE id = ?
  `).get(requestId) as {
    id: string;
    recipient_student_id: string;
    status: FriendRequestStatus;
  } | undefined;

  if (!request) {
    return res.status(404).json({
      error: "Friend request not found.",
    });
  }

  if (request.recipient_student_id !== currentUser.id) {
    return res.status(403).json({
      error: "You cannot accept this request.",
    });
  }

  if (request.status !== "pending") {
    return res.status(409).json({
      error: "This request is no longer pending.",
    });
  }

  db.prepare(`
    UPDATE friend_requests
    SET status = 'accepted',
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), requestId);

  const updatedRequest = getFriendRequestView(requestId);

  return res.json({
    message: "Friend request accepted.",
    request: updatedRequest
      ? presentRequest(updatedRequest)
      : null,
  });
});

// =======================================
// DECLINE FRIEND REQUEST
// =======================================

app.post("/api/friends/requests/:requestId/decline", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const requestId = String(req.params.requestId);
  const request = db.prepare(`
    SELECT *
    FROM friend_requests
    WHERE id = ?
  `).get(requestId) as {
    id: string;
    recipient_student_id: string;
    status: FriendRequestStatus;
  } | undefined;

  if (!request) {
    return res.status(404).json({
      error: "Friend request not found.",
    });
  }

  if (request.recipient_student_id !== currentUser.id) {
    return res.status(403).json({
      error: "You cannot decline this request.",
    });
  }

  if (request.status !== "pending") {
    return res.status(409).json({
      error: "This request is no longer pending.",
    });
  }

  db.prepare(`
    UPDATE friend_requests
    SET status = 'declined',
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), requestId);

  return res.json({
    message: "Friend request declined.",
  });
});

// =======================================
// CANCEL FRIEND REQUEST
// =======================================

app.delete("/api/friends/requests/:requestId", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const requestId = String(req.params.requestId);
  const request = db.prepare(`
    SELECT *
    FROM friend_requests
    WHERE id = ?
  `).get(requestId) as {
    id: string;
    sender_student_id: string;
    status: FriendRequestStatus;
  } | undefined;

  if (!request) {
    return res.status(404).json({
      error: "Friend request not found.",
    });
  }

  if (request.sender_student_id !== currentUser.id) {
    return res.status(403).json({
      error: "You cannot cancel this request.",
    });
  }

  if (request.status !== "pending") {
    return res.status(409).json({
      error: "This request is no longer pending.",
    });
  }

  db.prepare(`
    UPDATE friend_requests
    SET status = 'cancelled',
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), requestId);

  return res.json({
    message: "Friend request cancelled.",
  });
});

// =======================================
// COMMUNITY CATALOG
// Public descriptions; private counts only for members/admins.
// =======================================

app.get("/api/communities/catalog", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const clubs = db.prepare(`
    SELECT *
    FROM clubs
    ORDER BY name
  `).all() as ClubRow[];

  const communities = clubs.map((club) => {
    const member = isClubMember(currentUser.id, club.id);
const canViewPrivateContent = member;

    const memberCount = canViewPrivateContent
      ? (
          db.prepare(`
            SELECT COUNT(*) AS count
            FROM memberships
            WHERE club_id = ?
              AND status = 'active'
          `).get(club.id) as { count: number }
        ).count
      : null;

    const application = db.prepare(`
      SELECT status
      FROM club_applications
      WHERE student_id = ?
        AND club_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(
      currentUser.id,
      club.id,
    ) as { status: ApplicationStatus } | undefined;

    return {
      id: club.id,
      name: club.name,
      category: club.category,
      description: club.description,
      isMember: member,
      canViewPrivateContent,
      memberCount,
      applicationStatus: application?.status ?? null,
    };
  });

  return res.json({ communities });
});

// =======================================
// COMMUNITY PAGE
// Members/admins only receive member directory and announcements.
// =======================================

// =======================================
// GET COMMUNITY MEMBERSHIPS / APPLICATIONS
// =======================================

app.get("/api/communities/me", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const memberships = getStudentMemberships(currentUser.id).map(
    (membership) => ({
      userId: currentUser.nexconn_user_id,
      clubId: membership.clubId,
      joinedAt: membership.joinedAt,
      role: membership.role,
      clubName: membership.clubName,
    }),
  );

  const applicationRows = db.prepare(`
    SELECT id
    FROM club_applications
    WHERE student_id = ?
    ORDER BY created_at DESC
  `).all(currentUser.id) as { id: string }[];

  const applications = applicationRows
    .map((row) => getApplicationView(row.id))
    .filter(
      (application): application is ApplicationRow =>
        application !== undefined,
    )
    .map(presentApplication);

  return res.json({
    profile: toStudentProfile(currentUser),
    memberships,
    applications,
  });
});

app.get("/api/communities/:clubId", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const clubId = String(req.params.clubId);
  const club = findClub(clubId);

  if (!club) {
    return res.status(404).json({
      error: "Community not found.",
    });
  }

  const member = isClubMember(currentUser.id, clubId);
const canViewPrivateContent = member;

  const memberCount = canViewPrivateContent
    ? (
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM memberships
          WHERE club_id = ?
            AND status = 'active'
        `).get(clubId) as { count: number }
      ).count
    : null;

  const members = canViewPrivateContent
    ? db.prepare(`
        SELECT
          s.nexconn_user_id AS userId,
          s.display_name AS name,
          s.initials,
          s.department,
          s.branch,
          s.academic_year AS year,
          s.division,
          m.role,
          m.joined_at AS joinedAt
        FROM memberships AS m
        JOIN students AS s ON s.id = m.student_id
        WHERE m.club_id = ?
          AND m.status = 'active'
        ORDER BY s.display_name
      `).all(clubId)
    : [];

  const announcements = canViewPrivateContent
    ? db.prepare(`
        SELECT
          a.id,
          a.title,
          a.body,
          a.created_at AS createdAt,
          a.updated_at AS updatedAt,
          s.display_name AS authorName
        FROM club_announcements AS a
        JOIN students AS s
          ON s.id = a.author_student_id
        WHERE a.club_id = ?
          AND a.is_published = 1
        ORDER BY a.created_at DESC
      `).all(clubId)
    : [];

  return res.json({
    community: {
      ...club,
      memberCount,
    },
    isMember: member,
    canViewPrivateContent,
    members,
    announcements,
  });
});

// =======================================
// SUBMIT COMMUNITY APPLICATION
// =======================================

app.post("/api/communities/:clubId/applications", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  const clubId = String(req.params.clubId);
  const motivation = req.body?.motivation;

  const club = findClub(clubId);

  if (!club) {
    return res.status(404).json({
      error: "Community not found.",
    });
  }

  if (
    typeof motivation !== "string" ||
    motivation.trim().length < 20 ||
    motivation.trim().length > 1000
  ) {
    return res.status(400).json({
      error: "Motivation must contain between 20 and 1000 characters.",
    });
  }

  if (isClubMember(currentUser.id, clubId)) {
    return res.status(409).json({
      error: "You are already a member of this community.",
    });
  }

  const existingApplication = db.prepare(`
    SELECT id
    FROM club_applications
    WHERE student_id = ?
      AND club_id = ?
      AND status = 'pending'
    LIMIT 1
  `).get(
    currentUser.id,
    clubId,
  );

  if (existingApplication) {
    return res.status(409).json({
      error: "You already have a pending application.",
    });
  }

  const now = new Date().toISOString();
  const applicationId = randomUUID();

  db.prepare(`
    INSERT INTO club_applications (
      id,
      student_id,
      club_id,
      message,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    applicationId,
    currentUser.id,
    clubId,
    motivation.trim(),
    now,
    now,
  );

  const application = getApplicationView(applicationId);

  return res.status(201).json({
    message: "Community application submitted.",
    application: application
      ? presentApplication(application)
      : null,
    student: toStudentProfile(currentUser),
  });
});

// =======================================
// CANCEL COMMUNITY APPLICATION
// =======================================

app.delete(
  "/api/communities/applications/:applicationId",
  (req, res) => {
    const currentUser = getCurrentDemoUser(req, res);
    if (!currentUser) return;

    const applicationId = String(req.params.applicationId);

    const application = db.prepare(`
      SELECT *
      FROM club_applications
      WHERE id = ?
    `).get(applicationId) as {
      id: string;
      student_id: string;
      status: ApplicationStatus;
    } | undefined;

    if (!application) {
      return res.status(404).json({
        error: "Application not found.",
      });
    }

    if (application.student_id !== currentUser.id) {
      return res.status(403).json({
        error: "You cannot cancel this application.",
      });
    }

    if (application.status !== "pending") {
      return res.status(409).json({
        error: "Only pending applications can be cancelled.",
      });
    }

    db.prepare(`
      UPDATE club_applications
      SET status = 'cancelled',
          updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), applicationId);

    return res.json({
      message: "Application cancelled.",
    });
  },
);

// =======================================
// ADMIN: VIEW PENDING APPLICATIONS
// =======================================

app.get("/api/communities/admin/applications", (req, res) => {
  const currentUser = getCurrentDemoUser(req, res);
  if (!currentUser) return;

  if (!isGlobalAdmin(currentUser.id)) {
    return res.status(403).json({
      error: "Administrator access required.",
    });
  }

  const rows = db.prepare(`
    SELECT a.id
    FROM club_applications AS a
    WHERE a.status = 'pending'
      AND EXISTS (
        SELECT 1
        FROM club_admins AS ca
        WHERE ca.student_id = ?
          AND (
            ca.club_id IS NULL
            OR ca.club_id = a.club_id
          )
      )
    ORDER BY a.created_at ASC
  `).all(currentUser.id) as { id: string }[];

  const applications = rows
    .map((row) => getApplicationView(row.id))
    .filter(
      (application): application is ApplicationRow =>
        application !== undefined,
    )
    .map((application) => ({
      ...presentApplication(application),
      student: {
        userId: application.applicant_user_id,
        name: application.applicant_name,
        ...(findStudentById(application.student_id)
          ? toStudentProfile(
              findStudentById(application.student_id)!,
            )
          : {}),
      },
    }));

  return res.json({ applications });
});

// =======================================
// ADMIN: APPROVE APPLICATION
// =======================================

app.post(
  "/api/communities/admin/applications/:applicationId/approve",
  (req, res) => {
    const currentUser = getCurrentDemoUser(req, res);
    if (!currentUser) return;

    const applicationId = String(req.params.applicationId);
    const application = db.prepare(`
      SELECT *
      FROM club_applications
      WHERE id = ?
    `).get(applicationId) as {
      id: string;
      student_id: string;
      club_id: string;
      status: ApplicationStatus;
    } | undefined;

    if (!application) {
      return res.status(404).json({
        error: "Application not found.",
      });
    }

    if (!canManageClub(currentUser.id, application.club_id)) {
      return res.status(403).json({
        error: "Administrator access required.",
      });
    }

    if (application.status !== "pending") {
      return res.status(409).json({
        error: "Application is no longer pending.",
      });
    }

    const now = new Date().toISOString();

    withTransaction(() => {
      db.prepare(`
        INSERT INTO memberships (
          student_id,
          club_id,
          role,
          status,
          joined_at
        )
        VALUES (?, ?, 'Member', 'active', ?)
        ON CONFLICT(student_id, club_id)
        DO UPDATE SET
          role = excluded.role,
          status = 'active'
      `).run(
        application.student_id,
        application.club_id,
        now,
      );

      db.prepare(`
        UPDATE club_applications
        SET status = 'approved',
            reviewed_by_student_id = ?,
            updated_at = ?
        WHERE id = ?
          AND status = 'pending'
      `).run(
        currentUser.id,
        now,
        applicationId,
      );
    });

    const updatedApplication = getApplicationView(applicationId);

    return res.json({
      message: "Application approved.",
      application: updatedApplication
        ? presentApplication(updatedApplication)
        : null,
    });
  },
);

// =======================================
// ADMIN: DECLINE APPLICATION
// =======================================

app.post(
  "/api/communities/admin/applications/:applicationId/decline",
  (req, res) => {
    const currentUser = getCurrentDemoUser(req, res);
    if (!currentUser) return;

    const applicationId = String(req.params.applicationId);
    const application = db.prepare(`
      SELECT *
      FROM club_applications
      WHERE id = ?
    `).get(applicationId) as {
      id: string;
      club_id: string;
      status: ApplicationStatus;
    } | undefined;

    if (!application) {
      return res.status(404).json({
        error: "Application not found.",
      });
    }

    if (!canManageClub(currentUser.id, application.club_id)) {
      return res.status(403).json({
        error: "Administrator access required.",
      });
    }

    if (application.status !== "pending") {
      return res.status(409).json({
        error: "Application is no longer pending.",
      });
    }

    db.prepare(`
      UPDATE club_applications
      SET status = 'declined',
          reviewed_by_student_id = ?,
          updated_at = ?
      WHERE id = ?
        AND status = 'pending'
    `).run(
      currentUser.id,
      new Date().toISOString(),
      applicationId,
    );

    return res.json({
      message: "Application declined.",
    });
  },
);

// =======================================
// ERROR HANDLER
// =======================================

app.use((
  error: unknown,
  _req: Request,
  res: Response,
  _next: express.NextFunction,
) => {
  console.error("[API] Unhandled error:", error);

  if (res.headersSent) return;

  return res.status(500).json({
    error: "An unexpected server error occurred.",
  });
});

// =======================================
// START SERVER
// =======================================

app.listen(PORT, () => {
  console.log(
    `CampusWide server running on http://localhost:${PORT}`,
  );
  console.log("[Database] SQLite is the source of truth.");
});
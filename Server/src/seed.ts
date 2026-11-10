import { db } from "./db.js";

type SeedStudent = {
  id: string;
  nexconnUserId: string;
  displayName: string;
  initials: string;
  department: string;
  branch: string;
  academicYear: "FY" | "SY" | "TY";
  division: "A" | "B" | "C" | "D";
  bio: string;
};

const students: SeedStudent[] = [
  {
    id: "student-001",
    nexconnUserId: "cwAarav8F2K",
    displayName: "User 1",
    initials: "U1",
    department: "Information Technology",
    branch: "IT",
    academicYear: "FY",
    division: "B",
    bio: "",
  },
  {
    id: "student-002",
    nexconnUserId: "cwPriya4M9Q",
    displayName: "User 2",
    initials: "U2",
    department: "Information Technology",
    branch: "IT",
    academicYear: "FY",
    division: "B",
    bio: "",
  },
  {
    id: "student-003",
    nexconnUserId: "cwRohan7T3X",
    displayName: "User 3",
    initials: "U3",
    department: "Information Technology",
    branch: "IT",
    academicYear: "FY",
    division: "B",
    bio: "",
  },
  {
    id: "student-004",
    nexconnUserId: "cwDemoUser8A2",
    displayName: "User 4",
    initials: "U4",
    department: "Information Technology",
    branch: "IT",
    academicYear: "FY",
    division: "B",
    bio: "",
  },
  {
    id: "student-005",
    nexconnUserId: "cwUser05K8P",
    displayName: "User 5",
    initials: "U5",
    department: "Computer Engineering",
    branch: "Comp",
    academicYear: "FY",
    division: "A",
    bio: "",
  },
  {
    id: "student-006",
    nexconnUserId: "cwUser06R3N",
    displayName: "User 6",
    initials: "U6",
    department: "Artificial Intelligence and Machine Learning",
    branch: "AIML",
    academicYear: "FY",
    division: "C",
    bio: "",
  },
  {
    id: "student-007",
    nexconnUserId: "cwUser07B6Q",
    displayName: "User 7",
    initials: "U7",
    department: "Artificial Intelligence and Data Science",
    branch: "AIDS",
    academicYear: "SY",
    division: "A",
    bio: "",
  },
  {
    id: "student-008",
    nexconnUserId: "cwUser08D2L",
    displayName: "User 8",
    initials: "U8",
    department: "Civil Engineering",
    branch: "Civil",
    academicYear: "FY",
    division: "D",
    bio: "",
  },
  {
    id: "student-009",
    nexconnUserId: "cwUser09M5W",
    displayName: "User 9",
    initials: "U9",
    department: "Mechanical Engineering",
    branch: "Mechanical",
    academicYear: "SY",
    division: "B",
    bio: "",
  },
  {
    id: "student-010",
    nexconnUserId: "cwUser10T7C",
    displayName: "User 10",
    initials: "U10",
    department: "Information Technology",
    branch: "IT",
    academicYear: "TY",
    division: "C",
    bio: "",
  },
  {
    id: "student-011",
    nexconnUserId: "cwUser11A4J",
    displayName: "User 11",
    initials: "U11",
    department: "Computer Engineering",
    branch: "Comp",
    academicYear: "SY",
    division: "D",
    bio: "",
  },
  {
    id: "student-012",
    nexconnUserId: "cwUser12P9E",
    displayName: "User 12",
    initials: "U12",
    department: "Artificial Intelligence and Machine Learning",
    branch: "AIML",
    academicYear: "FY",
    division: "B",
    bio: "",
  },
  {
    id: "student-013",
    nexconnUserId: "cwUser13H2V",
    displayName: "User 13",
    initials: "U13",
    department: "Artificial Intelligence and Data Science",
    branch: "AIDS",
    academicYear: "TY",
    division: "C",
    bio: "",
  },
  {
    id: "student-014",
    nexconnUserId: "cwUser14N6S",
    displayName: "User 14",
    initials: "U14",
    department: "Civil Engineering",
    branch: "Civil",
    academicYear: "SY",
    division: "A",
    bio: "",
  },
  {
    id: "student-015",
    nexconnUserId: "cwUser15C8F",
    displayName: "User 15",
    initials: "U15",
    department: "Mechanical Engineering",
    branch: "Mechanical",
    academicYear: "FY",
    division: "C",
    bio: "",
  },
  {
    id: "student-016",
    nexconnUserId: "cwUser16L3Y",
    displayName: "User 16",
    initials: "U16",
    department: "Information Technology",
    branch: "IT",
    academicYear: "SY",
    division: "D",
    bio: "",
  },
  {
    id: "student-017",
    nexconnUserId: "cwUser17Q5A",
    displayName: "User 17",
    initials: "U17",
    department: "Computer Engineering",
    branch: "Comp",
    academicYear: "TY",
    division: "B",
    bio: "",
  },
  {
    id: "student-018",
    nexconnUserId: "cwUser18W7R",
    displayName: "User 18",
    initials: "U18",
    department: "Artificial Intelligence and Machine Learning",
    branch: "AIML",
    academicYear: "SY",
    division: "D",
    bio: "",
  },
  {
    id: "student-019",
    nexconnUserId: "cwUser19E4K",
    displayName: "User 19",
    initials: "U19",
    department: "Artificial Intelligence and Data Science",
    branch: "AIDS",
    academicYear: "FY",
    division: "A",
    bio: "",
  },
  {
    id: "student-020",
    nexconnUserId: "cwUser20S9D",
    displayName: "User 20",
    initials: "U20",
    department: "Mechanical Engineering",
    branch: "Mechanical",
    academicYear: "TY",
    division: "A",
    bio: "",
  },
];

const clubs = [
  {
    id: "ncc",
    name: "NCC",
    category: "National Service",
    description:
      "The National Cadet Corps develops discipline, leadership, teamwork and a spirit of service through training and activities.",
  },
  {
    id: "nss",
    name: "NSS",
    category: "Social Service",
    description:
      "The National Service Scheme encourages students to participate in community service and social development.",
  },
  {
    id: "rotaract",
    name: "Rotaract",
    category: "Social Service",
    description:
      "A student-led community focused on leadership, volunteering, professional development and social impact.",
  },
  {
    id: "green-club",
    name: "Green Club",
    category: "Environmental",
    description:
      "A student community promoting environmental awareness, sustainability and campus-level green initiatives.",
  },
  {
    id: "iste",
    name: "ISTE",
    category: "Professional Society",
    description:
      "A technical student community supporting learning, innovation, technical activities and professional development.",
  },
  {
    id: "tsdw",
    name: "TSDW",
    category: "Student Development",
    description:
      "A student community focused on campus participation, development activities and collaborative opportunities.",
  },
];

const insertStudent = db.prepare(`
  INSERT OR IGNORE INTO students (
    id, nexconn_user_id, display_name, initials,
    department, branch, academic_year, division, bio
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertClub = db.prepare(`
  INSERT OR IGNORE INTO clubs (id, name, category, description)
  VALUES (?, ?, ?, ?)
`);

const insertMembership = db.prepare(`
  INSERT OR IGNORE INTO memberships (student_id, club_id, role)
  VALUES (?, ?, ?)
`);

function createRandomGenerator(initialSeed: number) {
  let state = initialSeed >>> 0;

  return function random(): number {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function generateMemberships(): Map<string, string[]> {
  const random = createRandomGenerator(20261108);
  const clubIds = clubs.map((club) => club.id);
  const assignments = new Map<string, string[]>();

  for (const student of students) {
    let assigned: string[];

    if (student.id === "student-001") {
      // User 1 must be an NCC cadet.
      const otherClubs = shuffle(
        clubIds.filter((id) => id !== "ncc"),
        random,
      );

      const total = 1 + Math.floor(random() * 3);
      assigned = ["ncc", ...otherClubs.slice(0, total - 1)];
    } else if (
      student.id === "student-002" ||
      student.id === "student-004"
    ) {
      // User 2 is not an NCC member. User 4 is the demo admin.
      const eligibleClubs =
        student.id === "student-002"
          ? clubIds.filter((id) => id !== "ncc")
          : [];

      const total =
        student.id === "student-002"
          ? Math.floor(random() * 4)
          : 0;

      assigned = shuffle(eligibleClubs, random).slice(0, total);
    } else {
      const total = Math.floor(random() * 4);
      assigned = shuffle(clubIds, random).slice(0, total);
    }

    assignments.set(student.id, assigned);
  }

  // Make sure every club has at least one demo member.
  for (const clubId of clubIds) {
    const alreadyAssigned = [...assignments.values()].some((list) =>
      list.includes(clubId),
    );

    if (!alreadyAssigned) {
      const eligibleStudents = students.filter((student) => {
        if (
          student.id === "student-001" ||
          student.id === "student-002" ||
          student.id === "student-004"
        ) {
          return false;
        }

        return (assignments.get(student.id)?.length ?? 0) < 3;
      });

      const selected = eligibleStudents[0];

      if (selected) {
        assignments.get(selected.id)?.push(clubId);
      }
    }
  }

  return assignments;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS student_accounts (
    login_key TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    FOREIGN KEY (student_id)
      REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const insertAccount = db.prepare(`
  INSERT OR IGNORE INTO student_accounts (login_key, student_id)
  VALUES (?, ?)
`);

const getSeedMarker = db.prepare(`
  SELECT value FROM app_meta WHERE key = ?
`);

const saveSeedMarker = db.prepare(`
  INSERT OR IGNORE INTO app_meta (key, value)
  VALUES (?, ?)
`);

try {
  db.exec("BEGIN IMMEDIATE");

  for (const student of students) {
    insertStudent.run(
      student.id,
      student.nexconnUserId,
      student.displayName,
      student.initials,
      student.department,
      student.branch,
      student.academicYear,
      student.division,
      student.bio,
    );

    // Keep the existing demo-user login working for User 4.
    insertAccount.run(student.id, student.id);

    if (student.id === "student-004") {
      insertAccount.run("demo-user", student.id);
    }
  }

  for (const club of clubs) {
    insertClub.run(
      club.id,
      club.name,
      club.category,
      club.description,
    );
  }

  const membershipSeeded = getSeedMarker.get(
    "demo_memberships_seeded",
  ) as { value: string } | undefined;

  if (!membershipSeeded) {
    const assignments = generateMemberships();

    for (const [studentId, clubIds] of assignments) {
      for (const clubId of clubIds) {
        const role =
          studentId === "student-001" && clubId === "ncc"
            ? "Cadet"
            : "Member";

        insertMembership.run(studentId, clubId, role);
      }
    }

    saveSeedMarker.run("demo_memberships_seeded", "true");
  }

  // User 4 is the global demo administrator.
  db.prepare(`
    INSERT INTO club_admins (student_id, club_id, role)
    SELECT ?, NULL, 'global_admin'
    WHERE NOT EXISTS (
      SELECT 1
      FROM club_admins
      WHERE student_id = ? AND club_id IS NULL
    )
  `).run("student-004", "student-004");

  db.exec("COMMIT");

  const studentCount = db
    .prepare("SELECT COUNT(*) AS count FROM students")
    .get() as { count: number };

  const clubCount = db
    .prepare("SELECT COUNT(*) AS count FROM clubs")
    .get() as { count: number };

  const membershipCount = db
    .prepare("SELECT COUNT(*) AS count FROM memberships")
    .get() as { count: number };

  console.log("[Seed] Completed successfully.");
  console.log(`[Seed] Students: ${studentCount.count}`);
  console.log(`[Seed] Clubs: ${clubCount.count}`);
  console.log(`[Seed] Memberships: ${membershipCount.count}`);
  console.log("[Seed] User 1 is an NCC Cadet.");
  console.log("[Seed] User 4 is the global demo admin.");
} catch (error) {
  db.exec("ROLLBACK");
  console.error("[Seed] Failed:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
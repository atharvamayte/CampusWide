export type Member = {
  id: string;
  chatUserId: string;
  name: string;
  initials: string;
  department: string;
  branch: string;
  year: string;
  division: string;
  clubs: string[];
  role: string;
  bio: string;
};

// ---------------------------------------
// STUDENT RECORDS
// ---------------------------------------

const user1: Member = {
  id: "student-001",
  chatUserId: "cwAarav8F2K",
  name: "User 1",
  initials: "U1",
  department: "Information Technology",
  branch: "IT",
  year: "FY",
  division: "B",
  clubs: ["ncc"],
  role: "Student",
  bio: "Interested in technology and campus activities."
};

const user2: Member = {
  id: "student-002",
  chatUserId: "cwPriya4M9Q",
  name: "User 2",
  initials: "U2",
  department: "Information Technology",
  branch: "IT",
  year: "FY",
  division: "B",
  clubs: [],
  role: "Student",
  bio: "Interested in technology and campus activities."
};

const user3: Member = {
  id: "student-003",
  chatUserId: "cwRohan7T3X",
  name: "User 3",
  initials: "U3",
  department: "Information Technology",
  branch: "IT",
  year: "FY",
  division: "B",
  clubs: [],
  role: "Student",
  bio: "Exploring programming and new technologies."
};

const user4: Member = {
  id: "student-004",
  chatUserId: "cwDemoUser8A2",
  name: "User 4",
  initials: "U4",
  department: "Information Technology",
  branch: "IT",
  year: "FY",
  division: "B",
  clubs: [],
  role: "Student",
  bio: "Exploring the CampusWide community."
};

// ---------------------------------------
// DIRECTORY DATA
// ---------------------------------------

export const members: Record<string, Member[]> = {

  // All students in IT-B
  students: [
    user1,
    user2,
    user3,
    user4
  ],

  // Innovative Exam project team
  "innovative-exam": [
    {
      ...user1,
      role: "Team Member",
      bio: "Member of the Innovative Exam project team."
    },
    {
      ...user2,
      role: "Team Member",
      bio: "Member of the Innovative Exam project team."
    }
  ],

  // NCC organisation
  ncc: [
    {
      ...user1,
      role: "NCC Cadet",
      bio: "Member of the college NCC unit."
    }
  ]
};
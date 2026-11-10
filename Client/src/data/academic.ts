import type { CampusNode } from "./campus";
import type { Member } from "./members";

const YEAR_ORDER = ["FY", "SY", "TY", "FtY"];

const YEAR_LABELS: Record<string, string> = {
  FY: "First Year",
  SY: "Second Year",
  TY: "Third Year",
  FtY: "Fourth Year"
};

const BRANCH_ORDER = [
  "Comp",
  "IT",
  "AIML",
  "AIDS",
  "Civil",
  "Mechanical"
];

const BRANCH_LABELS: Record<string, string> = {
  Comp: "COMP",
  IT: "IT",
  AIML: "AIML",
  AIDS: "AIDS",
  Civil: "Civil",
  Mechanical: "Mechanical"
};

export function buildAcademicHierarchy(
  students: Member[]
): CampusNode[] {

  // Only show years that currently have students.
  return YEAR_ORDER.map((year) => {

    // Find branches with students in this year.
    const availableBranches = BRANCH_ORDER.filter((branch) =>
      students.some(
        (student) =>
          student.year === year &&
          student.branch === branch
      )
    );

    const branchNodes: CampusNode[] =
      availableBranches.map((branch) => {

        // Find divisions that actually contain students.
        const availableDivisions = ["A", "B", "C", "D"].filter(
          (division) =>
            students.some(
              (student) =>
                student.year === year &&
                student.branch === branch &&
                student.division === division
            )
        );

        const divisionNodes: CampusNode[] =
          availableDivisions.map((division) => {

            const children: CampusNode[] = [
              {
                id: `students-${year}-${branch}-${division}`,
                name: "Students",
                description:
                  `Students in ${year} · ${BRANCH_LABELS[branch]} · Division ${division}`,
                type: "group"
              }
            ];

            // Preserve the existing Innovative Exam destination.
            if (
              year === "FY" &&
              branch === "IT" &&
              division === "B"
            ) {
              children.push({
                id: "innovative-exam",
                name: "Innovative Exam",
                description: "Your project team",
                type: "group"
              });
            }

            return {
              id: `division-${year}-${branch}-${division}`,
              name: `Division ${division}`,
              description:
                `${year} ${BRANCH_LABELS[branch]} · Division ${division}`,
              type: "class" as const,
              children
            };
          });

        return {
          id: `branch-${year}-${branch}`,
          name: BRANCH_LABELS[branch],
          description: `${year} ${BRANCH_LABELS[branch]} students`,
          type: "department" as const,
          children: divisionNodes
        };
      });

    return {
      id: `year-${year}`,
      name: year,
      description: YEAR_LABELS[year] ?? year,
      type: "department" as const,
      children: branchNodes
    };
  });
}
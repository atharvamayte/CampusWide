import type { Member } from "../data/members";

const API_URL = import.meta.env.VITE_API_URL;

type StudentsResponse = {
  students: Member[];
  error?: string;
};

export async function getStudents(
  currentUserId: string
): Promise<Member[]> {
  if (!API_URL) {
    throw new Error("Backend API URL is missing.");
  }

  if (!currentUserId) {
    throw new Error("Current user ID is missing.");
  }

  const response = await fetch(
    `${API_URL.replace(/\/+$/, "")}/api/students`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-campuswide-user-id": currentUserId
      }
    }
  );

  const data = await response.json().catch(() => ({})) as StudentsResponse;

  if (!response.ok) {
    throw new Error(
      data.error || `Could not load students. Status: ${response.status}`
    );
  }

  if (!Array.isArray(data.students)) {
    throw new Error("The student directory returned invalid data.");
  }

  return data.students;
}
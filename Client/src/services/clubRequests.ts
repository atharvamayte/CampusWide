const API_URL = import.meta.env.VITE_API_URL;

// =======================================
// TYPES
// =======================================

export type CommunityProfile = {
  userId: string;
  name: string;
  initials?: string;
  department: string;
  branch: string;
  year: string;
  division: string;
  bio?: string;
};

export type CommunityMembership = {
  userId: string;
  clubId: string;
  clubName?: string;
  role?: string;
  joinedAt: string;
};

export type CommunityApplicationStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled";

export type CommunityApplication = {
  id: string;
  applicantUserId: string;
  clubId: string;
  clubName?: string;
  motivation: string;
  status: CommunityApplicationStatus;
  submittedAt: string;
  updatedAt: string;
};

export type MyCommunityData = {
  profile: CommunityProfile;
  memberships: CommunityMembership[];
  applications: CommunityApplication[];
};

// =======================================
// COMMUNITY CATALOGUE
// =======================================

export type CommunityCatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  isMember: boolean;
  canViewPrivateContent: boolean;
  memberCount: number | null;
  applicationStatus: CommunityApplicationStatus | null;
};

export type CommunityClubMember = {
  userId: string;
  name: string;
  initials: string;
  department: string;
  branch: string;
  year: string;
  division: string;
  role: string;
  joinedAt: string;
};

export type CommunityAnnouncement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
};

export type CommunityPageData = {
  community: {
    id: string;
    name: string;
    category: string;
    description: string;
    memberCount: number | null;
  };
  isMember: boolean;
  canViewPrivateContent: boolean;
  members: CommunityClubMember[];
  announcements: CommunityAnnouncement[];
};

export type AdminCommunityApplication =
  CommunityApplication & {
    student: CommunityProfile | null;
  };

// =======================================
// API HELPER
// =======================================

async function apiRequest<T>(
  currentUserId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error("Backend API URL is missing.");
  }

  if (!currentUserId) {
    throw new Error("Current user ID is missing.");
  }

  const response = await fetch(
    `${API_URL.replace(/\/+$/, "")}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-campuswide-user-id": currentUserId,
        ...options.headers
      }
    }
  );

  const data = await response.json().catch(() => ({})) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed. Status: ${response.status}`
    );
  }

  return data;
}

// =======================================
// GET COMMUNITY CATALOGUE
// =======================================

export async function getCommunityCatalog(
  currentUserId: string
): Promise<CommunityCatalogItem[]> {
  const result = await apiRequest<{
    communities: CommunityCatalogItem[];
  }>(
    currentUserId,
    "/api/communities/catalog"
  );

  return result.communities;
}

// =======================================
// GET INDIVIDUAL COMMUNITY PAGE
// =======================================

export async function getCommunityDetails(
  currentUserId: string,
  clubId: string
): Promise<CommunityPageData> {
  return apiRequest<CommunityPageData>(
    currentUserId,
    `/api/communities/${encodeURIComponent(clubId)}`
  );
}

// =======================================
// GET MY COMMUNITIES
// =======================================

export async function getMyCommunityData(
  currentUserId: string
): Promise<MyCommunityData> {
  return apiRequest<MyCommunityData>(
    currentUserId,
    "/api/communities/me"
  );
}

// =======================================
// SUBMIT JOINING APPLICATION
// =======================================

export async function submitClubApplication(
  currentUserId: string,
  clubId: string,
  motivation: string
): Promise<{
  message: string;
  application: CommunityApplication;
  student: CommunityProfile;
}> {
  return apiRequest(
    currentUserId,
    `/api/communities/${encodeURIComponent(clubId)}/applications`,
    {
      method: "POST",
      body: JSON.stringify({ motivation })
    }
  );
}

// =======================================
// CANCEL JOINING APPLICATION
// =======================================

export async function cancelClubApplication(
  currentUserId: string,
  applicationId: string
): Promise<{ message: string }> {
  return apiRequest(
    currentUserId,
    `/api/communities/applications/${encodeURIComponent(applicationId)}`,
    {
      method: "DELETE"
    }
  );
}

// =======================================
// ADMIN: VIEW APPLICATIONS
// =======================================

export async function getAdminClubApplications(
  currentUserId: string
): Promise<AdminCommunityApplication[]> {
  const result = await apiRequest<{
    applications: AdminCommunityApplication[];
  }>(
    currentUserId,
    "/api/communities/admin/applications"
  );

  return result.applications;
}

// =======================================
// ADMIN: APPROVE APPLICATION
// =======================================

export async function approveClubApplication(
  currentUserId: string,
  applicationId: string
): Promise<{ message: string }> {
  return apiRequest(
    currentUserId,
    `/api/communities/admin/applications/${encodeURIComponent(applicationId)}/approve`,
    {
      method: "POST"
    }
  );
}

// =======================================
// ADMIN: DECLINE APPLICATION
// =======================================

export async function declineClubApplication(
  currentUserId: string,
  applicationId: string
): Promise<{ message: string }> {
  return apiRequest(
    currentUserId,
    `/api/communities/admin/applications/${encodeURIComponent(applicationId)}/decline`,
    {
      method: "POST"
    }
  );
}
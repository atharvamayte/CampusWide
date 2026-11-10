const API_URL = import.meta.env.VITE_API_URL;

export type Friend = {
  userId: string;
  name: string;
  friendsSince: string;
};

export type FriendRequestUser = {
  userId: string;
  name: string;
};

export type FriendRequest = {
  id: string;
  from: FriendRequestUser;
  to: FriendRequestUser;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type FriendRequestsResponse = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};

export type FriendRequestResult = {
  message: string;
  request?: FriendRequest;
  automaticallyAccepted?: boolean;
};

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

// Get all accepted friends.
export async function getFriends(
  currentUserId: string
): Promise<Friend[]> {
  const result = await apiRequest<{ friends: Friend[] }>(
    currentUserId,
    "/api/friends"
  );

  return result.friends;
}

// Get incoming and outgoing friend requests.
export async function getFriendRequests(
  currentUserId: string
): Promise<FriendRequestsResponse> {
  return apiRequest<FriendRequestsResponse>(
    currentUserId,
    "/api/friends/requests"
  );
}

// Send a friend request.
export async function sendFriendRequest(
  currentUserId: string,
  targetUserId: string
): Promise<FriendRequestResult> {
  return apiRequest<FriendRequestResult>(
    currentUserId,
    "/api/friends/requests",
    {
      method: "POST",
      body: JSON.stringify({ targetUserId })
    }
  );
}

// Accept an incoming request.
export async function acceptFriendRequest(
  currentUserId: string,
  requestId: string
): Promise<FriendRequestResult> {
  return apiRequest<FriendRequestResult>(
    currentUserId,
    `/api/friends/requests/${encodeURIComponent(requestId)}/accept`,
    { method: "POST" }
  );
}

// Decline an incoming request.
export async function declineFriendRequest(
  currentUserId: string,
  requestId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    currentUserId,
    `/api/friends/requests/${encodeURIComponent(requestId)}/decline`,
    { method: "POST" }
  );
}

// Cancel an outgoing request.
export async function cancelFriendRequest(
  currentUserId: string,
  requestId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    currentUserId,
    `/api/friends/requests/${encodeURIComponent(requestId)}`,
    { method: "DELETE" }
  );
}

// Remove an existing friend.
export async function removeFriend(
  currentUserId: string,
  friendUserId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    currentUserId,
    `/api/friends/${encodeURIComponent(friendUserId)}`,
    {
      method: "DELETE"
    }
  );
}
import { useEffect, useRef, useState } from "react";
import { campusData, type CampusNode } from "./data/campus";
import { members, type Member } from "./data/members";
import { buildAcademicHierarchy } from "./data/academic";
import { getStudents } from "./services/students";
import Bubble from "./components/Bubble";
import MemberCard from "./components/MemberCard";
import ChatWindow from "./components/ChatWindow";
import { connectNexconn } from "./services/nexconn";
import {
  getDirectConversations,
  clearDirectConversationUnread,
  type DirectConversation,
  type DirectTextMessage
} from "./services/directChat";
import CommunityPage from "./components/CommunityPage";

import {
  getCommunityCatalog,
  type CommunityCatalogItem
} from "./services/clubRequests";

import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  type Friend,
  type FriendRequestsResponse
} from "./services/friends";
import JudgesHome from "./components/JudgesHome";

const EMPTY_MESSAGES: DirectTextMessage[] = [];
type CampusWideNavigationSnapshot = {
  path: CampusNode[];
  selectedNode: CampusNode | null;
  selectedMember: Member | null;
  messageOpen: boolean;
};

function CampusWideApp() {
  const [path, setPath] = useState<CampusNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<CampusNode | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [messageOpen, setMessageOpen] = useState(false);
  const [directConversations, setDirectConversations] =
  useState<DirectConversation[]>([]);

const [showMessagesInbox, setShowMessagesInbox] = useState(false);
const [messagesInboxLoading, setMessagesInboxLoading] = useState(false);
const [messagesInboxError, setMessagesInboxError] = useState("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [connectionError, setConnectionError] = useState("");

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [friends, setFriends] = useState<Friend[]>([]);

  const [friendRequests, setFriendRequests] =
    useState<FriendRequestsResponse>({
      incoming: [],
      outgoing: []
    });

      const [communityCatalog, setCommunityCatalog] =
    useState<CommunityCatalogItem[]>([]);

  const [communityCatalogLoading, setCommunityCatalogLoading] =
    useState(false);

  const [communityCatalogError, setCommunityCatalogError] =
    useState("");
    const [students, setStudents] = useState<Member[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
    const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [academicBranchFilter, setAcademicBranchFilter] = useState("all");
  const [academicDivisionFilter, setAcademicDivisionFilter] = useState("all");

  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendError, setFriendError] = useState("");
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  const seenMessages = useRef<Set<string>>(new Set());

  // Keep received messages even when their conversation is closed.
  const messagesByUser = useRef<Record<string, DirectTextMessage[]>>({});
    const lastHistorySnapshot = useRef<string | null>(null);
  // ---------------------------------------
  // BROWSER HISTORY SYNCHRONIZATION
  // ---------------------------------------

  useEffect(() => {
    const snapshot: CampusWideNavigationSnapshot = {
      path,
      selectedNode,
      selectedMember,
      messageOpen
    };

    const serialized = JSON.stringify(snapshot);

    // Initialise the current browser entry without
    // creating an unnecessary extra history entry.
    if (lastHistorySnapshot.current === null) {
      const existingState =
        window.history.state &&
        typeof window.history.state === "object"
          ? window.history.state
          : {};

      window.history.replaceState(
        {
          ...existingState,
          campusWideNavigation: snapshot
        },
        "",
        window.location.href
      );

      lastHistorySnapshot.current = serialized;
      return;
    }

    // Avoid duplicate history entries.
    if (lastHistorySnapshot.current === serialized) {
      return;
    }

    window.history.pushState(
      {
        ...window.history.state,
        campusWideNavigation: snapshot
      },
      "",
      window.location.href
    );

    lastHistorySnapshot.current = serialized;
  }, [path, selectedNode, selectedMember, messageOpen]);

  useEffect(() => {
    const handleBrowserBack = (event: PopStateEvent) => {
      const snapshot = event.state?.campusWideNavigation as
        | CampusWideNavigationSnapshot
        | undefined;

      if (!snapshot) return;

      // Remember the restored entry so React doesn't
      // immediately push it again.
      lastHistorySnapshot.current = JSON.stringify(snapshot);

      setPath(snapshot.path ?? []);
      setSelectedNode(snapshot.selectedNode ?? null);
      setSelectedMember(snapshot.selectedMember ?? null);
      setMessageOpen(snapshot.messageOpen ?? false);
    };

    window.addEventListener("popstate", handleBrowserBack);

    return () => {
      window.removeEventListener("popstate", handleBrowserBack);
    };
  }, []);
    const inCampus = path.length > 0;
  const currentNode = path[path.length - 1] ?? null;

  const isCommunityHub =
    currentNode?.id === "organisations" ||
    currentNode?.id === "explore-campus";

        const academicNodes = buildAcademicHierarchy(students);

  // Identify the currently logged-in student's class.
  const currentStudent = students.find(
    (student) => student.chatUserId === currentUserId
  );

  // Create a shortcut directly to their division directory.
  const myClassNode: CampusNode | null = currentStudent
    ? {
        id: `students-${currentStudent.year}-${currentStudent.branch}-${currentStudent.division}`,
        name: `${currentStudent.year} ${currentStudent.branch}-${currentStudent.division}`,
        description: "MY CLASS",
        type: "class"
      }
    : null; 

  const visibleNodes: CampusNode[] =
    currentNode?.id === "organisations"
      ? communityCatalog
          .filter((club) => club.isMember)
          .map((club) => ({
            id: club.id,
            name: club.name,
            description: club.description,
            type: "organisation"
          }))
      : currentNode?.id === "explore-campus"
        ? communityCatalog
            .filter((club) => !club.isMember)
            .map((club) => ({
              id: club.id,
              name: club.name,
              description:
                club.applicationStatus === "pending"
                  ? `${club.description} · Application pending`
                  : club.description,
              type: "organisation"
            }))
            : currentNode?.id === "academics"
          ? [
              ...(myClassNode ? [myClassNode] : []),
              ...academicNodes
            ]
          : currentNode?.children ?? [];

  const inboxConversations = directConversations.flatMap(
  (conversation) => {
    const member = students.find(
      (student) => student.chatUserId === conversation.userId
    );

    const latestMessage = conversation.latestMessage;

    return member && latestMessage
      ? [{ conversation, member, latestMessage }]
      : [];
  }
);

const totalUnreadMessages = Object.values(unreadCounts).reduce(
  (total, count) => total + count,
  0
);
// ---------------------------------------
// ACADEMIC UNREAD NOTIFICATION COUNTS
// ---------------------------------------

const getNodeUnreadCount = (node: CampusNode): number => {
  let matchingStudents: Member[] = [];

  if (node.id === "academics") {
    matchingStudents = students;
  } else {
    const parts = node.id.split("-");

    if (parts[0] === "year" && parts.length === 2) {
      matchingStudents = students.filter(
        (student) => student.year === parts[1]
      );
    } else if (parts[0] === "branch" && parts.length === 3) {
      matchingStudents = students.filter(
        (student) =>
          student.year === parts[1] &&
          student.branch === parts[2]
      );
    } else if (
      (parts[0] === "division" || parts[0] === "students") &&
      parts.length === 4
    ) {
      matchingStudents = students.filter(
        (student) =>
          student.year === parts[1] &&
          student.branch === parts[2] &&
          student.division === parts[3]
      );
    } else {
      return 0;
    }
  }

  return matchingStudents.reduce(
    (total, student) =>
      total + (unreadCounts[student.chatUserId] ?? 0),
    0
  );
};
const getNodeFriendRequestCount = (node: CampusNode): number => {
  let matchingStudents: Member[] = [];

  if (node.id === "academics") {
    matchingStudents = students;
  } else {
    const parts = node.id.split("-");

    if (parts[0] === "year" && parts.length === 2) {
      matchingStudents = students.filter(
        (student) => student.year === parts[1]
      );
    } else if (parts[0] === "branch" && parts.length === 3) {
      matchingStudents = students.filter(
        (student) =>
          student.year === parts[1] &&
          student.branch === parts[2]
      );
    } else if (
      (parts[0] === "division" || parts[0] === "students") &&
      parts.length === 4
    ) {
      matchingStudents = students.filter(
        (student) =>
          student.year === parts[1] &&
          student.branch === parts[2] &&
          student.division === parts[3]
      );
    } else {
      return 0;
    }
  }

  return friendRequests.incoming.filter((request) =>
    matchingStudents.some(
      (student) => student.chatUserId === request.from.userId
    )
  ).length;
};
const isOwnProfile =
  Boolean(currentUserId) &&
  selectedMember?.chatUserId === currentUserId;

  // ---------------------------------------
  // NEXCONN CONNECTION
  // ---------------------------------------


  useEffect(() => {
    let active = true;

    const params = new URLSearchParams(window.location.search);
    const judgeUsername = params.get("judge");
    const demoUserId = params.get("user") || "demo-user";

    const connect = judgeUsername
      ? connectNexconn(judgeUsername, "judge")
      : connectNexconn(demoUserId, "student");

    connect
      .then((userId) => {
        if (active) {
          console.log("[CampusWide] Nexconn connected as:", userId);
          setCurrentUserId(userId);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setConnectionError(
            error instanceof Error
              ? error.message
              : "Could not connect to chat."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);


  // ---------------------------------------
  // LOAD AND SYNCHRONIZE FRIEND DATA
  // ---------------------------------------

  useEffect(() => {
    if (!currentUserId) return;

    let active = true;

    const loadFriendData = async () => {
      try {
        const [friendList, requests] = await Promise.all([
          getFriends(currentUserId),
          getFriendRequests(currentUserId)
        ]);

        if (active) {
          setFriends(friendList);
          setFriendRequests(requests);
          setFriendError("");
        }
      } catch (error) {
        if (active) {
          setFriendError(
            error instanceof Error
              ? error.message
              : "Could not load friendships."
          );
        }
      }
    };

    void loadFriendData();

    const intervalId = window.setInterval(() => {
      void loadFriendData();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [currentUserId]);
   // ---------------------------------------
  // LOAD AND SYNCHRONIZE COMMUNITY CATALOG
  // ---------------------------------------

  useEffect(() => {
    if (!currentUserId) return;

    let active = true;
    let firstLoad = true;

    const loadCommunityCatalog = async () => {
      if (firstLoad) {
        setCommunityCatalogLoading(true);
      }

      try {
        const catalog = await getCommunityCatalog(currentUserId);

        if (active) {
          setCommunityCatalog(catalog);
          setCommunityCatalogError("");
        }
      } catch (error) {
        if (active) {
          setCommunityCatalogError(
            error instanceof Error
              ? error.message
              : "Could not load campus communities."
          );
        }
      } finally {
        if (firstLoad) {
          if (active) {
            setCommunityCatalogLoading(false);
          }

          firstLoad = false;
        }
      }
    };

    void loadCommunityCatalog();

    const intervalId = window.setInterval(() => {
      void loadCommunityCatalog();
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [currentUserId]);

    // ---------------------------------------
  // LOAD STUDENTS FROM DATABASE
  // ---------------------------------------

  useEffect(() => {
    if (!currentUserId) return;

    let active = true;

    const loadStudents = async () => {
      setStudentsLoading(true);
      setStudentsError("");

      try {
        const result = await getStudents(currentUserId);

        if (active) {
          setStudents(result);
        }
      } catch (error) {
        if (active) {
          setStudentsError(
            error instanceof Error
              ? error.message
              : "Could not load the student directory."
          );
        }
      } finally {
        if (active) {
          setStudentsLoading(false);
        }
      }
    };

    void loadStudents();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  // ---------------------------------------
// LOAD AND SYNCHRONIZE DIRECT CONVERSATIONS
// ---------------------------------------

useEffect(() => {
  if (!currentUserId) return;

  let active = true;
  let firstLoad = true;

  const loadDirectInbox = async () => {
    if (firstLoad) {
      setMessagesInboxLoading(true);
    }

    try {
      const conversations = await getDirectConversations();

      if (active) {
        setDirectConversations(conversations);

        // Nexconn is the source of truth for unread counts.
        const nextUnreadCounts: Record<string, number> = {};

        conversations.forEach((conversation) => {
          if (conversation.unreadCount > 0) {
            nextUnreadCounts[conversation.userId] =
              conversation.unreadCount;
          }
        });

        setUnreadCounts(nextUnreadCounts);
        setMessagesInboxError("");
      }
    } catch (error) {
      if (active) {
        setMessagesInboxError(
          error instanceof Error
            ? error.message
            : "Could not load your messages."
        );
      }
    } finally {
      if (firstLoad) {
        if (active) {
          setMessagesInboxLoading(false);
        }

        firstLoad = false;
      }
    }
  };

  void loadDirectInbox();

  const intervalId = window.setInterval(() => {
    void loadDirectInbox();
  }, 5000);

  return () => {
    active = false;
    window.clearInterval(intervalId);
  };
}, [currentUserId]);
  // ---------------------------------------
  // GLOBAL INCOMING MESSAGE HANDLER
  // ---------------------------------------

  useEffect(() => {
    if (!currentUserId) return;

    const handleIncomingMessage = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      const incoming = Array.isArray(detail) ? detail : [detail];

      incoming.forEach((raw) => {
        if (!raw || typeof raw !== "object") return;

        const message = raw as {
          messageId?: string;
          senderUserId?: string;
          sentTime?: number;
          messageType?: string;
          content?: {
            text?: unknown;
          };
        };

        const messageId = message.messageId;
        const senderUserId = message.senderUserId;
        const text = message.content?.text;

        if (
          !messageId ||
          !senderUserId ||
          senderUserId === currentUserId ||
          message.messageType !== "RC:TxtMsg" ||
          typeof text !== "string"
        ) {
          return;
        }

        if (seenMessages.current.has(messageId)) return;

                const knownStudent =
          students.some(
            (student) => student.chatUserId === senderUserId
          ) ||
          Object.values(members)
            .flat()
            .some(
              (member) => member.chatUserId === senderUserId
            );

        if (!knownStudent) return;

        seenMessages.current.add(messageId);

        // Save the message even when its conversation is closed.
        const existingMessages =
          messagesByUser.current[senderUserId] ?? [];

        if (
          !existingMessages.some(
            (item) => item.messageId === messageId
          )
        ) {
          const savedMessage: DirectTextMessage = {
            messageId,
            senderUserId,
            sentTime:
              typeof message.sentTime === "number"
                ? message.sentTime
                : Date.now(),
            text
          };

          messagesByUser.current = {
            ...messagesByUser.current,
            [senderUserId]: [
              ...existingMessages,
              savedMessage
            ].sort((a, b) => a.sentTime - b.sentTime)
          };
        }

        const currentlyOpenChat =
          messageOpen &&
          selectedMember?.chatUserId === senderUserId;

        if (currentlyOpenChat) return;

        setUnreadCounts((current) => ({
          ...current,
          [senderUserId]:
            (current[senderUserId] ?? 0) + 1
        }));
      });
    };

    window.addEventListener(
      "campuswide:nexconn-message",
      handleIncomingMessage
    );

    return () => {
      window.removeEventListener(
        "campuswide:nexconn-message",
        handleIncomingMessage
      );
    };
    }, [currentUserId, messageOpen, selectedMember, students]);

  // ---------------------------------------
  // NAVIGATION
  // ---------------------------------------

  const goHome = () => {
    setPath([]);
    setSelectedNode(null);
    setSelectedMember(null);
    setMessageOpen(false);
  };

  const enterCampus = () => {
    setPath([campusData]);
    setSelectedNode(null);
    setSelectedMember(null);
    setMessageOpen(false);
  };

    const navigateTo = (node: CampusNode) => {
    const isDynamicSection =
      node.id === "organisations" ||
      node.id === "explore-campus";

    if (
      isDynamicSection ||
      (node.children && node.children.length > 0)
    ) {
      setPath([...path, node]);
      setSelectedNode(null);
      setSelectedMember(null);
    } else {
      setSelectedNode(node);
      setSelectedMember(null);
    }

    setMessageOpen(false);
  };

    const goBack = () => {
    window.history.back();
  };

  const navigateToBreadcrumb = (index: number) => {
    setPath(path.slice(0, index + 1));
    setSelectedNode(null);
    setSelectedMember(null);
    setMessageOpen(false);
  };

  // ---------------------------------------
  // FRIEND SYSTEM
  // ---------------------------------------

  const refreshFriendData = async () => {
    const [friendList, requests] = await Promise.all([
      getFriends(currentUserId),
      getFriendRequests(currentUserId)
    ]);

    setFriends(friendList);
    setFriendRequests(requests);
  };

    const refreshCommunityCatalog = async () => {
    if (!currentUserId) return;

    try {
      const catalog = await getCommunityCatalog(currentUserId);

      setCommunityCatalog(catalog);
      setCommunityCatalogError("");
    } catch (error) {
      setCommunityCatalogError(
        error instanceof Error
          ? error.message
          : "Could not refresh campus communities."
      );
    }
  };

  const runFriendAction = async (
    action: () => Promise<unknown>
  ) => {
    if (!currentUserId || friendActionLoading) return;

    setFriendActionLoading(true);
    setFriendError("");

    try {
      await action();
      await refreshFriendData();
    } catch (error) {
      setFriendError(
        error instanceof Error
          ? error.message
          : "Friend action failed."
      );
    } finally {
      setFriendActionLoading(false);
    }
  };

  // ---------------------------------------
// CHAT
// ---------------------------------------

const markConversationRead = (targetUserId: string) => {
  setUnreadCounts((current) => ({
    ...current,
    [targetUserId]: 0
  }));

  setDirectConversations((current) =>
    current.map((conversation) =>
      conversation.userId === targetUserId
        ? { ...conversation, unreadCount: 0 }
        : conversation
    )
  );

  void clearDirectConversationUnread(targetUserId).catch(
    (error) => {
      console.error(
        "[CampusWide] Could not mark conversation as read:",
        error
      );
    }
  );
};

const openChat = () => {
  if (!selectedMember || !currentUserId || isOwnProfile) return;

  markConversationRead(selectedMember.chatUserId);
  setMessageOpen(true);
};

const openInboxConversation = (conversation: DirectConversation) => {
  const member = students.find(
    (student) => student.chatUserId === conversation.userId
  );

  if (!member) {
    setMessagesInboxError(
      "This conversation does not match a student in the campus directory."
    );
    return;
  }

  setShowMessagesInbox(false);
  setShowFriendRequests(false);

  // The chat window is rendered inside the campus section.
  if (path.length === 0) {
    setPath([campusData]);
  }

  setSelectedNode(null);
  setSelectedMember(member);
  setMessageOpen(true);

  markConversationRead(conversation.userId);
};

const handleMessageSent = (
  recipientUserId: string,
  message: DirectTextMessage
) => {
  setDirectConversations((current) => {
    const existing = current.find(
      (conversation) => conversation.userId === recipientUserId
    );

    const updatedConversation: DirectConversation = {
      userId: recipientUserId,
      latestMessage: message,
      unreadCount: existing?.unreadCount ?? 0,
      updatedAt: message.sentTime
    };

    return [
      updatedConversation,
      ...current.filter(
        (conversation) => conversation.userId !== recipientUserId
      )
    ];
  });
};
  // ---------------------------------------
  // DIRECTORY AND PROFILE STATUS
  // ---------------------------------------

    const academicStudentParts =
    selectedNode?.id.startsWith("students-")
      ? selectedNode.id.split("-")
      : [];

  const categoryMembers =
    academicStudentParts.length === 4
      ? students.filter(
          (student) =>
            student.year === academicStudentParts[1] &&
            student.branch === academicStudentParts[2] &&
            student.division === academicStudentParts[3]
        )
      : selectedNode
        ? members[selectedNode.id] ?? []
        : [];

  const selectedMembers = currentUserId
    ? [...categoryMembers].sort((a, b) => {
        const aIsMe = a.chatUserId === currentUserId ? 1 : 0;
        const bIsMe = b.chatUserId === currentUserId ? 1 : 0;

        return bIsMe - aIsMe;
      })
    : categoryMembers;
      const searchQuery = studentSearch.trim().toLowerCase();

  const hasAcademicFilters =
    Boolean(searchQuery) ||
    academicYearFilter !== "all" ||
    academicBranchFilter !== "all" ||
    academicDivisionFilter !== "all";

  const searchedStudents = students
    .filter((student) => {
      const matchesYear =
        academicYearFilter === "all" ||
        student.year === academicYearFilter;

      const matchesBranch =
        academicBranchFilter === "all" ||
        student.branch === academicBranchFilter;

      const matchesDivision =
        academicDivisionFilter === "all" ||
        student.division === academicDivisionFilter;

      const searchableDetails = [
        student.name,
        student.chatUserId,
        student.department,
        student.branch,
        student.year,
        student.division,
        student.role,
        student.clubs.join(" ")
      ];

      const matchesSearch =
        !searchQuery ||
        searchableDetails.some((detail) =>
          detail.toLowerCase().includes(searchQuery)
        );

      return (
        matchesYear &&
        matchesBranch &&
        matchesDivision &&
        matchesSearch
      );
    })
    .sort((a, b) => {
      const aIsMe = a.chatUserId === currentUserId ? 1 : 0;
      const bIsMe = b.chatUserId === currentUserId ? 1 : 0;

      return bIsMe - aIsMe;
    });

  const selectedIsFriend = selectedMember
    ? friends.some(
        (friend) => friend.userId === selectedMember.chatUserId
      )
    : false;

  const outgoingFriendRequest = selectedMember
    ? friendRequests.outgoing.find(
        (request) => request.to.userId === selectedMember.chatUserId
      )
    : undefined;

  const incomingFriendRequest = selectedMember
    ? friendRequests.incoming.find(
        (request) => request.from.userId === selectedMember.chatUserId
      )
    : undefined;

  // ---------------------------------------
  // APP INTERFACE
  // ---------------------------------------

  return (
    <main className="app">

      {/* TOP NAVIGATION */}

      <header className="topbar">
        <div className="brand" onClick={goHome}>
          <span className="brand-icon">C</span>
          <span>CampusWide</span>
        </div>

        <div className="topbar-right">
          {/* DIRECT MESSAGES INBOX */}

<div className="friend-notification-wrap">
  <button
    className="friend-notification-button"
    type="button"
    onClick={() => {
      setShowMessagesInbox((current) => !current);
      setShowFriendRequests(false);
    }}
    disabled={!currentUserId}
  >
    Messages

    {totalUnreadMessages > 0 && (
      <span className="friend-notification-count">
        {totalUnreadMessages > 99 ? "99+" : totalUnreadMessages}
      </span>
    )}
  </button>

  {showMessagesInbox && (
    <section className="friend-requests-panel friend-requests-popover">
      <div className="directory-heading">
        <div>
          <p className="eyebrow">YOUR INBOX</p>
          <h3>Messages</h3>
        </div>

        <button
          className="chat-close"
          type="button"
          onClick={() => setShowMessagesInbox(false)}
        >
          ✕
        </button>
      </div>

      {messagesInboxError && (
        <p className="chat-error">{messagesInboxError}</p>
      )}

      {messagesInboxLoading && inboxConversations.length === 0 ? (
        <p className="community-status">Loading conversations...</p>
      ) : inboxConversations.length > 0 ? (
        <div className="friend-request-list">
          {inboxConversations.map(
            ({ conversation, member, latestMessage }) => (
              <button
                className="friend-request-card messages-inbox-item"
                type="button"
                key={conversation.userId}
                onClick={() => openInboxConversation(conversation)}
              >
                <div className="messages-inbox-copy">
                  <strong>{member.name}</strong>
                  <span>
                    {latestMessage.senderUserId === currentUserId
                      ? "You: "
                      : ""}
                    {latestMessage.text}
                  </span>
                </div>

                {conversation.unreadCount > 0 && (
                  <span className="friend-notification-count">
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      ) : (
        !messagesInboxLoading && (
          <p className="friend-empty-state">
            No conversations yet. Start a conversation from a student profile.
          </p>
        )
      )}
    </section>
  )}
</div>
    
          {/* FRIEND REQUEST NOTIFICATION */}

          <div className="friend-notification-wrap">
            <button
              className="friend-notification-button"
              onClick={() => {
  setShowFriendRequests((current) => !current);
  setShowMessagesInbox(false);
}}
              disabled={!currentUserId}
            >
              Requests

              {friendRequests.incoming.length > 0 && (
                <span className="friend-notification-count">
                  {friendRequests.incoming.length > 9
                    ? "9+"
                    : friendRequests.incoming.length}
                </span>
              )}
            </button>

            {showFriendRequests && (
              <section className="friend-requests-panel friend-requests-popover">

                <div className="directory-heading">
                  <div>
                    <p className="eyebrow">SOCIAL</p>
                    <h3>Friend requests</h3>
                  </div>

                  <button
                    className="chat-close"
                    type="button"
                    onClick={() => setShowFriendRequests(false)}
                  >
                    ✕
                  </button>
                </div>

                {friendRequests.incoming.length > 0 ? (
                  <div className="friend-request-list">
                    {friendRequests.incoming.map((request) => (
                      <div
                        className="friend-request-card"
                        key={request.id}
                      >
                        <div>
                          <strong>{request.from.name}</strong>
                          <span> wants to be friends</span>
                        </div>

                        <div className="friend-request-actions">
                          <button
                            className="connect-button"
                            disabled={friendActionLoading}
                            onClick={() =>
                              void runFriendAction(() =>
                                acceptFriendRequest(
                                  currentUserId,
                                  request.id
                                )
                              )
                            }
                          >
                            Accept
                          </button>

                          <button
                            className="back-button"
                            disabled={friendActionLoading}
                            onClick={() =>
                              void runFriendAction(() =>
                                declineFriendRequest(
                                  currentUserId,
                                  request.id
                                )
                              )
                            }
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="friend-empty-state">
                    No pending friend requests.
                  </p>
                )}

                {friendError && (
                  <p className="chat-error">{friendError}</p>
                )}
              </section>
            )}
          </div>

          <span className="status-dot"></span>
          <span>Campus connected</span>
        </div>
      </header>

      {/* HOME OR CAMPUS EXPLORER */}

      {!inCampus ? (
        <section className="home-screen">
          <section className="welcome-section">
            <p className="eyebrow">YOUR DIGITAL CAMPUS</p>

            <h1>
              One campus.
              <br />
              <span>Every connection.</span>
            </h1>

            <p className="welcome-description">
              Explore your college, discover communities, connect
              with people, and bring campus life together.
            </p>

            <button
              className="explore-button"
              onClick={enterCampus}
            >
              Explore your campus
              <span>→</span>
            </button>
          </section>
        </section>
      ) : (
        <section className="campus-section explorer-screen">

          {/* SECTION HEADING */}

          <div className="section-heading">
            <div>
              <p className="eyebrow">CAMPUS EXPLORER</p>

              <h2>
                {selectedMember
                  ? selectedMember.name
                  : selectedNode
                    ? selectedNode.name
                    : currentNode?.name}
              </h2>
            </div>

            <span className="campus-label">
              {String(path.length).padStart(2, "0")} / CAMPUS
            </span>
          </div>

          {/* BREADCRUMBS */}

          <nav className="breadcrumbs">
            {path.map((node, index) => (
              <span key={node.id}>
                {index > 0 && (
                  <span className="breadcrumb-separator">/</span>
                )}

                <button
                  className={
                    index === path.length - 1
                      ? "breadcrumb-active"
                      : ""
                  }
                  onClick={() => navigateToBreadcrumb(index)}
                >
                  {node.name}
                </button>
              </span>
            ))}
          </nav>

          {/* EXPLORER CONTROLS */}

          <div className="explorer-controls">
            <button className="back-button" onClick={goBack}>
              ← Back
            </button>

            <button className="back-button" onClick={goHome}>
              ⌂ Home
            </button>
          </div>

          {/* MEMBER PROFILE OR CHAT */}

          {selectedMember ? (
            messageOpen ? (
              <ChatWindow
                member={selectedMember}
                currentUserId={currentUserId}
                cachedMessages={
                  messagesByUser.current[selectedMember.chatUserId] ??
                  EMPTY_MESSAGES
                }
                onClose={goBack}
onMessageSent={(message) =>
  handleMessageSent(selectedMember.chatUserId, message)
}
/>
            ) : (
              <section className="profile-view">

                <div className="profile-avatar">
                  {selectedMember.initials}
                </div>

                <h3>
                  {selectedMember.name}

                  {isOwnProfile && (
                    <span className="me-label"> (ME)</span>
                  )}
                </h3>

                <p className="profile-role">
                  {selectedMember.role}
                </p>

                <p className="profile-bio">
                  {selectedMember.bio}
                </p>

                {/* PROFILE ACTIONS */}

                {isOwnProfile ? (
                  <div className="profile-actions">
                    <span className="me-label">
                      THIS IS YOUR PROFILE
                    </span>
                  </div>
                ) : (
                  <div className="profile-actions">

                    {selectedIsFriend ? (
                      <>
                        <span className="friend-status">
                          Friends ✓
                        </span>

                        <button
                          className="back-button"
                          disabled={friendActionLoading}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Remove ${selectedMember.name} from your friends?`
                            );

                            if (confirmed) {
                              void runFriendAction(() =>
                                removeFriend(
                                  currentUserId,
                                  selectedMember.chatUserId
                                )
                              );
                            }
                          }}
                        >
                          Remove Friend
                        </button>
                      </>
                    ) : incomingFriendRequest ? (
                      <>
                        <button
                          className="connect-button"
                          disabled={friendActionLoading}
                          onClick={() =>
                            void runFriendAction(() =>
                              acceptFriendRequest(
                                currentUserId,
                                incomingFriendRequest.id
                              )
                            )
                          }
                        >
                          Accept Request
                        </button>

                        <button
                          className="back-button"
                          disabled={friendActionLoading}
                          onClick={() =>
                            void runFriendAction(() =>
                              declineFriendRequest(
                                currentUserId,
                                incomingFriendRequest.id
                              )
                            )
                          }
                        >
                          Decline
                        </button>
                      </>
                    ) : outgoingFriendRequest ? (
                      <>
                        <span className="friend-status">
                          Request Sent
                        </span>

                        <button
                          className="back-button"
                          disabled={friendActionLoading}
                          onClick={() =>
                            void runFriendAction(() =>
                              cancelFriendRequest(
                                currentUserId,
                                outgoingFriendRequest.id
                              )
                            )
                          }
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="connect-button"
                        disabled={
                          friendActionLoading || !currentUserId
                        }
                        onClick={() =>
                          void runFriendAction(() =>
                            sendFriendRequest(
                              currentUserId,
                              selectedMember.chatUserId
                            )
                          )
                        }
                      >
                        {friendActionLoading
                          ? "Please wait..."
                          : "Add Friend"}
                      </button>
                    )}

                    <button
  className="message-button"
  onClick={openChat}
  disabled={!currentUserId}
>
  {currentUserId
    ? "Message →"
    : "Connecting..."}

  {(unreadCounts[selectedMember.chatUserId] ?? 0) > 0 && (
    <span
      className="message-button-unread-dot"
      title="Unread messages"
    />
  )}
</button>

                  </div>
                )}

                {connectionError && (
                  <p className="chat-error">
                    {connectionError}
                  </p>
                )}

                {friendError && (
                  <p className="chat-error">
                    {friendError}
                  </p>
                )}

                {/* PROFILE DETAILS */}

                <div className="profile-details">
                  <div>
                    <span>Department</span>
                    <strong>{selectedMember.department}</strong>
                  </div>


                  <div>
                    <span>Year</span>
                    <strong>{selectedMember.year}</strong>
                  </div>

                  <div>
                    <span>Division</span>
                    <strong>{selectedMember.division}</strong>
                  </div>
                </div>
                                {/* STUDENT COMMUNITY MEMBERSHIPS */}

                <section className="profile-community-section">
                  <div className="community-section-heading">
                    <div>
                      <p className="eyebrow">CAMPUS MEMBERSHIPS</p>
                      <h3>Joined Communities</h3>
                    </div>

                    <span>
                      {selectedMember.clubs.length} active
                    </span>
                  </div>

                  {selectedMember.clubs.length > 0 ? (
                    <div className="profile-club-badges">
                      {selectedMember.clubs.map((clubId) => {
                        const clubName =
                          clubId === "green-club"
                            ? "Green Club"
                            : clubId.toUpperCase();

                        const clubRole =
                          clubId === "ncc" &&
                          selectedMember.role === "NCC Cadet"
                            ? "Cadet"
                            : "Member";

                        return (
                          <div
                            className={`profile-club-badge profile-club-${clubId}`}
                            key={clubId}
                          >
                            <strong>{clubName}</strong>
                            <span>{clubRole}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="community-status">
                      No active community memberships yet.
                    </p>
                  )}
                </section>
                
              </section>
            )
                    ) : selectedNode?.type === "organisation" ? (

            /* INDIVIDUAL COMMUNITY PAGE */

            <CommunityPage
              currentUserId={currentUserId}
              clubId={selectedNode.id}
              onBack={goBack}
              onMembershipChanged={() => {
                void refreshCommunityCatalog();
              }}
            />

          ) : selectedNode ? (

            /* STUDENT DIRECTORY */

            <section className="directory-view">

              <div className="directory-heading">
                <div>
                  <p className="eyebrow">COMMUNITY DIRECTORY</p>
                  <h3>{selectedNode.name}</h3>
                </div>

                <span>{selectedMembers.length} members</span>
              </div>

              {selectedMembers.length > 0 ? (
                <div className="member-list">
                  {selectedMembers.map((member) => (
                    <MemberCard
                      key={`${selectedNode.id}-${member.id}`}
                      member={member}
                      onClick={(member) => {
                        setSelectedMember(member);
                        setMessageOpen(false);
                      }}
                      isCurrentUser={
                        Boolean(currentUserId) &&
                        member.chatUserId === currentUserId
                      }
                      hasPendingFriendRequest={friendRequests.incoming.some(
  (request) => request.from.userId === member.chatUserId
)}
                      unreadCount={
                        unreadCounts[member.chatUserId] ?? 0
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="empty-message">
                  No members to display yet.
                </p>
              )}

            </section>
                    ) : currentNode?.id === "academics" ? (

            /* DYNAMIC ACADEMIC DIRECTORY */

            <section className="academic-browser">

              <div className="academic-search-wrap">
                <label htmlFor="student-search">
                  SEARCH ALL STUDENTS
                </label>

                <input
                  id="student-search"
                  className="academic-search-input"
                  type="search"
                  value={studentSearch}
                  onChange={(event) =>
                    setStudentSearch(event.target.value)
                  }
                  placeholder="Search by name, branch, year, division or club..."
                />
              </div>
                            <div className="academic-filter-row">
                <select
                  className="academic-filter-select"
                  aria-label="Filter by year"
                  value={academicYearFilter}
                  onChange={(event) =>
                    setAcademicYearFilter(event.target.value)
                  }
                >
                  <option value="all">All Years</option>
                  <option value="FY">First Year</option>
                  <option value="SY">Second Year</option>
                  <option value="TY">Third Year</option>
                  <option value="FtY">Fourth Year</option>
                </select>

                <select
                  className="academic-filter-select"
                  aria-label="Filter by branch"
                  value={academicBranchFilter}
                  onChange={(event) =>
                    setAcademicBranchFilter(event.target.value)
                  }
                >
                  <option value="all">All Branches</option>
                  <option value="Comp">COMP</option>
                  <option value="IT">IT</option>
                  <option value="AIML">AIML</option>
                  <option value="AIDS">AIDS</option>
                  <option value="Civil">Civil</option>
                  <option value="Mechanical">Mechanical</option>
                </select>

                <select
                  className="academic-filter-select"
                  aria-label="Filter by division"
                  value={academicDivisionFilter}
                  onChange={(event) =>
                    setAcademicDivisionFilter(event.target.value)
                  }
                >
                  <option value="all">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                  <option value="D">Division D</option>
                </select>

                <button
                  type="button"
                  className="academic-filter-reset"
                  onClick={() => {
                    setStudentSearch("");
                    setAcademicYearFilter("all");
                    setAcademicBranchFilter("all");
                    setAcademicDivisionFilter("all");
                  }}
                >
                  Reset
                </button>
              </div>

              {hasAcademicFilters ? (

                /* SEARCH RESULTS */

                <section className="directory-view">
                  <div className="directory-heading">
                    <div>
                      <p className="eyebrow">STUDENT SEARCH</p>
                      <h3>Search results</h3>
                    </div>

                    <span>
                      {searchedStudents.length} matches
                    </span>
                  </div>

                  {studentsLoading ? (
                    <p className="community-status">
                      Loading students...
                    </p>
                  ) : studentsError ? (
                    <p className="chat-error">
                      {studentsError}
                    </p>
                  ) : searchedStudents.length > 0 ? (
                    <div className="member-list">
                      {searchedStudents.map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          onClick={(member) => {
                            setSelectedMember(member);
                            setMessageOpen(false);
                          }}
                          isCurrentUser={
                            member.chatUserId === currentUserId
                          }
                          hasPendingFriendRequest={friendRequests.incoming.some(
  (request) => request.from.userId === member.chatUserId
)}
                          unreadCount={
                            unreadCounts[member.chatUserId] ?? 0
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="empty-message">
                      No students match "{studentSearch}".
                    </p>
                  )}
                </section>

              ) : studentsLoading ? (

                <p className="community-status">
                  Loading the student directory...
                </p>

              ) : studentsError ? (

                <p className="chat-error">
                  {studentsError}
                </p>

              ) : (

                /* ACADEMIC YEAR BUBBLES */

                <div className="bubble-grid">
                  {visibleNodes.map((node) => (
                    <Bubble
  key={node.id}
  node={node}
  onClick={navigateTo}
  notificationCount={getNodeUnreadCount(node)}
  requestCount={getNodeFriendRequestCount(node)}
/>
                  ))}
                </div>
              )}

            </section>

          ) : (

            /* CAMPUS AND COMMUNITY BUBBLES */

            <div className="bubble-grid">

              {isCommunityHub && communityCatalogLoading ? (
                <p className="community-status">
                  Loading campus communities...
                </p>
              ) : communityCatalogError && isCommunityHub ? (
                <p className="chat-error">
                  {communityCatalogError}
                </p>
              ) : visibleNodes.length > 0 ? (
                visibleNodes.map((node) => (
                  <Bubble
  key={node.id}
  node={node}
  onClick={navigateTo}
  notificationCount={getNodeUnreadCount(node)}
  requestCount={getNodeFriendRequestCount(node)}
/>
                ))
              ) : (
                <p className="empty-message">
                  {currentNode?.id === "organisations"
                    ? "You haven't joined any communities yet."
                    : currentNode?.id === "explore-campus"
                      ? "You're already part of every listed community."
                      : "Nothing here yet."}
                </p>
              )}

            </div>
          )}

            {!selectedNode &&
            !selectedMember &&
            visibleNodes.length === 0 &&
            !isCommunityHub &&
            !communityCatalogLoading && (
              <p className="empty-message">
                Nothing here yet.
              </p>
            )}

        </section>
      )}

      {/* FOOTER */}

      <footer className="footer">
        <span>CampusWide © 2026</span>
        <span>Built for connected campuses.</span>
      </footer>

    </main>
  );
}

function App() {
  const currentPath =
    window.location.pathname.replace(/\/+$/, "") || "/";

  if (currentPath === "/" || currentPath === "/judges") {
    return <JudgesHome />;
  }

  if (currentPath === "/app") {
    return <CampusWideApp />;
  }

  return <JudgesHome />;
}

export default App;
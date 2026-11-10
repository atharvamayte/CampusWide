import { useEffect, useState, type FormEvent } from "react";

import {
  getCommunityDetails,
  getMyCommunityData,
  getAdminClubApplications,
  submitClubApplication,
  cancelClubApplication,
  approveClubApplication,
  declineClubApplication,
  type CommunityPageData,
  type MyCommunityData,
  type AdminCommunityApplication,
} from "../services/clubRequests";

type CommunityPageProps = {
  currentUserId: string;
  clubId: string;
  onBack: () => void;
  onMembershipChanged?: () => void;
};

// User 4 is the global administrator in this demo.
const ADMIN_USER_ID = "cwDemoUser8A2";

function CommunityPage({
  currentUserId,
  clubId,
  onBack,
  onMembershipChanged,
}: CommunityPageProps) {
  const [pageData, setPageData] =
    useState<CommunityPageData | null>(null);

  const [communityData, setCommunityData] =
    useState<MyCommunityData | null>(null);

  const [adminApplications, setAdminApplications] =
    useState<AdminCommunityApplication[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [motivation, setMotivation] = useState("");
  const [busyApplicationId, setBusyApplicationId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = currentUserId === ADMIN_USER_ID;

  // ---------------------------------------
  // LOAD PAGE DATA
  // ---------------------------------------

  const fetchData = async () => {
    const [page, myData] = await Promise.all([
      getCommunityDetails(currentUserId, clubId),
      getMyCommunityData(currentUserId),
    ]);

    let applications: AdminCommunityApplication[] = [];

    if (isAdmin) {
      applications = await getAdminClubApplications(currentUserId);
    }

    return {
      page,
      myData,
      applications,
    };
  };

  const refreshData = async () => {
    const result = await fetchData();

    setPageData(result.page);
    setCommunityData(result.myData);
    setAdminApplications(result.applications);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      setPageData(null);
      setCommunityData(null);

      try {
        const result = await fetchData();

        if (active) {
          setPageData(result.page);
          setCommunityData(result.myData);
          setAdminApplications(result.applications);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load this community."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (currentUserId && clubId) {
      void load();
    } else {
      setLoading(false);
      setError("User or community information is missing.");
    }

    return () => {
      active = false;
    };
  }, [currentUserId, clubId, isAdmin]);

  // ---------------------------------------
  // APPLICATION STATUS
  // ---------------------------------------

  const clubApplications =
    communityData?.applications.filter(
      (application) => application.clubId === clubId
    ) ?? [];

  const latestApplication = [...clubApplications].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() -
      new Date(a.submittedAt).getTime()
  )[0];

  const pendingApplication =
    latestApplication?.status === "pending"
      ? latestApplication
      : undefined;

  // ---------------------------------------
  // SUBMIT JOINING APPLICATION
  // ---------------------------------------

  const handleApplicationSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !currentUserId ||
      !pageData ||
      submitting ||
      pageData.isMember
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await submitClubApplication(
        currentUserId,
        clubId,
        motivation.trim()
      );

      setMotivation("");
      setSuccess("Your joining application has been submitted.");

      await refreshData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit your application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------
  // CANCEL JOINING APPLICATION
  // ---------------------------------------

  const handleCancelApplication = async () => {
    if (!pendingApplication || submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await cancelClubApplication(
        currentUserId,
        pendingApplication.id
      );

      setSuccess("Your application has been cancelled.");
      await refreshData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not cancel the application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------
  // ADMIN DECISIONS
  // ---------------------------------------

  const handleAdminDecision = async (
    applicationId: string,
    decision: "approve" | "decline"
  ) => {
    if (!currentUserId || busyApplicationId) return;

    setBusyApplicationId(applicationId);
    setError("");
    setSuccess("");

    try {
      if (decision === "approve") {
        await approveClubApplication(
          currentUserId,
          applicationId
        );

        setSuccess("Membership approved successfully.");
      } else {
        await declineClubApplication(
          currentUserId,
          applicationId
        );

        setSuccess("Application declined.");
      }

      await refreshData();

      if (decision === "approve") {
        onMembershipChanged?.();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not process the application."
      );
    } finally {
      setBusyApplicationId(null);
    }
  };

  // ---------------------------------------
  // LOADING AND ERROR
  // ---------------------------------------

  if (loading) {
    return (
      <section className="community-panel community-page">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <p className="community-status">
          Loading community...
        </p>
      </section>
    );
  }

  if (!pageData || !communityData) {
    return (
      <section className="community-panel community-page">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <p className="chat-error">
          {error || "Community information is unavailable."}
        </p>
      </section>
    );
  }

  const { community } = pageData;

  const clubAdminApplications = adminApplications.filter(
    (application) =>
      application.clubId === clubId &&
      application.status === "pending"
  );
    // NCC-specific directory grouping.
  // FY students are cadets; everyone beyond FY is a senior.
  const memberGroups =
    clubId === "ncc"
      ? [
          {
            title: "FY Cadets",
            members: pageData.members.filter(
              (member) => member.year === "FY"
            )
          },
          {
            title: "Seniors",
            members: pageData.members.filter(
              (member) => member.year !== "FY"
            )
          }
        ]
      : [
          {
            title: "Members",
            members: pageData.members
          }
        ];
  // ---------------------------------------
  // RENDER
  // ---------------------------------------

  return (
    <section className="community-panel community-page">

      {/* HEADER */}

      <div className="community-section-heading">
        <div>
          <p className="eyebrow">
            {community.category.toUpperCase()}
          </p>

          <h3>{community.name}</h3>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      {/* DESCRIPTION */}

      <p className="community-description">
        {community.description}
      </p>

      {/* MEMBERSHIP STATUS */}

      <div className="community-student-details">
        <div>
          <span>Membership</span>

          <strong>
            {pageData.isMember
              ? "Active member"
              : pageData.canViewPrivateContent
                ? "Administrator access"
                : pendingApplication
                  ? "Application pending"
                  : "Not a member"}
          </strong>
        </div>

        {community.memberCount !== null && (
          <div>
            <span>Members</span>
            <strong>{community.memberCount}</strong>
          </div>
        )}
      </div>

      {/* MEMBER ACCESS */}

      {pageData.canViewPrivateContent ? (
        <>
          {/* MEMBER DIRECTORY */}

          <div className="community-section-heading explore-community-heading">
            <div>
              <p className="eyebrow">
                COMMUNITY MEMBERS
              </p>

              <h3>Member Directory</h3>
            </div>

            <span>
              {pageData.members.length} members
            </span>
          </div>

                    {memberGroups.map((group) => (
            <section key={group.title}>
              <div className="community-section-heading explore-community-heading">
                <div>
                  <p className="eyebrow">
                    {clubId === "ncc" ? "NCC CADET DIRECTORY" : "COMMUNITY DIRECTORY"}
                  </p>

                  <h3>{group.title}</h3>
                </div>

                <span>{group.members.length} members</span>
              </div>

              {group.members.length > 0 ? (
                <div className="community-admin-section">
                  {group.members.map((member) => (
                    <div
                      className="community-application-row"
                      key={member.userId}
                    >
                      <div>
                        <strong>{member.name}</strong>

                        <span>
                          {member.branch} · {member.year} · Division {member.division}
                        </span>

                        <span>{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="community-status">
                  No members in this group yet.
                </p>
              )}
            </section>
          ))}

          {/* ANNOUNCEMENTS */}

          <div className="community-section-heading explore-community-heading">
            <div>
              <p className="eyebrow">
                COMMUNITY UPDATES
              </p>

              <h3>Announcements</h3>
            </div>

            <span>
              {pageData.announcements.length} posts
            </span>
          </div>

          {pageData.announcements.length > 0 ? (
            <div className="community-admin-section">
              {pageData.announcements.map((announcement) => (
                <article
                  className="community-admin-card"
                  key={announcement.id}
                >
                  <strong>{announcement.title}</strong>

                  <p>{announcement.body}</p>

                  <span>
                    By {announcement.authorName} ·{" "}
                    {new Date(
                      announcement.createdAt
                    ).toLocaleDateString()}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="community-status">
              No announcements have been published yet.
            </p>
          )}
        </>
      ) : (

        /* NON-MEMBER VIEW */

        <div className="community-form-wrapper">
          <p className="eyebrow">
            BECOME PART OF THE COMMUNITY
          </p>

          {pendingApplication ? (
            <>
              <h4>Application under review</h4>

              <p className="community-status">
                Your application has been submitted. You will
                receive access after an administrator approves it.
              </p>

              <button
                type="button"
                className="back-button"
                onClick={() => void handleCancelApplication()}
                disabled={submitting}
              >
                {submitting ? "Please wait..." : "Cancel application"}
              </button>
            </>
          ) : (
            <>
              <h4>
                {latestApplication?.status === "declined"
                  ? "Apply again"
                  : "Join this community"}
              </h4>

              <p className="community-status">
                Tell the community administrators why you'd like
                to join. Your academic details are filled in
                automatically.
              </p>

              {/* AUTOFILLED STUDENT DETAILS */}

              <div className="community-student-details">
                <div>
                  <span>Student</span>
                  <strong>{communityData.profile.name}</strong>
                </div>

                <div>
                  <span>Branch</span>
                  <strong>{communityData.profile.branch}</strong>
                </div>

                <div>
                  <span>Year</span>
                  <strong>{communityData.profile.year}</strong>
                </div>

                <div>
                  <span>Division</span>
                  <strong>{communityData.profile.division}</strong>
                </div>
              </div>

              {/* APPLICATION FORM */}

              <form
                className="community-application-form"
                onSubmit={handleApplicationSubmit}
              >
                <label htmlFor="community-motivation">
                  Why would you like to join {community.name}?
                </label>

                <textarea
                  id="community-motivation"
                  value={motivation}
                  onChange={(event) =>
                    setMotivation(event.target.value)
                  }
                  placeholder="Tell us about your interests, motivation and what you can contribute..."
                  minLength={20}
                  maxLength={1000}
                  rows={5}
                  required
                />

                <span className="community-character-count">
                  {motivation.length}/1000 characters
                </span>

                <button
                  type="submit"
                  className="connect-button"
                  disabled={
                    submitting ||
                    motivation.trim().length < 20
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : "Apply to join →"}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ADMIN APPLICATIONS */}

      {isAdmin && (
        <div className="community-admin-section">
          <div className="community-section-heading explore-community-heading">
            <div>
              <p className="eyebrow">
                ADMINISTRATION
              </p>

              <h3>Pending Applications</h3>
            </div>

            <span>
              {clubAdminApplications.length} pending
            </span>
          </div>

          {clubAdminApplications.length === 0 ? (
            <p className="community-status">
              No pending applications for this community.
            </p>
          ) : (
            clubAdminApplications.map((application) => (
              <div
                className="community-admin-card"
                key={application.id}
              >
                <div>
                  <strong>
                    {application.student?.name ?? "Unknown student"}
                  </strong>

                  {application.student && (
                    <span>
                      {application.student.year} ·{" "}
                      {application.student.branch} · Division{" "}
                      {application.student.division}
                    </span>
                  )}
                </div>

                <p>{application.motivation}</p>

                <div className="community-admin-actions">
                  <button
                    type="button"
                    className="connect-button"
                    disabled={busyApplicationId === application.id}
                    onClick={() =>
                      void handleAdminDecision(
                        application.id,
                        "approve"
                      )
                    }
                  >
                    {busyApplicationId === application.id
                      ? "Processing..."
                      : "Approve"}
                  </button>

                  <button
                    type="button"
                    className="back-button"
                    disabled={busyApplicationId === application.id}
                    onClick={() =>
                      void handleAdminDecision(
                        application.id,
                        "decline"
                      )
                    }
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* FEEDBACK */}

      {error && (
        <p className="chat-error">{error}</p>
      )}

      {success && (
        <p className="community-success">{success}</p>
      )}

    </section>
  );
}

export default CommunityPage;
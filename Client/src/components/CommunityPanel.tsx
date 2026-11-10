import { useEffect, useState, type FormEvent } from "react";
import type { Member } from "../data/members";
import { clubs } from "../data/clubs";

import {
  getMyCommunityData,
  submitClubApplication,
  cancelClubApplication,
  getAdminClubApplications,
  approveClubApplication,
  declineClubApplication,
  type MyCommunityData,
  type AdminCommunityApplication
} from "../services/clubRequests";

type CommunityPanelProps = {
  member: Member;
  currentUserId: string;
  isOwnProfile: boolean;
};

// User 4 is the administrator in our demo.
const ADMIN_USER_ID = "cwDemoUser8A2";

function CommunityPanel({
  member,
  currentUserId,
  isOwnProfile
}: CommunityPanelProps) {
  const [communityData, setCommunityData] =
    useState<MyCommunityData | null>(null);

  const [adminApplications, setAdminApplications] =
    useState<AdminCommunityApplication[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedClubId, setSelectedClubId] =
    useState<string | null>(null);

  const [motivation, setMotivation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [busyApplicationId, setBusyApplicationId] =
    useState<string | null>(null);

  const isAdmin = currentUserId === ADMIN_USER_ID;

  // ---------------------------------------
  // LOAD COMMUNITY DATA
  // ---------------------------------------

  const refreshData = async () => {
    const data = await getMyCommunityData(currentUserId);

    setCommunityData(data);

    if (isAdmin) {
      const applications =
        await getAdminClubApplications(currentUserId);

      setAdminApplications(applications);
    }
  };

  useEffect(() => {
    if (!isOwnProfile || !currentUserId) {
      setCommunityData(null);
      setAdminApplications([]);
      return;
    }

    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getMyCommunityData(currentUserId);

        let applications: AdminCommunityApplication[] = [];

        if (isAdmin) {
          applications =
            await getAdminClubApplications(currentUserId);
        }

        if (active) {
          setCommunityData(data);
          setAdminApplications(applications);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load community information."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [currentUserId, isOwnProfile, isAdmin]);

  // ---------------------------------------
  // MEMBERSHIP DATA
  // ---------------------------------------

  const activeClubIds = isOwnProfile
    ? communityData?.memberships.map(
        (membership) => membership.clubId
      ) ?? []
    : member.clubs;

  const availableClubs = clubs.filter(
    (club) => !activeClubIds.includes(club.id)
  );

  const getApplication = (clubId: string) => {
    if (!communityData) return undefined;

    const clubApplications =
      communityData.applications.filter(
        (application) => application.clubId === clubId
      );

    return clubApplications[clubApplications.length - 1];
  };

  const selectedClub = clubs.find(
    (club) => club.id === selectedClubId
  );

  // ---------------------------------------
  // SUBMIT APPLICATION
  // ---------------------------------------

  const handleApplicationSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedClubId || !currentUserId || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await submitClubApplication(
        currentUserId,
        selectedClubId,
        motivation
      );

      setSuccess("Your joining request has been submitted.");
      setMotivation("");
      setSelectedClubId(null);

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
  // CANCEL APPLICATION
  // ---------------------------------------

  const handleCancelApplication = async (
    applicationId: string
  ) => {
    if (!currentUserId) return;

    setError("");
    setSuccess("");

    try {
      await cancelClubApplication(
        currentUserId,
        applicationId
      );

      setSuccess("Application cancelled.");
      await refreshData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not cancel application."
      );
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

        setSuccess("Community membership approved.");
      } else {
        await declineClubApplication(
          currentUserId,
          applicationId
        );

        setSuccess("Application declined.");
      }

      await refreshData();
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
  // RENDER
  // ---------------------------------------

  return (
    <section className="community-panel">

      {/* MY COMMUNITIES */}

      <div className="community-section-heading">
        <div>
          <p className="eyebrow">
            CAMPUS MEMBERSHIPS
          </p>

          <h3>
            {isOwnProfile
              ? "My Communities"
              : "Communities"}
          </h3>
        </div>

        <span>
          {activeClubIds.length} active
        </span>
      </div>

      {isOwnProfile && loading ? (
        <p className="community-status">
          Loading communities...
        </p>
      ) : activeClubIds.length > 0 ? (
        <div className="community-bubble-grid">
          {activeClubIds.map((clubId) => {
            const club = clubs.find(
              (item) => item.id === clubId
            );

            if (!club) return null;

            return (
              <div
                className="community-bubble active"
                key={club.id}
              >
                <strong>{club.name}</strong>
                <span>{club.category}</span>
                <small>ACTIVE MEMBER</small>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="community-status">
          No active community memberships yet.
        </p>
      )}

      {/* EXPLORE COMMUNITIES — OWN PROFILE ONLY */}

      {isOwnProfile && (
        <>
          <div className="community-section-heading explore-community-heading">
            <div>
              <p className="eyebrow">
                DISCOVER YOUR CAMPUS
              </p>

              <h3>Explore More Communities</h3>
            </div>

            <span>{availableClubs.length} available</span>
          </div>

          {loading ? (
            <p className="community-status">
              Loading available communities...
            </p>
          ) : (
            <div className="community-bubble-grid">
              {availableClubs.map((club) => {
                const application = getApplication(club.id);
                const isPending =
                  application?.status === "pending";

                return (
                  <button
                    type="button"
                    className="community-bubble explore"
                    key={club.id}
                    onClick={() => {
                      if (!isPending) {
                        setSelectedClubId(club.id);
                        setMotivation("");
                        setError("");
                        setSuccess("");
                      }
                    }}
                  >
                    <strong>{club.name}</strong>
                    <span>{club.category}</span>

                    {isPending ? (
                      <small>REQUEST PENDING</small>
                    ) : (
                      <small>
                        {application?.status === "declined"
                          ? "APPLY AGAIN"
                          : application?.status === "cancelled"
                            ? "REAPPLY"
                            : "EXPLORE →"}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* APPLICATION STATUS */}

          {communityData?.applications.length ? (
            <div className="community-applications">
              <h4>My Applications</h4>

              {communityData.applications.map((application) => {
                const club = clubs.find(
                  (item) => item.id === application.clubId
                );

                return (
                  <div
                    className="community-application-row"
                    key={application.id}
                  >
                    <div>
                      <strong>
                        {club?.name ?? application.clubId}
                      </strong>

                      <span>
                        {application.status.toUpperCase()}
                      </span>
                    </div>

                    {application.status === "pending" && (
                      <button
                        type="button"
                        className="back-button"
                        onClick={() =>
                          void handleCancelApplication(
                            application.id
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* JOINING APPLICATION FORM */}

          {selectedClub && (
            <div className="community-form-wrapper">
              <div className="community-section-heading">
                <div>
                  <p className="eyebrow">
                    MEMBERSHIP APPLICATION
                  </p>

                  <h3>Join {selectedClub.name}</h3>
                </div>

                <button
                  className="chat-close"
                  type="button"
                  onClick={() => setSelectedClubId(null)}
                >
                  ✕
                </button>
              </div>

              <p className="community-description">
                {selectedClub.description}
              </p>

              {communityData && (
                <div className="community-student-details">
                  <div>
                    <span>Student</span>
                    <strong>{communityData.profile.name}</strong>
                  </div>

                  <div>
                    <span>Year</span>
                    <strong>{communityData.profile.year}</strong>
                  </div>

                  <div>
                    <span>Branch</span>
                    <strong>{communityData.profile.branch}</strong>
                  </div>

                  <div>
                    <span>Division</span>
                    <strong>{communityData.profile.division}</strong>
                  </div>
                </div>
              )}

              <form
                className="community-application-form"
                onSubmit={handleApplicationSubmit}
              >
                <label htmlFor="club-motivation">
                  Why do you want to join {selectedClub.name}?
                </label>

                <textarea
                  id="club-motivation"
                  value={motivation}
                  onChange={(event) =>
                    setMotivation(event.target.value)
                  }
                  placeholder="Tell us about your interests, motivation and what you hope to contribute..."
                  minLength={20}
                  maxLength={1000}
                  rows={5}
                  required
                />

                <span className="community-character-count">
                  {motivation.length}/1000 characters
                </span>

                <button
                  className="connect-button"
                  type="submit"
                  disabled={
                    submitting ||
                    motivation.trim().length < 20
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Joining Request →"}
                </button>
              </form>
            </div>
          )}

          {/* ADMIN APPLICATION DASHBOARD */}

          {isAdmin && (
            <div className="community-admin-section">
              <div className="community-section-heading">
                <div>
                  <p className="eyebrow">
                    ADMINISTRATION
                  </p>

                  <h3>Community Applications</h3>
                </div>

                <span>
                  {adminApplications.length} pending
                </span>
              </div>

              {adminApplications.length === 0 ? (
                <p className="community-status">
                  No pending applications.
                </p>
              ) : (
                adminApplications.map((application) => {
                  const club = clubs.find(
                    (item) => item.id === application.clubId
                  );

                  return (
                    <div
                      className="community-admin-card"
                      key={application.id}
                    >
                      <div>
                        <strong>
                          {application.student?.name ??
                            "Unknown student"}
                        </strong>

                        <span>
                          Application for {club?.name ?? application.clubId}
                        </span>

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
                          className="connect-button"
                          disabled={
                            busyApplicationId === application.id
                          }
                          onClick={() =>
                            void handleAdminDecision(
                              application.id,
                              "approve"
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="back-button"
                          disabled={
                            busyApplicationId === application.id
                          }
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
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* FEEDBACK */}

      {error && (
        <p className="chat-error">{error}</p>
      )}

      {success && (
        <p className="community-success">
          {success}
        </p>
      )}

    </section>
  );
}

export default CommunityPanel;
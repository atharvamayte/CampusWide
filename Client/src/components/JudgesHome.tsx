
import { useEffect, useState } from "react";
import type { Member } from "../data/members";
import { getStudents } from "../services/students";

const clubNames: Record<string, string> = {
  ncc: "NCC",
  nss: "NSS",
  iste: "ISTE",
  tsdw: "TSDW",
  rotaract: "Rotaract",
  "green-club": "Green Club"
};

// Existing seeded account used only to load the public demo directory.
const DIRECTORY_READER_USER_ID = "cwAarav8F2K";

function JudgesHome() {
  const [students, setStudents] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    let active = true;

    const loadStudents = async () => {
      try {
        const result = await getStudents(DIRECTORY_READER_USER_ID);

        if (active) {
          setStudents(result);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load demo student details."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStudents();

    return () => {
      active = false;
    };
  }, []);

  const openDemo = () => {
    const cleanUsername = username.trim();

    if (!/^[a-zA-Z0-9_-]{2,24}$/.test(cleanUsername)) {
      setError(
        "Use 2–24 characters: letters, numbers, underscores or hyphens."
      );
      return;
    }

    const demoUrl = new URL("/app", window.location.origin);
    demoUrl.searchParams.set("judge", cleanUsername);

    window.open(
      demoUrl.toString(),
      "_blank",
      "noopener,noreferrer"
    );

    setError("");
  };

  return (
    <main className="judges-home">
      <div className="judges-background-glow" />

      <header className="judges-header">
        <div className="judges-brand">
          <span className="judges-brand-icon">C</span>
          <span>CampusWide</span>
        </div>

        <span className="judges-demo-label">
          HACKATHON DEMO
        </span>
      </header>

      <section className="judges-content">
        <div className="judges-intro">
          <p className="eyebrow">WELCOME TO CAMPUSWIDE</p>

          <h1>
            One campus.
            <br />
            <span>Twenty perspectives.</span>
          </h1>

          <p>
            Explore CampusWide through a dedicated demo session.
            Choose a username to start your own isolated experience.
            Your chats, friendships and interactions will belong
            to that session, separate from the preconfigured
            student accounts.
          </p>
        </div>

        <div className="judges-section-heading">
          <div>
            <p className="eyebrow">JUDGE ACCESS PORTAL</p>
            <h2>Start your demo session</h2>
          </div>

          <span>NO PASSWORD REQUIRED</span>
        </div>

        <div className="judges-session-panel">
          <label htmlFor="judge-username">
            Choose a username
          </label>

          <input
            id="judge-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") openDemo();
            }}
            placeholder="e.g. JudgeAlpha"
            maxLength={24}
            autoComplete="off"
          />

          <p>
            Use the same username to resume your demo session
            in this browser. Anyone who knows the username may
            be able to access that session, so don't use a
            personal password or private information.
          </p>

          {error && (
            <div className="judges-state judges-error">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={openDemo}
            disabled={!username.trim()}
          >
            Start Demo Session
            <span>↗</span>
          </button>
        </div>

        <div className="judges-section-heading">
          <div>
            <p className="eyebrow">STUDENT DIRECTORY</p>
            <h2>Explore the campus community</h2>
          </div>

          <span>20 STUDENTS</span>
        </div>

        {loading ? (
          <div className="judges-state">
            Loading student profiles...
          </div>
        ) : error && students.length === 0 ? (
          <div className="judges-state judges-error">
            <strong>Couldn't load student information.</strong>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="judges-account-grid">
            {students.map((student, index) => {
              const clubs = student.clubs ?? [];
              const accent = ["blue", "green", "orange", "purple"][
                index % 4
              ];

              return (
                <div
                  key={student.id}
                  className={`judges-account-card judges-${accent}`}
                >
                  <div className="judges-card-top">
                    <div className="judges-avatar">
                      {index + 1}
                    </div>

                    <span className="judges-account-number">
                      STUDENT {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="judges-account-details">
                    <h3>{student.name}</h3>

                    <div className="judges-academic-details">
                      <div>
                        <span>YEAR</span>
                        <strong>{student.year}</strong>
                      </div>

                      <div>
                        <span>BRANCH</span>
                        <strong>{student.branch}</strong>
                      </div>

                      <div>
                        <span>DIVISION</span>
                        <strong>{student.division}</strong>
                      </div>
                    </div>

                    <div className="judges-clubs-section">
                      <span className="judges-detail-label">
                        CLUB MEMBERSHIPS
                      </span>

                      <div className="judges-club-list">
                        {clubs.length > 0 ? (
                          clubs.map((clubId) => (
                            <span
                              className="judges-club-tag"
                              key={clubId}
                            >
                              {clubNames[clubId] ?? clubId}
                            </span>
                          ))
                        ) : (
                          <span className="judges-no-clubs">
                            No active memberships
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="judges-footer">
        <span>CampusWide © 2026</span>
        <span>Built for connected campuses.</span>
      </footer>
    </main>
  );
}

export default JudgesHome;


import { useEffect, useState } from "react";
import type { Member } from "../data/members";
import { getStudents } from "../services/students";

type DemoAccount = {
  number: number;
  studentId: string;
  loginKey: string;
  accent: string;
};

const demoAccounts: DemoAccount[] = Array.from(
  { length: 20 },
  (_, index) => {
    const number = index + 1;
    const studentId = `student-${String(number).padStart(3, "0")}`;

    return {
      number,
      studentId,
      loginKey: number === 4 ? "demo-user" : studentId,
      accent: ["blue", "green", "orange", "purple"][index % 4]
    };
  }
);

const clubNames: Record<string, string> = {
  ncc: "NCC",
  nss: "NSS",
  iste: "ISTE",
  tsdw: "TSDW",
  rotaract: "Rotaract",
  "green-club": "Green Club"
};

// The existing App.tsx uses the Nexconn chat ID
// returned by connectNexconn() when calling getStudents().
const DIRECTORY_READER_USER_ID = "cwAarav8F2K";

function JudgesHome() {
  const [students, setStudents] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const openDemo = (loginKey: string) => {
    const demoUrl = new URL("/", window.location.origin);
    demoUrl.searchParams.set("user", loginKey);

    window.open(
      demoUrl.toString(),
      "_blank",
      "noopener,noreferrer"
    );
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
  This dedicated demo page has been created for hackathon
  judges to explore CampusWide through 20 preconfigured
  student accounts. Choose different profiles, experience
  the application from their perspectives, and try out
  the available features. Each account opens in a separate
  browser tab, allowing you to explore multiple users
  simultaneously.
</p>
        </div>

        <div className="judges-section-heading">
          <div>
            <p className="eyebrow">JUDGE ACCESS PORTAL</p>
            <h2>Choose your demo profile</h2>
          </div>

          <span>20 ACCOUNTS</span>
        </div>

        {loading ? (
          <div className="judges-state">
            Loading student profiles...
          </div>
        ) : error ? (
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
            {demoAccounts.map((account) => {
              const student = students.find(
                (item) => item.id === account.studentId
              );

              const clubs = student?.clubs ?? [];

              return (
                <button
                  key={account.studentId}
                  type="button"
                  className={`judges-account-card judges-${account.accent}`}
                  onClick={() => openDemo(account.loginKey)}
                >
                  <div className="judges-card-top">
                    <div className="judges-avatar">
                      {account.number}
                    </div>

                    <span className="judges-account-number">
                      DEMO ACCOUNT{" "}
                      {String(account.number).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="judges-account-details">
                    <h3>User {account.number}</h3>

                    {student ? (
                      <>
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
                      </>
                    ) : (
                      <p className="judges-missing-profile">
                        Student information unavailable
                      </p>
                    )}
                  </div>

                  <div className="judges-launch">
                    Launch experience
                    <span>↗</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="judges-instructions">
          <span>↗</span>
          <p>
            Each profile opens in a separate browser tab.
            You can explore multiple student perspectives
            simultaneously.
          </p>
        </div>
      </section>

      <footer className="judges-footer">
        <span>CampusWide © 2026</span>
        <span>Built for connected campuses.</span>
      </footer>
    </main>
  );
}

export default JudgesHome;

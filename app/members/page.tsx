import Image from "next/image";
import Link from "next/link";
import { members } from "./data";

export default function MembersPage() {
  const faculty = members.filter((m) => m.role !== "Student Researcher");
  const students = members.filter((m) => m.role === "Student Researcher");

  return (
    <div style={{ maxWidth: 1600, margin: "1rem auto", padding: "0 12px" }}>
      <div className="hero">
        <div className="kicker" style={{ padding: "0px 10px", marginBottom: 12 }}>People • Mentorship • Collaboration</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          Members
        </h1>
        <p className="p" style={{ maxWidth: 920}}>
          IRG includes AUW faculty and students. Faculty profiles include research interests and links. Student cards show
          program level and major.
        </p>
      </div>

      {/* ---------- Faculty ---------- */}
      <section
        style={{
          padding: "20px 20px", // ✅ left-right space
      
        }}
      >
        <div style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Faculty
          </h2>

          <div
            style={{
              width: 60,
              height: 4,
              background: "linear-gradient(to right, #1e3a8a, #2563eb)",
              marginTop: 10,
              borderRadius: 6,
            }}
          />
        </div>

        <div className="grid grid-3">
          {faculty.map((m) => (
            <Link
              key={m.slug}
              href={`/members/${m.slug}`}
              className="card"
              style={{ textDecoration: "none" }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    unoptimized
                    src={m.photo || "/members/placeholder.png"}
                    alt={m.name}
                    width={60}
                    height={60}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, letterSpacing: "-0.01em" }}>
                    {m.name}
                  </div>
                  <div className="small">{m.role || ""}</div>
                  <div className="small">{m.affiliation || ""}</div>
                </div>
              </div>

              {m.interests?.length ? (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {m.interests.slice(0, 4).map((x) => (
                    <span key={x} className="badge">
                      {x}
                    </span>
                  ))}
                </div>
              ) : null}

              {m.bio ? (
                <p className="p" style={{ marginTop: 12 }}>
                  {m.bio.length > 140 ? m.bio.slice(0, 140) + "…" : m.bio}
                </p>
              ) : null}

              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
                View Profile →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Students ---------- */}
      <section
        style={{
          padding: "20px 20px", // ✅ left-right space
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Student Researchers
          </h2>

          <div
            style={{
              width: 60,
              height: 4,
              background: "linear-gradient(to right, #9333ea, #6366f1)",
              marginTop: 10,
              borderRadius: 6,
            }}
          />
        </div>

        <div className="grid grid-3">
          {students.map((m) => (
            <div key={m.slug} className="card">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    unoptimized
                    src={m.photo || "/members/placeholder.png"}
                    alt={m.name}
                    width={50}
                    height={50}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, letterSpacing: "-0.01em" }}>
                    {m.name}
                  </div>
                  <div className="small">
                    {m.program ? m.program : "UG"}
                    {m.major ? ` — ${m.major}` : ""}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="p" style={{ marginTop: 20 }}>
          * Student profiles can be expanded later (projects, skills, awards).
        </p>
      </section>
    </div>
  );
}

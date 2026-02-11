import Image from "next/image";
import Link from "next/link";
import { members } from "./data";

export default function MembersPage() {
  const faculty = members.filter((m) => m.role !== "Student Researcher");
  const students = members.filter((m) => m.role === "Student Researcher");

  return (
    <div>
      <div className="hero">
        <div className="kicker">People • Mentorship • Collaboration</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          Members
        </h1>
        <p className="p" style={{ maxWidth: 920 }}>
          IRG includes AUW faculty and students. Faculty profiles include research interests and links. Student cards show
          program level and major.
        </p>
      </div>

      {/* ---------- Faculty ---------- */}
      <section className="section">
        <h2 className="h2">Faculty</h2>

        <div className="grid grid-3" style={{ marginTop: 12 }}>
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
    width: 30,
    height: 30,
    borderRadius: "50%",
    overflow: "hidden",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <Image
    unoptimized
    src={m.photo || "/members/placeholder.png"}
    alt={m.name}
    width={30}
    height={30}
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

              {/* Interests (only if exists) */}
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

              {/* Bio (only if exists) */}
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
      <section className="section">
        <h2 className="h2">Student Researchers</h2>

        <div className="grid grid-3" style={{ marginTop: 12 }}>
          {students.map((m) => (
            <div key={m.slug} className="card">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 40,
                    height: 30,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Image
                    unoptimized
                    src={m.photo || "/members/placeholder.png"}
                    alt={m.name}
                    width={58}
                    height={58}
                    style={{ objectFit: "cover" }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, letterSpacing: "-0.01em" }}>
                    {m.name}
                  </div>
                  <div className="small">
                    {m.program ? m.program : "UG"}{m.major ? ` — ${m.major}` : ""}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="p" style={{ marginTop: 12 }}>
          * Student profiles can be expanded later (projects, skills, awards) if needed.
        </p>
      </section>
    </div>
  );
}

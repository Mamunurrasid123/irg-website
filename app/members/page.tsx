import Image from "next/image";
import Link from "next/link";
import { members } from "./data";

export const metadata = {
  title: "Members | IRG",
};

export default function MembersPage() {
  const faculty = members.filter((m) => !m.program);
  const students = members.filter((m) => m.program);

  return (
    <div>
      <section className="hero">
        <h1 className="h1">Members</h1>
        <p className="p" style={{ maxWidth: 900 }}>
          Meet the faculty leads and student researchers of the
          Interdisciplinary Research Group (IRG) at Asian University for Women.
        </p>
      </section>

      <section className="section">
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Faculty
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
          }}
        >
          {faculty.map((m) => (
            <article key={m.slug} className="card">
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={m.photo || "/members/placeholder.png"}
                    alt={m.name}
                    width={72}
                    height={72}
                    unoptimized
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{m.name}</h3>
                  {m.role && <div className="small">{m.role}</div>}
                  {m.affiliation && <div className="small">{m.affiliation}</div>}
                </div>
              </div>

              {m.interests?.length ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  {m.interests.slice(0, 3).map((x) => (
                    <span key={x} className="badge">
                      {x}
                    </span>
                  ))}
                </div>
              ) : null}

              <Link href={`/members/${m.slug}`} className="btn btnPrimary">
                View Profile
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Student Researchers
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
          }}
        >
          {students.map((m) => (
            <article key={m.slug} className="card">
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={m.photo || "/members/placeholder.png"}
                    alt={m.name}
                    width={64}
                    height={64}
                    unoptimized
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{m.name}</h3>
                  {m.role && <div className="small">{m.role}</div>}
                  {(m.program || m.major) && (
                    <div className="small">
                      {m.program}
                      {m.major ? ` — ${m.major}` : ""}
                    </div>
                  )}
                </div>
              </div>

              <Link href={`/members/${m.slug}`} className="btn">
                View Profile
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
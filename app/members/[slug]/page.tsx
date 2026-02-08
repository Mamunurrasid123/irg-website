import Image from "next/image";
import Link from "next/link";
import { members } from "../data";

// ✅ REQUIRED for output: 'export' (GitHub Pages)
export function generateStaticParams() {
  return members.map((m) => ({ slug: m.slug }));
}

// Optional but nice: prevents unknown slugs
export const dynamicParams = false;

export default function MemberProfile({ params }: { params: { slug: string } }) {
  const member = members.find((m) => m.slug === params.slug);

  if (!member) {
    return (
      <div className="card">
        <h1 className="h2">Member not found</h1>
        <p className="p">Please return to the members page.</p>
        <div className="btnRow">
          <Link href="/members" className="btn">← Back to Members</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/members" className="btn">← Back to Members</Link>
      </div>

      <section className="hero" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ width: 120, height: 120, borderRadius: 24, overflow: "hidden", border: "1px solid var(--border)" }}>
            <Image
              unoptimized
              src={member.photo || "/members/placeholder.png"}
              alt={member.name}
              width={120}
              height={120}
              style={{ objectFit: "cover" }}
            />
          </div>

          <div style={{ minWidth: 260 }}>
            <h1 className="h1" style={{ fontSize: 34 }}>{member.name}</h1>

            {member.role && <div className="small" style={{ marginTop: 6 }}>{member.role}</div>}
            {member.affiliation && <div className="small">{member.affiliation}</div>}

            {(member.program || member.major) && (
              <div className="small" style={{ marginTop: 4 }}>
                {member.program}{member.major ? ` — ${member.major}` : ""}
              </div>
            )}

            <div className="btnRow">
              {member.email && (
                <a href={`mailto:${member.email}`} className="btn btnPrimary">Email</a>
              )}
              <Link href="/contact" className="btn">Join / Contact</Link>
            </div>
          </div>
        </div>

        {member.interests?.length ? (
          <>
            <div className="divider" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {member.interests.map((x) => (
                <span key={x} className="badge">{x}</span>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {member.bio ? (
        <section className="section">
          <div className="card">
            <h2 className="h2">Bio</h2>
            <p className="p" style={{ maxWidth: 1000 }}>{member.bio}</p>
          </div>
        </section>
      ) : null}

      {member.links?.length ? (
        <section className="section">
          <div className="card">
            <h2 className="h2">Links</h2>
            <ul style={{ marginTop: 10, lineHeight: 1.9 }}>
              {member.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

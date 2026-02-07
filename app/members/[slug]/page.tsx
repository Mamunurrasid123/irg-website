import Image from "next/image";
import Link from "next/link";
import { members } from "../data";

export default function MemberProfile({ params }: { params: { slug: string } }) {
  const member = members.find((m) => m.slug === params.slug);

  if (!member) {
    return (
      <div className="card">
        <h1 className="h2">Member not found</h1>
        <p className="p">Please go back to the members page.</p>
        <div className="btnRow">
          <Link className="btn" href="/members">Back to Members</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link className="btn" href="/members">← Back to Members</Link>
      </div>

      <section className="hero" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ width: 110, height: 110, borderRadius: 22, overflow: "hidden", border: "1px solid var(--border)" }}>
            <Image
              src={member.photo || "/members/placeholder.png"}
              alt={member.name}
              width={110}
              height={110}
              style={{ objectFit: "cover" }}
            />
          </div>

          <div style={{ minWidth: 260 }}>
            <h1 className="h1" style={{ fontSize: 34 }}>{member.name}</h1>
            <div className="small" style={{ marginTop: 6 }}>{member.role}</div>
            <div className="small">{member.affiliation}</div>

            {member.email && (
              <div className="btnRow">
                <a className="btn btnPrimary" href={`mailto:${member.email}`}>Email</a>
                <Link className="btn" href="/contact">Join / Contact</Link>
              </div>
            )}
          </div>
        </div>

        <div className="divider" />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {member.interests.map((x) => (
            <span key={x} className="badge">{x}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="h2">Bio</h2>
          <p className="p" style={{ maxWidth: 1000 }}>{member.bio}</p>

          {member.links?.length ? (
            <>
              <div className="divider" />
              <h2 className="h2">Links</h2>
              <ul style={{ marginTop: 10, lineHeight: 1.9 }}>
                {member.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { members } from "./data";

export default function MembersPage() {
  return (
    <div>
      <div className="hero">
        <div className="kicker">People • Mentorship • Collaboration</div>
        <h1 className="h1" style={{ marginTop: 12 }}>Members</h1>
        <p className="p" style={{ maxWidth: 920 }}>
          IRG includes AUW faculty and students. Click a profile to learn about research interests, projects, and contact information.
        </p>
      </div>

      <section className="section">
        <div className="grid grid-3">
          {members.map((m) => (
            <Link key={m.slug} href={`/members/${m.slug}`} className="card" style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <Image
                    src={m.photo || "/members/placeholder.png"}
                    alt={m.name}
                    width={64}
                    height={64}
                    style={{ objectFit: "cover" }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, letterSpacing: "-0.01em" }}>{m.name}</div>
                  <div className="small">{m.role}</div>
                  <div className="small">{m.affiliation}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {m.interests.slice(0, 4).map((x) => (
                  <span key={x} className="badge">{x}</span>
                ))}
              </div>

              <p className="p" style={{ marginTop: 12 }}>
                {m.bio.length > 140 ? m.bio.slice(0, 140) + "…" : m.bio}
              </p>

              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
                View Profile →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

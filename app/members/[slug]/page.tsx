import Image from "next/image";
import Link from "next/link";
import { members } from "../data";
import { notFound } from "next/navigation";

// ✅ REQUIRED for output: 'export' (GitHub Pages)
export function generateStaticParams() {
  return members.map((m) => ({
    slug: m.slug,
  }));
}

// Prevent unknown slugs
export const dynamicParams = false;

export default function MemberProfile({
  params,
}: {
  params: { slug: string };
}) {
  // ✅ Safe slug handling
  const slug = decodeURIComponent(params.slug).toLowerCase().trim();

  const member = members.find(
    (m) => m.slug.toLowerCase().trim() === slug
  );

  if (!member) {
    notFound();
  }

  return (
    <div>
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/members" className="btn">
          ← Back to Members
        </Link>
      </div>

      <section className="hero" style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Profile Image */}
          <div
            style={{
              width: 120,
              height: 120,
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
              src={member.photo || "/members/placeholder.png"}
              alt={member.name}
              width={120}
              height={120}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          {/* Member Info */}
          <div style={{ minWidth: 260 }}>
            <h1 className="h1" style={{ fontSize: 34 }}>
              {member.name}
            </h1>

            {member.role && (
              <div className="small" style={{ marginTop: 6 }}>
                {member.role}
              </div>
            )}

            {member.affiliation && (
              <div className="small">{member.affiliation}</div>
            )}

            {(member.program || member.major) && (
              <div className="small" style={{ marginTop: 4 }}>
                {member.program}
                {member.major ? ` — ${member.major}` : ""}
              </div>
            )}

            <div className="btnRow">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="btn btnPrimary"
                >
                  Email
                </a>
              )}
              <Link href="/contact" className="btn">
                Join / Contact
              </Link>
            </div>
          </div>
        </div>

        {/* Interests */}
        {member.interests?.length ? (
          <>
            <div className="divider" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {member.interests.map((x) => (
                <span key={x} className="badge">
                  {x}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {/* Bio */}
      {member.bio ? (
        <section className="section">
          <div className="card">
            <h2 className="h2">Bio</h2>
            <p className="p" style={{ maxWidth: 1000 }}>
              {member.bio}
            </p>
          </div>
        </section>
      ) : null}

      {/* External Links */}
      {member.links?.length ? (
        <section className="section">
          <div className="card">
            <h2 className="h2">Links</h2>
            <ul style={{ marginTop: 10, lineHeight: 1.9 }}>
              {member.links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import ScholarshipFilters from "@/components/ScholarshipFilters";
import { scholarships } from "../data/scholarships";
import { isDeadlineThisMonth } from "../lib/blogs/scholarship-utils";

export const metadata = {
  title: "Scholarships | IRG",
  description:
    "Explore scholarships, fellowships, internships, and higher study opportunities through IRG.",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 12px",
  borderRadius: 999,
  fontSize: "0.78rem",
  fontWeight: 700,
  marginRight: 8,
  marginBottom: 8,
};

export default function ScholarshipsPage() {
  const featured = scholarships.filter((s) => s.featured).slice(0, 3);
  const deadlineThisMonth = scholarships.filter((s) => isDeadlineThisMonth(s.deadline));

  return (
    <main
      className="container"
      style={{
        padding: "34px 20px 56px",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      <section
        style={{
          background:
            "rgba(234, 193, 10, 0.9)",
          border: "1px solid rgba(139,0,0,0.10)",
          borderRadius: 28,
          padding: "34px 26px",
          marginBottom: 30,
          boxShadow: "0 14px 34px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ maxWidth: 860 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              color: "#f0c91b",
              border: "1px solid rgba(139,0,0,0.12)",
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: "0.84rem",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Scholarships  Opportunity around the world, curated for AUW and IRG students, researchers, and faculty.
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              lineHeight: 1.12,
              margin: "0 0 14px",
              color: "#111",
            }}
          >
            Scholarships, Fellowships, and
            <br />
            Higher Study Opportunities
          </h1>

          <p
            style={{
              fontSize: "1.04rem",
              lineHeight: 1.8,
              color: "#444",
              margin: "0 0 22px",
              maxWidth: 760,
            }}
          >
            Explore global funding opportunities for undergraduate study, master’s,
            PhD, postdoctoral research, and academic development. This page is
            designed to help AUW and IRG students, researchers, and faculty find
            reliable scholarship information in one place.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(139,0,0,0.10)",
                borderRadius: 16,
                padding: "12px 16px",
                minWidth: 170,
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: 4 }}>
                Total Opportunities
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#8b0000" }}>
                {scholarships.length}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(139,0,0,0.10)",
                borderRadius: 16,
                padding: "12px 16px",
                minWidth: 170,
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#e8eb0b", marginBottom: 4 }}>
                Featured
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#8b0000" }}>
                {featured.length}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(139,0,0,0.10)",
                borderRadius: 16,
                padding: "12px 16px",
                minWidth: 170,
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: 4 }}>
                Deadline This Month
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#8b0000" }}>
                {deadlineThisMonth.length}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 34 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#f4d318",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Highlighted
            </div>
            <h2 style={{ margin: 0, fontSize: "1.0rem" }}>Featured Opportunities</h2>
          </div>

          <Link
            href="#all-scholarships"
            style={{
              textDecoration: "none",
              background: "#8b0000",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 12,
              fontWeight: 700,
              boxShadow: "0 8px 18px rgba(139,0,0,0.18)",
            }}
          >
            Browse All
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {featured.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 22,
                padding: 22,
                boxShadow: "0 12px 28px rgba(0,0,0,0.05)",
                transition: "transform 0.2s ease",
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <span
                  style={{
                    ...badgeStyle,
                    background: "#fff1cc",
                    color: "#7a5900",
                  }}
                >
                  Featured
                </span>

                {isDeadlineThisMonth(item.deadline) && (
                  <span
                    style={{
                      ...badgeStyle,
                      background: "#ffe2e2",
                      color: "#b30000",
                    }}
                  >
                    Deadline This Month
                  </span>
                )}
              </div>

              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: "1.18rem",
                  lineHeight: 1.35,
                  color: "#111",
                }}
              >
                {item.name}
              </h3>

              <div style={{ color: "#555", lineHeight: 1.8, marginBottom: 16 }}>
                <div>
                  <strong>Country:</strong> {item.country}
                </div>
                <div>
                  <strong>Degree:</strong> {item.degreeLevel.join(", ")}
                </div>
                <div>
                  <strong>Funding:</strong> {item.funding.type}
                </div>
                <div>
                  <strong>Deadline:</strong> {item.deadline}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href={`/scholarships/${item.id}`}
                  style={{
                    textDecoration: "none",
                    background: "#8b0000",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontWeight: 700,
                  }}
                >
                  View Details
                </Link>

                <a
                  href={item.officialLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: "none",
                    background: "#fafafa",
                    color: "#111",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontWeight: 700,
                    border: "1px solid var(--border)",
                  }}
                >
                  Official Link
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 24,
          padding: "24px 20px",
          marginBottom: 30,
          boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#fcfcfc",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 800, color: "#8b0000", marginBottom: 6 }}>
              By Degree
            </div>
            <div style={{ color: "#555", lineHeight: 1.7 }}>
              Bachelor’s, Master’s, PhD, Postdoctoral, and Research opportunities.
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#fcfcfc",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 800, color: "#8b0000", marginBottom: 6 }}>
              Application Guidance
            </div>
            <div style={{ color: "#555", lineHeight: 1.7 }}>
              Find timelines, required documents, and professor contact guidance.
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#fcfcfc",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 800, color: "#8b0000", marginBottom: 6 }}>
              Funding Details
            </div>
            <div style={{ color: "#555", lineHeight: 1.7 }}>
              Tuition, stipend, travel support, and additional benefits at a glance.
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#fcfcfc",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 800, color: "#8b0000", marginBottom: 6 }}>
              Verified Sources
            </div>
            <div style={{ color: "#555", lineHeight: 1.7 }}>
              Direct links to official scholarship pages for reliable information.
            </div>
          </div>
        </div>
      </section>

      <section id="all-scholarships">
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#f4f40f",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Search and Explore
          </div>
          <h2 style={{ margin: 0, fontSize: "1.7rem" }}>All Scholarships</h2>
        </div>

        <ScholarshipFilters scholarships={scholarships} />
      </section>
    </main>
  );
}
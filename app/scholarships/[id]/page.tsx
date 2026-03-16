import Link from "next/link";
import { notFound } from "next/navigation";
import { scholarships } from "@/app/data/scholarships";
import {
  getScholarshipById,
  isDeadlineThisMonth,
  slugify,
} from "@/app/lib/blogs/scholarship-utils";

export function generateStaticParams() {
  return scholarships.map((item) => ({
    id: slugify(item.id),
  }));
}

export const dynamicParams = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const sectionStyle: React.CSSProperties = {
  background: "#f7d113",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: "0.76rem",
  fontWeight: 700,
  marginRight: 8,
  marginBottom: 8,
};

export default async function ScholarshipDetailPage({ params }: PageProps) {
  const { id } = await params;

  const scholarship = getScholarshipById(id, scholarships);

  if (!scholarship) notFound();

  const related = scholarships
    .filter((item) => item.id !== scholarship.id)
    .filter(
      (item) =>
        item.country === scholarship.country ||
        item.degreeLevel.some((d) => scholarship.degreeLevel.includes(d))
    )
    .slice(0, 3);

  return (
    <main className="container" style={{ padding: "32px 18px 48px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/scholarships"
          style={{
            textDecoration: "none",
            color: "#f0e007",
            fontWeight: 700,
          }}
        >
          ← Back to Scholarships
        </Link>
      </div>

      <section
        style={{
          background:
            "linear-gradient(135deg, rgba(241, 208, 15, 0.89), rgba(255, 191, 0, 0.93))",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: 24,
          marginBottom: 22,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              ...badgeStyle,
              background: "#eef5ff",
              color: "#0b5cab",
            }}
          >
            {scholarship.funding.type}
          </span>

          {scholarship.featured && (
            <span
              style={{
                ...badgeStyle,
                background: "#fff4cc",
                color: "#7a5a00",
              }}
            >
              Featured
            </span>
          )}

          {isDeadlineThisMonth(scholarship.deadline) && (
            <span
              style={{
                ...badgeStyle,
                background: "#ffe0e0",
                color: "#b30000",
              }}
            >
              Deadline This Month
            </span>
          )}
        </div>

        <h1 style={{ margin: "0 0 10px", fontSize: "2rem", lineHeight: 1.2 }}>
          {scholarship.name}
        </h1>

        <p style={{ margin: 0, color: "#444", lineHeight: 1.7 }}>
          <strong>Country:</strong> {scholarship.country} &nbsp;•&nbsp;
          <strong>Institution:</strong> {scholarship.institution}
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Overview</h2>
        <p style={{ lineHeight: 1.8, color: "#444" }}>
          This opportunity supports applicants interested in{" "}
          {scholarship.degreeLevel.join(", ")} studies or research in{" "}
          {scholarship.country}. It is especially relevant for applicants in
          fields such as {scholarship.fields.join(", ")}.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Degree Level</h2>
        <p>{scholarship.degreeLevel.join(", ")}</p>

        <h2 style={{ marginTop: 20 }}>Field of Study</h2>
        <p>{scholarship.fields.join(", ")}</p>

        <h2 style={{ marginTop: 20 }}>Funding / Scholarship Amount</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>
            <strong>Type:</strong> {scholarship.funding.type}
          </li>
          <li>
            <strong>Tuition:</strong> {scholarship.funding.tuition}
          </li>
          <li>
            <strong>Stipend:</strong> {scholarship.funding.stipend}
          </li>
          <li>
            <strong>Travel:</strong> {scholarship.funding.travel}
          </li>
          <li>
            <strong>Other:</strong> {scholarship.funding.other}
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2>Who Can Apply</h2>
        <ul style={{ lineHeight: 1.8 }}>
          {scholarship.whoCanApply.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <h2 style={{ marginTop: 20 }}>Required Documents</h2>
        <ul style={{ lineHeight: 1.8 }}>
          {scholarship.requiredDocuments.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2>Application Timeline</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>
            <strong>Application Start:</strong> {scholarship.applicationStart}
          </li>
          <li>
            <strong>Deadline:</strong> {scholarship.deadline}
          </li>
          <li>
            <strong>Status:</strong> {scholarship.status}
          </li>
          <li>
            <strong>Last Verified:</strong> {scholarship.lastVerified}
          </li>
        </ul>

        <h2 style={{ marginTop: 20 }}>When to Contact Professors</h2>
        <p style={{ lineHeight: 1.8 }}>{scholarship.whenToContactProfessor}</p>
      </section>

      <section style={sectionStyle}>
        <h2>Application Process</h2>
        <ol style={{ lineHeight: 1.8 }}>
          {scholarship.applicationProcess.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>

        <h2 style={{ marginTop: 20 }}>Selection Process</h2>
        <ol style={{ lineHeight: 1.8 }}>
          {scholarship.selectionProcess.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>
      </section>

      <section style={sectionStyle}>
        <h2>Official Link</h2>
        <a
          href={scholarship.officialLink}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#8b0000",
            fontWeight: 700,
            textDecoration: "none",
            wordBreak: "break-word",
          }}
        >
          Visit Official Scholarship Page
        </a>

        <h2 style={{ marginTop: 20 }}>Tips for Applicants</h2>
        <ul style={{ lineHeight: 1.8 }}>
          {scholarship.tips.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section style={sectionStyle}>
          <h2>Related Scholarships</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {related.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <h3 style={{ marginTop: 0, fontSize: "1rem" }}>{item.name}</h3>
                <div style={{ marginBottom: 8 }}>
                  <strong>Country:</strong> {item.country}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong>Degree:</strong> {item.degreeLevel.join(", ")}
                </div>
                <Link
                  href={`/scholarships/${slugify(item.id)}`}
                  style={{
                    textDecoration: "none",
                    color: "#8b0000",
                    fontWeight: 700,
                  }}
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
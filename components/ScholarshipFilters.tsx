"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Scholarship} from "@/app/data/scholarships";
import { isDeadlineThisMonth,matchesSearch } from "@/app/lib/blogs/scholarship-utils";

type Props = {
  scholarships: Scholarship[];
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  fontSize: "0.96rem",
  outline: "none",
  background: "#fff",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  fontSize: "0.96rem",
  outline: "none",
  background: "#fff",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 11px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 700,
  marginRight: 8,
  marginBottom: 8,
};

export default function ScholarshipFilters({ scholarships }: Props) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [degree, setDegree] = useState("All");
  const [funding, setFunding] = useState("All");
  const [professorContact, setProfessorContact] = useState("All");
  const [deadlineMonthOnly, setDeadlineMonthOnly] = useState(false);

  const countries = useMemo(() => {
    return ["All", ...Array.from(new Set(scholarships.map((s) => s.country))).sort()];
  }, [scholarships]);

  const degrees = useMemo(() => {
    return [
      "All",
      ...Array.from(new Set(scholarships.flatMap((s) => s.degreeLevel))).sort(),
    ];
  }, [scholarships]);

  const fundingTypes = useMemo(() => {
    return [
      "All",
      ...Array.from(new Set(scholarships.map((s) => s.funding.type))).sort(),
    ];
  }, [scholarships]);

  const filtered = useMemo(() => {
    return scholarships.filter((s) => {
      const searchOk = matchesSearch(s, search);
      const countryOk = country === "All" || s.country === country;
      const degreeOk = degree === "All" || s.degreeLevel.includes(degree);
      const fundingOk = funding === "All" || s.funding.type === funding;

      const professorOk =
        professorContact === "All" ||
        (professorContact === "Yes" && s.requiresProfessorContact) ||
        (professorContact === "No" && !s.requiresProfessorContact);

      const deadlineOk = !deadlineMonthOnly || isDeadlineThisMonth(s.deadline);

      return searchOk && countryOk && degreeOk && fundingOk && professorOk && deadlineOk;
    });
  }, [scholarships, search, country, degree, funding, professorContact, deadlineMonthOnly]);

  return (
    <>
      <div
        style={{
          background: "linear-gradient(180deg, #ffffff, #fcfcfc)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 24,
          padding: 20,
          marginBottom: 24,
          boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <input
            type="text"
            placeholder="Search by scholarship, country, degree, field, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={country} onChange={(e) => setCountry(e.target.value)} style={selectStyle}>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Countries" : item}
              </option>
            ))}
          </select>

          <select value={degree} onChange={(e) => setDegree(e.target.value)} style={selectStyle}>
            {degrees.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Degrees" : item}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <select value={funding} onChange={(e) => setFunding(e.target.value)} style={selectStyle}>
            {fundingTypes.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Funding Types" : item}
              </option>
            ))}
          </select>

          <select
            value={professorContact}
            onChange={(e) => setProfessorContact(e.target.value)}
            style={selectStyle}
          >
            <option value="All">Professor Contact: All</option>
            <option value="Yes">Professor Contact Required</option>
            <option value="No">Professor Contact Not Required</option>
          </select>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff8f8",
              border: "1px solid rgba(139,0,0,0.10)",
              color: "#8b0000",
              borderRadius: 14,
              padding: "13px 15px",
              cursor: "pointer",
              fontWeight: 700,
              minHeight: 50,
            }}
          >
            <input
              type="checkbox"
              checked={deadlineMonthOnly}
              onChange={(e) => setDeadlineMonthOnly(e.target.checked)}
            />
            Deadline This Month
          </label>
        </div>
      </div>

      <div
        style={{
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: "#222",
          }}
        >
          Showing {filtered.length} scholarship{filtered.length !== 1 ? "s" : ""}
        </div>

        <div
          style={{
            fontSize: "0.92rem",
            color: "#666",
          }}
        >
          Use the filters to narrow opportunities by country, degree, funding, or deadline.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 22,
        }}
      >
        {filtered.map((s) => (
          <div
            key={s.id}
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 22,
              padding: 22,
              boxShadow: "0 12px 28px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 310,
            }}
          >
            <div>
              <div style={{ marginBottom: 10 }}>
                {s.featured && (
                  <span
                    style={{
                      ...badgeStyle,
                      background: "#fff1cc",
                      color: "#7a5900",
                    }}
                  >
                    Featured
                  </span>
                )}

                {isDeadlineThisMonth(s.deadline) && (
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

                <span
                  style={{
                    ...badgeStyle,
                    background: "#eef5ff",
                    color: "#0b5cab",
                  }}
                >
                  {s.funding.type}
                </span>
              </div>

              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: "1.16rem",
                  lineHeight: 1.35,
                  color: "#111",
                }}
              >
                {s.name}
              </h3>

              <div style={{ color: "#555", lineHeight: 1.8, marginBottom: 12 }}>
                <div>
                  <strong>Country:</strong> {s.country}
                </div>
                <div>
                  <strong>Degree:</strong> {s.degreeLevel.join(", ")}
                </div>
                <div>
                  <strong>Application Start:</strong> {s.applicationStart}
                </div>
                <div>
                  <strong>Deadline:</strong> {s.deadline}
                </div>
                <div>
                  <strong>Professor Contact:</strong>{" "}
                  {s.requiresProfessorContact ? "Required / Important" : "Usually Not Required"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {s.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "0.76rem",
                      background: "#f7f7f7",
                      border: "1px solid rgba(0,0,0,0.06)",
                      color: "#444",
                      padding: "5px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <Link
                href={`/scholarships/${s.id}`}
                style={{
                  textDecoration: "none",
                  background: "#8b0000",
                  color: "#fff",
                  padding: "10px 15px",
                  borderRadius: 12,
                  fontWeight: 700,
                  boxShadow: "0 8px 18px rgba(139,0,0,0.16)",
                }}
              >
                View Details
              </Link>

              <a
                href={s.officialLink}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: "none",
                  background: "#fafafa",
                  color: "#111",
                  padding: "10px 15px",
                  borderRadius: 12,
                  fontWeight: 700,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                Official Link
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            marginTop: 22,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 18,
            padding: 22,
            textAlign: "center",
            color: "#555",
            boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
          }}
        >
          No scholarships found with the selected filters.
        </div>
      )}

      <style jsx>{`
        @media (max-width: 920px) {
          div[style*="grid-template-columns: 2fr 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="grid-template-columns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
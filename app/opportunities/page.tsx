"use client";

import { useMemo, useState } from "react";

type Opportunity = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  status: string;
  content: string;
};

const opportunities: Opportunity[] = [
  {
    slug: "fem-numerical-simulation-team",

    title: "Finite Element Methods & Numerical Simulation Team",

    subtitle:
      "Research opportunity in FEM, Numerical Analysis, CFD, PDEs, Scientific Computing, and Mathematical Modeling.",

    category:
      "Applied Mathematics • Scientific Computing • Numerical Simulation",

    status: "Open for AUW Students",

    content: `📢 Finite Element Methods & Numerical Simulation Team – Call for Student Participation

Dear Students,

Students who are interested in research projects related to Finite Element Methods (FEM), Numerical Analysis, Computational Fluid Dynamics (CFD), Partial Differential Equations (PDEs), Scientific Computing, and Mathematical Modeling are encouraged to join the Finite Element Methods & Numerical Simulation Team.

Research topics may include:

• Numerical Solution of Navier–Stokes Equations
• Shallow Water Equations
• Finite Element and Lagrange–Galerkin Methods
• Fluid Flow Simulation
• Scientific Computing and Computational Mathematics

📌 Important Note

• This is a non-paid voluntary research opportunity.
• Students are expected to participate sincerely and regularly.

We will organize:

• Weekly research meetings
• Reading discussions
• Student seminars/presentations
• Training sessions on mathematical theory and computational tools

📌 Who Can Join

This opportunity is open to students from ANY major at AUW who are interested in research, mathematics, computation, scientific programming, modeling, or interdisciplinary problem solving.

Students who are interested in:

• Applied Mathematics
• Scientific Computing
• Numerical Simulation
• Mathematical Modeling
• Computational Research
• Graduate studies and research careers

It would be helpful to have familiarity with topics such as:

• Calculus
• Linear Algebra
• Differential Equations
• Numerical Analysis

However, highly motivated students who are willing to learn are also encouraged to apply.

Students should be interested in learning:

• Advanced mathematical theory and theoretical developments
• Rigorous mathematical analysis and derivations
• Scientific computing tools such as:

  - MATLAB
  - Python
  - LaTeX
  - FreeFem++

📌 What Participants May Gain

Participants may gain experience in:

• Mathematical modeling and theoretical analysis
• Numerical methods and finite element schemes
• Scientific programming and simulations
• FreeFem++ implementation
• Research methodology and academic writing
• Seminar presentation skills
• Preparation for higher studies and research careers

📌 Application Process

Interested students are requested to send an email directly to:

mamunur.rasid@auw.edu.bd

Please include:

1. Your year/semester
2. Relevant courses completed
3. Research interests
4. Why you are interested in joining the team

All interested students will receive equal opportunity to participate and learn.

Further details and meeting schedules will be shared later.`,
  },
];

export default function OpportunitiesPage() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredOpportunities = useMemo(() => {
    const query = search.toLowerCase();

    return opportunities.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#8b0000",
        padding: "30px 20px 80px",
      }}
    >
      <div
        style={{
          padding: "20px 20px",
          backgroundColor: "#bfc22f",
          borderRadius: 14,
          maxWidth: 1350,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: 44,
            marginBottom: 10,
            color: "#071028",
          }}
        >
          IRG Research Opportunities
        </h1>

        <p
          style={{
            fontSize: 18,
            marginBottom: 20,
            lineHeight: 1.7,
            color: "#1f2937",
          }}
        >
          Explore student research participation, mentoring, scientific
          computing, mathematical modeling, interdisciplinary research, and
          computational projects through the Interdisciplinary Research Group
          (IRG).
        </p>

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search by topic, keyword, method, tool..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              fontSize: 16,
              outline: "none",
            }}
          />
        </div>

        {/* Opportunity Grid */}
        <div
          style={{
            display: "grid",
            gap: 14,
            padding: 14,
            borderRadius: 14,
          }}
        >
          {filteredOpportunities.length === 0 && (
            <div
              style={{
                padding: 20,
                backgroundColor: "white",
                borderRadius: 10,
              }}
            >
              No opportunities found.
            </div>
          )}

          {filteredOpportunities.map((item) => {
            const isOpen = openSlug === item.slug;

            return (
              <div
                key={item.slug}
                style={{
                  border: "1px solid #aec0e5",
                  borderRadius: 14,
                  padding: 20,
                  backgroundColor: "#f4f4b5",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "inline-block",
                        backgroundColor: "#8b0000",
                        color: "white",
                        padding: "5px 12px",
                        borderRadius: 999,
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 10,
                      }}
                    >
                      {item.status}
                    </div>

                    <br />

                    <strong
                      style={{
                        fontSize: 25,
                        color: "#071028",
                      }}
                    >
                      {item.title}
                    </strong>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 16,
                        lineHeight: 1.6,
                      }}
                    >
                      {item.subtitle}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      {item.category}
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() =>
                      setOpenSlug(isOpen ? null : item.slug)
                    }
                    style={{
                      height: 40,
                      padding: "0 16px",
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {isOpen ? "Hide" : "Details"}
                  </button>
                </div>

                {/* Details */}
                {isOpen && (
                  <div
                    style={{
                      marginTop: 18,
                      borderTop: "1px solid #4772c7",
                      paddingTop: 16,
                    }}
                  >
                    <div
                      style={{
                        lineHeight: 1.9,
                        whiteSpace: "pre-wrap",
                        maxHeight: 650,
                        overflowY: "auto",
                        fontSize: 16,
                        color: "#111827",
                      }}
                    >
                      {item.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
"use client";

import {
  Brain,
  Waves,
  HeartPulse,
  Dna,
  Leaf,
  ArrowRight,
  Microscope,
} from "lucide-react";

const researchAreas = [
  {
    title: "Numerical Solution of PDEs & Scientific Computing",
    description:
      "Finite element methods, Lagrange–Galerkin schemes, stability and convergence analysis, and computational methods for partial differential equations.",
    icon: Waves,
    accent: "#0f4c81",
  },
  {
    title: "AI, Machine Learning, and Data Science",
    description:
      "Mathematical modeling, optimization, uncertainty quantification, interpretable AI, and reproducible machine learning frameworks.",
    icon: Brain,
    accent: "#7c1f3d",
  },
  {
    title: "AI for Social Good",
    description:
      "Applied machine learning, fairness, interpretability, and impactful applications in education, public policy, and healthcare.",
    icon: Microscope,
    accent: "#6b2c91",
  },
  {
    title: "Climate and Coastal Modeling",
    description:
      "Shallow-water equations, hydrodynamics, coastal hazards, climate resilience, and environmental risk analytics.",
    icon: Waves,
    accent: "#0d6e6e",
  },
  {
    title: "Public Health Analytics",
    description:
      "Epidemiological modeling, statistical health analysis, health systems research, and evidence-based public health decision making.",
    icon: HeartPulse,
    accent: "#9b1c31",
  },
  {
    title: "Biological and Bioinformatics Research",
    description:
      "Computational biology, genomics data analysis, cancer research modeling, and interdisciplinary biological data science.",
    icon: Dna,
    accent: "#355e3b",
  },
  {
    title: "Environmental and Sustainability Science",
    description:
      "Environmental modeling, climate change impact analysis, ecological systems, and sustainability-oriented quantitative research.",
    icon: Leaf,
    accent: "#2d5a27",
  },
];

const highlights = [
  "Interdisciplinary research across mathematics, data science, health, biology, and environment",
  "Student-faculty collaboration on real-world research problems",
  "Strong emphasis on modeling, computation, and societal impact",
];

export default function Research() {
  return (
    <section
      style={{
        background:
          "linear-gradient(180deg, #f7f9fc 0%, #eef3f8 50%, #ffffff 100%)",
        padding: "48px 20px 72px",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        {/* Hero */}
        <div
          style={{
            border: "1px solid rgba(15, 76, 129, 0.12)",
            borderRadius: 24,
            padding: "36px 28px",
            background:
              "linear-gradient(135deg, rgba(15,76,129,0.08), rgba(124,31,61,0.05), rgba(255,255,255,0.95))",
            boxShadow: "0 10px 35px rgba(20, 40, 80, 0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(15,76,129,0.08)",
              filter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -30,
              bottom: -30,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(124,31,61,0.06)",
            }}
          />

          <div style={{ position: "relative", zIndex: 2 }}>
            <p
              style={{
                margin: 0,
                color: "#7c1f3d",
                fontSize: "0.95rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Interdisciplinary Research Group
            </p>

            <h1
              style={{
                margin: "10px 0 14px",
                fontSize: "clamp(2rem, 4vw, 3.35rem)",
                lineHeight: 1.1,
                color: "#0f2742",
                fontWeight: 800,
                maxWidth: 860,
              }}
            >
              Research Areas
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 880,
                color: "#334a60",
                fontSize: "1.05rem",
                lineHeight: 1.8,
              }}
            >
              Our research brings together mathematics, scientific computing,
              artificial intelligence, public health, biological sciences, and
              environmental research to address complex real-world challenges
              through rigorous, collaborative, and impact-driven inquiry.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 22,
              }}
            >
              {highlights.map((item) => (
                <span
                  key={item}
                  style={{
                    background: "#ffffff",
                    border: "1px solid rgba(15,76,129,0.12)",
                    color: "#17324d",
                    padding: "10px 14px",
                    borderRadius: 999,
                    fontSize: "0.92rem",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section header */}
        <div
          style={{
            marginTop: 40,
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.65rem",
                color: "#10263d",
                fontWeight: 800,
              }}
            >
              Core Research Themes
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                color: "#53697f",
                lineHeight: 1.7,
                maxWidth: 780,
              }}
            >
              These focus areas reflect the center’s commitment to rigorous
              theory, computational innovation, and interdisciplinary impact.
            </p>
          </div>

          <div
            style={{
              color: "#0f4c81",
              fontWeight: 700,
              fontSize: "0.95rem",
            }}
          >
            {researchAreas.length} Active Areas
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {researchAreas.map((area) => {
            const Icon = area.icon;

            return (
              <article
                key={area.title}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(16, 38, 61, 0.08)",
                  borderTop: `4px solid ${area.accent}`,
                  borderRadius: 20,
                  padding: 22,
                  boxShadow: "0 10px 28px rgba(20, 40, 80, 0.06)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${area.accent}14`,
                    color: area.accent,
                    marginBottom: 16,
                  }}
                >
                  <Icon size={26} strokeWidth={2.1} />
                </div>

                <h3
                  style={{
                    margin: 0,
                    color: "#10263d",
                    fontSize: "1.08rem",
                    lineHeight: 1.35,
                    fontWeight: 800,
                  }}
                >
                  {area.title}
                </h3>

                <p
                  style={{
                    marginTop: 12,
                    marginBottom: 18,
                    color: "#51657b",
                    lineHeight: 1.8,
                    fontSize: "0.97rem",
                  }}
                >
                  {area.description}
                </p>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: area.accent,
                    fontWeight: 700,
                    fontSize: "0.92rem",
                  }}
                >
                  Explore theme <ArrowRight size={16} />
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom callout */}
        <div
          style={{
            marginTop: 34,
            borderRadius: 22,
            background: "#0f2742",
            color: "#ffffff",
            padding: "28px 24px",
            boxShadow: "0 12px 28px rgba(15,39,66,0.18)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.35rem",
              fontWeight: 800,
            }}
          >
            Research Beyond Boundaries
          </h3>
          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,0.86)",
              lineHeight: 1.8,
              maxWidth: 900,
            }}
          >
            We encourage collaborations among faculty, students, and external
            partners to develop mathematically grounded, computationally robust,
            and socially meaningful research projects.
          </p>
        </div>
      </div>
    </section>
  );
}
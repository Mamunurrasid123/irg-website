import Link from "next/link";
import { tools } from "../data/tools";

export default function ToolsPage() {
  return (
    <main className="container" style={{ padding: "40px 18px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 12 }}>
          IRG Open Research Tools
        </h1>

        <p style={{ marginBottom: 28, lineHeight: 1.7 }}>
          Free tools and services for students, researchers, and professionals.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {tools.map((tool) => (
            <div
              key={tool.title}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 20,
                background:"rgba(240, 217, 14, 0.81)",
                boxShadow: "0 4px 14px rgba(223, 64, 64, 0.66)",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
                {tool.title}
              </h2>

              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                {tool.description}
              </p>

              <ul style={{ paddingLeft: 18, marginBottom: 16 }}>
                {tool.features.map((feature) => (
                  <li key={feature} style={{ marginBottom: 6, fontSize: 14 }}>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={tool.href}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  border: "1px solid var(--border)",
                  fontWeight: 600,
                  background: "rgba(223, 64, 64, 0.66)",
                }}
              >
                Open Tool
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
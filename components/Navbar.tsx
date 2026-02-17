import Link from "next/link";
import Image from "next/image";

const nav = [
  { href: "/about", label: "About" },
  { href: "/research", label: "Research" },
  { href: "/members", label: "Teams" },
  { href: "/publications", label: "Publications" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
    // 👇 Add this
  { href: "/games/tic-tac-toe", label: "Interactive Projects" },
];

export default function Navbar() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#FFC000",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          gap: 14,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* AUW Logo */}
            <Image
              src="/irg-logo-final.png"
              alt="AUW"
              width={36}
              height={36}
              style={{ borderRadius: 10, background: "rgba(22, 111, 201, 0.7)", padding: 4, border: "1px solid var(--border)" }}
            />

            {/* IRG Logo (optional) */}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <div style={{ fontWeight: 900, letterSpacing: "-0.01em" }}>
                Interdisciplinary Research Group (IRG)
              </div>
             <div className="small" style={{ color: "white" }}>
  Asian University for Women • Chattogram
</div>

            </div>
          </div>
        </Link>

        <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 14 }}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid transparent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

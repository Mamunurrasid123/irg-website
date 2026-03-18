"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const nav = [
  { href: "/about", label: "About" },
  { href: "/research", label: "Research" },
  { href: "/members", label: "Teams" },
  { href: "/publications", label: "Publications" },
  { href: "/events", label: "Events" },
  { href: "/blog", label: "Blog" },
  { href: "/games/tic-tac-toe", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/contact", label: "Contact IRG" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#FFC000",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "inherit",
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <Image
              src="/irg-logo-final.png"
              alt="IRG Logo"
              width={36}
              height={36}
              style={{
                borderRadius: 10,
                background: "rgba(22, 111, 201, 0.7)",
                padding: 4,
                border: "1px solid var(--border)",
                flexShrink: 0,
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  letterSpacing: "-0.01em",
                  fontSize: "0.98rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Interdisciplinary Research Group (IRG)
              </div>
              <div
                className="small"
                style={{
                  color: "white",
                  fontSize: "0.78rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Asian University for Women • Chattogram
              </div>
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="desktop-nav">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "0px 0px",
                borderRadius: 10,
                border: "1px solid transparent",
                textDecoration: "none",
                color: "inherit",
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(!menuOpen)}
          className="mobile-menu-btn"
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            background: "rgba(255,255,255,0.35)",
            borderRadius: 10,
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                width: 18,
                height: 2,
                background: "#111",
                display: "block",
                borderRadius: 2,
              }}
            />
            <span
              style={{
                width: 18,
                height: 2,
                background: "#111",
                display: "block",
                borderRadius: 2,
              }}
            />
            <span
              style={{
                width: 18,
                height: 2,
                background: "#111",
                display: "block",
                borderRadius: 2,
              }}
            />
          </div>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="mobile-menu"
          style={{
            padding: "0 16px 14px 16px",
            borderTop: "1px solid rgba(0,0,0,0.08)",
            background: "#FFC000",
          }}
        >
          <nav
            style={{
              display: "grid",
              gap: 8,
              marginTop: 12,
            }}
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "inherit",
                  background: "rgba(255,255,255,0.32)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <style jsx>{`
        .desktop-nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .mobile-menu-btn {
          display: none !important;
        }

        @media (max-width: 980px) {
          .desktop-nav {
            display: none;
          }

          .mobile-menu-btn {
            display: flex !important;
          }
        }

        @media (max-width: 640px) {
          .container {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
      `}</style>
    </header>
  );
}
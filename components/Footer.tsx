"use client";

import { useEffect, useState } from "react";

export default function Footer() {

  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const formatted = now.toLocaleString("en-GB", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setDateTime(formatted);
    };

    updateTime();

    const interval = setInterval(updateTime, 1000); // update every second

    return () => clearInterval(interval);
  }, []);

  return (
    <footer style={{ borderTop: "1px solid var(--border)" }}>
      <div className="container" style={{ padding: "18px 18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 , color: "yellow" }}>
              Interdisciplinary Research Group (IRG)
            </div>

            <div className="small" style={{ color: "yellow" }}>
              Asian University for Women, Chattogram, Bangladesh
            </div>

            <div className="small" style={{ color: "yellow" }}>
              Local Time (Dhaka): {dateTime}
            </div>
          </div>

          <div className="small">
            © {new Date().getFullYear()} IRG • AUW
          </div>
        </div>
      </div>
    </footer>
  );
}
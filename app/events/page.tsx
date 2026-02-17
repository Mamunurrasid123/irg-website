const events = [
  { date: "2026-02-15", title: "IRG Seminar: Topic (Add)", place: "AUW Campus / Online" },
  { date: "2026-03-01", title: "Workshop: Python for Research (Add)", place: "AMDS Lab" },
];

export default function Events() {
  return (
    <div style={{ padding: "20px 20px", backgroundColor: "#cde4c7", borderRadius: 14, maxWidth: 1350, margin: "0 auto" }}>
      <h1>Events</h1>
      <p style={{ lineHeight: 1.8, maxWidth: 900 }}>
        Seminars, workshops, reading groups, student presentations, and special talks.
      </p>

      <div style={{ marginTop: 14, display: "grid", gap: 12, padding: 14, borderRadius: 14 }}>
        {events.map((e) => (
          <div key={e.date + e.title} style={{ border: "1px solid #e5e7eb", backgroundColor: "linear-gradient(to right, #1e3a8a, #2563eb)", borderRadius: 14, padding: 14 }}>
            <strong>{e.title}</strong>
            <div style={{ marginTop: 6, opacity: 0.9 }}>{e.date} • {e.place}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

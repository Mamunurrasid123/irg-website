
const pubs = [
  { year: "2026", title: "Publication Title (Add)", venue: "Journal/Conference (Add)", link: "" },
  { year: "2025", title: "Publication Title (Add)", venue: "Journal/Conference (Add)", link: "" },
];

export default function Publications() {
  return (
    <div style={{ padding: "20px 20px", backgroundColor: "#b1ceea", borderRadius: 14, maxWidth: 1350, margin: "0 auto" }}>
      <h1>Publications</h1>
      <p style={{ lineHeight: 1.8, maxWidth: 900 }}>
        Add IRG publications, working papers, and student thesis projects here. We can later connect this to BibTeX/CSV.
      </p>

      <ul style={{ lineHeight: 1.9, marginTop: 14 }}>
        {pubs.map((p, i) => (
          <li key={i}>
            <strong>{p.year} — {p.title}</strong>
            <div style={{ opacity: 0.85 }}>{p.venue}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

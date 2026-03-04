export default function Research() {
  return (
    <div>
      <h1>Research Areas</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 14, padding: 14, borderRadius: 14 }}>
        {[
          { t: "Numerical Solution of  PDEs & Scientific Computing", d: "Finite element methods, Lagrange–Galerkin schemes, stability & convergence." },
          { t: "AI, ML, and Data Science", 
  d: "Mathematical modeling, optimization, uncertainty quantification, theoretical evaluation, and reproducible machine learning frameworks." 
},
          { t: "AI for Social Good", d: "Applied ML, fairness, interpretability, education & health applications." },
          { t: "Climate / Coastal Modeling", d: "Shallow-water equations, coastal hazards, resilience analytics." },
        ].map((x) => (
          <div key={x.t} style={{ border: "1px solid #1753cb", borderRadius: 14, padding: 14,  backgroundColor: "#a0c9e0d5" }}>
            <strong>{x.t}</strong>
            <p style={{ marginTop: 8, lineHeight: 1.7 }}>{x.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

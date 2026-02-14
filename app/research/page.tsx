export default function Research() {
  return (
    <div>
      <h1>Research Areas</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 14, padding: 14, borderRadius: 14 }}>
        {[
          { t: "Numerical PDEs & Scientific Computing", d: "Finite element methods, Lagrange–Galerkin schemes, stability & convergence." },
          { t: "Data Science & Statistical Modeling", d: "Regression, sampling distributions, uncertainty, evaluation & reproducibility." },
          { t: "AI for Social Good", d: "Applied ML, fairness, interpretability, education & health applications." },
          { t: "Climate / Coastal Modeling", d: "Shallow-water equations, coastal hazards, resilience analytics." },
        ].map((x) => (
          <div key={x.t} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14,  backgroundColor: "#a0c9e0d5" }}>
            <strong>{x.t}</strong>
            <p style={{ marginTop: 8, lineHeight: 1.7 }}>{x.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

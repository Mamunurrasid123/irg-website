export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "#FFC000" }} >
      <div className="container" style={{ padding: "18px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Interdisciplinary Research Group (IRG)</div>
            <div className="small">Asian University for Women, Chattogram, Bangladesh</div>
          </div>
          <div className="small">© {new Date().getFullYear()} IRG • AUW</div>
        </div>
      </div>
    </footer>
  );
}

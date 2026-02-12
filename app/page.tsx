import Link from "next/link";

export default function Home() {
  return (
    <div >
      <section className="hero" style={{ maxWidth: 1350, margin: "0 auto", padding: "10px 10px" }}>
        <div className="kicker" >Research • Collaboration • Student Mentoring</div>

        <h1 className="h1" style={{ marginTop: 12 }}>
          Interdisciplinary Research Group (IRG)
        </h1>

        <p className="p" style={{ maxWidth: 920 }}>
          A research community at Asian University for Women connecting mathematics, data science, computing, and
          interdisciplinary domains to address real-world challenges through rigorous, ethical, and collaborative research.
        </p>

        <div className="btnRow">
          <Link className="btn btnPrimary" href="/research">Explore Research</Link>
          <Link className="btn" href="/members">Meet the Team</Link>
          <Link className="btn" href="/contact">Join / Contact</Link>
        </div>

        <div className="divider" />

        <div className="grid grid-3">
          <div className="card">
            <div style={{ fontWeight: 700 }}>Seminars & Reading Groups</div>
            <p className="p">Weekly discussions, paper reading, student presentations, and invited talks.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>Student Research Mentoring</div>
            <p className="p">Project incubation, supervision, and training for graduate study and conferences.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>Publications & Grants</div>
            <p className="p">Collaborative research, manuscripts, proposals, and interdisciplinary partnerships.</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 20px" }}>
        <div style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Core Themes
          </h2>

          <div
            style={{
              width: 60,
              height: 4,
              background: "linear-gradient(to right, #1e3a8a, #2563eb)",
              marginTop: 0,
              borderRadius: 6,
            }}
          />
        </div>
        {/* <h2 className="h2" style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
            }}>Core Themes</h2> */}

        <div className="grid grid-4" style={{ marginTop: 12 }}>
          {[
            { t: "Computational Mathematics", d: "Numerical PDEs, scientific computing, modeling & simulation." },
            { t: "AI / Machine Learning", d: "Responsible ML, applied AI for social impact, reliable systems." },
            { t: "Statistics & Data Science", d: "Inference, uncertainty quantification, evaluation & reproducibility." },
            { t: "Climate & Sustainability", d: "Coastal/environmental modeling, resilience & risk analytics." },
          ].map((x) => (
            <div key={x.t} className="card">
              <div style={{ fontWeight: 700 }}>{x.t}</div>
              <p className="p">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 20px" }}>
        <div style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Quick Links
          </h2>

          <div
            style={{
              width: 60,
              height: 4,
              background: "linear-gradient(to right, #1e3a8a, #2563eb)",
              marginTop: 10,
              borderRadius: 6,
            }}
          />
        </div>

        {/* <div style={{ marginBottom: 30 }}></div>
        <h2 className="h2" style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
              marginBottom: 30,
            }}>Quick Links</h2> */}
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 700 }}>For Students</div>
            <p className="p">How to join as a researcher, required skills, and ongoing projects.</p>
            <div className="btnRow">
              <Link className="btn" href="/contact">Join IRG</Link>
              <Link className="btn" href="/events">Upcoming Events</Link>
            </div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>For Collaborators</div>
            <p className="p">Partnership opportunities, seminars, and shared research initiatives.</p>
            <div className="btnRow">
              <Link className="btn" href="/about">About IRG</Link>
              <Link className="btn" href="/publications">Publications</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

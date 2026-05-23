import React from "react";
import "./Opportunities.css";

const OpportunitiesSection: React.FC = () => {
  return (
    <section className="opportunities-section" id="opportunities">
      <div className="section-header">
        <span className="section-badge">
          Student Research • Training • Mentoring
        </span>

        <h2>Join IRG Research Initiatives</h2>

        <p>
          Explore student research opportunities in applied mathematics,
          numerical simulation, scientific computing, data science, and
          interdisciplinary research.
        </p>
      </div>

      <div className="opportunity-grid">
        <div className="opportunity-card featured">
          <span className="opportunity-label">Open Now</span>

          <h3>Finite Element Methods & Numerical Simulation</h3>

          <p>
            Join ongoing research projects involving FEM, CFD, PDEs, MHD,
            Lagrange–Galerkin methods, and FreeFem++ simulations.
          </p>

          <div className="tags">
            <span>FEM</span>
            <span>CFD</span>
            <span>PDE</span>
            <span>MHD</span>
            <span>FreeFem++</span>
          </div>

          <div className="opportunity-actions">
            <a
              href="/opportunities/fem-numerical-simulation"
              className="primary-btn"
            >
              Learn More
            </a>

            <a href="#contact" className="secondary-btn">
              Apply / Contact
            </a>
          </div>
        </div>

        <div className="opportunity-card">
          <h3>Data Science & AI Research</h3>

          <p>
            Participate in projects related to machine learning, data analysis,
            predictive modeling, and interdisciplinary AI applications.
          </p>

          <div className="tags">
            <span>AI</span>
            <span>ML</span>
            <span>Python</span>
            <span>Analytics</span>
          </div>
        </div>

        <div className="opportunity-card">
          <h3>Mathematical Modeling & Simulation</h3>

          <p>
            Work on mathematical modeling and computational projects connected to
            biological, physical, social, and real-world systems.
          </p>

          <div className="tags">
            <span>Modeling</span>
            <span>Simulation</span>
            <span>Optimization</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpportunitiesSection;
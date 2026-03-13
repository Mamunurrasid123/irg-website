"use client";

import { useMemo, useState } from "react";

type TailType = "left" | "right" | "two";

export default function PValueCalculatorPage() {
  const [zScore, setZScore] = useState("");
  const [tailType, setTailType] = useState<TailType>("two");
  const [submitted, setSubmitted] = useState(false);

  const z = useMemo(() => {
    const value = parseFloat(zScore);
    return Number.isFinite(value) ? value : null;
  }, [zScore]);

  function erf(x: number) {
    const sign = x >= 0 ? 1 : -1;
    const absX = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * absX);
    const y =
      1 -
      (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
        t *
        Math.exp(-absX * absX));

    return sign * y;
  }

  function normalCDF(x: number) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
  }

  const result = useMemo(() => {
    if (z === null) return null;

    const phiZ = normalCDF(z);
    const phiAbsZ = normalCDF(Math.abs(z));

    let pValue = 0;
    let step3 = "";
    let finalFormula = "";

    if (tailType === "left") {
      pValue = phiZ;
      finalFormula = `p = P(Z \\le ${z.toFixed(4)}) = \\Phi(${z.toFixed(4)})`;
      step3 = `p = \\Phi(${z.toFixed(4)}) = ${pValue.toFixed(6)}`;
    } else if (tailType === "right") {
      pValue = 1 - phiZ;
      finalFormula = `p = P(Z \\ge ${z.toFixed(4)}) = 1 - \\Phi(${z.toFixed(4)})`;
      step3 = `p = 1 - ${phiZ.toFixed(6)} = ${pValue.toFixed(6)}`;
    } else {
      pValue = 2 * (1 - phiAbsZ);
      finalFormula = `p = 2P(Z \\ge |${z.toFixed(4)}|) = 2\\left(1 - \\Phi(|${z.toFixed(
        4
      )}|)\\right)`;
      step3 = `p = 2(1 - ${phiAbsZ.toFixed(6)}) = ${pValue.toFixed(6)}`;
    }

    return {
      z,
      phiZ,
      phiAbsZ,
      pValue,
      finalFormula,
      step3,
    };
  }, [z, tailType]);

  function handleCalculate() {
    setSubmitted(true);
  }

  return (
    <div className="container" style={{ padding: "40px 20px", maxWidth: 900,background: "rgba(240, 217, 14, 0.81)", borderRadius: 16 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 10 }}>
        P-value Calculator
      </h1>

      <p style={{ color: "#555", lineHeight: 1.7, marginBottom: 28 }}>
        Calculate p-values for common hypothesis-testing situations and view the
        mathematical steps used in the computation. This version currently
        supports p-value calculation from a Z-statistic.
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 24,
          background: "#fff",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 18 }}>
          Input
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
          }}
        >
          <div>
            <label
              htmlFor="zScore"
              style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
            >
              Z-score
            </label>
            <input
              id="zScore"
              type="number"
              step="any"
              value={zScore}
              onChange={(e) => setZScore(e.target.value)}
              placeholder="Enter a z value, e.g. 1.96"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: "1rem",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="tailType"
              style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
            >
              Test type
            </label>
            <select
              id="tailType"
              value={tailType}
              onChange={(e) => setTailType(e.target.value as TailType)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #ccc",
                borderRadius: 8,
                fontSize: "1rem",
              }}
            >
              <option value="left">Left-tailed test</option>
              <option value="right">Right-tailed test</option>
              <option value="two">Two-tailed test</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          style={{
            marginTop: 20,
            background: "#FFC000",
            color: "#000",
            border: "none",
            borderRadius: 8,
            padding: "12px 18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Calculate
        </button>

        {submitted && z === null && (
          <p style={{ color: "crimson", marginTop: 16 }}>
            Please enter a valid numeric Z-score.
          </p>
        )}
      </div>

      {submitted && result && (
        <>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 24,
              background: "#fff",
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 16 }}>
              Result
            </h2>

            <p style={{ fontSize: "1.05rem", marginBottom: 10 }}>
              <strong>Z-score:</strong> {result.z.toFixed(4)}
            </p>
            <p style={{ fontSize: "1.05rem", marginBottom: 10 }}>
              <strong>Test type:</strong>{" "}
              {tailType === "left"
                ? "Left-tailed"
                : tailType === "right"
                ? "Right-tailed"
                : "Two-tailed"}
            </p>
            <p style={{ fontSize: "1.15rem", marginBottom: 0 }}>
              <strong>P-value:</strong> {result.pValue.toFixed(6)}
            </p>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 24,
              background: "#fff",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 16 }}>
              Mathematical Steps
            </h2>

            <div style={{ lineHeight: 1.9, fontSize: "1rem", color: "#222" }}>
              <p>
                <strong>Step 1:</strong> Identify the test statistic.
              </p>
              <div
                style={{
                  background: "#f8f8f8",
                  padding: "12px 14px",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontFamily: "monospace",
                }}
              >
                z = {result.z.toFixed(4)}
              </div>

              <p>
                <strong>Step 2:</strong> Choose the p-value formula based on the
                alternative hypothesis.
              </p>
              <div
                style={{
                  background: "#f8f8f8",
                  padding: "12px 14px",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {tailType === "left" &&
                  "For a left-tailed test:\np = P(Z ≤ z) = Φ(z)"}
                {tailType === "right" &&
                  "For a right-tailed test:\np = P(Z ≥ z) = 1 - Φ(z)"}
                {tailType === "two" &&
                  "For a two-tailed test:\np = 2P(Z ≥ |z|) = 2(1 - Φ(|z|))"}
              </div>

              <p>
                <strong>Step 3:</strong> Use the standard normal distribution
                function.
              </p>
              <div
                style={{
                  background: "#f8f8f8",
                  padding: "12px 14px",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {tailType === "left" && `Φ(${result.z.toFixed(4)}) = ${result.phiZ.toFixed(6)}`}
                {tailType === "right" && `Φ(${result.z.toFixed(4)}) = ${result.phiZ.toFixed(6)}`}
                {tailType === "two" &&
                  `Φ(|${result.z.toFixed(4)}|) = Φ(${Math.abs(result.z).toFixed(
                    4
                  )}) = ${result.phiAbsZ.toFixed(6)}`}
              </div>

              <p>
                <strong>Step 4:</strong> Substitute into the formula.
              </p>
              <div
                style={{
                  background: "#f8f8f8",
                  padding: "12px 14px",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {result.finalFormula}
                {"\n"}
                {result.step3}
              </div>

              <p>
                <strong>Conclusion:</strong> The computed p-value is{" "}
                <strong>{result.pValue.toFixed(6)}</strong>.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
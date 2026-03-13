"use client";

import React, { useMemo, useState } from "react";

type AngleMode = "DEG" | "RAD";

type HistoryItem = {
  expression: string;
  result: string;
};

const buttonBase: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "8px 4px",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.18s ease",
  boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
  minHeight: 36,
};

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  if (Math.abs(value) < 1e-12) return "0";
  const rounded = Number(value.toPrecision(12));
  return String(rounded);
}

function factorial(n: number): number {
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    throw new Error("Factorial is defined for non-negative integers only.");
  }
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function toRadians(x: number, mode: AngleMode): number {
  return mode === "DEG" ? (x * Math.PI) / 180 : x;
}

function fromRadians(x: number, mode: AngleMode): number {
  return mode === "DEG" ? (x * 180) / Math.PI : x;
}

function sanitizeExpression(expr: string): string {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "PI")
    .replace(/\be\b/g, "E_CONST")
    .replace(/√\(/g, "sqrt(")
    .replace(/\^/g, "**");
}

function transformFunctions(expr: string, angleMode: AngleMode): string {
  let s = sanitizeExpression(expr);

  const wrapTrig = (name: string, inner: string) =>
    `${name}(toRad(${inner}))`;
  const wrapInvTrig = (name: string, inner: string) =>
    `fromRad(${name}(${inner}))`;

  s = s.replace(/sin\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) =>
    wrapTrig("Math.sin", inner)
  );
  s = s.replace(/cos\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) =>
    wrapTrig("Math.cos", inner)
  );
  s = s.replace(/tan\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) =>
    wrapTrig("Math.tan", inner)
  );

  s = s.replace(/asin\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) =>
    wrapInvTrig("Math.asin", inner)
  );
  s = s.replace(/acos\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) =>
    wrapInvTrig("Math.acos", inner)
  );
  s = s.replace(/atan\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) =>
    wrapInvTrig("Math.atan", inner)
  );

  s = s.replace(/ln\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "Math.log($1)");
  s = s.replace(/log\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "Math.log10($1)");
  s = s.replace(/sqrt\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "Math.sqrt($1)");
  s = s.replace(/abs\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "Math.abs($1)");
  s = s.replace(/exp\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "Math.exp($1)");

  s = s.replace(/(\d+|\([^()]+\)|PI|E_CONST)!/g, "fact($1)");

  if (angleMode === "RAD") {
    s = s.replace(/toRad\(/g, "(").replace(/fromRad\(/g, "(");
  }

  return s;
}

function evaluateExpression(expr: string, angleMode: AngleMode): string {
  if (!expr.trim()) return "";

  try {
    const transformed = transformFunctions(expr, angleMode);

    const evaluator = new Function(
      "PI",
      "E_CONST",
      "fact",
      "toRad",
      "fromRad",
      `
        return (${transformed});
      `
    );

    const value = evaluator(
      Math.PI,
      Math.E,
      factorial,
      (x: number) => toRadians(x, angleMode),
      (x: number) => fromRadians(x, angleMode)
    );

    return formatResult(value);
  } catch {
    return "Error";
  }
}

export default function ScientificCalculatorPage() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const livePreview = useMemo(() => {
    if (!expression.trim()) return "";
    return evaluateExpression(expression, angleMode);
  }, [expression, angleMode]);

  const append = (value: string) => {
    setExpression((prev) => prev + value);
  };

  const clearAll = () => {
    setExpression("");
    setResult("0");
  };

  const backspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const calculate = () => {
    const computed = evaluateExpression(expression, angleMode);
    setResult(computed);

    if (computed !== "Error" && expression.trim()) {
      setHistory((prev) => [
        { expression, result: computed },
        ...prev.slice(0, 11),
      ]);
      setExpression(computed);
    }
  };

  const useHistory = (item: HistoryItem) => {
    setExpression(item.expression);
    setResult(item.result);
  };

  const clearHistory = () => setHistory([]);

  const memoryRecall = () => append(String(memory));
  const memoryClear = () => setMemory(0);
  const memoryAdd = () => {
    const current = Number(evaluateExpression(expression || result, angleMode));
    if (Number.isFinite(current)) setMemory((m) => m + current);
  };
  const memorySubtract = () => {
    const current = Number(evaluateExpression(expression || result, angleMode));
    if (Number.isFinite(current)) setMemory((m) => m - current);
  };

  const btn = (
    label: string,
    onClick: () => void,
    style?: React.CSSProperties
  ) => (
    <button
      onClick={onClick}
      style={{
        ...buttonBase,
        background: "rgba(255,255,255,0.92)",
        color: "#18212f",
        ...style,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at top left, #fff5cc 0%, #fff9e8 28%, #eef5ff 65%, #e8eefc 100%)",
        padding: "60px 60px",
      }}
    >
      <div className="calc-layout">
        <div
          style={{
            borderRadius: 20,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 16px 36px rgba(30, 41, 59, 0.12)",
            border: "1px solid rgba(255,255,255,0.75)",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "14px 14px 8px",
              background:
                "linear-gradient(135deg, rgba(255,192,0,0.16), rgba(72,129,255,0.08))",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#132033",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Scientific Calculator
                </h1>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#445066",
                    lineHeight: 1.4,
                    fontSize: "0.8rem",
                  }}
                >
                  Compact scientific calculator with advanced functions.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "5px 8px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.85)",
                    fontWeight: 700,
                    color: "#24324a",
                    fontSize: "0.74rem",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  M: {formatResult(memory)}
                </span>

                <div
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    padding: 3,
                    background: "rgba(255,255,255,0.85)",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  <button
                    onClick={() => setAngleMode("DEG")}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "5px 9px",
                      fontWeight: 700,
                      fontSize: "0.74rem",
                      cursor: "pointer",
                      background:
                        angleMode === "DEG" ? "#FFC000" : "transparent",
                      color: "#1a2232",
                    }}
                  >
                    DEG
                  </button>
                  <button
                    onClick={() => setAngleMode("RAD")}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "5px 9px",
                      fontWeight: 700,
                      fontSize: "0.74rem",
                      cursor: "pointer",
                      background:
                        angleMode === "RAD" ? "#FFC000" : "transparent",
                      color: "#1a2232",
                    }}
                  >
                    RAD
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 14 }}>
            <div
              style={{
                borderRadius: 16,
                background:
                  "linear-gradient(180deg, #0f172a 0%, #1f2937 100%)",
                color: "#f8fafc",
                padding: 14,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  minHeight: 20,
                  fontSize: "0.82rem",
                  color: "#b8c5dd",
                  textAlign: "right",
                  wordBreak: "break-word",
                }}
              >
                {expression || "0"}
              </div>
              <div
                style={{
                  minHeight: 36,
                  marginTop: 6,
                  fontSize: "1.45rem",
                  fontWeight: 800,
                  textAlign: "right",
                  wordBreak: "break-word",
                }}
              >
                {result}
              </div>
              <div
                style={{
                  marginTop: 4,
                  textAlign: "right",
                  color:
                    livePreview && livePreview !== "Error"
                      ? "#8de1a5"
                      : "#c8d2e2",
                  minHeight: 16,
                  fontWeight: 600,
                  fontSize: "0.72rem",
                }}
              >
                {expression ? `Preview: ${livePreview}` : ""}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: 6,
              }}
            >
              {btn("MC", memoryClear, { background: "#ffe7cc", color: "#8a4b00" })}
              {btn("MR", memoryRecall, { background: "#ffe7cc", color: "#8a4b00" })}
              {btn("M+", memoryAdd, { background: "#ffe7cc", color: "#8a4b00" })}
              {btn("M−", memorySubtract, { background: "#ffe7cc", color: "#8a4b00" })}
              {btn("(", () => append("("), { background: "#edf4ff", color: "#1d4ed8" })}
              {btn(")", () => append(")"), { background: "#edf4ff", color: "#1d4ed8" })}

              {btn("sin", () => append("sin("), { background: "#eef9ff", color: "#0369a1" })}
              {btn("cos", () => append("cos("), { background: "#eef9ff", color: "#0369a1" })}
              {btn("tan", () => append("tan("), { background: "#eef9ff", color: "#0369a1" })}
              {btn("asin", () => append("asin("), { background: "#eef9ff", color: "#0369a1" })}
              {btn("acos", () => append("acos("), { background: "#eef9ff", color: "#0369a1" })}
              {btn("atan", () => append("atan("), { background: "#eef9ff", color: "#0369a1" })}

              {btn("log", () => append("log("), { background: "#f6f0ff", color: "#6d28d9" })}
              {btn("ln", () => append("ln("), { background: "#f6f0ff", color: "#6d28d9" })}
              {btn("√", () => append("sqrt("), { background: "#f6f0ff", color: "#6d28d9" })}
              {btn("x²", () => append("^2"), { background: "#f6f0ff", color: "#6d28d9" })}
              {btn("xʸ", () => append("^"), { background: "#f6f0ff", color: "#6d28d9" })}
              {btn("!", () => append("!"), { background: "#f6f0ff", color: "#6d28d9" })}

              {btn("π", () => append("π"), { background: "#eefcf4", color: "#15803d" })}
              {btn("e", () => append("e"), { background: "#eefcf4", color: "#15803d" })}
              {btn("abs", () => append("abs("), { background: "#eefcf4", color: "#15803d" })}
              {btn("exp", () => append("exp("), { background: "#eefcf4", color: "#15803d" })}
              {btn("⌫", backspace, { background: "#ffe6ea", color: "#be123c" })}
              {btn("AC", clearAll, { background: "#ffd9e0", color: "#be123c" })}

              {btn("7", () => append("7"))}
              {btn("8", () => append("8"))}
              {btn("9", () => append("9"))}
              {btn("÷", () => append("÷"), { background: "#fff4d6", color: "#9a6700" })}
              {btn("%", () => append("/100"), { background: "#fff4d6", color: "#9a6700" })}
              {btn("Ans", () => append(result), { background: "#fff4d6", color: "#9a6700" })}

              {btn("4", () => append("4"))}
              {btn("5", () => append("5"))}
              {btn("6", () => append("6"))}
              {btn("×", () => append("×"), { background: "#fff4d6", color: "#9a6700" })}
              {btn("1/x", () => append("1/("), { background: "#fff4d6", color: "#9a6700" })}
              {btn("±", () => append("(-"), { background: "#fff4d6", color: "#9a6700" })}

              {btn("1", () => append("1"))}
              {btn("2", () => append("2"))}
              {btn("3", () => append("3"))}
              {btn("-", () => append("-"), { background: "#fff4d6", color: "#9a6700" })}
              {btn(".", () => append("."))}
              {btn("=", calculate, {
                background: "linear-gradient(135deg, #FFC000, #ff9f1a)",
                color: "#111827",
                fontWeight: 800,
              })}

              <button
                onClick={() => append("0")}
                style={{
                  ...buttonBase,
                  gridColumn: "span 2",
                  background: "rgba(255,255,255,0.92)",
                  color: "#18212f",
                }}
              >
                0
              </button>
              {btn("+", () => append("+"), { background: "#fff4d6", color: "#9a6700" })}
              {btn("mod", () => append("%"), { background: "#fff4d6", color: "#9a6700" })}
              {btn("C", clearAll, { background: "#ffd9e0", color: "#be123c" })}
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 14,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(0,0,0,0.06)",
                padding: 12,
              }}
            >
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.88rem",
                  color: "#1f2a3d",
                }}
              >
                Mathematical Notes
              </h3>
              <div
                style={{
                  color: "#516076",
                  lineHeight: 1.55,
                  fontSize: "0.76rem",
                }}
              >
                <div>• Trigonometric functions use the selected angle mode.</div>
                <div>• log is base 10 and ln is natural logarithm.</div>
                <div>• Use xʸ for powers and √ for roots.</div>
                <div>• Factorial works for non-negative integers only.</div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            background: "rgba(255,255,255,0.74)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 16px 36px rgba(30, 41, 59, 0.10)",
            border: "1px solid rgba(255,255,255,0.75)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              background:
                "linear-gradient(135deg, rgba(72,129,255,0.10), rgba(255,192,0,0.14))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#132033",
                }}
              >
                History
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#5c6980",
                  fontSize: "0.76rem",
                }}
              >
                Reuse previous results.
              </p>
            </div>

            <button
              onClick={() => setShowHistory((s) => !s)}
              style={{
                ...buttonBase,
                padding: "7px 10px",
                minHeight: 32,
                background: "#ffffff",
                color: "#1d4ed8",
                fontSize: "0.75rem",
              }}
            >
              {showHistory ? "Hide" : "Show"}
            </button>
          </div>

          <div style={{ padding: 14, flex: 1 }}>
            {showHistory ? (
              history.length > 0 ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        color: "#5a667b",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                      }}
                    >
                      Recent Calculations
                    </span>
                    <button
                      onClick={clearHistory}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#be123c",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.74rem",
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {history.map((item, index) => (
                      <button
                        key={`${item.expression}-${index}`}
                        onClick={() => useHistory(item)}
                        style={{
                          textAlign: "left",
                          border: "1px solid rgba(0,0,0,0.06)",
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.92)",
                          padding: 10,
                          cursor: "pointer",
                          boxShadow: "0 6px 14px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div
                          style={{
                            color: "#5d6a7f",
                            fontSize: "0.74rem",
                            marginBottom: 4,
                            wordBreak: "break-word",
                          }}
                        >
                          {item.expression}
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            color: "#122033",
                            fontSize: "0.9rem",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.result}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px dashed rgba(0,0,0,0.12)",
                    background: "rgba(255,255,255,0.62)",
                    padding: 16,
                    color: "#5c6980",
                    lineHeight: 1.6,
                    fontSize: "0.78rem",
                  }}
                >
                  No calculations yet. Build an expression and press{" "}
                  <strong>=</strong>.
                </div>
              )
            ) : (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px dashed rgba(0,0,0,0.12)",
                  background: "rgba(255,255,255,0.62)",
                  padding: 16,
                  color: "#5c6980",
                  fontSize: "0.78rem",
                }}
              >
                History panel is hidden.
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, rgba(255,192,0,0.14), rgba(72,129,255,0.08))",
                padding: 12,
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.84rem",
                  color: "#1f2a3d",
                }}
              >
                Quick Guide
              </h3>
              <div
                style={{
                  color: "#516076",
                  lineHeight: 1.55,
                  fontSize: "0.74rem",
                }}
              >
                <div>• sin(30)+log(100)</div>
                <div>• sqrt(25)+5^2</div>
                <div>• 3!+2^3</div>
                <div>• asin(0.5)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .calc-layout {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 14px;
        }

        @media (max-width: 900px) {
          .calc-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .calc-layout {
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
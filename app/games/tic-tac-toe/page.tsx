"use client";

import React, { useEffect, useMemo, useState } from "react";

type Player = "X" | "O";
type Cell = Player | null;
type Level = "easy" | "hard";
type Mode = "human" | "computer";

type ProjectType = "game" | "tool" | "analysis" | "research";

type Project = {
  id: string;
  title: string;
  category: string;
  type: ProjectType;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  technologies: string[];
  status: "Live Demo" | "Prototype" | "Ready" | "In Progress";
  outputLabel: string;
};

const PROJECTS: Project[] = [
  {
    id: "tic-tac-toe",
    title: "Tic-Tac-Toe AI Lab",
    category: "Interactive Game",
    type: "game",
    shortDescription:
      "Playable human-vs-human and human-vs-computer game with easy and unbeatable AI modes.",
    fullDescription:
      "This interactive project demonstrates game logic, decision trees, minimax optimization, and live user interaction in a clean browser-based environment. It is designed as a compact AI game laboratory where users can explore strategic decision-making and algorithmic play.",
    features: [
      "Vs Computer mode",
      "Vs Human mode",
      "Easy and unbeatable AI",
      "Live winner highlighting",
      "Interactive restart and replay",
    ],
    technologies: ["React", "TypeScript", "Minimax Algorithm", "Game Logic"],
    status: "Live Demo",
    outputLabel: "Live Interactive Demo",
  },
  {
    id: "scientific-calculator",
    title: "Scientific Calculator Studio",
    category: "Mathematical Tool",
    type: "tool",
    shortDescription:
      "Advanced mathematical calculator for trigonometric, logarithmic, and scientific expressions.",
    fullDescription:
      "This project provides an interactive scientific calculator environment suitable for classroom demonstration, mathematical experimentation, and student support. It can be expanded to include symbolic operations, plotting, and additional educational utilities.",
    features: [
      "Scientific functions",
      "Trigonometric evaluation",
      "Mathematical expression support",
      "Preview-driven interface",
      "Educational calculator workflow",
    ],
    technologies: ["React", "TypeScript", "Expression Parsing"],
    status: "Prototype",
    outputLabel: "Tool Preview",
  },
  {
    id: "regression-tool",
    title: "Regression and Prediction Lab",
    category: "Data Science Tool",
    type: "analysis",
    shortDescription:
      "A research-oriented environment for regression analysis, prediction, and model-based interpretation.",
    fullDescription:
      "This module is designed as a data science and applied mathematics analysis workspace where students and researchers can upload data, select variables, examine relationships, fit regression models, and study predictive behavior in an intuitive browser interface.",
    features: [
      "Regression workflow",
      "Prediction support",
      "Variable selection",
      "Model interpretation",
      "Research-ready output structure",
    ],
    technologies: ["React", "TypeScript", "Data Analysis", "Prediction"],
    status: "Prototype",
    outputLabel: "Analysis Output",
  },
  {
    id: "excel-summary",
    title: "Excel Summary Generator",
    category: "Dataset Intelligence",
    type: "analysis",
    shortDescription:
      "Fast structured overview of spreadsheet datasets including variable summaries and missing values.",
    fullDescription:
      "This project is intended as a rapid exploratory analysis tool for uploaded spreadsheet and CSV data. It supports descriptive understanding of datasets and can serve as an entry point for deeper statistical or machine learning workflows.",
    features: [
      "Excel and CSV upload",
      "Descriptive overview",
      "Missing value summary",
      "Variable type inspection",
      "Research data preparation",
    ],
    technologies: ["React", "TypeScript", "Spreadsheet Processing"],
    status: "Prototype",
    outputLabel: "Dataset Overview",
  },
  {
    id: "pvalue-lab",
    title: "P-Value and Test Decision Lab",
    category: "Statistical Decision Tool",
    type: "tool",
    shortDescription:
      "Interactive environment for computing p-values and interpreting common hypothesis test results.",
    fullDescription:
      "This module acts as a guided decision-support interface for statistical testing. It can help students understand significance, p-values, test direction, and inference logic in a transparent way with immediate visual or numerical output.",
    features: [
      "P-value calculation",
      "Test interpretation",
      "Educational output",
      "Inference support",
      "Student-friendly workflow",
    ],
    technologies: ["React", "TypeScript", "Statistical Logic"],
    status: "In Progress",
    outputLabel: "Computation Panel",
  },
  {
    id: "math-research-board",
    title: "Mathematics Research Dashboard",
    category: "Research Platform",
    type: "research",
    shortDescription:
      "A conceptual interface for showcasing mathematical models, notes, tools, and live project outputs.",
    fullDescription:
      "This research dashboard is intended as a curated digital lab space for interactive mathematics, data science, and interdisciplinary research projects. It can present tools, visual outputs, project summaries, code demonstrations, and teaching or research artifacts in one unified experience.",
    features: [
      "Research project view",
      "Lab-style presentation",
      "Expandable outputs",
      "Teaching and research integration",
      "Interactive showcase design",
    ],
    technologies: ["React", "TypeScript", "Interactive UI", "Research Presentation"],
    status: "Ready",
    outputLabel: "Research Preview",
  },
];

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: Cell[]) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line };
    }
  }
  return { winner: null as Player | null, line: null as number[] | null };
}

function availableMoves(board: Cell[]) {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

function minimax(board: Cell[], turn: Player): { score: number; index?: number } {
  const { winner } = checkWinner(board);

  if (winner === "O") return { score: 10 };
  if (winner === "X") return { score: -10 };
  if (board.every(Boolean)) return { score: 0 };

  const moves = availableMoves(board).map((idx) => {
    const next = board.slice();
    next[idx] = turn;
    const result = minimax(next, turn === "O" ? "X" : "O");
    return { index: idx, score: result.score };
  });

  if (turn === "O") {
    let best = moves[0];
    for (const m of moves) if (m.score > best.score) best = m;
    return best;
  } else {
    let best = moves[0];
    for (const m of moves) if (m.score < best.score) best = m;
    return best;
  }
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(255,255,255,0.85)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: "0.78rem", color: "#5b6577", fontWeight: 700 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: "1.7rem",
          fontWeight: 900,
          color: "#142033",
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", color: "#6a7587", marginTop: 4 }}>
        {subtitle}
      </div>
    </div>
  );
}

function StatusPill({ text }: { text: string }) {
  const styleMap: Record<string, React.CSSProperties> = {
    "Live Demo": { background: "#e7f8ec", color: "#0f7a36" },
    Ready: { background: "#eef5ff", color: "#1d4ed8" },
    Prototype: { background: "#fff6db", color: "#8a5a00" },
    "In Progress": { background: "#ffe9ec", color: "#be123c" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 11px",
        fontSize: "0.75rem",
        fontWeight: 800,
        ...styleMap[text],
      }}
    >
      {text}
    </span>
  );
}

function PlaceholderPanel({
  title,
  text,
  outputLabel,
}: {
  title: string;
  text: string;
  outputLabel: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.82)",
        borderRadius: 24,
        padding: 24,
        border: "1px solid rgba(255,255,255,0.85)",
        boxShadow: "0 16px 34px rgba(0,0,0,0.09)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "#eef5ff",
          color: "#1d4ed8",
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: "0.75rem",
          fontWeight: 800,
          marginBottom: 14,
        }}
      >
        {outputLabel}
      </div>
      <h3 style={{ marginTop: 0, marginBottom: 12, color: "#132033" }}>{title}</h3>
      <p style={{ margin: 0, lineHeight: 1.8, color: "#4d5a70" }}>{text}</p>

      <div
        style={{
          marginTop: 18,
          borderRadius: 18,
          background: "linear-gradient(135deg,#f8fbff,#fffdf4)",
          border: "1px dashed #cbd5e1",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 800, color: "#1f2a3d", marginBottom: 8 }}>
          Suggested live integration
        </div>
        <div style={{ color: "#5a667b", lineHeight: 1.7, fontSize: "0.92rem" }}>
          Replace this placeholder with your real project component. For example,
          the scientific calculator, regression interface, Excel upload dashboard,
          or p-value tool can be rendered here when selected.
        </div>
      </div>
    </div>
  );
}

function TicTacToeLab() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [gameOver, setGameOver] = useState(false);

  const [mode, setMode] = useState<Mode>("computer");
  const [level, setLevel] = useState<Level>("hard");
  const [firstPlayer, setFirstPlayer] = useState<Player>("X");

  const [locked, setLocked] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const { winner, line } = useMemo(() => checkWinner(board), [board]);
  const draw = useMemo(() => board.every(Boolean) && !winner, [board, winner]);

  useEffect(() => {
    if (winner || draw) setGameOver(true);
  }, [winner, draw]);

  useEffect(() => {
    if (winner) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2200);
      return () => clearTimeout(t);
    }
  }, [winner]);

  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, firstPlayer]);

  useEffect(() => {
    if (mode !== "computer") return;
    if (gameOver) return;
    if (current !== "O") return;

    setLocked(true);

    const t = setTimeout(() => {
      const empties = availableMoves(board);
      if (empties.length === 0) return;

      let move: number;
      if (level === "easy") {
        move = empties[Math.floor(Math.random() * empties.length)];
      } else {
        move = minimax(board, "O").index ?? empties[0];
      }

      setBoard((prev) => {
        const next = prev.slice();
        next[move] = "O";
        return next;
      });
      setCurrent("X");
      setLocked(false);
    }, 300);

    return () => clearTimeout(t);
  }, [board, current, gameOver, level, mode]);

  function clickCell(i: number) {
    if (gameOver) return;
    if (locked) return;
    if (board[i]) return;
    if (mode === "computer" && current !== "X") return;

    const next = board.slice();
    next[i] = current;
    setBoard(next);
    setCurrent(current === "X" ? "O" : "X");
  }

  function resetGame() {
    setBoard(Array(9).fill(null));
    setCurrent(firstPlayer);
    setGameOver(false);
    setLocked(false);
    setCelebrate(false);
  }

  const status = winner
    ? `Winner: ${winner} 🎉`
    : draw
    ? "Draw! 🤝"
    : mode === "computer"
    ? current === "X"
      ? "Your turn (X)"
      : "Computer thinking… (O)"
    : `Turn: ${current}`;

  const selectStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #e7eb0c",
    fontWeight: 900,
    background: "white",
  };

  const btnBase: React.CSSProperties = {
    padding: "9px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.86)",
        borderRadius: 24,
        padding: 22,
        boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
        border: "1px solid rgba(255,255,255,0.85)",
        overflow: "hidden",
      }}
    >
      {celebrate && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(220, 195, 11, 0.92)",
            display: "grid",
            placeItems: "center",
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 1000, background: "#2563eb", color: "#fff", padding: "6px 12px", borderRadius: 12 }}>
              🎊 Victory! 🎊
            </div>
            <div
              style={{
                marginTop: 8,
                fontWeight: 900,
                opacity: 0.95,
                background: "#2563eb",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 12,
              }}
            >
              {winner === "X" ? "X wins!" : "O wins!"}
            </div>
            <div style={{ marginTop: 10, fontSize: 24 }}>🎉 🎉 🎉</div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 24, color: "#132033" }}>Tic-Tac-Toe AI Lab</h3>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            {mode === "computer"
              ? "Human = X • Computer = O"
              : "Player X vs Player O (same device)"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} style={selectStyle}>
            <option value="computer">Vs Computer</option>
            <option value="human">Vs Human</option>
          </select>

          <select
            value={firstPlayer}
            onChange={(e) => setFirstPlayer(e.target.value as Player)}
            style={selectStyle}
          >
            <option value="X">X first</option>
            <option value="O">O first</option>
          </select>

          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as Level);
              resetGame();
            }}
            style={{ ...selectStyle, opacity: mode === "computer" ? 1 : 0.5 }}
            disabled={mode !== "computer"}
            title={mode !== "computer" ? "Only for Vs Computer" : "Difficulty"}
          >
            <option value="easy">Easy</option>
            <option value="hard">Unbeatable</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 14,
          background: "#e0f2ff",
          fontWeight: 900,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>{status}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {gameOver ? "Game over" : locked ? "AI moving..." : "Click a square"}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, 86px)",
          gap: 12,
          justifyContent: "center",
        }}
      >
        {board.map((cell, i) => {
          const isWin = line?.includes(i) ?? false;

          return (
            <button
              key={i}
              onClick={() => clickCell(i)}
              style={{
                height: 86,
                width: 86,
                fontSize: 34,
                fontWeight: 900,
                borderRadius: 18,
                border: "none",
                cursor: gameOver || locked ? "default" : "pointer",
                background: isWin
                  ? "linear-gradient(145deg,#d9ffd9,#bff0bf)"
                  : "linear-gradient(145deg,#f0f0f0,#dcdcdc)",
                boxShadow: isWin
                  ? "5px 5px 10px rgba(195, 232, 13, 0.12), -5px -5px 10px rgba(241, 212, 25, 0.9)"
                  : "6px 6px 12px #eee12b, -6px -6px 12px #e7d90b",
                transition: "transform .12s ease",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {cell ?? ""}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <button onClick={resetGame} style={{ ...btnBase, background: "#2563eb", color: "white" }}>
          Restart
        </button>

        <button onClick={resetGame} style={{ ...btnBase, background: "#dc2626", color: "white" }}>
          Quit
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        Tip: In Vs Human mode, both players take turns on the same device.
      </div>
    </div>
  );
}

export default function InteractiveResearchLabPage() {
  const [selectedProjectId, setSelectedProjectId] = useState("tic-tac-toe");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | ProjectType>("all");

  const filteredProjects = useMemo(() => {
    return PROJECTS.filter((project) => {
      const matchesType = activeFilter === "all" || project.type === activeFilter;
      const q = search.toLowerCase().trim();

      const haystack = [
        project.title,
        project.category,
        project.shortDescription,
        project.fullDescription,
        ...project.technologies,
        ...project.features,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || haystack.includes(q);
      return matchesType && matchesSearch;
    });
  }, [search, activeFilter]);

  const selectedProject =
    PROJECTS.find((p) => p.id === selectedProjectId) ?? PROJECTS[0];

  useEffect(() => {
    const exists = filteredProjects.some((p) => p.id === selectedProjectId);
    if (!exists && filteredProjects.length > 0) {
      setSelectedProjectId(filteredProjects[0].id);
    }
  }, [filteredProjects, selectedProjectId]);

  const totalLive = PROJECTS.filter((p) => p.status === "Live Demo").length;
  const totalCategories = new Set(PROJECTS.map((p) => p.category)).size;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#87CEEB,#FFD700)",
        padding: 36,
      }}
    >
      <div style={{ maxWidth: 1380, margin: "0 auto" }}>
        <section
          style={{
            background: "rgba(255,255,255,0.84)",
            borderRadius: 30,
            padding: 26,
            boxShadow: "0 20px 54px rgba(0,0,0,.18)",
            border: "1px solid rgba(255,255,255,0.82)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)",
              gap: 20,
              alignItems: "center",
            }}
            className="hero-grid"
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  borderRadius: 999,
                  background: "#ffffff",
                  padding: "7px 12px",
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  color: "#8b0000",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                }}
              >
                Interactive Research Lab
              </div>

              <h1
                style={{
                  margin: "14px 0 10px",
                  fontSize: "clamp(2rem, 4vw, 3.4rem)",
                  lineHeight: 1.08,
                  color: "#132033",
                  letterSpacing: "-0.04em",
                }}
              >
                Interactive Project Laboratory
              </h1>

              <p
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  lineHeight: 1.8,
                  color: "#48566b",
                  maxWidth: 820,
                }}
              >
                A polished digital lab environment for interactive mathematics,
                data science, research tools, and computational demonstrations.
                Select a project, explore its description, inspect its features,
                and run the live output inside the same page.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 18,
                }}
              >
                {["all", "game", "tool", "analysis", "research"].map((item) => {
                  const active = activeFilter === item;
                  return (
                    <button
                      key={item}
                      onClick={() => setActiveFilter(item as "all" | ProjectType)}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "9px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        background: active ? "#132033" : "rgba(255,255,255,0.92)",
                        color: active ? "#fff" : "#213047",
                        boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
                        textTransform: "capitalize",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <StatCard
                title="Projects"
                value={String(PROJECTS.length)}
                subtitle="Curated interactive modules"
              />
              <StatCard
                title="Live Demos"
                value={String(totalLive)}
                subtitle="Projects ready to run now"
              />
              <StatCard
                title="Categories"
                value={String(totalCategories)}
                subtitle="Cross-disciplinary lab areas"
              />
              <StatCard
                title="Experience"
                value="Interactive"
                subtitle="Live output inside one page"
              />
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "360px minmax(0, 1fr)",
            gap: 22,
          }}
          className="lab-layout"
        >
          <aside
            style={{
              background: "rgba(255,255,255,0.84)",
              borderRadius: 28,
              padding: 20,
              boxShadow: "0 20px 54px rgba(0,0,0,.18)",
              border: "1px solid rgba(255,255,255,0.82)",
              minWidth: 0,
              height: "fit-content",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: "1.18rem",
                  fontWeight: 900,
                  color: "#132033",
                }}
              >
                Project Directory
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#5a667b",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                Browse the lab collection and open any project for a detailed
                research-style presentation and interactive output.
              </div>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, tools, AI, analysis..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #d9dfe8",
                outline: "none",
                fontSize: "0.92rem",
                fontWeight: 600,
                marginBottom: 16,
                background: "#fff",
              }}
            />

            <div style={{ display: "grid", gap: 12 }}>
              {filteredProjects.map((project) => {
                const active = project.id === selectedProjectId;

                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 18,
                      padding: 16,
                      border: active
                        ? "1px solid #132033"
                        : "1px solid rgba(0,0,0,0.08)",
                      background: active
                        ? "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(240,246,255,0.96))"
                        : "rgba(255,255,255,0.94)",
                      boxShadow: active
                        ? "0 12px 24px rgba(19,32,51,0.10)"
                        : "0 8px 18px rgba(0,0,0,0.05)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          color: "#132033",
                          fontSize: "0.98rem",
                          lineHeight: 1.35,
                        }}
                      >
                        {project.title}
                      </div>
                      <StatusPill text={project.status} />
                    </div>

                    <div
                      style={{
                        display: "inline-block",
                        padding: "4px 9px",
                        borderRadius: 999,
                        background: "#fff4cc",
                        color: "#7a5a00",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        marginBottom: 9,
                      }}
                    >
                      {project.category}
                    </div>

                    <div
                      style={{
                        color: "#5a667b",
                        fontSize: "0.84rem",
                        lineHeight: 1.55,
                      }}
                    >
                      {project.shortDescription}
                    </div>
                  </button>
                );
              })}

              {filteredProjects.length === 0 && (
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px dashed rgba(0,0,0,0.15)",
                    background: "rgba(255,255,255,0.70)",
                    padding: 18,
                    color: "#5c6980",
                    lineHeight: 1.7,
                    fontSize: "0.88rem",
                  }}
                >
                  No project matched your search or selected category.
                </div>
              )}
            </div>
          </aside>

          <section
            style={{
              background: "rgba(255,255,255,0.84)",
              borderRadius: 28,
              padding: 22,
              boxShadow: "0 20px 54px rgba(0,0,0,.18)",
              border: "1px solid rgba(255,255,255,0.82)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                borderRadius: 22,
                background:
                  "linear-gradient(135deg, rgba(139,0,0,0.08), rgba(255,192,0,0.12), rgba(135,206,235,0.10))",
                padding: 22,
                marginBottom: 20,
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "inline-block",
                      borderRadius: 999,
                      background: "#fff",
                      color: "#8b0000",
                      padding: "6px 10px",
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      marginBottom: 10,
                    }}
                  >
                    {selectedProject.outputLabel}
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "clamp(1.5rem, 3vw, 2.3rem)",
                      lineHeight: 1.15,
                      color: "#132033",
                    }}
                  >
                    {selectedProject.title}
                  </h2>

                  <p
                    style={{
                      margin: "12px 0 0",
                      color: "#4c5a70",
                      lineHeight: 1.8,
                      maxWidth: 900,
                    }}
                  >
                    {selectedProject.fullDescription}
                  </p>
                </div>

                <StatusPill text={selectedProject.status} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 18,
                  marginTop: 18,
                }}
                className="meta-grid"
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    borderRadius: 18,
                    padding: 16,
                    border: "1px solid rgba(255,255,255,0.86)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      color: "#132033",
                      marginBottom: 10,
                    }}
                  >
                    Key Features
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, color: "#516076" }}>
                    {selectedProject.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    borderRadius: 18,
                    padding: 16,
                    border: "1px solid rgba(255,255,255,0.86)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      color: "#132033",
                      marginBottom: 10,
                    }}
                  >
                    Technologies
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedProject.technologies.map((tech) => (
                      <span
                        key={tech}
                        style={{
                          padding: "7px 11px",
                          borderRadius: 999,
                          background: "#eef5ff",
                          color: "#1d4ed8",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {selectedProject.id === "tic-tac-toe" && <TicTacToeLab />}

            {selectedProject.id === "scientific-calculator" && (
              <PlaceholderPanel
                title="Scientific Calculator Studio"
                outputLabel={selectedProject.outputLabel}
                text="This panel can render your full scientific calculator component so users can perform live trigonometric, logarithmic, exponential, and arithmetic computations inside the lab environment."
              />
            )}

            {selectedProject.id === "regression-tool" && (
              <PlaceholderPanel
                title="Regression and Prediction Lab"
                outputLabel={selectedProject.outputLabel}
                text="This panel can render your regression interface, including dataset upload, predictor selection, model fitting, coefficient output, and prediction workflow for teaching and research applications."
              />
            )}

            {selectedProject.id === "excel-summary" && (
              <PlaceholderPanel
                title="Excel Summary Generator"
                outputLabel={selectedProject.outputLabel}
                text="This panel can render your spreadsheet summary system with file upload, variable inspection, descriptive summaries, missing value counts, and overview metrics for rapid exploratory analysis."
              />
            )}

            {selectedProject.id === "pvalue-lab" && (
              <PlaceholderPanel
                title="P-Value and Test Decision Lab"
                outputLabel={selectedProject.outputLabel}
                text="This panel can render your p-value calculator or hypothesis testing utility so students can experiment with statistical decisions and better understand inferential reasoning."
              />
            )}

            {selectedProject.id === "math-research-board" && (
              <PlaceholderPanel
                title="Mathematics Research Dashboard"
                outputLabel={selectedProject.outputLabel}
                text="This panel can act as a unifying research interface for mathematics, data science, modelling projects, teaching demos, publications, and interactive computational outputs."
              />
            )}
          </section>
        </section>
      </div>

      <style jsx>{`
        .hero-grid {
          grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
        }

        .lab-layout {
          grid-template-columns: 360px minmax(0, 1fr);
        }

        .meta-grid {
          grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 1180px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1050px) {
          .lab-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .meta-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
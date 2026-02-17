"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Player = "X" | "O";
type Cell = Player | null;
type Mode = "human" | "computer";
type Level = "easy" | "hard";

const LINES: number[][] = [
  [0, 1, 2],[3, 4, 5],[6, 7, 8],
  [0, 3, 6],[1, 4, 7],[2, 5, 8],
  [0, 4, 8],[2, 4, 6],
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
  for (let i = 0; i < board.length; i++) if (board[i] === null) moves.push(i);
  return moves;
}

// Unbeatable minimax for 3x3
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

export default function Page() {
  // Game state
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [mode, setMode] = useState<Mode>("computer");
  const [level, setLevel] = useState<Level>("hard");
  const [firstPlayer, setFirstPlayer] = useState<Player>("X");

  // Match state (Best of 5 = first to 3)
  const [scoreX, setScoreX] = useState(0);
  const [scoreO, setScoreO] = useState(0);

  // UI state
  const [locked, setLocked] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [thinkDots, setThinkDots] = useState("");

  // Overlays
  const [celebrateRound, setCelebrateRound] = useState(false);
  const [celebrateMatch, setCelebrateMatch] = useState(false);

  // Media
  const bgMediaRef = useRef<HTMLVideoElement | null>(null); // mp4
  const [musicOn, setMusicOn] = useState(false);

  // Confetti
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { winner, line } = useMemo(() => checkWinner(board), [board]);
  const draw = useMemo(() => board.every(Boolean) && !winner, [board, winner]);

  const matchWinner = useMemo<Player | null>(() => {
    if (scoreX >= 3) return "X";
    if (scoreO >= 3) return "O";
    return null;
  }, [scoreX, scoreO]);

  // --------- small beep sound effects (no files) ----------
  function playBeep(freq: number, durationMs = 90, type: OscillatorType = "square", vol = 0.06) {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const t0 = ctx.currentTime;
      osc.start(t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
      osc.stop(t0 + durationMs / 1000 + 0.02);

      osc.onended = () => ctx.close().catch(() => {});
    } catch {
      // ignore
    }
  }

  // --------- background mp4 toggle ----------
  function toggleMusic() {
    const v = bgMediaRef.current;
    if (!v) return;

    if (v.paused) {
      v.muted = false;
      v.volume = 0.35;
      v.play().then(() => {
        setMusicOn(true);
      }).catch(() => {
        // autoplay blocked until user gesture; user can click again after interaction
        setMusicOn(false);
      });
    } else {
      v.pause();
      setMusicOn(false);
    }
  }

  function stopMusic() {
    const v = bgMediaRef.current;
    if (!v) return;
    v.pause();
    setMusicOn(false);
  }

  // Stop music on unmount
  useEffect(() => {
    return () => {
      try { stopMusic(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------- AI thinking dots ----------
  useEffect(() => {
    if (aiThinking) {
      const t = setInterval(() => {
        setThinkDots((d) => (d.length >= 3 ? "" : d + "."));
      }, 350);
      return () => clearInterval(t);
    }
    setThinkDots("");
  }, [aiThinking]);

  // --------- confetti (no library) ----------
  function launchConfetti(ms = 2600) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = window.innerWidth;
    const H = window.innerHeight;

    const pieces = Array.from({ length: 220 }).map(() => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 2.4 + Math.random() * 4.2,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      color: `hsl(${Math.random() * 360}, 95%, 55%)`,
      circle: Math.random() < 0.25,
    }));

    let raf = 0;
    const start = performance.now();

    function frame(now: number) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, W, H);

      // fade at end
      const alpha = Math.max(0, Math.min(1, 1 - (elapsed - (ms - 500)) / 500));
      ctx.globalAlpha = elapsed > (ms - 500) ? alpha : 1;

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.circle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.9);
        }
        ctx.restore();
      }

      ctx.globalAlpha = 1;

      if (elapsed < ms) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  // --------- reset helpers ----------
  function resetBoardKeepMatch() {
    setBoard(Array(9).fill(null));
    setCurrent(firstPlayer);
    setLocked(false);
    setAiThinking(false);
    setCelebrateRound(false);
  }

  function restartMatch() {
    setScoreX(0);
    setScoreO(0);
    setCelebrateMatch(false);
    resetBoardKeepMatch();
  }

  function quitGame() {
    restartMatch();
    stopMusic();
    alert("Game Closed");
  }

  // Reset board when mode/level/first player changes (keep match score)
  useEffect(() => {
    resetBoardKeepMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, level, firstPlayer]);

  // --------- round end effects ----------
  useEffect(() => {
    if (!winner && !draw) return;
    if (matchWinner) return;

    if (winner) {
      setCelebrateRound(true);
      playBeep(620, 140, "square", 0.07);
      playBeep(820, 120, "triangle", 0.05);
      launchConfetti(2200);

      if (winner === "X") setScoreX((s) => s + 1);
      else setScoreO((s) => s + 1);
    } else if (draw) {
      playBeep(220, 180, "sawtooth", 0.05);
    }

    const t = setTimeout(() => {
      setCelebrateRound(false);
      resetBoardKeepMatch();
    }, winner ? 1300 : 900);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, draw]);

  // --------- match win trophy + confetti ----------
  useEffect(() => {
    if (!matchWinner) return;
    setCelebrateMatch(true);
    // fanfare
    playBeep(660, 140, "triangle", 0.07);
    setTimeout(() => playBeep(880, 160, "triangle", 0.06), 120);
    setTimeout(() => playBeep(990, 180, "sine", 0.05), 260);
    launchConfetti(2800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchWinner]);

  // --------- computer move ----------
  useEffect(() => {
    if (mode !== "computer") return;
    if (matchWinner) return;
    if (winner || draw) return;
    if (current !== "O") return;

    setLocked(true);
    setAiThinking(true);

    const t = setTimeout(() => {
      const empties = availableMoves(board);
      if (empties.length === 0) {
        setAiThinking(false);
        setLocked(false);
        return;
      }

      const move =
        level === "easy"
          ? empties[Math.floor(Math.random() * empties.length)]
          : (minimax(board, "O").index ?? empties[0]);

      setBoard((prev) => {
        const next = prev.slice();
        next[move] = "O";
        return next;
      });

      setCurrent("X");
      setAiThinking(false);
      setLocked(false);
    }, level === "easy" ? 520 : 720);

    return () => clearTimeout(t);
  }, [board, current, mode, level, matchWinner, winner, draw]);

  // --------- clicking ----------
  function clickCell(i: number) {
    if (matchWinner) return;
    if (winner || draw) return;
    if (locked) return;
    if (board[i]) return;

    // In computer mode, only X clicks
    if (mode === "computer" && current !== "X") return;

    playBeep(420, 70, "square", 0.05);

    setBoard((prev) => {
      const next = prev.slice();
      next[i] = current;
      return next;
    });

    setCurrent((p) => (p === "X" ? "O" : "X"));
  }

  const status = (() => {
    if (matchWinner) return `🏆 Match Winner: ${matchWinner}`;
    if (winner) return `Winner: ${winner} 🎉`;
    if (draw) return "Draw! 🤝";
    if (mode === "computer") {
      return current === "X" ? "Your turn (X)" : `Computer thinking${thinkDots} (O)`;
    }
    return `Turn: ${current}`;
  })();

  // --------- styles ----------
  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#87CEEB,#FFD700)",
    padding: 18,
  };

  const card: React.CSSProperties = {
    width: 720,
    maxWidth: "96vw",
    background: "white",
    borderRadius: 30,
    padding: 26,
    boxShadow: "0 26px 70px rgba(0,0,0,.30)",
    position: "relative",
    overflow: "hidden",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const controls: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  };

  const selectStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #e5e5e5",
    fontWeight: 900,
    background: "white",
    cursor: "pointer",
  };

  const btnBase: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 14,
    border: "none",
    fontWeight: 950,
    cursor: "pointer",
  };

  const scoreBox: React.CSSProperties = {
    marginTop: 10,
    padding: 12,
    borderRadius: 18,
    background: "rgba(37,99,235,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 950,
    gap: 12,
    flexWrap: "wrap",
  };

  const pill: React.CSSProperties = {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 16,
    background: "#e0f2ff",
    fontWeight: 950,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  };

  const boardWrap: React.CSSProperties = {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(3, 120px)",
    gap: 16,
    justifyContent: "center",
  };

  const cellStyle = (win: boolean): React.CSSProperties => ({
    height: 120,
    width: 120,
    fontSize: 48,
    fontWeight: 1000,
    borderRadius: 26,
    border: "none",
    cursor: locked || winner || draw || matchWinner ? "default" : "pointer",
    background: win
      ? "linear-gradient(145deg,#d9ffd9,#bff0bf)"
      : "linear-gradient(145deg,#f2f2f2,#d9d9d9)",
    boxShadow: win
      ? "8px 8px 16px rgba(0,0,0,.12), -8px -8px 16px rgba(255,255,255,.9)"
      : "10px 10px 20px #c5c5c5, -10px -10px 20px #ffffff",
    transition: "transform .12s ease, box-shadow .12s ease",
    userSelect: "none",
  });

  const trophyWrap: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 18,
    background: "rgba(255, 200, 0, 0.22)",
    border: "1px solid rgba(0,0,0,.06)",
    fontWeight: 1000,
  };

  return (
    <>
      {/* Background music/video (hidden) */}
      <video
        ref={bgMediaRef}
        src="/music/tic-tac-toe.mp4"
        loop
        preload="auto"
        playsInline
        style={{ display: "none" }}
      />

      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}
      />

      <div style={wrap}>
        <div style={card}>
          {/* Header + controls */}
          <div style={topRow}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 1000 }}>Tic-Tac-Toe</div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 14, fontWeight: 700 }}>
                {mode === "computer" ? "Human = X • Computer = O" : "Player X vs Player O (two players, same device)"}
              </div>

              <div style={scoreBox}>
                <div>🏁 Best of 5 (first to 3)</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ padding: "6px 10px", borderRadius: 12, background: "white" }}>X: {scoreX}</span>
                  <span style={{ padding: "6px 10px", borderRadius: 12, background: "white" }}>O: {scoreO}</span>
                </div>

                {matchWinner && (
                  <div style={trophyWrap} className="trophyBounce">
                    <span style={{ fontSize: 22 }}>🏆</span>
                    <span>Match Winner: {matchWinner}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={controls}>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} style={selectStyle} title="Mode">
                <option value="computer">Vs Computer</option>
                <option value="human">Vs Human</option>
              </select>

              <select
                value={firstPlayer}
                onChange={(e) => setFirstPlayer(e.target.value as Player)}
                style={selectStyle}
                title="Who moves first?"
              >
                <option value="X">X moves first</option>
                <option value="O">O moves first</option>
              </select>

              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                style={{
                  ...selectStyle,
                  opacity: mode === "computer" ? 1 : 0.55,
                  cursor: mode === "computer" ? "pointer" : "not-allowed",
                }}
                disabled={mode !== "computer"}
                title={mode !== "computer" ? "Difficulty works only in Vs Computer" : "AI difficulty"}
              >
                <option value="easy">Easy</option>
                <option value="hard">Unbeatable</option>
              </select>

              <button
                onClick={toggleMusic}
                style={{
                  ...btnBase,
                  background: musicOn ? "#16a34a" : "#0f172a",
                  color: "white",
                }}
                title="Toggle background music (mp4)"
              >
                {musicOn ? "Music: ON 🎵" : "Music: OFF 🔇"}
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div style={pill}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>{status}</span>

              {mode === "computer" && aiThinking && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85 }}>
                  <span className="spinner" />
                  AI thinking
                </span>
              )}
            </div>

            <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 800 }}>
              {matchWinner ? "Restart match to play again" : winner || draw ? "New round starting…" : "Tap a square to move"}
            </div>
          </div>

          {/* Board */}
          <div style={boardWrap}>
            {board.map((cell, i) => {
              const isWin = line?.includes(i) ?? false;
              return (
                <button
                  key={i}
                  onClick={() => clickCell(i)}
                  style={cellStyle(isWin)}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  aria-label={`Cell ${i + 1}`}
                >
                  {cell ?? ""}
                </button>
              );
            })}
          </div>

          {/* Bottom buttons */}
          <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={restartMatch}
              style={{ ...btnBase, background: "#2563eb", color: "white" }}
              title="Restart match (score resets)"
            >
              Restart Match
            </button>

            <button
              onClick={stopMusic}
              style={{ ...btnBase, background: "#f59e0b", color: "#111827" }}
              title="Stop background music"
            >
              Stop Music
            </button>

            <button
              onClick={quitGame}
              style={{ ...btnBase, background: "#dc2626", color: "white" }}
              title="Quit"
            >
              Quit
            </button>
          </div>

          {/* Celebration overlay */}
          {(celebrateRound || celebrateMatch) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,.55)",
                display: "grid",
                placeItems: "center",
                zIndex: 20,
                pointerEvents: "none",
              }}
            >
              <div style={{ textAlign: "center" }}>
                {celebrateMatch ? (
                  <>
                    <div style={{ fontSize: 44, fontWeight: 1000 }} className="trophyBounce">🏆</div>
                    <div style={{ fontSize: 22, fontWeight: 1000, marginTop: 6 }}>Match Victory!</div>
                    <div style={{ fontWeight: 900, opacity: 0.85, marginTop: 6 }}>Winner: {matchWinner}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 40, fontWeight: 1000 }}>🎉 Victory!</div>
                    <div style={{ fontWeight: 900, opacity: 0.85, marginTop: 6 }}>
                      {winner ? `Winner: ${winner}` : "Nice!"}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* tiny CSS */}
          <style>{`
            .spinner{
              width: 14px;
              height: 14px;
              border: 2px solid rgba(0,0,0,.18);
              border-top-color: rgba(0,0,0,.65);
              border-radius: 999px;
              display: inline-block;
              animation: spin .7s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            .trophyBounce{
              animation: trophyBounce 0.9s ease-in-out infinite;
              transform-origin: center;
            }
            @keyframes trophyBounce{
              0%   { transform: scale(1) translateY(0); }
              30%  { transform: scale(1.25) translateY(-6px); }
              55%  { transform: scale(0.98) translateY(0); }
              75%  { transform: scale(1.12) translateY(-3px); }
              100% { transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      </div>
    </>
  );
}
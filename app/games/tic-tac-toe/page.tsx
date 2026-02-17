"use client";

import { useEffect, useMemo, useState } from "react";

type Player = "X" | "O";
type Cell = Player | null;
type Level = "easy" | "hard";
type Mode = "human" | "computer";

const LINES = [
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

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [gameOver, setGameOver] = useState(false);

  const [mode, setMode] = useState<Mode>("computer"); // ✅ default
  const [level, setLevel] = useState<Level>("hard");
  const [firstPlayer, setFirstPlayer] = useState<Player>("X");

  const [locked, setLocked] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const { winner, line } = useMemo(() => checkWinner(board), [board]);
  const draw = useMemo(() => board.every(Boolean) && !winner, [board, winner]);

  // game end
  useEffect(() => {
    if (winner || draw) setGameOver(true);
  }, [winner, draw]);

  // celebration
  useEffect(() => {
    if (winner) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2200);
      return () => clearTimeout(t);
    }
  }, [winner]);

  // reset when mode or first player changes
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, firstPlayer]);

  // computer move (only when mode=computer and current=O)
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

    // In computer mode, prevent clicking when it's computer's turn
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

  function quitGame() {
    resetGame();
    alert("Game Closed");
  }

  const status =
    winner ? `Winner: ${winner} 🎉` :
    draw ? "Draw! 🤝" :
    mode === "computer"
      ? (current === "X" ? "Your turn (X)" : "Computer thinking… (O)")
      : `Turn: ${current}`;

  // ---------- styles ----------
  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#87CEEB,#FFD700)",
    padding: 20,
  };

  const card: React.CSSProperties = {
    width: 560,
    maxWidth: "96vw",
    background: "white",
    borderRadius: 26,
    padding: 26,
    boxShadow: "0 22px 60px rgba(0,0,0,.28)",
    position: "relative",
    overflow: "hidden",
    textAlign: "left",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  };

  const pill: React.CSSProperties = {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 14,
    background: "#e0f2ff",
    fontWeight: 900,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  };

  const boardWrap: React.CSSProperties = {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(3, 110px)",
    gap: 14,
    justifyContent: "center",
  };

  const cellStyle = (win: boolean): React.CSSProperties => ({
    height: 110,
    width: 110,
    fontSize: 42,
    fontWeight: 900,
    borderRadius: 22,
    border: "none",
    cursor: gameOver || locked ? "default" : "pointer",
    background: win
      ? "linear-gradient(145deg,#d9ffd9,#bff0bf)"
      : "linear-gradient(145deg,#f0f0f0,#dcdcdc)",
    boxShadow: win
      ? "6px 6px 12px rgba(0,0,0,.12), -6px -6px 12px rgba(255,255,255,.9)"
      : "7px 7px 14px #c5c5c5, -7px -7px 14px #ffffff",
    transition: "transform .12s ease",
  });

  const selectStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #e5e5e5",
    fontWeight: 900,
    background: "white",
  };

  const btnBase: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 14,
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <div style={wrap}>
      <div style={card}>
        {/* celebration overlay */}
        {celebrate && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,.65)",
              display: "grid",
              placeItems: "center",
              zIndex: 10,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 1000 }}>🎊 Victory! 🎊</div>
              <div style={{ marginTop: 8, fontWeight: 900, opacity: 0.85 }}>
                {winner === "X" ? "X wins!" : "O wins!"}
              </div>
              <div style={{ marginTop: 12, fontSize: 28 }}>🎉 🎉 🎉 🎉 🎉</div>
            </div>
          </div>
        )}

        <div style={topRow}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>Tic-Tac-Toe</h1>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 14 }}>
              {mode === "computer" ? "Human = X • Computer = O" : "Player X vs Player O (same device)"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* mode switch */}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              style={selectStyle}
              title="Mode"
            >
              <option value="computer">Vs Computer</option>
              <option value="human">Vs Human</option>
            </select>

            {/* who first */}
            <select
              value={firstPlayer}
              onChange={(e) => setFirstPlayer(e.target.value as Player)}
              style={selectStyle}
              title="Who moves first?"
            >
              <option value="X">X moves first</option>
              <option value="O">O moves first</option>
            </select>

            {/* difficulty only for computer */}
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value as Level);
                resetGame();
              }}
              style={{ ...selectStyle, opacity: mode === "computer" ? 1 : 0.5 }}
              disabled={mode !== "computer"}
              title={mode !== "computer" ? "Difficulty is only for Vs Computer" : "Difficulty"}
            >
              <option value="easy">Easy</option>
              <option value="hard">Hard (Unbeatable)</option>
            </select>
          </div>
        </div>

        <div style={pill}>
          <div>{status}</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {gameOver ? "Game over" : locked ? "AI moving..." : "Click a square"}
          </div>
        </div>

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

        <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={resetGame}
            style={{ ...btnBase, background: "#2563eb", color: "white" }}
          >
            Restart
          </button>

          <button
            onClick={quitGame}
            style={{ ...btnBase, background: "#dc2626", color: "white" }}
          >
            Quit
          </button>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
          Tip: In Vs Human mode, both players take turns on the same device.
        </div>
      </div>
    </div>
  );
}
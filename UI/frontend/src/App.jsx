import React, { useState, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("תורך! (לבן)");
  const [loading, setLoading] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [draggingPiece, setDraggingPiece] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragContainerRef = useRef(null);
  const [showPeople, setShowPeople] = useState(true);
  const [captionIdx, setCaptionIdx] = useState(0);
  const [stickers, setStickers] = useState([]);
  const [overlays, setOverlays] = useState([]);
  const [placePeopleMode, setPlacePeopleMode] = useState(false);
  const [overlayDragId, setOverlayDragId] = useState(null);
  const [overlayDragFrom, setOverlayDragFrom] = useState(null);
  const [overlayDragPos, setOverlayDragPos] = useState({ x: 0, y: 0 });

  const captions = [
    'חבורה של ברווזים? לא, זה רק אנחנו',
    'חימום מדורה 💥 - שיפוץ פתוח',
    'מי הביא את הבירה? 🍺',
    'מחשבות עמוקות על פתיחת רגליים במטקה'
  ];

  const togglePeople = () => setShowPeople((s) => !s);
  const nextCaption = () => setCaptionIdx((i) => (i + 1) % captions.length);
  const addSticker = (emoji) => {
    const id = Date.now().toString(36);
    const left = 10 + Math.random() * 70; // percent
    const top = 10 + Math.random() * 70;
    setStickers((s) => [...s, { id, emoji, left, top }]);
  };

  const togglePlaceMode = () => setPlacePeopleMode((s) => !s);

  const placeOverlayOnSquare = (square) => {
    const id = Date.now().toString(36);
    setOverlays((o) => [...o, { id, square }]);
    setPlacePeopleMode(false);
  };

  const startOverlayDrag = (e, id, fromSquare) => {
    e.stopPropagation();
    setOverlayDragId(id);
    setOverlayDragFrom(fromSquare);
    setOverlayDragPos({ x: e.clientX, y: e.clientY });
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (err) {}
  };

  const onOverlayPointerMove = (e) => {
    if (!overlayDragId) return;
    setOverlayDragPos({ x: e.clientX, y: e.clientY });
  };

  const endOverlayDrag = (e) => {
    if (!overlayDragId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    let sq = null;
    if (el) {
      const squareEl = el.closest && el.closest('[data-square]');
      if (squareEl) sq = squareEl.getAttribute('data-square');
    }

    setOverlays((prev) => prev.map((ov) => ov.id === overlayDragId ? { ...ov, square: sq || ov.square } : ov));

    setOverlayDragId(null);
    setOverlayDragFrom(null);
    setOverlayDragPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (overlayDragId) {
      window.addEventListener('pointermove', onOverlayPointerMove);
      window.addEventListener('pointerup', endOverlayDrag);
      window.addEventListener('pointercancel', endOverlayDrag);
    } else {
      window.removeEventListener('pointermove', onOverlayPointerMove);
      window.removeEventListener('pointerup', endOverlayDrag);
      window.removeEventListener('pointercancel', endOverlayDrag);
    }

    return () => {
      window.removeEventListener('pointermove', onOverlayPointerMove);
      window.removeEventListener('pointerup', endOverlayDrag);
      window.removeEventListener('pointercancel', endOverlayDrag);
    };
  }, [overlayDragId]);

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setHistory([]);
    setStatus("תורך! (לבן)");
    setLoading(false);
    setGameOver(false);
    setSelectedSquare(null);
  };

  const updateStatus = (board) => {
    setHistory(board.history());

    if (board.isCheckmate()) {
      const winner = board.turn() === "w" ? "שחור" : "לבן";
      setStatus(`מט! ${winner} ניצח!`);
      setGameOver(true);
    } else if (board.isDraw()) {
      setStatus("תיקו!");
      setGameOver(true);
    } else if (board.inCheck()) {
      setStatus(board.turn() === "w" ? "⚠️ בדיקה! תורך! (לבן)" : "⚠️ AI חושב...");
    } else {
      setStatus(board.turn() === "w" ? "תורך! (לבן)" : "AI חושב...");
    }
  };

  const requestAIMove = async (currentGame) => {
    setLoading(true);
    setStatus("🤖 AI חושב על מהלך...");

    try {
      const requestBody = {
        fen: currentGame.fen(),
        pgn_history: currentGame.history().join(" "),
        difficulty
      };

      const response = await axios.post(`${API_URL}/api/move`, requestBody, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      const aiMove = response.data.move || response.data.move_uci || response.data.move_san;
      if (!aiMove) {
        throw new Error("לא קיבלנו מהלך מה-server");
      }

      const nextGame = new Chess(currentGame.fen());
      const moveResult = nextGame.move(aiMove, { sloppy: true });
      if (!moveResult) {
        throw new Error(`מהלך לא חוקי: ${aiMove}`);
      }

      setGame(nextGame);
      updateStatus(nextGame);
    } catch (error) {
      console.error("AI move failed:", error);
      const serverMessage = error.response?.data?.detail || error.message || "שגיאה ב-AI. נסה שוב.";
      setStatus(`❌ AI שגיאה: ${serverMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSquareClick = (square) => {
    if (loading || gameOver) return;

    if (placePeopleMode) {
      placeOverlayOnSquare(square);
      return;
    }

    const piece = game.get(square);
    const isWhitePiece = piece && piece.color === "w";

    if (!selectedSquare) {
      if (isWhitePiece) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    makeMove(selectedSquare, square);
    setSelectedSquare(null);
  };

  const makeMove = (from, to) => {
    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({
      from,
      to,
      promotion: "q"
    });

    if (!move) {
      setStatus("מהלך לא חוקי. בחר מהלך אחר.");
      return;
    }

    setGame(gameCopy);
    updateStatus(gameCopy);

    setTimeout(() => {
      if (!gameCopy.isGameOver()) {
        requestAIMove(gameCopy);
      }
    }, 500);
  };

  const startDrag = (e, fromSquare, pieceChar) => {
    e.stopPropagation();
    if (loading || gameOver) return;
    setDragFrom(fromSquare);
    setDraggingPiece(pieceChar);
    setDragPos({ x: e.clientX, y: e.clientY });
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (err) {}
  };

  const onPointerMove = (e) => {
    if (!draggingPiece) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const endDrag = (e) => {
    if (!draggingPiece) return;
    // find the square under pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    let sq = null;
    if (el) {
      const squareEl = el.closest && el.closest('[data-square]');
      if (squareEl) sq = squareEl.getAttribute('data-square');
    }

    if (sq && dragFrom) {
      makeMove(dragFrom, sq);
    }

    setDraggingPiece(null);
    setDragFrom(null);
    setDragPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (draggingPiece) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    } else {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    }

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [draggingPiece]);

  const renderBoard = () => {
    const board = [];
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    const pieces = {
      K: "♔",
      Q: "♕",
      R: "♖",
      B: "♗",
      N: "♘",
      P: "♙",
      k: "♚",
      q: "♛",
      r: "♜",
      b: "♝",
      n: "♞",
      p: "♟"
    };

        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const square = files[fileIdx] + ranks[rankIdx];
        const piece = game.get(square);
        const isLight = (rankIdx + fileIdx) % 2 === 0;
        const isSelected = selectedSquare === square;

        board.push(
          <div
            key={square}
            data-square={square}
            className={`board-square ${isLight ? "light" : "dark"} ${isSelected ? "selected" : ""}`}
            onClick={() => handleSquareClick(square)}
          >
            {piece && (
              <span
                className="piece"
                onPointerDown={(e) => startDrag(e, square, piece.color === "w" ? pieces[piece.type.toUpperCase()] : pieces[piece.type])}
              >
                {piece.color === "w" ? pieces[piece.type.toUpperCase()] : pieces[piece.type]}
              </span>
            )}
                {/* overlays placed on this square */}
                {overlays.filter(o => o.square === square).map(o => (
                  <img
                    key={o.id}
                    src="/people.png"
                    alt="people"
                    className="overlay-img"
                    onPointerDown={(e) => startOverlayDrag(e, o.id, square)}
                    draggable={false}
                  />
                ))}
          </div>
        );
      }
    }

    return board;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>♟️ שחמט נגד לוח מקומי</h1>
        <p className="subtitle">משחקת כלבן, ה-AI משחק בשחור</p>
      </header>

      <main className="app-main">
        <section className="game-section">
          <div className="board-wrapper">
            <div className="board-container">{renderBoard()}</div>
          </div>

          <section className="controls-section">
            <div className="status-box">
              <h2>סטטוס:</h2>
              <p className="status-text">{status}</p>
            </div>

            <div className="difficulty-control">
              <div className="difficulty-label">רמת קושי</div>
              <select
                className="difficulty-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={loading}
              >
                <option value="easy">קל</option>
                <option value="medium">בינוני</option>
                <option value="hard">קשה</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <button className="new-game-btn" onClick={togglePeople} style={{ padding: '8px 12px', fontSize: '0.95rem' }}>
                {showPeople ? 'הסתר משתתפים' : 'הראה משתתפים'}
              </button>
              <button className="new-game-btn" onClick={nextCaption} style={{ padding: '8px 12px', fontSize: '0.95rem' }}>
                החליף כיתוב
              </button>
              <button className="new-game-btn" onClick={togglePlaceMode} style={{ padding: '8px 12px', fontSize: '0.95rem' }}>
                {placePeopleMode ? 'ביטול הטמעה' : 'הטמע על הלוח'}
              </button>
              <button className="new-game-btn" onClick={() => setOverlays([])} style={{ padding: '8px 12px', fontSize: '0.95rem' }}>
                נקה מהלוח
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="new-game-btn" onClick={() => addSticker('😂')} style={{ padding: '8px 10px' }}>😂</button>
                <button className="new-game-btn" onClick={() => addSticker('🔥')} style={{ padding: '8px 10px' }}>🔥</button>
                <button className="new-game-btn" onClick={() => addSticker('🍺')} style={{ padding: '8px 10px' }}>🍺</button>
              </div>
            </div>

            {showPeople && (
              <div className="people-card" style={{ marginTop: 14 }}>
                <div className="people-inner">
                  <img src="/people.png" alt="משתתפים" className="people-img" />
                  <div className="speech-bubble">{captions[captionIdx]}</div>
                  {stickers.map((st) => (
                    <span
                      key={st.id}
                      className="sticker"
                      style={{ left: `${st.left}%`, top: `${st.top}%` }}
                    >
                      {st.emoji}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>שמור את התמונה ב-UI/frontend/public/people.png</div>
              </div>
            )}

            {loading && (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <p>חכה לתור ה-AI...</p>
              </div>
            )}

            <button
              className="new-game-btn"
              onClick={resetGame}
              disabled={loading}
            >
              🔄 משחק חדש
            </button>

            {gameOver && (
              <div className="game-over-box">
                <p>המשחק הסתיים!</p>
              </div>
            )}
          </section>
        </section>

        <section className="history-section">
          <div className="history-box">
            <h3>היסטוריית המהלכים</h3>
            <div className="history-content">
              {history.length === 0 ? (
                <p className="empty-history">אין מהלכים עדיין</p>
              ) : (
                <div className="moves-grid">
                  {history.map((move, idx) => (
                    <span key={idx} className="move-item">
                      {idx + 1}. {move}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {draggingPiece && (
        <div
          className="dragging-piece"
          style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}
        >
          {draggingPiece}
        </div>
      )}

      {overlayDragId && (() => {
        const ov = overlays.find(o => o.id === overlayDragId);
        if (!ov) return null;
        return (
          <img src="/people.png" className="overlay-floating" style={{ left: overlayDragPos.x, top: overlayDragPos.y }} alt="overlay" />
        );
      })()}

      <footer className="app-footer">
        <p>Powered by Local AI • שחמט עם בינה מלאכותית</p>
      </footer>
    </div>
  );
}

export default App;

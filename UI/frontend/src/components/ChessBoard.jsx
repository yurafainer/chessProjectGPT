import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import axios from 'axios';

const ChessBoard = () => {
  // אתחול משחק שחמט חדש באמצעות chess.js
  const [game, setGame] = useState(new Chess());
  // שמירת מצב הלוח בפורמט FEN (מחרוזת שמייצגת את מיקום הכלים)
  const [gameFen, setGameFen] = useState(game.fen());
  // משתנה לבדיקה האם ה-AI חושב כרגע
  const [isAiThinking, setIsAiThinking] = useState(false);

  // פונקציה שמבצעת מהלך בקוד ומעדכנת את התצוגה
  const makeAMove = (move) => {
    try {
      const result = game.move(move);
      if (result) {
        setGameFen(game.fen());
        return result;
      }
    } catch (error) {
      // אם המהלך לא חוקי לפי חוקי השחמט, הפונקציה תחזיר null
      return null;
    }
    return null;
  };

  // פונקציה שקוראת לשרת ה-FastAPI כדי לקבל את המהלך של ה-AI
  const fetchAiMove = async (currentFen) => {
    setIsAiThinking(true);
    try {
      // שליחת המצב הנוכחי לשרת (ה-Backend שלך)
      const response = await axios.post('http://localhost:8000/api/move', {
        fen: currentFen,
      });

      const aiMove = response.data.move;
      if (aiMove) {
        // ביצוע המהלך שה-AI החזיר על הלוח
        makeAMove(aiMove);
      }
    } catch (error) {
      console.error("שגיאה בקבלת מהלך מה-AI:", error);
      alert("השרת לא הגיב או שהתרחשה שגיאה. ודא ששרת ה-FastAPI שלך רץ!");
    } finally {
      setIsAiThinking(false);
    }
  };

  // פונקציה שמופעלת אוטומטית ברגע שהשחקן גורר ומניח כלי על הלוח
  const onDrop = ({ sourceSquare, targetSquare }) => {
    console.log('[Component ChessBoard] onDrop called', { sourceSquare, targetSquare, isAiThinking, fen: game.fen() });
    // אם ה-AI חושב, נחסום את האפשרות להזיז כלים
    if (isAiThinking) return false;

    // ניסיון לבצע את המהלך של השחקן האנושי
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // קידום אוטומטי למלכה אם חייל מגיע לסוף
    });

    console.log('[Component ChessBoard] attempted move result:', move);

    // אם המהלך לא היה חוקי, נבטל את ההזזה
    if (move === null) return false;

    // אם המהלך חוקי והמשחק לא הסתיים, נבקש מהלך מה-AI
    if (!game.isGameOver()) {
      // אנחנו מעבירים את ה-FEN העדכני מיד לאחר מהלך השחקן
      fetchAiMove(game.fen());
    } else {
      alert("המשחק הסתיים!");
    }

    return true;
  };

  // פונקציה לאתחול המשחק מחדש
  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameFen(newGame.fen());
    setIsAiThinking(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <h2>משחק שחמט נגד AI מקומי</h2>
      
      {isAiThinking && <p style={{ color: 'blue', fontWeight: 'bold' }}>🤖 ה-AI חושב על מהלך...</p>}
      {!isAiThinking && <p style={{ color: 'green' }}>⚪ התור שלך (לבן)</p>}

      <div onClick={() => console.log('[Component ChessBoard] board container clicked')} style={{ width: '500px', maxWidth: '90vw', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
        <Chessboard 
          position={gameFen} 
          onPieceDrop={onDrop}
          onPieceClick={(piece, square) => console.log('[Component ChessBoard] onPieceClick', { piece, square })}
          allowDragging={true}
          canDragPiece={() => !isAiThinking}
          boardWidth={500}
        />
      </div>

      <button 
        onClick={resetGame}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        משחק חדש 🔄
      </button>
    </div>
  );
};

export default ChessBoard;
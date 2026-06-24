from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import chess
import random

app = FastAPI(title="Chess AI Arena API")

# רשימת הכתובות המורשות לגשת לשרת זה
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PIECE_VALUES = {
    "p": 1,
    "n": 3,
    "b": 3,
    "r": 5,
    "q": 9,
    "k": 0,
}


def evaluate_board(board: chess.Board) -> float:
    score = 0.0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if not piece:
            continue
        value = PIECE_VALUES[piece.symbol().lower()]
        score += value if piece.color == chess.WHITE else -value
    return score


def minimax(board: chess.Board, depth: int, alpha: float, beta: float, maximizing: bool):
    if depth == 0 or board.is_game_over():
        return evaluate_board(board), None

    best_move = None
    if maximizing:
        max_eval = -float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move
            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break
        return max_eval, best_move
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move
            beta = min(beta, eval_score)
            if beta <= alpha:
                break
        return min_eval, best_move


def select_local_ai_move(board: chess.Board, depth: int = 2, difficulty: str | None = None):
    """Select an AI move. Difficulty can influence search depth or randomness.

    difficulty: 'easy'|'medium'|'hard' or None
    """
    # map difficulty to depth if provided
    if isinstance(difficulty, str):
        d = difficulty.lower()
        if d == "easy":
            # easy: small depth and some randomness
            depth = 1
        elif d == "medium":
            depth = max(depth, 2)
        elif d == "hard":
            depth = max(depth, 3)

    # easy random move chance
    if isinstance(difficulty, str) and difficulty.lower() == "easy":
        # 35% of the time pick a random legal move to simulate weaker play
        if random.random() < 0.35:
            legal_moves = list(board.legal_moves)
            if not legal_moves:
                raise ValueError("No legal AI moves available.")
            return random.choice(legal_moves)

    _, move = minimax(board, depth, -float('inf'), float('inf'), board.turn == chess.WHITE)
    if move is None:
        raise ValueError("No legal AI moves available.")
    return move


@app.get('/')
def read_root():
    return {'message': 'Welcome to the Chess AI Arena Server!'}


@app.post('/api/move')
async def make_ai_move(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail='Request body must be valid JSON.')

    fen = body.get('fen') or body.get('FEN')
    pgn_history = body.get('pgn_history') or body.get('pgnHistory') or body.get('history') or ''

    if not isinstance(fen, str) or not fen.strip():
        raise HTTPException(status_code=400, detail='Invalid or missing \'fen\' field in request body.')

    if isinstance(pgn_history, list):
        pgn_history = ' '.join(map(str, pgn_history))
    elif not isinstance(pgn_history, str):
        raise HTTPException(status_code=400, detail='\'pgn_history\' must be a string or array of moves.')

    try:
        board = chess.Board(fen)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid FEN string provided.')

    if board.is_game_over():
        return {
            'game_over': True,
            'move': None,
            'move_uci': None,
            'move_san': None,
            'detail': 'Game is already over.'
        }

    # read optional difficulty setting from request body
    difficulty = None
    if isinstance(body, dict):
        difficulty = body.get("difficulty") or body.get("level")

    # map difficulty to a search depth default
    depth_map = {"easy": 1, "medium": 2, "hard": 3}
    depth = 2
    if isinstance(difficulty, str) and difficulty.lower() in depth_map:
        depth = depth_map[difficulty.lower()]

    try:
        ai_move = select_local_ai_move(board, depth=depth, difficulty=difficulty)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Local AI failed to choose a move: {str(e)}')

    return {
        'game_over': board.is_game_over(),
        'move': ai_move.uci(),
        'move_uci': ai_move.uci(),
        'move_san': board.san(ai_move),
        'difficulty': difficulty or 'medium',
    }

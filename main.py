import os
import chess
from google import genai
from google.genai import types

# 1. אתחול קליינט Gemini - הוא ימשוך אוטומטית את המפתח ממשתנה הסביבה GEMINI_API_KEY
try:
    client = genai.Client()
except Exception as e:
    print(f"שגיאה באתחול הקליינט. ודא שהגדרת את משתנה הסביבה GEMINI_API_KEY.\nפרטי השגיאה: {e}")
    exit(1)

def get_gemini_move(board: chess.Board) -> chess.Move:
    """
    פונקציה שמקבלת את מצב הלוח הנוכחי, פונה ל-Gemini ומנהלת 
    מנגנון של עד 5 ניסיונות לקבלת מהלך חוקי.
    """
    max_attempts = 5
    error_message = ""
    
    # הגדרת System Prompt נוקשה כדי למנוע מהמודל "לפטפט"
    system_instruction = (
        "You are an expert chess engine playing a competitive match. "
        "You must respond ONLY with your next move in standard UCI format "
        "(e.g., e2e4, g1f3, e7e8q). "
        "Do not include any commentary, explanations, greetings, or markdown formatting. "
        "Just the move itself."
    )
    
    # בניית היסטוריית המהלכים בפורמט טקסטואלי קריא (דומה ל-PGN)
    # מודלי שפה מבינים היסטוריה בצורה מעולה
    move_history = []
    temp_board = chess.Board()
    for move in board.move_stack:
        move_history.append(temp_board.san(move))
        temp_board.push(move)
    pgn_history_str = " ".join(move_history) if move_history else "No moves played yet."

    for attempt in range(1, max_attempts + 1):
        print(f"🤖 Gemini מנסה לבצע מהלך (ניסיון {attempt}/{max_attempts})...")
        
        # בניית ה-User Prompt שמכיל את מצב הלוח (FEN) וההיסטוריה
        user_prompt = f"Current Board Position (FEN): {board.fen()}\n"
        user_prompt += f"Move History: {pgn_history_str}\n"
        user_prompt += "Your Turn. What is your move?"
        
        # אם בניסיונות הקודמים הייתה שגיאה, נצמיד אותה לפרומפט כדי שיתקן
        if error_message:
            user_prompt += f"\n\nATTENTION: Your previous attempt resulted in an error: {error_message} Please analyze the board carefully and provide a strictly legal move."

        try:
            # פנייה למודל המהיר והחכם Gemini 2.5 Flash
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2, # טמפרטורה נמוכה בשביל דיוק והיצמדות לחוקים
                )
            )
            
            # ניקוי רווחים או תווים מיותרים שהמודל עלול להחזיר
            raw_move = response.text.strip().lower()
            print(f"  > Gemini החזיר את הטקסט: '{raw_move}'")
            
            # 2. ניתוח המהלך שחזר ובדיקת חוקיות באמצעות python-chess
            parsed_move = chess.Move.from_uci(raw_move)
            
            if parsed_move in board.legal_moves:
                print(f"✅ מהלך חוקי אושר! Gemini משחק: {raw_move}\n")
                return parsed_move
            else:
                error_message = f"The move '{raw_move}' is illegal in the current position."
                
        except ValueError:
            # מקרה שבו הטקסט בכלל לא בפורמט של מהלך שחמט (למשל החזיר מילה או הסבר)
            error_message = f"The text '{response.text.strip()}' is not in valid UCI format (like e2e4)."
        except Exception as e:
            error_message = f"API or system error occurred: {str(e)}"
            
        print(f"❌ ניסיון נכשל. סיבה: {error_message}")
        
    # אם הגענו לכאן - המודל נכשל 5 פעמים ברצף
    raise ValueError("Gemini failed to provide a legal move after 5 consecutive attempts. Disqualified!")

# --- הרצת בדיקה סימולטיבית קטנה ---
if __name__ == "__main__":
    # נתחיל לוח חדש
    game_board = chess.Board()
    print("--- תחילת סימולציית משחק ---")
    print(game_board)
    print("\n")
    
    # נבקש מ-Gemini מהלך עבור הלבן בתור פתיחה
    try:
        gemini_move = get_gemini_move(game_board)
        game_board.push(gemini_move)
        
        print("--- הלוח לאחר המהלך של Gemini ---")
        print(game_board)
        
    except Exception as error:
        print(f"\n🚨 המשחק הסתיים בפסילה: {error}")
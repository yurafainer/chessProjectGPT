import os
from fastapi import FastAPI, HTTPException
from google import genai

app = FastAPI()

# 🔑 מפתח ה-API שלך (חייב להיות מוגדר ב־ENV Variable)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not set. Gemini client will not initialize.")

# אתחול הקליינט החדש עם המפתח
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini Client: {e}")
    client = None

@app.get("/")
def read_root():
    return {"message": "Chess AI Server is running and Gemini is configured!"}

@app.get("/test-ai")
def test_ai():
    """נקודת קצה קטנה כדי לוודא שגוגל לא חוסם לך את החיבור מהרשת"""
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client is not initialized.")
    try:
        # שימוש בפורמט ה-SDK החדש
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents="Say 'Chess AI Ready'"
        )
        return {"status": "success", "response": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI connection error: {str(e)}")
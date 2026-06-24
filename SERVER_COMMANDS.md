# How to Run the Chess Project Servers

## Option 1: PowerShell Script (Recommended for Windows)
```powershell
.\run_servers.ps1
```

## Option 2: Batch File
```cmd
run_servers.bat
```

## Option 3: Manual Commands

### Terminal 1 - Python Backend
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run the FastAPI backend server
python -m uvicorn server:app --reload --port 8000
```

> הערה: `main.py` הוא סקריפט בדיקה של Gemini ולא ה-API המרכזי. השרת הנוכחי משתמש ב-AI מקומי.

### Terminal 2 - React Frontend
```powershell
cd UI/frontend
npm run dev
```

## Default URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000

## Notes
- Make sure you have Python 3.x installed
- Make sure you have Node.js and npm installed
- Make sure the backend server רץ לפני שמתחילים לשחק
- The frontend uses `/api/move` proxied to the backend via Vite

## Setup (if needed)
```powershell
# Create virtual environment
python -m venv .venv

# Activate it
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd UI/frontend
npm install
```

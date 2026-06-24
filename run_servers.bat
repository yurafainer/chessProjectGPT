@echo off
REM Activate Python virtual environment and run both servers

echo Activating Python virtual environment...
call .venv\Scripts\activate.bat

echo Starting Python server...
start cmd /k "python -m uvicorn server:app --reload --port 8000"

echo Starting frontend development server...
start cmd /k "cd UI\frontend && npm run dev"

echo.
echo Servers started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8000
pause

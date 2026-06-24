# Activate Python virtual environment and run the servers
Write-Host "Activating Python virtual environment..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1

Write-Host "Starting Python server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PWD; .\.venv\Scripts\Activate.ps1; python -m uvicorn server:app --reload --port 8000"

Write-Host "Starting frontend development server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PWD\UI\frontend; npm run dev"

Write-Host "Servers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow

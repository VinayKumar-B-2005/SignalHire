@echo off
echo.
echo =====================================================
echo   SignalHire - Redrob Hackathon Demo
echo   Starting Backend + Frontend
echo =====================================================
echo.

echo [1/2] Starting Backend API (port 8000)...
start cmd /k "cd /d %~dp0backend && python -m uvicorn api:app --reload --port 8000"

echo [2/2] Starting Frontend Dev Server (port 5173)...
timeout /t 2 /nobreak >nul
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Opening in browser...
timeout /t 4 /nobreak >nul
start http://localhost:5173

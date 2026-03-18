@echo off
setlocal enabledelayedexpansion
echo 🚀 Preparing ActionMeet...

:: Kill existing node processes to free up ports
echo 🧹 Cleaning up existing processes...
taskkill /F /IM node.exe /T 2>nul
echo Done.

echo.
echo 🚀 Starting ActionMeet Backend...
:: Start backend server in a new window
start "ActionMeet Backend" cmd /k "cd /d %~dp0server && npm start"

:: Wait for backend (using ping as a robust sleep alternative)
echo ⏳ Waiting for backend to initialize...
ping 127.0.0.1 -n 6 >nul

echo 🚀 Starting ActionMeet Frontend...
:: Start frontend server in another new window
start "ActionMeet Frontend" cmd /k "cd /d %~dp0client && npx serve public -l 3000 --cors"

:: Wait for frontend
echo ⏳ Waiting for frontend to initialize...
ping 127.0.0.1 -n 4 >nul

:: Open the browser
echo 🌍 Opening browser...
start "" "http://localhost:3000"

echo.
echo ✨ ActionMeet is ready!
echo Backend: http://localhost:3001/api
echo Frontend: http://localhost:3000
echo.
echo 💡 Keep both CMD windows open to use the website.
echo.
pause

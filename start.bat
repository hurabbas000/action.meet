@echo off
echo Starting ActionMeet...
echo.

:: Start backend server in a new window
start "ActionMeet Backend" cmd /k "cd /d C:\Users\asad\CascadeProjects\windsurf-project\server && npm start"

:: Wait 4 seconds for backend to fully boot and connect to DB
timeout /t 4 /nobreak >nul

:: Start frontend server in another new window
start "ActionMeet Frontend" cmd /k "cd /d C:\Users\asad\CascadeProjects\windsurf-project\client && npx serve public -l 3000 --cors"

:: Wait 2 more seconds then open browser
timeout /t 2 /nobreak >nul

:: Open the browser
start "" "http://localhost:3000"

echo.
echo Both servers are running!
echo Backend: http://localhost:3001/api
echo Frontend: http://localhost:3000
echo.
echo Keep both CMD windows open to use the website.

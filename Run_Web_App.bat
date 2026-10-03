@echo off
title PEA Transformer Load Monitor
cd /d "%~dp0"

echo ========================================================
echo   PEA Transformer Load Monitor (Next.js 15 PWA)
echo ========================================================
echo.

REM 1. Start Next.js 15 Production Server (Port 3000)
if exist "%~dp0next-app" (
    echo [*] Starting Next.js Server on Port 3000...
    start "PEA Next.js Server" /min cmd /c "cd /d "%~dp0next-app" && npm run start"
)

REM 2. Wait 2 seconds for server to initialize
ping 127.0.0.1 -n 3 >nul

REM 3. Open Web App in default browser
echo [*] Opening Web Application in Browser...
start "" "http://localhost:3000"

exit

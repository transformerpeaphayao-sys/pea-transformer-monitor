@echo off
title PEA Transformer Load Monitor
cd /d "%~dp0"

echo ========================================================
echo   PEA Transformer Load Monitor (Next.js 15 PWA)
echo ========================================================
echo.

REM 1. Start Next.js Server on Port 3000
echo [*] Starting Next.js Server on Port 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -WindowStyle Minimized -FilePath 'node.exe' -ArgumentList ('-e \"const fs=require(''fs''); let p=''' + '%~dp0next-app'.Replace('\', '/') + '''; try{if(fs.lstatSync(p).isSymbolicLink()){p=fs.readlinkSync(p);}}catch(e){} process.chdir(p); require(p+''/node_modules/next/dist/bin/next'');\" start -p 3000')"

REM 2. Wait 2 seconds for server to initialize
ping 127.0.0.1 -n 3 >nul

REM 3. Open Web App in default browser
echo [*] Opening Web Application in Browser...
start "" "http://localhost:3000"

exit

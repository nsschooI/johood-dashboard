@echo off
title JoHood Macro - Build Tool

echo.
echo  ==========================================
echo   JoHood Macro Builder
echo  ==========================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found!
    echo  Download from: https://nodejs.org
    pause
    start https://nodejs.org
    exit /b 1
)

echo  [1/3] Installing packages...
call npm install
if errorlevel 1 ( echo  [ERROR] npm install failed & pause & exit /b 1 )

echo.
echo  [2/3] Building .exe (2-3 minutes)...
call npm run build:win
if errorlevel 1 ( echo  [ERROR] Build failed & pause & exit /b 1 )

echo.
echo  ==========================================
echo   Done! Your .exe is in: release\
echo  ==========================================
echo.

explorer release
pause

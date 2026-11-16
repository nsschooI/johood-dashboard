@echo off
chcp 65001 >nul
title JoHood Macro - Build Tool
color 0C

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        JoHood Macro Builder          ║
echo  ║     بناء التطبيق على جهازك           ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js غير مثبت!
    echo.
    echo  نزله من: https://nodejs.org
    echo  اختار LTS ثم شغل هذا الملف مرة ثانية
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

echo  [OK] Node.js موجود
node --version

echo.
echo  [1/3] تثبيت المكتبات...
call npm install
if errorlevel 1 ( echo  [ERROR] فشل التثبيت & pause & exit /b 1 )

echo.
echo  [2/3] بناء التطبيق... (قد يأخذ 2-3 دقائق)
call npm run build:win
if errorlevel 1 ( echo  [ERROR] فشل البناء & pause & exit /b 1 )

echo.
echo  [3/3] تم بنجاح!
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   الملفات جاهزة في مجلد: release\   ║
echo  ║                                      ║
echo  ║   JoHood_Macro_Portable.exe          ║
echo  ║   (يشتغل بدون تثبيت مباشرة)         ║
echo  ╚══════════════════════════════════════╝
echo.

:: Open release folder
explorer release

pause

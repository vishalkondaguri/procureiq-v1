@echo off
title ProcureIQ Frontend - DO NOT CLOSE THIS WINDOW
echo ================================================
echo  ProcureIQ v1.0 - Frontend Startup
echo ================================================
echo.
echo  Opening at: http://localhost:3000
echo.
echo  Keep this window open while using ProcureIQ
echo ------------------------------------------------
echo.

cd /d "C:\Users\VishalBasavarajKonda\Downloads\ProcureIQ v1.0\procureiq-frontend"
npm run dev

echo.
echo Frontend stopped. Press any key to exit.
pause >nul

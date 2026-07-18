@echo off
title ProcureIQ Backend - DO NOT CLOSE THIS WINDOW
echo ================================================
echo  ProcureIQ v1.0 - Backend Startup
echo ================================================
echo.

echo [1/3] Checking Docker containers...
docker start procureiqv10-postgres-1 procureiqv10-redis-1 procureiqv10-minio-1 >nul 2>&1
ping 127.0.0.1 -n 4 >nul

echo [2/3] Starting FastAPI backend on port 8000...
echo.
set PYTHONPATH=C:\Users\VishalBasavarajKonda\Downloads\ProcureIQ v1.0\procureiq-backend
cd /d "C:\Users\VishalBasavarajKonda\Downloads\ProcureIQ v1.0\procureiq-backend"

echo  URL: http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo  Health: http://localhost:8000/health
echo.
echo  Admin login:  admin@procureiq.ai / Admin@123!
echo  Analyst login: analyst@procureiq.ai / Admin@123!
echo.
echo ------------------------------------------------
echo  Keep this window open while using ProcureIQ
echo ------------------------------------------------
echo.

.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

echo.
echo Backend stopped. Press any key to exit.
pause >nul

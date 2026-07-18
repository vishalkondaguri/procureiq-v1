@echo off
title ProcureIQ — First Time Setup
echo ============================================
echo  ProcureIQ v1.0 - First Time Setup
echo  Run this ONCE after installing Docker
echo ============================================

echo [1/3] Starting Docker infrastructure...
docker compose up -d postgres redis minio
echo Waiting 15 seconds for PostgreSQL to initialise...
timeout /t 15 /nobreak >nul

echo [2/3] Running database migrations...
set PYTHONPATH=%~dp0procureiq-backend
cd procureiq-backend
procureiq-backend\.venv\Scripts\python.exe -m alembic upgrade head

echo [3/3] Seeding demo data...
procureiq-backend\.venv\Scripts\python.exe -m app.db.seed

echo.
echo ============================================
echo  SETUP COMPLETE!
echo  Login: admin@procureiq.ai / Admin@123!
echo  Now run start-backend.bat + start-frontend.bat
echo ============================================
pause

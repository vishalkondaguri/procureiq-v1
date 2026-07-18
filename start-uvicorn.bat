@echo off
set PYTHONPATH=C:\Users\VishalBasavarajKonda\Downloads\ProcureIQ v1.0\procureiq-backend
cd /d C:\Users\VishalBasavarajKonda\Downloads\ProcureIQ v1.0\procureiq-backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> ..\uvicorn.log 2>> ..\uvicorn_err.log

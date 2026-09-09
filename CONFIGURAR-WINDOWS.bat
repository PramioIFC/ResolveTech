@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 backend\configure.py
) else (
  python backend\configure.py
)
pause

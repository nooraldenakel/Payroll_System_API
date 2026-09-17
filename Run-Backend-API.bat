@echo off
title Payroll Insight Pro — REST API Backend
echo Starting Payroll Insight Pro REST API Backend on http://localhost:8080...
cd /d "%~dp0backend"
call gradlew.bat run
pause

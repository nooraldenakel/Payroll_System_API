@echo off
title Payroll Insight Pro — Desktop Application
echo Starting Payroll Insight Pro Desktop Application...
cd /d "%~dp0desktop\dist-electron\win-unpacked"
start "" "Payroll Insight Pro.exe"
exit

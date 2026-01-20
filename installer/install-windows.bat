@echo off
REM Vinted AI Assistant - Windows Installer
REM Double-click this file to install or start the application

title Vinted AI Assistant - Installer

REM Change to the script directory
cd /d "%~dp0"

REM Run the PowerShell installation script
powershell -ExecutionPolicy Bypass -File "scripts\install.ps1"

REM Keep window open if there was an error
if errorlevel 1 (
    echo.
    echo An error occurred. Press any key to exit...
    pause >nul
)

@echo off
title GaslightGPT — The Sarcastic Oracle
echo ========================================================
echo   GASLIGHTGPT -- THE SARCASTIC ORACLE
echo   Dark Futuristic AI Sarcastic Chatbot
echo ========================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found in PATH! Please install Python.
    pause
    exit /b
)

echo Starting GaslightGPT server...
echo Access the application at: http://127.0.0.1:5000
echo.
python app.py
pause

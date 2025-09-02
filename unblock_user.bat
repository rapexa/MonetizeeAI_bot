@echo off
echo ========================================
echo    Mini App User Unblock Tool
echo ========================================
echo.

if "%1"=="" (
    echo Usage: unblock_user.bat ^<telegram_id^>
    echo Example: unblock_user.bat 76599340
    echo.
    pause
    exit /b 1
)

set TELEGRAM_ID=%1

echo Checking if Python is available...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH.
    echo Please install Python and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo Unblocking user %TELEGRAM_ID%...
echo.

python unblock_user.py %TELEGRAM_ID%

echo.
pause

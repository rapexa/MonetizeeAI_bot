@echo off
echo ==================================================
echo MonetizeeAI - Rebuilding with Telegram WebApp Support
echo ==================================================
echo.

echo 🔧 Changes made:
echo   ✅ Added Telegram WebApp script to index.html
echo   ✅ Enhanced Telegram data detection
echo   ✅ Added multiple initialization attempts
echo   ✅ Added detailed debug logging
echo.

echo [1/3] Cleaning previous build...
cd miniApp
if exist dist (
    rmdir /s /q dist
    echo ✅ Previous build cleaned
)

echo [2/3] Building with Telegram support...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo [3/3] Build completed!
echo.
echo 📁 New build ready in dist/ directory
echo.
echo 📋 Next Steps:
echo   1. Upload dist/ contents to your web server
echo   2. Test in Telegram: https://t.me/MonetizeeAI_bot/MonetizeAI
echo   3. Check console for debug logs:
echo      🔍 Window object available
echo      ✅ Telegram WebApp found  
echo      📱 Telegram WebApp ready
echo      ✅ Found Telegram ID: [USER_ID]
echo.
echo 🐛 If still not working, check console for:
echo   - "❌ Telegram WebApp not found"
echo   - "❌ No Telegram ID found"
echo   - Network errors to API endpoints
echo.
cd ..
pause

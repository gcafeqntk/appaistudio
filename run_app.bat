@echo off
echo Dang kiem tra Node.js...
SET PATH=C:\Program Files\nodejs;%PATH%
node --version
if %errorlevel% neq 0 (
    echo Khong tim thay Node.js! Vui long cai dat Node.js tu nodejs.org
    pause
    exit /b
)

echo.
echo ==========================================
echo DANG KHOI DONG APP...
echo Hay chac chan ban da nhap API Key vao file .env.local
echo ==========================================
echo.

call npm run dev
pause

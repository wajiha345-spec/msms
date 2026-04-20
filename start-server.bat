@echo off
echo ==========================================
echo   MSMS Backend + Cloudflare Tunnel
echo ==========================================
echo.

:: Start backend in a new window
start "MSMS Backend" cmd /k "cd /d C:\Users\inaam aslam\Desktop\msms\msms-backend && npm run dev"

:: Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

:: Start Cloudflare tunnel - prints a public URL
echo.
echo Starting Cloudflare Tunnel...
echo YOUR PUBLIC URL WILL APPEAR BELOW - COPY IT
echo ==========================================
"C:\Users\inaam aslam\Desktop\msms\cloudflared.exe" tunnel --url http://localhost:4000

pause

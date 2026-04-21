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

:: Start permanent Cloudflare tunnel
echo.
echo Starting Cloudflare Tunnel (api.msms-app.site)...
echo ==========================================
"C:\Users\inaam aslam\Desktop\msms\cloudflared.exe" tunnel run msms

pause

@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org/en/download
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  call npm.cmd ci
  if errorlevel 1 exit /b 1
)
echo IA-Recuerdo: http://127.0.0.1:5173/
echo Mantener esta ventana abierta. Ctrl+C detiene el servidor.
call npm.cmd run dev
pause

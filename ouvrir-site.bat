@echo off
REM Ouvrir le site StorePilot en local
REM 1. Ouvre le navigateur sur http://localhost:3000
REM 2. Lance le serveur de dev (si Node est installe)

start http://localhost:3000

echo.
echo Si le site ne s'ouvre pas, installe Node.js depuis https://nodejs.org/
echo Puis dans un terminal execute:
echo   cd "%cd%"
echo   npm install
echo   npm run dev
echo.
pause

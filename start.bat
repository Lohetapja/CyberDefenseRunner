@echo off
title Cyber Defense Runner

echo Starting Cyber Defense Runner...
echo.
echo Recommended URL:
echo http://localhost:3900
echo.

where python >nul 2>nul
if %errorlevel%==0 (
start http://localhost:3900
python -m http.server 3900
goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
start http://localhost:3900
py -m http.server 3900
goto end
)

echo Python was not found.
echo Please install Python or use another local server.
echo.
echo You can also try opening index.html directly, but localhost is recommended.
pause

:end

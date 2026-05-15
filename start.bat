@echo off

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 exit /b %errorlevel%
    echo.
)

echo Building...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Build failed! Check the error above.
    pause
    exit /b %errorlevel%
)

echo.
echo Starting server at http://localhost:3000
start http://localhost:3000
npx serve build

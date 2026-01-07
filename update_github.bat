@echo off
echo ========================================
echo Update Starlink Server on GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Git installation...
where git >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Git is not in your PATH!
    echo.
    echo Please use one of these options:
    echo.
    echo Option 1: Use Git Bash
    echo   - Right-click in server folder
    echo   - Select "Git Bash Here"
    echo   - Run: git add . ^&^& git commit -m "Update to MongoDB" ^&^& git push
    echo.
    echo Option 2: Use GitHub Desktop
    echo   - Open GitHub Desktop
    echo   - It will detect changes automatically
    echo   - Click "Commit to main" and "Push origin"
    echo.
    echo Option 3: Add Git to PATH
    echo   - Find Git installation (usually C:\Program Files\Git\cmd)
    echo   - Add to System PATH
    echo   - Restart PowerShell
    echo.
    pause
    exit /b 1
)

echo Git found!
echo.

echo Step 1: Adding all changed files...
git add .
echo.

echo Step 2: Committing changes...
git commit -m "Update: Migrate from SQLite to MongoDB"
if errorlevel 1 (
    echo.
    echo Note: If commit fails, you may need to configure Git first:
    echo   git config --global user.name "Your Name"
    echo   git config --global user.email "your.email@example.com"
    echo.
    pause
    exit /b 1
)
echo.

echo Step 3: Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo Push failed. You may need to:
    echo   1. Set up remote: git remote add origin https://github.com/YOUR_USERNAME/starlink-voucher-server.git
    echo   2. Or authenticate with GitHub
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Changes pushed to GitHub!
echo ========================================
echo.
pause

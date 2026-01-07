@echo off
echo ========================================
echo Upload Starlink Server to GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Checking Git installation...
git --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Git is not installed!
    echo.
    echo Please install Git from: https://git-scm.com/download/win
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo Git is installed!
echo.

echo Step 2: Initializing Git repository...
if exist ".git" (
    echo Git repository already exists.
) else (
    git init
    echo Git repository initialized.
)
echo.

echo Step 3: Adding files...
git add .
echo Files added.
echo.

echo Step 4: Committing changes...
git commit -m "Initial commit: Starlink voucher management server"
if errorlevel 1 (
    echo.
    echo Note: If this is not the first commit, that's okay.
    echo.
)
echo.

echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Create a repository on GitHub:
echo    - Go to https://github.com/new
echo    - Name it: starlink-voucher-server
echo    - DO NOT initialize with README
echo    - Click "Create repository"
echo.
echo 2. Run these commands (replace YOUR_USERNAME):
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/starlink-voucher-server.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo OR use GitHub Desktop (easier):
echo    - Download from https://desktop.github.com/
echo    - Add this folder as repository
echo    - Click "Publish repository"
echo.
echo ========================================
pause

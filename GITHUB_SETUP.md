# Upload Server to GitHub - Step by Step Guide

## Step 1: Install Git (if not installed)

1. Download Git from: https://git-scm.com/download/win
2. Install it with default settings
3. Restart PowerShell/Command Prompt after installation

## Step 2: Create GitHub Repository

1. Go to https://github.com/
2. Sign in (or create account)
3. Click the **"+"** icon in top right → **"New repository"**
4. Repository name: `starlink-voucher-server` (or any name you like)
5. Description: "Voucher code management server for Starlink Mobile App"
6. Choose **Public** or **Private**
7. **DO NOT** check "Initialize with README" (we already have files)
8. Click **"Create repository"**

## Step 3: Upload Code to GitHub

Open PowerShell in the `server` folder and run these commands:

```powershell
cd C:\Users\BPL\Desktop\test\server

# Initialize Git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Starlink voucher management server"

# Add GitHub repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/starlink-voucher-server.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** You'll be asked for your GitHub username and password (or personal access token).

## Step 4: Get Personal Access Token (if needed)

If GitHub asks for authentication:

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name: "Starlink Server Upload"
4. Select scopes: Check **"repo"** (full control of private repositories)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when pushing

## Alternative: Using GitHub Desktop

1. Download: https://desktop.github.com/
2. Install and sign in
3. Click **"File"** → **"Add Local Repository"**
4. Browse to: `C:\Users\BPL\Desktop\test\server`
5. Click **"Publish repository"**
6. Choose repository name and visibility
7. Click **"Publish Repository"**

## After Upload

Your code will be at: `https://github.com/YOUR_USERNAME/starlink-voucher-server`

You can then:
- Deploy directly from GitHub to platforms like Railway, Render, Heroku
- Share the repository with others
- Track changes and versions

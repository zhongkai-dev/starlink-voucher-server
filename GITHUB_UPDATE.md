# Update Code on GitHub - Quick Guide

## Option 1: Using Git Bash (Recommended)

1. **Open Git Bash** in the server folder:
   - Right-click in `C:\Users\BPL\Desktop\test\server` folder
   - Select **"Git Bash Here"**

2. **Run these commands:**
   ```bash
   # Check status
   git status
   
   # Add all changes
   git add .
   
   # Commit changes
   git commit -m "Update: Migrate from SQLite to MongoDB"
   
   # Push to GitHub
   git push origin main
   ```

3. **If asked for authentication:**
   - Username: Your GitHub username
   - Password: Use a Personal Access Token (not your GitHub password)
   - Get token from: https://github.com/settings/tokens

---

## Option 2: Using GitHub Desktop (Easiest)

1. **Open GitHub Desktop**
2. **It will automatically detect changes** in your repository
3. **Review the changes** (you'll see MongoDB updates)
4. **Write commit message**: "Update: Migrate from SQLite to MongoDB"
5. **Click "Commit to main"**
6. **Click "Push origin"** button at the top

---

## Option 3: Using Command Prompt (if Git is in PATH)

1. **Open Command Prompt** (not PowerShell)
2. **Navigate to server folder:**
   ```cmd
   cd C:\Users\BPL\Desktop\test\server
   ```
3. **Run the batch file:**
   ```cmd
   update_github.bat
   ```

---

## Option 4: Manual Commands

If you have Git working in any terminal:

```bash
cd C:\Users\BPL\Desktop\test\server

# Add all changes
git add .

# Commit with message
git commit -m "Update: Migrate from SQLite to MongoDB"

# Push to GitHub
git push origin main
```

---

## What Changed?

The update includes:
- ✅ Replaced SQLite with MongoDB
- ✅ Updated server.js to use Mongoose
- ✅ Updated package.json dependencies
- ✅ Updated README.md with MongoDB info
- ✅ Removed SQLite database file references

---

## Troubleshooting

### "Git is not recognized"
- Install Git: https://git-scm.com/download/win
- Or use Git Bash (comes with Git installation)
- Or use GitHub Desktop

### "Remote origin not found"
Run this first (replace YOUR_USERNAME):
```bash
git remote add origin https://github.com/YOUR_USERNAME/starlink-voucher-server.git
```

### "Authentication failed"
- Use Personal Access Token instead of password
- Create token: https://github.com/settings/tokens
- Select "repo" scope

### "Nothing to commit"
- All changes are already committed
- Just run: `git push origin main`

---

## After Pushing

Your MongoDB update will be on GitHub at:
`https://github.com/YOUR_USERNAME/starlink-voucher-server`

You can then:
- Deploy from GitHub to Railway/Render/Heroku
- Share the updated code
- Track all changes

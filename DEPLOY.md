# Deploy Starlink Voucher Server

After uploading to GitHub, you can deploy to various platforms:

## Option 1: Railway (Easiest - Free tier available)

1. Go to https://railway.app/
2. Sign up with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your `starlink-voucher-server` repository
6. Railway auto-detects Node.js and deploys
7. Get your URL (e.g., `starlink-voucher.up.railway.app`)
8. Update domain: Add custom domain `starlink.zhongkai.click`

## Option 2: Render (Free tier available)

1. Go to https://render.com/
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Settings:
   - **Name**: `starlink-voucher`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Click **"Create Web Service"**
7. Get your URL and add custom domain

## Option 3: Heroku

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Run:
   ```bash
   heroku login
   heroku create starlink-voucher
   git push heroku main
   ```
3. Get URL and add custom domain

## Option 4: VPS/Server (Your own server)

1. SSH into your server
2. Clone repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/starlink-voucher-server.git
   cd starlink-voucher-server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Install PM2:
   ```bash
   npm install -g pm2
   ```
5. Start server:
   ```bash
   pm2 start server.js --name starlink-voucher
   pm2 save
   pm2 startup
   ```
6. Configure Nginx/Apache to point to port 3000
7. Set up SSL with Let's Encrypt
8. Point domain `starlink.zhongkai.click` to your server

## Environment Variables

If needed, set `PORT` environment variable:
- Railway/Render: Set in dashboard
- Heroku: `heroku config:set PORT=3000`
- VPS: Add to `.env` file or PM2 ecosystem

## Update App API URL

After deployment, update `lib/main.dart`:
```dart
const String API_BASE = 'https://starlink.zhongkai.click';
```

Then rebuild the APK.

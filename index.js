const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sharp = require('sharp');

// Inisialisasi tanpa memaksa path Chrome tertentu
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGINT: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    console.log('--- SCAN QR CODE DI BAWAH INI ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp sudah aktif dan siap digunakan!');
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase();

    // FITUR STIKER (!s)
    if (body === '!s' || body === '!stiker') {
        if (msg.hasMedia || (msg.hasQuotedMsg && (await msg.getQuotedMessage()).hasMedia)) {
            const media = msg.hasMedia ? 
                await msg.downloadMedia() : 
                await (await msg.getQuotedMessage()).downloadMedia();

            if (media && media.mimetype.includes('image')) {
                await chat.sendStateTyping();
                try {
                    const buffer = Buffer.from(media.data, 'base64');
                    const processedImage = await sharp(buffer)
                        .resize(512, 512, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .webp()
                        .toBuffer();

                    const sticker = new MessageMedia('image/webp', processedImage.toString('base64'), 'sticker.webp');
                    
                    await client.sendMessage(msg.from, sticker, {
                        sendMediaAsSticker: true,
                        stickerName: "Bot Stiker Saya",
                        stickerAuthor: "Gemini Bot"
                    });
                } catch (err) {
                    msg.reply('❌ Gagal membuat stiker.');
                    console.error(err);
                }
            }
        }
    }

    // MENU LAINNYA
    else if (body === 'ping') {
        msg.reply('Pong! 🤖');
    }
    else if (body === '!menu') {
        msg.reply('*MENU BOT*\n1. !s (Stiker)\n2. !jam\n3. ping');
    }
    else if (body === '!jam') {
        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        msg.reply(`Waktu server: ${waktu}`);
    }
});

client.initialize();
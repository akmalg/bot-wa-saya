const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sharp = require('sharp');

// Konfigurasi Client untuk Deployment
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGINT: false,
        // Argumen penting agar Chromium bisa jalan di server Linux (Railway/VPS)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

// Munculkan QR Code di Terminal/Logs
client.on('qr', (qr) => {
    console.log('--- SCAN QR CODE DI BAWAH INI ---');
    qrcode.generate(qr, { small: true });
});

// Notifikasi Berhasil Login
client.on('ready', () => {
    console.log('✅ Bot WhatsApp sudah aktif dan siap digunakan!');
});

// Logika Pesan Masuk
client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase();

    // 1. FITUR STIKER (!s)
    if (body === '!s' || body === '!stiker') {
        if (msg.hasMedia || (msg.hasQuotedMsg && (await msg.getQuotedMessage()).hasMedia)) {
            
            const media = msg.hasMedia ? 
                await msg.downloadMedia() : 
                await (await msg.getQuotedMessage()).downloadMedia();

            if (media && media.mimetype.includes('image')) {
                await chat.sendStateTyping();
                try {
                    const buffer = Buffer.from(media.data, 'base64');
                    
                    // Olah gambar jadi kotak 512x512 transparan (format stiker)
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
                    msg.reply('❌ Gagal memproses gambar menjadi stiker.');
                    console.error(err);
                }
            } else {
                msg.reply('❌ Maaf, hanya bisa mengubah gambar menjadi stiker.');
            }
        } else {
            msg.reply('Kirim gambar dengan caption *!s* atau balas gambar dengan *!s*');
        }
    }

    // 2. FITUR PING
    else if (body === 'p' || body === 'ping') {
        await chat.sendStateTyping();
        msg.reply('Pong! Bot aktif 🤖');
    }

    // 3. FITUR MENU
    else if (body === '!menu') {
        await chat.sendStateTyping();
        const menu = `
*DAFTAR MENU BOT*
1. *!s* - Ubah gambar jadi stiker
2. *!jam* - Cek waktu server
3. *ping* - Cek status bot
        `;
        client.sendMessage(msg.from, menu);
    }

    // 4. FITUR CEK JAM
    else if (body === '!jam') {
        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        msg.reply(`Waktu saat ini (WIB): \n${waktu}`);
    }
});

// Inisialisasi Bot
client.initialize();
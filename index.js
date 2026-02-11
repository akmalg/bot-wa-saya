const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sharp = require('sharp');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Menggunakan path Chrome dari Railway (jika ada), jika tidak gunakan default lokal
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        handleSIGINT: false,
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

// Menampilkan QR Code di Logs Railway
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

    // --- FITUR STIKER (!s) ---
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
                    msg.reply('❌ Gagal memproses stiker.');
                    console.error(err);
                }
            } else {
                msg.reply('❌ Kirim atau balas gambar dengan !s');
            }
        }
    }

    // --- MENU DEFAULT ---
    else if (body === 'p' || body === 'ping') {
        msg.reply('Pong! Bot aktif 🤖');
    }

    else if (body === '!menu') {
        const menu = `
*DAFTAR MENU BOT*
1. *!s* - Ubah gambar jadi stiker
2. *!jam* - Cek waktu server
3. *ping* - Cek status bot
        `;
        client.sendMessage(msg.from, menu);
    }

    else if (body === '!jam') {
        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        msg.reply(`Waktu saat ini (WIB): \n${waktu}`);
    }
});

client.initialize();
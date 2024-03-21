const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { platform } = require('node:os');
const os = require('os');
const uploader = require('./.lib/upload.js');
const { askGPT } = require('./.lib/askGPT.js');
const chalk = require('chalk');
const { puppeteer } = require('puppeteer');
const { fromBuffer } = require('file-type');
const fetch = require('node-fetch');
const BASE_URL = 'https://aemt.me'

const emoji_loading = [
  '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛',
  '🕜', '🕤', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'
];
const react_loading = emoji_loading[Math.floor(Math.random() * emoji_loading.length)];
const react_done = '✔️'

const client = new Client({
        authStrategy: new LocalAuth({
        // proxyAuthentication: { username: 'username', password: 'password' },
        clientId: 'AlvBot',
        dataPath: './.data'
    }),
    puppeteer: {
        headless: true,
        // args: ['--proxy-server=proxy-server-that-requires-authentication.example.com'],
        args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", 
      "--disable-gpu",
    ],
        authStrategy: new LocalAuth(),
        executablePath: platform() === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome-stable'
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36'
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

console.log(client)

client.on("qr", (qr) => {
  console.log('QR RECEIVED', qr);
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', message => {
// jika pemulihan sesi tidak berhasil
    console.error('AUTHENTICATION FAILURE', message);
});

// auto reject jika telpon masuk
client.on("call", async call => {
  await call.reject();
  await client.sendMessage(call.from, `\`\`\`Maaf Cuma Bisa Chat!\`\`\``)
});

client.on('ready', async () => {
    console.log(`${JSON.stringify(client.info)}`)
});

client.initialize(); 

// message responses
client.on("message", async (message) => {
  console.log(chalk.bgYellow.black(`${message.fromMe ? 'Me' : message.from}`));
  console.log(chalk.bgYellow.black(`> ${message.body}`));

  const text = message.body.toLowerCase();
  // List fitur bot 
  if (text.startsWith(".ai")) {
    try {      
      const inputText = text.replace(".ai", "");
      if (!inputText) return message.reply('Enter questions!')
      message.react(react_loading);
      const chats = await askGPT(inputText);      
      console.log(chalk.bgGreen.black(`> ${chats.result}`));
      await client.sendMessage(message.from, chats.result, {
    });
      message.react(react_done);
    } catch (e) {
      console.log(e);
    }
   }  else if (text.startsWith(".sticker")) {
    try {
      const quotedMsg = await message.getQuotedMessage();
      if (!quotedMsg) await client.sendMessage(message.from, `Reply image messages with caption .sticker!`)                 
      if (quotedMsg && quotedMsg.hasMedia) {
        message.react(react_loading);
        const media = await quotedMsg.downloadMedia();
        client.sendMessage(message.from, media, { sendMediaAsSticker: true, stickerAuthor: "AlvBOT", stickerName: "Bot", stickerCategories: ["🗿", "😆"]});
        message.react(react_done);
      }
    } catch (e) {
      console.log(e);
    }   
     } else if (text.startsWith(".tourl")) {
    try {
      const quotedMsg = await message.getQuotedMessage();
      if (!quotedMsg) return message.reply('Reply image/file messages with caption *.tourl*')          
      if (quotedMsg && quotedMsg.hasMedia) {
        message.react(react_loading);
        const media = await quotedMsg.downloadMedia();
        const buffer = Buffer.from(media.data, 'base64');
        const cloud = await uploader(buffer)               
await message.reply(`
*Uploader*
MimeType: ${media.mimetype}
Data (length): ${media.data.length}
Preview: ${cloud}`)       
        message.react(react_done);
      }
    } catch (e) {
      console.log(e);
    }
    }  else if (text.startsWith(".bimg")) {
      try {        
        const inputText = text.replace(".bimg", "");
        if (!inputText) return message.reply('Enter parameter text!')
        message.react(react_loading);
        const res = await fetch(BASE_URL + `/bingimg` + `?text=${encodeURIComponent(inputText)}`).then(response => response.json()); 
        const imgs = await fetch(res.result).then(result => result.buffer());
        const response = new MessageMedia((await fromBuffer(imgs)).mime, imgs.toString("base64"))
        await client.sendMessage(message.from, response, { caption: `Prompt: ${inputText}`, quotedMessage: message.id._serialized });        
        message.react(react_done);
    } catch (e) {
        console.log(e);
    }
    } else if (text.startsWith(".info")) {
    try {
      let info = client.info;
      let _uptime = process.uptime() * 1000
      let timer = clockString(_uptime)
      let time = require('moment-timezone').tz('Asia/Jakarta').format('HH:mm:ss')
        client.sendMessage(message.from, `
┌ *INFO*
│ ◦ Runtime: ${timer}
│ ◦ User name: ${info.pushname}
│ ◦ My number: ${info.wid.user}
│ ◦ Platform: ${info.platform}
└
`);
    function clockString(ms) {
    let days = Math.floor(ms / (24 * 60 * 60 * 1000));
    let daysms = ms % (24 * 60 * 60 * 1000);
    let hours = Math.floor((daysms) / (60 * 60 * 1000));
    let hoursms = ms % (60 * 60 * 1000);
    let minutes = Math.floor((hoursms) / (60 * 1000));
    let minutesms = ms % (60 * 1000);
    let sec = Math.floor((minutesms) / (1000));
    return days + "d " + hours + "h " + minutes + "m " + sec + "s ";
}
    } catch (e) {
      console.log(e);
    } 
  } else if (text.startsWith(".groups")) {
    try {
        client.getChats().then(chats => {
            const groups = chats.filter(chat => chat.isGroup);

            if (groups.length == 0) {
                message.reply('You have no group yet.');
            } else {
                let replyMsg = '*GROUPS*\n\n';
                groups.forEach((group, i) => {
                    replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
                });
                message.reply(replyMsg);
            }
        });
    } catch (e) {
        console.log(e);
    }    
  }
});

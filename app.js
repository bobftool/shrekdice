const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async(message) => {
    const chat = await message.getChat();
    const contact = await message.getContact();
    const mentions = await message.getMentions();

    if(!message.id.participant){
        message.reply('pene');
    }

    if(message.id.participant){
        console.log(mentions[0].id.user);
    }
});

client.initialize();
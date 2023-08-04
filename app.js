const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const replies = require('./replies.json');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async(message) => {
    const chat = await message.getChat();
    const contact = await message.getContact();
    const mentions = await message.getMentions();

    const mentionsMe = mentions.find((mention) => {
        return mention.id.user === '5215535562214';
    })? true : false;

    if(chat.isGroup && mentionsMe && chat.id.user === '120363165440078106'){
        const input = message.body.replace(/\@[^\s]*/g, "").trim();
        const output = randomReply('any');

        message.reply(output);
        
        console.log(contact);
        console.log(message);
    }

    if(!chat.isGroup){
        //message.reply('pene');
    }
});

function randomReply(context){
    return replies[context][Math.floor(Math.random() * replies[context].length)]
}

client.initialize();
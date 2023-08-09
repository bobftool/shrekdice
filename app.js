const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const contexts = readJSON('contexts.json');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr)=>{
    qrcode.generate(qr, {small: true});
});

client.on('ready', ()=>{
    console.log('Client is ready!');
});

client.on('message', async(message)=>{
    const chat = await message.getChat();

    if(chat.isGroup){
        const mentions = await message.getMentions();
        const mentionsMe = containsMe(mentions);

        if(mentionsMe && chat.id.user === '120363165440078106'){
            const data = await processData(message);
            const output = generateReply(data);
            
            await client.sendMessage(data.groupId, output.reply, {quotedMessageId: output.quote});

            console.log('\n\n\n');
            if(data.messageQuoted) console.log('--------------------------------------\n| '+data.messageQuoted.messageText+' |');
            console.log('--------------------------------------')
            console.log('['+data.userName+']: '+data.messageText)
            console.log('--------------------------------------');
            console.log('[Bot]: '+output.reply);
            console.log('--------------------------------------');
        }
        else{

        }
    }
    else{

    }
});

function readJSON(file){
    return JSON.parse(fs.readFileSync(file));
}

function containsMe(mentions){
    return mentions.find((mention, index)=>{
        if(mention.id.user === '5215535562214'){
            mentions.splice(index, 1);
            return true;
        }
    })? true : false;
}

async function processData(message, isQuoted){
    const contact = await message.getContact();
    const chat = await message.getChat();
    const mentions = isQuoted? undefined : await message.getMentions();
    const quoted = isQuoted? undefined : await message.getQuotedMessage();

    return {
        userName: contact.pushname,
        userNumber: contact.id.user,
        userId: contact.id._serialized,
        groupName: chat.name,
        groupId: chat.id._serialized,
        messageText: processText(message.body),
        messageId: message.id._serialized,
        messageMentions: mentions? processMentions(mentions) : undefined,
        messageQuoted: quoted? await processData(quoted, true) : undefined,
        messageType: message.type,
        messageTime: message.timestamp,
        device: message.deviceType
    }
}

function processParticipants(participants){

}

function processText(text){
    return text.replace(/\@[^\s]*/g, '').trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function processMentions(mentions){
    let data = [];

    for(let mention of mentions){
        data.push({
            userName: mention.pushname,
            userNumber: mention.id.user,
            userId: mention.id._serialized
        });
    }

    return (data.length > 0)? data : undefined;
}

/*
function containsNumber(data, number){
    return data.find((item)=>{
        return item.userNumber == number;
    })? true : false;
}
*/

function generateReply(data){
    let reply, quote;
    const context = processContext(data.messageText);
    const quotedContext = data.messageQuoted? processContext(data.messageQuoted.messageText) : undefined;

    if(context){
        reply = randomReply(context);
        quote = data.messageQuoted? data.messageQuoted.messageId : data.messageId;
    }
    else if(quotedContext){
        reply = randomReply(quotedContext);
        quote = data.messageQuoted.messageId;
    }
    else{
        reply = randomReply(context);
        quote = data.messageId;
    }

    return {
        reply: processReply(reply, data),
        quote: quote
    }
}

function processContext(text){
    for(let context in contexts){
        for(let keyword of contexts[context].keywords){
            if(text.includes(keyword)){
                return context;
            }
        }
    }

    return undefined;
}

function randomReply(context){
    return contexts[context? context : 'any'].replies[Math.floor(Math.random() * contexts[context? context : 'any'].replies.length)];
}

function processReply(reply, data){
    for(let info in data){
        reply = reply.replaceAll('{'+info+'}', data[info]);
    }

    return reply;
}

client.initialize();
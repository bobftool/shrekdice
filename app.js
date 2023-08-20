require('dotenv').config();

const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { getGroup, addGroup, updateGroup } = require('./server');

const contexts = readJSON('contexts.json');
const media = readJSON('media.json');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr)=>{
    qrcode.generate(qr, {small: true});
});

client.on('ready', async()=>{
    console.log('WWEBJS FUNCIONANDO CORRECTAMENTE');
    await client.sendMessage(process.env.SHREKDICE_ADMINNUMBER+'@c.us', '*ℹ️ [CONEXIÓN ESTABLECIDA]*\n\n'+new Date(Math.floor(Date.now())));
});

client.on('message', async(message)=>{
    const chat = await message.getChat();
    const isOnDelay = await chatDelay(chat);

    console.log('[message]: '+message.body+'\n'+new Date(Math.floor(Date.now()))+'\n');

    if(chat.isGroup && !chat.archived && !isOnDelay){
        const mention = mentionsMe(await message.getMentions());
        const quoted = mention? undefined : (await quotedMe(await message.getQuotedMessage()));
        const random = (mention || quoted)? undefined : randomlyReply();

        if(mention || quoted || random){
            const data = await processData(message);
            const reply = generateReply(data);

            await sendReply(reply);
            
            console.log('[reply] ('+(mention? 'mention' : quoted? 'quoted' : 'random')+'): '+reply.text+'\n'+new Date(Math.floor(Date.now()))+'\n');
        }
    }
    else{
        if(chat.id.user == process.env.SHREKDICE_ADMINNUMBER){
            await replyAdmin(message);
        }
    }
});

function readJSON(file){
    return JSON.parse(fs.readFileSync(file));
}

function writeJSON(file, object){
    fs.writeFileSync(file, JSON.stringify(object));
}

async function chatDelay(chat){
    const group = await getGroup(chat.id._serialized);

    return group? ((Math.floor(Date.now()/1000) - group.lastMessageTime) < process.env.SHREKDICE_REPLYDELAY)? true : false : false;
}

function mentionsMe(mentions){
    return mentions.find((mention, index)=>{
        if(mention.id.user == process.env.SHREKDICE_USERNUMBER){
            mentions.splice(index, 1);
            return true;
        }
    })? true : false;
}

async function quotedMe(quoted){
    return quoted? ((await quoted.getContact()).id.user == process.env.SHREKDICE_USERNUMBER)? true : false : false;
}

function randomlyReply(){
    return (Math.floor(Math.random()*process.env.SHREKDICE_REPLYPROBABILITY) == 0);
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
        device: message.deviceType,
        chat: chat
    };
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

function generateReply(data){
    let reply, quote;
    const context = processContext(data.messageText);
    const quotedContext = data.messageQuoted? (data.messageQuoted.userNumber == process.env.SHREKDICE_USERNUMBER)? undefined : processContext(data.messageQuoted.messageText) : undefined;

    if(context){
        reply = randomReply(context);
        quote = data.messageQuoted? (data.messageQuoted.userNumber == process.env.SHREKDICE_USERNUMBER)? data.messageId : data.messageQuoted.messageId : data.messageId;
    }
    else if(quotedContext){
        reply = randomReply(quotedContext);
        quote = data.messageQuoted.messageId;
    }
    else{
        reply = randomReply(context);
        quote = data.messageId;
    }

    reply = processReply(reply, data);

    return {
        to: data.groupId,
        text: (reply.text.length > 0)? reply.text : undefined,
        quote: quote,
        sticker: reply.sticker? {
            media: MessageMedia.fromFilePath(reply.sticker),
            sendMediaAsSticker: true,
            stickerName: '@shrek_dice',
            stickerAuthor: '[Instagram: @WiStickers]'
        } : undefined,
        writing: async()=>{await data.chat.sendStateTyping();},
        recording: async()=>{await data.chat.sendStateRecording();},
        finish: async()=>{await data.chat.clearState();}
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
    let sticker;
    reply = reply.split(/[{}]/);

    for(let i=0, n=reply.length; i<n; i++){
        if(data[reply[i]]){
            reply[i] = data[reply[i]];
        }
        else if(media[reply[i]]){
            sticker = media[reply[i]][reply[i+1]].path;
            reply[i] = undefined;
            reply[i+1] = undefined;
            i++;
        }
    }

    return {
        text: reply.join(''),
        sticker: sticker
    };
}

async function sendReply(reply){
    const writingTime = (Math.floor(Math.random()*process.env.SHREKDICE_WRITINGTIME*1000));

    await updateGroup(reply.to);
    await reply.writing();

    setTimeout(async()=>{
        if(reply.text){
            await client.sendMessage(reply.to, reply.text, {quotedMessageId: reply.quote});
    
            if(reply.sticker){
                await client.sendMessage(reply.to, undefined, reply.sticker);
            }
        }
        else if(reply.sticker){
            await client.sendMessage(reply.to, undefined, {...reply.sticker, quotedMessageId: reply.quote});
        }
    
        await reply.finish();
    }, writingTime);
}

async function replyAdmin(message){
    const instructions = message.body.replace(/(\r\n|\n|\r| )/gm, '').split('!');
    let reply;

    switch(instructions[1]){
        case 'entrar':
            reply = await instructionEntrar(instructions[2], instructions[3]);
        break;

        default: reply =
        '*ℹ️ [MENÚ]*\n\n'+
        '*- Entrar a un grupo:*\n```!entrar\n!usuario\n!link```'
    }

    message.reply(reply);
}

async function instructionEntrar(user, link){
    if(user && link){
        const inviteCode = link.split('/').pop();

        try{
            const id = await client.acceptInvite(inviteCode);
            let group = await getGroup(id);

            if(group){
                return '*🔵 [YA ES PARTE DEL GRUPO]*\n\n' + groupInfo(group);
            }
            else{
                
                group = await addGroup(id, user, inviteCode);

                return '*🟢 [SE AGREGÓ UN NUEVO GRUPO]*\n\n' + groupInfo(group);
            }
        }
        catch{
            return '*🔴 [NO SE PUDO UNIR AL GRUPO]*';
        }
    }
    else{
        return '*ℹ️ [INFO]*\n\nEJEMPLO:\n```!entrar\n!usuario\n!link```';
    }
}

function groupInfo(group){
    return '*user:* '+group.user+'\n'+
    '*id:* '+group.id+'\n'+
    '*joinedTime:* '+new Date(group.joinedTime*1000)+'\n'+
    '*inviteCode:* https://chat.whatsapp.com/'+group.inviteCode+'\n'+
    '*lastMessageTime:* '+(group.lastMessageTime? new Date(group.lastMessageTime*1000) : 'NO HAY MENSAJES RECIENTES')+'\n'+
    '*messageCount:* '+group.messageCount+'\n'
}

client.initialize();
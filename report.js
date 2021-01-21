const nodemailer = require('nodemailer');
const fs = require('fs')


let rawData = fs.readFileSync('auth-data.json')
let authData = JSON.parse(rawData)
let login = authData["email"]["login"]
let psw  = authData["email"]["psw"]

let transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 25,
    secure: false,
    auth: {
      user: login,
      pass: psw
    }
  });
  
  async function sendLogs(){
    let result = await transporter.sendMail({
      from: '"StatsSender" <stats.report@yandex.ru>',
      to: "nikita199801@gmail.com",
      subject: "Stats sent",
      text: "This message was sent from Node js server.",
      attachments: [{
        filename: 'log.txt', path: './logs/log.txt'
      }]
    })
    console.log(result)
  }

module.exports.sendLogs = sendLogs
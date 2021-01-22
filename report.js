const nodemailer = require('nodemailer');
const moment = require('moment')
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
  
  async function sendLogsToEmail(){
    let result = await transporter.sendMail({
      from: '"StatsSender" <stats.report@yandex.ru>',
      to: "nikita199801@gmail.com",
      subject: "Stats sent",
      text: `Here are the data sending atteption logs on ${moment().format('ll')}`,
      attachments: [{
        filename: 'log.txt', path: './logs/log.txt'
      }]
    })
    console.log(result)
  }

  async function sendErrorLogsToEmail(){
    let result = await transporter.sendMail({
      from: '"StatsSender" <stats.report@yandex.ru>',
      to: "nikita199801@gmail.com",
      subject: "Stats sent",
      text: `Something went wrong in sending attempiton on ${moment().format('ll')}`,
      attachments: [{
        filename: 'error_logs.txt', path: './logs/error_logs.txt'
      }]
    })
  }


module.exports.sendLogsToEmail = sendLogsToEmail
module.exports.sendErrorLogsToEmail = sendErrorLogsToEmail
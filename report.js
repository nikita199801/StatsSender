const nodemailer = require('nodemailer');
const moment = require('moment')
const aws = require('aws-sdk')
const fs = require('fs')

aws.config.loadFromPath(__dirname+'/ses_config.json')

let transporter = nodemailer.createTransport({
   SES: new aws.SES({
     apiVersion: '2010-12-01'
   })
});

async function sendErrorLogsToEmail(){
  transporter.sendMail({
    from: "stats.report@yandex.ru",
    to: "nikita199801@gmail.com",
    subject: '=====SENDING_INFO=====',
    text: `Something went wrong in sending attempiton on ${moment().format('ll')}`,
    attachments: [{
      filename:`error_logs.txt`,
      path: __dirname+`/logs/error_logs.txt`
    }] 
  }, (err, info) => {
    console.log(info.envelope, info.messageId)
    fs.unlinkSync(__dirname+`/logs/error_logs.txt`)
  })
}

  async function sendLogsToEmail(){
    transporter.sendMail({
      from: "stats.report@yandex.ru",
      to: "nikita199801@gmail.com",
      subject: '=====SENDING_INFO=====',
      text: `Here are the data sending atteption logs on ${moment().format('ll')}`,
      attachments: [{
        filename:`logs.txt`,
        path: __dirname+`/logs/logs.txt`
      }] 
    }, (err, info) => {
      console.log(info.envelope, info.messageId)
      fs.unlinkSync(__dirname+`/logs/logs.txt`)
    })
  }

module.exports.sendLogsToEmail = sendLogsToEmail
module.exports.sendErrorLogsToEmail = sendErrorLogsToEmail

const fs = require('fs')
const readline = require('readline');
const http = require('http');
const moment = require('moment');
const {google} = require('googleapis');
const { fusiontables } = require('googleapis/build/src/apis/fusiontables');
const { get } = require('http');
const { format } = require('path');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

function getStatsWrapper(){
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err) 
    authorize(JSON.parse(content), getStats)
  })
}

async function getStats(auth){
  let row = await getCurrentRow(auth).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
  getCurrentStats(auth, row).then((counterStats)=>{
    if (counterStats[4].toLowerCase() == 'true') {
      sendData({counterStats:counterStats})
    } else {
<<<<<<< HEAD
      fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Some of the cells are empty. Data couldn't be sent \r\n`,{format: 'a+'})
=======
      console.log(`Some of the cells are empty. Data couldn't be sent`)
>>>>>>> 8a7c643743aaa79939da9fa3b39b126301ea84c5
    }
  }).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
}

function sendData(data){
  let body =JSON.stringify(data)
  options = {
    method: 'POST',
    headers : {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    },
  }
  fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Sending data on server \r\n`,{format: 'a+'})
  console.log(`Sending data on server`)
  const req = http.request('http://localhost:3000/send', options, (res)=>{
    console.log(`Data sent ${body}`)
    if (res.statusCode === 200) {
      fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Data Recived \r\n`,{format: 'a+'})
      return
    } else {
      fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: Data sending failed \r\n`,{format: 'a+'})
      return
    }
  })
  req.end(body)
}

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function getCurrentRow(auth){
  return new Promise(function (resolve, reject){
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
      spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
      range: "'Лист1'!H2",
    }, (err, res) => {
      if (err) reject('The API returned an error: ' + err)
      resolve(res.data.values)
    })
  })
}

function getCurrentStats(auth, row){
  return new Promise(function(resolve, reject){
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
      spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
      range: "'Лист1'!A2:E",
    }, (err, res) => {
      if (err) reject('The API returned an error: ' + err)
      const rows = res.data.values;
      if (rows[row][4].toLowerCase() == 'true'){
        setRowVar(auth, row)
        fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Data is ready, sending... \r\n`,{format: 'a+'})
        resolve(rows[row])
      } else {
        reject("Stats are incomplete or already have been sent")
      }
    });
  })
}

function setRowVar(auth, currentRowVar) {
  const sheets = google.sheets({version: 'v4', auth});
  let values = [[Number(currentRowVar)+1]]
  const resource = {
    values
  }
  sheets.spreadsheets.values.update({
    spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
    range: "H2",
    valueInputOption:'RAW',
    resource: resource
  }, (err, result) =>{
    if(err){
      console.log(err)
    } else {
      fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: H2 cell now is ${values[0][0]} \r\n`,{format: 'a+'})
    }
  })
}

  module.exports = getStatsWrapper
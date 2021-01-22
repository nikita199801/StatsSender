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
  let row = await getCurrentRow(auth)
  getCurrentStats(auth, row).then((counterStats)=>{
    if (counterStats[4].toLowerCase() == 'true') {
      sendData({counterStats:counterStats})
    } else {
      fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Some of the cells are empty. Data couldn't be sent \r\n`,{format: 'a+'})
    }
  }).catch(err => console.error(err))
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
    console.log('Waiting for response...')
    if (res.statusCode === 200) {
      console.log('Data Recived')
      return
    } else {
      console.error("Data sending failed")
      return
    }
  })
  req.end(body)
}

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  // Check if we have previously stored a token.
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
      // Store the token to disk for later program executions
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
        console.log("Data is ready, sending...")
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
      console.log("\nH2 cell now is %d", values[0][0])
    }
  })
}

  module.exports = getStatsWrapper
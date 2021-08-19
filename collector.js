const fs = require('fs')
const readline = require('readline');
const moment = require('moment');
const {google} = require('googleapis');
const axios  = require('axios');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = __dirname+'/token.json';

const errorLogs = __dirname+"/logs/error_logs.txt";
const logs = __dirname+"/logs/logs.txt";


function InitDataCollection(){
  fs.readFile(__dirname+'/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err); 
    authorize(JSON.parse(content), sendData);
  })
}

async function sendData(auth){
  const data = await getStats(auth);
  fs.appendFileSync(logs, `${moment().format('lll')} :: Stats collected \r\n`, { format: 'a+' });
  fs.appendFileSync(logs, `${moment().format('lll')} :: Sending data on server \r\n`,{format: 'a+'});
  console.log(`Sending data on server`);
  try {
    const res = await axios.post(`http://localhost:5000/send`, data);
    return;
  } catch (err){
    fs.appendFileSync(errorLogs, `${moment().format('lll')} :: Data sending failed \r\n`, { format: 'a+' });
    return;
  }
}

async function getStats(auth){
  try {
    const row = await getCurrentRow(auth).catch(err => fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}));
    const { counterStats, rowId} = await getCurrentStats(auth, row);
    if (counterStats[4].toLowerCase() == 'true') {
      setRowVar(auth, rowId);
      return counterStats;
    } else {
      fs.appendFileSync(logs, `${moment().format('lll')} :: Some of the cells are empty. Data couldn't be sent \r\n`, { format: 'a+' });
    }
  } catch (err) {
    fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`, { format: 'a+' });
  }
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

async function getCurrentRow(auth){
  try {
    const sheets = google.sheets({ version: 'v4', auth});
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
      range: "'Лист1'!H2",
    })
    return res.data.values;
  } catch (err) {
    console.error('The API returned an error: ' + err);
  }
}

async function getCurrentStats(auth, rowId){
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
      range: "'Лист1'!A2:E",
    })

    const counterStats = res.data.values;

    if (counterStats[rowId][4].toLowerCase() == 'true') {
      fs.appendFileSync(logs, `${moment().format('lll')} :: Data is ready, sending... \r\n`, { format: 'a+' })
      return { counterStats: counterStats[rowId], rowId: rowId};
    } else {
      console.log("Stats are incomplete or already have been sent");
    }
  } catch (err) {
    console.error('The API returned an error: ' + err);
  }
}

function setRowVar(auth, currentRowId) {
  const sheets = google.sheets({version: 'v4', auth});
  let values = [[Number(currentRowId)+1]]
  const resource = {
    values
  };
  sheets.spreadsheets.values.update({
    spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
    range: "H2",
    valueInputOption:'RAW',
    resource: resource
  }, (err, result) =>{
    if(err){
      console.log(err);
    } else {
      fs.appendFileSync(logs, `${moment().format('lll')} :: Next row will be ${values[0][0] + 1} \r\n`,{format: 'a+'});
    }
  })
}

module.exports = InitDataCollection;
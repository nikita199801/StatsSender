const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const { fusiontables } = require('googleapis/build/src/apis/fusiontables');
const { get } = require('http');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

let counterStats

function foo(params) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) console.log('Error loading client secret file:', err)
    authorize(JSON.parse(content), getStats)
    // Authorize a client with credentials, then call the Google Sheets API.
  });
}

console.log(foo())

function getStats(auth){
  getCurrentRow(auth)
  .then(currentRowVar => {
    const currentRow = currentRowVar[0][0]
    console.log (currentRow)
    getCurrentStats(auth ,currentRow).then( stats => { 
      counterStats = stats
      console.log(counterStats)
    })
  }).then(()=>setRowVar(auth, currentRowVar))
}

// function getStats(auth) {
//   getCurrentRow(auth)
//   .then(currentRowVar => getCurrentStats(auth, currentRowVar[0][0]))
//   .then(stats =>{
//     counterStats = stats
//     console.log(counterStats)
//     // setRowVar(auth, currentRow)
//   }).then(()=> setRowVar(auth, currentRow))
// }



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
  
  // /**
  //  * Prints the names and majors of students in a sample spreadsheet:
  //  * @see https://docs.google.com/spreadsheets/d/1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M/edit
  //  * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
  //  */

  function getCurrentRow(auth){
    return new Promise(function (resolve, reject){
      const sheets = google.sheets({version: 'v4', auth});
      sheets.spreadsheets.values.get({
        spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
        range: "'Лист1'!J2",
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
        (rows[row][4])?resolve(rows[row]):reject("This stats already sent")
      });
    })
  }

 async function setRowVar(auth, currentRowVar) {
  const sheets = google.sheets({version: 'v4', auth});
    let values = [[Number(currentRowVar)+1]]
    const resource = {
      values
    }
    sheets.spreadsheets.values.update({
      spreadsheetId: '1-RSIrL-tMbOUyBpy63WrQCMvo43OtUd-Nmn2pNOnH0M',
      range: "J2",
      valueInputOption:'RAW',
      resource: resource
    }, (err, result) =>{
      if(err){
        console.log(err)
      } else {
        console.log("Updated J2 %d", values[0][0])
      }
    })
  }

  // module.exports = getStatsFromSpreadsheet
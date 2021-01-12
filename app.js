const { rejects } = require('assert');
const fs = require('fs');
const https = require('https');
const { resolve } = require('path');
const xlsx = require('xlsx')
const fileDir = __dirname+"/stats.xlsx"

let rawData = fs.readFileSync('auth-data.json')
let authData = JSON.parse(rawData)
let login = authData["login"]
let psw  = authData["psw"]

statsData = {
    coldWater : 0,
    hotWater: 0,
    electro: 0,
    heat: 0
}

const optionsPost = {
    port: 443, 
    method: 'POST',
  };

const optionsGet = {
    port: 443,
    method: 'GET',
};
  
function authAndGetSessionID (login, pws){
    return new Promise(function(resolve, reject) {
        const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=auth&query=login&login=${login}&psw=${psw}`, optionsPost, (res) => {
            res.on('data', (data) => {
                let sessionID = JSON.parse(data)['data'][0]['session']
                if (sessionID == undefined) {
                    reject(new Error("No data"))
                } else {
                    resolve(sessionID)
                }
            })
        })
        req.on('error', (e) => {
            console.error(e);
        });

        req.end()
    })
}

function getLsINFO(sessionID) {
    return new Promise(function (resolve, reject) {
        const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=LSList&session=${sessionID}`, optionsPost, (res) => {
            let cookie = (res.headers['set-cookie'][0]).slice(0,111)
            res.on('data', (data) => {
                serviceID = JSON.parse(data)['data'][0]["id_service"]
                if (serviceID == undefined) {
                    reject(new Error("No serviceID"))
                } else {
                    let arr = []
                    arr.push(cookie, serviceID)
                    resolve (arr)
                }
            })
        })
        req.on('error', (e) => {
            console.error(e);
        });
        req.end();
    }) 
}
authAndGetSessionID(login,psw).then( (sessionID)=> {
    getLsINFO(sessionID).then((data) => {
        let cookie = data[0] 
        console.log(data[0], data[1])
        const req = https.request(`https://my.mosenergosbyt.ru/accounts/${serviceID}/events/payment-doc`, {port: 443,
        method: 'GET', headers: {'session-cookie':`${cookie}`}}, (res) => {
            console.log('hashha')
        })
    })

})




// req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=GetProfileAttributesValues&session=${session}`, optionsPost, (res) => {
//     console.log(JSON.parse(res))
// })
// req.on('error', (e) => {
//   console.error(e);
// });
// req.end();
    
// https.get("https://my.mosenergosbyt.ru/accounts/10818835/transfer-indications", (res) => {
//     console.log(res)
//     console.log(__dirname+"/stats.xlsx")
// })


// function CollectDataFromExel(dir){
//     const workbook = xlsx.readFile(dir)
//     const sheet = workbook.Sheets[workbook.SheetNames[0]]
//     statsData.coldWater = sheet["A2"].v
//     statsData.hotWater = sheet["B2"].v
//     statsData.electro = sheet["C2"].v
//     statsData.heat =  sheet["D2"].v
//     console.log(JSON.stringify(statsData))
// }

https.createServer((req, res) => {
    // CollectDataFromExel(fileDir)
    res.write(req)
}).listen(8080)


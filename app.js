const { rejects } = require('assert');
const fs = require('fs');
const https = require('https');
const { resolve } = require('path');
const xlsx = require('xlsx')
const moment = require('moment');
const { Cipher } = require('crypto');
const fileDir = __dirname+"/stats.xlsx"
const {google} = require('googleapis')
const st = require('./gsheetconnection')

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

  
function authAndGetSessionID (login, pws){
    return new Promise(function(resolve, reject) {
        const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=auth&query=login&login=${login}&psw=${psw}`, optionsPost, (res) => {
            res.on('data', (data) => {
                let sessionID = JSON.parse(data)['data'][0]['session']
                let cookie = res.headers['set-cookie']
                optionsPost.headers = {'Cookie': cookie}
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

function getProviderInfo(sessionID) {
    return new Promise(function (resolve, reject) {
        const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=LSList&session=${sessionID}`, optionsPost, (res) => {
            res.on('data', (data) => {
                vl_provider = JSON.parse(data)['data'][0]["vl_provider"]
                if (vl_provider == undefined) {
                    reject(new Error("Can't find provider"))
                } else {
                    let arr = [sessionID, vl_provider]
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

function getCountersData(sessionID,vl_provider) {
    return new Promise(function(resolve, reject) {
        let counters = []
        const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=smorodinaTransProxy&session=${sessionID}&plugin=smorodinaTransProxy&proxyquery=AbonentEquipment&vl_provider=%7B%22id_abonent%22%3A${vl_provider}%7D`, optionsPost, (res) => {
            res.on('data', (data) => {
                JSON.parse(data)['data'].forEach(counterData => {
                    let counter = {'id': counterData['id_counter'], 'name': counterData['nm_counter'], 'id_zn':counterData['id_counter_zn'], 'lastData': counterData['vl_last_indication'], 'descr': counterData['nm_service']}
                    counters.push(counter)
                });
                if (counters.length === 0) {
                    reject(new Error("No Counter Data"))
                } else {
                    resolve(counters)
                }
            } )
        })
        req.on('error', (e) => {
            console.error(e);
        });
        req.end()
    })
}

function sendIndications (sessionID, counters, vl_provider) {
    return new Promise(function(resolve, reject) {
        for(let idx = 0; idx < 1; idx++){
            date = moment().format()
            const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=AbonentSaveIndication&session=${sessionID}&dt_indication=${date}&id_counter=${counters[idx]['id']}&id_counter_zn=${counters[idx]['id_zn']}&id_source=15418&plugin=propagateMoeInd&pr_skip_anomaly=0&pr_skip_err=0&vl_indication=71&vl_provider=%7B%22id_abonent%22%3A${vl_provider}%7D`, 
        optionsPost, (res) => {
                res.on('data', (data) => {
                    let nm_result = JSON.parse(data)['data']
                    process.stdout.write(data)
                })
            })
            req.end()
        }
    })
}

authAndGetSessionID(login,psw).then( sessionID => {
    getProviderInfo(sessionID).then( data => {
        let sessionID = data[0]
        let vl_provider = data[1].slice(14,22)
        getCountersData(sessionID, vl_provider).then(data => {
            sendIndications(sessionID,data,vl_provider)
        })
    })

})

function CollectDataFromExel(dir){
    const workbook = xlsx.readFile(dir)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    statsData.coldWater = sheet["A2"].v
    statsData.hotWater = sheet["B2"].v
    statsData.electro = sheet["C2"].v
    statsData.heat =  sheet["D2"].v
    console.log(JSON.stringify(statsData))
}

https.createServer((req, res) => {
    // CollectDataFromExel(fileDir)
    res.write(req)
}).listen(8080)


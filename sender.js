const { rejects } = require('assert');
const { resolve } = require('path');
const moment = require('moment');
const fs = require('fs');
const https = require('https')



let rawData = fs.readFileSync('auth-data.json')
let authData = JSON.parse(rawData)
let login = authData["login"]
let psw  = authData["psw"]



async function sendStatsToLK(spreadsheetStats){
    console.log("Sending data to mosenergosbyt.ru...")
    let sessionID = await authAndGetSessionID(login, psw)
    let providerInfo = await getProviderInfo(sessionID)
    let vl_provider = providerInfo[1].slice(14,22)
    let countersData = await getCountersData(sessionID, vl_provider)
    let dataToSend = await (async()=>{
        let updatedCountersData =[]
        for(idx = 0; idx < 4; idx++) {
            if (spreadsheetStats[idx] < countersData[idx].lastData){
                console.log("New data can't be less than last data")
                countersData[idx].currentStats = countersData[idx].lastData
                updatedCountersData.push(countersData[idx]) 
            } else {
                countersData[idx].currentStats = Number(spreadsheetStats[idx])
                updatedCountersData.push(countersData[idx])
            }
        }
        return updatedCountersData
    })()
    sendIndications(sessionID, countersData, vl_provider)
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
        for(let idx = 0; idx < counters.length; idx++){
            date = moment().format()
            const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=AbonentSaveIndication&session=${sessionID}&dt_indication=${date}&id_counter=${counters[idx]['id']}&id_counter_zn=${counters[idx]['id_zn']}&id_source=15418&plugin=propagateMoeInd&pr_skip_anomaly=0&pr_skip_err=0&vl_indication=${counters[idx].currentStats}&vl_provider=%7B%22id_abonent%22%3A${vl_provider}%7D`, 
        optionsPost, (res) => {
                console.log(`\n${counters[idx].descr} data updated`)
                res.on('data', (data) => {
                    process.stdout.write(data)
                })
            })
            req.end()
        }
    })
}

module.exports = sendStatsToLK
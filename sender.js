const { rejects } = require('assert');
const { resolve } = require('path');
const moment = require('moment');
const fs = require('fs');
const https = require('https');
const { auth } = require('googleapis/build/src/apis/abusiveexperiencereport');
const { log } = require('util');
const report = require('./report')

let optionsPost = {
    port: 443, 
    method: 'POST',
    headers:{}
  };

let login = process.env.LOGIN_MOSOBL
let psw  = process.env.PSW_MOSOBL

async function sendStatsToLK(spreadsheetStats){
    fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Sending data to mosenergosbyt.ru... \r\n`,{format: 'a+'})
    let sessionID = await authAndGetSessionID(login, psw).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let providerInfo = await getProviderInfo(sessionID).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let vl_provider = providerInfo[1].slice(14,22)
    let countersData = await getCountersData(sessionID, vl_provider).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let dataToSend = await (async()=>{
        let updatedCountersData =[]
        for(idx = 0; idx < 4; idx++) {
            if (spreadsheetStats[idx] < countersData[idx].lastData){
                // console.log("New data can't be less than last data")
                countersData[idx].currentStats = countersData[idx].lastData
                updatedCountersData.push(countersData[idx]) 
            } else {
                countersData[idx].currentStats = Number(spreadsheetStats[idx])
                updatedCountersData.push(countersData[idx])
            }
        }
        return updatedCountersData
    })()
    sendIndications(sessionID, dataToSend, vl_provider)
}


async function getReciveDate(){
    let sessionID = await authAndGetSessionID(login, psw).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let providerInfo = await getProviderInfo(sessionID).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let vl_provider = providerInfo[1].slice(14,22)
    let reciveDate = await getCountersData(sessionID, vl_provider).catch(err => fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    return reciveDate
}


function authAndGetSessionID (login, psw){
    return new Promise(function(resolve, reject) {
        const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=auth&query=login&login=${login}&psw=${psw}`, optionsPost, (res) => {
            res.on('data', (data) => {
                if (optionsPost.headers["Cookie"] === undefined){
                    let cookie = res.headers['set-cookie']
                    optionsPost.headers = {'Cookie': cookie}
                }
                let sessionID = JSON.parse(data)['data'][0]['session']
                if (sessionID == undefined) {
                    reject(new Error("No data"))
                } else {
                    console.log(sessionID)
                    resolve(sessionID)
                }
            })
        })
        req.on('error', err => {
            fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: Error while auth  \r\n`,{format: 'a+'})
            report.sendErrorLogsToEmail()
        })
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
        req.on('error', err => {
            fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: Error while getting provider info  \r\n`,{format: 'a+'})
            report.sendErrorLogsToEmail()
        })
        req.end();
    }) 
}

function getCountersData(sessionID,vl_provider) {
    return new Promise(function(resolve, reject) {
        let counters = []
        const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=smorodinaTransProxy&session=${sessionID}&plugin=smorodinaTransProxy&proxyquery=AbonentEquipment&vl_provider=%7B%22id_abonent%22%3A${vl_provider}%7D`, optionsPost, (res) => {
            res.on('data', (data) => {
                JSON.parse(data)['data'].forEach(counterData => {
                    let counter = {
                        'id'                    :counterData['id_counter'], 
                        'name'                  :counterData['nm_counter'], 
                        'id_zn'                 :counterData['id_counter_zn'], 
                        'lastData'              :counterData['vl_last_indication'], 
                        'descr'                 :counterData['nm_service'], 
                        'nn_ind_receive_start'  :counterData['nn_ind_receive_start'], 
                        'nn_ind_receive_end'    :counterData['nn_ind_receive_end']
                    }
                    counters.push(counter)
                });
                if (counters.length === 0) {
                    reject(new Error("No Counter Data"))
                } else {
                    resolve(counters)
                }
            } )

        })
        req.on('error', err => {
            fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: Error while getting counters data  \r\n`,{format: 'a+'})
            report.sendErrorLogsToEmail()
        })
        req.end()
    })
}

function sendIndications (sessionID, counters, vl_provider) {
    return new Promise(function(resolve, reject) {
        for(let idx = 0; idx < counters.length; idx++){
            date = moment().format()
            const req = https.request(`https://my.mosenergosbyt.ru/gate_lkcomu?action=sql&query=AbonentSaveIndication&session=${sessionID}&dt_indication=${date}&id_counter=${counters[idx]['id']}&id_counter_zn=${counters[idx]['id_zn']}&id_source=15418&plugin=propagateMoeInd&pr_skip_anomaly=0&pr_skip_err=0&vl_indication=${counters[idx].currentStats}&vl_provider=%7B%22id_abonent%22%3A${vl_provider}%7D`, 
        optionsPost, (res) => {
                fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: ${counters[idx].descr} data updated \r\n`,{format: 'a+'})
                report.sendLogsToEmail()
                res.on('data', (data) => {
                    fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: ${JSON.parse(data)['data'][0]['nm_result']} \r\n`,{format: 'a+'})
                })
            })
            req.on('error', err =>{
                fs.appendFileSync('./logs/error_logs.txt', `${moment().format('lll')} :: Error while sending indications  \r\n`,{format: 'a+'})
                report.sendErrorLogsToEmail()
            })
            req.end()
        }
        console.log("Report sent to email")
    })
}


module.exports.sendStatsToLK = sendStatsToLK
module.exports.getReciveDate = getReciveDate
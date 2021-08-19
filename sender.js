const moment = require('moment');
const fs = require('fs');
const https = require('https');
const { auth } = require('googleapis/build/src/apis/abusiveexperiencereport');
const report = require('./report');
const axios = require('axios');


const errorLogs = __dirname+"/logs/error_logs.txt"
const logs = __dirname+"/logs/logs.txt"
const url = 'https://my.mosenergosbyt.ru'

let {login, psw} = require('./auth-data.json').mosobl;

async function sendStatsToLK(spreadsheetStats){
    fs.appendFileSync(logs, `${moment().format('lll')} :: Sending data to mosenergosbyt.ru... \r\n`,{format: 'a+'})
    let sessionID = await authAndGetSessionID(login, psw).catch(err => fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let providerInfo = await getProviderInfo(sessionID).catch(err => fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let countersData = await getCountersData(sessionID, providerInfo).catch(err => fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    const dataToSend = await (async()=>{
        let updatedCountersData =[]
        for(idx = 0; idx < 4; idx++) {
            if (spreadsheetStats[idx] < countersData[idx].lastData){
                countersData[idx].currentStats = countersData[idx].lastData
                updatedCountersData.push(countersData[idx]) 
            } else {
                countersData[idx].currentStats = Number(spreadsheetStats[idx])
                updatedCountersData.push(countersData[idx])
            }
        }
        return updatedCountersData
    })()
    await sendIndications(sessionID, dataToSend, providerInfo);
    report.sendLogsToEmail().catch(err => console.log(err));
}


async function getReciveDate(){
    let sessionID = await authAndGetSessionID(login, psw).catch(err => fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let providerInfo = await getProviderInfo(sessionID).catch(err => fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    let reciveDate = await getCountersData(sessionID, vl_provider).catch(err => fs.appendFileSync(errorLogs, `${moment().format('lll')} :: ${err} \r\n`,{format: 'a+'}))
    return reciveDate
}

async function authAndGetSessionID (login, psw){
    const res = await axios.post(`${url}/gate_lkcomu?action=auth&query=login&login=${login}&psw=${psw}`)
    return res.data.data[0].session
}
async function getProviderInfo(sessionID) {
    const res = await axios.get(`${url}/gate_lkcomu?action=sql&query=LSList&session=${sessionID}`)
    const vlProvider = res.data.data[0].vl_provider;
    if (vlProvider === undefined) {
        fs.appendFileSync(errorLogs, `${moment().format('lll')} :: vl_provider not found \r\n`, { format: 'a+' })
        return
    }
    return JSON.parse(vlProvider)
}

async function getCountersData(sessionID,vl_provider) {
    const res = await axios.post(`${url}/gate_lkcomu?action=sql&query=smorodinaTransProxy&session=${sessionID}&vl_provider=${JSON.stringify(vl_provider)}&plugin=smorodinaTransProxy&proxyquery=AbonentEquipment`)
    const counters = res.data.data.map( (counter) => {
        return {
            'id':                   counter['id_counter'],
            'name':                 counter['nm_counter'],
            'id_zn':                counter['id_counter_zn'], 
            'lastData':             counter['vl_last_indication'], 
            'descr':                counter['nm_service'], 
            'nn_ind_receive_start': counter['nn_ind_receive_start'], 
            'nn_ind_receive_end':   counter['nn_ind_receive_end']
        }
    })
    return counters
}

async function sendIndications (sessionID, counters, vl_provider) {
    const date = moment().format()
    await Promise.all(counters.map(async (counter) => {
        const res = await axios.post(`${url}/gate_lkcomu?action=sql&query=AbonentSaveIndication&session=${sessionID}&dt_indication=${date}&id_counter=${counter['id']}&id_counter_zn=${counter['id_zn']}&id_source=15418&plugin=propagateMoeInd&pr_skip_anomaly=0&pr_skip_err=0&vl_indication=${counter.currentStats}&vl_provider=%7B%22id_abonent%22%3A${vl_provider.id_abonent}%7D`)
        fs.appendFileSync(logs, `${moment().format('lll')} :: ${counter.descr} data updated | ${res.data.data[0].nm_result}\r\n`,{format: 'a+'})
    }))
    console.log("Report sent to email")
}
module.exports.sendStatsToLK = sendStatsToLK
module.exports.getReciveDate = getReciveDate
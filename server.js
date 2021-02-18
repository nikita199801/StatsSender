const { Stats, stat, fstat } = require('fs');
const http = require('http');
const moment = require('moment');
const sender = require('./sender')
const collector = require('./collector')
const cron = require ('node-cron')
const fs = require('fs')

const errorLogs = __dirname+"/logs/error_logs.txt"
const logs = __dirname+"/logs/logs.txt"

const hostname = '127.0.0.1';
const port = 5000;

async function startApp(){
    const server = http.createServer(eventHandler);
    server.listen(port, () => {
        console.log(`Server running at http://${hostname}:${port}/`)
        cron.schedule('* */12 * * *', () => {
            sender.getReciveDate()
            .then(countersData =>{
                let reciveStart = countersData[0].nn_ind_receive_start
                let reciveEnd = countersData[0].nn_ind_receive_end
                let today = new Date().getDate()
                console.log('Attempt to send')
                if ((today >= reciveStart)&(today <= reciveEnd)){
                    req = http.request(`http://${hostname}:${port}/ready`,{method: 'GET'}, (req, res) =>{
                    })
                    req.end()
                }
            })
            .catch(err => console.log(err))
        }, {timezone : "Europe/Moscow"})
    })
}

function eventHandler(req, res){
    switch (req.method){
        case 'GET':{
            switch(req.url){
                case '/ready':{
                    fs.appendFileSync(logs, `${moment().format('lll')} :: Trying to collect data... \r\n`, {format: 'a+'})
                    fs.appendFileSync(errorLogs, `${moment().format('lll')} :: Trying to collect data... \r\n`, {format: 'a+'})
                    collector()
                    res.end()
                    break
                }
            }
        }
        case 'POST':{
            switch(req.url){
                case '/send':{
                    fs.appendFileSync(logs, `${moment().format('lll')} :: Incoming request... \r\n`, {format: 'a+'})
                    res.statusCode = 200
                    res.setHeader('Content-Type', 'text/plain');
                    req.on('data', data =>{
                        let stats = JSON.parse(data).counterStats
                        fs.appendFileSync(logs, `${moment().format('lll')} :: Income data ${stats} \r\n`, {format: 'a+'})
                        fs.appendFileSync(logs, `${moment().format('lll')} :: Successfully recived data from spreadSheet \r\n`, {format: 'a+'})
                        sender.sendStatsToLK(stats)
                    })

                    res.end();
                    req.on('end', ()=> {
                        fs.appendFileSync(logs, `${moment().format('lll')} :: Data sending finished! \r\n`, {format: 'a+'})
                    })

                    req.on('error', (err)=> {
                        fs.appendFileSync(errorLogs, `${moment().format('lll')} :: Something went wrong \r\n`, {format: 'a+'})
                    })
                    break;
                }
            }
        }
    }
}


module.exports = startApp
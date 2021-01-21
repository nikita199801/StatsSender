const { Stats, stat, fstat } = require('fs');
const http = require('http');
const moment = require('moment');
const sender = require('./sender')
const collector = require('./collector')
const cron = require ('node-cron')
const fs = require('fs')
const hostname = '127.0.0.1';
const port = 3000;

async function startApp(){
    const server = http.createServer(eventHandler);
    const countersData = await sender.getReciveDate().catch(err => console.log(err))
    let reciveStart = countersData[0].nn_ind_receive_start
    let reciveEnd = countersData[0].nn_ind_receive_end
    let today = new Date().getDate()
    server.listen(port, hostname, () => {
        console.log(`Server running at http://${hostname}:${port}/`)
        cron.schedule('* 0 0 * * *', () => {
            if ((today>= reciveStart)&(today< reciveEnd)){
                req = http.request('http://127.0.0.1:3000/ready',{method: 'GET'}, (req, res) =>{
                })
                req.end()
            }
        })
    })
}



function eventHandler(req, res){
    switch (req.method){
        case 'GET':{
            switch(req.url){
                case '/ready':{
                    fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Trying to collect data... \r\n`, {format: 'a+'})
                    console.log('Trying to collect data...')
                    collector()
                    res.end()
                    break
                }
            }
        }
        case 'POST':{
            switch(req.url){
                case '/send':{
                    fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Incoming request... \r\n`, {format: 'a+'})
                    // console.log("Incoming request...")
                    res.statusCode = 200
                    res.setHeader('Content-Type', 'text/plain');
                    req.on('data', data =>{
                        let stats = JSON.parse(data).counterStats
                        fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Income data ${stats} \r\n`, {format: 'a+'})
                        // console.log('Income data:', stats)
                        fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Successfully recived data from spreadSheet \r\n`, {format: 'a+'})
                        // console.log('Successfully recived data from spreadSheet')
                        sender.sendStatsToLK(stats)
                    })
                    res.end();
                    req.on('end', ()=> {
                        fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Data sending finished! \r\n`, {format: 'a+'})
                        // console.log('Data sendig finished!')
                    })

                    req.on('error', (err)=> {
                        fs.appendFileSync('./logs/log.txt', `${moment().format('lll')} :: Something went wrong \r\n`, {format: 'a+'})
                        // console.error("Something went wrong", err)
                    })
                    break;
                }
            }
        }
    }
}



module.exports = startApp
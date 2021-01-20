const { Stats, stat } = require('fs');
const http = require('http');
const dataSending = require('./sender')
const collectData = require('./collector')

const hostname = '127.0.0.1';
const port = 3000;

function startApp(){
    const server = http.createServer(eventHandler);

    server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);

    });
}


function eventHandler(req, res){
    switch (req.method){
        case 'GET':{
            switch(req.url){
                case '/ready':{
                    console.log('Data is ready to transfer, starting...')
                    collectData()   
                }
            }
        }
        case 'POST':{
            switch(req.url){
                case '/send':{
                    console.log("Incoming request...")
                    res.statusCode = 200
                    res.setHeader('Content-Type', 'text/plain');
                    req.on('data', data =>{
                        let stats = JSON.parse(data).counterStats
                        dataSending(stats)
                        console.log('Income data:', stats)
                    })
                    req.on('end', ()=>{
                        console.log('Successfully recived data from spreadSheet')
                    })

                    req.on('error', (err)=> {
                        console.error("Something went wrong", err)
                    })
                    res.end();
                    break;
                }
            }
        }
    }
}



module.exports = startApp
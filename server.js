const { Stats, stat } = require('fs');
const http = require('http');
const dataSending = require('./app')
// const gsh = require('./gsheetconnection')

const hostname = '127.0.0.1';
const port = 3000;

function eventHandler(req, res){
    switch (req.method){
        case 'POST':{
            switch(req.url){
                case '/send':{
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

const server = http.createServer(eventHandler);

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
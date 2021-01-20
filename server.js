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
                    res.end()
                    break
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
                        console.log('Income data:', stats)
                        console.log('Successfully recived data from spreadSheet')
                        dataSending(stats)
                    })
                    res.end();
                    req.on('end', ()=>{
                        console.log('Data sendig finished!')
                    })

                    req.on('error', (err)=> {
                        console.error("Something went wrong", err)
                    })
                    break;
                }
            }
        }
    }
}



module.exports = startApp
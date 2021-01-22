const fs = require('fs')
const runServer = require('./server')

console.log(process.env)

fs.writeFileSync('./token.json', `${JSON.stringify(process.env.TOKEN)}`, {format: 'a+'})
fs.writeFileSync('./credentials.json', `${JSON.stringify(process.env.CREDENTIALS)}`, {format: 'a+'})
fs.writeFileSync('./auth-data.json', `${JSON.stringify(process.env.AUTH_DATA)}`, {format: 'a+'})
runServer()
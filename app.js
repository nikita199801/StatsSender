const fs = require('fs')
const runServer = require('./server')

console.log(process.env)

fs.writeFileSync('./token.json', `${process.env.TOKEN}`, {format: 'a+'})
fs.writeFileSync('./credentials.json', `${process.env.CREDENTIALS}`, {format: 'a+'})
fs.writeFileSync('./auth-data.json', `${process.env.AUTH_DATA}`, {format: 'a+'})
runServer()
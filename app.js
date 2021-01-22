const fs = require('fs')
const runServer = require('./server')

fs.appendFileSync('./token.json', `${process.env.TOKEN}`, {format: 'a+'})
fs.appendFileSync('./token.json', `${process.env.CREDENTIALS}`, {format: 'a+'})
fs.appendFileSync('./token.json', `${process.env.AUTH_DATA}`, {format: 'a+'})
runServer()

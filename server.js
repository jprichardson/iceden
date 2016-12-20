var levelup = require('levelup')
  , multilevel = require('multilevel')
  , levelLiveStream = require('level-live-stream')
  , http = require('http')
  , shoe = require('shoe')
  , fs = require('fs')
  , browserify = require('browserify')
  , es = require('event-stream')

var db = levelup('./chat.db', {valueEncoding: 'json'})
var liveDbStream = levelLiveStream(db)

var messages = {}

//load initial messages
db.get('messages', function(err, data) {
  if (err) return
  messages = data
})

liveDbStream.on('data', function(data) {
  if (data.type === 'del' && data.key === 'messages') { 
    //'clear' pressed, doesn't actually remove all of the keys, although you easily could
    messages = {}
  }

  if (data.key && data.key.indexOf('message:') >= 0) {
    var idx = data.key.split(':')[1]
    messages[idx] = '' //not sophisticated enough to handle messages generated at exact same time
    db.put('messages', messages)
  }
})

var server = http.createServer(function(req, res) {
  switch (req.url) {
    case '/': 
      fs.createReadStream('./index.html').pipe(res)
      break;
    case '/client.js':
      res.writeHead(200, {'Content-Type': 'application/javascript'})
      browserify('./client.js').bundle().pipe(res)
      break;
    default: 
      res.writeHead(200, {'Content-Type': 'text/plain'})
      res.end(res.url + ' not found')
  }
})

var dbSocket = shoe(function(stream) {
  stream.pipe(multilevel.server(db)).pipe(stream)
})
dbSocket.install(server, '/wsdb')

var changesSocket = shoe(function(stream) {
  es.pipeline(
    liveDbStream,
    es.map(function(data, next) { next(null, JSON.stringify(data)) }),
    stream
  )
})
changesSocket.install(server, '/wschanges')

server.listen(8000, function() {
  console.log('listening...')
})

var multilevel = require('multilevel')
  , shoe = require('shoe')

var db = multilevel.client()
var dbSocket = shoe('/wsdb')
var changesSocket = shoe('/wschanges')

dbSocket.pipe(db.createRpcStream()).pipe(dbSocket)

changesSocket.on('data', function(updateData) {
  var updateData = JSON.parse(updateData)

  if (updateData.type === 'del' && updateData.key === 'messages') {
    document.getElementById('messages').innerHTML = ''
    return
  }

  if (updateData.key.indexOf('message:') >= 0) {
    appendMessage(updateData.value)
  }
})

function appendMessage(msg) {
  var p = document.createElement('p')
  var text = document.createTextNode(msg.name + ': ' + msg.message)
  p.appendChild(text)
  document.getElementById('messages').appendChild(p)
}

window.send = function() {
  var nameEl = document.getElementById('name')
  var msgEl = document.getElementById('message')
  var obj = {name: nameEl.value, message: msgEl.value}
  msgEl.value = ''
  db.put('message:' + Date.now(), obj)
}

window.onload = function() {
  var nameEl = document.getElementById('name')
  var id = Math.random().toString().substr(2,3)
  nameEl.value += id

  //get initial chat state
  db.get('messages', function(err, messages) {
    if (messages == null) return

    var ids = Object.keys(messages).slice(-15) //take last 15
    ids.forEach(function(id) {
      db.get('message:' + id, function(err, data) {
        appendMessage(data)
      })
    })
  })
}

window.clearMessages = function() {
  db.del('messages', function(err) {
    if (err) alert(err.message)
  })
}

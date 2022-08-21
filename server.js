const express = require('express');
const path = require('path');
const http = require('http');
const socket = require('socket.io');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = socket(server);


var players = {};
var bullet_array = [];
var medkit = {
  x: Math.floor(Math.random() * 1450) + 50,
  y: Math.floor(Math.random() * 850) + 50
};
var bulletLocation = {
  x: Math.floor(Math.random() * 1450) + 50,
  y: Math.floor(Math.random() * 850) + 50
};

var countPlayers = 0


app.use(express.static(path.join(__dirname, '/src')));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

io.on('connection', function (socket) {
  console.log('подключился пользователь');
  // создание нового игрока и добавление го в объект players
  players[socket.id] = {
    x: Math.floor(Math.random() * 1450) + 50,
    y: Math.floor(Math.random() * 850) + 50,
    playerId: socket.id,
    hitPoints: 100,
    bulletsType: 'ball',
    canMove: false
  };  
  if(countPlayers > 0 && Object.keys(players).length > countPlayers){
    delete players[socket.id];
    io.emit('disconnected', socket.id);
  } 
  // отправляем объект players новому игроку
  socket.emit('currentPlayers', players);
  //socket.emit('blockBeforeStart', players);
  // отправляем объект star новому игроку
  socket.emit('medkitLocation', medkit);
  socket.emit('weaponLocation', bulletLocation);
  socket.emit('blocking', players)
  if(players[socket.id]){
    socket.emit('healthUpdate', players[socket.id].hitPoints, players);
    socket.emit('bulletsTypeUpdate', players[socket.id].bulletsType, players);
  }
  var delay = 5000
  //socket.emit('moveTime', players);
  socket.emit('timeBeforeStart', delay)
  
  // обновляем всем другим игрокам информацию о новом игроке
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('disconnect', function () {
    console.log('пользователь отключился');
    // удаляем игрока из нашего объекта players 
    delete players[socket.id];
    // отправляем сообщение всем игрокам, чтобы удалить этого игрока
    io.emit('disconnected', socket.id);
    countPlayers--;
  });   

  // когда игроки движутся, то обновляем данные по ним
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    // отправляем общее сообщение всем игрокам о перемещении игрока
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('shoot-bullet', function (data) {
    if (players[socket.id] == undefined) return;
    var new_bullet = data;
    data.owner_id = socket.id; // Добавляем к снаряду id игрока
    bullet_array.push(new_bullet);

    socket.broadcast.emit('bulletMoved', new_bullet);
  });

  socket.on('medkitCollected', function (id) {
    players[id].hitPoints += 10
    medkit.x = Math.floor(Math.random() * 1450) + 50;                   //так же можно юзать для аптечек / оружия логику в приложении сами) 
    medkit.y = Math.floor(Math.random() * 850) + 50;
    io.emit('medkitLocation', medkit);
    io.emit('healthUpdate', players[socket.id].hitPoints, players[socket.id]);
   
  });
  socket.on('weaponCollected', function (bulletType, id) {
    players[id].bulletsType = bulletType;
    bulletLocation.x = Math.floor(Math.random() * 1450) + 100;
    bulletLocation.y = Math.floor(Math.random() * 850) + 50;
    io.emit('weaponLocation', bulletLocation);
    io.emit('bulletsTypeUpdate', players[socket.id].bulletsType, players[socket.id]);

  });

  socket.on('receivedDamage', function (id, damage) {
    players[id].hitPoints -= damage
    io.emit('healthUpdate', players[id].hitPoints, players[id]);
    // console.log(players[id].hitPoints)
  });

  socket.on('oneDown', function(alreadyDead){
    let playersLeft = Object.keys(players).length
    //console.log("has been", playersLeft)
    playersLeft = playersLeft - alreadyDead;
    //console.log("now", playersLeft)
    if (playersLeft === 1){
      console.log('victory')
      io.emit('victory')
    }

  });


  socket.on('timeWasting', function(){
    io.emit('moveTime', players)
    countPlayers = Object.keys(players).length
  })

  socket.on('blockOthers', async function(playerFromClient){
    const sendId = (id) =>{
      Object.keys(playerFromClient).forEach((el) => {
        if (el !== id){
          playerFromClient[el].canMove = false
        }
        else{
          playerFromClient[id].canMove = true
        }
      });
      io.emit('blocking', playerFromClient)
    }

    const waiting = (ms) => {
      return new Promise(res => setTimeout(res, ms)); 
    }
    const setActivePlayer = async () => {
      for(let id in playerFromClient) {
            sendId(id)
            if(Object.keys(playerFromClient).length > 0){
              if(players[id] == undefined || players[id].hitPoints > 0){
                await waiting(7000);
              } else {
                await waiting(0);
              }
            } else {
              console.log("Игроков нету")
            }
            
            
            /*if(players[id].hitPoints <= 0) {
              
            }   */ 
        }; 
    }

    const repeatSetActivePlayer = async () =>{
        await setActivePlayer()
        await repeatSetActivePlayer()
    }

    await repeatSetActivePlayer()
  });
});

var config = {
    type: Phaser.AUTO,
    width: 1500,
    height: 1000,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var hitPointsTextOtherPlayers = []

var currentUserBulletType = 'small-laser';
var bulletsTypeOtherPlayers = []

var bullets;
var bullet_array = [];

var lastFired = 0;
var socket;
var platforms;
var deadPlayers = 0;
var victoryText = '';
var timeToConnectText = '';
var tooLateText = '';
var gameOver = false;
var counting = 0;

//var numerOfPlayers = 0;

var game = new Phaser.Game(config);

function preload() {
    this.load.image('sky', './assets/sky.png');
    this.load.image('ground', './assets/platform.png');
    this.load.image('platform', './assets/platform3.png');
    this.load.image('box', './assets/box.png');
    this.load.image('medicine', './assets/heal.png');

    this.load.image('ball', './assets/bullets/ball.png');
    this.load.image('alien-slime', './assets/bullets/alien-slime.png');
    this.load.image('double-shot', './assets/bullets/double-shot.png');
    this.load.image('fire', './assets/bullets/fire.png');
    this.load.image('small-laser', './assets/bullets/small-laser.png');

    this.load.spritesheet('dude', './assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

function create() {
    // генерация мапы
    this.add.image(400, 300, 'sky').setScale(3);

    platforms = this.physics.add.staticGroup();

    platforms.create(750, 1000, 'ground').setScale(4).refreshBody();

    platforms.create(200, 870, 'platform')
    platforms.create(400, 870, 'platform')
    platforms.create(80, 830, 'box')
    platforms.create(130, 830, 'box')
    platforms.create(130, 780, 'box')
    platforms.create(180, 830, 'box')

    platforms.create(1300, 870, 'platform')
    platforms.create(1100, 870, 'platform')

    platforms.create(750, 775, 'platform')

    platforms.create(925, 735, 'box')
    platforms.create(1415, 830, 'box')

    platforms.create(200, 635, 'platform')
    platforms.create(400, 635, 'platform')
    platforms.create(600, 635, 'platform')
    platforms.create(900, 635, 'platform')

    platforms.create(1325, 726, 'platform')
    platforms.create(1150, 726, 'platform')

    platforms.create(200, 500, 'platform')
    platforms.create(400, 500, 'platform')

    platforms.create(700, 595, 'box')
    platforms.create(800, 450, 'box')
    platforms.create(80, 595, 'box')

    platforms.create(1300, 450, 'platform')
    platforms.create(1200, 450, 'platform')
    platforms.create(1315, 409, 'box')
    platforms.create(1025, 409, 'box')

    platforms.create(1300, 300, 'platform')

    platforms.create(200, 280, 'platform')
    platforms.create(300, 280, 'platform')
    platforms.create(475, 320, 'box')
    platforms.create(525, 370, 'box')
    platforms.create(475, 370, 'box')
    platforms.create(475, 410, 'box')
    platforms.create(425, 410, 'box')
    platforms.create(375, 410, 'box')
    platforms.create(325, 410, 'box')
    platforms.create(275, 410, 'box')
    platforms.create(225, 410, 'box')
    platforms.create(175, 410, 'box')

    platforms.create(810, 180, 'platform')

    platforms.create(815, 140, 'box')
    platforms.create(815, 90, 'box')
    platforms.create(865, 140, 'box')
    platforms.create(765, 140, 'box')
    // конец генерации мапы

    this.cursors = this.input.keyboard.createCursorKeys();

    this.keys = this.input.keyboard.addKeys({
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        w: Phaser.Input.Keyboard.KeyCodes.W
    });

    var self = this;
    this.socket = io();
    socket = this.socket;
    this.otherPlayers = this.physics.add.group();

    this.socket.on('currentPlayers', function (players) {
        //if(Object.keys(players).length <= 3){
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === self.socket.id) {
                    addPlayer(self, players[id], platforms);
                } else {
                    addOtherPlayers(self, players[id], platforms);
                }
            });
        //}
    });

    this.socket.on('newPlayer', function (playerInfo) {
        //if(Object.keys(players).length <= 3){
            addOtherPlayers(self, playerInfo, platforms);
        //}
        
    });


    this.socket.on('timeBeforeStart', function(delay) {
        let timeForConnect = delay / 1000
        timeToConnectText = self.add.text(15, 100, `Вермя на подключение к игре - ${timeForConnect} секунд`, { fontSize: '64px', fill: '#0000FF' })
        setTimeout(() => {
            timeToConnectText.destroy()
            socket.emit('timeWasting')
        }, delay);
    })

    this.socket.on('moveTime', async function(players) {
        socket.emit('blockOthers', players)
        console.log(players)
    });

    this.socket.on('blocking', function(players) {
        for (let id in players){
            if(!players[id].canMove && id === self.player.playerId) {
                self.player.body.moves = false
                self.player.body.allowGravity = false
                self.player.body.gravity.y = 0
            }
            if(players[id].canMove && id === self.player.playerId) {
                self.player.body.moves = true
                self.player.body.allowGravity = true
                self.player.body.gravity.y = 300
            }
        }
    })
    
    this.socket.on('disconnected', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
                hitPointsTextOtherPlayers[otherPlayer.playerId].destroy();
                
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                //обновление положение показчика здоровья у противников
                hitPointsTextOtherPlayers[otherPlayer.playerId].x = playerInfo.x - 30;
                hitPointsTextOtherPlayers[otherPlayer.playerId].y = playerInfo.y - 40;
                /*console.log("otherplayer",otherPlayer)
                console.log("playerIfo", playerInfo)*/
                //обновление здоровья противников
                //hitPointsTextOtherPlayers[otherPlayer.playerId].setText(playerInfo.hitPoints)
            }
        });
    });

    this.socket.on('healthUpdate', function (health, players) {
        //обновление здоровья персонажа за которого играешь
        if (players.playerId === self.socket.id) {
            self.player.text.setText(health);
            if (players.hitPoints <= 0) {
                self.player.text.setText("Dead")
                self.player.tint = `red`;
                self.player.anims.isPlaying = false;
                self.player.body.moves = false;
                self.player.x = 750
                self.player.y = 1000
            }
        } else {    
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (players.playerId === otherPlayer.playerId) {
                    //обновление здоровья противников
                    hitPointsTextOtherPlayers[otherPlayer.playerId].setText(health)
                    if (players.hitPoints <= 0) {
                        deadPlayers++;
                        socket.emit('oneDown', deadPlayers);
                        otherPlayer.destroy();
                        hitPointsTextOtherPlayers[otherPlayer.playerId].destroy();
                        
                    }
                }
            });
            
        }
    });

    this.socket.on('victory', function()  {
        console.log('victory')
        victoryText = self.add.text(50, 100, `Game Over`, { fontSize: '64px', fill: '#0000FF' })
        gameOver = true;
    });

    this.socket.on('medkitLocation', function (medkitLocation) {
        if (self.medkit) self.medkit.destroy();
        self.medkit = self.physics.add.image(medkitLocation.x, medkitLocation.y, 'medicine');
        self.medkit.body.gravity.y = 300
        self.physics.add.collider(self.medkit, platforms)
        self.physics.add.overlap(self.player, self.medkit, function () {
            this.socket.emit('medkitCollected', self.socket.id);
        }, null, self);
    });

    // добавление оружия
    self.weaponsArr = self.physics.add.group();

    self.weaponsArr.create(815, 45, 'alien-slime');
    self.weaponsArr.create(1370, 410, 'ball');
    self.weaponsArr.create(30, 830, 'double-shot');
    self.weaponsArr.create(420, 355, 'fire');
    this.physics.add.collider(self.weaponsArr, platforms);

    socket.on('bulletsTypeUpdate', function (bulletsType, player) {
        if (player.playerId === self.socket.id) {
            currentUserBulletType = bulletsType;
        }
    });

    this.socket.on('weaponLocation', function (bulletLocation) {
        // спавн оружия. Не добавлять стартовое оружие если small-laser
        (currentUserBulletType != 'small-laser')
            ? self.weaponsArr.create(bulletLocation.x, bulletLocation.y, currentUserBulletType)
            : null;

        self.physics.add.overlap(self.weaponsArr, self.player, function (player, weapon) {
            this.socket.emit('weaponCollected', weapon.texture.key, self.socket.id, weapon);
            weapon.destroy();
        }, null, self);

        // удалить поднятое оружие у других игроков
        //if (oldWeapon) {
        //     var id = self.weaponsArr.children.entries.indexOf(oldWeapon);
        //     self.weaponsArr.children.entries[id].destroy();
        // }
    });

    this.socket.on('bulletMoved', function (bulletInfo) {
        for (var i = 0; i < bullet_array.length; i++) {
            var bullet = bullet_array[i];
            bullet.setPosition(bulletInfo.bullet.x, bulletInfo.bullet.y);

            // Удаляем снаряд, если он слишком далеко от экрана
            if (bullet.x < 0 || bullet.x > 1500) {
                bullet.destroy();
                bullet_array.splice(i, 1);
                i--;
            }
        }
    });


    //Анимации
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{ key: 'dude', frame: 4 }],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });
    //конец анимаций

    const Bullet = new Phaser.Class({

        Extends: Phaser.GameObjects.Image,

        initialize:
            function Bullet(scene) {
                Phaser.GameObjects.Image.call(this, scene, 0, 0, currentUserBulletType);
                this.scene = scene;
                this.speed = Phaser.Math.GetSpeed(400, 1);
                this.direction;
            },

        fire: function (x, y, direction) {
            direction === 1 ? this.setPosition(x + 50, y) : this.setPosition(x - 50, y);
            this.direction = direction;

            this.setActive(true);
            this.setVisible(true);
        },

        update: function (time, delta) {

            this.direction === 1 ? this.x += this.speed * delta : this.x -= this.speed * delta;
            socket.emit('shoot-bullet', { bullet: this });

            if (this.x < 0 || this.x > 1500) {
                this.destroy();
            }
        }
    });

    bullets = this.physics.add.group({
        classType: Bullet,
        // maxSize: 3, // ограничение на максимальное количество выпускаемых пуль
        runChildUpdate: true,
        allowGravity: false,
    });

    this.physics.add.collider(bullets, platforms,
        (bullets, platforms) => {
            bullets.destroy();
            //разрушение ящика если в него попал снаряд
            // if (platforms.texture.key === 'box') {
            //     platforms.destroy();
            // }
        });

    this.physics.add.collider(bullets, self.otherPlayers,
        (bullets, player) => {
            bullets.destroy();
            var bulletType = bullets.texture.key;
            var damage;
            //виды урона для разных типов оружия
            switch (bulletType) {
                case 'small-laser':
                    damage = 3
                    break;
                case 'ball':
                    damage = 4
                    break;
                case 'double-shot':
                    damage = 6
                    break;
                case 'alien-slime':
                    damage = 10
                    break;
                case 'fire':
                    damage = 8
                    break;
                default:
                    damage = 3
                    break;
            }
            this.socket.emit('receivedDamage', player.playerId, damage);
        });

    
}

function update(time) {

    if (this.player) {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.anims.play('left', true);
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);

            this.player.anims.play('right', true);
        }
        else {
            this.player.setVelocityX(0);

            this.player.anims.play('turn');
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-250);
        }

        var direction;
        if (this.keys.a.isDown && time > lastFired) {
            var bullet = bullets.get();

            if (bullet && this.player.body.moves) {
                bullet.fire(this.player.x, this.player.y, direction = -1);
                bullet_array.push(bullet);
                lastFired = time + 150;
            }
        }

        if (this.keys.d.isDown && time > lastFired) {
            var bullet = bullets.get();

            if (bullet && this.player.body.moves) {
                bullet.fire(this.player.x, this.player.y, direction = 1);
                bullet_array.push(bullet);
                lastFired = time + 150;
            }
        }

        var x = this.player.x;
        var y = this.player.y;
        if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y)) {
            this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y });
            //перемещение здоровья вместе с персонажем игрока
            this.player.text.x = this.player.x - 30;
            this.player.text.y = this.player.y - 40;
        }
        this.player.oldPosition = {
            x: this.player.x,
            y: this.player.y
        };

        if (this.player.oldHitPoints !== this.player.hitPoints) {
            this.socket.emit('healthUpdate', this.player.hitPoints)
        }
        this.player.oldHitPoints = this.player.hitPoints
    }

}


function addPlayer(self, playerInfo, platforms) {
    self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'dude');
    self.player.setBounce(0.2);
    self.player.setCollideWorldBounds(true);
    self.physics.add.collider(self.player, platforms);
    self.player.hitPoints = playerInfo.hitPoints;
    self.player.playerId = playerInfo.playerId;
    //создание строки здоровья
    self.player.text = self.add.text(playerInfo.x - 30, playerInfo.y - 40, `${playerInfo.hitPoints}`, { fontSize: '32px', fill: '#0000FF' })
}

function addOtherPlayers(self, playerInfo, platforms) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'dude')
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
    self.physics.add.collider(self.otherPlayers, platforms);
    //отображение вражеского здоровья
    hitPointsTextOtherPlayers[playerInfo.playerId] = self.add.text(playerInfo.x - 30, playerInfo.y - 40, `${playerInfo.hitPoints}`, { fontSize: '32px', fill: 'red' });
}

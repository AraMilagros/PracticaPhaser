import React, { useEffect, useState } from 'react';
import Phaser from 'phaser';

function App() {

    const [listo, setListo] = useState(true);

    useEffect(() => {

        var config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 300 },
                    debug: false
                }
            },
            scene: {
                preload: preload,
                create: create,
                update: update
            }
        };

        var game = new Phaser.Game(config);

        //triger cuando el juego esta completamente listo
        game.events.on("LISTO", setListo);

        return () => {
            setListo(false);
            game.destroy(true);
        }

    }, [listo]);

    //Escena: preload - create - update

    function preload() {
        //this.load.image: esta creando un nuevo elemento del juego de tipo imagen 
        //y añadiendolo a la lista de obj de escena
        this.load.image('sky', 'assets/sky.png')
        this.load.image('ground', 'assets/platform.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('bomb', 'assets/bomb.png');
        this.load.spritesheet('dude',
            'assets/dude.png',
            { frameWidth: 32, frameHeight: 48 }
        );
    }

    var platforms;
    var player;
    var cursors;
    var stars;
    var score = 0;
    var scoreText;
    var bombs;
    var gameOver = false;


    function create() {
        this.add.image(400, 300, 'sky');

        //se crea un nuevo grupo de elementos estaticos y se asigna a plataforms
        //con esto es mas sencillo crear elementos del mismo tipo accediento afunciones como create
        platforms = this.physics.add.staticGroup();

        //Es el piso "principal" y para que ocupe todo el ancho del lienzo se lo escala
        //
        platforms.create(400, 568, 'ground').setScale(2).refreshBody();
        //se utiliza plataforms para crear las demas plataformas
        platforms.create(600, 400, 'ground');
        platforms.create(50, 250, 'ground');
        platforms.create(750, 220, 'ground');

        //Se crea un sprite que se le asignara a player
        player = this.physics.add.sprite(100, 450, 'dude');
        //Se le da un valor de rebote, lo que dara el efecto de rebote :v luego de saltar o caer
        player.setBounce(0.2);
        player.setCollideWorldBounds(true);//esto permite que no salga del lienzo

        //Se define 2 animaciones.. para cuando el jugador camine hacia la izq=left o der=right

        //NOTA: el player es un sprite y no una sola imagen
        //En este caso, al ir a la izq, se usan los fotogramas/sprite 0-3
        //el valor -1 en repeat indica que la animacion debe repetirse al terminar
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        //Se repite lo mismo que en left
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        //Es el fotograma que muestra al player mirando hacia el frente
        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20
        });

        //Permite detectar las teclas para poder añadirle movimiento al player
        cursors = this.input.keyboard.createCursorKeys();

        //PARTE 8 - RECOGER ESTRELLAS
        //A diferencia de cuando se creo el grupo de elementos de plataformas
        //las estrellas tienen que moverse, por lo que se crea un grupo de fisicas dinamicas
        stars = this.physics.add.group({
            key: 'star',//todos los elementos tendran esta textura
            repeat: 11,
            //esto marca la posicion en donde aparecera el elemento
            //stepX es un incremento, entonces el primer elemento estara en x:12, el segundo en x:82.. etc
            setXY: { x: 12, y: 0, stepX: 70 }
        });

        //Se recorre los elementos creados y asignados a stars y añadiendo un valor de rebote a cada uno
        stars.children.iterate(function (child) {

            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));

        });


        bombs = this.physics.add.group();

        // 16,16 es la coordenada en donde estara el texto, score: 0 es el texto por defecto
        scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

        //esto permite que el player detecte a la plataforma
        this.physics.add.collider(player, platforms);
        //esto permite que se detecten las colisiones entre las estrellas y las plataformas
        this.physics.add.collider(stars, platforms);

        this.physics.add.collider(bombs, platforms);
        //comprueba que el player se superpone a las estrellas
        this.physics.add.overlap(player, stars, collectStar, null, this);

        this.physics.add.collider(player, bombs, hitBomb, null, this);
    }

    function update() {

        if (gameOver) {
            return;
        }

        if (cursors.left.isDown) {

            player.setVelocityX(-160);
            player.anims.play('left', true);//es key que se puso en anims

        } else if (cursors.right.isDown) {

            player.setVelocityX(160);
            player.anims.play('right', true);

        } else {

            player.setVelocityX(0);
            player.anims.play('turn');
        }

        if (cursors.up.isDown && player.body.touching.down) {
            player.setVelocityY(-330);
        }
    }

    function collectStar(player, star) {
        //con esto desabilita el elemento estrella y hace invisible en el body
        star.disableBody(true, true);

        score += 10;
        scoreText.setText('Score: ' + score);

        if (stars.countActive(true) === 0) {
            //  A new batch of stars to collect
            stars.children.iterate(function (child) {

                child.enableBody(true, child.x, 0, true, true);

            });

            //con esto se obtiene el lugar en donde se creara la bomba
            //si el player esta en una posicion x < 400, la bomba se creara en un rango a partir de 400 hasta 800 (el tamaño del lienzo)
            var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);

            var bomb = bombs.create(x, 16, 'bomb');
            bomb.setBounce(1);
            bomb.setCollideWorldBounds(true);
            bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
            bomb.allowGravity = false;

        }
    }

    function hitBomb(player, bomb) {
        this.physics.pause();

        player.setTint(0xff0000);

        player.anims.play('turn');

        gameOver = true;
    }

}

export default App;
export class PlayersController {

    createMainPlayer(self, playerInfo) {
        const newPlayer = self.matter.add.sprite(playerInfo.x, playerInfo.y, `character${playerInfo.character}`);
        newPlayer.setScale(1.3);
        newPlayer.setDepth(1);
        newPlayer.character = playerInfo.character;
        newPlayer.name = playerInfo.name;
        newPlayer.room = playerInfo.room;
        newPlayer.direction = 'none';
        newPlayer.setBounce(0); // настройка упругости
        newPlayer.setFrictionAir(0); // настройка сопротивления воздуха


        const colliderWidth = 22;
        const colliderHeight = 25;
        newPlayer.setBody({
            type: 'circle',
            width: colliderWidth,
            height: colliderHeight
        });
        newPlayer.setOrigin(0.5, 0.7);


        // Добавляем текст с именем игрока
        newPlayer.nameText = self.add.text(newPlayer.x, newPlayer.y - PlayersController.HEIGHT_NAME, newPlayer.name, { fontSize: '17px', fill: '#fff' }).setOrigin(0.5);
        newPlayer.setFixedRotation();
        ///////////////////////////////////

        return newPlayer;
    }

    updateMainPlayerPosition(player, cursors) {
        player.setVelocity(0);
        if (cursors.left.isDown) {
            player.setVelocityX(-5);
            player.anims.play(`walk_left${player.character}`, true);
            player.direction = 'left';
        } else if (cursors.right.isDown) {
            player.setVelocityX(5);
            player.anims.play(`walk_right${player.character}`, true);
            player.direction = 'right';
        } else if (cursors.up.isDown) {
            player.setVelocityY(-5);
            player.anims.play(`walk_up${player.character}`, true);
            player.direction = 'up';
        } else if (cursors.down.isDown) {
            player.setVelocityY(5);
            player.anims.play(`walk_down${player.character}`, true);
            player.direction = 'down';
        } else {
            player.anims.stop();
            player.direction = 'none';
        }

        //Рисуем ник игрока
        player.nameText.setPosition(player.x, player.y - PlayersController.HEIGHT_NAME);
    }

    updateMainPlayerPositionJoystick(player, joystickThumb, joystickBase) {
        player.setVelocity(0);
        if (joystickThumb.x < joystickBase.x - 10) {
            player.setVelocityX(-5);
            player.anims.play(`walk_left${player.character}`, true);
            player.direction = 'left';
        } else if (joystickThumb.x > joystickBase.x + 10) {
            player.setVelocityX(5);
            player.anims.play(`walk_right${player.character}`, true);
            player.direction = 'right';
        } else if (joystickThumb.y < joystickBase.y - 10) {
            player.setVelocityY(-5);
            player.anims.play(`walk_up${player.character}`, true);
            player.direction = 'up';
        } else if (joystickThumb.y > joystickBase.y + 10) {
            player.setVelocityY(5);
            player.anims.play(`walk_down${player.character}`, true);
            player.direction = 'down';
        } else {
            player.anims.stop();
            player.direction = 'none';
        }

        //Рисуем ник игрока
        player.nameText.setPosition(player.x, player.y - PlayersController.HEIGHT_NAME);
    }



    createOtherPlayer(self, playerInfo, otherPlayers) {
        const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, `character${playerInfo.character}`);
        otherPlayer.setScale(1.3);
        otherPlayer.setOrigin(0.5, 0.7);

        otherPlayer.character = playerInfo.character;
        otherPlayer.name = playerInfo.name;

        // Добавляем текст с именем игрока
        otherPlayer.nameText = self.add.text(otherPlayer.x, otherPlayer.y - PlayersController.HEIGHT_NAME, otherPlayer.name, { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        otherPlayers[playerInfo.id] = otherPlayer;
    }

    updateAnimOtherPlayer(playerSprite, playerInfo) {
        const velocityThreshold = 0.1; // Порог скорости для определения движения

        // Определяем направление движения и проигрываем соответствующую анимацию
        if (Math.abs(playerInfo.velocityX) > velocityThreshold || Math.abs(playerInfo.velocityY) > velocityThreshold) {

            try {
                if (playerInfo.direction == 'left') {
                    playerSprite.anims.play(`walk_left${playerSprite.character}`, true);
                } else if (playerInfo.direction == 'right') {
                    playerSprite.anims.play(`walk_right${playerSprite.character}`, true);
                } else if (playerInfo.direction == 'up') {
                    playerSprite.anims.play(`walk_up${playerSprite.character}`, true);
                } else if (playerInfo.direction == 'down') {
                    playerSprite.anims.play(`walk_down${playerSprite.character}`, true);
                }
            } catch (e) {

            }


        } else {
            // Остановка анимации, если скорость ниже порога
            try {
                if (playerSprite.anims.isPlaying) {
                    playerSprite.anims.stop();
                }
            } catch (e) {

            }
        }

        // Обновляем позицию текста с именем
        playerSprite.nameText.setPosition(playerSprite.x, playerSprite.y - PlayersController.HEIGHT_NAME);
    }

    static HEIGHT_NAME = 56;
}


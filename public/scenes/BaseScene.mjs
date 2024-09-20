import { CST, LABEL_ID } from "../CST.mjs";
import { socket } from "../CST.mjs";
import { SocketWorker } from "../share/SocketWorker.mjs";
import { createUIBottom, createUITop, createUIRight, createUILeftMobile, createUI, createExitMenu, createAvatarDialog, isMobile, createJoystick, createMobileXButton, HEIGHT_PRESS_X, MAP_SETTINGS, CAMERA_MARGIN, CAMERA_MARGIN_MOBILE } from "../share/UICreator.mjs";
import { AnimationControl } from "../share/AnimationControl.mjs";
import { PlayersController } from "../share/PlayerController.mjs";

export class BaseScene extends Phaser.Scene {
    constructor(sceneKey) {
        super({ key: sceneKey });

        //проверка на то, стоит ли игрок в зоне или нет
        this.isInZone = false;

        this.player;

        //зона в которой стоит игрок
        this.eventZone = null;

        //виден ли оверлей сейчас поврех экрана
        this.isOverlayVisible = false;

        this.mobileFlag = false;

        this.isDragging = false;

        this.foldImgNumber = 0;
        this.fold = [];

        this.fullMap = true;
        this.moved = false;

        this.otherPlayers = {};
    }

    preload() {
        this.loding = new AnimationControl(AnimationControl.LOADING);
        this.loding.addLoadOnScreen(this, 1280 / 2, 720 / 2, 0.3, 0.3);
    }

    create(data) {
        this.mySocket = new SocketWorker(socket);
        const { players } = data;
        this.loding.deleteLoadFromScreen(this);
        this.playersController = new PlayersController();
        this.mobileFlag = isMobile();
        this.cursors = this.input.keyboard.createCursorKeys();
        this.createUnWalkedObjects();
        // this.createCollision();
        // this.createOverlays();
        // this.createFold();
        // this.createInputHandlers();
        this.createUIElements();
        this.setupSocketListeners();
    }

    createUIElements() {
        createUIRight(this);
        createUITop(this);
        createUIBottom(this);
        createExitMenu(this, this.leaveGame, this.closeExitMenu, this.mobileFlag);
    }

    setupSocketListeners() {
        //Подключение слушателей
        this.mySocket.subscribeExistedPlayers(this, this.createOtherPlayersTest);
        this.mySocket.subscribeTakeFold(this, this.updateFold);
        this.mySocket.subscribeNewPlayer(this, this.scene.key, this.otherPlayers, this.playersController.createOtherPlayer);
        this.mySocket.subscribePlayerMoved(this, this.scene.key, this.checkOtherPlayer);
        this.mySocket.subscribePlayerDisconected(this, this.deletePlayer);
        this.mySocket.subscribeSceneSwitched(this, this.scene.key, sceneSwitched)

        this.mySocket.emitGetPlayers();
        this.mySocket.emitGetFold();
    }

    createMap(map, mapFull) {
    }

    createUnWalkedObjects() {
    }

    createPlayers(players, cameraMargin) {
    }

    createOtherPlayersTest(context, players) {
        Object.keys(players).forEach((id) => {
            if (!(id === socket.id) && context.otherPlayers[id] == null) {
                context.playersController.createOtherPlayer(context, players[id], context.otherPlayers);
            }
        });
    }

    checkOtherPlayer(self, playerInfo) {
        if (self.otherPlayers[playerInfo.id]) {
            const player = self.otherPlayers[playerInfo.id];

            // Обновляем целевые координаты и скорость
            player.targetX = playerInfo.x;
            player.targetY = playerInfo.y;
            player.velocityX = playerInfo.velocityX;
            player.velocityY = playerInfo.velocityY;
            player.isMoving = playerInfo.isMoving;
            player.direction = playerInfo.direction;

            // Интерполяция движения
            self.tweens.add({
                targets: player,
                x: playerInfo.x,
                y: playerInfo.y,
                duration: 200,
                onUpdate: function () {
                    // Обновление анимации на основе данных о движении
                    self.playersController.updateAnimOtherPlayer(player, {
                        ...playerInfo,
                        velocityX: player.targetX - player.x,
                        velocityY: player.targetY - player.y
                    });
                },
                onComplete: function () {
                    // Проверяем, нужно ли остановить анимацию
                    try {
                        if (!player.isMoving) {
                            player.anims.stop();
                        }
                    } catch (e) { };
                }
            });
        }
    }

    deletePlayer(context, id) {
        if (context.otherPlayers[id]) {
            context.otherPlayers[id].nameText.destroy();
            context.otherPlayers[id].destroy();
            delete context.otherPlayers[id];
        }
    }

    createCollision() {

    }

    createOverlays() {
    }

    createInputHandlers() {
    }

    showOverlay() {
    }

    hideOverlay() {
    }

    createFold() {
        this.foldKeys = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2 + 10, 'disk');
        this.foldKeys.setScale(0.8);
        this.foldKeys.setDepth(2);
        this.foldKeys.setScrollFactor(0);
        this.foldKeys.setVisible(false);
        this.foldKeys.setAlpha(1);


        this.leftArrow = this.add.image(0, 0, 'leftArrow');
        this.rightArrow = this.add.image(0, 0, 'rightArrow');

        this.rightArrow.setPosition(
            this.cameras.main.width - 210,
            this.cameras.main.height / 2 - 10,
        )
        this.rightArrow.setScrollFactor(0);
        this.rightArrow.setDepth(2);

        this.leftArrow.setPosition(
            210,
            this.cameras.main.height / 2 - 10,
        )
        this.leftArrow.setScrollFactor(0);
        this.leftArrow.setDepth(2);

        this.leftArrow.setInteractive();
        this.rightArrow.setInteractive();
        this.leftArrow.setVisible(false);
        this.rightArrow.setVisible(false);

        this.rightArrow.on('pointerdown', () => {
            this.moveRightKeys();
        });

        this.leftArrow.on('pointerdown', () => {
            this.moveLeftKeys();
        });

        this.foldColseBtn = this.add.image(this.cameras.main.width - 200, 90, 'closeIcon');
        this.foldColseBtn.setDisplaySize(50, 50);
        this.foldColseBtn.setInteractive();
        this.foldColseBtn.setVisible(false);
        this.foldColseBtn.setDepth(2);
        this.foldColseBtn.setScrollFactor(0);
        this.foldColseBtn.setAlpha(0); // Начальное значение прозрачности

        this.foldColseBtn.on('pointerdown', () => {
            this.isOverlayVisible = false;

            this.foldKeys.setVisible(false);
            this.foldColseBtn.setVisible(false);
            this.overlayBackground.setVisible(false);
            this.leftArrow.setVisible(false);
            this.rightArrow.setVisible(false);
        });
    }

    showFold(context) {
        if (context.isOverlayVisible) return;
        context.player.setVelocity(0);
        context.isOverlayVisible = true
        context.overlayBackground.setAlpha(1);
        context.foldColseBtn.setAlpha(1);


        if (context.fold == null || context.fold.length < 1) {

        } else if (context.fold.length > 1) {
            context.foldImgNumber = 0;
            context.leftArrow.setVisible(false);
            context.rightArrow.setVisible(true);

            context.foldKeys.setTexture(context.fold[0]);
            context.foldKeys.setVisible(true);
        } else {
            context.foldImgNumber = 0;
            context.foldKeys.setTexture(context.fold[0]);
            context.foldKeys.setVisible(true);
        }


        context.overlayBackground.setVisible(true);
        context.foldColseBtn.setVisible(true);
    }

    moveRightKeys() {
        if (this.foldImgNumber < this.fold.length - 1) {
            this.foldImgNumber += 1;
            if (this.foldImgNumber == this.fold.length - 1) this.rightArrow.setVisible(false);
            this.leftArrow.setVisible(true);

            this.tweens.add({
                targets: [this.foldKeys],
                alpha: 0,
                duration: 250,
                onComplete: () => {
                    try {
                        this.foldKeys.setTexture(this.fold[this.foldImgNumber]);
                        this.tweens.add({
                            targets: [this.foldKeys],
                            alpha: 1,
                            duration: 250,
                        });
                    }
                    catch (e) { }
                }
            });
        }
    }

    moveLeftKeys() {
        if (this.foldImgNumber > 0) {
            this.foldImgNumber -= 1;
            if (this.foldImgNumber == 0) this.leftArrow.setVisible(false);
            this.rightArrow.setVisible(true);

            this.tweens.add({
                targets: [this.foldKeys],
                alpha: 0,
                duration: 250,
                onComplete: () => {
                    try {
                        this.foldKeys.setTexture(this.fold[this.foldImgNumber]);
                        this.tweens.add({
                            targets: [this.foldKeys],
                            alpha: 1,
                            duration: 250,
                        });
                    }
                    catch (e) { }
                }
            });
        }
    }

    updateFold(context, arr) {
        context.fold = arr
    }

    showSettings(self) {
        if (self.foldKeys.visible || self.overlayBackground.visible) return;
        self.avatarDialog.setPosition(self.cameras.main.scrollX + 640, self.cameras.main.scrollY + 360);
        self.avatarDialog.setVisible(true);
        self.isOverlayVisible = true
        self.exitContainer.setVisible(false);
        self.player.setVelocity(0);
    }

    showExitMenu(self) {
        if (self.foldKeys.visible || self.overlayBackground.visible) return;
        self.exitContainer.setPosition(self.cameras.main.scrollX + 640, self.cameras.main.scrollY + 360);
        self.exitContainer.setVisible(true);
        self.isOverlayVisible = true
        self.avatarDialog.setVisible(false);
        self.player.setVelocity(0);
    }

    leaveGame(self) {
        window.location.reload();
    }

    closeExitMenu(self) {
        self.exitContainer.setVisible(false);
        self.isOverlayVisible = false
    }

    enterNewSettingsInAvatarDialog(self, usernameInput, nameError, imgCount) {
        const username = usernameInput.value;
        if (username.length < 1 || username.length > 12) {
            nameError.style.visibility = "visible";
        } else {
            self.mySocket.emitPlayerReconnect({ x: self.player.x, y: self.player.y, avatar: imgCount + 1, name: username });
            self.player.setTexture(`character${imgCount + 1}`);
            self.player.character = imgCount + 1;
            self.player.nameText.setText(username);
            self.avatarDialog.setVisible(false);
            self.isOverlayVisible = false;
            nameError.style.visibility = "hidden";
        }
    }

    closeAvatarDialog(self) {
        self.avatarDialog.setVisible(false);
        self.isOverlayVisible = false;
    }

    loadPlusTexture(name, path) {
        this.load.image(name, path);
        this.load.start();
    }

    itemInteract(context) {
    }

    update() {
        if (!this.player || this.isOverlayVisible) return;

        this.updatePlayerPosition();

        this.updatePressXVisibility();

        // Интерполяция для других игроков
        Object.keys(this.otherPlayers).forEach((id) => {
            let otherPlayer = this.otherPlayers[id];
            if (otherPlayer.targetX !== undefined && otherPlayer.targetY !== undefined) {
                otherPlayer.x += (otherPlayer.targetX - otherPlayer.x) * 0.1;
                otherPlayer.y += (otherPlayer.targetY - otherPlayer.y) * 0.1;
            }
        });
    }

    updatePlayerPosition() {

        if (!this.mobileFlag) this.playersController.updateMainPlayerPosition(this.player, this.cursors);
        else {
            this.playersController.updateMainPlayerPositionJoystick(this.player, this.joystickThumb, this.joystickBase);
        }

        const isMoving = this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0;
        const movementData = {
            x: this.player.x,
            y: this.player.y,
            velocityX: this.player.body.velocity.x,
            velocityY: this.player.body.velocity.y,
            isMoving: isMoving,
            direction: this.player.direction
        };

        if (this.player.body.velocity.x != 0 || this.player.body.velocity.y != 0) {
            this.mySocket.emitPlayerMovement(this.scene.key, movementData);
            this.moved = true;
        } else if (this.moved) {
            this.mySocket.emitPlayerMovement(this.scene.key, movementData);
            this.moved = false;
        }
    }

    updatePressXVisibility() {
        if (this.isInZone) {
            if (this.mobileFlag) {
                this.mobileXButton.setVisible(true);
                this.buttonBackground.setVisible(true);
            }
            else {
                this.pressX.setPosition(this.player.x, this.player.y - HEIGHT_PRESS_X);
                this.pressX.setVisible(true);
            }
        } else {
            if (this.mobileFlag) {
                this.mobileXButton.setVisible(false);
                this.buttonBackground.setVisible(false);
            }
            else {
                this.pressX.setVisible(false);
            }
        }
    }
}

function sceneSwitched(self, data) {
    self.map.destroy();
    self.avatarDialog.destroy();
    self.exitContainer.destroy();
    self.otherPlayers = {};
    let players = data.players;
    self.scene.start(data.scene, { players });
}
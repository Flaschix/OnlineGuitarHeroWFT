import { CST } from "../CST.mjs";
import { socket } from "../CST.mjs";

import { isMobile } from "../share/UICreator.mjs";
import { createAvatarDialog } from "../share/UICreator.mjs";
import { createExitMenu } from "../share/UICreator.mjs";

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.LOBBYSCENE });
        this.code = null;
        this.avatarDialog = null;
        this.welcomeContainer = null;
        this.joinRoomContainer = null;
        this.newSpaceContainer = null;
        this.creatCodeText = null;
        this.copyBtn = null;

        this.captain = false;

        this.mobile = isMobile();
    }

    preload() {

        // Создание спрайта и запуск анимации
        this.loadingSprite = this.add.sprite(1280 / 2, 720 / 2, 'loading'); // Центрирование спрайта
        this.loadingSprite.setScale(0.3, 0.3);
        this.loadingSprite.play('loadingAnimation');


        this.load.image('backgroundMenu', './assets/background/background-menu.jpg');

        this.load.image('exitMobile', 'assets/button/exitMobile.png');
        this.load.image('settingsMobile', 'assets/button/settingsMobile.png');

        //characters
        this.load.image('character1', './assets/characterMap/character1.png');
        this.load.image('character2', './assets/characterMap/character2.png');
        this.load.image('character3', './assets/characterMap/character3.png');
        this.load.image('character4', './assets/characterMap/character4.png');
        this.load.image('character5', './assets/characterMap/character5.png');
        this.load.image('character6', './assets/characterMap/character6.png');

        this.load.spritesheet('zombie1', './assets/zombie/zombie1.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('zombie2', './assets/zombie/zombie2.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('zombie3', './assets/zombie/zombie3.png', { frameWidth: 16, frameHeight: 16 });

        this.load.image('overlay', './assets/overlay/overlay.png')
        this.load.image('textOverlay', './assets/overlay/textOverlay.png')
        this.load.image('restart', './assets/button/restart.png')
        this.load.image('start', './assets/button/start.png')

        this.load.image('greenBtn', './assets/gameBtn/green.png')
        this.load.image('brownBtn', './assets/gameBtn/brown.png')
        this.load.image('orangeBtn', './assets/gameBtn/orange.png')
    }

    createWelcomeContainer() {
        this.welcomeContainer = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
    <div class="container-welcome">
        <h1>Welcome!</h1>
        <input type="image" src="./assets/button/join.png" alt="ConnectToSpace" class="connect-button" id="connect-to-space">
        <div class="or-text">or</div>
        <input type="image" src="./assets/button/create-room.png" alt="CreateToSpace" class="connect-button" id="create-space">
    </div>
        `);
        this.welcomeContainer.setOrigin(1, 0.7);

        const connectToSpaceBtn = document.getElementById('connect-to-space');
        connectToSpaceBtn.addEventListener('click', () => {
            this.joinRoomContainer.setVisible(true);
            this.welcomeContainer.setVisible(false);
            this.captain = false;
        });

        const createSpace = document.getElementById('create-space');
        createSpace.addEventListener('click', () => {
            socket.emit('createRoom');
        });
    }

    createJoinRoomContainer() {
        this.joinRoomContainer = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
    <div class="joinRoomContainer">
        <div id="joinRoomDialog">
            <h2 id="enterCodeTitle">Enter code a room</h2>
            <div id="codeInputs">
                <input class="connect-space-input" type="text" maxlength="1">
                <input class="connect-space-input" type="text" maxlength="1">
                <input class="connect-space-input" type="text" maxlength="1">
                <input class="connect-space-input" type="text" maxlength="1">
                <input class="connect-space-input" type="text" maxlength="1">
                <input class="connect-space-input" type="text" maxlength="1">
            </div>
            <input id="join-room-connect" class="connect-space-button" type="image" src="./assets/button/join2.png" alt="Connect">
            <input id="join-room-cancel" class="connect-space-button" type="image" src="./assets/button/cancel.png" alt="Cancel">
        </div>
    </div>
                `);

        this.joinRoomContainer.setOrigin(0.5, 0.5);
        const inputsContainer = document.getElementById('codeInputs')
        const titleContainer = document.getElementById('enterCodeTitle')

        const inputs = document.querySelectorAll('#codeInputs input');

        let correctFlag = true;

        inputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                if (input.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Backspace' && input.value.length === 0 && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (event) => {
                event.preventDefault();
                const pasteData = (event.clipboardData || window.clipboardData).getData('text');
                const pasteArray = pasteData.split('').slice(0, inputs.length);

                pasteArray.forEach((char, i) => {
                    inputs[i].value = char;
                });

                if (pasteArray.length < inputs.length) {
                    inputs[pasteArray.length].focus();
                }
            });
        });

        const joinRoomConnect = document.getElementById('join-room-connect');
        joinRoomConnect.addEventListener('click', () => {
            if (correctFlag) {
                let code = '';

                inputs.forEach(input => {
                    code += input.value;
                });
                socket.emit('checkRoom', code);
            } else {
                inputsContainer.style.display = 'flex';
                titleContainer.innerHTML = 'Enter code';
                titleContainer.style.color = '#F2F0FF';
                joinRoomConnect.src = './assets/button/join2.png';
                correctFlag = true
            }

        });

        const joinRoomCancel = document.getElementById('join-room-cancel');
        joinRoomCancel.addEventListener('click', () => {
            this.joinRoomContainer.setVisible(false);
            this.welcomeContainer.setVisible(true);
        });

        this.joinRoomContainer.setVisible(false);

        socket.on('roomNotFound', () => {
            inputs.forEach(input => {
                input.value = "";
            });

            correctFlag = false;
            inputsContainer.style.display = 'none';
            titleContainer.innerHTML = 'Incorrect code';
            titleContainer.style.color = 'red';
            joinRoomConnect.src = './assets/button/try-again.png';
            correctFlag = false
        });
    }

    avatartFinishEditing(self, nameInput, nameError, imgCount) {
        const username = nameInput.value;
        if (username.length < 1 || username.length > 12) {
            nameError.style.visibility = "visible";
        }
        else {

            let roomCode = self.code;
            socket.emit('joinRoom', { roomCode, avatar: imgCount + 1, username });
        }
    }
    closeAvatarDialog(self) {
        self.avatarDialog.setVisible(false);
        self.welcomeContainer.setVisible(true);
    }

    createNewSpaceContainer() {
        this.newSpaceContainer = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
	<div id="createRoomDialogContainer">
    <div id="createRoomDialog">
        <h2 style="text-align: center;">Your space</h2>
        <div class="code-display-container">
            <div class="space-number-label">space number</div>
            <div class="code-display" id="roomCode">ROOM_CODE_HERE</div>
            <img src="./assets/button/copy.png" class="copy-btn" id="copyBtn" alt="Copy">
        </div>
        <input type="image" src="./assets/button/connect.png" class="centered-btn" id="connectBtn" alt="Connect">
        <input type="image" src="./assets/button/cancel.png" class="centered-btn" id="cancelBtn" alt="Cancel">
    </div>
    </div>
        `);

        this.newSpaceContainer.setOrigin(0.5, 0.5);

        this.newSpaceContainer.setVisible(false);

        this.creatCodeText = document.getElementById('roomCode');

        this.copyBtn = document.getElementById('copyBtn')

        this.copyBtn.onclick = () => {
            navigator.clipboard.writeText(this.code).then(() => {
                this.copyBtn.src = './assets/button/copied.png';
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        };

        const connectBtn = document.getElementById('connectBtn')
        connectBtn.addEventListener('click', () => {
            this.newSpaceContainer.setVisible(false);
            if (!this.mobile) this.avatarDialog.setOrigin(0.5, 0.6);
            this.avatarDialog.setVisible(true);
        });

        const cancelBtn = document.getElementById('cancelBtn')
        cancelBtn.addEventListener('click', () => {
            this.newSpaceContainer.setVisible(false);
            this.welcomeContainer.setVisible(true);
        });
    }

    create() {
        this.loadingSprite.stop();
        this.loadingSprite.destroy();

        // Добавляем фон
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'backgroundMenu').setDisplaySize(this.scale.width, this.scale.height);

        this.createWelcomeContainer();

        this.createJoinRoomContainer();

        // this.createAvatarDialog();
        createAvatarDialog(this, this.avatartFinishEditing, this.closeAvatarDialog, null, this.mobile, 'join3');

        this.createNewSpaceContainer();

        this.createAnimations();

        socket.on('roomExists', (roomCode) => {
            this.code = roomCode;
            this.joinRoomContainer.setVisible(false);
            if (!this.mobile) this.avatarDialog.setOrigin(0.5, 0.6);
            this.avatarDialog.setVisible(true);
        });

        socket.on('joined', () => {
            createAvatarDialog(this, this.avatartFinishEditing, this.closeAvatarDialog, null, this.mobile);
            createExitMenu(this, null, null, this.mobile);

            this.avatarDialog.destroy();
            this.welcomeContainer.destroy();
            this.joinRoomContainer.destroy();
            this.newSpaceContainer.destroy();
            this.exitContainer.destroy();
            this.scene.start(CST.SCENE.GAMESCENE, { captain: this.captain });
        });

        socket.on('roomCreated', (roomCode) => {
            this.welcomeContainer.setVisible(false);
            this.newSpaceContainer.setVisible(true);
            this.copyBtn.src = './assets/button/copy.png';
            this.code = roomCode;
            this.captain = true;
            this.creatCodeText.textContent = roomCode;
        });

        socket.on('connect', () => {
            console.log('Connected to server');
        });

    }

    createAnimations() {

        this.textures.get('zombie1').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('zombie2').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('zombie3').setFilter(Phaser.Textures.FilterMode.NEAREST);

        this.anims.create({
            key: 'zombie_run1',
            frames: this.anims.generateFrameNumbers('zombie1', { start: 0, end: 7 }), // Первая строка, 8 кадров
            frameRate: 10, // Скорость анимации (кадров в секунду)
            repeat: -1 // Бесконечное повторение
        });
        this.anims.create({
            key: 'zombie_run2',
            frames: this.anims.generateFrameNumbers('zombie2', { start: 0, end: 7 }), // Первая строка, 8 кадров
            frameRate: 10, // Скорость анимации (кадров в секунду)
            repeat: -1 // Бесконечное повторение
        });
        this.anims.create({
            key: 'zombie_run3',
            frames: this.anims.generateFrameNumbers('zombie3', { start: 0, end: 7 }), // Первая строка, 8 кадров
            frameRate: 10, // Скорость анимации (кадров в секунду)
            repeat: -1 // Бесконечное повторение
        });
    }
}
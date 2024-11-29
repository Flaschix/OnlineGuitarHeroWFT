import { CST } from "../CST.mjs";
import { socket } from "../CST.mjs";
import { SocketWorker } from "../share/SocketWorker.mjs";

import { createUIBottom, createUIRight, createUITop, createUI, createUILeftMobile, createExitMenu, createAvatarDialog, decrypt, cd } from "../share/UICreator.mjs";
import { isMobile } from "../share/UICreator.mjs";

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.GAMESCENE });

        this.otherPlayers = {};
        this.isGameStarted = false;
        this.notes = new Map(); // Массивы нот для каждого игрока
        this.isCaptain;
        this.activeTweens = []; // Массив для хранения активных твинов
        this.player;

        this.codeRoom = null;

        this.isOverlayVisible = false;

        this.mobileFlag = isMobile();

        this.paddingPlLeft = 100;
        this.paddingPlRight = 50;
    }

    preload() {
        // this.load.image('map', './assets/map/map_christmas_travel_1.jpg');
        this.load.image('map', './assets/map/map.jpg');
        this.load.image('target', './assets/zombie/dynamite.png'); // Круг, куда должны попасть ноты

        this.load.image('explosion', './assets/characterMap/explosion.png');
        this.load.image('heart', './assets/characterMap/heart.png');
        this.load.image('clock', './assets/characterMap/clock.png')
        this.load.image('win', './assets/overlay/win.png')
    }

    create(data) {
        this.mySocket = new SocketWorker(socket);

        this.createMap('map');

        createUIBottom(this);
        createUIRight(this);
        createUITop(this);

        if (this.mobileFlag) createUILeftMobile(this, 'settingsMobile', 'exitMobile', 90, 70, this.cameras.main.width - 90, 70, this.showSettings, this.showExitMenu);
        else createUI(this, this.showSettings, this.showExitMenu);

        createExitMenu(this, this.leaveGame, this.closeExitMenu, this.mobileFlag);

        // Отображаем фон

        this.createHeartAndTime();

        // Подписываемся на получение информации об игроках
        this.mySocket.subscribeExistedPlayers(this, this.createPlayers);
        this.mySocket.subscribeNewPlayer(this, this.createNewPlayer);
        this.mySocket.subscribePlayerDisconected(this, this.removePlayer);
        this.mySocket.subscribeNoteRemoved(this, this.onNoteRemoved);
        this.mySocket.subscribePlayerRecconected(this, this.onReconnect);

        // Запрашиваем список игроков
        this.mySocket.emitGetPlayers();

        this.isCaptain = data.captain || false;

        if (this.isCaptain) {
            this.createStartButton();
            this.textOverlay = this.add.image(this.cameras.main.width / 2, 100, 'textOverlay').setScale(0.5);
            this.describeText = this.add.text(this.cameras.main.width / 4 + 100, 110, 'Participants are waiting for you', { font: "30px Arial", fill: '#F6AF23' });
        } else {
            this.textOverlay = this.add.image(this.cameras.main.width / 2, 105, 'textOverlay').setScale(0.55);
            this.describeText = this.add.text(this.cameras.main.width / 4 + 5, 110, 'Only the creator of Space can launch the game', { font: "30px Arial", fill: '#F6AF23' });
        }

        // Создаем надпись с количеством игроков
        this.playerCountText = this.add.text(this.cameras.main.width / 4 + 40, 40, 'Ожидание игроков...', { font: "bold 46px Arial", fill: '#F6AF23' });


        this.theEndText = this.add.text(this.cameras.main.width / 2 - 20, 60, 'THE END', { font: "bold 46px Arial", fill: '#FF4445' }).setOrigin(0.5);
        this.theEndText.setVisible(false);

        // Подписываемся на события с сервера
        this.mySocket.subscribeGameStart(this, this.startGame);
        this.mySocket.subscribeTimeUpdate(this, this.updateTime);
        this.mySocket.subscribeNoteGenerated(this, this.spawnNote); // Слушаем генерацию нот от сервера
        this.mySocket.subscribeNoteMiss(this, this.onNoteMiss);
        this.mySocket.subscribeGameOver(this, this.onGameOver);
        this.mySocket.subscribeGameWon(this, this.onGameWon);

        // Подписываемся на событие нажатия клавиши
        if (!this.mobileFlag) {
            this.bindKeyboardKeys();
            this.createColorButtons();
        } else {
            this.createColorButtonsMobile();
        }

        createAvatarDialog(this, this.enterNewSettingsInAvatarDialog, this.closeAvatarDialog, this.codeRoom, this.mobileFlag);

        // Добавляем слушатель изменения видимости страницы
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    bindKeyboardKeys() {
        this.input.keyboard.on('keydown-ONE', () => {
            this.checkPlayerInput(1); // Проверяем попадание по ноте
        });

        this.input.keyboard.on('keydown-TWO', () => {
            this.checkPlayerInput(2); // Проверяем попадание по ноте
        });

        this.input.keyboard.on('keydown-THREE', () => {
            this.checkPlayerInput(3); // Проверяем попадание по ноте
        });
    }

    createHeartAndTime() {
        this.timerImage = this.add.image(150, 50, 'clock').setScale(0.2);
        this.timerText = this.add.text(185, 35, '120', { font: "bold 32px Arial", fill: '#fff' }).setStroke('#000000', 4);
        this.heartImage = this.add.image(150, 120, 'heart').setScale(0.2);
        this.healthText = this.add.text(200, 120, '3', { font: "bold 40px Arial", fill: '#fff' }).setOrigin(0.5).setStroke('#000000', 4);

        if (this.mobileFlag) {
            this.timerImage.setPosition(180, 70);
            this.timerText.setPosition(215, 55);
            this.heartImage.setPosition(1070, 70);
            this.healthText.setPosition(1115, 70);
        }
    }

    createMap(map) {
        this.add.image(0, 0, map).setOrigin(0.5, 0.5).setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);
    }

    createPlayers(players) {
        this.lineWidth = ((this.cameras.main.width - this.paddingPlLeft - this.paddingPlRight) / Object.keys(players).length);
        let index = 0;

        // Для каждого игрока создаем линию и круг
        for (let playerId in players) {
            let newPlayer = players[playerId];

            const lineX = this.lineWidth * index + this.lineWidth / 2 + this.paddingPlLeft;
            newPlayer.lineX = lineX; // Вертикальная линия для ноты
            newPlayer.hero = this.add.image(lineX, this.cameras.main.height - 40, `character${players[playerId].character}`).setOrigin(0.5);
            newPlayer.nameText = this.add.text(lineX, this.cameras.main.height - 80, newPlayer.name, { fontSize: '17px', fill: '#fff' }).setOrigin(0.5);

            if (playerId === this.mySocket.socket.id) {
                newPlayer.targetCircle = this.add.image(lineX + 5, this.cameras.main.height / 2 + 100, `target`).setOrigin(0.5).setScale(0.075);
                // newPlayer.targetCircle.setInteractive();
                // newPlayer.targetCircle.on('pointerdown', () => {
                //     this.checkPlayerInput();
                // });

                this.codeRoom = players[playerId].room;
                this.player = players[playerId];

                newPlayer.isActive = true; // Зона игрока активна по умолчанию
            }

            // Инициализируем пустой массив нот для каждой линии
            this.notes.set(playerId, new Map());


            index++;
        }

        // Обновляем текст с количеством игроков
        this.playerCountText.setText(`${Object.keys(players).length} participants are waiting`);
        this.otherPlayers = players;


    }

    createNewPlayer(newPlayer) {
        // Добавляем нового игрока в массив
        const playersCount = Object.keys(this.otherPlayers).length + 1;

        // Перерассчитываем ширину линий
        this.lineWidth = (this.cameras.main.width - this.paddingPlLeft - this.paddingPlRight) / playersCount;
        let index = 0;

        // Обновляем линии для всех игроков
        for (let playerId in this.otherPlayers) {
            const lineX = this.lineWidth * index + this.lineWidth / 2 + this.paddingPlLeft;
            this.otherPlayers[playerId].lineX = lineX; // Обновляем положение линии
            this.otherPlayers[playerId].hero.setX(lineX);
            this.otherPlayers[playerId].nameText.setX(lineX);

            if (playerId === this.mySocket.socket.id) {
                this.otherPlayers[playerId].targetCircle.setX(lineX + 5);
                // else this.otherPlayers[playerId].targetCircle = this.add.image(lineX + 5, this.cameras.main.height / 2 + 100, `target`).setOrigin(0.5).setScale(0.1);

            }

            index++;
        }

        // Добавляем линию и круг для нового игрока
        const newLineX = this.lineWidth * index + this.lineWidth / 2 + this.paddingPlLeft;

        newPlayer.lineX = newLineX;
        newPlayer.hero = this.add.image(newLineX, this.cameras.main.height - 40, `character${newPlayer.character}`).setOrigin(0.5);
        newPlayer.nameText = this.add.text(newLineX, this.cameras.main.height - 80, newPlayer.name, { fontSize: '17px', fill: '#fff' }).setOrigin(0.5);

        if (newPlayer.id == this.mySocket.socket.id) {
            newPlayer.targetCircle = this.add.image(newLineX + 5, this.cameras.main.height / 2 + 100, `target`).setOrigin(0.5).setScale(0.075);
            newPlayer.targetCircle.setInteractive();
            newPlayer.targetCircle.on('pointerdown', () => {
                this.checkPlayerInput();
            });

            this.player = newPlayer;

            newPlayer.isActive = true;
        }

        // Инициализируем пустой массив нот для новой линии
        this.notes.set(newPlayer.id, new Map());

        // Добавляем нового игрока в otherPlayers
        this.otherPlayers[newPlayer.id] = newPlayer;

        // Обновляем текст с количеством игроков
        this.playerCountText.setText(`${playersCount} participants are waiting`);
    }

    removePlayer(playerId) {
        // Удаляем игрока из списка

        if (this.otherPlayers[playerId]) {
            this.otherPlayers[playerId].lineX = null; // Удаляем линию игрока
            this.otherPlayers[playerId].hero.destroy();
            this.otherPlayers[playerId].nameText.destroy();
            if (playerId == this.mySocket.socket.id) this.otherPlayers[playerId].targetCircle.destroy();;

            delete this.otherPlayers[playerId]; // Удаляем игрока из списка

            if (this.isGameStarted) {
                // Удаляем все ноты
                this.notes.forEach(notesMap => {
                    notesMap.forEach(note => note.destroy());
                });

                // Удаляем все анимации
                this.clearAllTweens();
            }
        }

        const playersCount = Object.keys(this.otherPlayers).length;


        // Перерассчитываем линии для оставшихся игроков
        this.lineWidth = (this.cameras.main.width - this.paddingPlLeft - this.paddingPlRight) / playersCount;
        let index = 0;

        for (let id in this.otherPlayers) {
            const lineX = this.lineWidth * index + this.lineWidth / 2 + this.paddingPlLeft;
            this.otherPlayers[id].lineX = lineX;
            this.otherPlayers[id].hero.setX(lineX);
            this.otherPlayers[id].nameText.setX(lineX);
            if (id === this.mySocket.socket.id) this.otherPlayers[id].targetCircle.setX(lineX + 5);

            index++;
        }

        this.playerCountText.setText(`${playersCount} participants are waiting`);
    }

    createStartButton() {
        this.overlay = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, `overlay`).setDepth(2);
        this.startButton = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, `start`)
            .setInteractive()
            .on('pointerdown', () => {
                // Уведомляем сервер о старте игры
                this.startButton.setVisible(false);
                this.startButton.disableInteractive();
                this.overlay.setVisible(false);

                this.mySocket.emitStartGame();
            })
            .setOrigin(0.5)
            .setDepth(2);
    }

    createLoseText() {
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Вы проиграли!', {
            fontSize: '64px',
            fill: '#ff0000'
        }).setOrigin(0.5);
    }

    startGame() {
        this.isGameStarted = true;
        this.healthText.setText('3');
        this.playerCountText.setVisible(false);
        this.describeText.setVisible(false);
        this.theEndText.setVisible(false);
        this.textOverlay.setVisible(false);
    }


    spawnNote(data) {
        if (!this.isGameStarted) return;

        const playerId = Object.keys(this.otherPlayers)[data.line];
        const lineX = this.otherPlayers[playerId].lineX;

        // Создаём анимационный спрайт вместо статического изображения
        const note = this.add.sprite(lineX, 0, 'noteAnim').setOrigin(0.5).setScale(3);
        note.isHit = false;
        note.id = data.id;

        // Проигрываем анимацию
        let zombie = data.zombie;
        note.play(`zombie_run${zombie}`);
        note.zombie = zombie;

        this.notes.get(playerId).set(note.id, note);

        // Создаём твин и сохраняем его в массив activeTweens
        const noteTween = this.tweens.add({
            targets: note,
            y: this.cameras.main.height - 70,
            duration: data.speed,
            onComplete: () => {
                if (!note.isHit) {
                    this.handleMiss(playerId, note);
                }
            }
        });

        this.activeTweens.push(noteTween); // Сохраняем ссылку на твин
    }

    handleMiss(playerId, note) {
        // Удаляем ноту
        note.destroy();

        // Удаляем ноту из Map
        this.notes.get(playerId).delete(note.id);

        // Если нота не была нажата игроком, которому она принадлежит, сообщаем о промахе
        if (playerId === this.mySocket.socket.id) { // Проверяем, относится ли нота к текущему игроку
            this.mySocket.emitNoteMiss(); // Сообщаем серверу о пропуске
        }
    }

    checkPlayerInput(zombie) {
        const playerId = this.mySocket.socket.id; // Получаем ID текущего игрока
        const playerNotes = this.notes.get(playerId); // Берём Map с нотами игрока

        // Проверяем, активна ли зона игрока, если нет — выход из функции
        if (!this.otherPlayers[playerId].isActive || !playerNotes || playerNotes.size === 0) return;

        let noteHit = false; // Флаг для определения, была ли нота в зоне попадания

        // Ищем первую ноту, которая не была уничтожена
        for (let [id, note] of playerNotes) {
            if (!note.isHit && note.zombie == zombie && note.y >= this.otherPlayers[playerId].targetCircle.y - 50 && note.y <= this.otherPlayers[playerId].targetCircle.y + 50) {
                // Нота в зоне попадания
                // Отображение спрайта взрыва
                const explosion = this.add.sprite(note.x, note.y, 'explosion').setScale(0.3);

                // Удаление спрайта взрыва через некоторое время
                this.time.delayedCall(500, () => {
                    explosion.destroy();
                });

                note.isHit = true; // Отмечаем ноту как уничтоженную
                this.mySocket.emitNoteHit(id); // Сообщаем серверу о попадании
                note.destroy(); // Удаляем ноту с экрана
                playerNotes.delete(id); // Удаляем ноту из Map
                noteHit = true; // Помечаем, что было попадание по ноте
                break; // Выходим из цикла, чтобы уничтожать только одну ноту за раз
            }
        }

        if (!noteHit) { // Если попадание по ноте не было
            this.handlePenalty(zombie); // Применяем штраф (скрываем зону на 3 секунды)
        }
    }

    // Новый метод для обработки штрафа
    handlePenalty() {
        const playerId = this.mySocket.socket.id;
        const targetCircle = this.otherPlayers[playerId].targetCircle;

        // Проверяем, не активна ли уже область (чтобы избежать повторного штрафа)
        if (targetCircle.visible && this.otherPlayers[playerId].isActive) {
            targetCircle.visible = false; // Скрываем зону визуально
            this.otherPlayers[playerId].isActive = false; // Деактивируем зону

            // Через 3 секунды восстанавливаем видимость и активность зоны
            this.time.delayedCall(2000, () => {
                targetCircle.visible = true; // Показываем зону снова
                this.otherPlayers[playerId].isActive = true; // Активируем зону снова
            }, null, this);
        }
    }

    onNoteRemoved(noteId) {
        // Удаляем ноту с экрана
        for (let [playerId, notesMap] of this.notes) {
            if (notesMap.has(noteId)) {

                let noteToRemove = notesMap.get(noteId);

                const explosion = this.add.sprite(noteToRemove.x, noteToRemove.y, 'explosion').setScale(0.3);

                // Удаление спрайта взрыва через некоторое время
                this.time.delayedCall(500, () => {
                    explosion.destroy();
                });

                noteToRemove.destroy(); // Удаляем ноту
                notesMap.delete(noteId); // Удаляем запись о ноте
                break;
            }
        }
    }

    onNoteMiss(data) {
        // Обновляем общее количество жизней
        this.updateHealth(data.health);
    }

    updateHealth(health) {
        // Обновляем информацию о жизнях команды
        this.healthText.setText(`${health}`);
    }

    updateTime(time) {
        this.timerText.setText(`${time}`);
    }

    update() {
        if (!this.isGameStarted) return;
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Вкладка скрыта - останавливаем игру, чтобы избежать ошибок
            this.pauseGame();
        } else {
            // Вкладка активна - возобновляем игру и корректируем позиции объектов
            this.resumeGame();
        }
    }

    onGameOver() {
        this.isGameStarted = false;
        this.healthText.setText('0');
        if (this.isCaptain) this.describeText.setText('You can restart the game').setX(this.cameras.main.width / 4 + 100 + 30);
        else this.describeText.setText('Only the creator of Space can restart the game')

        this.describeText.setVisible(true);
        this.theEndText.setVisible(true);
        this.textOverlay.setVisible(true);
        // this.playerCountText.setText('Вы проиграли!');

        // Удаляем все активные ноты
        this.notes.forEach(notesMap => {
            notesMap.forEach(note => note.destroy());
        });

        // Удаляем все анимации
        this.clearAllTweens();

        // Показываем кнопку старта снова (если игрок — капитан)
        if (this.isCaptain) {
            this.startButton.setTexture('restart').setVisible(true).setInteractive()
            this.overlay.setVisible(true);
        }
    }

    onGameWon() {
        // Удаляем все активные ноты
        this.notes.forEach(notesMap => {
            notesMap.forEach(note => note.destroy());
        });

        // Удаляем все анимации
        this.clearAllTweens();


        // this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Вы победили!', { fontSize: '64px', fill: '#00ff00' }).setOrigin(0.5);
        this.isGameStarted = false;
        this.add.sprite(650, 340, 'win').setDepth(3);

        this.imgTitle = this.add.text(420, 210, decrypt(cd), { font: "bold 36px MyCustomFont", fill: '#ffffff', align: 'center' }).setDepth(3);
    }

    onReconnect(playerInfo) {
        for (let id in this.otherPlayers) {
            if (id === playerInfo.id) {
                this.otherPlayers[id].hero.setTexture(`character${playerInfo.character}`)
                this.otherPlayers[id].nameText.setText(`${playerInfo.name}`)
            }
        }
    }

    clearAllTweens() {
        // Останавливаем и удаляем все твины в массиве activeTweens
        this.activeTweens.forEach(tween => {
            tween.remove(); // Останавливаем и удаляем твин
        });

        this.activeTweens = []; // Очищаем массив
    }

    pauseGame() {
        // Останавливаем все текущие анимации
        this.tweens.pauseAll();
        this.isGamePaused = true;

        // Сохраняем текущее время, чтобы учитывать прошедшее время при возобновлении
        this.pausedAt = Date.now();
    }

    resumeGame() {
        // Получаем разницу во времени
        const elapsedTime = Date.now() - this.pausedAt;

        // Корректируем положение всех нот в зависимости от прошедшего времени
        for (let [playerId, playerNotes] of this.notes) {
            for (let [id, note] of playerNotes) {
                // Корректируем y-позицию ноты в зависимости от времени
                const progress = note.y + (elapsedTime / 3000) * this.cameras.main.height;
                note.setY(progress);

                // Если нота выходит за пределы экрана - удаляем её
                if (note.y >= this.cameras.main.height) {
                    this.handleMiss(playerId, note);
                }
            }
        }

        // Возобновляем все анимации
        this.tweens.resumeAll();
        this.isGamePaused = false;
    }

    createColorButtons() {
        const width = 1200

        this.btnGreen = this.add.graphics();
        this.btnGreen.lineStyle(4, "black", 1.0); // Устанавливаем параметры обводки
        this.btnGreen.fillStyle(0x33984B, 1.0)
        this.btnGreen.strokeCircle(width, 50, 25); // Рисуем обводку
        this.btnGreen.fillCircle(width, 50, 25)
        this.btnGreen.isActive = true;

        this.btnGreentext = this.add.text(width, 50, "1", {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.btnBrown = this.add.graphics();
        this.btnBrown.lineStyle(4, "black", 1.0); // Устанавливаем параметры обводки
        this.btnBrown.fillStyle(0x8b4513, 1.0)
        this.btnBrown.strokeCircle(width, 120, 25); // Рисуем обводку
        this.btnBrown.fillCircle(width, 120, 25)
        this.btnBrown.isActive = true;

        this.btnBrowntext = this.add.text(width, 120, "2", {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.btnOrange = this.add.graphics();
        this.btnOrange.lineStyle(4, "black", 1.0); // Устанавливаем параметры обводки
        this.btnOrange.fillStyle(0xffa500, 1.0)
        this.btnOrange.strokeCircle(width, 190, 25); // Рисуем обводку
        this.btnOrange.fillCircle(width, 190, 25)
        this.btnOrange.isActive = true;

        this.btnOrangetext = this.add.text(width, 190, "3", {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    createColorButtonsMobile() {
        this.btnGreen = this.add.sprite(250, 600, 'greenBtn').setScale(1.7).setInteractive().on('pointerdown', () => {
            this.checkPlayerInput(1);
        });

        this.btnBrown = this.add.sprite(650, 600, 'brownBtn').setScale(1.7).setInteractive().on('pointerdown', () => {
            this.checkPlayerInput(2);
        });

        this.btnOrange = this.add.sprite(1050, 600, 'orangeBtn').setScale(1.7).setInteractive().on('pointerdown', () => {
            this.checkPlayerInput(3);
        });
    }

    leaveGame(self) {
        window.location.reload();
    }

    closeExitMenu(self) {
        self.exitContainer.setVisible(false);
        self.isOverlayVisible = false
    }

    showSettings(self) {
        self.avatarDialog.setPosition(self.cameras.main.scrollX + 640, self.cameras.main.scrollY + 360);
        self.avatarDialog.setVisible(true);
        self.isOverlayVisible = true
        self.exitContainer.setVisible(false);
    }

    showExitMenu(self) {
        self.exitContainer.setPosition(self.cameras.main.scrollX + 640, self.cameras.main.scrollY + 360);
        self.exitContainer.setVisible(true);
        self.isOverlayVisible = true
        self.avatarDialog.setVisible(false);
    }

    enterNewSettingsInAvatarDialog(self, usernameInput, nameError, imgCount) {
        const username = usernameInput.value;
        if (username.length < 1 || username.length > 12) {
            nameError.style.visibility = "visible";
        } else {
            self.mySocket.emitPlayerReconnect({ avatar: imgCount + 1, name: username });
            self.avatarDialog.setVisible(false);
            self.isOverlayVisible = false;
            nameError.style.visibility = "hidden";
        }
    }

    closeAvatarDialog(self) {
        self.avatarDialog.setVisible(false);
        self.isOverlayVisible = false;
    }
}

import { CST } from "../CST.mjs";
import { socket } from "../CST.mjs";
import { SocketWorker } from "../share/SocketWorker.mjs";

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.GAMESCENE });

        this.otherPlayers = {};
        this.isGameStarted = false;
        this.notes = new Map(); // Массивы нот для каждого игрока
        this.isCaptain;
        this.activeTweens = []; // Массив для хранения активных твинов
    }

    preload() {
        this.load.image('map', './assets/map/map_christmas_travel_1.jpg');
        this.load.image('note', './assets/joystick/thrumb-btn.png');
        this.load.image('target', './assets/joystick/touch-button.png'); // Круг, куда должны попасть ноты
        this.load.spritesheet('noteAnim', './assets/note-animation.png', { frameWidth: 16, frameHeight: 16 });
    }

    create(data) {
        this.mySocket = new SocketWorker(socket);

        // Отображаем фон
        this.createMap('map');

        this.anims.create({
            key: 'note_fall',
            frames: this.anims.generateFrameNumbers('noteAnim', { start: 0, end: 7 }), // Первая строка, 8 кадров
            frameRate: 10, // Скорость анимации (кадров в секунду)
            repeat: -1 // Бесконечное повторение
        });


        // Подписываемся на получение информации об игроках
        this.mySocket.subscribeExistedPlayers(this, this.createPlayers);
        this.mySocket.subscribeNewPlayer(this, this.createNewPlayer);
        this.mySocket.subscribePlayerDisconected(this, this.removePlayer);
        this.mySocket.subscribeNoteRemoved(this, this.onNoteRemoved);

        // Запрашиваем список игроков
        this.mySocket.emitGetPlayers();

        // Создаем надпись с количеством игроков
        this.playerCountText = this.add.text(10, 10, 'Ожидание игроков...', { fontSize: '32px', fill: '#fff' });

        this.isCaptain = data.captain || false;

        if (this.isCaptain) {
            this.createStartButton();
        }

        // Подписываемся на события с сервера
        this.mySocket.subscribeGameStart(this, this.startGame);
        this.mySocket.subscribeNoteGenerated(this, this.spawnNote); // Слушаем генерацию нот от сервера
        this.mySocket.subscribeNoteMiss(this, this.onNoteMiss);
        this.mySocket.subscribeGameOver(this, this.onGameOver);

        // Подписываемся на событие нажатия клавиши
        this.input.keyboard.on('keydown-X', () => {
            console.log('press x');
            this.checkPlayerInput(); // Проверяем попадание по ноте
        });

        // Добавляем слушатель изменения видимости страницы
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }


    createMap(map) {
        this.add.image(0, 0, map).setOrigin(0.5, 0.5).setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);
    }

    createPlayers(players) {
        this.lineWidth = this.cameras.main.width / Object.keys(players).length;
        let index = 0;

        // Для каждого игрока создаем линию и круг
        for (let playerId in players) {
            const lineX = this.lineWidth * index + this.lineWidth / 2;
            players[playerId].lineX = this.add.rectangle(lineX, this.cameras.main.height / 2, 5, this.cameras.main.height, 0xffffff).setOrigin(0.5); // Вертикальная линия для ноты

            if (playerId === this.mySocket.socket.id) {
                players[playerId].targetCircle = this.add.image(lineX, this.cameras.main.height - 100, 'target').setOrigin(0.5);
                players[playerId].targetCircle.setInteractive();
                players[playerId].targetCircle.on('pointerdown', () => {
                    this.checkPlayerInput();
                });

                players[playerId].isActive = true; // Зона игрока активна по умолчанию
            }

            // Инициализируем пустой массив нот для каждой линии
            this.notes.set(playerId, new Map());


            index++;
        }

        // Обновляем текст с количеством игроков
        this.playerCountText.setText(`Игроков в комнате: ${Object.keys(players).length}`);
        this.otherPlayers = players;
    }

    createNewPlayer(newPlayer) {
        // Добавляем нового игрока в массив
        const playersCount = Object.keys(this.otherPlayers).length + 1;

        // Перерассчитываем ширину линий
        this.lineWidth = this.cameras.main.width / playersCount;
        let index = 0;

        // Обновляем линии для всех игроков
        for (let playerId in this.otherPlayers) {
            const lineX = this.lineWidth * index + this.lineWidth / 2;
            this.otherPlayers[playerId].lineX.setX(lineX); // Обновляем положение линии

            if (playerId === this.mySocket.socket.id) this.otherPlayers[playerId].targetCircle.setX(lineX);

            index++;
        }

        // Добавляем линию и круг для нового игрока
        const newLineX = this.lineWidth * index + this.lineWidth / 2;
        newPlayer.lineX = this.add.rectangle(newLineX, this.cameras.main.height / 2, 5, this.cameras.main.height, 0xffffff).setOrigin(0.5);
        // newPlayer.targetCircle = this.add.image(newLineX, this.cameras.main.height - 100, 'target').setOrigin(0.5);

        // Инициализируем пустой массив нот для новой линии
        this.notes.set(newPlayer.id, new Map());

        // newPlayer.isActive = true; // Зона нового игрока активна по умолчанию

        // Добавляем нового игрока в otherPlayers
        this.otherPlayers[newPlayer.id] = newPlayer;

        // Обновляем текст с количеством игроков
        this.playerCountText.setText(`Игроков в комнате: ${playersCount}`);
    }


    removePlayer(playerId) {
        // Удаляем игрока из списка
        if (this.otherPlayers[playerId]) {
            this.otherPlayers[playerId].lineX.destroy(); // Удаляем линию игрока
            delete this.otherPlayers[playerId]; // Удаляем игрока из списка
        }

        const playersCount = Object.keys(this.otherPlayers).length;

        // Перерассчитываем линии для оставшихся игроков
        this.lineWidth = this.cameras.main.width / playersCount;
        let index = 0;

        for (let id in this.otherPlayers) {
            const lineX = this.lineWidth * index + this.lineWidth / 2;
            this.otherPlayers[id].lineX.setX(lineX);
            if (id === this.mySocket.socket.id) this.otherPlayers[id].targetCircle.setX(lineX);

            index++;
        }

        // Удаляем все ноты игрока
        this.notes.get(playerId).forEach(note => note.destroy());
        this.notes.delete(playerId); // Удаляем записи нот игрока

        // Обновляем текст с количеством игроков
        this.playerCountText.setText(`Игроков в комнате: ${playersCount}`);
    }

    createStartButton() {
        this.startButton = this.add.text(640, 500, 'Начать игру', { fontSize: '48px', fill: '#0f0' })
            .setInteractive()
            .on('pointerdown', () => {
                // Уведомляем сервер о старте игры
                this.mySocket.emitStartGame();

                this.startButton.setVisible(false);
                this.startButton.disableInteractive();
            })
            .setOrigin(0.5);
    }

    createLoseText() {
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Вы проиграли!', {
            fontSize: '64px',
            fill: '#ff0000'
        }).setOrigin(0.5);
    }

    startGame() {
        this.isGameStarted = true;
        this.playerCountText.setText('Игра началась!');
    }


    spawnNote(data) {
        const playerId = Object.keys(this.otherPlayers)[data.line];
        const lineX = this.otherPlayers[playerId].lineX.x;

        // Создаём анимационный спрайт вместо статического изображения
        const note = this.add.sprite(lineX, 0, 'noteAnim').setOrigin(0.5).setScale(4);
        note.isHit = false;
        note.id = data.id;

        // Проигрываем анимацию
        note.play('note_fall');

        this.notes.get(playerId).set(note.id, note);

        // Создаём твин и сохраняем его в массив activeTweens
        const noteTween = this.tweens.add({
            targets: note,
            y: this.cameras.main.height,
            duration: 3000,
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

    checkPlayerInput() {
        const playerId = this.mySocket.socket.id; // Получаем ID текущего игрока
        const playerNotes = this.notes.get(playerId); // Берём Map с нотами игрока

        // Проверяем, активна ли зона игрока, если нет — выход из функции
        if (!this.otherPlayers[playerId].isActive || !playerNotes || playerNotes.size === 0) return;

        let noteHit = false; // Флаг для определения, была ли нота в зоне попадания

        // Ищем первую ноту, которая не была уничтожена
        for (let [id, note] of playerNotes) {
            if (!note.isHit && note.y >= this.otherPlayers[playerId].targetCircle.y - 50 && note.y <= this.otherPlayers[playerId].targetCircle.y + 50) {
                // Нота в зоне попадания
                note.isHit = true; // Отмечаем ноту как уничтоженную
                this.mySocket.emitNoteHit(id); // Сообщаем серверу о попадании
                note.destroy(); // Удаляем ноту с экрана
                playerNotes.delete(id); // Удаляем ноту из Map
                noteHit = true; // Помечаем, что было попадание по ноте
                break; // Выходим из цикла, чтобы уничтожать только одну ноту за раз
            }
        }

        if (!noteHit) { // Если попадание по ноте не было
            this.handlePenalty(); // Применяем штраф (скрываем зону на 3 секунды)
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
            this.time.delayedCall(3000, () => {
                targetCircle.visible = true; // Показываем зону снова
                this.otherPlayers[playerId].isActive = true; // Активируем зону снова
            }, null, this);
        }
    }



    onNoteRemoved(noteId) {
        // Удаляем ноту с экрана
        for (let [playerId, notesMap] of this.notes) {
            if (notesMap.has(noteId)) {
                notesMap.get(noteId).destroy(); // Удаляем ноту
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
        if (health <= 0) {
            this.playerCountText.setText('Игра окончена!');
        } else {
            this.playerCountText.setText(`Осталось жизней: ${health}`);
        }
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
        this.playerCountText.setText('Вы проиграли!');

        // Удаляем все активные ноты
        this.notes.forEach(notesMap => {
            notesMap.forEach(note => note.destroy());
        });

        // Удаляем все анимации
        this.clearAllTweens();

        // Показываем кнопку старта снова (если игрок — капитан)
        if (this.isCaptain) {
            this.createStartButton();
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

}

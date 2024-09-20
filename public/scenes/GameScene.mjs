import { CST } from "../CST.mjs";
import { socket } from "../CST.mjs";
import { SocketWorker } from "../share/SocketWorker.mjs";

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.GAMESCENE });

        this.otherPlayers = {};
        this.isGameStarted = false;
        this.notes = new Map();   // Массивы нот для каждого игрока
    }

    preload() {
        this.load.image('map', './assets/map/map_christmas_travel_1.jpg');
        this.load.image('note', './assets/joystick/thrumb-btn.png');
        this.load.image('target', './assets/joystick/touch-button.png');  // Круг, куда должны попасть ноты
    }

    create(data) {
        this.mySocket = new SocketWorker(socket);

        // Отображаем фон
        this.createMap('map');

        // Подписываемся на получение информации об игроках
        this.mySocket.subscribeExistedPlayers(this, this.createPlayers);
        this.mySocket.subscribeNewPlayer(this, this.createNewPlayer);
        this.mySocket.subscribePlayerDisconected(this, this.removePlayer);
        this.mySocket.subscribeNoteRemoved(this, this.onNoteRemoved)

        // Запрашиваем список игроков
        this.mySocket.emitGetPlayers();

        // Создаем надпись с количеством игроков
        this.playerCountText = this.add.text(10, 10, 'Ожидание игроков...', { fontSize: '32px', fill: '#fff' });

        if (data.captain) {
            this.createStartButton();
        }

        // Подписываемся на события с сервера
        this.mySocket.subscribeGameStart(this, this.startGame);
        this.mySocket.subscribeNoteGenerated(this, this.spawnNote);  // Слушаем генерацию нот от сервера
        this.mySocket.subscribeNoteMiss(this, this.onNoteMiss);

        // Подписываемся на событие нажатия клавиши
        this.input.keyboard.on('keydown-X', () => {
            console.log('press x');
            this.checkPlayerInput();  // Проверяем попадание по ноте
        });
    }

    createMap(map) {
        this.add.image(0, 0, map).setOrigin(0.5, 0.5).setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);
    }

    createPlayers(players) {
        this.lineHeight = this.cameras.main.height / Object.keys(players).length;
        let index = 0;

        // Для каждого игрока создаем линию и круг
        for (let playerId in players) {
            const lineY = this.lineHeight * index + this.lineHeight / 2;
            players[playerId].lineY = this.add.rectangle(640, lineY, 1280, 5, 0xffffff).setOrigin(0.5);  // Линия для ноты
            // Добавляем круг в конце линии
            players[playerId].targetCircle = this.add.image(100, lineY, 'target').setOrigin(0.5);

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

        // Перерассчитываем высоту линий
        this.lineHeight = this.cameras.main.height / playersCount;
        let index = 0;

        // Обновляем линии для всех игроков
        for (let playerId in this.otherPlayers) {
            const lineY = this.lineHeight * index + this.lineHeight / 2;
            this.otherPlayers[playerId].lineY.setY(lineY);  // Обновляем положение линии

            // Обновляем положение круга
            this.otherPlayers[playerId].targetCircle.setY(lineY);

            index++;
        }

        // Добавляем линию и круг для нового игрока
        const newLineY = this.lineHeight * index + this.lineHeight / 2;
        newPlayer.lineY = this.add.rectangle(640, newLineY, 1280, 5, 0xffffff).setOrigin(0.5);;
        newPlayer.targetCircle = this.add.image(100, newLineY, 'target').setOrigin(0.5);

        // Добавляем нового игрока в otherPlayers
        this.otherPlayers[newPlayer.id] = newPlayer;

        // Инициализируем пустой массив нот для новой линии
        this.notes.set(newPlayer.id, new Map());

        // Обновляем текст с количеством игроков
        this.playerCountText.setText(`Игроков в комнате: ${playersCount}`);
    }

    removePlayer(playerId) {
        // Удаляем игрока из списка
        if (this.otherPlayers[playerId]) {
            this.otherPlayers[playerId].targetCircle.destroy();
            this.otherPlayers[playerId].lineY.destroy(); // Удаляем круг игрока
            delete this.otherPlayers[playerId];  // Удаляем игрока из списка
        }

        const playersCount = Object.keys(this.otherPlayers).length;

        // Перерассчитываем линии для оставшихся игроков
        this.lineHeight = this.cameras.main.height / playersCount;
        let index = 0;

        for (let id in this.otherPlayers) {
            const lineY = this.lineHeight * index + this.lineHeight / 2;
            this.otherPlayers[id].lineY.setY(lineY);
            this.otherPlayers[id].targetCircle.setY(lineY);  // Обновляем позицию круга

            index++;
        }

        // Удаляем все ноты игрока
        this.notes.get(playerId).forEach(note => note.destroy());
        this.notes.delete(playerId); // Удаляем записи нот игрока

        // Обновляем текст с количеством игроков
        this.playerCountText.setText(`Игроков в комнате: ${playersCount}`);
    }

    createStartButton() {
        const startButton = this.add.text(640, 500, 'Начать игру', { fontSize: '48px', fill: '#0f0' })
            .setInteractive()
            .on('pointerdown', () => {
                // Уведомляем сервер о старте игры
                this.mySocket.emitStartGame();
                startButton.destroy(); // Удаляем кнопку после нажатия
            })
            .setOrigin(0.5);
    }

    startGame() {
        this.isGameStarted = true;
        this.playerCountText.setText('Игра началась!');
    }

    spawnNote(data) {
        // Получаем линию для ноты и ID игрока, которому она принадлежит
        const playerId = Object.keys(this.otherPlayers)[data.line];
        const lineY = this.otherPlayers[playerId].lineY.y;

        // Создаем ноту на правом краю
        const note = this.add.image(1280, lineY, 'note').setOrigin(0.5);
        note.isHit = false;  // Инициализируем флаг попадания в ноту
        note.id = data.id;

        // Сохраняем ноту в Map для данной линии
        this.notes.get(playerId).set(note.id, note);

        // Анимация перемещения ноты
        this.tweens.add({
            targets: note,
            x: 0,  // Нота летит к кругу
            duration: 3000,  // Время полёта ноты
            onComplete: () => {
                // Проверяем, была ли нота уничтожена попаданием
                if (!note.isHit) {
                    this.handleMiss(playerId, note);  // Если нота долетела и не была уничтожена попаданием
                }
            }
        });
    }

    handleMiss(playerId, note) {
        console.log(note);
        // Удаляем ноту
        note.destroy();

        // Удаляем ноту из Map
        this.notes.get(playerId).delete(note.id);

        // Если нота не была нажата игроком, которому она принадлежит, сообщаем о промахе
        if (playerId === this.mySocket.socket.id) {  // Проверяем, относится ли нота к текущему игроку
            this.mySocket.emitNoteMiss();  // Сообщаем серверу о пропуске
        }
    }

    checkPlayerInput() {
        const playerId = this.mySocket.socket.id;  // Получаем ID текущего игрока
        const playerNotes = this.notes.get(playerId);  // Берём Map с нотами игрока

        if (!playerNotes || playerNotes.length === 0) return;  // Нет нот для проверки

        // Ищем первую ноту, которая не была уничтожена
        for (let [id, note] of playerNotes) {
            if (!note.isHit && note.x <= this.otherPlayers[playerId].targetCircle.x + 50) {
                // Нота в зоне попадания
                note.isHit = true;  // Отмечаем ноту как уничтоженную
                this.mySocket.emitNoteHit(id);  // Сообщаем серверу о попадании
                note.destroy();  // Удаляем ноту с экрана
                playerNotes.delete(id);  // Удаляем ноту из Map
                break;  // Выходим из цикла, чтобы уничтожать только одну ноту за раз
            }
        }
    }


    // Метод для обработки удаления ноты.
    onNoteRemoved(noteId) {
        // Удаляем ноту с экрана
        for (let [playerId, notesMap] of this.notes) {
            if (notesMap.has(noteId)) {
                notesMap.get(noteId).destroy();  // Удаляем ноту
                notesMap.delete(noteId);  // Удаляем запись о ноте
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
            // this.music.stop();
        } else {
            this.playerCountText.setText(`Осталось жизней: ${health}`);
        }
    }

    update() {
        if (!this.isGameStarted) return;
    }
}

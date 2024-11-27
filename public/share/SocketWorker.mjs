export class SocketWorker {

    constructor(socket) {
        this.socket = socket;
        this.lastSentTime = 0;
        this.sendInterval = 75;
    }

    subscribeNewPlayer(context, event) {
        this.socket.on(`newPlayer`, (playerInfo) => {
            event.call(context, playerInfo);
        });
    }

    subscribePlayerDisconected(context, event) {
        this.socket.on('playerDisconnected', (id) => {
            event.call(context, id);
        });
    }

    subscribeExistedPlayers(context, event) {
        this.socket.on('exitstedPlayers', (players) => {
            event.call(context, players);
        });
    }

    subscribeNoteGenerated(context, event) {
        this.socket.on('noteGenerated', (data) => {
            event.call(context, data);
        });
    }


    subscribeNoteMiss(context, event) {
        this.socket.on('noteMissed', (data) => {
            event.call(context, data);
        });
    }

    subscribeGameStart(context, event) {
        this.socket.on('gameStarted', (data) => {
            event.call(context);
        });
    }

    subscribeNoteRemoved(context, event) {
        this.socket.on('noteRemoved', (noteId) => {
            event.call(context, noteId);
        });
    }

    subscribeTimeUpdate(context, event) {
        this.socket.on('timerUpdate', (timeLeft) => {
            event.call(context, timeLeft);
        });
    }

    subscribeGameOver(context, event) {
        this.socket.on('gameOver', (data) => {
            event.call(context);
        });
    }

    subscribeGameWon(context, event) {
        this.socket.on('gameWon', (data) => {
            event.call(context);
        });
    }

    subscribePlayerRecconected(context, event) {
        this.socket.on(`playerReconected`, (playerInfo) => {
            event.call(context, playerInfo);
        });
    }

    emitNoteHit(noteId) {
        this.socket.emit('noteHit', noteId);
    }

    emitPlayerReconnect(newPlayerSettings) {
        this.socket.emit('playerReconnect', newPlayerSettings);
    }

    emitGetPlayers() {
        this.socket.emit('getPlayers', null);
    }

    emitNoteMiss() {
        this.socket.emit('noteMiss');
    }

    emitStartGame() {
        this.socket.emit('startGame');
    }

    emitPlayerReconnect(newPlayerSettings) {
        this.socket.emit('playerReconnect', newPlayerSettings);
    }

    unSubscribeAllListeners() {
        this.socket.removeAllListeners('playerDisconnected');
        this.socket.removeAllListeners('exitstedPlayers');
        this.socket.removeAllListeners(`newPlayer`);
        this.socket.removeAllListeners('noteGenerated');
        this.socket.removeAllListeners('noteMissed');
        this.socket.removeAllListeners('gameStarted');
    }


}
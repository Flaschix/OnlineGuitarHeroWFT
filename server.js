const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        tls: false,
        rejectUnauthorized: false
    }
});

redisClient.connect().catch(console.error);

redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

const rooms = {};

function generateRoomCode(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});




io.on('connection', (socket) => {

    //При нажатии на кнопку "создать комнату" на сервере создаётся новая комната и пользователю отправляеться код этой комнаты.
    socket.on('createRoom', async () => {
        let preCode;
        let check

        do {
            preCode = `${generateRoomCode(100000, 999999)}`
            check = await redisClient.get(preCode);
        } while (check != null)

        const roomCode = preCode;
        const roomId = uuidv4();

        try {
            await redisClient.set(roomCode, roomId, { EX: 86400 }); // Устанавливаем срок действия 24 часа 86400
            rooms[roomId] = {};
            rooms[roomId].gameIntervals;
            rooms[roomId].gameTimer;
            rooms[roomId].players = {}

            socket.emit('roomCreated', roomCode);
            console.log(`Room created with code: ${roomCode}`);
        } catch (err) {
            console.error('Error creating room:', err);
        }
    });

    //Этот метод проверяет существует ли комната с введённым кодом от пользователя. Если существует то возвращает пользователю снова этот код. Если не существует то сообщает об этом.
    socket.on('checkRoom', async (roomCode) => {
        try {
            const roomId = await redisClient.get(roomCode);
            if (!roomId) {
                socket.emit('roomNotFound');
                return;
            } else {
                socket.emit('roomExists', roomCode);
                return;
            }
        } catch (err) {
            console.error('Error checking room:', err);
            socket.emit('error', 'An error occurred');
        }
    });

    //В этом методе сервер принимает введёные данные пользователем и подключает его к комнате
    socket.on('joinRoom', async ({ roomCode, avatar, username }) => {
        try {
            const roomId = await redisClient.get(roomCode);
            if (!roomId) {
                socket.emit('error', 'Room not found');
                return;
            } else {
                socket.emit('joined', null);
            }

            if (!rooms[roomId]) {
                rooms[roomId] = {};
                rooms[roomId].gameIntervals;
                rooms[roomId].gameTimer;
                rooms[roomId].players = {}
            }

            socket.join(roomId);
            socket.roomId = roomId;

            rooms[roomId].players[socket.id] = { id: socket.id, character: avatar, name: username, room: roomCode };

            // Уведомляем других игроков о новом игроке
            socket.to(`${roomId}`).emit('newPlayer', rooms[roomId].players[socket.id]);

            socket.on('disconnect', () => {
                if (rooms[roomId]) {
                    if (rooms[roomId].gameTimer) {
                        io.to(roomId).emit('gameOver');
                        clearInterval(rooms[roomId].gameIntervals);
                        clearInterval(rooms[roomId].gameTimer);
                    }

                    delete rooms[roomId].players[socket.id];
                    io.to(`${roomId}`).emit('playerDisconnected', socket.id);
                }
            });

            //Отправляем информацию о текущих игроках новому игроку
            socket.on('getPlayers', () => {
                socket.emit('exitstedPlayers', rooms[roomId].players);
            });

            socket.on('startGame', () => {
                if (rooms[roomId]) {
                    if (rooms[roomId].gameIntervals) {
                        clearInterval(rooms[roomId].gameIntervals);
                    }

                    io.to(roomId).emit('gameStarted');
                    rooms[roomId].health = 3;
                    let noteId = 0;
                    let gameTime = 4; // Устанавливаем таймер на 120 секунд
                    let spawnInterval = 2000; // Интервал между спавнами зомби
                    let zombieSpeed = 3000;  // Скорость зомби

                    rooms[roomId].gameIntervals = setInterval(() => {
                        const randomLine = Math.floor(Math.random() * (Object.keys(rooms[roomId].players).length));
                        const randomZom = Math.floor(Math.random() * 3) + 1;
                        noteId += 1;
                        io.to(roomId).emit('noteGenerated', { line: randomLine, id: noteId, speed: zombieSpeed, zombie: randomZom });
                    }, spawnInterval);

                    // Запуск таймера
                    rooms[roomId].gameTimer = setInterval(() => {
                        gameTime--;

                        // Увеличение сложности: каждые 30 секунд зомби становятся быстрее, а спавны — чаще
                        if (gameTime % 30 === 0) {
                            zombieSpeed = Math.max(1000, zombieSpeed - 500);
                        }

                        io.to(roomId).emit('timerUpdate', gameTime);

                        if (gameTime <= 0) {
                            clearInterval(rooms[roomId].gameTimer);
                            clearInterval(rooms[roomId].gameIntervals);
                            io.to(roomId).emit('gameWon'); // Отправка события победы
                        }

                        if (gameTime == 100) {
                            clearInterval(rooms[roomId].gameIntervals);

                            rooms[roomId].gameIntervals = setInterval(() => {
                                const randomLine = Math.floor(Math.random() * (Object.keys(rooms[roomId].players).length));
                                const randomZom = Math.floor(Math.random() * 3) + 1;
                                noteId += 1;
                                io.to(roomId).emit('noteGenerated', { line: randomLine, id: noteId, speed: zombieSpeed, zombie: randomZom });
                            }, 1500);
                        } else if (gameTime == 80) {
                            clearInterval(rooms[roomId].gameIntervals);

                            rooms[roomId].gameIntervals = setInterval(() => {
                                const randomLine = Math.floor(Math.random() * (Object.keys(rooms[roomId].players).length));
                                const randomZom = Math.floor(Math.random() * 3) + 1;
                                noteId += 1;
                                io.to(roomId).emit('noteGenerated', { line: randomLine, id: noteId, speed: zombieSpeed, zombie: randomZom });
                            }, 1000);
                        } else if (gameTime == 60) {
                            clearInterval(rooms[roomId].gameIntervals);

                            rooms[roomId].gameIntervals = setInterval(() => {
                                const randomLine = Math.floor(Math.random() * (Object.keys(rooms[roomId].players).length));
                                const randomZom = Math.floor(Math.random() * 3) + 1;
                                noteId += 1;
                                io.to(roomId).emit('noteGenerated', { line: randomLine, id: noteId, speed: zombieSpeed, zombie: randomZom });
                            }, 500);
                        } else if (gameTime == 30) {
                            clearInterval(rooms[roomId].gameIntervals);

                            rooms[roomId].gameIntervals = setInterval(() => {
                                const randomLine = Math.floor(Math.random() * (Object.keys(rooms[roomId].players).length));
                                const randomZom = Math.floor(Math.random() * 3) + 1;
                                noteId += 1;
                                io.to(roomId).emit('noteGenerated', { line: randomLine, id: noteId, speed: zombieSpeed, zombie: randomZom });
                            }, 250);
                        }
                    }, 1000); // Таймер уменьшается каждую секунду
                }
            });


            socket.on('noteMiss', () => {
                if (rooms[roomId]) {
                    rooms[roomId].health--;

                    if (rooms[roomId].health <= 0) {
                        clearInterval(rooms[roomId].gameTimer);
                        clearInterval(rooms[roomId].gameIntervals);
                        io.to(roomId).emit('gameOver');
                    } else {
                        io.to(roomId).emit('noteMissed', { health: rooms[roomId].health });
                    }
                }
            });

            socket.on('noteHit', (noteId) => {
                if (rooms[roomId]) {
                    // Отправляем сообщение всем игрокам, что нота была уничтожена.
                    io.to(roomId).emit('noteRemoved', noteId);
                }
            });

            socket.on('playerReconnect', (newSettings) => {
                if (rooms[roomId].players[socket.id]) {
                    // io.to(`${roomId}`).emit('playerDisconnected', socket.id);

                    rooms[roomId].players[socket.id] = { id: socket.id, character: newSettings.avatar, name: newSettings.name, room: roomCode };
                    io.to(`${roomId}`).emit('playerReconected', rooms[roomId].players[socket.id]);
                }
            })
        } catch (err) {
            console.error('Error joining room:', err);
            socket.emit('error', 'An error occurred');
        }
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


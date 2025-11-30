import express, { Express } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setRoomState, getRoomState, setGameState, getGameState, deleteRoomData } from './redisClient';

const app: Express = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// --- Type Definitions ---
type DrawData = {
  x: number;
  y: number;
  isDrawing: boolean;
  color: string;
  size: number;
};

type Player = {
  id: string;
  name: string;
  score: number;
};

// --- Game Constants ---
const words = ["banana", "computer", "skribbl", "react", "nodejs", "typescript", "socket", "apple", "guitar", "house", "jungle", "pizza", "elephant", "airplane", "coffee", "mountain", "beach"];

// --- Helpers ---
const getWordBlanks = (word: string) => word.replace(/./g, '_ ');
const getThreeRandomWords = () => [...words].sort(() => 0.5 - Math.random()).slice(0, 3);

// Track real-time countdown in memory for accurate scoring
const roomTimeLeft: { [room: string]: number } = {};
const activeTimers: { [room: string]: NodeJS.Timeout } = {};

function stopTimer(room: string) {
  if (activeTimers[room]) {
    clearInterval(activeTimers[room]);
    delete activeTimers[room];
  }
  delete roomTimeLeft[room];
}

// --- Async Game Logic ---

async function startNextTurn(room: string) {
  stopTimer(room);
  
  let gameState = await getGameState(room);
  let roomData = await getRoomState(room);
  
  if (!gameState || !roomData) return;

  gameState.turnOrder = gameState.turnOrder.filter((id: string) => roomData[id]);

  if (gameState.turnOrder.length === 0) {
    await deleteRoomData(room);
    return;
  }

  gameState.currentTurnIndex++;
  if (gameState.currentTurnIndex >= gameState.turnOrder.length) {
    gameState.currentTurnIndex = 0;
    gameState.currentRound++;

    if (gameState.currentRound > gameState.totalRounds) {
      gameState.status = 'ended';
      await setGameState(room, gameState);
      io.to(room).emit('receive_message', { user: "System", message: "Game Over!" });
      io.to(room).emit('gameOver');
      return;
    }
    io.to(room).emit('receive_message', { user: "System", message: `Starting Round ${gameState.currentRound} of ${gameState.totalRounds}` });
  }

  const newDrawerSocketId = gameState.turnOrder[gameState.currentTurnIndex];
  const newDrawerName = roomData[newDrawerSocketId]?.name;

  if (!newDrawerName) {
      await setGameState(room, gameState); 
      return startNextTurn(room);
  }
  
  gameState.currentWord = "";
  gameState.playersWhoGuessed = [];
  
  await setGameState(room, gameState);

  io.to(room).emit('clearCanvas'); 
  io.to(room).emit('receive_message', { user: "System", message: `It's ${newDrawerName}'s turn to draw.` });
  
  startWordChoice(room, newDrawerSocketId);
}

async function startDrawingPhase(room: string, word: string) {
  stopTimer(room);
  let gameState = await getGameState(room);
  let roomData = await getRoomState(room);
  if (!gameState) return;

  gameState.currentWord = word;
  gameState.timer = 60;
  await setGameState(room, gameState);

  const drawerId = gameState.turnOrder[gameState.currentTurnIndex];
  const drawerName = roomData[drawerId]?.name || "Unknown";

  io.to(room).emit('clearCanvas');
  io.to(drawerId).emit('drawingPhaseStarted', word);
  io.to(room).emit('turnUpdate', { 
    drawerName: drawerName, 
    drawerID: drawerId,
    wordBlanks: getWordBlanks(word),
    round: gameState.currentRound,
    totalRounds: gameState.totalRounds
  });

  // Initialize local timer for scoring
  roomTimeLeft[room] = 60;

  activeTimers[room] = setInterval(async () => {
    if (roomTimeLeft[room] !== undefined) {
      roomTimeLeft[room]--;
    }
    
    const timeLeft = roomTimeLeft[room];
    io.to(room).emit('timerUpdate', timeLeft);

    if (timeLeft <= 0) {
      let currentGS = await getGameState(room);
      if (currentGS) {
          io.to(room).emit('receive_message', { user: "System", message: `Time's up! The word was: ${currentGS.currentWord}` });
          await setGameState(room, currentGS);
          startNextTurn(room);
      } else {
          stopTimer(room);
      }
    }
  }, 1000);
}

async function startWordChoice(room: string, drawerSocketId: string) {
  stopTimer(room);
  let gameState = await getGameState(room);
  if (!gameState) return;

  gameState.timer = 15;
  await setGameState(room, gameState);

  const wordsToChoose = getThreeRandomWords();

  io.to(drawerSocketId).emit('chooseWord', wordsToChoose);
  io.to(room).emit('timerUpdate', gameState.timer);

  roomTimeLeft[room] = 15;

  activeTimers[room] = setInterval(async () => {
    if (roomTimeLeft[room] !== undefined) {
      roomTimeLeft[room]--;
    }
    const timeLeft = roomTimeLeft[room];
    io.to(room).emit('timerUpdate', timeLeft);

    if (timeLeft <= 0) {
      let currentGS = await getGameState(room);
      if (currentGS) {
        io.to(drawerSocketId).emit('receive_message', { user: "System", message: "Time's up! We picked a word for you." });
        startDrawingPhase(room, wordsToChoose[0]);
      } else {
        stopTimer(room);
      }
    }
  }, 1000);
}

// --- Socket Event Handling ---
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('join_game', async (data: { name: string, room: string }) => {
    const { name, room } = data;
    socket.join(room);
    
    let roomData = await getRoomState(room) || {};
    roomData[socket.id] = { id: socket.id, name: name, score: 0 };
    await setRoomState(room, roomData);

    const isHost = Object.keys(roomData)[0] === socket.id;
    socket.emit('amIHost', isHost);

    const playerList = Object.values(roomData);
    io.to(room).emit('updatePlayerList', playerList);
    io.to(room).emit('receive_message', { user: "System", message: `${name} has joined!` });
  });

  socket.on('startGame', async () => {
    const room = Array.from(socket.rooms).find(r => r !== socket.id);
    if (!room) return;

    let roomData = await getRoomState(room);
    if (!roomData || Object.keys(roomData)[0] !== socket.id) return; 

    const turnOrder = Object.keys(roomData);
    for (let i = turnOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
    }
    
    const newGameState = {
      status: 'playing',
      turnOrder: turnOrder,
      currentTurnIndex: -1,
      currentWord: "",
      playersWhoGuessed: [],
      timer: 0,
      timerId: null, 
      currentRound: 1,
      totalRounds: 3
    };

    await setGameState(room, newGameState);

    io.to(room).emit('receive_message', { user: "System", message: `The game is starting! Round 1 of 3` });
    startNextTurn(room);
  });

  socket.on('wordChosen', async (word: string) => {
    const room = Array.from(socket.rooms).find(r => r !== socket.id);
    if (!room) return;
    startDrawingPhase(room, word);
  });

  socket.on('send_message', async (data: { message: string }) => {
    const room = Array.from(socket.rooms).find(r => r !== socket.id);
    if (!room) return;

    let roomData = await getRoomState(room);
    let gameState = await getGameState(room);
    
    if (!roomData) return;
    const player = roomData[socket.id];
    const name = player ? player.name : "Anonymous";

    if (gameState && gameState.status === 'playing' &&
        gameState.turnOrder[gameState.currentTurnIndex] !== socket.id && 
        !gameState.playersWhoGuessed.includes(socket.id) && 
        data.message.toLowerCase() === gameState.currentWord.toLowerCase()) 
    {
      // SCORING FIX: Use the in-memory timer for accurate points
      const maxPoints = 500;
      const currentTime = roomTimeLeft[room] || 0; 
      const maxTime = 60; 
      const points = Math.max(100, Math.ceil((currentTime / maxTime) * maxPoints));

      roomData[socket.id].score += points;

      const drawerId = gameState.turnOrder[gameState.currentTurnIndex];
      if (roomData[drawerId]) {
          roomData[drawerId].score += 50;
      }
      
      await setRoomState(room, roomData);

      gameState.playersWhoGuessed.push(socket.id);
      await setGameState(room, gameState); 

      io.to(room).emit('receive_message', {
         user: "System",
         message: `${name} guessed the word! (+${points})`,
          className : 'correct-guess'
         });
      
      const playerList = Object.values(roomData).sort((a: any, b: any) => b.score - a.score);
      io.to(room).emit('updatePlayerList', playerList);

      const totalPlayers = gameState.turnOrder.length;
      if (gameState.playersWhoGuessed.length >= Math.max(1, totalPlayers - 1)) {
        io.to(room).emit('receive_message', { user: "System", message: `Everyone guessed! Moving to next turn.` });
        startNextTurn(room);
      }
    } else {
      io.to(room).emit('receive_message' , { user: name, message: data.message });
    }
  });

  socket.on('draw', (data: DrawData) => {
    const room = Array.from(socket.rooms).find(r => r !== socket.id);
    if (room) {
      socket.broadcast.to(room).emit('drawing', data);
    }
  });
  
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});




const PORT = parseInt(process.env.PORT || "3001");
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server is running on port ${PORT}`);
});
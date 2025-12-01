import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css'; 

// Ensure this matches your backend URL
const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:3001");

const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#808080", "#800000", "#008080"];

type DrawData = {
  x: number;
  y: number;
  isDrawing: boolean;
  color: string;
  size: number;
};

type ChatMessage = {
  user: string;
  message: string;
  className?: string;
};

type Player = {
  id: string;
  name: string;
  score: number;
};

const generateRoomID = () => {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
};

function App() {
  // Removed unused isConnected state
  
  const [userName, setUserName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomToDisplay, setRoomToDisplay] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [wordToDisplay, setWordToDisplay] = useState("");
  const [wordsToChoose, setWordsToChoose] = useState<string[]>([]);
  const [timer, setTimer] = useState(0);
  const [roundInfo, setRoundInfo] = useState("");
  const [gameOver, setGameOver] = useState(false);
  
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);

  const getContext = (): CanvasRenderingContext2D | null => {
    if (!canvasRef.current) return null;
    return canvasRef.current.getContext('2d');
  };

  useEffect(() => {
    socket.on('connect', () => {
      console.log("Connected to server with ID:", socket.id);
    });
    
    socket.on('disconnect', () => {
      console.log("Disconnected from server");
    });
    
    socket.on('receive_message', (data: ChatMessage) => {
      setChat((prevChat) => [...prevChat, data]);
    });

    socket.on('drawing', (data: DrawData) => {
      const ctx = getContext();
      if (!ctx) return;
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (data.isDrawing) {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
      }
    });

    socket.on('amIHost', (amHost: boolean) => setIsHost(amHost));
    
    socket.on('updatePlayerList', (playerList: Player[]) => {
      const sorted = playerList.sort((a, b) => b.score - a.score);
      setPlayers(sorted);
    });
    
    socket.on('chooseWord', (words: string[]) => {
      setWordsToChoose(words);
      setWordToDisplay("Choose a word!");
      setIsMyTurn(true); 
    });

    socket.on('drawingPhaseStarted', (word: string) => {
      setWordsToChoose([]); 
      setIsMyTurn(true);
      setWordToDisplay(word);
    });

    socket.on('turnUpdate', (data: { drawerName: string, drawerID: string, wordBlanks: string, round:number, totalRounds: number }) => {
      setGameStarted(true);
      setWordsToChoose([]); 
      
      if(data.round && data.totalRounds){
        setRoundInfo(`Round ${data.round} of ${data.totalRounds}`);
      }
      
      if (socket.id === data.drawerID) {
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
        setWordToDisplay(data.wordBlanks);
      }
      setChat((prev) => [...prev, {user: "System", message: `It's ${data.drawerName}'s turn to draw.`}]);
    });

    socket.on('timerUpdate', (time: number) => {
      setTimer(time);
    });

    socket.on('clearCanvas', () => {
      const ctx = getContext();
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    });

    socket.on('gameOver', () => {
      setGameOver(true);
      setGameStarted(false);
      setIsMyTurn(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message');
      socket.off('drawing');
      socket.off('amIHost');
      socket.off('updatePlayerList');
      socket.off('chooseWord');
      socket.off('turnUpdate');
      socket.off('timerUpdate');
      socket.off('drawingPhaseStarted');
      socket.off('clearCanvas');
      socket.off('gameOver');
    };
  }, []);

  const handleJoin = (roomToJoin: string) => {
    if (userName.trim() === "") return alert("Please enter a name.");
    setHasJoined(true);
    setRoomToDisplay(roomToJoin);
    socket.emit('join_game', { name: userName, room: roomToJoin });
  };
  const handleCreateRoom = () => handleJoin(generateRoomID());
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() === "") return alert("Please enter a Room ID.");
    handleJoin(roomName);
  };
  const handleStartGame = () => {
    setGameOver(false);
    socket.emit('startGame');
  }

  const handleWordClick = (word: string) => {
    socket.emit('wordChosen', word);
    setWordsToChoose([]);
    setWordToDisplay(word);
    setGameStarted(true);
  };

  // --- FIXED SEND MESSAGE FUNCTION ---
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sending message:", message); // Debug log
    if (message.trim() !== "") {
      socket.emit('send_message', { message: message });
      setMessage("");
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = getContext();
    if (!ctx) return;
    setIsDrawing(true);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    socket.emit('draw', { x: offsetX, y: offsetY, isDrawing: false, color, size: brushSize });
  };
  const stopDrawing = () => setIsDrawing(false);
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || !isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = getContext();
    if (!ctx) return;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    socket.emit('draw', { x: offsetX, y: offsetY, isDrawing: true, color, size: brushSize });
  };
  const setEraser = () => setColor('#FFFFFF');

  if (!hasJoined) {
    return (
      <div className="login-container">
        <h1 style={{fontFamily: 'Nunito, sans-serif', fontSize: 50}}> skribbl.io clone </h1>
        
        <div>
          <input type="text" placeholder="Enter your username" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ padding: '10px', fontSize: 16, width: "300px"  }} />
        </div>
        <div style = {{ justifyContent: 'center', marginLeft:8, width:400}}>
        <button onClick={handleCreateRoom} >Create Room</button>
        </div>
        
        <div style={{ margin: "1px 0", color:'black', marginBottom:20, marginRight: 40, fontSize:20}}>OR</div>
        <form onSubmit={handleJoinRoom}>
          <input type="text" placeholder="Enter Room ID" value={roomName} onChange={(e) => setRoomName(e.target.value)} style={{ padding: '10px', fontSize: 16, width: "300px" }} />
          <div style = {{ justifyContent: 'center'}}>
          <button type="submit" >Join Room</button>
           </div>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="player-list-container">
        <h3 style={{color: 'black', fontFamily: 'unset'}}>Players in Room:</h3>
        <h3 style={{color: 'black', fontFamily: 'unset'}}> {roomToDisplay}</h3>
        {/* Added roundInfo display */}
        {roundInfo && <div style={{textAlign:'center', marginBottom: '10px', fontWeight: 'bold', color: '#555'}}>{roundInfo}</div>}
        <ul>
          {players.map((player, index) => (
<li key={player.id}>
  <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px' }}>
    <span style={{ flexBasis: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {index + 1}. {player.name} {isHost && index === 0 && "(Host)"}
    </span>

    <strong style={{ flexBasis: '30%', textAlign: 'right' }}>
      {player.score}
    </strong>
  </div>
</li>
          ))}
        </ul>
        {isHost && !gameStarted &&  !gameOver && (
          <button onClick={handleStartGame} style={{width: '100%', padding: '10px', fontSize: '16px', color:'white', backgroundColor:'brown'}}>Start Game</button>
        )}
      </div>

      <div className="canvas-container">
        <div className="game-header">
           <h2 style={{letterSpacing: '5px', fontSize: '2rem', margin: '0 0 10px 0'}}>
             {wordToDisplay}
           </h2 >
           {gameStarted && <div className="timer">Time: {timer}</div>}
        </div>

        {gameOver && (
          <div className = "word-choice-overlay" style= {{ width: '300px'}}>
            <h2> Game Over!</h2>
            <h3> Final Scores</h3>
            <ul style= {{ listStyle: 'none', padding:0}}>
              {players.map((p, i) => (
                <li key = {p.id} style= {{ fontSize: '1.2rem' ,margin: '10px 0' }}>
                #{i+1} {p.name}: {p.score}</li>
              ))}
            </ul>
            {isHost && (
              <button onClick={handleStartGame}>Play Again</button>
            )}
            </div>
        )}

        {wordsToChoose.length > 0 && !gameOver && (
          <div className="word-choice-overlay">
            <div className="timer"> Time: {timer}</div>
            <h3>Choose a word:</h3>
            {wordsToChoose.map((word) => (
              <button key={word} onClick={() => handleWordClick(word)}>{word}</button>
            ))}
          </div>
        )}
        
        <div className="toolbar" style={{ visibility: (wordsToChoose.length > 0 || gameOver) ? 'hidden' : 'visible' }}>
          <div className="palette">
            {colors.map(col => (
              <button key={col} className="color-swatch" style={{ backgroundColor: col, opacity: isMyTurn ? 1 : 0.5 }} onClick={() => setColor(col)} disabled={!isMyTurn} />
            ))}
            <button className="tool-button" style={{ fontSize: "13px", opacity: isMyTurn ? 1 : 0.5 }} onClick={setEraser} disabled={!isMyTurn}>Eraser</button>
          </div>
          <div className="brush-size">
            <label> Brush Size:</label>
            <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} disabled={!isMyTurn} style={{ opacity: isMyTurn ? 1 : 0.5 }} />
            <span>{brushSize}px</span>
          </div>
        </div>

        <canvas
          ref={canvasRef} width={800} height={600}
          onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onMouseMove={draw}
          style={{ cursor: isMyTurn ? 'crosshair' : 'not-allowed' }}
        />
      </div>

      <div className="chat-container">
        <div className="game-chat">
          {chat.map((msg, index) => (
            <div key={index} className={msg.className}><strong>{msg.user}: </strong>{msg.message}</div>
          ))}
        </div>
        
        {/* --- FIXED FORM: REMOVED DISABLED ATTRIBUTE --- */}
        <form onSubmit={sendMessage}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your guess..."
            // disabled={isMyTurn} <--- I REMOVED THIS
          />
          <button type="submit" /* disabled={isMyTurn} */>Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;
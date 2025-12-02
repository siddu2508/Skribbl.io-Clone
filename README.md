# Skribbl.io-Clone 🎨

 A realtime multiplayer drawing & guessing web-app built with **MERN + Socket.io** .

---

## Demo
 App Link :(https://skribbl-clone.vercel.app/)

## Screenshots
<img width="1309" height="908" alt="image" src="https://github.com/user-attachments/assets/4c45f572-3fd9-4bb0-be00-e01966a21e53" />
<img width="1788" height="932" alt="image" src="https://github.com/user-attachments/assets/501d51e3-aa36-46bc-8b46-053a3508473a" />



---

## About?

Skribbl.io-Clone lets multiple players join a room, draw randomly assigned words in turns, and guess what others are drawing — all in real time.  
It’s inspired by the original Skribbl.io game, re-implemented using modern web technologies to learn/experiment with real-time collaboration, websockets, and canvas drawing.

---

## Tech Stack & Tools

- **Frontend:**  React + Vite 
- **Backend:** Node.js + Express  
- **Realtime:** Socket.io  
- **Database / Cache:** Redis
- **Containerization:** Docker
- **Styling:** CSS
- **Version Control**: Git + GitHub
- **State / Client Logic:** React hooks 
---

## Project Structure


## Setup & Running Locally

1. Clone the repository  
   ```bash
   git clone https://github.com/yourusername/Skribbl.io-Clone.git
   cd Skribbl.io-Clone


2. Install dependencies
    cd client
    npm install

   Backend
   cd ../server
   npm install

3. Run Backend Server
   cd server
   npm start       # or `node index.js`, whichever your entry point is
   
4. Run frontend

   cd ../client
   npm run dev     # or `npm start` depending on your setup

5. Open your browser at

   http://localhost:3000  # or the port configured by React/Vite

  ## How to Play / Usage

- One player creates a room (host), others join using the room code.

- Once enough players join, host starts the game (if you implemented a “start” flow).

  Each turn:

- The drawer gets a random word to draw.

- Other players view the canvas and guess by typing in chat.

Correct guesses and the drawer earn points.

Game continues in rounds until players leave or finish predetermined rounds.


## License

- This project is released under the MIT License — see the LICENSE file for full text.


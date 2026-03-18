import { Server } from "socket.io";
import { createServer } from "http";
import fs from "fs";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

const rooms = new Map();
let leaderboards = {
    marathon: [],
    sprint: [],
    ultra: []
};

const LEADERBOARD_FILE = "leaderboards.json";

try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
        const data = fs.readFileSync(LEADERBOARD_FILE, "utf-8");
        leaderboards = JSON.parse(data);
        console.log("Loaded leaderboards from disk.");
    }
} catch (e) {
    console.error("Failed to load leaderboards:", e);
}

function saveLeaderboards() {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboards, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to save leaderboards:", e);
    }
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("getLeaderboard", (mode) => {
    socket.emit("leaderboard", { mode, scores: leaderboards[mode] || [] });
  });

  socket.on("reportScore", (data) => {
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse reportScore data", e);
            return;
        }
    }
    const { mode, name, score, lines, time } = data;
    if (!leaderboards[mode]) leaderboards[mode] = [];
    leaderboards[mode].push({ name, score, lines, time, date: Date.now() });
    leaderboards[mode].sort((a, b) => b.score - a.score);
    leaderboards[mode] = leaderboards[mode].slice(0, 10); // Keep top 10
    saveLeaderboards();
    io.emit("leaderboardUpdate", { mode, scores: leaderboards[mode] });
  });

  socket.on("listRooms", () => {
    const roomList = Array.from(rooms.values())
        .filter(r => !r.isPrivate)
        .map(r => ({
            id: r.id,
            name: r.name,
            players: r.players.length,
            maxPlayers: r.maxPlayers,
            hasPassword: r.password !== ""
        }));
    socket.emit("roomList", roomList);
  });

  socket.on("createRoom", (options) => {
    let roomName = "New Room";
    let isPrivate = false;
    let password = "";
    
    if (typeof options === 'string') {
        try {
            const parsed = JSON.parse(options);
            if (typeof parsed === 'object' && parsed !== null) {
                options = parsed;
            }
        } catch (e) {
            // It's just a raw string room name
        }
    }

    if (typeof options === 'object' && options !== null) {
        roomName = options.name || roomName;
        isPrivate = options.isPrivate || false;
        password = options.password || "";
    } else if (typeof options === 'string') {
        roomName = options;
    }

    const roomId = Math.random().toString(36).substring(2, 9);
    const newRoom = {
        id: roomId,
        name: roomName,
        isPrivate: isPrivate,
        password: password,
        gameMode: options.gameMode || "marathon",
        startLevel: options.startLevel || 1,
        players: [socket.id],
        maxPlayers: 2
    };
    rooms.set(roomId, newRoom);
    socket.join(roomId);
    
    const roomInfo = { ...newRoom };
    delete roomInfo.password;
    
    socket.emit("roomCreated", roomInfo);
    console.log("Room created:", roomName, roomId, isPrivate ? "(Private)" : "", `Mode: ${newRoom.gameMode}, Level: ${newRoom.startLevel}`);
  });

  socket.on("joinRoom", (data) => {
    let roomId = data;
    let password = "";
    
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (typeof parsed === 'object' && parsed !== null) {
                data = parsed;
            }
        } catch (e) {
            // It's just a raw string room id
        }
    }

    if (typeof data === 'object' && data !== null) {
        roomId = data.id;
        password = data.password || "";
    }

    const room = rooms.get(roomId);
    if (room && room.players.length < room.maxPlayers) {
        if (room.password && room.password !== password) {
            socket.emit("error", "Incorrect password");
            return;
        }
        
        room.players.push(socket.id);
        socket.join(roomId);
        
        const roomInfo = { ...room };
        delete roomInfo.password;
        
        socket.emit("joinedRoom", roomInfo);
        io.to(roomId).emit("playerJoined", socket.id);
        console.log("Player", socket.id, "joined room", roomId);
        
        if (room.players.length === room.maxPlayers) {
            const seed = Math.floor(Math.random() * 1000000);
            io.to(roomId).emit("gameStart", { 
                seed,
                gameMode: room.gameMode,
                startLevel: room.startLevel
            });
        }
    } else {
        socket.emit("error", "Room full or not found");
    }
  });

  socket.on("garbage", (amount) => {
    const roomIds = Array.from(socket.rooms).filter(id => id !== socket.id);
    if (roomIds.length > 0) {
        socket.to(roomIds[0]).emit("garbage", amount);
    }
  });

  socket.on("frame", (state) => {
    const roomIds = Array.from(socket.rooms).filter(id => id !== socket.id);
    if (roomIds.length > 0) {
        socket.to(roomIds[0]).emit("opponentFrame", state);
    }
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.players = room.players.filter(p => p !== socket.id);
            if (room.players.length === 0) {
                rooms.delete(roomId);
                console.log("Room deleted:", roomId);
            } else {
                socket.to(roomId).emit("playerLeft", socket.id);
            }
        }
    }
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 6065;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

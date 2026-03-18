import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("listRooms", () => {
    const roomList = Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        players: r.players.length,
        maxPlayers: r.maxPlayers
    }));
    socket.emit("roomList", roomList);
  });

  socket.on("createRoom", (roomName) => {
    const roomId = Math.random().toString(36).substring(2, 9);
    const newRoom = {
        id: roomId,
        name: roomName,
        players: [socket.id],
        maxPlayers: 2
    };
    rooms.set(roomId, newRoom);
    socket.join(roomId);
    socket.emit("roomCreated", newRoom);
    console.log("Room created:", roomName, roomId);
  });

  socket.on("joinRoom", (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < room.maxPlayers) {
        room.players.push(socket.id);
        socket.join(roomId);
        socket.emit("joinedRoom", room);
        io.to(roomId).emit("playerJoined", socket.id);
        console.log("Player", socket.id, "joined room", roomId);
        
        if (room.players.length === room.maxPlayers) {
            const seed = Math.floor(Math.random() * 1000000);
            io.to(roomId).emit("gameStart", { seed });
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

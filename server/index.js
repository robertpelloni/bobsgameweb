import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("garbage", (amount) => {
    console.log("Garbage sent:", amount, "from", socket.id);
    // Broadcast to other players
    socket.broadcast.emit("garbage", amount);
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 6065;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

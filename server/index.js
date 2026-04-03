/**
 * bob's game - Multiplayer WebSocket Server
 * 
 * Handles room management, matchmaking, chat, game state sync,
 * leaderboard persistence, and tournament bracket generation.
 * 
 * Uses Socket.io for real-time bidirectional communication.
 * Leaderboards are persisted to a local JSON file (leaderboards.json).
 */

import { Server } from "socket.io";
import { createServer } from "http";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Leaderboard Persistence
// ============================================================

const LEADERBOARD_FILE = path.join(__dirname, "leaderboards.json");

/**
 * Load leaderboard data from disk.
 * Returns an object keyed by game mode (marathon, sprint, ultra),
 * each containing an array of score entries sorted descending.
 */
function loadLeaderboards() {
    try {
        if (fs.existsSync(LEADERBOARD_FILE)) {
            const data = fs.readFileSync(LEADERBOARD_FILE, "utf-8");
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Failed to load leaderboards:", e);
    }
    return { marathon: [], sprint: [], ultra: [] };
}

/**
 * Save leaderboard data to disk (JSON format).
 */
function saveLeaderboards(leaderboards) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboards, null, 2));
    } catch (e) {
        console.error("Failed to save leaderboards:", e);
    }
}

const leaderboards = loadLeaderboards();

// ============================================================
// Map Persistence
// ============================================================

const MAPS_DIR = path.join(__dirname, "maps");
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR);

function getMapPath(mapId) {
    return path.join(MAPS_DIR, `map_${mapId}.json`);
}

// ============================================================
// Server Setup
// ============================================================

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

/** Active rooms keyed by roomId */
const rooms = new Map();

/** Connected players keyed by socket.id */
const players = new Map();

// ============================================================
// Connection Handler
// ============================================================

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // ----------------------------------------------------------
    // Player Identity
    // ----------------------------------------------------------

    socket.on("setName", (name) => {
        const safeName = String(name || "Player").substring(0, 32);
        players.set(socket.id, { id: socket.id, name: safeName });
        console.log(`Player ${socket.id} set name to ${safeName}`);
    });

    // ----------------------------------------------------------
    // Room Listing
    // ----------------------------------------------------------

    socket.on("listRooms", () => {
        const roomList = Array.from(rooms.values())
            .filter(r => !r.isPrivate)
            .map(r => ({
                id: r.id,
                name: r.name,
                players: r.players.length,
                maxPlayers: r.maxPlayers,
                hasPassword: r.password !== "",
                gameMode: r.gameMode,
                startLevel: r.startLevel,
                isTournament: r.isTournament,
                state: r.state
            }));
        socket.emit("roomList", roomList);
    });

    // ----------------------------------------------------------
    // Room Creation
    // ----------------------------------------------------------

    socket.on("createRoom", (options) => {
        let roomName = "New Room";
        let isPrivate = false;
        let password = "";
        let isTournament = false;
        let gameMode = "marathon";
        let startLevel = 1;

        if (typeof options === "object" && options !== null) {
            roomName = String(options.name || roomName).substring(0, 64);
            isPrivate = Boolean(options.isPrivate);
            password = String(options.password || "");
            isTournament = Boolean(options.isTournament);
            gameMode = String(options.gameMode || "marathon");
            startLevel = Math.max(1, Math.min(20, parseInt(options.startLevel) || 1));
        }

        const roomId = Math.random().toString(36).substring(2, 9);
        const newRoom = {
            id: roomId,
            name: roomName,
            isPrivate: isPrivate,
            password: password,
            isTournament: isTournament,
            gameMode: gameMode,
            startLevel: startLevel,
            players: [socket.id],
            maxPlayers: isTournament ? 8 : 2,
            state: "LOBBY",
            createdAt: Date.now()
        };
        rooms.set(roomId, newRoom);
        socket.join(roomId);

        // Send back room info (minus password)
        const roomInfo = { ...newRoom };
        delete roomInfo.password;
        roomInfo.playerNames = newRoom.players.map(pid => players.get(pid)?.name || "Unknown");

        socket.emit("roomCreated", roomInfo);
        console.log("Room created:", roomName, roomId, isPrivate ? "(Private)" : "", isTournament ? "(Tournament)" : "");
    });

    // ----------------------------------------------------------
    // Room Joining
    // ----------------------------------------------------------

  socket.on("joinRoom", (data) => {
      const room = rooms.get(data.id);
      if (!room) {
          socket.emit("error", "Room not found");
          return;
      }
      
      const isSpectator = Boolean(data.spectator);

      if (room.password && room.password !== data.password) {
          socket.emit("error", "Invalid password");
          return;
      }

      if (!isSpectator && room.players.length >= room.maxPlayers) {
          socket.emit("error", "Room full");
          return;
      }

      if (!isSpectator) {
        room.players.push(socket.id);
      } else {
        if (!room.spectators) room.spectators = [];
        room.spectators.push(socket.id);
      }

      socket.join(room.id);
      
      const roomInfo = { ...room };
      delete roomInfo.password;
      roomInfo.playerNames = room.players.map(pid => players.get(pid)?.name || "Unknown");
      socket.emit("joinedRoom", roomInfo);
      
      // Notify others in room
      const playerName = players.get(socket.id)?.name || "Unknown";
      io.to(room.id).emit("chatMessage", { 
          message: `${playerName} joined the room${isSpectator ? " as spectator" : ""}`, 
          name: "System", 
          timestamp: Date.now() 
      });

      io.to(room.id).emit("roomUpdated", {
          playerNames: room.players.map(pid => players.get(pid)?.name || "Unknown"),
          spectatorCount: (room.spectators || []).length
      });

      // If room is now full and not a tournament, start the game
      if (!room.isTournament && room.players.length === room.maxPlayers && room.state !== "PLAYING") {
          const seed = Math.floor(Math.random() * 1000000);
          io.to(room.id).emit("gameStart", { 
              seed, 
              gameMode: room.gameMode, 
              startLevel: room.startLevel 
          });
          room.state = "PLAYING";
      }
  });

    // ----------------------------------------------------------
    // Chat Messages
    // ----------------------------------------------------------

    socket.on("chatMessage", (data) => {
        const room = Array.from(socket.rooms).find(r => rooms.has(r));
        if (room) {
            io.to(room).emit("chatMessage", {
                message: String(data.message || "").substring(0, 500),
                name: String(data.name || "Unknown").substring(0, 32),
                timestamp: Date.now()
            });
        }
    });

    // ----------------------------------------------------------
    // Game State Sync (frame-by-frame state for opponents)
    // ----------------------------------------------------------

    socket.on("frame", (state) => {
        const room = Array.from(socket.rooms).find(r => rooms.has(r));
        if (room) {
            socket.to(room).emit("opponentFrame", state);
        }
    });

    // ----------------------------------------------------------
    // Garbage Routing (multiplayer VS mode)
    // ----------------------------------------------------------

    socket.on("garbage", (amount) => {
        const room = Array.from(socket.rooms).find(r => rooms.has(r));
        if (room) {
            socket.to(room).emit("garbage", amount);
        }
    });

    // ----------------------------------------------------------
    // Collaborative Map Editing
    // ----------------------------------------------------------

    socket.on("editorAction", (action) => {
        const room = Array.from(socket.rooms).find(r => rooms.has(r));
        if (room) {
            // Broadcast the edit to everyone else in the room
            socket.to(room).emit("editorAction", action);
        }
    });

    // ----------------------------------------------------------
    // Map Saving/Loading
    // ----------------------------------------------------------

    socket.on("saveMap", (data) => {
        const { mapId, mapData } = data;
        try {
            fs.writeFileSync(getMapPath(mapId), JSON.stringify(mapData));
            console.log(`Map ${mapId} saved to disk.`);
            socket.emit("mapSaved", { success: true, mapId });
        } catch (e) {
            console.error("Failed to save map:", e);
            socket.emit("mapSaved", { success: false, error: e.message });
        }
    });

    socket.on("loadMap", (mapId) => {
        try {
            const path = getMapPath(mapId);
            if (fs.existsSync(path)) {
                const data = JSON.parse(fs.readFileSync(path, "utf-8"));
                socket.emit("mapLoaded", { success: true, mapData: data });
            } else {
                socket.emit("mapLoaded", { success: false, error: "Map not found" });
            }
        } catch (e) {
            console.error("Failed to load map:", e);
            socket.emit("mapLoaded", { success: false, error: e.message });
        }
    });

    socket.on("listMaps", () => {
        try {
            const files = fs.readdirSync(MAPS_DIR);
            const maps = files.map(f => f.replace("map_", "").replace(".json", ""));
            socket.emit("mapList", maps);
        } catch (e) {
            socket.emit("mapList", []);
        }
    });

    // ----------------------------------------------------------
    // MMORPG World Sync
    // ----------------------------------------------------------

    socket.on("playerMove", (pos) => {
        // Broadcast player position to everyone in the world
        socket.broadcast.emit("remotePlayerMove", {
            id: socket.id,
            name: players.get(socket.id)?.name || "Unknown",
            x: pos.x,
            y: pos.y
        });
    });

    // ----------------------------------------------------------
    // Score Reporting & Leaderboards
    // ----------------------------------------------------------

    socket.on("reportScore", (data) => {
        if (!data || !data.mode || typeof data.score !== "number") return;

        const mode = String(data.mode);
        if (!leaderboards[mode]) {
            leaderboards[mode] = [];
        }

        const entry = {
            name: String(data.name || "Unknown").substring(0, 32),
            score: Math.max(0, Math.floor(data.score)),
            lines: Math.max(0, Math.floor(data.lines || 0)),
            time: Math.max(0, data.time || 0),
            date: Date.now()
        };

        leaderboards[mode].push(entry);
        // Sort descending by score and keep top 100
        leaderboards[mode].sort((a, b) => b.score - a.score);
        leaderboards[mode] = leaderboards[mode].slice(0, 100);

        saveLeaderboards(leaderboards);
        console.log(`Score reported: ${entry.name} - ${entry.score} pts (${mode})`);
    });

    socket.on("getLeaderboard", (mode) => {
        const modeStr = String(mode || "marathon");
        const scores = (leaderboards[modeStr] || []).slice(0, 20);
        socket.emit("leaderboard", { mode: modeStr, scores });
    });

    // ----------------------------------------------------------
    // Tournament Bracket
    // ----------------------------------------------------------

    socket.on("getTournamentBracket", (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.isTournament) {
            // Generate bracket dynamically based on current players
            const playerNames = room.players.map((pid, i) =>
                players.get(pid)?.name || `Player ${i + 1}`
            );

            const matches = [];
            const numPlayers = playerNames.length;
            const numFirstRoundMatches = Math.ceil(numPlayers / 2);

            // Round 1: pair up players
            for (let i = 0; i < numFirstRoundMatches; i++) {
                const p1 = playerNames[i * 2] || "Waiting...";
                const p2 = playerNames[i * 2 + 1] || "Waiting...";
                matches.push({
                    id: `m${i + 1}`,
                    p1, p2,
                    winner: "",
                    nextMatchId: `m${numFirstRoundMatches + Math.floor(i / 2) + 1}`,
                    isFinal: numFirstRoundMatches === 1,
                    round: 1
                });
            }

            // Finals (round 2) if more than 2 players
            if (numFirstRoundMatches > 1) {
                const numFinals = Math.ceil(numFirstRoundMatches / 2);
                for (let i = 0; i < numFinals; i++) {
                    matches.push({
                        id: `m${numFirstRoundMatches + i + 1}`,
                        p1: "", p2: "",
                        winner: "",
                        nextMatchId: numFinals > 1 ? `m${numFirstRoundMatches + numFinals + 1}` : "",
                        isFinal: numFinals === 1,
                        round: 2
                    });
                }
            }

            socket.emit("tournamentBracket", { roomId, matches });
        }
    });

    // ----------------------------------------------------------
    // Disconnect / Cleanup
    // ----------------------------------------------------------

    socket.on("disconnecting", () => {
        for (const room of socket.rooms) {
            if (rooms.has(room)) {
                const r = rooms.get(room);
                r.players = r.players.filter(p => p !== socket.id);
                if (r.players.length === 0) {
                    rooms.delete(room);
                    console.log("Room deleted:", room);
                } else {
                    const playerName = players.get(socket.id)?.name || "Unknown";
                    io.to(room).emit("chatMessage", {
                        message: `${playerName} left the room`,
                        name: "System",
                        timestamp: Date.now()
                    });
                    io.to(room).emit("roomUpdated", {
                        playerNames: r.players.map(pid => players.get(pid)?.name || "Unknown")
                    });
                }
            }
        }
    });

    socket.on("disconnect", () => {
        players.delete(socket.id);
        console.log("Player disconnected:", socket.id);
    });
});

// ============================================================
// Start Server
// ============================================================

const PORT = process.env.PORT || 6065;
httpServer.listen(PORT, () => {
    console.log(`bob's game Socket.io server running on port ${PORT}`);
    console.log(`Leaderboard entries: marathon=${(leaderboards.marathon || []).length}, sprint=${(leaderboards.sprint || []).length}, ultra=${(leaderboards.ultra || []).length}`);
});

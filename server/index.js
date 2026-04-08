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

const SERVER_VERSION = "2.1.59";
const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "6065", 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

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
// Elo Rating System
// ============================================================

const DEFAULT_ELO = 1000;
const K_FACTOR = 32;

function calculateNewRatings(winnerElo, loserElo) {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
    
    const newWinnerElo = winnerElo + K_FACTOR * (1 - expectedWinner);
    const newLoserElo = loserElo + K_FACTOR * (0 - expectedLoser);
    
    return {
        winnerElo: Math.round(newWinnerElo),
        loserElo: Math.round(newLoserElo)
    };
}

// ============================================================
// Map Persistence
// ============================================================

const MAPS_DIR = path.join(__dirname, "maps");
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR);

const DB_FILE = path.join(__dirname, "rpg_database.json");
const CHARS_DIR = path.join(__dirname, "characters");
if (!fs.existsSync(CHARS_DIR)) fs.mkdirSync(CHARS_DIR);

const ACHIEVEMENTS_DIR = path.join(__dirname, "achievement_profiles");
if (!fs.existsSync(ACHIEVEMENTS_DIR)) fs.mkdirSync(ACHIEVEMENTS_DIR);

const EmuStates_DIR = path.join(__dirname, "emulator_states");
if (!fs.existsSync(EmuStates_DIR)) fs.mkdirSync(EmuStates_DIR);

function getMapPath(mapId) {
    return path.join(MAPS_DIR, `map_${mapId}.json`);
}

// ============================================================
// Server Setup
// ============================================================

const httpServer = createServer((req, res) => {
    const url = req.url || "/";

    if (url === "/" || url.startsWith("/?")) {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("bob's game backend is running\n");
        return;
    }

    if (url === "/healthz" || url.startsWith("/healthz?")) {
        const payload = {
            ok: true,
            service: "bobsgameweb-socket-server",
            version: SERVER_VERSION,
            time: Date.now(),
        };
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(payload));
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "Not Found", path: url }));
});

const io = new Server(httpServer, {
    cors: {
        origin: ALLOWED_ORIGIN,
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
        players.set(socket.id, { 
            id: socket.id, 
            name: safeName,
            elo: DEFAULT_ELO 
        });
        console.log(`Player ${socket.id} set name to ${safeName} (Elo: ${DEFAULT_ELO})`);
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
        roomInfo.playerData = newRoom.players.reduce((acc, pid) => {
            const p = players.get(pid);
            acc[pid] = { name: p?.name || "Unknown", elo: p?.elo || 1000 };
            return acc;
        }, {});

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
      roomInfo.playerData = room.players.reduce((acc, pid) => {
          const p = players.get(pid);
          acc[pid] = { name: p?.name || "Unknown", elo: p?.elo || 1000 };
          return acc;
      }, {});

      socket.emit("joinedRoom", roomInfo);
      
      // Notify others in room
      const playerName = players.get(socket.id)?.name || "Unknown";
      io.to(room.id).emit("chatMessage", { 
          message: `${playerName} joined the room${isSpectator ? " as spectator" : ""}`, 
          name: "System", 
          timestamp: Date.now() 
      });

      io.to(room.id).emit("roomUpdated", {
          playerData: room.players.reduce((acc, pid) => {
              const p = players.get(pid);
              acc[pid] = { name: p?.name || "Unknown", elo: p?.elo || 1000 };
              return acc;
          }, {}),
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
    // Chat Messages (Multi-Channel)
    // ----------------------------------------------------------

    socket.on("chatMessage", (data) => {
        const { channel, message, to } = data;
        const playerName = players.get(socket.id)?.name || "Unknown";

        if (channel === "global") {
            io.emit("chatMessage", { channel, name: playerName, message, timestamp: Date.now() });
        } else if (channel === "room") {
            const room = Array.from(socket.rooms).find(r => rooms.has(r));
            if (room) {
                io.to(room).emit("chatMessage", { channel, name: playerName, message, timestamp: Date.now() });
            }
        } else if (channel === "private" && to) {
            io.to(to).emit("chatMessage", { channel, name: playerName, message, from: socket.id, timestamp: Date.now() });
        }
    });

    // ----------------------------------------------------------
    // Game State Sync (frame-by-frame state for opponents)
    // ----------------------------------------------------------

    socket.on("frame", (state) => {
        const room = Array.from(socket.rooms).find(r => rooms.has(r));
        if (room) {
            socket.to(room).emit("opponentFrame", { id: socket.id, state });
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
            elo: players.get(socket.id)?.elo || DEFAULT_ELO,
            replay: data.replay || null, // VOD integration
            date: Date.now()
        };

        leaderboards[mode].push(entry);
        // Sort descending by score and keep top 100
        leaderboards[mode].sort((a, b) => b.score - a.score);
        leaderboards[mode] = leaderboards[mode].slice(0, 100);

        saveLeaderboards(leaderboards);
        console.log(`Score reported: ${entry.name} - ${entry.score} pts (${mode}) | Elo: ${entry.elo} | Has Replay: ${!!entry.replay}`);
    });

    socket.on("getLeaderboard", (mode) => {
        const modeStr = String(mode || "marathon");
        const scores = (leaderboards[modeStr] || []).slice(0, 20);
        socket.emit("leaderboard", { mode: modeStr, scores });
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

    socket.on("playerAction", (action) => {
        socket.broadcast.emit("remotePlayerAction", {
            id: socket.id,
            type: action.type, // e.g. 'jump', 'emote', 'interact'
            data: action.data
        });
    });

    // ----------------------------------------------------------
    // AI Asset Generation (MOCK)
    // ----------------------------------------------------------

    socket.on("generateAsset", (data) => {
        const { type, prompt } = data;
        console.log(`[AI] Generating ${type} for prompt: ${prompt}`);
        
        // In a real implementation, we would call OpenAI DALL-E or Stable Diffusion here
        setTimeout(() => {
            const mockAssetId = `ai_${Date.now()}`;
            const mockUrl = `https://placehold.co/32x48/00ff00/ffffff?text=${encodeURIComponent(prompt)}`;
            
            socket.emit("assetGenerated", { 
                success: true, 
                assetId: mockAssetId, 
                url: mockUrl 
            });
        }, 2000);
    });

    // ----------------------------------------------------------
    // RPG Database Persistence
    // ----------------------------------------------------------

    socket.on("saveRPGDatabase", (db) => {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
            console.log("RPG Database saved to disk.");
            socket.emit("rpgDatabaseSaved", { success: true });
        } catch (e) {
            console.error("Failed to save RPG database:", e);
            socket.emit("rpgDatabaseSaved", { success: false, error: e.message });
        }
    });

    socket.on("loadRPGDatabase", () => {
        try {
            if (fs.existsSync(DB_FILE)) {
                const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
                socket.emit("rpgDatabaseLoaded", { success: true, db });
            } else {
                socket.emit("rpgDatabaseLoaded", { success: false, error: "Database not found" });
            }
        } catch (e) {
            console.error("Failed to load RPG database:", e);
            socket.emit("rpgDatabaseLoaded", { success: false, error: e.message });
        }
    });

    // ----------------------------------------------------------
    // Achievement Snapshot Persistence
    // ----------------------------------------------------------

    socket.on("saveAchievementData", (data) => {
        const identity = data?.identity ?? data?.name;
        const profileId = typeof identity === 'object' && identity !== null
            ? String(identity.profileId || '').substring(0, 128).toLowerCase()
            : '';
        const safeName = typeof identity === 'object' && identity !== null
            ? String(identity.name || "webplayer").substring(0, 64).toLowerCase()
            : String(identity || "webplayer").substring(0, 64).toLowerCase();
        const storageKey = profileId || safeName;
        const snapshot = data?.snapshot || { version: "2.1.57", stats: {}, unlockedIds: [] };
        try {
            const file = path.join(ACHIEVEMENTS_DIR, `${storageKey}.json`);
            fs.writeFileSync(file, JSON.stringify({ identity: { profileId, name: safeName }, snapshot }, null, 2));
            socket.emit("achievementDataSaved", { success: true, key: storageKey, profileId, name: safeName });
        } catch (e) {
            console.error("Failed to save achievement data:", e);
            socket.emit("achievementDataSaved", { success: false, error: e.message });
        }
    });

    socket.on("loadAchievementData", (identity) => {
        try {
            const profileId = typeof identity === 'object' && identity !== null
                ? String(identity.profileId || '').substring(0, 128).toLowerCase()
                : '';
            const safeName = typeof identity === 'object' && identity !== null
                ? String(identity.name || "webplayer").substring(0, 64).toLowerCase()
                : String(identity || "webplayer").substring(0, 64).toLowerCase();
            const candidateKeys = [profileId, safeName].filter(Boolean);

            for (const key of candidateKeys) {
                const file = path.join(ACHIEVEMENTS_DIR, `${key}.json`);
                if (fs.existsSync(file)) {
                    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
                    const snapshot = data?.snapshot ?? data;
                    socket.emit("achievementDataLoaded", { success: true, snapshot, identity: data?.identity || { profileId, name: safeName } });
                    return;
                }
            }

            socket.emit("achievementDataLoaded", { success: false, error: "Achievement data not found" });
        } catch (e) {
            console.error("Failed to load achievement data:", e);
            socket.emit("achievementDataLoaded", { success: false, error: e.message });
        }
    });

    // ----------------------------------------------------------
    // Character Persistence
    // ----------------------------------------------------------

    socket.on("saveCharacter", (data) => {
        const identity = data?.identity ?? data?.name;
        const profileId = typeof identity === 'object' && identity !== null
            ? String(identity.profileId || '').substring(0, 128).toLowerCase()
            : '';
        const safeName = typeof identity === 'object' && identity !== null
            ? String(identity.name || "webplayer").substring(0, 64).toLowerCase()
            : String(identity || "webplayer").substring(0, 64).toLowerCase();
        const storageKey = profileId || safeName;
        const charData = data?.charData;
        try {
            const charFile = path.join(CHARS_DIR, `${storageKey}.json`);
            fs.writeFileSync(charFile, JSON.stringify({ identity: { profileId, name: safeName }, charData }, null, 2));
            console.log(`Character ${safeName} saved under ${storageKey}.`);
            socket.emit("characterSaved", { success: true, key: storageKey, profileId, name: safeName });
        } catch (e) {
            console.error("Failed to save character:", e);
            socket.emit("characterSaved", { success: false, error: e.message });
        }
    });

    socket.on("loadCharacter", (identity) => {
        try {
            const profileId = typeof identity === 'object' && identity !== null
                ? String(identity.profileId || '').substring(0, 128).toLowerCase()
                : '';
            const safeName = typeof identity === 'object' && identity !== null
                ? String(identity.name || "webplayer").substring(0, 64).toLowerCase()
                : String(identity || "webplayer").substring(0, 64).toLowerCase();
            const candidateKeys = [profileId, safeName].filter(Boolean);
            for (const key of candidateKeys) {
                const charFile = path.join(CHARS_DIR, `${key}.json`);
                if (fs.existsSync(charFile)) {
                    const data = JSON.parse(fs.readFileSync(charFile, "utf-8"));
                    socket.emit("characterLoaded", { success: true, charData: data?.charData ?? data, identity: data?.identity || { profileId, name: safeName } });
                    return;
                }
            }
            socket.emit("characterLoaded", { success: false, error: "Character not found" });
        } catch (e) {
            console.error("Failed to load character:", e);
            socket.emit("characterLoaded", { success: false, error: e.message });
        }
    });

    // ----------------------------------------------------------
    // Emulator Save State Persistence
    // ----------------------------------------------------------

    socket.on("saveEmulatorState", (data) => {
        const identity = data?.identity ?? data?.name;
        const profileId = typeof identity === 'object' && identity !== null
            ? String(identity.profileId || '').substring(0, 128).toLowerCase()
            : '';
        const safeName = typeof identity === 'object' && identity !== null
            ? String(identity.name || "webplayer").substring(0, 64).toLowerCase()
            : String(identity || "webplayer").substring(0, 64).toLowerCase();
        const storageKey = profileId || safeName;
        const state = data?.state;
        try {
            const stateFile = path.join(EmuStates_DIR, `${storageKey}.json`);
            fs.writeFileSync(stateFile, JSON.stringify({ identity: { profileId, name: safeName }, state }));
            console.log(`Emulator state for ${safeName} saved under ${storageKey}.`);
        } catch (e) {
            console.error("Failed to save emulator state:", e);
        }
    });

    socket.on("loadEmulatorState", (identity) => {
        try {
            const profileId = typeof identity === 'object' && identity !== null
                ? String(identity.profileId || '').substring(0, 128).toLowerCase()
                : '';
            const safeName = typeof identity === 'object' && identity !== null
                ? String(identity.name || "webplayer").substring(0, 64).toLowerCase()
                : String(identity || "webplayer").substring(0, 64).toLowerCase();
            const candidateKeys = [profileId, safeName].filter(Boolean);
            for (const key of candidateKeys) {
                const stateFile = path.join(EmuStates_DIR, `${key}.json`);
                if (fs.existsSync(stateFile)) {
                    const data = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
                    socket.emit("emulatorStateLoaded", { success: true, state: data?.state ?? data, identity: data?.identity || { profileId, name: safeName } });
                    return;
                }
            }
            socket.emit("emulatorStateLoaded", { success: false, error: "State not found" });
        } catch (e) {
            console.error("Failed to load emulator state:", e);
            socket.emit("emulatorStateLoaded", { success: false, error: e.message });
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
    // Asset Management
    // ----------------------------------------------------------

    socket.on("listAssets", (type) => {
        // type can be 'sprites', 'tilesets', 'audio', etc.
        const assetDir = path.join(__dirname, "../data", type || "");
        try {
            if (fs.existsSync(assetDir)) {
                const files = fs.readdirSync(assetDir, { recursive: true })
                    .filter(f => fs.statSync(path.join(assetDir, f)).isFile());
                socket.emit("assetList", { type, files });
            } else {
                socket.emit("assetList", { type, files: [] });
            }
        } catch (e) {
            console.error(`Failed to list assets for ${type}:`, e);
            socket.emit("assetList", { type, files: [] });
        }
    });

    // ----------------------------------------------------------
    // Tournament Orchestration
    // ----------------------------------------------------------

    const tournaments = new Map();

    socket.on("joinTournament", (tournamentId) => {
        if (!tournaments.has(tournamentId)) {
            tournaments.set(tournamentId, {
                id: tournamentId,
                players: [],
                brackets: [],
                state: "WAITING"
            });
        }
        
        const tournament = tournaments.get(tournamentId);
        if (!tournament.players.includes(socket.id)) {
            tournament.players.push(socket.id);
            console.log(`Player ${socket.id} joined tournament ${tournamentId}`);
        }

        // If we have 2 players, start a match
        if (tournament.players.length >= 2 && tournament.state === "WAITING") {
            tournament.state = "RUNNING";
            const p1 = tournament.players[0];
            const p2 = tournament.players[1];
            
            const seed = Math.floor(Math.random() * 1000000);
            io.to(p1).emit("gameStart", { seed, opponent: players.get(p2)?.name || "Opponent", isTournament: true });
            io.to(p2).emit("gameStart", { seed, opponent: players.get(p1)?.name || "Opponent", isTournament: true });
            
            console.log(`Tournament match started: ${p1} vs ${p2}`);
        }
    });

    socket.on("tournamentMatchEnd", (data) => {
        const { tournamentId, winnerId, loserId } = data;
        const winner = players.get(winnerId);
        const loser = players.get(loserId);
        
        if (winner && loser) {
            const newRatings = calculateNewRatings(winner.elo, loser.elo);
            
            console.log(`Match End: Winner ${winner.name} (${winner.elo} -> ${newRatings.winnerElo}) | Loser ${loser.name} (${loser.elo} -> ${newRatings.loserElo})`);
            
            winner.elo = newRatings.winnerElo;
            loser.elo = newRatings.loserElo;
            
            io.to(winnerId).emit("eloUpdate", { elo: winner.elo, gain: newRatings.winnerElo - winner.elo });
            io.to(loserId).emit("eloUpdate", { elo: loser.elo, gain: newRatings.loserElo - loser.elo });
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
                        playerData: r.players.reduce((acc, pid) => {
                            const p = players.get(pid);
                            acc[pid] = { name: p?.name || "Unknown", elo: p?.elo || 1000 };
                            return acc;
                        }, {}),
                        spectatorCount: (r.spectators || []).length
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

httpServer.listen(PORT, HOST, () => {
    console.log(`bob's game Socket.io server running on ${HOST}:${PORT}`);
    console.log(`Allowed origin: ${ALLOWED_ORIGIN}`);
    console.log(`Health endpoint: /healthz | Version: ${SERVER_VERSION}`);
    console.log(`Leaderboard entries: marathon=${(leaderboards.marathon || []).length}, sprint=${(leaderboards.sprint || []).length}, ultra=${(leaderboards.ultra || []).length}`);
});

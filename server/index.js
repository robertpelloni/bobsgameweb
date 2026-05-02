/**
 * bob's game - Multiplayer WebSocket Server
 *
 * Handles room management, matchmaking, chat, game state sync,
 * leaderboard persistence, and tournament bracket generation.
 *
 * Uses Socket.io for real-time bidirectional communication.
 * Leaderboards are persisted to a local JSON file (leaderboards.json).
 */

import fs from "fs";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_VERSION = "3.0.0";
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
// Player Profile Persistence
// ============================================================

const PROFILES_FILE = path.join(__dirname, "profiles.json");

function loadProfiles() {
	try {
		if (fs.existsSync(PROFILES_FILE)) {
			return JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
		}
	} catch (e) {
		console.error("Failed to load profiles:", e);
	}
	return {};
}

function saveProfiles(profiles) {
	try {
		fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
	} catch (e) {
		console.error("Failed to save profiles:", e);
	}
}

const profiles = loadProfiles();

// Auto-save profiles every 60 seconds
setInterval(() => {
	saveProfiles(profiles);
}, 60000);

// ============================================================
// Elo Rating System
// ============================================================

const DEFAULT_ELO = 1000;
const K_FACTOR = 32;

function calculateNewRatings(winnerElo, loserElo) {
	const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
	const expectedLoser = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

	const newWinnerElo = winnerElo + K_FACTOR * (1 - expectedWinner);
	const newLoserElo = loserElo + K_FACTOR * (0 - expectedLoser);

	return {
		winnerElo: Math.round(newWinnerElo),
		loserElo: Math.round(newLoserElo),
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

	// ---- Map API ----
	if (url.startsWith("/maps/")) {
		const mapId = url.split("/")[2]?.split("?")[0];
		const mapPath = getMapPath(mapId);

		if (req.method === "GET") {
			if (!fs.existsSync(mapPath)) {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: false, error: "Map not found" }));
				return;
			}
			try {
				const data = fs.readFileSync(mapPath, "utf-8");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(data);
			} catch (err) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: false, error: "Failed to read map" }));
			}
			return;
		}

		if (req.method === "PUT") {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", () => {
				try {
					const parsed = JSON.parse(body);
					// Validate minimum structure
					if (!parsed.id || !parsed.name || !parsed.tiles) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								ok: false,
								error: "Missing required fields: id, name, tiles",
							}),
						);
						return;
					}
					fs.writeFileSync(mapPath, JSON.stringify(parsed, null, 2));
					console.log(`Map saved: ${mapId} (${parsed.name})`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ ok: true, mapId: mapId }));
				} catch (err) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
				}
			});
			return;
		}

		res.writeHead(405, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
		return;
	}

	// ---- Map manifest ----
	if (url === "/maps" || url.startsWith("/maps?")) {
		if (req.method === "GET") {
			try {
				const files = fs
					.readdirSync(MAPS_DIR)
					.filter((f) => f.endsWith(".json"));
				const manifest = files.map((f) => {
					const id = f.replace("map_", "").replace(".json", "");
					return { id, path: `/maps/${id}` };
				});
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(manifest));
			} catch (err) {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify([]));
			}
			return;
		}
	}

	// ---- Player Profile API ----
	if (url.startsWith("/players/")) {
		const playerId = decodeURIComponent(url.split("/")[2]?.split("?")[0] || "");
		const profilePath = playerId; // key in profiles object

		if (req.method === "GET") {
			const profile = profiles[profilePath];
			if (!profile) {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: false, error: "Profile not found" }));
				return;
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true, profile }));
			return;
		}

		if (req.method === "PUT") {
			let body = "";
			req.on("data", (chunk) => { body += chunk; });
			req.on("end", () => {
				try {
					const parsed = JSON.parse(body);
					const name = String(parsed.name || playerId).substring(0, 64);
					profiles[profilePath] = {
						id: profilePath,
						name,
						elo: parsed.elo ?? DEFAULT_ELO,
						wins: parsed.wins ?? 0,
						losses: parsed.losses ?? 0,
						gamesPlayed: parsed.gamesPlayed ?? 0,
						achievements: parsed.achievements ?? [],
						settings: parsed.settings ?? {},
						lastSeen: Date.now(),
					};
					saveProfiles(profiles);
					console.log(`Profile saved: ${name} (${profilePath})`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ ok: true, profile: profiles[profilePath] }));
				} catch (err) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
				}
			});
			return;
		}

		res.writeHead(405, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
		return;
	}

	// ---- Leaderboard API ----
	if (url === "/leaderboards" || url.startsWith("/leaderboards?")) {
		if (req.method === "GET") {
			const mode = new URL(url, `http://${req.headers.host}`).searchParams.get("mode");
			if (mode && leaderboards[mode]) {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true, entries: leaderboards[mode].slice(0, 50) }));
			} else {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true, leaderboards }));
			}
			return;
		}
	}

	// ---- Stats / Monitoring ----
	if (url === "/stats" || url.startsWith("/stats?")) {
		const stats = {
			ok: true,
			service: "bobsgameweb-socket-server",
			version: SERVER_VERSION,
			uptime: Math.floor(process.uptime()),
			memory: {
				rss: Math.floor(process.memoryUsage().rss / 1048576),
				heapUsed: Math.floor(process.memoryUsage().heapUsed / 1048576),
				heapTotal: Math.floor(process.memoryUsage().heapTotal / 1048576),
			},
			connections: io.engine.clientsCount,
			players: players.size,
			rooms: rooms.size,
			tournaments: tournaments.size,
			profiles: Object.keys(profiles).length,
			leaderboardEntries: {
				marathon: (leaderboards.marathon || []).length,
				sprint: (leaderboards.sprint || []).length,
				ultra: (leaderboards.ultra || []).length,
			},
			maps: (() => { try { return fs.readdirSync(MAPS_DIR).filter(function(f) { return f.endsWith(".json"); }).length; } catch(e) { return 0; } })(),
		};
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(stats, null, 2));
		return;
	}

	res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
	res.end(JSON.stringify({ ok: false, error: "Not Found", path: url }));
});

const io = new Server(httpServer, {
	cors: {
		origin: ALLOWED_ORIGIN,
		methods: ["GET", "POST"],
	},
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
		// Restore profile ELO if exists
		const existingProfile = profiles[safeName];
		const elo = existingProfile?.elo ?? DEFAULT_ELO;
		const wins = existingProfile?.wins ?? 0;
		const losses = existingProfile?.losses ?? 0;

		players.set(socket.id, {
			id: socket.id,
			name: safeName,
			elo,
			wins,
			losses,
		});

		// Update profile last seen
		profiles[safeName] = {
			...(existingProfile || {}),
			id: safeName,
			name: safeName,
			elo,
			wins,
			losses,
			lastSeen: Date.now(),
		};

		console.log(
			`Player ${socket.id} set name to ${safeName} (Elo: ${elo}, W: ${wins}, L: ${losses})`,
		);

		// Send profile back to client
		session["emit"]("profile", profiles[safeName]);
	});

	// ----------------------------------------------------------
	// Room Listing
	// ----------------------------------------------------------

	socket.on("listRooms", () => {
		const roomList = Array.from(rooms.values())
			.filter((r) => !r.isPrivate)
			.map((r) => ({
				id: r.id,
				name: r.name,
				players: r.players.length,
				maxPlayers: r.maxPlayers,
				hasPassword: r.password !== "",
				gameMode: r.gameMode,
				startLevel: r.startLevel,
				isTournament: r.isTournament,
				state: r.state,
			}));
		socket.emit("roomList", roomList);
	});

	// ----------------------------------------------------------
	// Room Creation
	// ----------------------------------------------------------

	socket.on("createRoom", (options) => {
		// Require authentication
		const player = players.get(socket.id);
		if (!player || !player.name) {
			session["emit"]("error", { message: "You must set a name before creating rooms" });
			return;
		}

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
			createdAt: Date.now(),
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
		console.log(
			"Room created:",
			roomName,
			roomId,
			isPrivate ? "(Private)" : "",
			isTournament ? "(Tournament)" : "",
		);
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

		// Require authentication
		const joiner = players.get(socket.id);
		if (!joiner || !joiner.name) {
			session["emit"]("error", { message: "You must set a name before joining rooms" });
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
			timestamp: Date.now(),
		});

		io.to(room.id).emit("roomUpdated", {
			playerData: room.players.reduce((acc, pid) => {
				const p = players.get(pid);
				acc[pid] = { name: p?.name || "Unknown", elo: p?.elo || 1000 };
				return acc;
			}, {}),
			spectatorCount: (room.spectators || []).length,
		});

		// If room is now full and not a tournament, start the game
		if (
			!room.isTournament &&
			room.players.length === room.maxPlayers &&
			room.state !== "PLAYING"
		) {
			const seed = Math.floor(Math.random() * 1000000);
			io.to(room.id).emit("gameStart", {
				seed,
				gameMode: room.gameMode,
				startLevel: room.startLevel,
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
			io.emit("chatMessage", {
				channel,
				name: playerName,
				message,
				timestamp: Date.now(),
			});
		} else if (channel === "room") {
			const room = Array.from(socket.rooms).find((r) => rooms.has(r));
			if (room) {
				io.to(room).emit("chatMessage", {
					channel,
					name: playerName,
					message,
					timestamp: Date.now(),
				});
			}
		} else if (channel === "private" && to) {
			io.to(to).emit("chatMessage", {
				channel,
				name: playerName,
				message,
				from: socket.id,
				timestamp: Date.now(),
			});
		}
	});

	// ----------------------------------------------------------
	// Game State Sync (frame-by-frame state for opponents)
	// ----------------------------------------------------------

	socket.on("frame", (state) => {
		const room = Array.from(socket.rooms).find((r) => rooms.has(r));
		if (room) {
			socket.to(room).emit("opponentFrame", { id: socket.id, state });
		}
	});

	// RPG world position broadcast
	socket.on("game_frame", (data) => {
		const room = Array.from(socket.rooms).find((r) => rooms.has(r));
		if (room) {
			socket.to(room).emit("game_state", {
				players: Array.from(players.entries()).map(([id, p]) => ({
					id,
					name: p.name || "Player",
					x: p.rpgX ?? 0,
					y: p.rpgY ?? 0,
					color: p.color ?? 0x44aaff,
					dir: p.rpgDir ?? 0,
				})),
			});
			// Store position
			const p = players.get(socket.id);
			if (p && data.state) {
				try {
					const state = JSON.parse(data.state);
					p.rpgX = state.x;
					p.rpgY = state.y;
					p.rpgDir = state.dir;
				} catch {
					/* ignore */
				}
			}
		}
	});

	// Chat shorthand (maps to chatMessage)
	socket.on("chat", (data) => {
		const message = typeof data === "string" ? data : data?.message;
		if (!message) return;
		const playerName = players.get(socket.id)?.name || "Player";
		const room = Array.from(socket.rooms).find((r) => rooms.has(r));
		if (room) {
			io.to(room).emit("chat", { from: playerName, message });
		} else {
			io.emit("chat", { from: playerName, message });
		}
	});

	// ----------------------------------------------------------
	// Garbage Routing (multiplayer VS mode)
	// ----------------------------------------------------------

	socket.on("garbage", (amount) => {
		const room = Array.from(socket.rooms).find((r) => rooms.has(r));
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
			date: Date.now(),
		};

		leaderboards[mode].push(entry);
		// Sort descending by score and keep top 100
		leaderboards[mode].sort((a, b) => b.score - a.score);
		leaderboards[mode] = leaderboards[mode].slice(0, 100);

		saveLeaderboards(leaderboards);
		console.log(
			`Score reported: ${entry.name} - ${entry.score} pts (${mode}) | Elo: ${entry.elo} | Has Replay: ${!!entry.replay}`,
		);
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
		const room = Array.from(socket.rooms).find((r) => rooms.has(r));
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
			y: pos.y,
		});
	});

	socket.on("playerAction", (action) => {
		socket.broadcast.emit("remotePlayerAction", {
			id: socket.id,
			type: action.type, // e.g. 'jump', 'emote', 'interact'
			data: action.data,
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
				url: mockUrl,
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
				socket.emit("rpgDatabaseLoaded", {
					success: false,
					error: "Database not found",
				});
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
		const profileId =
			typeof identity === "object" && identity !== null
				? String(identity.profileId || "")
						.substring(0, 128)
						.toLowerCase()
				: "";
		const safeName =
			typeof identity === "object" && identity !== null
				? String(identity.name || "webplayer")
						.substring(0, 64)
						.toLowerCase()
				: String(identity || "webplayer")
						.substring(0, 64)
						.toLowerCase();
		const storageKey = profileId || safeName;
		const snapshot = data?.snapshot || {
			version: "2.1.57",
			stats: {},
			unlockedIds: [],
		};
		try {
			const file = path.join(ACHIEVEMENTS_DIR, `${storageKey}.json`);
			fs.writeFileSync(
				file,
				JSON.stringify(
					{ identity: { profileId, name: safeName }, snapshot },
					null,
					2,
				),
			);
			socket.emit("achievementDataSaved", {
				success: true,
				key: storageKey,
				profileId,
				name: safeName,
			});
		} catch (e) {
			console.error("Failed to save achievement data:", e);
			socket.emit("achievementDataSaved", { success: false, error: e.message });
		}
	});

	socket.on("loadAchievementData", (identity) => {
		try {
			const profileId =
				typeof identity === "object" && identity !== null
					? String(identity.profileId || "")
							.substring(0, 128)
							.toLowerCase()
					: "";
			const safeName =
				typeof identity === "object" && identity !== null
					? String(identity.name || "webplayer")
							.substring(0, 64)
							.toLowerCase()
					: String(identity || "webplayer")
							.substring(0, 64)
							.toLowerCase();
			const candidateKeys = [profileId, safeName].filter(Boolean);

			for (const key of candidateKeys) {
				const file = path.join(ACHIEVEMENTS_DIR, `${key}.json`);
				if (fs.existsSync(file)) {
					const data = JSON.parse(fs.readFileSync(file, "utf-8"));
					const snapshot = data?.snapshot ?? data;
					socket.emit("achievementDataLoaded", {
						success: true,
						snapshot,
						identity: data?.identity || { profileId, name: safeName },
					});
					return;
				}
			}

			socket.emit("achievementDataLoaded", {
				success: false,
				error: "Achievement data not found",
			});
		} catch (e) {
			console.error("Failed to load achievement data:", e);
			socket.emit("achievementDataLoaded", {
				success: false,
				error: e.message,
			});
		}
	});

	// ----------------------------------------------------------
	// Character Persistence
	// ----------------------------------------------------------

	socket.on("saveCharacter", (data) => {
		const identity = data?.identity ?? data?.name;
		const profileId =
			typeof identity === "object" && identity !== null
				? String(identity.profileId || "")
						.substring(0, 128)
						.toLowerCase()
				: "";
		const safeName =
			typeof identity === "object" && identity !== null
				? String(identity.name || "webplayer")
						.substring(0, 64)
						.toLowerCase()
				: String(identity || "webplayer")
						.substring(0, 64)
						.toLowerCase();
		const storageKey = profileId || safeName;
		const charData = data?.charData;
		try {
			const charFile = path.join(CHARS_DIR, `${storageKey}.json`);
			fs.writeFileSync(
				charFile,
				JSON.stringify(
					{ identity: { profileId, name: safeName }, charData },
					null,
					2,
				),
			);
			console.log(`Character ${safeName} saved under ${storageKey}.`);
			socket.emit("characterSaved", {
				success: true,
				key: storageKey,
				profileId,
				name: safeName,
			});
		} catch (e) {
			console.error("Failed to save character:", e);
			socket.emit("characterSaved", { success: false, error: e.message });
		}
	});

	socket.on("loadCharacter", (identity) => {
		try {
			const profileId =
				typeof identity === "object" && identity !== null
					? String(identity.profileId || "")
							.substring(0, 128)
							.toLowerCase()
					: "";
			const safeName =
				typeof identity === "object" && identity !== null
					? String(identity.name || "webplayer")
							.substring(0, 64)
							.toLowerCase()
					: String(identity || "webplayer")
							.substring(0, 64)
							.toLowerCase();
			const candidateKeys = [profileId, safeName].filter(Boolean);
			for (const key of candidateKeys) {
				const charFile = path.join(CHARS_DIR, `${key}.json`);
				if (fs.existsSync(charFile)) {
					const data = JSON.parse(fs.readFileSync(charFile, "utf-8"));
					socket.emit("characterLoaded", {
						success: true,
						charData: data?.charData ?? data,
						identity: data?.identity || { profileId, name: safeName },
					});
					return;
				}
			}
			socket.emit("characterLoaded", {
				success: false,
				error: "Character not found",
			});
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
		const profileId =
			typeof identity === "object" && identity !== null
				? String(identity.profileId || "")
						.substring(0, 128)
						.toLowerCase()
				: "";
		const safeName =
			typeof identity === "object" && identity !== null
				? String(identity.name || "webplayer")
						.substring(0, 64)
						.toLowerCase()
				: String(identity || "webplayer")
						.substring(0, 64)
						.toLowerCase();
		const storageKey = profileId || safeName;
		const state = data?.state;
		try {
			const stateFile = path.join(EmuStates_DIR, `${storageKey}.json`);
			fs.writeFileSync(
				stateFile,
				JSON.stringify({ identity: { profileId, name: safeName }, state }),
			);
			console.log(`Emulator state for ${safeName} saved under ${storageKey}.`);
		} catch (e) {
			console.error("Failed to save emulator state:", e);
		}
	});

	socket.on("loadEmulatorState", (identity) => {
		try {
			const profileId =
				typeof identity === "object" && identity !== null
					? String(identity.profileId || "")
							.substring(0, 128)
							.toLowerCase()
					: "";
			const safeName =
				typeof identity === "object" && identity !== null
					? String(identity.name || "webplayer")
							.substring(0, 64)
							.toLowerCase()
					: String(identity || "webplayer")
							.substring(0, 64)
							.toLowerCase();
			const candidateKeys = [profileId, safeName].filter(Boolean);
			for (const key of candidateKeys) {
				const stateFile = path.join(EmuStates_DIR, `${key}.json`);
				if (fs.existsSync(stateFile)) {
					const data = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
					socket.emit("emulatorStateLoaded", {
						success: true,
						state: data?.state ?? data,
						identity: data?.identity || { profileId, name: safeName },
					});
					return;
				}
			}
			socket.emit("emulatorStateLoaded", {
				success: false,
				error: "State not found",
			});
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
			const maps = files.map((f) => f.replace("map_", "").replace(".json", ""));
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
				const files = fs
					.readdirSync(assetDir, { recursive: true })
					.filter((f) => fs.statSync(path.join(assetDir, f)).isFile());
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

	// ----------------------------------------------------------
	// Tournament Brackets (Enhanced)
	// ----------------------------------------------------------

	// Generate a full elimination bracket for N players
	function generateBracket(playerIds) {
		const numPlayers = playerIds.length;
		if (numPlayers < 2) return [];

		const bracketSize = 2 ** Math.ceil(Math.log2(numPlayers));
		const totalRounds = Math.ceil(Math.log2(numPlayers));
		const matches = [];

		// Round 0 matches
		for (let i = 0; i < bracketSize / 2; i++) {
			const p1 = i * 2 < numPlayers ? playerIds[i * 2] : null;
			const p2 = i * 2 + 1 < numPlayers ? playerIds[i * 2 + 1] : null;
			matches.push({
				matchId: `r0m${i}`,
				round: 0,
				index: i,
				p1,
				p2,
				winner: null,
				isBye: p1 === null || p2 === null,
			});
		}

		// Subsequent rounds (empty slots)
		for (let round = 1; round <= totalRounds; round++) {
			const count = bracketSize / 2 ** (round + 1);
			for (let i = 0; i < count; i++) {
				matches.push({
					matchId: `r${round}m${i}`,
					round,
					index: i,
					p1: null,
					p2: null,
					winner: null,
					isBye: false,
				});
			}
		}

		// Auto-advance byes
		for (const m of matches) {
			if (m.isBye) {
				m.winner = m.p1 ?? m.p2;
				// Propagate to next round
				const nextRound = m.round + 1;
				const nextIndex = Math.floor(m.index / 2);
				const nextMatch = matches.find(
					(nm) => nm.round === nextRound && nm.index === nextIndex,
				);
				if (nextMatch) {
					if (m.index % 2 === 0) nextMatch.p1 = m.winner;
					else nextMatch.p2 = m.winner;
				}
			}
		}

		return matches;
	}

	socket.on("createTournament", (options) => {
		const name = String(options?.name || "Tournament").substring(0, 64);
		const maxPlayers = Math.max(
			2,
			Math.min(32, parseInt(options?.maxPlayers) || 8),
		);
		const tournamentId = `t-${Math.random().toString(36).substring(2, 9)}`;

		const tournament = {
			id: tournamentId,
			name,
			maxPlayers,
			players: [],
			bracket: null,
			state: "WAITING", // WAITING -> RUNNING -> COMPLETE
			created: Date.now(),
		};

		tournaments.set(tournamentId, tournament);
		console.log(
			`Tournament created: ${tournamentId} (${name}, max ${maxPlayers} players)`,
		);
		session["emit"]("tournamentCreated", {
			tournamentId,
			name,
			maxPlayers,
			state: tournament.state,
		});
	});

	socket.on("listTournaments", () => {
		const list = Array.from(tournaments.values())
			.filter((t) => t.state === "WAITING")
			.map((t) => ({
				id: t.id,
				name: t.name,
				playerCount: t.players.length,
				maxPlayers: t.maxPlayers,
				state: t.state,
			}));
		session["emit"]("tournamentList", list);
	});

	// Enhanced joinTournament that supports full brackets
	socket.on("joinTournament", (tournamentId) => {
		if (!tournaments.has(tournamentId)) {
			tournaments.set(tournamentId, {
				id: tournamentId,
				players: [],
				bracket: null,
				state: "WAITING",
			});
		}

		const tournament = tournaments.get(tournamentId);
		if (!tournament.players.includes(socket.id)) {
			tournament.players.push(socket.id);
			console.log(`Player ${socket.id} joined tournament ${tournamentId}`);
		}

		// Notify all players in the tournament
		for (const pid of tournament.players) {
			io.to(pid).emit("tournamentUpdate", {
				tournamentId,
				players: tournament.players.map((p) => ({
					id: p,
					name: players.get(p)?.name || "Player",
					elo: players.get(p)?.elo || 1000,
				})),
				state: tournament.state,
			});
		}

		// If enough players, generate bracket and start
		const maxP = tournament.maxPlayers || 2;
		if (tournament.players.length >= maxP && tournament.state === "WAITING") {
			tournament.state = "RUNNING";
			tournament.bracket = generateBracket(tournament.players);

			// Send bracket to all players
			for (const pid of tournament.players) {
				io.to(pid).emit("tournamentBracket", {
					tournamentId,
					bracket: tournament.bracket,
					totalRounds: Math.ceil(Math.log2(tournament.players.length)),
				});
			}

			// Start first-round matches
			const firstRoundMatches = tournament.bracket.filter(
				(m) => m.round === 0 && !m.isBye,
			);
			for (const match of firstRoundMatches) {
				const seed = Math.floor(Math.random() * 1000000);
				io.to(match.p1).emit("gameStart", {
					seed,
					opponent: players.get(match.p2)?.name || "Opponent",
					isTournament: true,
					tournamentId,
					matchId: match.matchId,
				});
				io.to(match.p2).emit("gameStart", {
					seed,
					opponent: players.get(match.p1)?.name || "Opponent",
					isTournament: true,
					tournamentId,
					matchId: match.matchId,
				});
			}
		}
	});

	socket.on("tournamentMatchEnd", (data) => {
		const { tournamentId, winnerId, loserId } = data;
		const winner = players.get(winnerId);
		const loser = players.get(loserId);

		if (winner && loser) {
			const newRatings = calculateNewRatings(winner.elo, loser.elo);

			console.log(
				`Match End: Winner ${winner.name} (${winner.elo} -> ${newRatings.winnerElo}) | Loser ${loser.name} (${loser.elo} -> ${newRatings.loserElo})`,
			);

			winner.elo = newRatings.winnerElo;
			loser.elo = newRatings.loserElo;

			// Update wins/losses
			winner.wins = (winner.wins ?? 0) + 1;
			loser.losses = (loser.losses ?? 0) + 1;
			winner.gamesPlayed = (winner.gamesPlayed ?? 0) + 1;
			loser.gamesPlayed = (loser.gamesPlayed ?? 0) + 1;

			// Persist to profiles
			if (profiles[winner.name]) {
				profiles[winner.name].elo = winner.elo;
				profiles[winner.name].wins = winner.wins;
				profiles[winner.name].gamesPlayed = winner.gamesPlayed;
			}
			if (profiles[loser.name]) {
				profiles[loser.name].elo = loser.elo;
				profiles[loser.name].losses = loser.losses;
				profiles[loser.name].gamesPlayed = loser.gamesPlayed;
			}

			io.to(winnerId).emit("eloUpdate", {
				elo: winner.elo,
				gain: newRatings.winnerElo - winner.elo,
			});
			io.to(loserId).emit("eloUpdate", {
				elo: loser.elo,
				gain: newRatings.loserElo - loser.elo,
			});
		}
	});

	// ----------------------------------------------------------
	// Disconnect / Cleanup
	// ----------------------------------------------------------

	socket.on("disconnecting", () => {
		for (const room of socket.rooms) {
			if (rooms.has(room)) {
				const r = rooms.get(room);
				r.players = r.players.filter((p) => p !== socket.id);
				if (r.players.length === 0) {
					rooms.delete(room);
					console.log("Room deleted:", room);
				} else {
					const playerName = players.get(socket.id)?.name || "Unknown";
					io.to(room).emit("chatMessage", {
						message: `${playerName} left the room`,
						name: "System",
						timestamp: Date.now(),
					});

					io.to(room).emit("roomUpdated", {
						playerData: r.players.reduce((acc, pid) => {
							const p = players.get(pid);
							acc[pid] = { name: p?.name || "Unknown", elo: p?.elo || 1000 };
							return acc;
						}, {}),
						spectatorCount: (r.spectators || []).length,
					});
				}
			}
		}
	});

	// ----------------------------------------------------------
	// Batched Message Handler
	// ----------------------------------------------------------
	socket.on("batch", (messages) => {
		if (!Array.isArray(messages)) return;
		for (const [event, data] of messages) {
			socket.emit(event, data); // Re-emit as individual events
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
	console.log(
		`Leaderboard entries: marathon=${(leaderboards.marathon || []).length}, sprint=${(leaderboards.sprint || []).length}, ultra=${(leaderboards.ultra || []).length}`,
	);
});

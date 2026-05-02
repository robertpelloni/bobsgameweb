/**
 * Default game strings — localized text for all UI elements.
 *
 * Languages: English (en), Japanese (jp), Spanish (es), French (fr), German (de)
 *
 * Usage:
 *   import { registerDefaultStrings } from './DefaultStrings';
 *   registerDefaultStrings();
 *   Localization.get('menu_play'); // → "Play" / "プレイ" / "Jugar"
 */
import { Localization } from "./Localization";

export function registerDefaultStrings(): void {
	// ============================================================
	// Main Menu
	// ============================================================
	Localization.register("menu_play", {
		en: "Play", jp: "プレイ", es: "Jugar", fr: "Jouer", de: "Spielen",
	});
	Localization.register("menu_classic", {
		en: "Classic", jp: "クラシック", es: "Clásico", fr: "Classique", de: "Klassisch",
	});
	Localization.register("menu_modern", {
		en: "Modern", jp: "モダン", es: "Moderno", fr: "Moderne", de: "Modern",
	});
	Localization.register("menu_custom", {
		en: "Play Custom Game", jp: "カスタムゲーム", es: "Juego Personalizado", fr: "Jeu Personnalisé", de: "Benutzerdefiniert",
	});
	Localization.register("menu_editor", {
		en: "Custom Game Editor", jp: "エディター", es: "Editor", fr: "Éditeur", de: "Editor",
	});
	Localization.register("menu_sprite_editor", {
		en: "Sprite Editor", jp: "スプライトエディター", es: "Editor de Sprites", fr: "Éditeur de Sprites", de: "Sprite-Editor",
	});
	Localization.register("menu_event_editor", {
		en: "Event Editor", jp: "イベントエディター", es: "Editor de Eventos", fr: "Éditeur d'Événements", de: "Ereignis-Editor",
	});
	Localization.register("menu_crafting", {
		en: "Crafting", jp: "クラフト", es: "Fabricación", fr: "Artisanat", de: "Handwerk",
	});
	Localization.register("menu_multiplayer", {
		en: "Multiplayer", jp: "マルチプレイヤー", es: "Multijugador", fr: "Multijoueur", de: "Mehrspieler",
	});
	Localization.register("menu_online", {
		en: "Go Online", jp: "オンライン", es: "Conectar", fr: "Se Connecter", de: "Online Gehen",
	});
	Localization.register("menu_party", {
		en: "Party", jp: "パーティー", es: "Grupo", fr: "Équipe", de: "Gruppe",
	});
	Localization.register("menu_rankings", {
		en: "Rankings", jp: "ランキング", es: "Clasificación", fr: "Classement", de: "Rangliste",
	});
	Localization.register("menu_nd_demo", {
		en: "nD Demo", jp: "nD デモ", es: "Demo nD", fr: "Démo nD", de: "nD Demo",
	});
	Localization.register("menu_tournament", {
		en: "Tournament", jp: "トーナメント", es: "Torneo", fr: "Tournoi", de: "Turnier",
	});
	Localization.register("menu_rpg", {
		en: "Play RPG", jp: "RPG", es: "Jugar RPG", fr: "Jouer RPG", de: "RPG Spielen",
	});
	Localization.register("menu_high_scores", {
		en: "High Scores", jp: "ハイスコア", es: "Puntuaciones", fr: "Meilleurs Scores", de: "Bestenliste",
	});
	Localization.register("menu_achievements", {
		en: "Achievements", jp: "実績", es: "Logros", fr: "Succès", de: "Erfolge",
	});
	Localization.register("menu_help", {
		en: "Help", jp: "ヘルプ", es: "Ayuda", fr: "Aide", de: "Hilfe",
	});
	Localization.register("menu_settings", {
		en: "Settings", jp: "設定", es: "Configuración", fr: "Paramètres", de: "Einstellungen",
	});
	Localization.register("menu_options", {
		en: "Options", jp: "オプション", es: "Opciones", fr: "Options", de: "Optionen",
	});
	Localization.register("menu_sequence_editor", {
		en: "Game Sequence Editor", jp: "シーケンスエディター", es: "Editor de Secuencias", fr: "Éditeur de Séquences", de: "Sequenz-Editor",
	});

	// ============================================================
	// In-Game
	// ============================================================
	Localization.register("game_pause", {
		en: "PAUSED", jp: "一時停止", es: "PAUSA", fr: "PAUSE", de: "PAUSIERT",
	});
	Localization.register("game_resume", {
		en: "Resume", jp: "再開", es: "Reanudar", fr: "Reprendre", de: "Fortsetzen",
	});
	Localization.register("game_quit", {
		en: "Quit", jp: "終了", es: "Salir", fr: "Quitter", de: "Beenden",
	});
	Localization.register("game_game_over", {
		en: "GAME OVER", jp: "ゲームオーバー", es: "FIN DEL JUEGO", fr: "FIN DE PARTIE", de: "SPIEL VORBEI",
	});
	Localization.register("game_victory", {
		en: "VICTORY!", jp: "勝利！", es: "¡VICTORIA!", fr: "VICTOIRE !", de: "SIEG!",
	});

	// ============================================================
	// RPG World
	// ============================================================
	Localization.register("rpg_town_name", {
		en: "TOWNYUU", jp: "タウンユウ", es: "PUEBLO YUU", fr: "VILLEYUU", de: "DORFYUU",
	});
	Localization.register("rpg_welcome", {
		en: "Welcome to the MMO World!", jp: "MMOワールドへようこそ！", es: "¡Bienvenido al Mundo MMO!", fr: "Bienvenue dans le Monde MMO !", de: "Willkommen in der MMO-Welt!",
	});
	Localization.register("rpg_level_up", {
		en: "Level Up!", jp: "レベルアップ！", es: "¡Subiste de Nivel!", fr: "Niveau Supérieur !", de: "Level Aufstieg!",
	});
	Localization.register("rpg_battle_start", {
		en: "A battle begins!", jp: "戦闘開始！", es: "¡Comienza la batalla!", fr: "Le combat commence !", de: "Ein Kampf beginnt!",
	});
	Localization.register("rpg_enemy_appeared", {
		en: "A wild {enemy} appeared!", jp: "野生の{enemy}が現れた！", es: "¡Un {enemy} salvaje apareció!", fr: "Un {enemy} sauvage apparaît !", de: "Ein wildes {enemy} erscheint!",
	});

	// ============================================================
	// Battle
	// ============================================================
	Localization.register("battle_attack", {
		en: "ATTACK", jp: "攻撃", es: "ATAQUE", fr: "ATTAQUE", de: "ANGRIFF",
	});
	Localization.register("battle_magic", {
		en: "MAGIC", jp: "魔法", es: "MAGIA", fr: "MAGIE", de: "MAGIE",
	});
	Localization.register("battle_items", {
		en: "ITEMS", jp: "アイテム", es: "OBJETOS", fr: "OBJETS", de: "GEGENSTÄNDE",
	});
	Localization.register("battle_flee", {
		en: "FLEE", jp: "逃げる", es: "HUIR", fr: "FUIR", de: "FLIEHEN",
	});
	Localization.register("battle_critical", {
		en: "CRITICAL HIT!", jp: "クリティカル！", es: "¡GOLPE CRÍTICO!", fr: "COUP CRITIQUE !", de: "KRITISCHER TREFFER!",
	});

	// ============================================================
	// UI Labels
	// ============================================================
	Localization.register("label_gold", {
		en: "Gold", jp: "ゴールド", es: "Oro", fr: "Or", de: "Gold",
	});
	Localization.register("label_hp", {
		en: "HP", jp: "HP", es: "PS", fr: "PV", de: "LP",
	});
	Localization.register("label_mp", {
		en: "MP", jp: "MP", es: "PM", fr: "PM", de: "MP",
	});
	Localization.register("label_xp", {
		en: "XP", jp: "経験値", es: "EX", fr: "EXP", de: "EP",
	});
	Localization.register("label_level", {
		en: "Level", jp: "レベル", es: "Nivel", fr: "Niveau", de: "Level",
	});
	Localization.register("label_score", {
		en: "Score", jp: "スコア", es: "Puntos", fr: "Score", de: "Punkte",
	});
	Localization.register("label_combo", {
		en: "COMBO", jp: "コンボ", es: "COMBO", fr: "COMBO", de: "COMBO",
	});
	Localization.register("label_buy", {
		en: "Buy", jp: "購入", es: "Comprar", fr: "Acheter", de: "Kaufen",
	});
	Localization.register("label_sell", {
		en: "Sell", jp: "売却", es: "Vender", fr: "Vendre", de: "Verkaufen",
	});
	Localization.register("label_equip", {
		en: "Equip", jp: "装備", es: "Equipar", fr: "Équiper", de: "Ausrüsten",
	});
	Localization.register("label_craft", {
		en: "Craft", jp: "クラフト", es: "Fabricar", fr: "Fabriquer", de: "Herstellen",
	});

	// ============================================================
	// Connectivity
	// ============================================================
	Localization.register("net_connecting", {
		en: "Connecting to server...", jp: "サーバーに接続中...", es: "Conectando al servidor...", fr: "Connexion au serveur...", de: "Verbinde mit Server...",
	});
	Localization.register("net_connected", {
		en: "Connected as {name}", jp: "{name}として接続", es: "Conectado como {name}", fr: "Connecté en tant que {name}", de: "Verbunden als {name}",
	});
	Localization.register("net_disconnected", {
		en: "Disconnected from server", jp: "サーバーから切断", es: "Desconectado del servidor", fr: "Déconnecté du serveur", de: "Vom Server getrennt",
	});
	Localization.register("net_error", {
		en: "Connection failed", jp: "接続失敗", es: "Error de conexión", fr: "Échec de connexion", de: "Verbindung fehlgeschlagen",
	});

	// ============================================================
	// Time of Day
	// ============================================================
	Localization.register("time_morning", {
		en: "Morning", jp: "朝", es: "Mañana", fr: "Matin", de: "Morgen",
	});
	Localization.register("time_afternoon", {
		en: "Afternoon", jp: "午後", es: "Tarde", fr: "Après-midi", de: "Nachmittag",
	});
	Localization.register("time_evening", {
		en: "Evening", jp: "夕方", es: "Noche", fr: "Soir", de: "Abend",
	});
	Localization.register("time_night", {
		en: "Night", jp: "夜", es: "Madrugada", fr: "Nuit", de: "Nacht",
	});
}

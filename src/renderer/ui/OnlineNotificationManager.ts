/**
 * OnlineNotificationManager — manages real-time online event notifications.
 *
 * Displays friend online/offline, tournament invites, room challenges,
 * achievement unlocks, and server announcements as toast-style notifications.
 * Integrates with the existing ToastManager for display.
 */
import { ToastManager } from "./ToastManager";
import { networkManager } from "../puzzle";

export interface OnlineNotification {
	id: string;
	type: "friend_online" | "friend_offline" | "tournament_invite" | "room_invite" | "achievement" | "server" | "chat";
	title: string;
	message: string;
	timestamp: number;
	read: boolean;
	data?: Record<string, unknown>;
}

export class OnlineNotificationManager {
	private notifications: OnlineNotification[] = [];
	private maxNotifications = 50;
	private listeners: ((notifications: OnlineNotification[]) => void)[] = [];

	private static instance: OnlineNotificationManager | null = null;

	static init(): OnlineNotificationManager {
		if (!this.instance) {
			this.instance = new OnlineNotificationManager();
		}
		return this.instance;
	}

	static get instance(): OnlineNotificationManager {
		return this.instance ?? OnlineNotificationManager.init();
	}

	private constructor() {
		this.wireNetworkEvents();
	}

	/** Wire Socket.io events to notification generation */
	private wireNetworkEvents(): void {
		const nm = networkManager;
		if (!nm) return;

		nm.on("playerJoined", (data: { name: string }) => {
			this.addNotification({
				type: "friend_online",
				title: "Player Online",
				message: `${data.name} joined the server`,
			});
		});

		nm.on("playerLeft", (data: { name: string }) => {
			this.addNotification({
				type: "friend_offline",
				title: "Player Offline",
				message: `${data.name} left the server`,
			});
		});

		nm.on("chatMessage", (data: { name: string; message: string }) => {
			// Only notify for direct mentions or DMs
			if (data.message.includes("@")) {
				this.addNotification({
					type: "chat",
					title: `Message from ${data.name}`,
					message: data.message,
				});
			}
		});
	}

	/** Add a new notification */
	addNotification(partial: Omit<OnlineNotification, "id" | "timestamp" | "read">): void {
		const notification: OnlineNotification = {
			...partial,
			id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			timestamp: Date.now(),
			read: false,
		};

		this.notifications.unshift(notification);

		// Trim old notifications
		if (this.notifications.length > this.maxNotifications) {
			this.notifications = this.notifications.slice(0, this.maxNotifications);
		}

		// Show toast
		const icon = this.getIcon(notification.type);
		ToastManager.showInfo(`${icon} ${notification.message}`);

		// Notify listeners
		for (const listener of this.listeners) {
			listener([...this.notifications]);
		}
	}

	/** Mark a notification as read */
	markRead(id: string): void {
		const notif = this.notifications.find(n => n.id === id);
		if (notif) {
			notif.read = true;
			this.notifyListeners();
		}
	}

	/** Mark all notifications as read */
	markAllRead(): void {
		for (const n of this.notifications) {
			n.read = true;
		}
		this.notifyListeners();
	}

	/** Get all notifications */
	getNotifications(): OnlineNotification[] {
		return [...this.notifications];
	}

	/** Get unread count */
	getUnreadCount(): number {
		return this.notifications.filter(n => !n.read).length;
	}

	/** Register a change listener */
	onChange(listener: (notifications: OnlineNotification[]) => void): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter(l => l !== listener);
		};
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener([...this.notifications]);
		}
	}

	private getIcon(type: OnlineNotification["type"]): string {
		switch (type) {
			case "friend_online": return "🟢";
			case "friend_offline": return "🔴";
			case "tournament_invite": return "⚔️";
			case "room_invite": return "🏠";
			case "achievement": return "🏆";
			case "server": return "📢";
			case "chat": return "💬";
			default: return "🔔";
		}
	}

	/** Clear all notifications */
	clear(): void {
		this.notifications = [];
		this.notifyListeners();
	}
}

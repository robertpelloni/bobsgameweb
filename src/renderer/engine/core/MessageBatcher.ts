/**
 * MessageBatcher — batches WebSocket messages for efficient network transmission.
 *
 * Instead of sending individual messages for each game event, collects them
 * into batches and flushes at a fixed interval (e.g., every 50ms).
 * Reduces network overhead by 10-50× for high-frequency updates like
 * player position, entity state, and particle effects.
 *
 * Usage:
 *   const batcher = new MessageBatcher(socket, 50); // 50ms batch window
 *   batcher.emit("playerMove", { x: 100, y: 200 });
 *   batcher.emit("playerMove", { x: 102, y: 201 }); // replaces previous
 *   // After 50ms, sends: { type: "batch", messages: [["playerMove", {x:102,y:201}]] }
 */
export class MessageBatcher {
	private socket: any; // Socket.io socket
	private intervalMs: number;
	private pending: Map<string, { data: unknown; timestamp: number }> = new Map();
	private timer: ReturnType<typeof setInterval> | null = null;
	private sentCount = 0;
	private batchCount = 0;

	/**
	 * @param socket Socket.io socket instance
	 * @param intervalMs Batch flush interval in milliseconds (default: 50ms)
	 */
	constructor(socket: any, intervalMs = 50) {
		this.socket = socket;
		this.intervalMs = intervalMs;
	}

	/**
	 * Queue a message for batched sending.
	 * If a message with the same event type is already pending, it's replaced
	 * (last-writer-wins for position updates, etc.)
	 */
	emit(event: string, data: unknown): void {
		this.pending.set(event, { data, timestamp: Date.now() });

		// Start batch timer if not running
		if (!this.timer) {
			this.timer = setInterval(() => this.flush(), this.intervalMs);
		}
	}

	/**
	 * Send a message immediately (bypasses batching).
	 */
	emitImmediate(event: string, data: unknown): void {
		if (this.socket?.connected) {
			this.socket.emit(event, data);
			this.sentCount++;
		}
	}

	/**
	 * Flush all pending messages as a single batch.
	 */
	flush(): void {
		if (this.pending.size === 0) {
			// Stop timer if nothing to send
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
			return;
		}

		const messages: [string, unknown][] = [];
		for (const [event, { data }] of this.pending) {
			messages.push([event, data]);
		}
		this.pending.clear();

		if (this.socket?.connected) {
			this.socket.emit("batch", messages);
			this.batchCount++;
			this.sentCount += messages.length;
		}
	}

	/**
	 * Get batcher statistics.
	 */
	get stats(): { pending: number; batchesSent: number; messagesSent: number } {
		return {
			pending: this.pending.size,
			batchesSent: this.batchCount,
			messagesSent: this.sentCount,
		};
	}

	/**
	 * Destroy the batcher and flush remaining messages.
	 */
	destroy(): void {
		this.flush();
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
}

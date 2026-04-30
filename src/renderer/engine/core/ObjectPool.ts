/**
 * ObjectPool — generic object pooling for frequently created/destroyed objects.
 *
 * Reduces GC pressure by reusing objects instead of allocating new ones.
 * Used for particles, damage numbers, projectiles, and other ephemeral objects.
 *
 * Usage:
 *   const pool = new ObjectPool(() => new Particle(), 100);
 *   const obj = pool.acquire();
 *   pool.release(obj);
 */
export class ObjectPool<T> {
	private available: T[] = [];
	private factory: () => T;
	private resetFn: ((obj: T) => void) | null;
	private maxSize: number;
	private created = 0;
	private reused = 0;

	/**
	 * @param factory Function to create a new object
	 * @param initialSize Number of objects to pre-allocate
	 * @param resetFn Optional function to reset an object before reuse
	 * @param maxSize Maximum pool size (prevents unbounded growth)
	 */
	constructor(
		factory: () => T,
		initialSize = 0,
		resetFn?: (obj: T) => void,
		maxSize = 1000,
	) {
		this.factory = factory;
		this.resetFn = resetFn ?? null;
		this.maxSize = maxSize;

		// Pre-allocate
		for (let i = 0; i < initialSize; i++) {
			this.available.push(factory());
		}
		this.created = initialSize;
	}

	/**
	 * Acquire an object from the pool (or create a new one if empty).
	 */
	acquire(): T {
		if (this.available.length > 0) {
			this.reused++;
			return this.available.pop()!;
		}
		this.created++;
		return this.factory();
	}

	/**
	 * Release an object back to the pool for reuse.
	 */
	release(obj: T): void {
		if (this.available.length >= this.maxSize) return; // Don't over-grow
		if (this.resetFn) this.resetFn(obj);
		this.available.push(obj);
	}

	/**
	 * Release multiple objects at once.
	 */
	releaseAll(objects: T[]): void {
		for (const obj of objects) {
			this.release(obj);
		}
	}

	/**
	 * Get the number of available objects in the pool.
	 */
	get size(): number {
		return this.available.length;
	}

	/**
	 * Get pool statistics.
	 */
	get stats(): { created: number; reused: number; available: number } {
		return {
			created: this.created,
			reused: this.reused,
			available: this.available.length,
		};
	}

	/**
	 * Clear the pool.
	 */
	clear(): void {
		this.available.length = 0;
	}

	/**
	 * Pre-warm the pool to a given size.
	 */
	warm(count: number): void {
		while (this.available.length < count) {
			this.available.push(this.factory());
			this.created++;
		}
	}
}

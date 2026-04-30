/**
 * FileUtils — file system utilities adapted for web/browser environment.
 *
 * Ported from okgame C++ Utility/FileUtils.h (172 lines).
 * Provides file-like operations using browser APIs (localStorage, IndexedDB, fetch).
 */

export class FileUtils {
    /**
     * Read a text file via fetch.
     */
    static async readTextFile(path: string): Promise<string | null> {
        try {
            const response = await fetch(path);
            if (!response.ok) return null;
            return await response.text();
        } catch {
            return null;
        }
    }

    /**
     * Read a JSON file via fetch.
     */
    static async readJSONFile<T>(path: string): Promise<T | null> {
        try {
            const response = await fetch(path);
            if (!response.ok) return null;
            return await response.json() as T;
        } catch {
            return null;
        }
    }

    /**
     * Read a binary file as ArrayBuffer via fetch.
     */
    static async readBinaryFile(path: string): Promise<ArrayBuffer | null> {
        try {
            const response = await fetch(path);
            if (!response.ok) return null;
            return await response.arrayBuffer();
        } catch {
            return null;
        }
    }

    /**
     * Read a binary file as Blob via fetch.
     */
    static async readBlob(path: string): Promise<Blob | null> {
        try {
            const response = await fetch(path);
            if (!response.ok) return null;
            return await response.blob();
        } catch {
            return null;
        }
    }

    /**
     * Save data to localStorage.
     */
    static saveToLocal(key: string, data: string): boolean {
        try {
            localStorage.setItem(key, data);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Load data from localStorage.
     */
    static loadFromLocal(key: string): string | null {
        return localStorage.getItem(key);
    }

    /**
     * Remove data from localStorage.
     */
    static removeFromLocal(key: string): void {
        localStorage.removeItem(key);
    }

    /**
     * Save data to IndexedDB.
     */
    static async saveToIndexedDB(storeName: string, key: string, data: unknown): Promise<boolean> {
        try {
            const db = await FileUtils.openDB('bobsgame', 1, storeName);
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(data, key);
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch {
            return false;
        }
    }

    /**
     * Load data from IndexedDB.
     */
    static async loadFromIndexedDB<T>(storeName: string, key: string): Promise<T | null> {
        try {
            const db = await FileUtils.openDB('bobsgame', 1, storeName);
            const tx = db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(key);
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result as T ?? null);
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    /**
     * Download data as a file (trigger browser download).
     */
    static downloadFile(filename: string, data: string | Blob, mimeType = 'application/octet-stream'): void {
        const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Read a File object as text (for file input).
     */
    static readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Read a File object as ArrayBuffer (for file input).
     */
    static readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Read a File object as data URL (for file input).
     */
    static readFileAsDataURL(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get file extension from path.
     */
    static getExtension(path: string): string {
        const dot = path.lastIndexOf('.');
        return dot >= 0 ? path.substring(dot + 1).toLowerCase() : '';
    }

    /**
     * Get filename without extension from path.
     */
    static getBaseName(path: string): string {
        const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        const name = slash >= 0 ? path.substring(slash + 1) : path;
        const dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(0, dot) : name;
    }

    /**
     * Get directory from path.
     */
    static getDirectory(path: string): string {
        const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        return slash >= 0 ? path.substring(0, slash) : '';
    }

    /**
     * Join path segments.
     */
    static joinPath(...segments: string[]): string {
        return segments.join('/').replace(/\/+/g, '/');
    }

    // Internal IndexedDB helper
    private static openDB(name: string, version: number, storeName: string): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name, version);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

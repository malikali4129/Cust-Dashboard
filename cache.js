/**
 * University Dashboard - Offline Cache Layer
 * Provides IndexedDB storage for API responses with automatic expiration
 */

const CACHE_DB_NAME = 'dashboard_cache';
const CACHE_DB_VERSION = 1;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache validity

const STORES = {
    ANNOUNCEMENTS: 'announcements',
    ASSIGNMENTS: 'assignments',
    DEADLINES: 'deadlines',
    QUIZZES: 'quizzes',
    STATS: 'stats',
    SETTINGS: 'settings',
    META: 'meta'
};

class DashboardCache {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for each data type
                Object.values(STORES).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                });
                
                // Create meta store for cache metadata
                if (!db.objectStoreNames.contains('cache_meta')) {
                    const metaStore = db.createObjectStore('cache_meta', { keyPath: 'key' });
                    metaStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async ready() {
        await this.initPromise;
    }

    async set(storeName, data, id = 'default') {
        await this.ready();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const item = {
                id,
                data,
                timestamp: Date.now()
            };
            
            const request = store.put(item);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async get(storeName, id = 'default', maxAge = CACHE_TTL) {
        await this.ready();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.get(id);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    resolve(null);
                    return;
                }
                
                const age = Date.now() - result.timestamp;
                if (maxAge > 0 && age > maxAge) {
                    // Cache expired
                    this.delete(storeName, id);
                    resolve(null);
                    return;
                }
                
                resolve(result.data);
            };
        });
    }

    async delete(storeName, id = 'default') {
        await this.ready();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(id);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clearStore(storeName) {
        await this.ready();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.clear();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clearAll() {
        await this.ready();
        
        const clearPromises = Object.values(STORES).map(storeName => 
            this.clearStore(storeName)
        );
        
        await Promise.all(clearPromises);
    }

    // Helper methods for specific data types
    async setAnnouncements(data) {
        return this.set(STORES.ANNOUNCEMENTS, data);
    }

    async getAnnouncements() {
        return this.get(STORES.ANNOUNCEMENTS);
    }

    async setAssignments(data) {
        return this.set(STORES.ASSIGNMENTS, data);
    }

    async getAssignments() {
        return this.get(STORES.ASSIGNMENTS);
    }

    async setDeadlines(data) {
        return this.set(STORES.DEADLINES, data);
    }

    async getDeadlines() {
        return this.get(STORES.DEADLINES);
    }

    async setQuizzes(data) {
        return this.set(STORES.QUIZZES, data);
    }

    async getQuizzes() {
        return this.get(STORES.QUIZZES);
    }

    async setStats(data) {
        return this.set(STORES.STATS, data);
    }

    async getStats() {
        return this.get(STORES.STATS);
    }

    async setSettings(data) {
        return this.set(STORES.SETTINGS, data);
    }

    async getSettings() {
        return this.get(STORES.SETTINGS);
    }

    // Cache metadata
    async setLastUpdate(timestamp = Date.now()) {
        await this.ready();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache_meta'], 'readwrite');
            const store = transaction.objectStore('cache_meta');
            
            const item = {
                key: 'last_update',
                timestamp,
                value: timestamp
            };
            
            const request = store.put(item);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getLastUpdate() {
        await this.ready();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache_meta'], 'readonly');
            const store = transaction.objectStore('cache_meta');
            
            const request = store.get('last_update');
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
        });
    }
}

// Create singleton instance
const dashboardCache = new DashboardCache();

// Export for use in other modules
window.DashboardCache = dashboardCache;
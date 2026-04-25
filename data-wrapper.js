/**
 * University Dashboard - Cached Data Wrapper
 * Provides cached versions of DashboardData functions with offline support
 * and automatic refresh.
 */

const REFRESH_INTERVAL = 30000; // 30 seconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class DataWrapper {
    constructor() {
        this.cache = window.DashboardCache;
        this.refreshTimers = new Map();
        this.lastUpdates = new Map();
        this.init();
    }

    async init() {
        // Wait for cache to be ready
        await this.cache.ready();
        
        // Start periodic refresh for online users
        if (navigator.onLine) {
            this.startPeriodicRefresh();
        }
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.startPeriodicRefresh();
            this.refreshAllData();
        });
        
        window.addEventListener('offline', () => {
            this.stopPeriodicRefresh();
        });
    }

    startPeriodicRefresh() {
        this.stopPeriodicRefresh();
        
        // Refresh stats every 30 seconds
        this.refreshTimers.set('stats', setInterval(() => {
            this.refreshStats();
        }, REFRESH_INTERVAL));
        
        // Refresh all data every 2 minutes
        this.refreshTimers.set('full', setInterval(() => {
            this.refreshAllData();
        }, 2 * 60 * 1000));
    }

    stopPeriodicRefresh() {
        this.refreshTimers.forEach(timer => clearInterval(timer));
        this.refreshTimers.clear();
    }

    async refreshStats() {
        try {
            const stats = await DashboardData.getStats();
            await this.cache.setStats(stats);
            this.lastUpdates.set('stats', Date.now());
        } catch (error) {
            console.warn('Failed to refresh stats:', error);
        }
    }

    async refreshAllData() {
        try {
            const [announcements, assignments, deadlines, quizzes, settings] = await Promise.all([
                DashboardData.getAnnouncements(),
                DashboardData.getAssignments(),
                DashboardData.getDeadlines(),
                DashboardData.getQuizzes(),
                DashboardData.getSettings()
            ]);
            
            await Promise.all([
                this.cache.setAnnouncements(announcements),
                this.cache.setAssignments(assignments),
                this.cache.setDeadlines(deadlines),
                this.cache.setQuizzes(quizzes),
                this.cache.setSettings(settings)
            ]);
            
            await this.cache.setLastUpdate(Date.now());
            this.lastUpdates.set('full', Date.now());
        } catch (error) {
            console.warn('Failed to refresh all data:', error);
        }
    }

    // Cached version of getAnnouncements
    async getAnnouncements(options = {}) {
        try {
            // Try cache first
            const cached = await this.cache.getAnnouncements();
            if (cached && !this.isCacheExpired('announcements')) {
                // Return cached data immediately
                this.refreshInBackground(() => DashboardData.getAnnouncements(options), 'announcements');
                return this.applyLimit(cached, options.limit);
            }
            
            // Fetch fresh data
            const fresh = await DashboardData.getAnnouncements(options);
            await this.cache.setAnnouncements(fresh);
            this.lastUpdates.set('announcements', Date.now());
            return fresh;
        } catch (error) {
            // If network fails, try cache even if expired
            const cached = await this.cache.getAnnouncements();
            if (cached) {
                console.warn('Using cached announcements due to network error:', error.message);
                return this.applyLimit(cached, options.limit);
            }
            throw error;
        }
    }

    // Cached version of getAssignments
    async getAssignments(options = {}) {
        try {
            const cached = await this.cache.getAssignments();
            if (cached && !this.isCacheExpired('assignments')) {
                this.refreshInBackground(() => DashboardData.getAssignments(options), 'assignments');
                return this.applyLimit(cached, options.limit);
            }
            
            const fresh = await DashboardData.getAssignments(options);
            await this.cache.setAssignments(fresh);
            this.lastUpdates.set('assignments', Date.now());
            return fresh;
        } catch (error) {
            const cached = await this.cache.getAssignments();
            if (cached) {
                console.warn('Using cached assignments due to network error:', error.message);
                return this.applyLimit(cached, options.limit);
            }
            throw error;
        }
    }

    // Cached version of getDeadlines
    async getDeadlines(options = {}) {
        try {
            const cached = await this.cache.getDeadlines();
            if (cached && !this.isCacheExpired('deadlines')) {
                this.refreshInBackground(() => DashboardData.getDeadlines(options), 'deadlines');
                return this.applyLimit(cached, options.limit);
            }
            
            const fresh = await DashboardData.getDeadlines(options);
            await this.cache.setDeadlines(fresh);
            this.lastUpdates.set('deadlines', Date.now());
            return fresh;
        } catch (error) {
            const cached = await this.cache.getDeadlines();
            if (cached) {
                console.warn('Using cached deadlines due to network error:', error.message);
                return this.applyLimit(cached, options.limit);
            }
            throw error;
        }
    }

    // Cached version of getQuizzes
    async getQuizzes(options = {}) {
        try {
            const cached = await this.cache.getQuizzes();
            if (cached && !this.isCacheExpired('quizzes')) {
                this.refreshInBackground(() => DashboardData.getQuizzes(options), 'quizzes');
                return this.applyLimit(cached, options.limit);
            }
            
            const fresh = await DashboardData.getQuizzes(options);
            await this.cache.setQuizzes(fresh);
            this.lastUpdates.set('quizzes', Date.now());
            return fresh;
        } catch (error) {
            const cached = await this.cache.getQuizzes();
            if (cached) {
                console.warn('Using cached quizzes due to network error:', error.message);
                return this.applyLimit(cached, options.limit);
            }
            throw error;
        }
    }

    // Cached version of getStats
    async getStats() {
        try {
            const cached = await this.cache.getStats();
            if (cached && !this.isCacheExpired('stats')) {
                this.refreshInBackground(() => DashboardData.getStats(), 'stats');
                return cached;
            }
            
            const fresh = await DashboardData.getStats();
            await this.cache.setStats(fresh);
            this.lastUpdates.set('stats', Date.now());
            return fresh;
        } catch (error) {
            const cached = await this.cache.getStats();
            if (cached) {
                console.warn('Using cached stats due to network error:', error.message);
                return cached;
            }
            throw error;
        }
    }

    // Cached version of getSettings
    async getSettings() {
        try {
            const cached = await this.cache.getSettings();
            if (cached && !this.isCacheExpired('settings')) {
                this.refreshInBackground(() => DashboardData.getSettings(), 'settings');
                return cached;
            }
            
            const fresh = await DashboardData.getSettings();
            await this.cache.setSettings(fresh);
            this.lastUpdates.set('settings', Date.now());
            return fresh;
        } catch (error) {
            const cached = await this.cache.getSettings();
            if (cached) {
                console.warn('Using cached settings due to network error:', error.message);
                return cached;
            }
            throw error;
        }
    }

    // Helper methods
    isCacheExpired(dataType) {
        const lastUpdate = this.lastUpdates.get(dataType);
        if (!lastUpdate) return true;
        return Date.now() - lastUpdate > CACHE_TTL;
    }

    applyLimit(data, limit) {
        if (!limit || !Array.isArray(data)) return data;
        return data.slice(0, limit);
    }

    async refreshInBackground(fetchFn, dataType) {
        if (!navigator.onLine) return;
        
        try {
            const fresh = await fetchFn();
            await this.cache[`set${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`](fresh);
            this.lastUpdates.set(dataType, Date.now());
            
            // Notify UI of data update if needed
            this.notifyDataUpdated(dataType);
        } catch (error) {
            // Silent fail for background refresh
            console.debug('Background refresh failed:', error.message);
        }
    }

    notifyDataUpdated(dataType) {
        // Dispatch custom event for UI to react
        const event = new CustomEvent('dashboard-data-updated', {
            detail: { dataType, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    // Clear all cached data
    async clearCache() {
        await this.cache.clearAll();
        this.lastUpdates.clear();
    }

    // Get cache status
    getCacheStatus() {
        const status = {};
        const now = Date.now();
        
        Object.keys(this.lastUpdates).forEach(key => {
            const lastUpdate = this.lastUpdates.get(key);
            status[key] = {
                lastUpdate,
                age: now - lastUpdate,
                isExpired: now - lastUpdate > CACHE_TTL
            };
        });
        
        return status;
    }
}

// Create and export singleton instance
const dataWrapper = new DataWrapper();

// Export cached versions of DashboardData functions
window.DashboardDataCached = {
    // Read operations with caching
    getAnnouncements: (options) => dataWrapper.getAnnouncements(options),
    getAssignments: (options) => dataWrapper.getAssignments(options),
    getDeadlines: (options) => dataWrapper.getDeadlines(options),
    getQuizzes: (options) => dataWrapper.getQuizzes(options),
    getStats: () => dataWrapper.getStats(),
    getSettings: () => dataWrapper.getSettings(),
    
    // Write operations (pass through to original)
    addAnnouncement: DashboardData.addAnnouncement,
    updateAnnouncement: DashboardData.updateAnnouncement,
    deleteAnnouncement: DashboardData.deleteAnnouncement,
    
    addAssignment: DashboardData.addAssignment,
    updateAssignment: DashboardData.updateAssignment,
    deleteAssignment: DashboardData.deleteAssignment,
    
    addDeadline: DashboardData.addDeadline,
    updateDeadline: DashboardData.updateDeadline,
    deleteDeadline: DashboardData.deleteDeadline,
    
    addQuiz: DashboardData.addQuiz,
    updateQuiz: DashboardData.updateQuiz,
    deleteQuiz: DashboardData.deleteQuiz,
    
    // Auth operations
    signInAdmin: DashboardData.signInAdmin,
    signOutAdmin: DashboardData.signOutAdmin,
    getCurrentAdminUser: DashboardData.getCurrentAdminUser,
    updatePassword: DashboardData.updatePassword,
    
    // Other operations
    exportData: DashboardData.exportData,
    importData: DashboardData.importData,
    clearAllContent: DashboardData.clearAllContent,
    
    // Cache management
    clearCache: () => dataWrapper.clearCache(),
    getCacheStatus: () => dataWrapper.getCacheStatus(),
    refreshAllData: () => dataWrapper.refreshAllData()
};

// Also replace DashboardData with cached version for backward compatibility
// (optional - can be enabled if desired)
// window.DashboardData = window.DashboardDataCached;
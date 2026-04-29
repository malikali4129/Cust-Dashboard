/**
 * Offline-First Data Layer for PWA
 * Uses existing localStorage cache from data.js
 */

(function() {
    'use strict';

    const CACHE_KEY = 'dashboard_data_cache';
    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    // Replicate cache functions from data.js
    function getLocalCache() {
        try {
            const data = localStorage.getItem(CACHE_KEY);
            return data ? JSON.parse(data) : {};
        } catch { return {}; }
    }

    function getLocalCacheData(key) {
        const cache = getLocalCache();
        return cache[key]?.data;
    }

    // Determine if data is stale (older than threshold)
    function isDataStale(key) {
        const cache = getLocalCache();
        if (!cache[key] || !cache[key].timestamp) return true;
        return Date.now() - cache[key].timestamp > STALE_THRESHOLD_MS;
    }

    const OfflineManager = {
        cache: {},

        /**
         * 🔧 FIX 3: Initialize cache from localStorage on load
         */
        initCache() {
            try {
                const cached = localStorage.getItem('app_cache');
                if (cached) {
                    this.cache = JSON.parse(cached);
                    console.log('[OfflineManager] Cache initialized');
                }
            } catch (err) {
                console.warn('[OfflineManager] Cache init failed:', err.message);
                this.cache = {};
            }
        },

        /**
         * 🔧 FIX 1: Get cached data by key
         */
        get(key) {
            return this.cache[key] || [];
        },

        /**
         * Check if key has cached data
         */
        has(key) {
            return key in this.cache && Array.isArray(this.cache[key]) && this.cache[key].length > 0;
        },

        /**
         * Initialize - loads cached data first, then fetches fresh data if online
         */
        async init(options = {}) {
            // 🔧 FIX 3: Auto-initialize cache from localStorage
            this.initCache();

            const opts = {
                loadStats: true,
                loadAnnouncements: true,
                loadAssignments: true,
                loadDeadlines: true,
                loadQuizzes: true,
                ...options
            };

            console.log('[OfflineManager] Initializing...');
            setupConnectivityListeners();

            // Load cached data first (instant, works offline)
            if (opts.loadStats && getLocalCacheData('stats')) {
                updateStatsUI(getLocalCacheData('stats'));
                console.log('[OfflineManager] Stats from cache');
            }
            if (opts.loadAnnouncements && getLocalCacheData('announcements_list_all')) {
                updateAnnouncementsUI(getLocalCacheData('announcements_list_all'));
            }
            if (opts.loadAssignments && getLocalCacheData('assignments_list_all')) {
                updateAssignmentsUI(getLocalCacheData('assignments_list_all'));
            }
            if (opts.loadDeadlines && getLocalCacheData('deadlines_list_all')) {
                updateDeadlinesUI(getLocalCacheData('deadlines_list_all'));
            }
            if (opts.loadQuizzes && getLocalCacheData('quizzes_list_all')) {
                updateQuizzesUI(getLocalCacheData('quizzes_list_all'));
            }

            // Fetch fresh if online
            if (navigator.onLine) {
                console.log('[OfflineManager] Online - fetching fresh data...');
                this.fetchAndCacheData(opts);
            } else {
                console.log('[OfflineManager] Offline - using cached data');
                updateConnectionUI(false);
            }
        },

        /**
         * Fetch fresh data from Supabase and cache it
         */
        async fetchAndCacheData(options = {}) {
            if (!navigator.onLine) {
                console.log('[OfflineManager] Offline - skipping fetch');
                return;
            }

            console.log('[OfflineManager] Fetching fresh data...');

            try {
                const [stats, announcements, assignments, deadlines, quizzes] = await Promise.all([
                    DashboardData.getStats(),
                    DashboardData.getAnnouncements(),
                    DashboardData.getAssignments(),
                    DashboardData.getDeadlines(),
                    DashboardData.getQuizzes()
                ]);

                // 🔧 FIX 2: Store structured cache for easy retrieval
                const cacheData = {
                    stats,
                    announcements,
                    assignments,
                    deadlines,
                    quizzes
                };
                localStorage.setItem('app_cache', JSON.stringify(cacheData));

                updateStatsUI(stats);
                updateAnnouncementsUI(announcements);
                updateAssignmentsUI(assignments);
                updateDeadlinesUI(deadlines);
                updateQuizzesUI(quizzes);
                updateConnectionUI(true);
                console.log('[OfflineManager] Data updated and cached');
            } catch (err) {
                console.warn('[OfflineManager] Fetch failed:', err.message);
            }
        },

        getCachedData: getLocalCacheData,
        hasCache: (key) => !!getLocalCacheData(key),
        isCacheStale: isDataStale,
        isOnline: () => navigator.onLine
    };

    function updateConnectionUI(online) {
        document.body.classList.toggle('is-offline', !online);
        document.querySelectorAll('[data-connection-state]').forEach(el => {
            el.textContent = online ? 'Online' : 'Offline';
        });
    }

    function setupConnectivityListeners() {
        window.addEventListener('online', () => {
            console.log('[OfflineManager] Back online');
            updateConnectionUI(true);
            if (window.DashboardUtils?.showToast) {
                DashboardUtils.showToast('Connection restored.', 'success');
            }
            OfflineManager.fetchAndCacheData();
        });

        window.addEventListener('offline', () => {
            console.log('[OfflineManager] Offline');
            updateConnectionUI(false);
            if (window.DashboardUtils?.showToast) {
                DashboardUtils.showToast('Offline. Using cached data.', 'warning');
            }
        });
    }

    function updateStatsUI(stats) {
        if (!stats) return;
        const mappings = {
            'stat-announcements': stats.totalAnnouncements,
            'stat-pending': stats.pendingAssignments,
            'stat-deadlines': stats.upcomingDeadlines,
            'stat-quizzes': stats.totalQuizzes
        };
        Object.entries(mappings).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        });
    }

    function updateAnnouncementsUI(items) {
        const container = document.getElementById('announcements-list');
        if (!container) return;
        if (!items?.length) {
            container.innerHTML = '<div class="empty-state"><h3>No announcements</h3></div>';
            return;
        }
        container.innerHTML = items.slice(0, 5).map(item => `
            <button class="info-card" onclick="openDetailModal('announcement', '${item.id}')">
                <div class="info-card-top">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <time>${DashboardUtils.getRelativeTime(item.date)}</time>
                </div>
                <p>${DashboardUtils.escapeHtml(item.content)}</p>
            </button>
        `).join('');
    }

    function updateAssignmentsUI(items) {
        const container = document.getElementById('assignments-list');
        if (!container) return;
        if (!items?.length) {
            container.innerHTML = '<div class="empty-state"><h3>No assignments</h3></div>';
            return;
        }
        container.innerHTML = items.slice(0, 4).map(item => `
            <button class="info-card" onclick="openDetailModal('assignment', '${item.id}')">
                <div class="info-card-top">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <span class="badge badge-${item.status}">${item.status}</span>
                </div>
                <div class="card-meta">
                    <span>${DashboardUtils.formatDate(item.deadline)}</span>
                </div>
            </button>
        `).join('');
    }

    function updateDeadlinesUI(items) {
        const container = document.getElementById('deadlines-list');
        if (!container) return;
        if (!items?.length) {
            container.innerHTML = '<div class="empty-state"><h3>No deadlines</h3></div>';
            return;
        }
        container.innerHTML = items.slice(0, 5).map(item => {
            const d = DashboardUtils.formatDateShort(item.date);
            return `
                <button class="info-card compact-card" onclick="openDetailModal('deadline', '${item.id}')">
                    <div class="timeline-date"><strong>${d.day}</strong><span>${d.month}</span></div>
                    <div class="timeline-copy">
                        <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                        <p>${item.category || 'General'}</p>
                    </div>
                </button>
            `;
        }).join('');
    }

    function updateQuizzesUI(items) {
        const container = document.getElementById('quizzes-list');
        if (!container) return;
        if (!items?.length) {
            container.innerHTML = '<div class="empty-state"><h3>No quizzes</h3></div>';
            return;
        }
        container.innerHTML = items.slice(0, 4).map(item => `
            <button class="info-card" onclick="openDetailModal('quiz', '${item.id}')">
                <div><h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <p>${item.subject || 'General'}</p>
                </div>
                <div class="card-meta right">
                    <small>${DashboardUtils.formatLongDate(item.date)}</small>
                </div>
            </button>
        `).join('');
    }

    window.OfflineManager = OfflineManager;
    console.log('[OfflineManager] Module loaded');
})();
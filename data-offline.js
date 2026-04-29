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
        _isFetching: false,

        /**
         * 🔧 FIX 3: Initialize cache from localStorage on load
         */
        initCache() {
            try {
                // Try structured cache first (app_cache)
                const appCache = localStorage.getItem('app_cache');
                if (appCache) {
                    this.cache = JSON.parse(appCache);
                    console.log('[OfflineManager] Loaded app_cache');
                    return;
                }

                // Fallback: merge legacy per-key dashboard_data_cache entries
                const raw = localStorage.getItem(CACHE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    // Populate common keys if present - extract .data from wrapped structure
                    this.cache = {};
                    if (parsed.stats?.data) this.cache.stats = parsed.stats.data;

                    const pickList = (table) => {
                        const keys = Object.keys(parsed).filter(k => k.startsWith(`${table}_list_`));
                        if (keys.length === 0) return null;
                        // Prefer 'all' variant if present
                        const allKey = keys.find(k => k.includes('_list_all_')) || keys[0];
                        return parsed[allKey]?.data || parsed[allKey];
                    };

                    const a = pickList('announcements');
                    if (a) this.cache.announcements = a;
                    const asg = pickList('assignments');
                    if (asg) this.cache.assignments = asg;
                    const d = pickList('deadlines');
                    if (d) this.cache.deadlines = d;
                    const q = pickList('quizzes');
                    if (q) this.cache.quizzes = q;

                    console.log('[OfflineManager] Merged dashboard_data_cache into cache');
                    return;
                }

                // Nothing found
                this.cache = {};
            } catch (err) {
                console.warn('[OfflineManager] Cache init failed:', err.message);
                this.cache = {};
            }
        },

        /**
         * 🔧 FIX 1: Get cached data by key
         */
        get(key) {
            if (key in this.cache) return this.cache[key];
            // Try direct localStorage lookup for raw keys (e.g., 'stats' or list keys)
            try {
                const raw = localStorage.getItem(CACHE_KEY);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                if (parsed[key]) return parsed[key];
                // try list-style lookup for tables
                const table = key;
                const listKey = Object.keys(parsed).find(k => k.startsWith(`${table}_list_`));
                if (listKey) return parsed[listKey];
            } catch (err) {
                // ignore
            }
            return [];
        },

        /**
         * Check if key has cached data
         */
        has(key) {
            const val = this.get(key);
            return Array.isArray(val) ? val.length > 0 : !!val;
        },

        /**
         * Initialize - loads cached data first, then fetches fresh data if online
         */
        async init(options = {}) {
            // Auto-initialize cache from localStorage
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
            // Prefer the structured app_cache first
            const cached = this.cache.stats ? this.cache : null;
            const statsCached = cached?.stats || getLocalCacheData('stats');

            if (opts.loadStats && statsCached) {
                // Use renderStats (creates full grid) instead of updateStatsUI
                if (typeof renderStats === 'function') {
                    renderStats(statsCached);
                    console.log('[OfflineManager] Stats from cache (renderStats)');
                } else {
                    // Fallback to legacy updateStatsUI if renderStats not available
                    updateStatsUI(statsCached);
                }
            }

            const announcementsCached = cached?.announcements || getLocalCacheData('announcements_list_all');
            // Fallback to legacy cache lookup
            const annLegacy = !announcementsCached ? (() => {
                try {
                    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                    const key = Object.keys(raw).find(k => k.startsWith('announcements_list_'));
                    return key ? raw[key] : null;
                } catch { return null; }
            })() : null;

            if (opts.loadAnnouncements && (announcementsCached || annLegacy)) {
                if (typeof renderAnnouncements === 'function') {
                    renderAnnouncements(announcementsCached || annLegacy);
                } else {
                    updateAnnouncementsUI(announcementsCached || annLegacy);
                }
            }

            const assignmentsCached = cached?.assignments || getLocalCacheData('assignments_list_all');
            const asgLegacy = !assignmentsCached ? (() => {
                try {
                    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                    const key = Object.keys(raw).find(k => k.startsWith('assignments_list_'));
                    return key ? raw[key] : null;
                } catch { return null; }
            })() : null;

            if (opts.loadAssignments && (assignmentsCached || asgLegacy)) {
                if (typeof renderAssignments === 'function') {
                    renderAssignments(assignmentsCached || asgLegacy);
                } else {
                    updateAssignmentsUI(assignmentsCached || asgLegacy);
                }
            }

            const deadlinesCached = cached?.deadlines || getLocalCacheData('deadlines_list_all');
            const dlLegacy = !deadlinesCached ? (() => {
                try {
                    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                    const key = Object.keys(raw).find(k => k.startsWith('deadlines_list_'));
                    return key ? raw[key] : null;
                } catch { return null; }
            })() : null;

            if (opts.loadDeadlines && (deadlinesCached || dlLegacy)) {
                if (typeof renderDeadlines === 'function') {
                    renderDeadlines(deadlinesCached || dlLegacy);
                } else {
                    updateDeadlinesUI(deadlinesCached || dlLegacy);
                }
            }

            const quizzesCached = cached?.quizzes || getLocalCacheData('quizzes_list_all');
            const qzLegacy = !quizzesCached ? (() => {
                try {
                    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                    const key = Object.keys(raw).find(k => k.startsWith('quizzes_list_'));
                    return key ? raw[key] : null;
                } catch { return null; }
            })() : null;

            if (opts.loadQuizzes && (quizzesCached || qzLegacy)) {
                if (typeof renderQuizzes === 'function') {
                    renderQuizzes(quizzesCached || qzLegacy);
                } else {
                    updateQuizzesUI(quizzesCached || qzLegacy);
                }
            }

            // Fetch fresh if online (prefer data-layer flag)
            const online = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine;
            if (online) {
                console.log('[OfflineManager] Online - fetching fresh data...');
                this.fetchAndCacheData(opts);
            } else {
                console.log('[OfflineManager] Offline - using cached data');
                updateConnectionUI(false);
                // Try to show last synced time even when offline
                if (typeof updateMeta === 'function') {
                    updateMeta().catch(() => {});
                }
            }
        },

        /**
         * Fetch fresh data from Supabase and cache it
         */
        async fetchAndCacheData(options = {}) {
            const prevOnline = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : false;

            // If a full refresh is scheduled from reconnect, skip lightweight fetches
            if (!options?.runFullRefresh && window._suppressNonFullFetchUntil && Date.now() < window._suppressNonFullFetchUntil) {
                console.log('[OfflineManager] Skipping non-full fetch due to pending full refresh');
                return;
            }

            if (!navigator.onLine) {
                console.log('[OfflineManager] Offline - skipping fetch');
                return;
            }

            if (this._isFetching) {
                console.log('[OfflineManager] Fetch already in progress - skipping');
                return;
            }

            this._isFetching = true;
            console.log('[OfflineManager] Fetching fresh data...');

            try {
                // Always fetch data first (needed for both normal and full refresh)
                const [stats, announcements, assignments, deadlines, quizzes] = await Promise.all([
                    DashboardData.getStats(),
                    DashboardData.getAnnouncements(),
                    DashboardData.getAssignments(),
                    DashboardData.getDeadlines(),
                    DashboardData.getQuizzes()
                ]);

                // Store structured cache for easy retrieval (always save)
                const cacheData = { stats, announcements, assignments, deadlines, quizzes };
                try {
                    localStorage.setItem('app_cache', JSON.stringify(cacheData));
                } catch (err) {
                    console.warn('[OfflineManager] Failed to save app_cache:', err?.message || err);
                }

                // If this is a full refresh (reconnection), skip initial render - the full refresh block handles everything
                if (options?.runFullRefresh === true) {
                    // Data fetched and cached - skip rendering here, full refresh block handles UI below
                } else {
                    // Normal update: render the fetched data using render functions
                    if (typeof renderStats === 'function') {
                        renderStats(stats);
                    } else {
                        updateStatsUI(stats);
                    }
                    if (typeof renderAnnouncements === 'function') {
                        renderAnnouncements(announcements);
                    } else {
                        updateAnnouncementsUI(announcements);
                    }
                    if (typeof renderAssignments === 'function') {
                        renderAssignments(assignments);
                    } else {
                        updateAssignmentsUI(assignments);
                    }
                    if (typeof renderDeadlines === 'function') {
                        renderDeadlines(deadlines);
                    } else {
                        updateDeadlinesUI(deadlines);
                    }
                    if (typeof renderQuizzes === 'function') {
                        renderQuizzes(quizzes);
                    } else {
                        updateQuizzesUI(quizzes);
                    }
                    updateConnectionUI(true);

                    // Update server-dot based on whether the data layer reports online
                    try {
                        const dot = document.getElementById('server-dot');
                        if (dot) {
                            const live = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine;
                            dot.classList.toggle('live', live);
                        }
                    } catch (e) {
                        // ignore
                    }

                    // Update metadata (last-updated, timezone)
                    try {
                        if (typeof updateMeta === 'function') {
                            await updateMeta();
                        }
                    } catch (e) {
                        // Non-fatal - meta may still be from cache
                    }
                }

                // If requested by caller (reconnection), render using already-fetched data (no re-fetch needed)
                if (options?.runFullRefresh === true) {
                    try {
                        // Clear legacy cache to force fresh reads on next normal fetch
                        if (window.DashboardData && typeof window.DashboardData.clearLocalCache === 'function') {
                            window.DashboardData.clearLocalCache();
                        }

                        // Update meta with fresh settings
                        if (typeof updateMeta === 'function') await updateMeta();

                        // Render stats: prefer renderStats (creates full grid), fallback to updateStatsUI
                        if (typeof renderStats === 'function') {
                            renderStats(stats);
                        } else if (typeof updateStatsUI === 'function') {
                            updateStatsUI(stats);
                        }
                        if (typeof setServerLiveState === 'function') {
                            setServerLiveState(typeof window.DashboardOnline !== 'undefined' ? !!window.DashboardOnline : navigator.onLine);
                        }

                        // Render content sections using render functions
                        if (typeof renderAnnouncements === 'function') renderAnnouncements(announcements);
                        if (typeof renderAssignments === 'function') renderAssignments(assignments);
                        if (typeof renderDeadlines === 'function') renderDeadlines(deadlines);
                        if (typeof renderQuizzes === 'function') renderQuizzes(quizzes);
                    } catch (e) {
                        console.warn('[OfflineManager] Silent full refresh failed:', e?.message || e);
                    }
                }

                console.log('[OfflineManager] Data updated and cached');
            } catch (err) {
                console.warn('[OfflineManager] Fetch failed:', err?.message || err);
                // Mark data-layer offline
                try { window.DashboardOnline = false; } catch (e) {}
                try {
                    const dot = document.getElementById('server-dot');
                    if (dot) dot.classList.remove('live');
                } catch (e) {}
            } finally {
                this._isFetching = false;
            }
        },

        getCachedData: getLocalCacheData,
        hasCache: (key) => !!getLocalCacheData(key),
        isCacheStale: isDataStale,
        isOnline: () => (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine
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
            // Do not trigger fetch here — `script.js` centralizes reconnection handling
        });

        window.addEventListener('offline', () => {
            console.log('[OfflineManager] Offline');
            updateConnectionUI(false);
        });
    }

    function updateStatsUI(stats) {
        if (!stats) return;
        const mappings = {
            'stat-announcements': stats.totalAnnouncements,
            'stat-pending': stats.pendingAssignments,
            'stat-deadlines': stats.upcomingDeadlines,
            'stat-quizzes': stats.upcomingQuizzes
        };
        console.log('[updateStatsUI] Stats:', stats);
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
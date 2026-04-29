/**
 * University Dashboard - Student dashboard
 * Uses OfflineManager for offline-first data loading
 */

const dashboardState = {
    timeZone: DashboardUtils.TIME_ZONE_LABEL,
    serverLive: false,
    lastUpdated: null,
    counts: {
        announcements: 0,
        assignments: 0,
        quizzes: 0
    }
};

function renderStats(stats) {
    const grid = document.getElementById('stats-grid');
    if (!grid) {
        return;
    }

    const cards = [
        { value: stats.totalAnnouncements, label: 'Announcements', tone: 'champagne' },
        { value: stats.pendingAssignments, label: 'Pending', tone: 'emerald' },
        { value: stats.upcomingDeadlines, label: 'Deadlines', tone: 'ruby' },
        { value: stats.upcomingQuizzes, label: 'Quizzes', tone: 'ink' }
    ];

    grid.innerHTML = cards.map((card) => `
        <article class="count-card stat-${card.tone}">
            <div class="count-value">${card.value}</div>
            <div class="count-label">${card.label}</div>
        </article>
    `).join('');
}

function renderAnnouncements(items) {
    const container = document.getElementById('announcements-list');
    if (!container) {
        return;
    }

    if (items.length === 0) {
        container.innerHTML = emptyState('No announcements yet', 'Fresh updates from your CR will appear here.');
        return;
    }

    container.innerHTML = items.map((item) => `
        <button class="info-card ${item.priority === 'high' ? 'is-urgent' : ''}" onclick="openDetailModal('announcement', '${item.id}')">
            <div class="info-card-top">
                <div>
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <span class="badge badge-${item.priority || 'normal'}">${DashboardUtils.escapeHtml(item.priority || 'normal')}</span>
                </div>
                <time>${DashboardUtils.getRelativeTime(item.date)}</time>
            </div>
            <p>${DashboardUtils.escapeHtml(item.content)}</p>
        </button>
    `).join('');
}

function renderAssignments(items) {
    const container = document.getElementById('assignments-list');
    if (!container) {
        return;
    }

    if (items.length === 0) {
        container.innerHTML = emptyState('No assignments', 'This section updates as soon as new work is published.');
        return;
    }

    container.innerHTML = items.map((item) => `
        <button class="info-card" onclick="openDetailModal('assignment', '${item.id}')">
            <div class="info-card-top">
                <div>
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
                </div>
                <span class="badge badge-${item.status}">${DashboardUtils.escapeHtml(item.status)}</span>
            </div>
            <p class="card-summary">${DashboardUtils.escapeHtml(item.description)}</p>
            <div class="card-meta">
                <span>${DashboardUtils.formatDate(item.deadline, dashboardState.timeZone)}</span>
                <span>${DashboardUtils.formatLongDate(item.deadline, dashboardState.timeZone)}</span>
            </div>
        </button>
    `).join('');
}

function renderDeadlines(items) {
    const container = document.getElementById('deadlines-list');
    if (!container) {
        return;
    }

    if (items.length === 0) {
        container.innerHTML = emptyState('No deadlines', 'You have breathing room right now.');
        return;
    }

    container.innerHTML = items.map((item) => {
        const dateInfo = DashboardUtils.formatDateShort(item.date, dashboardState.timeZone);
        return `
            <button class="info-card compact-card" onclick="openDetailModal('deadline', '${item.id}')">
                <div class="timeline-date">
                    <strong>${dateInfo.day}</strong>
                    <span>${dateInfo.month}</span>
                </div>
                <div class="timeline-copy">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <p>${DashboardUtils.escapeHtml(item.category || 'General')} . ${DashboardUtils.formatLongDate(item.date, dashboardState.timeZone)}</p>
                </div>
                <span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span>
            </button>
        `;
    }).join('');
}

function renderQuizzes(items) {
    const container = document.getElementById('quizzes-list');
    if (!container) {
        return;
    }

    if (items.length === 0) {
        container.innerHTML = emptyState('No quizzes scheduled', 'When a new quiz is posted, it lands here first.');
        return;
    }

    container.innerHTML = items.map((item) => `
        <button class="info-card" onclick="openDetailModal('quiz', '${item.id}')">
            <div>
                <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
            </div>
            <div class="card-meta right">
                <strong>${item.totalMarks || '-'} marks</strong>
                <span>${item.duration} min</span>
                <small>${DashboardUtils.formatLongDate(item.date, dashboardState.timeZone)}</small>
            </div>
        </button>
    `).join('');
}

function emptyState(title, copy) {
    return `
        <div class="empty-state">
            <h3>${DashboardUtils.escapeHtml(title)}</h3>
            <p>${DashboardUtils.escapeHtml(copy)}</p>
        </div>
    `;
}

async function renderSection(renderFn, loader, fallbackId) {
    try {
        const data = await loader();
        renderFn(data);
    } catch (error) {
        const container = document.getElementById(fallbackId);
        if (container) {
            container.innerHTML = emptyState('Could not load this section', 'Refresh when your connection is back.');
        }
    }
}

async function updateMeta() {
    try {
        const settings = await DashboardData.getSettings();
        dashboardState.timeZone = settings.timeZone || DashboardUtils.TIME_ZONE_LABEL;
        DashboardUtils.setActiveTimeZone(dashboardState.timeZone);

        const updated = document.getElementById('last-updated');
        // Prefer the data-layer connectivity flag when available
        const online = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine;
        // If offline (data-layer or browser), show a clear offline indicator
        if (!online) {
            if (updated) updated.textContent = 'Offline';
            setServerLiveState(false);
            return;
        }

        if (updated) {
            updated.textContent = settings.lastUpdated
                ? DashboardUtils.getRelativeTime(settings.lastUpdated)
                : 'Pending';
        }
        setServerLiveState(online);
    } catch (error) {
        console.warn('[updateMeta] Settings fetch failed:', error.message);
        DashboardUtils.setActiveTimeZone(DashboardUtils.TIME_ZONE_LABEL);
        const updated = document.getElementById('last-updated');
        if (updated) {
            updated.textContent = 'Sync pending';
        }
        throw error;
    }
}

function setServerLiveState(isLive) {
    dashboardState.serverLive = isLive;
    const dot = document.getElementById('server-dot');
    if (dot) {
        dot.classList.toggle('live', isLive);
    }
}

async function refreshDashboard() {
    // Cooldown check - 30 seconds
    const now = Date.now();
    const lastRefresh = window._lastRefreshTime || 0;
    if (now - lastRefresh < 30000) {
        const remaining = Math.ceil((30000 - (now - lastRefresh)) / 1000);
        DashboardUtils.showToast(`Wait ${remaining}s before refreshing again`, 'warning');
        return;
    }
    window._lastRefreshTime = now;

    DashboardUtils.showToast('Refreshing data...', 'info');
    // Clear cache and reload all data
    DashboardData.clearLocalCache();
    await updateMeta();
    const statsResult = await DashboardData.getStats();
    renderStats(statsResult);
        setServerLiveState(typeof window.DashboardOnline !== 'undefined' ? !!window.DashboardOnline : navigator.onLine);
    // Reload all sections
    renderSection(renderAnnouncements, () => DashboardData.getAnnouncements({ limit: 5 }), 'announcements-list');
    renderSection(renderAssignments, () => DashboardData.getAssignments({ limit: 4 }), 'assignments-list');
    renderSection(renderDeadlines, () => DashboardData.getDeadlines({ limit: 5 }), 'deadlines-list');
    renderSection(renderQuizzes, () => DashboardData.getQuizzes({ limit: 4 }), 'quizzes-list');
    DashboardUtils.showToast('Data refreshed!', 'success');
}

async function openDetailModal(type, id) {
    const title = document.getElementById('detail-modal-title');
    const body = document.getElementById('detail-modal-body');
    if (!title || !body) {
        return;
    }

    body.innerHTML = '<div class="panel-loading">Loading details...</div>';
    DashboardUtils.openModal('detail-modal');

    try {
        let item;

        if (type === 'announcement') {
            item = (await DashboardData.getAnnouncements()).find((entry) => entry.id === id);
            title.textContent = item.title;
            body.innerHTML = `
                <div class="detail-stack">
                    <span class="badge badge-${item.priority || 'normal'}">${DashboardUtils.escapeHtml(item.priority || 'normal')}</span>
                    <p>${DashboardUtils.escapeHtml(item.content)}</p>
                    <small>${DashboardUtils.formatDateTime(item.date, dashboardState.timeZone)}</small>
                </div>
            `;
            return;
        }

        if (type === 'assignment') {
            item = (await DashboardData.getAssignments()).find((entry) => entry.id === id);
            title.textContent = item.title;
            body.innerHTML = `
                <div class="detail-stack">
                    <span class="badge badge-${item.status}">${DashboardUtils.escapeHtml(item.status)}</span>
                    <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
                    <p>${DashboardUtils.escapeHtml(item.description)}</p>
                    <small>${DashboardUtils.formatDateTime(item.deadline, dashboardState.timeZone)}</small>
                </div>
            `;
            return;
        }

        if (type === 'deadline') {
            item = (await DashboardData.getDeadlines()).find((entry) => entry.id === id);
            title.textContent = item.title;
            body.innerHTML = `
                <div class="detail-stack">
                    <span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span>
                    <p>${DashboardUtils.escapeHtml(item.category || 'General')}</p>
                    <small>${DashboardUtils.formatDateTime(item.date, dashboardState.timeZone)}</small>
                </div>
            `;
            return;
        }

        item = (await DashboardData.getQuizzes()).find((entry) => entry.id === id);
        title.textContent = item.title;
        body.innerHTML = `
            <div class="detail-stack">
                <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
                <small>${DashboardUtils.formatDateTime(item.date, dashboardState.timeZone)}</small>
                <small>${item.duration} min . ${item.totalMarks || '-'} marks</small>
            </div>
        `;
    } catch (error) {
        body.innerHTML = '<div class="panel-loading error">Could not load details.</div>';
    }
}

function openFeedbackModal() {
    const form = document.getElementById('feedback-form');
    if (form) {
        form.reset();
    }
    const ratingInput = document.getElementById('feedback-rating');
    if (ratingInput) {
        ratingInput.value = '';
    }
    updateStarDisplay(0);
    DashboardUtils.openModal('feedback-modal');
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#feedback-stars .star');
    stars.forEach((star) => {
        const value = Number(star.dataset.value);
        star.classList.toggle('is-filled', value <= rating);
    });
}

function initStarRating() {
    const container = document.getElementById('feedback-stars');
    const ratingInput = document.getElementById('feedback-rating');
    if (!container || !ratingInput) {
        return;
    }

    const stars = container.querySelectorAll('.star');
    stars.forEach((star) => {
        star.addEventListener('click', () => {
            const value = Number(star.dataset.value);
            ratingInput.value = value;
            updateStarDisplay(value);
        });

        star.addEventListener('mouseenter', () => {
            const value = Number(star.dataset.value);
            updateStarDisplay(value);
        });
    });

    container.addEventListener('mouseleave', () => {
        const currentRating = Number(ratingInput.value) || 0;
        updateStarDisplay(currentRating);
    });
}

async function submitFeedback() {
    const form = document.getElementById('feedback-form');
    if (!form) {
        return;
    }

    const formData = Object.fromEntries(new FormData(form).entries());

    const nameError = DashboardUtils.validateLength(formData.name, 1, 100);
    if (nameError) {
        DashboardUtils.showToast(`Name: ${nameError}`, 'error');
        return;
    }

    const suggestionError = DashboardUtils.validateLength(formData.suggestion, 5, 1000);
    if (suggestionError) {
        DashboardUtils.showToast(`Suggestion: ${suggestionError}`, 'error');
        return;
    }

    const rating = Number(formData.rating);
    if (!rating || rating < 1 || rating > 5) {
        DashboardUtils.showToast('Please select a star rating.', 'error');
        return;
    }

    const feedbackOnline = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine;
    if (!feedbackOnline) {
        DashboardUtils.showToast('You are offline. Feedback requires a connection.', 'warning');
        return;
    }

    try {
        await DashboardData.addFeedback({
            name: formData.name,
            suggestion: formData.suggestion,
            rating
        });
        DashboardUtils.showToast('Thank you for your feedback!', 'success');
        DashboardUtils.closeModal('feedback-modal');
        form.reset();
        updateStarDisplay(0);
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not submit feedback.', 'error');
    }
}

async function initDashboard(showLoading = true) {
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid && showLoading) {
        statsGrid.innerHTML = '<div class="panel-loading">Loading dashboard...</div>';
    }

    // ─── OFFLINE-FIRST: Load cached data first, then fetch fresh in background ───
    // This ensures we never show empty state if cached data exists
    await OfflineManager.init({
        loadStats: true,
        loadAnnouncements: true,
        loadAssignments: true,
        loadDeadlines: true,
        loadQuizzes: true
    });

    // After OfflineManager.init(), UI is already populated with cached data
    // Get fresh stats for state tracking
    try {
        await updateMeta();
        const statsResult = await DashboardData.getStats();
        renderStats(statsResult);
            setServerLiveState(typeof window.DashboardOnline !== 'undefined' ? !!window.DashboardOnline : navigator.onLine);
        // Store counts for change detection
        dashboardState.counts = {
            announcements: statsResult.totalAnnouncements || 0,
            assignments: statsResult.pendingAssignments || 0,
            quizzes: statsResult.upcomingQuizzes || 0
        };
    } catch (error) {
        console.warn('[initDashboard] Could not load stats:', error.message);
    }

    // Load content sections - only when online (data-layer aware) to avoid overwriting cached UI
    const sectionsOnline = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine;
    if (sectionsOnline) {
        await Promise.all([
            renderSection(renderAnnouncements, () => DashboardData.getAnnouncements({ limit: 5 }), 'announcements-list'),
            renderSection(renderAssignments, () => DashboardData.getAssignments({ limit: 4 }), 'assignments-list'),
            renderSection(renderDeadlines, () => DashboardData.getDeadlines({ limit: 5 }), 'deadlines-list'),
            renderSection(renderQuizzes, () => DashboardData.getQuizzes({ limit: 4 }), 'quizzes-list')
        ]);
    } else {
        console.log('[initDashboard] Offline - using cached UI data');
    }

    // Start update polling for detecting new content
    startUpdatePolling();
    finalizeLoad();
}

function finalizeLoad() {
    try {
        const pre = document.getElementById('preloader');
        if (pre) {
            pre.classList.add('hidden');
            setTimeout(() => pre.remove(), 700);
        }
        // Add a ready class that triggers CSS entrance animations
        document.body.classList.add('dashboard-ready');
    } catch (err) {
        // ignore
    }
}

// ─── 15-second update polling ─────────────────────────────────────────────
let updatePollingInterval = null;
let pollingStarted = false;

async function startUpdatePolling() {
    // Only start once
    if (pollingStarted) {
        return;
    }
    pollingStarted = true;

    updatePollingInterval = setInterval(async () => {
        const pollingOnline = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine;
        if (!pollingOnline) {
            return; // Skip polling while offline
        }

        try {
            const settings = await DashboardData.getSettings();
            const currentLastUpdated = settings.lastUpdated || null;

            // Detect a real database change
            if (dashboardState.lastUpdated !== null &&
                currentLastUpdated !== null &&
                currentLastUpdated !== dashboardState.lastUpdated) {
                // Get new stats to compare counts
                const newStats = await DashboardData.getStats();
                const newCounts = {
                    announcements: newStats.totalAnnouncements || 0,
                    assignments: newStats.pendingAssignments || 0,
                    quizzes: newStats.upcomingQuizzes || 0
                };

                // Compare counts and show specific toasts
                const changes = [];
                if (newCounts.announcements > dashboardState.counts.announcements) {
                    const diff = newCounts.announcements - dashboardState.counts.announcements;
                    changes.push(`${diff} new announcement${diff > 1 ? 's' : ''}`);
                }
                if (newCounts.assignments > dashboardState.counts.assignments) {
                    const diff = newCounts.assignments - dashboardState.counts.assignments;
                    changes.push(`${diff} new assignment${diff > 1 ? 's' : ''}`);
                }
                if (newCounts.quizzes > dashboardState.counts.quizzes) {
                    const diff = newCounts.quizzes - dashboardState.counts.quizzes;
                    changes.push(`${diff} new quiz${diff > 1 ? 'zes' : ' added'}`);
                }

                // Show toasts for changes (max 2 toasts)
                if (changes.length > 0) {
                    for (const change of changes.slice(0, 2)) {
                        DashboardUtils.showToast(change, 'success');
                    }
                } else {
                    DashboardUtils.showToast('Dashboard updated', 'success');
                }

                // Update state and refresh dashboard
                dashboardState.lastUpdated = currentLastUpdated;
                dashboardState.counts = newCounts;

                // Re-fetch data without showing preloader
                await initDashboard(false);
            }
        } catch (error) {
            // Check for session expired / auth errors
            const errorMsg = error?.message || '';
            if (errorMsg.includes('Session expired') || errorMsg.includes('login') || errorMsg.includes('auth') || errorMsg.includes('refresh')) {
                // Clear session from sessionStorage
                sessionStorage.removeItem('admin_session');
                DashboardUtils.showToast('Session expired. Please login again.', 'error');
                // Redirect to admin login page
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 2000);
                return;
            }
            // Network error — ignore silently, next poll will retry
        }
    }, 5000);
}

// Offline detection handled centrally in script.js initConnectivity

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initStarRating();
});
window.openDetailModal = openDetailModal;
window.openFeedbackModal = openFeedbackModal;
window.submitFeedback = submitFeedback;

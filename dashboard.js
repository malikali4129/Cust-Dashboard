/**
 * University Dashboard - Student dashboard
 */

const dashboardState = {
    timeZone: DashboardUtils.TIME_ZONE_LABEL,
    serverLive: false,
    lastUpdated: null
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
        if (updated) {
            updated.textContent = settings.lastUpdated
                ? DashboardUtils.getRelativeTime(settings.lastUpdated)
                : 'Pending';
        }
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
    setServerLiveState(true);
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

    if (!navigator.onLine) {
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

async function initDashboard() {
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = '<div class="panel-loading">Loading dashboard...</div>';
    }

    try {
        await updateMeta();
        // Load settings + stats in parallel; gracefully degrade if either fails
        const [settingsResult, statsResult] = await Promise.allSettled([
            DashboardData.getSettings(),
            DashboardData.getStats()
        ]);

        if (settingsResult.status === 'fulfilled') {
            dashboardState.lastUpdated = settingsResult.value.lastUpdated || null;
        } else {
            console.warn('[initDashboard] getSettings failed:', settingsResult.reason?.message);
        }

        if (statsResult.status === 'fulfilled') {
            renderStats(statsResult.value);
            setServerLiveState(true);
        } else {
            console.warn('[initDashboard] getStats failed:', statsResult.reason?.message);
        }

        await Promise.all([
            renderSection(renderAnnouncements, () => DashboardData.getAnnouncements({ limit: 5 }), 'announcements-list'),
            renderSection(renderAssignments, () => DashboardData.getAssignments({ limit: 4 }), 'assignments-list'),
            renderSection(renderDeadlines, () => DashboardData.getDeadlines({ limit: 5 }), 'deadlines-list'),
            renderSection(renderQuizzes, () => DashboardData.getQuizzes({ limit: 4 }), 'quizzes-list')
        ]);

        // Start update polling + offline detection only after initial load
        startUpdatePolling();
        initOfflineDetection();
        finalizeLoad();
    } catch (error) {
        console.error('[initDashboard] Load failed:', error.message || error);
        setServerLiveState(false);
        if (statsGrid) {
            statsGrid.innerHTML = `<div class="panel-loading error">${DashboardUtils.escapeHtml(error.message || 'Could not reach Supabase.')}</div>`;
        }
        DashboardUtils.showToast('Student data could not be loaded. ' + (error.message || ''), 'error');
        // Still start polling so the update prompt works when connection returns
        startUpdatePolling();
        initOfflineDetection();
        finalizeLoad();
    }
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

async function startUpdatePolling() {
    if (updatePollingInterval) {
        clearInterval(updatePollingInterval);
    }

    updatePollingInterval = setInterval(async () => {
        if (!navigator.onLine) {
            return; // Skip polling while offline
        }

        try {
            const settings = await DashboardData.getSettings();
            const currentLastUpdated = settings.lastUpdated || null;

            // Detect a real database change
            if (dashboardState.lastUpdated !== null &&
                currentLastUpdated !== null &&
                currentLastUpdated !== dashboardState.lastUpdated) {
                showUpdatePrompt();
                clearInterval(updatePollingInterval);
            }
        } catch (_) {
            // Network error — ignore silently, next poll will retry
        }
    }, 15000);
}

function showUpdatePrompt() {
    const overlay = document.getElementById('update-modal-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function applyDashboardUpdate() {
    window.location.reload();
}

window.applyDashboardUpdate = applyDashboardUpdate;

// ─── Offline detection ──────────────────────────────────────────────────────
let isReloading = false;

function initOfflineDetection() {
    const banner = document.getElementById('offline-banner');

    const goOffline = () => {
        if (banner) {
            banner.classList.add('is-visible');
        }
    };

    const goOnline = () => {
        if (isReloading) return;
        if (banner) {
            banner.classList.remove('is-visible');
        }
        // Show "Back online" toast and reload to refresh data
        DashboardUtils.showToast('Back online — restarting to refresh data...', 'success');
        isReloading = true;
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    if (!navigator.onLine) {
        goOffline();
    }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initStarRating();
});
window.openDetailModal = openDetailModal;
window.openFeedbackModal = openFeedbackModal;
window.submitFeedback = submitFeedback;

/**
 * University Dashboard - Student dashboard
 * Updated to use cached data functions for offline support
 */

const dashboardState = {
    timeZone: DashboardUtils.TIME_ZONE_LABEL,
    serverLive: false
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
        const settings = await DashboardDataCached.getSettings();
        dashboardState.timeZone = settings.timeZone || DashboardUtils.TIME_ZONE_LABEL;
        DashboardUtils.setActiveTimeZone(dashboardState.timeZone);

        const updated = document.getElementById('last-updated');
        if (updated) {
            updated.textContent = settings.lastUpdated
                ? DashboardUtils.getRelativeTime(settings.lastUpdated)
                : 'Pending';
        }
    } catch (error) {
        DashboardUtils.setActiveTimeZone(DashboardUtils.TIME_ZONE_LABEL);
    }
}

function setServerLiveState(isLive) {
    dashboardState.serverLive = isLive;
    const dot = document.getElementById('server-dot');
    if (dot) {
        dot.classList.toggle('live', isLive);
    }
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
            item = (await DashboardDataCached.getAnnouncements()).find((entry) => entry.id === id);
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
            item = (await DashboardDataCached.getAssignments()).find((entry) => entry.id === id);
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
            item = (await DashboardDataCached.getDeadlines()).find((entry) => entry.id === id);
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

        item = (await DashboardDataCached.getQuizzes()).find((entry) => entry.id === id);
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

async function initDashboard() {
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = '<div class="panel-loading">Loading dashboard...</div>';
    }

    try {
        await updateMeta();
        const stats = await DashboardDataCached.getStats();
        renderStats(stats);
        setServerLiveState(true);

        await Promise.all([
            renderSection(renderAnnouncements, () => DashboardDataCached.getAnnouncements({ limit: 5 }), 'announcements-list'),
            renderSection(renderAssignments, () => DashboardDataCached.getAssignments({ limit: 4 }), 'assignments-list'),
            renderSection(renderDeadlines, () => DashboardDataCached.getDeadlines({ limit: 5 }), 'deadlines-list'),
            renderSection(renderQuizzes, () => DashboardDataCached.getQuizzes({ limit: 4 }), 'quizzes-list')
        ]);
    } catch (error) {
        setServerLiveState(false);
        if (statsGrid) {
            statsGrid.innerHTML = '<div class="panel-loading error">Could not reach Supabase. The app shell is available offline, but data requires a connection.</div>';
        }
        DashboardUtils.showToast('Student data could not be loaded.', 'error');
    }
}

// Listen for data updates to refresh UI
window.addEventListener('dashboard-data-updated', (event) => {
    const { dataType } = event.detail;
    console.log(`Data updated: ${dataType}`);
    
    // Refresh relevant sections when data is updated in background
    if (dataType === 'announcements') {
        renderSection(renderAnnouncements, () => DashboardDataCached.getAnnouncements({ limit: 5 }), 'announcements-list');
    } else if (dataType === 'assignments') {
        renderSection(renderAssignments, () => DashboardDataCached.getAssignments({ limit: 4 }), 'assignments-list');
    } else if (dataType === 'deadlines') {
        renderSection(renderDeadlines, () => DashboardDataCached.getDeadlines({ limit: 5 }), 'deadlines-list');
    } else if (dataType === 'quizzes') {
        renderSection(renderQuizzes, () => DashboardDataCached.getQuizzes({ limit: 4 }), 'quizzes-list');
    } else if (dataType === 'stats') {
        DashboardDataCached.getStats().then(stats => renderStats(stats));
    }
});

document.addEventListener('DOMContentLoaded', initDashboard);
window.openDetailModal = openDetailModal;

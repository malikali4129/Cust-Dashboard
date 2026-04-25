/**
 * University Dashboard - Student dashboard
 */

const dashboardState = {
    timeZone: DashboardUtils.TIME_ZONE_LABEL
};

function renderStats(stats) {
    const grid = document.getElementById('stats-grid');
    if (!grid) {
        return;
    }

    const cards = [
        { value: stats.totalAnnouncements, label: 'Live notices', tone: 'champagne' },
        { value: stats.pendingAssignments, label: 'Pending work', tone: 'emerald' },
        { value: stats.upcomingDeadlines, label: 'Deadline watch', tone: 'ruby' },
        { value: stats.upcomingQuizzes, label: 'Quiz schedule', tone: 'ink' }
    ];

    grid.innerHTML = cards.map((card) => `
        <article class="stat-card stat-${card.tone}">
            <div class="stat-value">${card.value}</div>
            <div class="stat-label">${card.label}</div>
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
        <article class="feed-card ${item.priority === 'high' ? 'is-urgent' : ''}">
            <div class="feed-card-top">
                <div>
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <span class="badge badge-${item.priority || 'normal'}">${DashboardUtils.escapeHtml(item.priority || 'normal')}</span>
                </div>
                <time>${DashboardUtils.getRelativeTime(item.date)}</time>
            </div>
            <p>${DashboardUtils.escapeHtml(item.content)}</p>
        </article>
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
        <article class="task-card">
            <div class="task-card-head">
                <div>
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
                </div>
                <span class="badge badge-${item.status}">${DashboardUtils.escapeHtml(item.status)}</span>
            </div>
            <p class="task-description">${DashboardUtils.escapeHtml(item.description)}</p>
            <div class="task-meta">
                <span>${DashboardUtils.formatDate(item.deadline, dashboardState.timeZone)}</span>
                <span>${DashboardUtils.formatLongDate(item.deadline, dashboardState.timeZone)}</span>
            </div>
        </article>
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
            <article class="timeline-item">
                <div class="timeline-date">
                    <strong>${dateInfo.day}</strong>
                    <span>${dateInfo.month}</span>
                </div>
                <div class="timeline-copy">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <p>${DashboardUtils.escapeHtml(item.category || 'General')} . ${DashboardUtils.formatLongDate(item.date, dashboardState.timeZone)}</p>
                </div>
                <span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span>
            </article>
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
        <article class="quiz-card">
            <div>
                <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
            </div>
            <div class="quiz-card-side">
                <strong>${item.totalMarks || '-'} marks</strong>
                <span>${item.duration} min</span>
                <small>${DashboardUtils.formatLongDate(item.date, dashboardState.timeZone)}</small>
            </div>
        </article>
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
                ? `Updated ${DashboardUtils.getRelativeTime(settings.lastUpdated)}`
                : 'Fresh sync pending';
        }
    } catch (error) {
        DashboardUtils.setActiveTimeZone(DashboardUtils.TIME_ZONE_LABEL);
    }
}

async function initDashboard() {
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = '<div class="panel-loading">Loading dashboard...</div>';
    }

    try {
        await updateMeta();
        const stats = await DashboardData.getStats();
        renderStats(stats);

        await Promise.all([
            renderSection(renderAnnouncements, () => DashboardData.getAnnouncements({ limit: 5 }), 'announcements-list'),
            renderSection(renderAssignments, () => DashboardData.getAssignments({ limit: 4 }), 'assignments-list'),
            renderSection(renderDeadlines, () => DashboardData.getDeadlines({ limit: 5 }), 'deadlines-list'),
            renderSection(renderQuizzes, () => DashboardData.getQuizzes({ limit: 4 }), 'quizzes-list')
        ]);
    } catch (error) {
        if (statsGrid) {
            statsGrid.innerHTML = '<div class="panel-loading error">Could not reach Supabase. The app shell is available offline, but data requires a connection.</div>';
        }
        DashboardUtils.showToast('Student data could not be loaded.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);

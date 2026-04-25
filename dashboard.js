/**
 * University Dashboard - Student View Logic
 * Renders all data dynamically from Supabase cloud database
 */

// ==================== RENDER STATS ====================

async function renderStats() {
    const stats = await DashboardData.getStats();
    const grid = document.getElementById('stats-grid');
    
    const statsConfig = [
        {
            icon: '📢',
            color: 'blue',
            value: stats.totalAnnouncements,
            label: 'Total Announcements'
        },
        {
            icon: '📝',
            color: 'orange',
            value: stats.pendingAssignments,
            label: 'Pending Assignments'
        },
        {
            icon: '⏰',
            color: 'red',
            value: stats.upcomingDeadlines,
            label: 'Upcoming Deadlines'
        },
        {
            icon: '❓',
            color: 'green',
            value: stats.upcomingQuizzes,
            label: 'Upcoming Quizzes'
        }
    ];
    
    grid.innerHTML = statsConfig.map(stat => `
        <div class="stat-card animate-fade-in">
            <div class="stat-icon ${stat.color}">
                ${stat.icon}
            </div>
            <div class="stat-info">
                <h3>${stat.value}</h3>
                <p>${stat.label}</p>
            </div>
        </div>
    `).join('');
}

// ==================== RENDER ANNOUNCEMENTS ====================

async function renderAnnouncements() {
    const announcements = await DashboardData.getAnnouncements();
    const container = document.getElementById('announcements-list');
    
    if (announcements.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 16px;">📭</div>
                <h3>No announcements yet</h3>
                <p>Check back later for updates from your CR</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = announcements.slice(0, 5).map(ann => `
        <div class="announcement-item ${ann.priority === 'high' ? 'high-priority' : ''} animate-fade-in">
            <div class="announcement-header">
                <div>
                    <div class="announcement-title">${escapeHtml(ann.title)}</div>
                    <span class="priority-badge ${ann.priority || 'normal'}">${ann.priority || 'normal'}</span>
                </div>
                <span class="announcement-date">${DashboardUtils.getRelativeTime(ann.date)}</span>
            </div>
            <div class="announcement-content">${escapeHtml(ann.content)}</div>
        </div>
    `).join('');
}

// ==================== RENDER ASSIGNMENTS ====================

async function renderAssignments() {
    const assignments = await DashboardData.getAssignments();
    const container = document.getElementById('assignments-list');
    
    if (assignments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 16px;">📝</div>
                <h3>No assignments yet</h3>
                <p>You're all caught up!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = assignments.map(asg => `
        <div class="assignment-card animate-fade-in">
            <div class="assignment-header">
                <div>
                    <div class="assignment-title">${escapeHtml(asg.title)}</div>
                    <div class="assignment-subject">${escapeHtml(asg.subject || 'General')}</div>
                </div>
                <span class="status-badge ${asg.status}">${asg.status}</span>
            </div>
            <div class="assignment-desc">${escapeHtml(asg.description)}</div>
            <div class="assignment-footer">
                <div class="deadline-info">
                    <span>📅</span>
                    <span>${DashboardUtils.formatDate(asg.deadline)}</span>
                </div>
                <span style="font-size: 0.85rem; color: var(--text-muted);">
                    ${formatDateDetailed(asg.deadline)}
                </span>
            </div>
        </div>
    `).join('');
}

// ==================== RENDER DEADLINES ====================

async function renderDeadlines() {
    const deadlines = await DashboardData.getDeadlines();
    const container = document.getElementById('deadlines-list');
    
    if (deadlines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 16px;">📅</div>
                <h3>No deadlines</h3>
                <p>Nothing due at the moment</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = deadlines.slice(0, 6).map(dl => {
        const dateInfo = DashboardUtils.formatDateShort(dl.date);
        const isOverdue = new Date(dl.date) < new Date();
        
        return `
            <div class="deadline-item animate-fade-in">
                <div class="deadline-date">
                    <div class="day">${dateInfo.day}</div>
                    <div class="month">${dateInfo.month}</div>
                </div>
                <div class="deadline-info" style="flex: 1;">
                    <h4>${escapeHtml(dl.title)}</h4>
                    <p>${escapeHtml(dl.category || 'General')} • ${DashboardUtils.formatDate(dl.date)}</p>
                </div>
                <span class="priority-badge ${dl.priority}">${dl.priority}</span>
            </div>
        `;
    }).join('');
}

// ==================== RENDER QUIZZES ====================

async function renderQuizzes() {
    const quizzes = await DashboardData.getQuizzes();
    const container = document.getElementById('quizzes-list');
    
    if (quizzes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 16px;">🎯</div>
                <h3>No quizzes scheduled</h3>
                <p>Enjoy the break!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = quizzes.slice(0, 5).map(quiz => `
        <div class="quiz-card animate-fade-in">
            <div class="quiz-info">
                <h4>${escapeHtml(quiz.title)}</h4>
                <p>${escapeHtml(quiz.subject || 'General')} • ${DashboardUtils.formatDate(quiz.date)}</p>
            </div>
            <div class="quiz-meta">
                <div style="font-weight: 600; color: var(--primary);">${quiz.totalMarks || '-'} marks</div>
                <div class="quiz-duration">⏱️ ${quiz.duration} min</div>
            </div>
        </div>
    `).join('');
}

// ==================== HELPERS ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateDetailed(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function updateLastUpdated() {
    const settings = await DashboardData.getSettings();
    const el = document.getElementById('last-updated');
    if (el && settings.lastUpdated) {
        el.textContent = `Last updated: ${DashboardUtils.getRelativeTime(settings.lastUpdated)}`;
    }
}

function updateThemeButton() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (text) text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

// ==================== INITIALIZATION ====================

async function initDashboard() {
    // Show loading state
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = '<div class="text-center" style="grid-column: 1/-1; padding: 40px; color: var(--text-muted);">Loading...</div>';
    }
    
    try {
        await Promise.all([
            renderStats(),
            renderAnnouncements(),
            renderAssignments(),
            renderDeadlines(),
            renderQuizzes()
        ]);
        await updateLastUpdated();
        updateThemeButton();
        
        // Show connection status
        if (DashboardData.isSupabaseConfigured && DashboardData.isSupabaseConfigured()) {
            DashboardUtils.showToast('Connected to cloud database!', 'success');
        } else {
            DashboardUtils.showToast('Running in local mode. Configure Supabase for cloud storage.', 'warning');
        }
    } catch (e) {
        console.error('Error loading dashboard:', e);
        DashboardUtils.showToast('Error loading data. Please refresh.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);

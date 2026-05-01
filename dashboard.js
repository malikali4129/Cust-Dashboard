/**
 * University Dashboard - Student dashboard
 * Uses OfflineManager for offline-first data loading
 */

const dashboardState = {
    timeZone: DashboardUtils.TIME_ZONE_LABEL,
    serverLive: false,
    lastUpdated: null,
    updatePolling: false,   // true while update is being applied (prevents re-trigger)
    counts: {
        announcements: 0,
        assignments: 0,
        quizzes: 0
    },
    // Pre-loaded full datasets — used by View All & detail modals so no extra API calls
    allData: {
        announcements: [],
        assignments: [],
        deadlines: [],
        quizzes: []
    }
};

// Session inactivity - expire after 5 minutes
const SESSION_INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms
let sessionActivityTimer = null;

function resetSessionActivityTimer() {
    // Clear existing timer
    if (sessionActivityTimer) {
        clearTimeout(sessionActivityTimer);
    }

    // Check if session exists
    const sessionStr = sessionStorage.getItem('dashboard_admin_session');
    if (!sessionStr) {
        return; // No session, nothing to track
    }

    // Set new timer to expire session after inactivity
    sessionActivityTimer = setTimeout(() => {
        // Session expired due to inactivity
        sessionStorage.removeItem('dashboard_admin_session');
        // Redirect to admin page
        window.location.href = 'admin.html';
    }, SESSION_INACTIVITY_TIMEOUT);
}

function setupSessionActivityListeners() {
    // Track user activity to reset timer
    const activityEvents = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
        document.addEventListener(event, resetSessionActivityTimer, { passive: true });
    });
}

function renderStats(stats) {
    const grid = document.getElementById('stats-grid');
    if (!grid) {
        return;
    }

    const cards = [
        { value: stats.totalAnnouncements, label: 'Announcements', tone: 'champagne', section: 'announcements' },
        { value: stats.pendingAssignments, label: 'Pending', tone: 'emerald', section: 'assignments' },
        { value: stats.upcomingDeadlines, label: 'Deadlines', tone: 'ruby', section: 'deadlines' },
        { value: stats.upcomingQuizzes, label: 'Quizzes', tone: 'ink', section: 'quizzes' }
    ];

    grid.innerHTML = cards.map((card) => `
        <article class="count-card stat-${card.tone}" onclick="scrollToSection('${card.section}')" style="cursor: pointer;">
            <div class="count-value">${card.value}</div>
            <div class="count-label">${card.label}</div>
        </article>
    `).join('');
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        section.focus();
    }
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

    container.innerHTML = items.slice(0, 3).map((item) => `
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

    container.innerHTML = items.slice(0, 3).map((item) => `
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

    container.innerHTML = items.slice(0, 3).map((item) => {
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

    container.innerHTML = items.slice(0, 3).map((item) => `
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

// ─── View All Modal ───────────────────────────────────────────────────────────
const VA_CACHE_KEY = 'va_cached_items';

const viewAllState = {
    currentSection: null,
    allItems: null,
    activeTab: 'pending',
    // Per-section cache — survives tab switches, wiped on new data or expiry
    cachedItems: {}
};

// ── View All cache helpers ────────────────────────────────────────────────────

function vaGetCached(section) {
    try {
        const raw = localStorage.getItem(VA_CACHE_KEY);
        if (!raw) return null;
        const { items } = JSON.parse(raw);
        if (!items) return null;
        const cached = items[section];
        if (!cached || cached.length === 0) return null;
        viewAllState.cachedItems[section] = cached;
        return cached;
    } catch {
        return null;
    }
}

function vaSetCached(section, items) {
    try {
        const raw = localStorage.getItem(VA_CACHE_KEY);
        const existing = raw ? JSON.parse(raw) : { items: {} };
        existing.items[section] = items;
        localStorage.setItem(VA_CACHE_KEY, JSON.stringify(existing));
        viewAllState.cachedItems[section] = items;
    } catch (e) {
        console.warn('[vaSetCached] localStorage write failed:', e.message);
    }
}

function vaClearCache() {
    try {
        localStorage.removeItem(VA_CACHE_KEY);
    } catch {}
    Object.keys(viewAllState.cachedItems).forEach(k => delete viewAllState.cachedItems[k]);
}

// Public: called by admin or when you want to force-refresh the View All cache
window.vaInvalidateCache = function () {
    vaClearCache();
};

function getItemStatus(item, section) {
    const completed = item.status === 'completed' || item.completed === true;
    return completed ? 'completed' : 'pending';
}

async function openViewAllModal(section) {
    const modal = document.getElementById('view-all-modal');
    const title = document.getElementById('view-all-modal-title');
    const body = document.getElementById('view-all-modal-body');

    if (!modal || !title || !body) return;

    viewAllState.currentSection = section;
    viewAllState.activeTab = 'pending';

    const titles = {
        announcements: 'Announcements',
        assignments: 'Assignments',
        deadlines: 'Deadlines',
        quizzes: 'Quizzes'
    };
    title.textContent = titles[section] || 'All Items';

    // Reset tab UI
    document.querySelectorAll('.view-all-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === 'pending');
    });

    body.innerHTML = '';
    renderViewAllSkeleton();
    DashboardUtils.openModal('view-all-modal');

    try {
        // Always serve from the pre-loaded in-memory store — zero API calls, always fresh
        const sectionData = dashboardState.allData[section] || [];
        viewAllState.allItems = sectionData;

        // Brief pause so skeleton shimmer shows, then stream items in progressively
        await new Promise(resolve => setTimeout(resolve, 1)); //reduuced skeleton render timing in view all seciton
        await renderViewAllBody('pending');
    } catch (error) {
        body.innerHTML = '<div class="panel-loading error">Could not load items.</div>';
    }
}

function renderViewAllSkeleton() {
    const body = document.getElementById('view-all-modal-body');
    if (!body) return;
    body.innerHTML = `
        <div class="view-all-skeleton">
            ${[1, 2, 3].map(() => '<div class="skeleton-item"></div>').join('')}
        </div>
    `;
    body.classList.add('scrollable');
}

async function renderViewAllBody(tab) {
    const body = document.getElementById('view-all-modal-body');
    if (!body) return;

    // Guard: if no data loaded yet, show skeleton
    if (!viewAllState.allItems || viewAllState.allItems.length === 0) {
        body.classList.add('scrollable');
        body.innerHTML = `
            <div class="view-all-skeleton">
                ${[1, 2, 3].map(() => '<div class="skeleton-item"></div>').join('')}
            </div>
        `;
        return;
    }

    viewAllState.activeTab = tab;

    // Update tab active states
    document.querySelectorAll('.view-all-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    const section = viewAllState.currentSection;
    const items = viewAllState.allItems || [];
    const filtered = items.filter(item => getItemStatus(item, section) === tab);

    if (filtered.length === 0) {
        body.classList.remove('scrollable');
        body.innerHTML = `
            <div class="view-all-empty">
                <div class="view-all-empty-icon">&#x2713;</div>
                <h4>No ${tab} items</h4>
                <p>${tab === 'pending' ? 'Nothing waiting on you right now.' : 'Completed items will appear here.'}</p>
            </div>
        `;
        return;
    }

    body.classList.add('scrollable');
    body.innerHTML = ''; // clear skeleton / previous content

    // Stream items in one by one with 400ms gaps — smooth and deliberate
    let index = 0;

    function insertNext() {
        if (index >= filtered.length) return;

        const html = renderViewAllItem(filtered[index], section);
        body.insertAdjacentHTML('beforeend', html);
        const el = body.lastElementChild;
        el.style.animationDelay = '0ms';
        el.classList.add('view-all-content');
        index++;

        if (index < filtered.length) {
            setTimeout(insertNext, 200);
        }
    }

    insertNext();
}

function renderViewAllItem(item, section) {
    const escapedTitle = DashboardUtils.escapeHtml(item.title || 'Untitled');
    const escapedContent = DashboardUtils.escapeHtml(item.content || item.description || '');

    if (section === 'announcements') {
        return `
            <button class="view-all-item" onclick="openDetailModal('announcement', '${item.id}')">
                <div class="view-all-item-header">
                    <h3>${escapedTitle}</h3>
                    <time>${DashboardUtils.getRelativeTime(item.date)}</time>
                </div>
                <p>${escapedContent}</p>
                <div class="view-all-item-meta">
                    <span class="badge badge-${item.priority || 'normal'}">${DashboardUtils.escapeHtml(item.priority || 'normal')}</span>
                </div>
            </button>
        `;
    }

    if (section === 'assignments') {
        return `
            <button class="view-all-item" onclick="openDetailModal('assignment', '${item.id}')">
                <div class="view-all-item-header">
                    <h3>${escapedTitle}</h3>
                    <span class="badge badge-${item.status}">${DashboardUtils.escapeHtml(item.status)}</span>
                </div>
                <p>${escapedContent}</p>
                <div class="view-all-item-meta">
                    <span>${DashboardUtils.formatLongDate(item.deadline, dashboardState.timeZone)}</span>
                    <span>${DashboardUtils.escapeHtml(item.subject || 'General')}</span>
                </div>
            </button>
        `;
    }

    if (section === 'deadlines') {
        const dateInfo = DashboardUtils.formatDateShort(item.date, dashboardState.timeZone);
        return `
            <button class="view-all-item" onclick="openDetailModal('deadline', '${item.id}')">
                <div class="view-all-item-header">
                    <h3>${escapedTitle}</h3>
                    <time>${dateInfo.day} ${dateInfo.month}</time>
                </div>
                <p>${escapedContent}</p>
                <div class="view-all-item-meta">
                    <span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span>
                    <span>${DashboardUtils.escapeHtml(item.category || 'General')}</span>
                    <span>${DashboardUtils.formatLongDate(item.date, dashboardState.timeZone)}</span>
                </div>
            </button>
        `;
    }

    // quizzes
    return `
        <button class="view-all-item" onclick="openDetailModal('quiz', '${item.id}')">
            <div class="view-all-item-header">
                <h3>${escapedTitle}</h3>
                <span>${item.totalMarks || '-'} marks</span>
            </div>
            <p>${escapedContent}</p>
            <div class="view-all-item-meta">
                <span>${item.duration} min</span>
                <span>${DashboardUtils.formatLongDate(item.date, dashboardState.timeZone)}</span>
                <span>${DashboardUtils.escapeHtml(item.subject || 'General')}</span>
            </div>
        </button>
    `;
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

        // Always sync dashboardState.lastUpdated so polling can detect future changes
        dashboardState.lastUpdated = settings.lastUpdated || null;

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

    // Reload all full datasets (no limit) into memory so View All & detail modals stay fresh
    const [ann, asg, dl, qz] = await Promise.all([
        DashboardData.getAnnouncements(),
        DashboardData.getAssignments(),
        DashboardData.getDeadlines(),
        DashboardData.getQuizzes()
    ]);
    dashboardState.allData.announcements = ann || [];
    dashboardState.allData.assignments   = asg || [];
    dashboardState.allData.deadlines     = dl || [];
    dashboardState.allData.quizzes       = qz || [];

    // Re-render preview cards (first 3 items only)
    renderAnnouncements(ann.slice(0, 3));
    renderAssignments(asg.slice(0, 3));
    renderDeadlines(dl.slice(0, 3));
    renderQuizzes(qz.slice(0, 3));
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
            item = dashboardState.allData.announcements.find((entry) => entry.id === id);
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
            item = dashboardState.allData.assignments.find((entry) => entry.id === id);
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
            item = dashboardState.allData.deadlines.find((entry) => entry.id === id);
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

        item = dashboardState.allData.quizzes.find((entry) => entry.id === id);
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
    // Check if admin session exists - if not, show login modal
    const sessionStr = sessionStorage.getItem('dashboard_admin_session');
    if (!sessionStr) {
        const loginModal = document.getElementById('login-required-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
        } else {
            const modal = document.createElement('div');
            modal.id = 'login-required-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3>Login Required</h3>
                        <button class="modal-close" type="button" onclick="closeLoginModal()">Close</button>
                    </div>
                    <div class="modal-body">
                        <p>Please login to submit feedback.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="window.location.href='admin.html'">Go to Login</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return;
    }

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

    // After OfflineManager.init(), UI is already populated with cached/fresh data
    // Get fresh stats for state tracking ONLY - don't re-render (OfflineManager already did)
    try {
        await updateMeta();
        const statsResult = await DashboardData.getStats();
        // Store counts only - don't call renderStats again
        dashboardState.counts = {
            announcements: statsResult.totalAnnouncements || 0,
            assignments: statsResult.pendingAssignments || 0,
            quizzes: statsResult.upcomingQuizzes || 0
        };
        const isOnline = (typeof window.DashboardOnline !== 'undefined') ? !!window.DashboardOnline : navigator.onLine;
        setServerLiveState(isOnline);
    } catch (error) {
        console.warn('[initDashboard] Could not load stats:', error.message);
    }

    // Pre-load FULL datasets into memory so View All & detail modals never need an API call
    // These are refreshed whenever the polling detects a database change
    try {
        const [ann, asg, dl, qz] = await Promise.all([
            DashboardData.getAnnouncements(),
            DashboardData.getAssignments(),
            DashboardData.getDeadlines(),
            DashboardData.getQuizzes()
        ]);
        dashboardState.allData.announcements = ann || [];
        dashboardState.allData.assignments   = asg || [];
        dashboardState.allData.deadlines    = dl || [];
        dashboardState.allData.quizzes      = qz || [];
    } catch (e) {
        console.warn('[initDashboard] Could not pre-load all data:', e.message);
    }

    // Content sections already rendered by OfflineManager - don't re-render

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
            if (currentLastUpdated !== dashboardState.lastUpdated) {
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

                // Update state FIRST to prevent re-triggering on next poll
                dashboardState.lastUpdated = currentLastUpdated;
                dashboardState.counts = newCounts;

                // Re-fetch ALL data (no limit) so View All & detail modals stay fresh
                const freshData = await Promise.all([
                    DashboardData.getAnnouncements(),
                    DashboardData.getAssignments(),
                    DashboardData.getDeadlines(),
                    DashboardData.getQuizzes()
                ]);

                // Update in-memory store — View All / detail read from here
                dashboardState.allData.announcements = freshData[0] || [];
                dashboardState.allData.assignments   = freshData[1] || [];
                dashboardState.allData.deadlines    = freshData[2] || [];
                dashboardState.allData.quizzes      = freshData[3] || [];

                // Render preview cards (first 3 items only)
                renderStats(newStats);
                renderAnnouncements(freshData[0].slice(0, 3));
                renderAssignments(freshData[1].slice(0, 3));
                renderDeadlines(freshData[2].slice(0, 3));
                renderQuizzes(freshData[3].slice(0, 3));
            }
        } catch (error) {
            // Check for session expired / auth errors
            const errorMsg = error?.message || '';
            if (errorMsg.includes('Session expired') || errorMsg.includes('login') || errorMsg.includes('auth') || errorMsg.includes('refresh')) {
                // Clear session from sessionStorage
                sessionStorage.removeItem('admin_session');
                // Open login modal instead of just a toast
                const loginOverlay = document.getElementById('login-required-overlay');
                if (loginOverlay) {
                    loginOverlay.classList.remove('hidden');
                } else {
                    // Create modal if not exists
                    const modal = document.createElement('div');
                    modal.id = 'login-required-overlay';
                    modal.className = 'modal-overlay';
                    modal.innerHTML = `
                        <div class="modal">
                            <div class="modal-header">
                                <h3>Session Required</h3>
                            </div>
                            <div class="modal-body">
                                <p>Your session has expired. Please login again to continue.</p>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-primary" onclick="window.location.href='admin.html'">Go to Login</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                }
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
    // Start session inactivity tracking
    resetSessionActivityTimer();
    setupSessionActivityListeners();

    // Tab switching for View All modal
    document.querySelectorAll('.view-all-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            renderViewAllBody(tab.dataset.tab);
        });
    });

    // Listen for data changes from admin (delete, create, update)
    window.addEventListener('dataChanged', async () => {
        console.log('[Dashboard] Data changed - refreshing...');
        try {
            // Fetch fresh data and re-render everything
            console.log('[Dashboard] Fetching fresh data...');
            const [stats, ann, asg, dl, qz] = await Promise.all([
                DashboardData.getStats(),
                DashboardData.getAnnouncements(),
                DashboardData.getAssignments(),
                DashboardData.getDeadlines(),
                DashboardData.getQuizzes()
            ]);

            console.log('[Dashboard] Got stats:', stats);

            // Update counts
            dashboardState.counts = {
                announcements: stats.totalAnnouncements || 0,
                assignments: stats.pendingAssignments || 0,
                quizzes: stats.upcomingQuizzes || 0
            };

            // Update in-memory store
            dashboardState.allData.announcements = ann || [];
            dashboardState.allData.assignments   = asg || [];
            dashboardState.allData.deadlines    = dl || [];
            dashboardState.allData.quizzes      = qz || [];

            console.log('[Dashboard] Calling renderStats with:', stats);

            // Re-render all UI
            renderStats(stats);
            renderAnnouncements(ann.slice(0, 3));
            renderAssignments(asg.slice(0, 3));
            renderDeadlines(dl.slice(0, 3));
            renderQuizzes(qz.slice(0, 3));

            // Update last sync time
            const updated = document.getElementById('last-updated');
            if (updated) updated.textContent = 'Just now';

            console.log('[Dashboard] Refresh complete');
        } catch (e) {
            console.warn('[Dashboard] Refresh failed:', e.message, e);
        }
    });
});

function closeLoginModal() {
    const modal = document.getElementById('login-required-modal');
    if (modal) modal.classList.add('hidden');
}

window.openDetailModal = openDetailModal;
window.openViewAllModal = openViewAllModal;
window.renderViewAllBody = renderViewAllBody;
window.openFeedbackModal = openFeedbackModal;
window.submitFeedback = submitFeedback;
window.closeLoginModal = closeLoginModal;

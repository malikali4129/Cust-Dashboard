/**
 * University Dashboard - Admin panel
 */

const adminState = {
    currentTab: 'announcements',
    editingId: null,
    page: 1,
    pageSize: DashboardData.DEFAULT_PAGE_SIZE,
    search: '',
    total: 0,
    items: [],
    timeZone: DashboardUtils.TIME_ZONE_LABEL
};

let feedbackViewingId = null;

const TAB_CONFIG = {
    announcements: {
        title: 'Announcements',
        searchPlaceholder: 'Search title or content',
        load: DashboardData.getAnnouncementsPage,
        create: DashboardData.addAnnouncement,
        update: DashboardData.updateAnnouncement,
        remove: DashboardData.deleteAnnouncement,
        toPayload: (formData) => ({
            title: formData.title.trim(),
            content: formData.content.trim(),
            priority: formData.priority
        }),
        tempRecord: (payload) => ({
            id: `temp-${Date.now()}`,
            ...payload,
            date: new Date().toISOString()
        }),
        desktopRow: (item) => `
            <tr>
                <td>${DashboardUtils.escapeHtml(item.title)}</td>
                <td>${DashboardUtils.escapeHtml(item.content)}</td>
                <td><span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span></td>
                <td>${DashboardUtils.formatDateTime(item.date, adminState.timeZone)}</td>
                <td>${actionButtons(item.id)}</td>
            </tr>
        `,
        mobileCard: (item) => `
            <article class="record-card">
                <div class="record-card-top">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span>
                </div>
                <p>${DashboardUtils.escapeHtml(item.content)}</p>
                <small>${DashboardUtils.formatDateTime(item.date, adminState.timeZone)}</small>
                ${mobileActions(item.id)}
            </article>
        `,
        form: (item = {}) => `
            <form id="item-form" class="editor-form">
                <label class="field">
                    <span>Title</span>
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" minlength="2" maxlength="200" required>
                </label>
                <label class="field">
                    <span>Content</span>
                    <textarea class="form-textarea" name="content" minlength="2" maxlength="2000" required>${DashboardUtils.escapeHtml(item.content || '')}</textarea>
                </label>
                <label class="field">
                    <span>Priority</span>
                    <select class="form-select" name="priority">
                        <option value="normal" ${item.priority === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </label>
            </form>
        `
    },
    assignments: {
        title: 'Assignments',
        searchPlaceholder: 'Search title, subject, or details',
        load: DashboardData.getAssignmentsPage,
        create: DashboardData.addAssignment,
        update: DashboardData.updateAssignment,
        remove: DashboardData.deleteAssignment,
        toPayload: (formData) => {
            // Get form element to query select values directly
            const form = document.getElementById('item-form');
            const deadlineResult = form
                ? DashboardUtils.combineDateSelects(form, 'deadline')
                : DashboardUtils.combineDateSelects(formData, 'deadline');
            if (deadlineResult && deadlineResult.error === 'past') {
                throw new Error('Date & time cannot be in the past');
            }
            return {
                title: formData.title.trim(),
                subject: formData.subject.trim(),
                description: formData.description.trim(),
                deadline: deadlineResult,
                status: formData.status
            };
        },
        tempRecord: (payload) => ({ id: `temp-${Date.now()}`, ...payload }),
        desktopRow: (item) => `
            <tr>
                <td>${DashboardUtils.escapeHtml(item.title)}</td>
                <td>${DashboardUtils.escapeHtml(item.subject || '-')}</td>
                <td>${DashboardUtils.formatDateTime(item.deadline, adminState.timeZone)}</td>
                <td><span class="badge badge-${item.status}">${DashboardUtils.escapeHtml(item.status)}</span></td>
                <td>${actionButtons(item.id)}</td>
            </tr>
        `,
        mobileCard: (item) => `
            <article class="record-card">
                <div class="record-card-top">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <span class="badge badge-${item.status}">${DashboardUtils.escapeHtml(item.status)}</span>
                </div>
                <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
                <p>${DashboardUtils.escapeHtml(item.description)}</p>
                <small>${DashboardUtils.formatDateTime(item.deadline, adminState.timeZone)}</small>
                ${mobileActions(item.id)}
            </article>
        `,
        form: (item = {}) => `
            <form id="item-form" class="editor-form">
                <label class="field">
                    <span>Title</span>
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" minlength="2" maxlength="200" required>
                </label>
                <label class="field">
                    <span>Subject</span>
                    <input class="form-input" name="subject" value="${DashboardUtils.escapeHtml(item.subject || '')}" maxlength="100">
                </label>
                <label class="field">
                    <span>Description</span>
                    <textarea class="form-textarea" name="description" minlength="2" maxlength="2000" required>${DashboardUtils.escapeHtml(item.description || '')}</textarea>
                </label>
                <label class="field">
                    <span>Deadline</span>
                    ${DashboardUtils.createDateSelects('deadline', item.deadline)}
                </label>
                <label class="field">
                    <span>Status</span>
                    <select class="form-select" name="status">
                        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </label>
            </form>
        `
    },
    deadlines: {
        title: 'Deadlines',
        searchPlaceholder: 'Search title or category',
        load: DashboardData.getDeadlinesPage,
        create: DashboardData.addDeadline,
        update: DashboardData.updateDeadline,
        remove: DashboardData.deleteDeadline,
        toPayload: (formData) => {
            const form = document.getElementById('item-form');
            const dateResult = form
                ? DashboardUtils.combineDateSelects(form, 'date')
                : DashboardUtils.combineDateSelects(formData, 'date');
            return {
                title: formData.title.trim(),
                category: formData.category.trim(),
                date: dateResult,
                priority: formData.priority
            };
        },
        tempRecord: (payload) => ({ id: `temp-${Date.now()}`, ...payload }),
        desktopRow: (item) => `
            <tr>
                <td>${DashboardUtils.escapeHtml(item.title)}</td>
                <td>${DashboardUtils.escapeHtml(item.category || '-')}</td>
                <td>${DashboardUtils.formatDateTime(item.date, adminState.timeZone)}</td>
                <td><span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span></td>
                <td>${actionButtons(item.id)}</td>
            </tr>
        `,
        mobileCard: (item) => `
            <article class="record-card">
                <div class="record-card-top">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <span class="badge badge-${item.priority}">${DashboardUtils.escapeHtml(item.priority)}</span>
                </div>
                <p>${DashboardUtils.escapeHtml(item.category || 'General')}</p>
                <small>${DashboardUtils.formatDateTime(item.date, adminState.timeZone)}</small>
                ${mobileActions(item.id)}
            </article>
        `,
        form: (item = {}) => `
            <form id="item-form" class="editor-form">
                <label class="field">
                    <span>Title</span>
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" minlength="2" maxlength="200" required>
                </label>
                <label class="field">
                    <span>Category</span>
                    <input class="form-input" name="category" value="${DashboardUtils.escapeHtml(item.category || '')}" maxlength="100">
                </label>
                <label class="field">
                    <span>Date and time</span>
                    ${DashboardUtils.createDateSelects('date', item.date)}
                </label>
                <label class="field">
                    <span>Priority</span>
                    <select class="form-select" name="priority">
                        <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${item.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </label>
            </form>
        `
    },
    quizzes: {
        title: 'Quizzes',
        searchPlaceholder: 'Search title or subject',
        load: DashboardData.getQuizzesPage,
        create: DashboardData.addQuiz,
        update: DashboardData.updateQuiz,
        remove: DashboardData.deleteQuiz,
        toPayload: (formData) => {
            const form = document.getElementById('item-form');
            const dateResult = form
                ? DashboardUtils.combineDateSelects(form, 'date')
                : DashboardUtils.combineDateSelects(formData, 'date');
            return {
                title: formData.title.trim(),
                subject: formData.subject.trim(),
                date: dateResult,
                duration: Number(formData.duration),
                totalMarks: formData.totalMarks ? Number(formData.totalMarks) : null
            };
        },
        tempRecord: (payload) => ({ id: `temp-${Date.now()}`, ...payload }),
        desktopRow: (item) => `
            <tr>
                <td>${DashboardUtils.escapeHtml(item.title)}</td>
                <td>${DashboardUtils.escapeHtml(item.subject || '-')}</td>
                <td>${DashboardUtils.formatDateTime(item.date, adminState.timeZone)}</td>
                <td>${item.duration} min</td>
                <td>${item.totalMarks || '-'}</td>
                <td>${actionButtons(item.id)}</td>
            </tr>
        `,
        mobileCard: (item) => `
            <article class="record-card">
                <div class="record-card-top">
                    <h3>${DashboardUtils.escapeHtml(item.title)}</h3>
                    <span class="badge badge-normal">${item.duration} min</span>
                </div>
                <p>${DashboardUtils.escapeHtml(item.subject || 'General')}</p>
                <small>${DashboardUtils.formatDateTime(item.date, adminState.timeZone)} . ${item.totalMarks || '-'} marks</small>
                ${mobileActions(item.id)}
            </article>
        `,
        form: (item = {}) => `
            <form id="item-form" class="editor-form">
                <label class="field">
                    <span>Title</span>
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" minlength="2" maxlength="200" required>
                </label>
                <label class="field">
                    <span>Subject</span>
                    <input class="form-input" name="subject" value="${DashboardUtils.escapeHtml(item.subject || '')}" maxlength="100">
                </label>
                <label class="field">
                    <span>Date and time</span>
                    ${DashboardUtils.createDateSelects('date', item.date)}
                </label>
                <label class="field">
                    <span>Duration</span>
                    <input class="form-input" type="number" min="1" max="480" name="duration" value="${item.duration || 30}" required>
                </label>
                <label class="field">
                    <span>Total marks</span>
                    <input class="form-input" type="number" min="1" max="10000" name="totalMarks" value="${item.totalMarks || ''}">
                </label>
            </form>
        `
    }
};

function actionButtons(id) {
    return `
        <div class="table-actions">
            <button class="btn btn-secondary btn-sm" onclick="editItem('${id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('${id}')">Delete</button>
        </div>
    `;
}

function mobileActions(id) {
    return `
        <div class="record-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="editItem('${id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('${id}')">Delete</button>
        </div>
    `;
}

function currentConfig() {
    return TAB_CONFIG[adminState.currentTab];
}

function showDashboard() {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('admin-dashboard')?.classList.remove('hidden');
    renderCurrentTab();
}

// Check auth status on page load
async function checkAuth() {
    const perms = await DashboardData.checkUserPermissions();
    console.log('[checkAuth] User permissions:', perms);

    if (perms.role > 0) {
        showDashboard();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        await DashboardData.signInAdmin(email, password);
        await DashboardData.logAction('admin_login', { email: email });
        DashboardUtils.showToast('Admin session started.', 'success');
        showDashboard();
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Login failed.', 'error');
    }
}

async function handleLogout() {
    const perms = await DashboardData.checkUserPermissions();
    if (perms.email) {
        await DashboardData.logAction('admin_logout', { email: perms.email });
    }
    await DashboardData.signOutAdmin();
    window.location.reload();
}

async function loadSettingsState() {
    const settings = await DashboardData.getSettings();
    adminState.timeZone = 'Asia/Karachi';
    DashboardUtils.setActiveTimeZone(adminState.timeZone);
}

function switchTab(tab) {
    adminState.currentTab = tab;
    adminState.page = 1;
    adminState.search = '';
    adminState.editingId = null;

    document.querySelectorAll('.tab').forEach((node) => {
        node.classList.toggle('active', node.dataset.tab === tab);
    });

    renderCurrentTab();
}

async function renderCurrentTab() {
    const container = document.getElementById('tab-content');
    if (!container) {
        return;
    }

    if (adminState.currentTab === 'settings') {
        await loadSettingsState();
        renderSettings(container);
        return;
    }

    if (adminState.currentTab === 'feedback') {
        renderFeedback(container);
        return;
    }

    if (adminState.currentTab === 'logs') {
        renderLogs(container);
        return;
    }

    container.innerHTML = '<div class="panel-loading">Loading records...</div>';

    try {
        await loadSettingsState();
        const result = await currentConfig().load({
            page: adminState.page,
            pageSize: adminState.pageSize,
            search: adminState.search
        });
        adminState.items = result.items;
        adminState.total = result.total;
        renderRecords(container);
    } catch (error) {
        container.innerHTML = '<div class="panel-loading error">Could not load this section. Check your connection or admin session.</div>';
    }
}

function renderRecords(container) {
    const config = currentConfig();
    const totalPages = Math.max(1, Math.ceil(adminState.total / adminState.pageSize));

    container.innerHTML = `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <p class="eyebrow">Content management</p>
                    <h2>${config.title}</h2>
                </div>
                <label class="search-shell">
                    <span>Search</span>
                    <input class="form-input" value="${DashboardUtils.escapeHtml(adminState.search)}" placeholder="${DashboardUtils.escapeHtml(config.searchPlaceholder)}" oninput="debouncedUpdateSearch(this.value)">
                </label>
            </div>
            <div class="table-shell">
                <table class="data-table desktop-table" data-desktop-only>
                    <tbody>
                        ${adminState.items.map(config.desktopRow).join('') || '<tr><td colspan="6">No results.</td></tr>'}
                    </tbody>
                </table>
                <div class="mobile-record-list" data-mobile-only>
                    ${adminState.items.map(config.mobileCard).join('') || '<div class="empty-state"><h3>No results</h3><p>Try a different search or create a new record.</p></div>'}
                </div>
            </div>
            <div class="pagination-bar">
                <button class="btn btn-secondary btn-sm" onclick="changePage(-1)" ${adminState.page === 1 ? 'disabled' : ''}>Previous</button>
                <span>Page ${adminState.page} of ${totalPages}</span>
                <button class="btn btn-secondary btn-sm" onclick="changePage(1)" ${adminState.page >= totalPages ? 'disabled' : ''}>Next</button>
            </div>
        </section>
    `;
}

function renderStarRating(rating, readonly = true) {
    const stars = Array.from({ length: 5 }, (_, i) => {
        const filled = i < rating;
        return `<span class="star ${filled ? 'is-filled' : 'is-empty'}">★</span>`;
    }).join('');
    return `<div class="star-rating ${readonly ? 'is-readonly' : ''}">${stars}</div>`;
}

function renderFeedback(container) {
    container.innerHTML = '<div class="panel-loading">Loading feedback...</div>';

    DashboardData.getFeedbackPage({
        page: adminState.page,
        pageSize: adminState.pageSize,
        search: adminState.search
    }).then((result) => {
        adminState.items = result.items;
        adminState.total = result.total;

        const totalPages = Math.max(1, Math.ceil(adminState.total / adminState.pageSize));

        container.innerHTML = `
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <p class="eyebrow">User feedback</p>
                        <h2>Feedback</h2>
                    </div>
                    <label class="search-shell">
                        <span>Search</span>
                        <input class="form-input" value="${DashboardUtils.escapeHtml(adminState.search)}" placeholder="Search name or suggestion" oninput="debouncedUpdateSearch(this.value)">
                    </label>
                </div>
                <div class="table-shell" id="feedback-body-wrapper">
                    <table class="data-table desktop-table" data-desktop-only>
                        <tbody id="feedback-desktop-tbody">
                            ${adminState.items.map((item) => `
                                <tr>
                                    <td>${DashboardUtils.escapeHtml(item.name)}</td>
                                    <td><div class="feedback-table-rating">${renderStarRating(item.rating)}</div></td>
                                    <td><span class="feedback-preview">${DashboardUtils.escapeHtml(item.suggestion)}</span></td>
                                    <td>${DashboardUtils.formatDateTime(item.created_at, adminState.timeZone)}</td>
                                    <td>
                                        <div class="table-actions">
                                            <button class="btn btn-secondary btn-sm" onclick="openFeedbackDetail('${item.id}')">Open</button>
                                            <button class="btn btn-danger btn-sm" onclick="deleteFeedbackItem('${item.id}')">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="5">No feedback yet.</td></tr>'}
                        </tbody>
                    </table>
                    <div class="mobile-record-list" id="feedback-mobile-list" data-mobile-only>
                        ${adminState.items.map((item) => `
                            <article class="record-card">
                                <div class="record-card-top">
                                    <h3>${DashboardUtils.escapeHtml(item.name)}</h3>
                                    <div class="feedback-table-rating">${renderStarRating(item.rating)}</div>
                                </div>
                                <p>${DashboardUtils.escapeHtml(item.suggestion)}</p>
                                <small>${DashboardUtils.formatDateTime(item.created_at, adminState.timeZone)}</small>
                                <div class="record-card-actions">
                                    <button class="btn btn-secondary btn-sm" onclick="openFeedbackDetail('${item.id}')">Open</button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteFeedbackItem('${item.id}')">Delete</button>
                                </div>
                            </article>
                        `).join('') || '<div class="empty-state"><h3>No feedback yet</h3><p>Feedback from users will appear here.</p></div>'}
                    </div>
                </div>
                <div class="pagination-bar">
                    <button class="btn btn-secondary btn-sm" onclick="changePage(-1)" ${adminState.page === 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${adminState.page} of ${totalPages}</span>
                    <button class="btn btn-secondary btn-sm" onclick="changePage(1)" ${adminState.page >= totalPages ? 'disabled' : ''}>Next</button>
                </div>
            </section>
        `;
    }).catch((error) => {
        container.innerHTML = '<div class="panel-loading error">Could not load feedback. Check your connection or admin session.</div>';
    });
}

function renderFeedbackBody() {
    const desktopTbody = document.getElementById('feedback-desktop-tbody');
    const mobileList = document.getElementById('feedback-mobile-list');

    if (desktopTbody) {
        desktopTbody.innerHTML = adminState.items.map((item) => `
            <tr>
                <td>${DashboardUtils.escapeHtml(item.name)}</td>
                <td><div class="feedback-table-rating">${renderStarRating(item.rating)}</div></td>
                <td><span class="feedback-preview">${DashboardUtils.escapeHtml(item.suggestion)}</span></td>
                <td>${DashboardUtils.formatDateTime(item.created_at, adminState.timeZone)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openFeedbackDetail('${item.id}')">Open</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteFeedbackItem('${item.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5">No feedback yet.</td></tr>';
    }

    if (mobileList) {
        mobileList.innerHTML = adminState.items.map((item) => `
            <article class="record-card">
                <div class="record-card-top">
                    <h3>${DashboardUtils.escapeHtml(item.name)}</h3>
                    <div class="feedback-table-rating">${renderStarRating(item.rating)}</div>
                </div>
                <p>${DashboardUtils.escapeHtml(item.suggestion)}</p>
                <small>${DashboardUtils.formatDateTime(item.created_at, adminState.timeZone)}</small>
                <div class="record-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openFeedbackDetail('${item.id}')">Open</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteFeedbackItem('${item.id}')">Delete</button>
                </div>
            </article>
        `).join('') || '<div class="empty-state"><h3>No feedback yet</h3><p>Feedback from users will appear here.</p></div>';
    }
}

window.renderFeedbackBody = renderFeedbackBody;

function openFeedbackDetail(id) {
    const item = adminState.items.find((entry) => entry.id === id);
    if (!item) {
        DashboardUtils.showToast('Feedback not found.', 'error');
        return;
    }

    feedbackViewingId = id;
    const body = document.getElementById('feedback-detail-body');
    body.innerHTML = `
        <div class="feedback-meta">
            <div class="feedback-meta-row">
                <span class="feedback-meta-label">Name</span>
                <strong>${DashboardUtils.escapeHtml(item.name)}</strong>
            </div>
            <div class="feedback-meta-row">
                <span class="feedback-meta-label">Rating</span>
                ${renderStarRating(item.rating)}
            </div>
            <div class="feedback-meta-row">
                <span class="feedback-meta-label">Sent</span>
                <span>${DashboardUtils.formatDateTime(item.created_at, adminState.timeZone)}</span>
            </div>
            <div>
                <span class="feedback-meta-label">Suggestion</span>
                <p class="feedback-suggestion-text">${DashboardUtils.escapeHtml(item.suggestion)}</p>
            </div>
        </div>
    `;
    DashboardUtils.openModal('feedback-detail-modal');
}

async function deleteCurrentFeedback() {
    if (!feedbackViewingId) {
        return;
    }
    await deleteFeedbackItem(feedbackViewingId);
    DashboardUtils.closeModal('feedback-detail-modal');
    feedbackViewingId = null;
}

async function deleteFeedbackItem(id) {
    // Check permissions first
    const perms = await DashboardData.checkActionPermission();
    if (!perms.allowed) {
        DashboardUtils.showToast(perms.message, 'error');
        return;
    }

    const confirmed = await DashboardUtils.confirmAction('Delete this feedback?');
    if (!confirmed) {
        return;
    }

    const previousItems = [...adminState.items];
    const removed = previousItems.find((item) => item.id === id);
    adminState.items = adminState.items.filter((item) => item.id !== id);
    adminState.total = Math.max(0, adminState.total - 1);

    if (adminState.currentTab === 'feedback') {
        renderFeedbackBody();
    }

    try {
        await DashboardData.deleteFeedback(id);
        DashboardUtils.showToast('Feedback deleted.', 'success');
    } catch (error) {
        if (removed) {
            adminState.items = previousItems;
            adminState.total += 1;
            if (adminState.currentTab === 'feedback') {
                renderFeedbackBody();
            }
        }
        DashboardUtils.showToast(error.message || 'Delete failed.', 'error');
    }
}

let currentUserPerms = null;

function renderSettings(container) {
    // Get current user permissions for display
    DashboardData.checkUserPermissions().then(perms => {
        currentUserPerms = perms;
        renderSettingsContent(container, perms);
    });
}

async function renderSettingsContent(container, perms) {
    const roleLabels = { 1: 'Superadmin', 2: 'Editor', 3: 'Viewer' };
    const statusBadge = perms.isActive
        ? '<span class="badge badge-normal">Active</span>'
        : '<span class="badge badge-high">Inactive</span>';

    // If superadmin, load admin users list
    let usersListHtml = '';
    if (perms.role === DashboardData.USER_ROLES.SUPERADMIN) {
        try {
            const users = await DashboardData.getAdminUsers();
            usersListHtml = `
                <section class="panel">
                    <div class="panel-header">
                        <div>
                            <p class="eyebrow">User Management</p>
                            <h2>Admin Users</h2>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="openAddUserModal()">+ Add User</button>
                    </div>
                    <div class="admin-users-list">
                        ${users.map(u => `
                            <div class="admin-user-row">
                                <div class="admin-user-info">
                                    <strong>${DashboardUtils.escapeHtml(u.email)}</strong>
                                    <span class="role-badge role-${u.role}">${roleLabels[u.role] || 'Viewer'}</span>
                                    ${u.role === 1 ? '<span class="badge badge-normal">Always Active</span>' : ''}
                                    ${u.email === perms.email ? '<span class="badge badge-normal">You</span>' : ''}
                                </div>
                                <div class="admin-user-actions">
                                    ${u.role !== 1 ? `
                                    <select class="form-select form-select-sm" onchange="handleUserStatusChange('${u.id}', this.value)" style="width: auto;">
                                        <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${u.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                    ` : ''}
                                    ${u.email !== perms.email ? `
                                        <select class="form-select form-select-sm" onchange="handleUserRoleChange('${u.id}', this.value)" style="width: auto;">
                                            <option value="3" ${u.role === 3 ? 'selected' : ''}>Viewer</option>
                                            <option value="2" ${u.role === 2 ? 'selected' : ''}>Editor</option>
                                            <option value="1" ${u.role === 1 ? 'selected' : ''}>Superadmin</option>
                                        </select>
                                        <button class="btn btn-danger btn-sm" onclick="handleDeleteUser('${u.id}')" style="padding: 2px 8px; font-size: 0.75rem;">Delete</button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('') || '<p>No other users.</p>'}
                    </div>
                </section>
            `;
        } catch (err) {
            usersListHtml = `<p class="error">Could not load users.</p>`;
        }
    }

    // Show status only for editors (role 1 and 2), not for viewers (role 3)
    const showStatus = perms.role < DashboardData.USER_ROLES.VIEWER;

    // Show database operations only for superadmin (role 1)
    const showDbOps = perms.role === DashboardData.USER_ROLES.SUPERADMIN;

    const dbOpsHtml = showDbOps ? `
        <section class="panel danger-panel">
            <div class="panel-header">
                <div>
                    <p class="eyebrow">Cloud maintenance</p>
                    <h2>Database Operations</h2>
                </div>
            </div>
            <div class="danger-actions">
                <button class="btn btn-secondary" onclick="openDataModal()">Import/Export</button>
                <button class="btn btn-danger" onclick="handleClearCloud()">Clear Data</button>
            </div>
        </section>
    ` : '';

    // Show logs button only for superadmin
    const logsButton = showDbOps ? `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <p class="eyebrow">System</p>
                    <h2>Activity Logs</h2>
                </div>
            </div>
            <p>View comprehensive activity logs of all admin actions.</p>
            <button class="btn btn-primary" onclick="switchTab('logs')">Open Logs</button>
        </section>
    ` : '';

    container.innerHTML = `
        <div class="settings-grid">
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <p class="eyebrow">Current User</p>
                        <h2>Profile</h2>
                    </div>
                </div>
                <div class="user-profile">
                    <div class="profile-row">
                        <span class="profile-label">Email</span>
                        <span class="profile-value">${DashboardUtils.escapeHtml(perms.email || 'N/A')}</span>
                    </div>
                    <div class="profile-row">
                        <span class="profile-label">Role</span>
                        <span class="profile-value">${roleLabels[perms.role] || 'Viewer'}</span>
                    </div>
                    ${showStatus ? `
                    <div class="profile-row">
                        <span class="profile-label">Status</span>
                        <span class="profile-value">${statusBadge}</span>
                    </div>
                    ` : ''}
                    ${perms.role <= DashboardData.USER_ROLES.EDITOR && perms.isActive ? `
                        <button class="btn btn-secondary" onclick="openPasswordModal()">Change Password</button>
                    ` : ''}
                </div>
            </section>
            ${usersListHtml}
            ${dbOpsHtml}
            ${logsButton}
        </div>
    `;
}

// ==================== LOGS PAGE ====================

let logFilters = {
    email: '',
    action: '',
    startDate: '',
    endDate: '',
    viewMode: 'standard' // 'standard' or 'comprehensive'
};

async function renderLogs(container) {
    const stats = await DashboardData.getLogStats();
    const actions = await DashboardData.getLogActions();

    container.innerHTML = `
        <div class="logs-page">
            <div class="logs-header">
                <div class="logs-stats">
                    <div class="stat-card">
                        <span class="stat-value">${stats.todayCount}</span>
                        <span class="stat-label">Today's Actions</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${stats.uniqueUsers}</span>
                        <span class="stat-label">Total Users</span>
                    </div>
                </div>
                <div class="logs-view-toggle">
                    <button class="view-toggle-btn ${logFilters.viewMode === 'standard' ? 'active' : ''}" onclick="setLogViewMode('standard')">
                        <span class="toggle-icon">▬</span> Standard
                    </button>
                    <button class="view-toggle-btn ${logFilters.viewMode === 'comprehensive' ? 'active' : ''}" onclick="setLogViewMode('comprehensive')">
                        <span class="toggle-icon">◉</span> Comprehensive
                    </button>
                </div>
            </div>

            <div class="logs-filters">
                <input type="text" class="form-input" placeholder="Search by email..."
                    value="${DashboardUtils.escapeHtml(logFilters.email)}"
                    oninput="debouncedLogSearch(this.value)">

                <select class="form-select" onchange="filterLogAction(this.value)">
                    <option value="">All Actions</option>
                    ${actions.map(a => `<option value="${a}" ${logFilters.action === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>

                <input type="date" class="form-input" value="${logFilters.startDate}"
                    onchange="filterLogDate('start', this.value)" placeholder="Start Date">

                <input type="date" class="form-input" value="${logFilters.endDate}"
                    onchange="filterLogDate('end', this.value)" placeholder="End Date">

                <button class="btn btn-secondary" onclick="clearLogFilters()">Clear</button>
            </div>

            <div class="logs-list" id="logs-list">
                <div class="panel-loading">Loading logs...</div>
            </div>

            <div class="logs-pagination" id="logs-pagination"></div>
        </div>
    `;

    await loadLogs();
}

function setLogViewMode(mode) {
    logFilters.viewMode = mode;
    renderLogs(document.getElementById('tab-content'));
}

function debouncedLogSearch(value) {
    clearTimeout(window.logSearchTimeout);
    window.logSearchTimeout = setTimeout(() => {
        logFilters.email = value;
        loadLogs();
    }, 300);
}

function filterLogAction(value) {
    logFilters.action = value;
    loadLogs();
}

function filterLogDate(type, value) {
    if (type === 'start') {
        logFilters.startDate = value;
    } else {
        logFilters.endDate = value;
    }
    loadLogs();
}

function clearLogFilters() {
    logFilters = {
        email: '',
        action: '',
        startDate: '',
        endDate: '',
        viewMode: logFilters.viewMode
    };
    renderLogs(document.getElementById('tab-content'));
}

async function loadLogs(page = 1) {
    const listEl = document.getElementById('logs-list');
    if (!listEl) return;

    try {
        const result = await DashboardData.getLogs({
            page: page,
            pageSize: 30,
            email: logFilters.email,
            action: logFilters.action,
            startDate: logFilters.startDate,
            endDate: logFilters.endDate
        });

        if (result.logs.length === 0) {
            listEl.innerHTML = '<div class="logs-empty">No logs found.</div>';
            return;
        }

        if (logFilters.viewMode === 'standard') {
            listEl.innerHTML = result.logs.map(log => `
                <div class="log-entry log-standard">
                    <div class="log-email">${DashboardUtils.escapeHtml(log.email)}</div>
                    <div class="log-action">${getActionIcon(log.action)} ${formatAction(log.action)}</div>
                    <div class="log-time">${formatLogTime(log.created_at)}</div>
                </div>
            `).join('');
        } else {
            listEl.innerHTML = result.logs.map(log => `
                <div class="log-entry log-comprehensive">
                    <div class="log-header">
                        <span class="log-email-badge">${getColorForEmail(log.email)}</span>
                        <span class="log-email">${DashboardUtils.escapeHtml(log.email)}</span>
                        <span class="log-action-badge">${getActionIcon(log.action)} ${formatAction(log.action)}</span>
                    </div>
                    <div class="log-details">
                        <div class="detail-row">
                            <span class="detail-label">Action Type</span>
                            <span class="detail-value">${log.action}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Details</span>
                            <span class="detail-value">${formatDetails(log.details)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Timestamp</span>
                            <span class="detail-value">${new Date(log.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">User Agent</span>
                            <span class="detail-value log-user-agent">${log.user_agent ? DashboardUtils.escapeHtml(log.user_agent.substring(0, 60)) + '...' : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Render pagination
        const totalPages = Math.ceil(result.total / 30);
        if (totalPages > 1) {
            const paginationHtml = `
                <button class="btn btn-secondary" ${page <= 1 ? 'disabled' : ''} onclick="loadLogs(${page - 1})">Previous</button>
                <span class="page-info">Page ${page} of ${totalPages}</span>
                <button class="btn btn-secondary" ${page >= totalPages ? 'disabled' : ''} onclick="loadLogs(${page + 1})">Next</button>
            `;
            const pagEl = document.getElementById('logs-pagination');
            if (pagEl) pagEl.innerHTML = paginationHtml;
        }
    } catch (error) {
        listEl.innerHTML = '<div class="logs-empty error">Could not load logs.</div>';
    }
}

function getActionIcon(action) {
    if (action?.includes('create') || action?.includes('add')) return '➕';
    if (action?.includes('update') || action?.includes('edit')) return '✏️';
    if (action?.includes('delete') || action?.includes('remove')) return '🗑️';
    if (action?.includes('login') || action?.includes('signin')) return '🔑';
    if (action?.includes('logout')) return '🚪';
    if (action?.includes('import')) return '📥';
    if (action?.includes('export')) return '📤';
    return '📋';
}

function formatAction(action) {
    if (!action) return 'Unknown';
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatLogTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDetails(details) {
    if (!details) return 'None';
    if (typeof details === 'string') return details;
    try {
        return JSON.stringify(details);
    } catch {
        return String(details);
    }
}

// Color generator for email
function getColorForEmail(email) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500'
    ];

    let hash = 0;
    for (let i = 0; i < email?.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Get first letter uppercase
    const letter = email?.charAt(0).toUpperCase() || '?';

    return `<span class="email-avatar" style="background: ${colors[Math.abs(hash) % colors.length]}">${letter}</span>`;
}

// Expose functions globally
window.setLogViewMode = setLogViewMode;
window.filterLogAction = filterLogAction;
window.filterLogDate = filterLogDate;
window.clearLogFilters = clearLogFilters;
window.loadLogs = loadLogs;

// Add modal HTML to admin.html
function openPasswordModal() {
    const modalHtml = `
        <div id="password-modal" class="modal-overlay" onclick="if(event.target === this) DashboardUtils.closeModal('password-modal')">
            <div class="modal">
                <div class="modal-header">
                    <h3>Change Password</h3>
                    <button class="modal-close" type="button" onclick="DashboardUtils.closeModal('password-modal')">Close</button>
                </div>
                <div class="modal-body">
                    <form id="password-form" class="editor-form">
                        <label class="field">
                            <span>Current password</span>
                            <input class="form-input" id="modal-current-password" type="password" required>
                        </label>
                        <label class="field">
                            <span>New password</span>
                            <input class="form-input" id="modal-new-password" type="password" minlength="8" required>
                        </label>
                        <label class="field">
                            <span>Confirm password</span>
                            <input class="form-input" id="modal-confirm-password" type="password" minlength="8" required>
                        </label>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" type="button" onclick="DashboardUtils.closeModal('password-modal')">Cancel</button>
                    <button class="btn btn-primary" type="button" onclick="submitPasswordChange()">Update</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existing = document.getElementById('password-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    DashboardUtils.openModal('password-modal');
}

async function submitPasswordChange() {
    const currentPassword = document.getElementById('modal-current-password').value;
    const newPassword = document.getElementById('modal-new-password').value;
    const confirmPassword = document.getElementById('modal-confirm-password').value;

    if (newPassword !== confirmPassword) {
        DashboardUtils.showToast('Passwords do not match.', 'error');
        return;
    }

    try {
        await DashboardData.updatePassword(currentPassword, newPassword);
        DashboardUtils.showToast('Password updated.', 'success');
        DashboardUtils.closeModal('password-modal');
        document.getElementById('password-form').reset();
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not update password.', 'error');
    }
}

function openAddUserModal() {
    const modalHtml = `
        <div id="add-user-modal" class="modal-overlay" onclick="if(event.target === this) DashboardUtils.closeModal('add-user-modal')">
            <div class="modal">
                <div class="modal-header">
                    <h3>Add Admin User</h3>
                    <button class="modal-close" type="button" onclick="DashboardUtils.closeModal('add-user-modal')">Close</button>
                </div>
                <div class="modal-body">
                    <form id="add-user-form" class="editor-form">
                        <label class="field">
                            <span>Email</span>
                            <input class="form-input" id="new-user-email" type="email" required>
                        </label>
                        <label class="field">
                            <span>Role</span>
                            <select class="form-select" id="new-user-role">
                                <option value="3">Viewer</option>
                                <option value="2">Editor</option>
                                <option value="1">Superadmin</option>
                            </select>
                        </label>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" type="button" onclick="DashboardUtils.closeModal('add-user-modal')">Cancel</button>
                    <button class="btn btn-primary" type="button" onclick="submitAddUser()">Add User</button>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('add-user-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    DashboardUtils.openModal('add-user-modal');
}

async function submitAddUser() {
    const email = document.getElementById('new-user-email').value.trim();
    const role = parseInt(document.getElementById('new-user-role').value);

    if (!email) {
        DashboardUtils.showToast('Email is required.', 'error');
        return;
    }

    try {
        await DashboardData.addAdminUser(email, role, 'active');
        DashboardUtils.showToast('User added successfully.', 'success');
        DashboardUtils.closeModal('add-user-modal');

        // Refresh settings to show new user
        renderSettings(document.getElementById('tab-content'));
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not add user.', 'error');
    }
}

async function handleUserStatusChange(userId, newStatus) {
    try {
        await DashboardData.updateAdminUser(userId, { status: newStatus });
        DashboardUtils.showToast('User status updated.', 'success');
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not update status.', 'error');
        // Refresh to reset select
        renderSettings(document.getElementById('tab-content'));
    }
}

async function handleUserRoleChange(userId, newRole) {
    try {
        await DashboardData.updateAdminUser(userId, { role: parseInt(newRole) });
        DashboardUtils.showToast('User role updated.', 'success');
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not update role.', 'error');
        renderSettings(document.getElementById('tab-content'));
    }
}

async function handleDeleteUser(userId) {
    const confirmed = await DashboardUtils.confirmAction('Delete this user?');
    if (!confirmed) return;

    try {
        await DashboardData.deleteAdminUser(userId);
        DashboardUtils.showToast('User deleted.', 'success');
        renderSettings(document.getElementById('tab-content'));
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not delete user.', 'error');
    }
}

// Expose functions globally
window.openPasswordModal = openPasswordModal;
window.submitPasswordChange = submitPasswordChange;
window.openAddUserModal = openAddUserModal;
window.submitAddUser = submitAddUser;
window.handleUserStatusChange = handleUserStatusChange;
window.handleUserRoleChange = handleUserRoleChange;
window.handleDeleteUser = handleDeleteUser;

// Import/Export Data Modal
function openDataModal() {
    const modalHtml = `
        <div id="data-modal" class="modal-overlay" onclick="if(event.target === this) DashboardUtils.closeModal('data-modal')">
            <div class="modal">
                <div class="modal-header">
                    <h3>Import / Export Data</h3>
                    <button class="modal-close" type="button" onclick="DashboardUtils.closeModal('data-modal')">Close</button>
                </div>
                <div class="modal-body" style="text-align: center; padding: var(--space-6);">
                    <div style="display: flex; gap: var(--space-4); justify-content: center; flex-wrap: wrap;">
                        <div style="text-align: center;">
                            <button class="btn btn-primary" onclick="handleDataExport()" style="margin-bottom: var(--space-2);">
                                Export Data
                            </button>
                            <p style="color: var(--text-secondary); font-size: 0.8125rem;">Download all dashboard data as JSON</p>
                        </div>
                        <div style="text-align: center;">
                            <label class="btn btn-secondary" style="margin-bottom: var(--space-2); display: inline-block;">
                                Import Data
                                <input type="file" accept=".json" onchange="handleDataImport(event)" style="display: none;">
                            </label>
                            <p style="color: var(--text-secondary); font-size: 0.8125rem;">Upload JSON backup file</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" type="button" onclick="DashboardUtils.closeModal('data-modal')">Close</button>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('data-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    DashboardUtils.openModal('data-modal');
}

function handleDataExport() {
    DashboardUtils.closeModal('data-modal');
    DashboardData.exportData();
}

async function handleDataImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    DashboardUtils.closeModal('data-modal');

    const perms = await DashboardData.checkActionPermission();
    if (!perms.allowed) {
        DashboardUtils.showToast(perms.message, 'error');
        return;
    }

    try {
        const content = await DashboardUtils.readFile(file);
        await DashboardData.importData(content);
        DashboardUtils.showToast('Data imported successfully.', 'success');
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Import failed.', 'error');
    } finally {
        event.target.value = '';
    }
}

window.openDataModal = openDataModal;

function changePage(delta) {
    adminState.page = Math.max(1, adminState.page + delta);
    renderCurrentTab();
}

function updateSearch(value) {
    adminState.search = value;
    adminState.page = 1;
    renderCurrentTab();
}

const debouncedUpdateSearch = DashboardUtils.debounce(updateSearch, 300);
window.debouncedUpdateSearch = debouncedUpdateSearch;

function openAddModal() {
    adminState.editingId = null;
    const config = currentConfig();
    document.getElementById('modal-title').textContent = `Add ${config.title.slice(0, -1)}`;
    document.getElementById('modal-body').innerHTML = config.form();
    DashboardUtils.openModal('item-modal');
}

async function editItem(id) {
    adminState.editingId = id;
    const item = adminState.items.find((entry) => entry.id === id);
    if (!item) {
        DashboardUtils.showToast('Record not found on this page.', 'error');
        return;
    }

    const config = currentConfig();
    document.getElementById('modal-title').textContent = `Edit ${config.title.slice(0, -1)}`;
    document.getElementById('modal-body').innerHTML = config.form(item);
    DashboardUtils.openModal('item-modal');
}

async function saveItem() {
    // Check permissions first
    const perms = await DashboardData.checkActionPermission();
    if (!perms.allowed) {
        DashboardUtils.showToast(perms.message, 'error');
        return;
    }

    const form = document.getElementById('item-form');
    if (!form) {
        return;
    }

    const formData = Object.fromEntries(new FormData(form).entries());

    // Client-side validation
    const errors = [];

    const titleError = DashboardUtils.validateLength(formData.title, 2, 200);
    if (titleError) errors.push(`Title: ${titleError}`);

    const contentField = formData.content || formData.description;
    if (contentField) {
        const contentError = DashboardUtils.validateLength(contentField, 2, 2000);
        if (contentError) errors.push(`Content: ${contentError}`);
    }

    const subjectField = formData.subject || formData.category;
    if (subjectField) {
        const subjectError = DashboardUtils.validateLength(subjectField, 0, 100);
        if (subjectError) errors.push(`Subject/Category: ${subjectError}`);
    }

    const dateField = formData.deadline_day || formData.date_day;
    if (dateField) {
        const dateName = formData.deadline_day ? 'deadline' : 'date';
        const dateResult = DashboardUtils.combineDateSelects(formData, dateName);
        if (dateResult && dateResult.error === 'past') {
            errors.push('Date & time cannot be in the past');
        } else if (dateResult) {
            const yearError = DashboardUtils.validateYear(dateResult);
            if (yearError) errors.push(`Date: ${yearError}`);
        }
    }

    if (formData.duration) {
        const durationError = DashboardUtils.validateNumber(formData.duration, 1, 480);
        if (durationError) errors.push(`Duration: ${durationError}`);
    }

    if (formData.totalMarks) {
        const marksError = DashboardUtils.validateNumber(formData.totalMarks, 1, 10000);
        if (marksError) errors.push(`Total marks: ${marksError}`);
    }

    if (errors.length > 0) {
        DashboardUtils.showToast(errors[0], 'error');
        return;
    }

    let payload;
    try {
        payload = currentConfig().toPayload(formData);
    } catch (err) {
        // Try toast, fall back to alert
        if (typeof DashboardUtils?.showToast === 'function') {
            DashboardUtils.showToast(err.message, 'error');
        } else {
            alert(err.message);
        }
        return;
    }
    const config = currentConfig();

    if (!navigator.onLine) {
        DashboardUtils.showToast('You are offline. Admin writes need Supabase.', 'warning');
        return;
    }

    try {
        if (adminState.editingId) {
            const index = adminState.items.findIndex((item) => item.id === adminState.editingId);
            const previous = { ...adminState.items[index] };
            adminState.items[index] = { ...adminState.items[index], ...payload };
            renderRecords(document.getElementById('tab-content'));

            try {
                const saved = await config.update(adminState.editingId, payload);
                adminState.items[index] = saved;
            } catch (error) {
                adminState.items[index] = previous;
                throw error;
            }

            DashboardUtils.showToast('Saved changes.', 'success');
        } else {
            const optimistic = config.tempRecord(payload);
            adminState.items = [optimistic, ...adminState.items].slice(0, adminState.pageSize);
            adminState.total += 1;
            renderRecords(document.getElementById('tab-content'));

            try {
                const created = await config.create(payload);
                adminState.items = adminState.items.map((item) => item.id === optimistic.id ? created : item);
            } catch (error) {
                adminState.items = adminState.items.filter((item) => item.id !== optimistic.id);
                adminState.total = Math.max(0, adminState.total - 1);
                throw error;
            }

            DashboardUtils.showToast('Created successfully.', 'success');
        }

        DashboardUtils.closeModal('item-modal');
        renderCurrentTab();
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not save the record.', 'error');
    }
}

async function deleteItem(id) {
    // Check permissions first
    const perms = await DashboardData.checkActionPermission();
    if (!perms.allowed) {
        DashboardUtils.showToast(perms.message, 'error');
        return;
    }

    const confirmed = await DashboardUtils.confirmAction('Delete this record from Supabase?');
    if (!confirmed) {
        return;
    }

    const config = currentConfig();
    const previousItems = [...adminState.items];
    const removed = previousItems.find((item) => item.id === id);
    adminState.items = adminState.items.filter((item) => item.id !== id);
    adminState.total = Math.max(0, adminState.total - 1);
    renderRecords(document.getElementById('tab-content'));

    try {
        await config.remove(id);
        DashboardUtils.showToast('Deleted successfully.', 'success');
        renderCurrentTab();
    } catch (error) {
        if (removed) {
            adminState.items = previousItems;
            adminState.total += 1;
            renderRecords(document.getElementById('tab-content'));
        }
        DashboardUtils.showToast(error.message || 'Delete failed.', 'error');
    }
}

async function changePassword(event) {
    // Check permissions first
    const perms = await DashboardData.checkActionPermission();
    if (!perms.allowed) {
        DashboardUtils.showToast(perms.message, 'error');
        return;
    }

    event.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const nextPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (nextPassword !== confirmPassword) {
        DashboardUtils.showToast('Passwords do not match.', 'error');
        return;
    }

    try {
        await DashboardData.updatePassword(currentPassword, nextPassword);
        DashboardUtils.showToast('Password updated.', 'success');
        event.target.reset();
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not update password.', 'error');
    }
}

async function handleImport(event) {
    // Check permissions first
    const perms = await DashboardData.checkActionPermission();
    if (!perms.allowed) {
        DashboardUtils.showToast(perms.message, 'error');
        return;
    }

    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        const content = await DashboardUtils.readFile(file);
        await DashboardData.importData(content);
        DashboardUtils.showToast('Cloud data restored.', 'success');
        renderCurrentTab();
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Import failed.', 'error');
    } finally {
        event.target.value = '';
    }
}

async function handleClearCloud() {
    // Check permissions first
    const perms = await DashboardData.checkActionPermission();
    if (!perms.allowed) {
        DashboardUtils.showToast(perms.message, 'error');
        return;
    }

    const confirmed = await DashboardUtils.confirmAction('Clear all announcements, assignments, deadlines, and quizzes from Supabase?');
    if (!confirmed) {
        return;
    }

    try {
        await DashboardData.clearAllContent();
        DashboardUtils.showToast('Cloud content cleared.', 'success');
        renderCurrentTab();
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Could not clear cloud content.', 'error');
    }
}

window.openFeedbackDetail = openFeedbackDetail;
window.deleteCurrentFeedback = deleteCurrentFeedback;
window.deleteFeedbackItem = deleteFeedbackItem;

document.addEventListener('DOMContentLoaded', checkAuth);

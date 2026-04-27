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
        toPayload: (formData) => ({
            title: formData.title.trim(),
            subject: formData.subject.trim(),
            description: formData.description.trim(),
            deadline: DashboardUtils.toIsoFromLocalInput(formData.deadline),
            status: formData.status
        }),
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
                    <input class="form-input" type="datetime-local" name="deadline" value="${DashboardUtils.toLocalInputValue(item.deadline)}" required>
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
        toPayload: (formData) => ({
            title: formData.title.trim(),
            category: formData.category.trim(),
            date: DashboardUtils.toIsoFromLocalInput(formData.date),
            priority: formData.priority
        }),
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
                    <input class="form-input" type="datetime-local" name="date" value="${DashboardUtils.toLocalInputValue(item.date)}" required>
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
        toPayload: (formData) => ({
            title: formData.title.trim(),
            subject: formData.subject.trim(),
            date: DashboardUtils.toIsoFromLocalInput(formData.date),
            duration: Number(formData.duration),
            totalMarks: formData.totalMarks ? Number(formData.totalMarks) : null
        }),
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
                    <input class="form-input" type="datetime-local" name="date" value="${DashboardUtils.toLocalInputValue(item.date)}" required>
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
        DashboardUtils.showToast('Admin session started.', 'success');
        showDashboard();
    } catch (error) {
        DashboardUtils.showToast(error.message || 'Login failed.', 'error');
    }
}

async function handleLogout() {
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
    const roleLabels = { 1: 'Viewer', 2: 'Editor', 3: 'Superadmin' };
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
                                    ${u.email === perms.email ? '<span class="badge badge-normal">You</span>' : ''}
                                </div>
                                <div class="admin-user-actions">
                                    <select class="form-select form-select-sm" onchange="handleUserStatusChange('${u.id}', this.value)" style="width: auto;">
                                        <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${u.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                    ${u.email !== perms.email ? `
                                        <select class="form-select form-select-sm" onchange="handleUserRoleChange('${u.id}', this.value)" style="width: auto;">
                                            <option value="1" ${u.role === 1 ? 'selected' : ''}>Viewer</option>
                                            <option value="2" ${u.role === 2 ? 'selected' : ''}>Editor</option>
                                            <option value="3" ${u.role === 3 ? 'selected' : ''}>Superadmin</option>
                                        </select>
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
                    <div class="profile-row">
                        <span class="profile-label">Status</span>
                        <span class="profile-value">${statusBadge}</span>
                    </div>
                    ${perms.role >= DashboardData.USER_ROLES.EDITOR && perms.isActive ? `
                        <button class="btn btn-secondary" onclick="openPasswordModal()">Change Password</button>
                    ` : ''}
                </div>
            </section>
            ${usersListHtml}
            <section class="panel danger-panel">
                <div class="panel-header">
                    <div>
                        <p class="eyebrow">Cloud maintenance</p>
                        <h2>Database Operations</h2>
                    </div>
                </div>
                <div class="danger-actions">
                    <label class="btn btn-secondary file-trigger">
                        Import/Export Data
                        <input type="file" accept=".json" onchange="handleImport(event)" style="display: none;">
                    </label>
                    <button class="btn btn-danger" onclick="handleClearCloud()">Clear Data</button>
                </div>
            </section>
        </div>
    `;
}

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
                                <option value="1">Viewer (1)</option>
                                <option value="2">Editor (2)</option>
                                <option value="3">Superadmin (3)</option>
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

// Expose functions globally
window.openPasswordModal = openPasswordModal;
window.submitPasswordChange = submitPasswordChange;
window.openAddUserModal = openAddUserModal;
window.submitAddUser = submitAddUser;
window.handleUserStatusChange = handleUserStatusChange;
window.handleUserRoleChange = handleUserRoleChange;

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

    const dateField = formData.deadline || formData.date;
    if (dateField) {
        const yearError = DashboardUtils.validateYear(DashboardUtils.toIsoFromLocalInput(dateField));
        if (yearError) errors.push(`Date: ${yearError}`);
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

    const payload = currentConfig().toPayload(formData);
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

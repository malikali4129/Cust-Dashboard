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
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" required>
                </label>
                <label class="field">
                    <span>Content</span>
                    <textarea class="form-textarea" name="content" required>${DashboardUtils.escapeHtml(item.content || '')}</textarea>
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
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" required>
                </label>
                <label class="field">
                    <span>Subject</span>
                    <input class="form-input" name="subject" value="${DashboardUtils.escapeHtml(item.subject || '')}">
                </label>
                <label class="field">
                    <span>Description</span>
                    <textarea class="form-textarea" name="description" required>${DashboardUtils.escapeHtml(item.description || '')}</textarea>
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
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" required>
                </label>
                <label class="field">
                    <span>Category</span>
                    <input class="form-input" name="category" value="${DashboardUtils.escapeHtml(item.category || '')}">
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
                    <input class="form-input" name="title" value="${DashboardUtils.escapeHtml(item.title || '')}" required>
                </label>
                <label class="field">
                    <span>Subject</span>
                    <input class="form-input" name="subject" value="${DashboardUtils.escapeHtml(item.subject || '')}">
                </label>
                <label class="field">
                    <span>Date and time</span>
                    <input class="form-input" type="datetime-local" name="date" value="${DashboardUtils.toLocalInputValue(item.date)}" required>
                </label>
                <label class="field">
                    <span>Duration</span>
                    <input class="form-input" type="number" min="1" name="duration" value="${item.duration || 30}" required>
                </label>
                <label class="field">
                    <span>Total marks</span>
                    <input class="form-input" type="number" min="1" name="totalMarks" value="${item.totalMarks || ''}">
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

async function checkAuth() {
    const user = await DashboardData.getCurrentAdminUser();
    if (user) {
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
    adminState.timeZone = settings.timeZone || DashboardUtils.TIME_ZONE_LABEL;
    DashboardUtils.setActiveTimeZone(adminState.timeZone);
}

function switchTab(tab) {
    adminState.currentTab = tab;
    adminState.page = 1;
    adminState.search = '';
    adminState.editingId = null;

    document.querySelectorAll('.tab, .nav-item[data-tab]').forEach((node) => {
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
                    <input class="form-input" value="${DashboardUtils.escapeHtml(adminState.search)}" placeholder="${DashboardUtils.escapeHtml(config.searchPlaceholder)}" oninput="updateSearch(this.value)">
                </label>
            </div>
            <div class="table-shell">
                <table class="data-table desktop-table">
                    <tbody>
                        ${adminState.items.map(config.desktopRow).join('') || '<tr><td colspan="6">No results.</td></tr>'}
                    </tbody>
                </table>
                <div class="mobile-record-list">
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

function renderSettings(container) {
    container.innerHTML = `
        <div class="settings-grid">
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <p class="eyebrow">Admin access</p>
                        <h2>Change password</h2>
                    </div>
                </div>
                <form class="editor-form" onsubmit="changePassword(event)">
                    <label class="field">
                        <span>Current password</span>
                        <input class="form-input" id="current-password" type="password" required>
                    </label>
                    <label class="field">
                        <span>New password</span>
                        <input class="form-input" id="new-password" type="password" minlength="8" required>
                    </label>
                    <label class="field">
                        <span>Confirm password</span>
                        <input class="form-input" id="confirm-password" type="password" minlength="8" required>
                    </label>
                    <button class="btn btn-primary" type="submit">Update password</button>
                </form>
            </section>
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <p class="eyebrow">Calendar clarity</p>
                        <h2>Dashboard timezone</h2>
                    </div>
                </div>
                <form class="editor-form" onsubmit="saveTimezone(event)">
                    <label class="field">
                        <span>Current timezone</span>
                        <input class="form-input" id="dashboard-timezone" value="${DashboardUtils.escapeHtml(adminState.timeZone)}" required>
                    </label>
                    <button class="btn btn-primary" type="submit">Save timezone</button>
                </form>
                <div class="settings-note">
                    All rendered dates use this timezone label. Datetime inputs are converted from the device timezone into UTC before save.
                </div>
            </section>
            <section class="panel danger-panel">
                <div class="panel-header">
                    <div>
                        <p class="eyebrow">Cloud maintenance</p>
                        <h2>Backup and reset</h2>
                    </div>
                </div>
                <div class="danger-actions">
                    <button class="btn btn-secondary" onclick="DashboardData.exportData()">Export JSON</button>
                    <label class="btn btn-secondary file-trigger">
                        Import JSON
                        <input type="file" accept=".json" onchange="handleImport(event)">
                    </label>
                    <button class="btn btn-danger" onclick="handleClearCloud()">Clear cloud content</button>
                </div>
            </section>
        </div>
    `;
}

function changePage(delta) {
    adminState.page = Math.max(1, adminState.page + delta);
    renderCurrentTab();
}

function updateSearch(value) {
    adminState.search = value;
    adminState.page = 1;
    renderCurrentTab();
}

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
    const form = document.getElementById('item-form');
    if (!form) {
        return;
    }

    const payload = currentConfig().toPayload(Object.fromEntries(new FormData(form).entries()));
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

async function saveTimezone(event) {
    event.preventDefault();
    const nextTimeZone = document.getElementById('dashboard-timezone').value.trim();

    try {
        await DashboardData.updateSettings({ timeZone: nextTimeZone });
        adminState.timeZone = nextTimeZone;
        DashboardUtils.setActiveTimeZone(nextTimeZone);
        DashboardUtils.showToast('Timezone updated.', 'success');
    } catch (error) {
        DashboardUtils.showToast('Could not update timezone.', 'error');
    }
}

async function handleImport(event) {
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

document.addEventListener('DOMContentLoaded', checkAuth);

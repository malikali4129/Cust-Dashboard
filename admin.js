/**
 * University Dashboard - Admin Panel Logic
 * Full CRUD operations with cloud database (Supabase)
 */

let currentTab = 'announcements';
let editingId = null;

// ==================== AUTHENTICATION ====================

function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showDashboard();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    
    try {
        const isValid = await DashboardData.verifyPassword(password);
        if (isValid) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            DashboardUtils.showToast('Login successful!', 'success');
            showDashboard();
        } else {
            DashboardUtils.showToast('Invalid password!', 'error');
            document.getElementById('login-password').value = '';
        }
    } catch (e) {
        DashboardUtils.showToast('Login error. Please try again.', 'error');
    }
}

function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    renderCurrentTab();
}

// ==================== TAB SWITCHING ====================

function switchTab(tab) {
    currentTab = tab;
    editingId = null;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    // Update sidebar nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick) {
            item.classList.toggle('active', onclick.includes(`'${tab}'`));
        }
    });
    
    renderCurrentTab();
}

async function renderCurrentTab() {
    const container = document.getElementById('tab-content');
    container.innerHTML = '<div class="text-center" style="padding: 40px; color: var(--text-muted);">Loading...</div>';
    
    try {
        switch(currentTab) {
            case 'announcements':
                await renderAnnouncementsTable(container);
                break;
            case 'assignments':
                await renderAssignmentsTable(container);
                break;
            case 'deadlines':
                await renderDeadlinesTable(container);
                break;
            case 'quizzes':
                await renderQuizzesTable(container);
                break;
            case 'settings':
                renderSettings(container);
                break;
        }
    } catch (e) {
        console.error('Error rendering tab:', e);
        container.innerHTML = '<div class="text-center" style="padding: 40px; color: var(--accent-danger);">Error loading data. Please refresh.</div>';
    }
}

// ==================== RENDER TABLES ====================

async function renderAnnouncementsTable(container) {
    const items = await DashboardData.getAnnouncements();
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📢 Announcements (${items.length})</h2>
                <input type="text" class="form-input" style="width: 250px;" 
                    placeholder="Search announcements..." 
                    oninput="filterTable(this.value, ['title', 'content'])">
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Content</th>
                            <th>Priority</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td><strong>${escapeHtml(item.title)}</strong></td>
                                <td>${escapeHtml(item.content.substring(0, 60))}${item.content.length > 60 ? '...' : ''}</td>
                                <td><span class="priority-badge ${item.priority}">${item.priority}</span></td>
                                <td>${DashboardUtils.formatDateTime(item.date)}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="editItem('${item.id}')">✏️ Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${items.length === 0 ? '<div class="empty-state"><h3>No announcements</h3><p>Add your first announcement</p></div>' : ''}
            </div>
        </div>
    `;
}

async function renderAssignmentsTable(container) {
    const items = await DashboardData.getAssignments();
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📝 Assignments (${items.length})</h2>
                <input type="text" class="form-input" style="width: 250px;" 
                    placeholder="Search assignments..." 
                    oninput="filterTable(this.value, ['title', 'subject', 'description'])">
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Subject</th>
                            <th>Deadline</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td><strong>${escapeHtml(item.title)}</strong></td>
                                <td>${escapeHtml(item.subject || '-')}</td>
                                <td>${DashboardUtils.formatDateTime(item.deadline)}</td>
                                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="editItem('${item.id}')">✏️ Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${items.length === 0 ? '<div class="empty-state"><h3>No assignments</h3><p>Add your first assignment</p></div>' : ''}
            </div>
        </div>
    `;
}

async function renderDeadlinesTable(container) {
    const items = await DashboardData.getDeadlines();
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">⏰ Deadlines (${items.length})</h2>
                <input type="text" class="form-input" style="width: 250px;" 
                    placeholder="Search deadlines..." 
                    oninput="filterTable(this.value, ['title', 'category'])">
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>Priority</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td><strong>${escapeHtml(item.title)}</strong></td>
                                <td>${escapeHtml(item.category || '-')}</td>
                                <td>${DashboardUtils.formatDateTime(item.date)}</td>
                                <td><span class="priority-badge ${item.priority}">${item.priority}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="editItem('${item.id}')">✏️ Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${items.length === 0 ? '<div class="empty-state"><h3>No deadlines</h3><p>Add your first deadline</p></div>' : ''}
            </div>
        </div>
    `;
}

async function renderQuizzesTable(container) {
    const items = await DashboardData.getQuizzes();
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">❓ Quizzes (${items.length})</h2>
                <input type="text" class="form-input" style="width: 250px;" 
                    placeholder="Search quizzes..." 
                    oninput="filterTable(this.value, ['title', 'subject'])">
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Subject</th>
                            <th>Date</th>
                            <th>Duration</th>
                            <th>Marks</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td><strong>${escapeHtml(item.title)}</strong></td>
                                <td>${escapeHtml(item.subject || '-')}</td>
                                <td>${DashboardUtils.formatDateTime(item.date)}</td>
                                <td>${item.duration} min</td>
                                <td>${item.totalMarks || '-'}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="editItem('${item.id}')">✏️ Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${items.length === 0 ? '<div class="empty-state"><h3>No quizzes</h3><p>Add your first quiz</p></div>' : ''}
            </div>
        </div>
    `;
}

function renderSettings(container) {
    container.innerHTML = `
        <div class="content-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">🔐 Change Password</h2>
                </div>
                <form onsubmit="changePassword(event)">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" id="current-password" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="new-password" class="form-input" required minlength="4">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="confirm-password" class="form-input" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Update Password</button>
                </form>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">⚠️ Danger Zone</h2>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="padding: 16px; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                        <h4 style="margin-bottom: 8px;">Reset All Data</h4>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 12px;">
                            This will delete all local data and restore defaults. Cloud data is not affected.
                        </p>
                        <button class="btn btn-danger" onclick="handleReset()">Reset Local Data</button>
                    </div>
                    
                    <div style="padding: 16px; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                        <h4 style="margin-bottom: 8px;">Data Backup</h4>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 12px;">
                            Export your local data as JSON or import from a previous backup.
                        </p>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-secondary" onclick="DashboardData.exportData()">📥 Export JSON</button>
                            <label class="btn btn-secondary" style="cursor: pointer;">
                                📤 Import JSON
                                <input type="file" accept=".json" style="display: none;" onchange="handleImport(event)">
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== MODAL OPERATIONS ====================

function openAddModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = `Add New ${capitalize(currentTab.slice(0, -1))}`;
    document.getElementById('modal-body').innerHTML = getFormHTML(currentTab);
    DashboardUtils.openModal('item-modal');
}

async function editItem(id) {
    editingId = id;
    let item = null;
    
    try {
        switch(currentTab) {
            case 'announcements':
                const announcements = await DashboardData.getAnnouncements();
                item = announcements.find(a => a.id === id);
                break;
            case 'assignments':
                const assignments = await DashboardData.getAssignments();
                item = assignments.find(a => a.id === id);
                break;
            case 'deadlines':
                const deadlines = await DashboardData.getDeadlines();
                item = deadlines.find(d => d.id === id);
                break;
            case 'quizzes':
                const quizzes = await DashboardData.getQuizzes();
                item = quizzes.find(q => q.id === id);
                break;
        }
    } catch (e) {
        DashboardUtils.showToast('Error loading item!', 'error');
        return;
    }
    
    if (!item) {
        DashboardUtils.showToast('Item not found!', 'error');
        return;
    }
    
    document.getElementById('modal-title').textContent = `Edit ${capitalize(currentTab.slice(0, -1))}`;
    document.getElementById('modal-body').innerHTML = getFormHTML(currentTab, item);
    DashboardUtils.openModal('item-modal');
}

function getFormHTML(type, item = null) {
    const isEdit = !!item;
    
    switch(type) {
        case 'announcements':
            return `
                <form id="item-form">
                    <div class="form-group">
                        <label class="form-label">Title *</label>
                        <input type="text" name="title" class="form-input" value="${isEdit ? escapeHtml(item.title) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Content *</label>
                        <textarea name="content" class="form-textarea" required>${isEdit ? escapeHtml(item.content) : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select name="priority" class="form-select">
                            <option value="normal" ${isEdit && item.priority === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="high" ${isEdit && item.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                </form>
            `;
            
        case 'assignments':
            return `
                <form id="item-form">
                    <div class="form-group">
                        <label class="form-label">Title *</label>
                        <input type="text" name="title" class="form-input" value="${isEdit ? escapeHtml(item.title) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subject</label>
                        <input type="text" name="subject" class="form-input" value="${isEdit ? escapeHtml(item.subject || '') : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description *</label>
                        <textarea name="description" class="form-textarea" required>${isEdit ? escapeHtml(item.description) : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Deadline *</label>
                        <input type="datetime-local" name="deadline" class="form-input" 
                            value="${isEdit ? formatDateTimeLocal(item.deadline) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select name="status" class="form-select">
                            <option value="pending" ${isEdit && item.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="completed" ${isEdit && item.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                </form>
            `;
            
        case 'deadlines':
            return `
                <form id="item-form">
                    <div class="form-group">
                        <label class="form-label">Title *</label>
                        <input type="text" name="title" class="form-input" value="${isEdit ? escapeHtml(item.title) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <input type="text" name="category" class="form-input" value="${isEdit ? escapeHtml(item.category || '') : ''}" 
                            placeholder="e.g., Project, Lab, Exam">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date & Time *</label>
                        <input type="datetime-local" name="date" class="form-input" 
                            value="${isEdit ? formatDateTimeLocal(item.date) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select name="priority" class="form-select">
                            <option value="low" ${isEdit && item.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${isEdit && item.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${isEdit && item.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                </form>
            `;
            
        case 'quizzes':
            return `
                <form id="item-form">
                    <div class="form-group">
                        <label class="form-label">Title *</label>
                        <input type="text" name="title" class="form-input" value="${isEdit ? escapeHtml(item.title) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subject</label>
                        <input type="text" name="subject" class="form-input" value="${isEdit ? escapeHtml(item.subject || '') : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date & Time *</label>
                        <input type="datetime-local" name="date" class="form-input" 
                            value="${isEdit ? formatDateTimeLocal(item.date) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Duration (minutes) *</label>
                        <input type="number" name="duration" class="form-input" min="1" 
                            value="${isEdit ? item.duration : '30'}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Total Marks</label>
                        <input type="number" name="totalMarks" class="form-input" min="1" 
                            value="${isEdit ? item.totalMarks || '' : ''}">
                    </div>
                </form>
            `;
    }
}

async function saveItem() {
    const form = document.getElementById('item-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validation
    if (!data.title || data.title.trim() === '') {
        DashboardUtils.showToast('Title is required!', 'error');
        return;
    }
    
    try {
        if (editingId) {
            // Update existing
            switch(currentTab) {
                case 'announcements':
                    await DashboardData.updateAnnouncement(editingId, data);
                    break;
                case 'assignments':
                    await DashboardData.updateAssignment(editingId, data);
                    break;
                case 'deadlines':
                    await DashboardData.updateDeadline(editingId, data);
                    break;
                case 'quizzes':
                    data.duration = parseInt(data.duration);
                    data.totalMarks = data.totalMarks ? parseInt(data.totalMarks) : null;
                    await DashboardData.updateQuiz(editingId, data);
                    break;
            }
            DashboardUtils.showToast('Updated successfully!', 'success');
        } else {
            // Create new
            switch(currentTab) {
                case 'announcements':
                    await DashboardData.addAnnouncement(data);
                    break;
                case 'assignments':
                    await DashboardData.addAssignment(data);
                    break;
                case 'deadlines':
                    await DashboardData.addDeadline(data);
                    break;
                case 'quizzes':
                    data.duration = parseInt(data.duration);
                    data.totalMarks = data.totalMarks ? parseInt(data.totalMarks) : null;
                    await DashboardData.addQuiz(data);
                    break;
            }
            DashboardUtils.showToast('Added successfully!', 'success');
        }
        
        DashboardUtils.closeModal('item-modal');
        await renderCurrentTab();
    } catch (e) {
        console.error(e);
        DashboardUtils.showToast('Error saving item!', 'error');
    }
}

async function deleteItem(id) {
    const confirmed = await DashboardUtils.confirmAction('Are you sure you want to delete this item?');
    if (!confirmed) return;
    
    try {
        switch(currentTab) {
            case 'announcements':
                await DashboardData.deleteAnnouncement(id);
                break;
            case 'assignments':
                await DashboardData.deleteAssignment(id);
                break;
            case 'deadlines':
                await DashboardData.deleteDeadline(id);
                break;
            case 'quizzes':
                await DashboardData.deleteQuiz(id);
                break;
        }
        
        DashboardUtils.showToast('Deleted successfully!', 'success');
        await renderCurrentTab();
    } catch (e) {
        console.error(e);
        DashboardUtils.showToast('Error deleting item!', 'error');
    }
}

// ==================== SETTINGS ====================

async function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;
    
    try {
        const isValid = await DashboardData.verifyPassword(current);
        if (!isValid) {
            DashboardUtils.showToast('Current password is incorrect!', 'error');
            return;
        }
    } catch (e) {
        DashboardUtils.showToast('Error verifying password!', 'error');
        return;
    }
    
    if (newPass !== confirm) {
        DashboardUtils.showToast('New passwords do not match!', 'error');
        return;
    }
    
    if (newPass.length < 4) {
        DashboardUtils.showToast('Password must be at least 4 characters!', 'error');
        return;
    }
    
    try {
        await DashboardData.updatePassword(newPass);
        DashboardUtils.showToast('Password updated successfully!', 'success');
        
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } catch (e) {
        DashboardUtils.showToast('Error updating password!', 'error');
    }
}

async function handleReset() {
    const success = DashboardData.resetData();
    if (success) {
        DashboardUtils.showToast('Local data reset to defaults!', 'success');
        await renderCurrentTab();
    }
}

// ==================== IMPORT/EXPORT ====================

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const content = await DashboardUtils.readFile(file);
        const success = DashboardData.importData(content);
        
        if (success) {
            DashboardUtils.showToast('Data imported successfully!', 'success');
            await renderCurrentTab();
        } else {
            DashboardUtils.showToast('Invalid data format!', 'error');
        }
    } catch (err) {
        DashboardUtils.showToast('Error reading file!', 'error');
    }
    
    e.target.value = '';
}

// ==================== HELPERS ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDateTimeLocal(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function filterTable(searchTerm, fields) {
    const rows = document.querySelectorAll('.data-table tbody tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = Array.from(row.querySelectorAll('td'))
            .map(td => td.textContent.toLowerCase())
            .join(' ');
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

function updateThemeButton() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (text) text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateThemeButton();
});

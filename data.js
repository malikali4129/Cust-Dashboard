/**
 * University Dashboard - Supabase data and auth layer
 * Cloud-only mode with authenticated writes and public reads.
 */

const ADMIN_SESSION_KEY = 'dashboard_admin_session';
const DATA_CACHE_KEY = 'dashboard_data_cache';
const DEFAULT_PAGE_SIZE = 8;
const DEFAULT_TIME_ZONE = 'Asia/Karachi';

// ─── Local Storage Cache ───────────────────────────────────────────────────
function getLocalCache() {
    try {
        const data = localStorage.getItem(DATA_CACHE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

function setLocalCache(key, value) {
    try {
        const cache = getLocalCache();
        cache[key] = { data: value, timestamp: Date.now() };
        localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
        console.warn('[data] localStorage save failed:', err.message);
    }
}

function getLocalCacheData(key) {
    try {
        const cache = getLocalCache();
        return cache[key]?.data;
    } catch {
        return null;
    }
}

function clearLocalCache() {
    try {
        localStorage.removeItem(DATA_CACHE_KEY);
    } catch (err) {
        console.warn('[data] clearCache failed:', err.message);
    }
}

function isSupabaseConfigured() {
    return typeof SUPABASE_CONFIG !== 'undefined' &&
        Boolean(SUPABASE_CONFIG.url) &&
        Boolean(SUPABASE_CONFIG.anonKey);
}

function ensureSupabaseConfigured() {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured.');
    }
}

function getSession() {
    try {
        const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
    }
}

function setSession(session) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

function buildHeaders({ auth = false, count = false, extra = {} } = {}) {
    const headers = {
        apikey: SUPABASE_CONFIG.anonKey,
        'Content-Type': 'application/json',
        ...extra
    };

    if (count) {
        headers.Prefer = 'count=exact';
    }

    if (auth) {
        const session = getSession();
        if (!session?.access_token) {
            throw new Error('Admin session is required.');
        }
        headers.Authorization = `Bearer ${session.access_token}`;
    } else if (!headers.Authorization) {
        headers.Authorization = `Bearer ${SUPABASE_CONFIG.anonKey}`;
    }

    return headers;
}

async function refreshAdminSession() {
    const session = getSession();
    if (!session?.refresh_token) {
        clearSession();
        throw new Error('Session expired.');
    }

    const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ refresh_token: session.refresh_token })
    });

    if (!response.ok) {
        clearSession();
        throw new Error('Could not refresh session.');
    }

    const nextSession = await response.json();
    setSession(nextSession);
    return nextSession;
}

async function request(path, options = {}, retry = true) {
    ensureSupabaseConfigured();

    const response = await fetch(`${SUPABASE_CONFIG.url}${path}`, options);
    console.debug(`[DashboardData] ${options.method || 'GET'} ${path} → ${response.status}`);

    // Handle 401 retry
    if (response.status === 401 && retry && options.headers?.Authorization?.startsWith('Bearer ')) {
        try {
            await refreshAdminSession();
            const retriedHeaders = {
                ...options.headers,
                Authorization: `Bearer ${getSession().access_token}`
            };
            return request(path, { ...options, headers: retriedHeaders }, false);
        } catch (error) {
            clearSession();
            throw error;
        }
    }

    return response;
}

function parseCount(response) {
    const contentRange = response.headers.get('content-range');
    if (!contentRange || !contentRange.includes('/')) {
        return 0;
    }

    const total = contentRange.split('/')[1];
    return total === '*' ? 0 : Number(total);
}

function encodeSearch(fields, term) {
    if (!term) {
        return '';
    }

    const value = term.replace(/[%*,()]/g, '').trim();
    if (!value) {
        return '';
    }

    const filters = fields.map((field) => `${field}.ilike.*${value}*`);
    return `or=(${filters.join(',')})`;
}

function rangeHeaders(page, pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    return {
        'Range-Unit': 'items',
        Range: `${start}-${end}`
    };
}

function toQuery(params) {
    return params.filter(Boolean).join('&');
}

function normalizeAnnouncement(item) {
    return {
        id: item.id,
        title: item.title,
        content: item.content,
        priority: item.priority || 'normal',
        date: item.date || item.created_at
    };
}

function normalizeAssignment(item) {
    return {
        id: item.id,
        title: item.title,
        subject: item.subject,
        description: item.description,
        deadline: item.deadline,
        status: item.status || 'pending'
    };
}

function normalizeDeadline(item) {
    return {
        id: item.id,
        title: item.title,
        category: item.category,
        date: item.date,
        priority: item.priority || 'medium'
    };
}

function normalizeQuiz(item) {
    return {
        id: item.id,
        title: item.title,
        subject: item.subject,
        date: item.date,
        duration: item.duration,
        totalMarks: item.total_marks
    };
}

async function pagedRead(table, { page = 1, pageSize = DEFAULT_PAGE_SIZE, order, search = '', fields = [], normalize = (item) => item } = {}) {
    const query = toQuery([
        'select=*',
        `order=${order}`,
        encodeSearch(fields, search)
    ]);
    const cacheKey = `${table}_page_${page}_${pageSize}_${search}`;

    try {
        const response = await request(`/rest/v1/${table}?${query}`, {
            headers: buildHeaders({
                count: true,
                extra: rangeHeaders(page, pageSize)
            })
        });

        if (!response.ok) {
            throw new Error(`Could not load ${table} (${response.status}).`);
        }

        const items = await response.json();
        const result = {
            items: items.map(normalize),
            total: parseCount(response),
            page,
            pageSize
        };

        // Cache successful response to localStorage
        setLocalCache(cacheKey, result);

        return result;
    } catch (err) {
        // If offline, try localStorage cache first
        if (!navigator.onLine) {
            const cached = getLocalCacheData(cacheKey);
            if (cached) {
                console.warn(`[pagedRead] Offline - using cached ${table}`);
                return cached;
            }
            console.warn(`[pagedRead] Offline - no cache for ${table}`);
            return { items: [], total: 0, page, pageSize };
        }
        throw err;
    }
}

async function listRead(table, { limit, order, normalize = (item) => item } = {}) {
    const query = toQuery([
        'select=*',
        `order=${order}`,
        limit ? `limit=${limit}` : ''
    ]);
    const cacheKey = `${table}_list_${limit || 'all'}_${order}`;

    try {
        const response = await request(`/rest/v1/${table}?${query}`, {
            headers: buildHeaders()
        });

        if (!response.ok) {
            throw new Error(`Could not load ${table} (${response.status}).`);
        }

        const items = await response.json();
        const result = items.map(normalize);

        // Cache successful response to localStorage
        setLocalCache(cacheKey, result);

        return result;
    } catch (err) {
        // If offline, try localStorage cache first
        if (!navigator.onLine) {
            const cached = getLocalCacheData(cacheKey);
            if (cached) {
                console.warn(`[listRead] Offline - using cached ${table}`);
                return cached;
            }
            console.warn(`[listRead] Offline - no cache for ${table}`);
            return [];
        }
        throw err;
    }
}

async function countRead(table, filters = []) {
    const query = toQuery(['select=id', ...filters]);
    const response = await request(`/rest/v1/${table}?${query}`, {
        method: 'HEAD',
        headers: buildHeaders({
            count: true,
            extra: { 'Range-Unit': 'items', Range: '0-0' }
        })
    });

    if (!response.ok) {
        throw new Error(`Could not count ${table} (${response.status}).`);
    }

    return parseCount(response);
}

async function createRow(table, payload, { auth = true } = {}) {
    const response = await request(`/rest/v1/${table}`, {
        method: 'POST',
        headers: buildHeaders({
            auth,
            extra: { Prefer: 'return=representation' }
        }),
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(`Could not create ${table} (${response.status}).`);
    }

    // Log the action
    logAction(`create_${table}`, { id: result[0]?.id, data: payload });
    return result;
}

async function updateRow(table, id, payload, shouldLog = true) {
    const response = await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: buildHeaders({
            auth: true,
            extra: { Prefer: 'return=representation' }
        }),
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(`Could not update ${table} (${response.status}).`);
    }

    if (shouldLog) {
        logAction(`update_${table}`, { id: id, data: payload });
    }
    return result;
}

async function deleteRow(table, id) {
    const response = await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildHeaders({ auth: true })
    });

    if (!response.ok) {
        throw new Error(`Could not delete ${table} (${response.status}).`);
    }

    logAction(`delete_${table}`, { id: id });
}

async function touchSettings(partial = {}) {
    // Update settings without logging - let manual changes be logged
    await updateRow('settings', 1, {
        last_updated: new Date().toISOString(),
        ...partial
    }, false); // false = no logging
}

// Helper to update row (use logging by default)
async function signInAdmin(email, password) {
    const response = await request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ email, password })
    }, false);

    if (!response.ok) {
        throw new Error('Invalid email or password.');
    }

    const session = await response.json();
    setSession(session);
    return session;
}

async function signOutAdmin() {
    const session = getSession();
    if (session?.access_token) {
        await request('/auth/v1/logout', {
            method: 'POST',
            headers: buildHeaders({ auth: true })
        }, false).catch(() => undefined);
    }

    clearSession();
}

async function getCurrentAdminUser() {
    const session = getSession();
    if (!session?.access_token) {
        return null;
    }

    const response = await request('/auth/v1/user', {
        headers: buildHeaders({ auth: true })
    }, false);

    if (!response.ok) {
        clearSession();
        return null;
    }

    return response.json();
}

// Permission check constants
const USER_ROLES = {
    SUPERADMIN: 1,
    EDITOR: 2,
    VIEWER: 3
};

// Cooldown tracking
let lastBlockedTime = 0;
const BLOCK_COOLDOWN = 33000; // 33 seconds

// Check user permissions - role and active status
// Returns { role: number, status: string, isActive: boolean, canEdit: boolean, email: string }
async function checkUserPermissions() {
    const session = getSession();
    if (!session?.access_token) {
        return { role: 0, status: 'logged_out', isActive: false, canEdit: false, email: null };
    }

    try {
        // Get user info from Supabase Auth
        const response = await request('/auth/v1/user', {
            method: 'GET',
            headers: buildHeaders({ auth: true })
        }, false);

        if (!response.ok) {
            return { role: 0, status: 'unauthorized', isActive: false, canEdit: false, email: null };
        }

        const user = await response.json();
        const email = user.email?.toLowerCase();

        if (!email) {
            return { role: 0, status: 'no_email', isActive: false, canEdit: false, email: null };
        }

        // Check admin_users table for role and status
        const adminCheck = await request('/rest/v1/admin_users?email=eq.' + encodeURIComponent(email) + '&select=id,role,status', {
            method: 'GET',
            headers: buildHeaders({ auth: true })
        }, false);

        if (adminCheck.ok) {
            const admins = await adminCheck.json();
            if (admins.length > 0) {
                const admin = admins[0];
                const role = admin.role || 1;
                const isActive = admin.status === 'active';

                return {
                    role: role,
                    status: admin.status,
                    isActive: isActive,
                    canEdit: role <= USER_ROLES.EDITOR && isActive,
                    email: email
                };
            }
        }

        // User not in admin_users table - default to viewer, inactive
        return { role: USER_ROLES.VIEWER, status: 'not_found', isActive: false, canEdit: false, email: email };
    } catch (error) {
        console.warn('[checkUserPermissions] Error:', error.message);
        return { role: 0, status: 'error', isActive: false, canEdit: false, email: null };
    }
}

// Check if user can perform an action
// Returns { allowed: boolean, cooldownRemaining: number, message: string }
async function checkActionPermission() {
    const perms = await checkUserPermissions();

    // Check cooldown
    const now = Date.now();
    const cooldownRemaining = lastBlockedTime > 0 ? Math.max(0, Math.ceil((lastBlockedTime + BLOCK_COOLDOWN - now) / 1000)) : 0;

    // If still in cooldown period
    if (cooldownRemaining > 0) {
        return {
            allowed: false,
            cooldownRemaining: cooldownRemaining,
            message: `Access blocked. Please wait ${cooldownRemaining} seconds.`
        };
    }

    // Not logged in
    if (perms.role === 0) {
        return { allowed: false, cooldownRemaining: 0, message: 'Please log in first.' };
    }

    // Viewer role - can only view
    if (perms.role === USER_ROLES.VIEWER) {
        return { allowed: false, cooldownRemaining: 0, message: 'Viewers cannot perform this action. Upgrade to Editor for full access.' };
    }

    // Editor but inactive
    if (!perms.isActive) {
        // Set blocked time for cooldown
        lastBlockedTime = now;
        return {
            allowed: false,
            cooldownRemaining: 33,
            message: 'Your account is inactive. Please contact admin.'
        };
    }

    // Superadmin or active editor
    return { allowed: true, cooldownRemaining: 0, message: '' };
}

// Clear cooldown (call after successful action)
function clearActionCooldown() {
    lastBlockedTime = 0;
}

async function updatePassword(currentPassword, nextPassword) {
    const user = await getCurrentAdminUser();
    if (!user?.email) {
        throw new Error('Admin session required.');
    }

    await signInAdmin(user.email, currentPassword);
    const response = await request('/auth/v1/user', {
        method: 'PUT',
        headers: buildHeaders({ auth: true }),
        body: JSON.stringify({ password: nextPassword })
    });

    if (!response.ok) {
        throw new Error('Could not update password.');
    }
}

async function getSettings() {
    try {
        const response = await request('/rest/v1/settings?select=*&id=eq.1&limit=1', {
            headers: buildHeaders()
        });

        if (!response.ok) {
            throw new Error(`Could not load settings (${response.status}).`);
        }

        const rows = await response.json();
        const row = rows[0] || {};
        const result = {
            timeZone: DEFAULT_TIME_ZONE,
            lastUpdated: row.last_updated || null
        };

        // Cache to localStorage
        setLocalCache('settings', result);

        return result;
    } catch (err) {
        // If offline, try localStorage cache first
        if (!navigator.onLine) {
            const cached = getLocalCacheData('settings');
            if (cached) {
                console.warn('[getSettings] Offline - using cached settings');
                return cached;
            }
            console.warn('[getSettings] Offline - returning defaults');
            return {
                timeZone: DEFAULT_TIME_ZONE,
                lastUpdated: null
            };
        }
        throw err;
    }
}

async function updateSettings(nextSettings) {
    await touchSettings({
        dashboard_timezone: DEFAULT_TIME_ZONE
    });
}

async function getAnnouncements(options = {}) {
    return listRead('announcements', {
        limit: options.limit,
        order: 'date.desc',
        normalize: normalizeAnnouncement
    });
}

async function getAnnouncementsPage(options = {}) {
    return pagedRead('announcements', {
        ...options,
        order: 'date.desc',
        fields: ['title', 'content', 'priority'],
        normalize: normalizeAnnouncement
    });
}

async function addAnnouncement(announcement) {
    const rows = await createRow('announcements', {
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority || 'normal',
        date: announcement.date || new Date().toISOString()
    });
    await touchSettings();
    return normalizeAnnouncement(rows[0]);
}

async function updateAnnouncement(id, updates) {
    const rows = await updateRow('announcements', id, updates);
    await touchSettings();
    return normalizeAnnouncement(rows[0]);
}

async function deleteAnnouncement(id) {
    await deleteRow('announcements', id);
    await touchSettings();
}

async function getAssignments(options = {}) {
    return listRead('assignments', {
        limit: options.limit,
        order: 'deadline.asc',
        normalize: normalizeAssignment
    });
}

async function getAssignmentsPage(options = {}) {
    return pagedRead('assignments', {
        ...options,
        order: 'deadline.asc',
        fields: ['title', 'subject', 'description', 'status'],
        normalize: normalizeAssignment
    });
}

async function addAssignment(assignment) {
    const rows = await createRow('assignments', {
        title: assignment.title,
        subject: assignment.subject || null,
        description: assignment.description,
        deadline: assignment.deadline,
        status: assignment.status || 'pending'
    });
    await touchSettings();
    return normalizeAssignment(rows[0]);
}

async function updateAssignment(id, updates) {
    const rows = await updateRow('assignments', id, updates);
    await touchSettings();
    return normalizeAssignment(rows[0]);
}

async function deleteAssignment(id) {
    await deleteRow('assignments', id);
    await touchSettings();
}

async function getDeadlines(options = {}) {
    return listRead('deadlines', {
        limit: options.limit,
        order: 'date.asc',
        normalize: normalizeDeadline
    });
}

async function getDeadlinesPage(options = {}) {
    return pagedRead('deadlines', {
        ...options,
        order: 'date.asc',
        fields: ['title', 'category', 'priority'],
        normalize: normalizeDeadline
    });
}

async function addDeadline(deadline) {
    const rows = await createRow('deadlines', {
        title: deadline.title,
        category: deadline.category || null,
        date: deadline.date,
        priority: deadline.priority || 'medium'
    });
    await touchSettings();
    return normalizeDeadline(rows[0]);
}

async function updateDeadline(id, updates) {
    const rows = await updateRow('deadlines', id, updates);
    await touchSettings();
    return normalizeDeadline(rows[0]);
}

async function deleteDeadline(id) {
    await deleteRow('deadlines', id);
    await touchSettings();
}

async function getQuizzes(options = {}) {
    return listRead('quizzes', {
        limit: options.limit,
        order: 'date.asc',
        normalize: normalizeQuiz
    });
}

async function getQuizzesPage(options = {}) {
    return pagedRead('quizzes', {
        ...options,
        order: 'date.asc',
        fields: ['title', 'subject'],
        normalize: normalizeQuiz
    });
}

async function addQuiz(quiz) {
    const rows = await createRow('quizzes', {
        title: quiz.title,
        subject: quiz.subject || null,
        date: quiz.date,
        duration: Number(quiz.duration),
        total_marks: quiz.totalMarks ? Number(quiz.totalMarks) : null
    });
    await touchSettings();
    return normalizeQuiz(rows[0]);
}

async function updateQuiz(id, updates) {
    const payload = { ...updates };
    if (Object.prototype.hasOwnProperty.call(payload, 'totalMarks')) {
        payload.total_marks = payload.totalMarks ? Number(payload.totalMarks) : null;
        delete payload.totalMarks;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'duration')) {
        payload.duration = Number(payload.duration);
    }
    const rows = await updateRow('quizzes', id, payload);
    await touchSettings();
    return normalizeQuiz(rows[0]);
}

async function deleteQuiz(id) {
    await deleteRow('quizzes', id);
    await touchSettings();
}

function normalizeFeedback(item) {
    return {
        id: item.id,
        name: item.name,
        suggestion: item.suggestion,
        rating: item.rating,
        created_at: item.created_at
    };
}

async function getFeedbackPage(options = {}) {
    return pagedRead('feedback', {
        ...options,
        order: 'created_at.desc',
        fields: ['name', 'suggestion'],
        normalize: normalizeFeedback
    });
}

async function addFeedback(feedback) {
    const rows = await createRow('feedback', {
        name: feedback.name.trim(),
        suggestion: feedback.suggestion.trim(),
        rating: Number(feedback.rating)
    }, { auth: false });
    return normalizeFeedback(rows[0]);
}

async function deleteFeedback(id) {
    await deleteRow('feedback', id);
}

// Admin user management functions
async function getAdminUsers() {
    const response = await request('/rest/v1/admin_users?select=*&order=created_at.desc', {
        method: 'GET',
        headers: buildHeaders({ auth: true })
    });

    if (!response.ok) {
        throw new Error('Could not load admin users.');
    }

    return response.json();
}

async function addAdminUser(email, role, status = 'active') {
    const response = await request('/rest/v1/admin_users', {
        method: 'POST',
        headers: buildHeaders({
            auth: true,
            extra: { Prefer: 'return=representation' }
        }),
        body: JSON.stringify({
            email: email.toLowerCase(),
            role: role,
            status: status
        })
    });

    const result = await response.json();

    if (!response.ok) {
        const errorText = JSON.stringify(result);
        if (errorText.includes('duplicate') || errorText.includes('unique')) {
            throw new Error('User already exists.');
        }
        throw new Error('Could not add admin user.');
    }

    await logAction('add_admin_user', { targetEmail: email, role: role, status: status });
    return result;
}

async function updateAdminUser(id, updates) {
    const response = await request('/rest/v1/admin_users?id=eq.' + id, {
        method: 'PATCH',
        headers: buildHeaders({
            auth: true,
            extra: { Prefer: 'return=representation' }
        }),
        body: JSON.stringify(updates)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error('Could not update admin user.');
    }

    await logAction('update_admin_user', { userId: id, changes: updates });
    return result;
}

async function deleteAdminUser(id) {
    const response = await request('/rest/v1/admin_users?id=eq.' + id, {
        method: 'DELETE',
        headers: buildHeaders({ auth: true })
    });

    if (!response.ok) {
        throw new Error('Could not delete admin user.');
    }
}

// ==================== LOGGING SYSTEM ====================

// Log an action
async function logAction(action, details = {}) {
    try {
        // Get current user info for logging
        let email = 'unknown';
        try {
            const session = getSession();
            if (session?.user?.email) {
                email = session.user.email;
            }
        } catch {}

        const logEntry = {
            email: email,
            action: action,
            details: details
        };

        console.log('[logAction] Logging:', logEntry);

        const response = await request('/rest/v1/logs', {
            method: 'POST',
            headers: buildHeaders({
                auth: true,
                extra: { Prefer: 'return=representation' }
            }),
            body: JSON.stringify(logEntry)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[logAction] Failed to log:', response.status, errText);
        } else {
            console.log('[logAction] Log created successfully');
        }
    } catch (err) {
        console.error('[logAction] Failed to log:', err.message);
    }
}

// Get logs with filters
async function getLogs({ page = 1, pageSize = 30, email = '', action = '', startDate = '', endDate = '' } = {}) {
    let url = '/rest/v1/logs?order=created_at.desc&limit=' + pageSize;

    const offset = (page - 1) * pageSize;
    url += '&offset=' + offset;

    if (email) {
        url += '&email=ilike.*' + encodeURIComponent(email) + '*';
    }
    if (action) {
        url += '&action=ilike.*' + encodeURIComponent(action) + '*';
    }
    if (startDate) {
        url += '&created_at=gte.' + encodeURIComponent(startDate);
    }
    if (endDate) {
        // Add one day to include the full end date
        url += '&created_at=lte.' + encodeURIComponent(endDate + 'T23:59:59');
    }

    try {
        const response = await request(url, {
            method: 'GET',
            headers: buildHeaders({ auth: true })
        });

        if (!response.ok) {
            console.error('[getLogs] Response not OK:', response.status);
            return { logs: [], total: 0, page, pageSize };
        }

        const logs = await response.json();
        console.log('[getLogs] Got logs:', logs.length, logs);

        return {
            logs: logs || [],
            total: logs?.length || 0,
            page: page,
            pageSize: pageSize
        };
    } catch (err) {
        console.error('[getLogs] Error:', err);
        return { logs: [], total: 0, page, pageSize };
    }
}

// Get log statistics
async function getLogStats() {
    try {
        const now = new Date().toISOString();
        const today = now.split('T')[0];

        // Get today's logs count
        const todayResponse = await request('/rest/v1/logs?created_at=gte.' + encodeURIComponent(today), {
            method: 'GET',
            headers: buildHeaders({ auth: true })
        });

        let todayCount = 0;
        if (todayResponse.ok) {
            const todayLogs = await todayResponse.json();
            todayCount = todayLogs?.length || 0;
        }

        // Get unique users count
        const usersResponse = await request('/rest/v1/logs?select=email&limit=1000', {
            method: 'GET',
            headers: buildHeaders({ auth: true })
        });

        const uniqueUsers = new Set();
        if (usersResponse.ok) {
            const allLogs = await usersResponse.json();
            if (allLogs) {
                allLogs.forEach(log => uniqueUsers.add(log.email));
            }
        }

        return {
            todayCount: todayCount,
            uniqueUsers: uniqueUsers.size
        };
    } catch (err) {
        console.error('[getLogStats] Error:', err);
        return { todayCount: 0, uniqueUsers: 0 };
    }
}

// Get unique actions for filter dropdown
async function getLogActions() {
    try {
        const response = await request('/rest/v1/logs?select=action&limit=1000', {
            method: 'GET',
            headers: buildHeaders({ auth: true })
        });

        if (!response.ok) return [];

        const logs = await response.json();
        if (!logs) return [];
        const actions = [...new Set(logs.map(l => l.action))];
        return actions.sort();
    } catch (err) {
        console.error('[getLogActions] Error:', err);
        return [];
    }
}

async function getStats() {
    const nowIso = new Date().toISOString();

    try {
        const [
            totalAnnouncements,
            totalAssignments,
            pendingAssignments,
            completedAssignments,
            upcomingDeadlines,
            totalQuizzes,
            upcomingQuizzes
        ] = await Promise.all([
            countRead('announcements'),
            countRead('assignments'),
            countRead('assignments', ['status=eq.pending']),
            countRead('assignments', ['status=eq.completed']),
            countRead('deadlines', [`date=gte.${encodeURIComponent(nowIso)}`]),
            countRead('quizzes'),
            countRead('quizzes', [`date=gte.${encodeURIComponent(nowIso)}`])
        ]);

        const result = {
            totalAnnouncements,
            totalAssignments,
            pendingAssignments,
            completedAssignments,
            upcomingDeadlines,
            totalQuizzes,
            upcomingQuizzes
        };

        // Cache to localStorage
        setLocalCache('stats', result);

        return result;
    } catch (err) {
        // If offline, try localStorage cache first
        if (!navigator.onLine) {
            const cached = getLocalCacheData('stats');
            if (cached) {
                console.warn('[getStats] Offline - using cached stats');
                return cached;
            }
            console.warn('[getStats] Offline - returning default stats');
            return {
                totalAnnouncements: 0,
                totalAssignments: 0,
                pendingAssignments: 0,
                completedAssignments: 0,
                upcomingDeadlines: 0,
                totalQuizzes: 0,
                upcomingQuizzes: 0
            };
        }
        throw err;
    }
}

async function exportData() {
    const [announcements, assignments, deadlines, quizzes, settings] = await Promise.all([
        getAnnouncements(),
        getAssignments(),
        getDeadlines(),
        getQuizzes(),
        getSettings()
    ]);

    DashboardUtils.downloadJSON({
        exportedAt: new Date().toISOString(),
        announcements,
        assignments,
        deadlines,
        quizzes,
        settings
    }, `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

async function clearAllContent() {
    const tables = ['announcements', 'assignments', 'deadlines', 'quizzes'];
    await Promise.all(tables.map(async (table) => {
        const response = await request(`/rest/v1/${table}?id=not.is.null`, {
            method: 'DELETE',
            headers: buildHeaders({ auth: true })
        });

        if (!response.ok) {
            throw new Error(`Could not clear ${table} (${response.status}).`);
        }
    }));
    await touchSettings();
}

async function importData(jsonString) {
    const parsed = JSON.parse(jsonString);
    const tables = ['announcements', 'assignments', 'deadlines', 'quizzes'];

    if (!tables.every((key) => Array.isArray(parsed[key]))) {
        throw new Error('Invalid backup format.');
    }

    await clearAllContent();

    if (parsed.announcements.length > 0) {
        await createRow('announcements', parsed.announcements.map((item) => ({
            title: item.title,
            content: item.content,
            priority: item.priority || 'normal',
            date: item.date || new Date().toISOString()
        })));
    }
    if (parsed.assignments.length > 0) {
        await createRow('assignments', parsed.assignments.map((item) => ({
            title: item.title,
            subject: item.subject || null,
            description: item.description,
            deadline: item.deadline,
            status: item.status || 'pending'
        })));
    }
    if (parsed.deadlines.length > 0) {
        await createRow('deadlines', parsed.deadlines.map((item) => ({
            title: item.title,
            category: item.category || null,
            date: item.date,
            priority: item.priority || 'medium'
        })));
    }
    if (parsed.quizzes.length > 0) {
        await createRow('quizzes', parsed.quizzes.map((item) => ({
            title: item.title,
            subject: item.subject || null,
            date: item.date,
            duration: Number(item.duration),
            total_marks: item.totalMarks ? Number(item.totalMarks) : null
        })));
    }

    await updateSettings({
        timeZone: parsed.settings?.timeZone || DEFAULT_TIME_ZONE
    });
}

window.DashboardData = {
    DEFAULT_PAGE_SIZE,
    USER_ROLES,
    isSupabaseConfigured,
    clearLocalCache,
    getSession,
    signInAdmin,
    signOutAdmin,
    getCurrentAdminUser,
    checkUserPermissions,
    checkActionPermission,
    clearActionCooldown,
    updatePassword,
    getSettings,
    updateSettings,
    getAnnouncements,
    getAnnouncementsPage,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAssignments,
    getAssignmentsPage,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getDeadlines,
    getDeadlinesPage,
    addDeadline,
    updateDeadline,
    deleteDeadline,
    getQuizzes,
    getQuizzesPage,
    addQuiz,
    updateQuiz,
    deleteQuiz,
    getStats,
    exportData,
    importData,
    clearAllContent,
    getFeedbackPage,
    addFeedback,
    deleteFeedback,
    getAdminUsers,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    logAction,
    getLogs,
    getLogStats,
    getLogActions
};

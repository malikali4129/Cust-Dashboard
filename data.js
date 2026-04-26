/**
 * University Dashboard - Supabase data and auth layer
 * Cloud-only mode with authenticated writes and public reads.
 */

const ADMIN_SESSION_KEY = 'dashboard_admin_session';
const DEFAULT_PAGE_SIZE = 8;
const DEFAULT_TIME_ZONE = 'Asia/Karachi';

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
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`[DashboardData] HTTP ${response.status} on ${path}:`, body.slice(0, 200));
    }
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
        return {
            items: items.map(normalize),
            total: parseCount(response),
            page,
            pageSize
        };
    } catch (err) {
        // If offline and no cache, return empty result instead of throwing
        if (!navigator.onLine) {
            console.warn(`[pagedRead] Offline - returning empty ${table}`);
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

    try {
        const response = await request(`/rest/v1/${table}?${query}`, {
            headers: buildHeaders()
        });

        if (!response.ok) {
            throw new Error(`Could not load ${table} (${response.status}).`);
        }

        const items = await response.json();
        return items.map(normalize);
    } catch (err) {
        // If offline and no cache, return empty array instead of throwing
        if (!navigator.onLine) {
            console.warn(`[listRead] Offline - returning empty ${table}`);
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

    if (!response.ok) {
        throw new Error(`Could not create ${table} (${response.status}).`);
    }

    return response.json();
}

async function updateRow(table, id, payload) {
    const response = await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: buildHeaders({
            auth: true,
            extra: { Prefer: 'return=representation' }
        }),
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Could not update ${table} (${response.status}).`);
    }

    return response.json();
}

async function deleteRow(table, id) {
    const response = await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildHeaders({ auth: true })
    });

    if (!response.ok) {
        throw new Error(`Could not delete ${table} (${response.status}).`);
    }
}

async function touchSettings(partial = {}) {
    await updateRow('settings', 1, {
        last_updated: new Date().toISOString(),
        ...partial
    });
}

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
        return {
            timeZone: DEFAULT_TIME_ZONE,
            lastUpdated: row.last_updated || null
        };
    } catch (err) {
        // If offline and no cache, return default settings instead of throwing
        if (!navigator.onLine) {
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

async function getStats() {
    const nowIso = new Date().toISOString();
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

    return {
        totalAnnouncements,
        totalAssignments,
        pendingAssignments,
        completedAssignments,
        upcomingDeadlines,
        totalQuizzes,
        upcomingQuizzes
    };
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
    isSupabaseConfigured,
    getSession,
    signInAdmin,
    signOutAdmin,
    getCurrentAdminUser,
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
    deleteFeedback
};

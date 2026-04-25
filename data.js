/**
 * University Dashboard - Cloud Data Management Layer
 * Uses Supabase REST API for permanent cloud storage
 * Falls back to localStorage when Supabase is not configured
 */

const DATA_KEY = 'universityDashboard_v1';
const USE_LOCAL_STORAGE = false; // Set to true to use localStorage instead of cloud

// Check if Supabase is configured
function isSupabaseConfigured() {
    return typeof SUPABASE_CONFIG !== 'undefined' && 
           SUPABASE_CONFIG.url && 
           SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' &&
           SUPABASE_CONFIG.anonKey && 
           SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
}

// Get headers for Supabase API
function getHeaders() {
    return {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

// ==================== API HELPERS ====================

async function apiGet(table, query = '') {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}${query ? '?' + query : ''}`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error(`GET ${table} failed: ${response.status}`);
    return response.json();
}

async function apiPost(table, data) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`POST ${table} failed: ${response.status}`);
    return response.json();
}

async function apiPatch(table, id, data) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`PATCH ${table} failed: ${response.status}`);
    return response.json();
}

async function apiDelete(table, id) {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`DELETE ${table} failed: ${response.status}`);
    return true;
}

// ==================== LOCAL STORAGE FALLBACK ====================

const defaultData = {
    announcements: [
        {
            id: 'ann_1',
            title: 'Welcome to the Dashboard',
            content: 'This is your central hub for all class updates. Stay tuned for announcements!',
            date: new Date().toISOString(),
            priority: 'normal'
        },
        {
            id: 'ann_2',
            title: 'Midterm Exam Schedule Released',
            content: 'Midterm exams will begin from next Monday. Check the deadlines section for details.',
            date: new Date(Date.now() - 86400000).toISOString(),
            priority: 'high'
        }
    ],
    assignments: [
        {
            id: 'asg_1',
            title: 'Assignment 1: Data Structures',
            description: 'Implement a binary search tree with insertion, deletion, and traversal operations.',
            deadline: new Date(Date.now() + 172800000).toISOString(),
            status: 'pending',
            subject: 'Computer Science'
        },
        {
            id: 'asg_2',
            title: 'Assignment 2: Database Design',
            description: 'Design an ER diagram for a university management system.',
            deadline: new Date(Date.now() + 345600000).toISOString(),
            status: 'pending',
            subject: 'Database Systems'
        }
    ],
    deadlines: [
        {
            id: 'dl_1',
            title: 'Project Submission - Web Development',
            date: new Date(Date.now() + 604800000).toISOString(),
            priority: 'high',
            category: 'Project'
        },
        {
            id: 'dl_2',
            title: 'Lab Report - Physics',
            date: new Date(Date.now() + 259200000).toISOString(),
            priority: 'medium',
            category: 'Lab'
        }
    ],
    quizzes: [
        {
            id: 'quiz_1',
            title: 'Quiz 3: Operating Systems',
            date: new Date(Date.now() + 432000000).toISOString(),
            duration: 45,
            subject: 'Operating Systems',
            totalMarks: 30
        },
        {
            id: 'quiz_2',
            title: 'Quiz 2: Linear Algebra',
            date: new Date(Date.now() + 864000000).toISOString(),
            duration: 30,
            subject: 'Mathematics',
            totalMarks: 20
        }
    ],
    settings: {
        adminPassword: 'cr2024',
        lastUpdated: new Date().toISOString()
    }
};

function initLocalData() {
    const stored = localStorage.getItem(DATA_KEY);
    if (!stored) {
        localStorage.setItem(DATA_KEY, JSON.stringify(defaultData));
        return { ...defaultData };
    }
    try {
        return JSON.parse(stored);
    } catch (e) {
        localStorage.setItem(DATA_KEY, JSON.stringify(defaultData));
        return { ...defaultData };
    }
}

function saveLocalData(data) {
    data.settings.lastUpdated = new Date().toISOString();
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return data;
}

function getLocalData() {
    return initLocalData();
}

// ==================== ANNOUNCEMENTS CRUD ====================

async function getAnnouncements() {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        return getLocalData().announcements.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    try {
        const data = await apiGet('announcements', 'select=*&order=date.desc');
        return data.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
            priority: item.priority,
            date: item.date
        }));
    } catch (e) {
        console.error('Error fetching announcements:', e);
        return getLocalData().announcements.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}

async function addAnnouncement(announcement) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const newAnnouncement = {
            id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...announcement,
            date: new Date().toISOString()
        };
        data.announcements.push(newAnnouncement);
        saveLocalData(data);
        return newAnnouncement;
    }
    try {
        const result = await apiPost('announcements', {
            title: announcement.title,
            content: announcement.content,
            priority: announcement.priority || 'normal'
        });
        return {
            id: result[0].id,
            title: result[0].title,
            content: result[0].content,
            priority: result[0].priority,
            date: result[0].date
        };
    } catch (e) {
        console.error('Error adding announcement:', e);
        throw e;
    }
}

async function updateAnnouncement(id, updates) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const index = data.announcements.findIndex(a => a.id === id);
        if (index === -1) return null;
        data.announcements[index] = { ...data.announcements[index], ...updates };
        saveLocalData(data);
        return data.announcements[index];
    }
    try {
        const result = await apiPatch('announcements', id, updates);
        return result[0];
    } catch (e) {
        console.error('Error updating announcement:', e);
        throw e;
    }
}

async function deleteAnnouncement(id) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        data.announcements = data.announcements.filter(a => a.id !== id);
        saveLocalData(data);
        return true;
    }
    try {
        return await apiDelete('announcements', id);
    } catch (e) {
        console.error('Error deleting announcement:', e);
        throw e;
    }
}

// ==================== ASSIGNMENTS CRUD ====================

async function getAssignments() {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        return getLocalData().assignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }
    try {
        const data = await apiGet('assignments', 'select=*&order=deadline.asc');
        return data.map(item => ({
            id: item.id,
            title: item.title,
            subject: item.subject,
            description: item.description,
            deadline: item.deadline,
            status: item.status
        }));
    } catch (e) {
        console.error('Error fetching assignments:', e);
        return getLocalData().assignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }
}

async function addAssignment(assignment) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const newAssignment = {
            id: `asg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...assignment,
            status: assignment.status || 'pending'
        };
        data.assignments.push(newAssignment);
        saveLocalData(data);
        return newAssignment;
    }
    try {
        const result = await apiPost('assignments', {
            title: assignment.title,
            subject: assignment.subject,
            description: assignment.description,
            deadline: assignment.deadline,
            status: assignment.status || 'pending'
        });
        return {
            id: result[0].id,
            title: result[0].title,
            subject: result[0].subject,
            description: result[0].description,
            deadline: result[0].deadline,
            status: result[0].status
        };
    } catch (e) {
        console.error('Error adding assignment:', e);
        throw e;
    }
}

async function updateAssignment(id, updates) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const index = data.assignments.findIndex(a => a.id === id);
        if (index === -1) return null;
        data.assignments[index] = { ...data.assignments[index], ...updates };
        saveLocalData(data);
        return data.assignments[index];
    }
    try {
        const result = await apiPatch('assignments', id, updates);
        return result[0];
    } catch (e) {
        console.error('Error updating assignment:', e);
        throw e;
    }
}

async function deleteAssignment(id) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        data.assignments = data.assignments.filter(a => a.id !== id);
        saveLocalData(data);
        return true;
    }
    try {
        return await apiDelete('assignments', id);
    } catch (e) {
        console.error('Error deleting assignment:', e);
        throw e;
    }
}

// ==================== DEADLINES CRUD ====================

async function getDeadlines() {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        return getLocalData().deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    try {
        const data = await apiGet('deadlines', 'select=*&order=date.asc');
        return data.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            date: item.date,
            priority: item.priority
        }));
    } catch (e) {
        console.error('Error fetching deadlines:', e);
        return getLocalData().deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
}

async function addDeadline(deadline) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const newDeadline = {
            id: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...deadline
        };
        data.deadlines.push(newDeadline);
        saveLocalData(data);
        return newDeadline;
    }
    try {
        const result = await apiPost('deadlines', {
            title: deadline.title,
            category: deadline.category,
            date: deadline.date,
            priority: deadline.priority || 'medium'
        });
        return {
            id: result[0].id,
            title: result[0].title,
            category: result[0].category,
            date: result[0].date,
            priority: result[0].priority
        };
    } catch (e) {
        console.error('Error adding deadline:', e);
        throw e;
    }
}

async function updateDeadline(id, updates) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const index = data.deadlines.findIndex(d => d.id === id);
        if (index === -1) return null;
        data.deadlines[index] = { ...data.deadlines[index], ...updates };
        saveLocalData(data);
        return data.deadlines[index];
    }
    try {
        const result = await apiPatch('deadlines', id, updates);
        return result[0];
    } catch (e) {
        console.error('Error updating deadline:', e);
        throw e;
    }
}

async function deleteDeadline(id) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        data.deadlines = data.deadlines.filter(d => d.id !== id);
        saveLocalData(data);
        return true;
    }
    try {
        return await apiDelete('deadlines', id);
    } catch (e) {
        console.error('Error deleting deadline:', e);
        throw e;
    }
}

// ==================== QUIZZES CRUD ====================

async function getQuizzes() {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        return getLocalData().quizzes.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    try {
        const data = await apiGet('quizzes', 'select=*&order=date.asc');
        return data.map(item => ({
            id: item.id,
            title: item.title,
            subject: item.subject,
            date: item.date,
            duration: item.duration,
            totalMarks: item.total_marks
        }));
    } catch (e) {
        console.error('Error fetching quizzes:', e);
        return getLocalData().quizzes.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
}

async function addQuiz(quiz) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const newQuiz = {
            id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...quiz
        };
        data.quizzes.push(newQuiz);
        saveLocalData(data);
        return newQuiz;
    }
    try {
        const result = await apiPost('quizzes', {
            title: quiz.title,
            subject: quiz.subject,
            date: quiz.date,
            duration: parseInt(quiz.duration),
            total_marks: quiz.totalMarks ? parseInt(quiz.totalMarks) : null
        });
        return {
            id: result[0].id,
            title: result[0].title,
            subject: result[0].subject,
            date: result[0].date,
            duration: result[0].duration,
            totalMarks: result[0].total_marks
        };
    } catch (e) {
        console.error('Error adding quiz:', e);
        throw e;
    }
}

async function updateQuiz(id, updates) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        const index = data.quizzes.findIndex(q => q.id === id);
        if (index === -1) return null;
        data.quizzes[index] = { ...data.quizzes[index], ...updates };
        saveLocalData(data);
        return data.quizzes[index];
    }
    try {
        const apiUpdates = { ...updates };
        if (updates.duration) apiUpdates.duration = parseInt(updates.duration);
        if (updates.totalMarks) apiUpdates.total_marks = parseInt(updates.totalMarks);
        delete apiUpdates.totalMarks;
        const result = await apiPatch('quizzes', id, apiUpdates);
        return {
            ...result[0],
            totalMarks: result[0].total_marks
        };
    } catch (e) {
        console.error('Error updating quiz:', e);
        throw e;
    }
}

async function deleteQuiz(id) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        data.quizzes = data.quizzes.filter(q => q.id !== id);
        saveLocalData(data);
        return true;
    }
    try {
        return await apiDelete('quizzes', id);
    } catch (e) {
        console.error('Error deleting quiz:', e);
        throw e;
    }
}

// ==================== SETTINGS ====================

async function getSettings() {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        return getLocalData().settings;
    }
    try {
        const data = await apiGet('settings', 'select=*&limit=1');
        if (data.length === 0) {
            return { adminPassword: 'cr2024', lastUpdated: new Date().toISOString() };
        }
        return {
            adminPassword: data[0].admin_password,
            lastUpdated: data[0].last_updated
        };
    } catch (e) {
        console.error('Error fetching settings:', e);
        return getLocalData().settings;
    }
}

async function updatePassword(newPassword) {
    if (!isSupabaseConfigured() || USE_LOCAL_STORAGE) {
        const data = getLocalData();
        data.settings.adminPassword = newPassword;
        saveLocalData(data);
        return true;
    }
    try {
        await apiPatch('settings', 1, { admin_password: newPassword });
        return true;
    } catch (e) {
        console.error('Error updating password:', e);
        throw e;
    }
}

async function verifyPassword(password) {
    const settings = await getSettings();
    return settings.adminPassword === password;
}

// ==================== STATS ====================

async function getStats() {
    const [announcements, assignments, deadlines, quizzes] = await Promise.all([
        getAnnouncements(),
        getAssignments(),
        getDeadlines(),
        getQuizzes()
    ]);
    const now = new Date();
    return {
        totalAnnouncements: announcements.length,
        totalAssignments: assignments.length,
        pendingAssignments: assignments.filter(a => a.status === 'pending').length,
        completedAssignments: assignments.filter(a => a.status === 'completed').length,
        upcomingDeadlines: deadlines.filter(d => new Date(d.date) > now).length,
        totalQuizzes: quizzes.length,
        upcomingQuizzes: quizzes.filter(q => new Date(q.date) > now).length
    };
}

// ==================== EXPORT/IMPORT ====================

function exportData() {
    const data = getLocalData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `university-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.announcements && data.assignments && data.deadlines && data.quizzes) {
            localStorage.setItem(DATA_KEY, JSON.stringify(data));
            return true;
        }
        return false;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
}

function resetData() {
    if (confirm('Are you sure? This will delete ALL data and reset to defaults!')) {
        localStorage.setItem(DATA_KEY, JSON.stringify(defaultData));
        return true;
    }
    return false;
}

function getData() {
    return getLocalData();
}

// Make functions available globally
window.DashboardData = {
    getAnnouncements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAssignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getDeadlines,
    addDeadline,
    updateDeadline,
    deleteDeadline,
    getQuizzes,
    addQuiz,
    updateQuiz,
    deleteQuiz,
    getSettings,
    updatePassword,
    verifyPassword,
    exportData,
    importData,
    resetData,
    getStats,
    getData,
    isSupabaseConfigured
};

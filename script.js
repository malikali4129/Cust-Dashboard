/**
 * University Dashboard - Shared UI utilities
 */

const TIME_ZONE_LABEL = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let activeTimeZone = TIME_ZONE_LABEL;

function setActiveTimeZone(timeZone) {
    activeTimeZone = timeZone || TIME_ZONE_LABEL;
    document.querySelectorAll('[data-timezone-label]').forEach((element) => {
        element.textContent = activeTimeZone;
    });
}

function toggleTheme() {
    document.documentElement.toggleAttribute('data-theme');
    updateThemeButton();
}

function updateThemeButton() {
    const isDark = document.documentElement.hasAttribute('data-theme');
    document.querySelectorAll('[data-theme-toggle-label]').forEach((element) => {
        element.textContent = isDark ? 'Light' : 'Dark';
    });
}

function ensureToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'info', duration = 3200) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-dot"></span>
        <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add('toast-exit');
        window.setTimeout(() => toast.remove(), 220);
    }, duration);
}

function initMobileMenu() {
    const toggle = document.querySelector('.mobile-toggle');
    const shell = document.querySelector('.app-shell');
    if (!toggle || !shell) {
        return;
    }

    toggle.addEventListener('click', () => {
        shell.classList.toggle('nav-open');
    });

    document.addEventListener('click', (event) => {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            return;
        }
        if (window.innerWidth < 980 && shell.classList.contains('nav-open') &&
            !sidebar.contains(event.target) && !toggle.contains(event.target)) {
            shell.classList.remove('nav-open');
        }
    });
}

function initModals() {
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach((overlay) => {
                overlay.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function formatInTimeZone(dateString, options = {}, timeZone = activeTimeZone) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        ...options
    }).format(new Date(dateString));
}

function formatDate(dateString, timeZone = activeTimeZone) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0 && Math.abs(diffHours) < 2) {
        return 'Recently due';
    }
    if (diffDays < 0) {
        return 'Overdue';
    }
    if (diffHours <= 0) {
        return 'Today';
    }
    if (diffDays === 0) {
        return `In ${diffHours}h`;
    }
    if (diffDays === 1) {
        return 'Tomorrow';
    }
    if (diffDays < 7) {
        return `In ${diffDays} days`;
    }

    return formatInTimeZone(dateString, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }, timeZone);
}

function formatDateTime(dateString, timeZone = activeTimeZone) {
    return formatInTimeZone(dateString, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }, timeZone);
}

function formatDateShort(dateString, timeZone = activeTimeZone) {
    return {
        day: formatInTimeZone(dateString, { day: '2-digit' }, timeZone),
        month: formatInTimeZone(dateString, { month: 'short' }, timeZone),
        full: formatInTimeZone(dateString, { month: 'short', day: 'numeric' }, timeZone)
    };
}

function formatLongDate(dateString, timeZone = activeTimeZone) {
    return formatInTimeZone(dateString, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }, timeZone);
}

function getRelativeTime(dateString) {
    const diff = Date.now() - new Date(dateString).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return 'Just now';
    }
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    if (hours < 24) {
        return `${hours}h ago`;
    }
    if (days < 7) {
        return `${days}d ago`;
    }
    return formatDate(dateString);
}

function toIsoFromLocalInput(value) {
    if (!value) {
        return '';
    }

    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

function toLocalInputValue(dateString) {
    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function confirmAction(message) {
    return Promise.resolve(window.confirm(message));
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function updateConnectivityUI() {
    const online = navigator.onLine;
    document.body.classList.toggle('is-offline', !online);
    document.querySelectorAll('[data-connection-state]').forEach((element) => {
        element.textContent = online ? 'Online' : 'Offline';
    });
    document.querySelectorAll('[data-connection-hint]').forEach((element) => {
        element.textContent = online ? 'Connected to Supabase' : 'Viewing cached shell only';
    });
}

function initConnectivity() {
    updateConnectivityUI();
    window.addEventListener('online', () => {
        updateConnectivityUI();
        showToast('Connection restored.', 'success');
    });
    window.addEventListener('offline', () => {
        updateConnectivityUI();
        showToast('You are offline. Cloud writes are paused.', 'warning');
    });
}

async function registerServiceWorker() {
    const isSupported = 'serviceWorker' in navigator;
    const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    if (!isSupported || !isSecureContext) {
        return;
    }

    try {
        await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
        console.warn('Service worker registration failed:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateThemeButton();
    initMobileMenu();
    initModals();
    initConnectivity();
    registerServiceWorker();
});

window.DashboardUtils = {
    TIME_ZONE_LABEL,
    setActiveTimeZone,
    toggleTheme,
    updateThemeButton,
    showToast,
    openModal,
    closeModal,
    escapeHtml,
    formatDate,
    formatDateTime,
    formatDateShort,
    formatLongDate,
    getRelativeTime,
    toIsoFromLocalInput,
    toLocalInputValue,
    confirmAction,
    downloadJSON,
    readFile
};

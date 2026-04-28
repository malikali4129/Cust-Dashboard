/**
 * University Dashboard - Shared UI utilities
 */

const TIME_ZONE_LABEL = 'Asia/Karachi';
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

function toggleSettingsPopup() {
    const popup = document.getElementById('settings-popup');
    if (popup) popup.classList.toggle('active');
}

// Close popup when clicking outside
document.addEventListener('click', function(e) {
    const popup = document.getElementById('settings-popup');
    const btn = document.querySelector('.settings-btn');
    if (popup && popup.classList.contains('active')) {
        if (!popup.contains(e.target) && (!btn || !btn.contains(e.target))) {
            popup.classList.remove('active');
        }
    }
});

function updateThemeButton() {
    const isLight = document.documentElement.hasAttribute('data-theme');
    document.querySelectorAll('[data-theme-toggle-label]').forEach((element) => {
        element.textContent = isLight ? 'Dark' : 'Light';
    });
    document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
        btn.classList.toggle('is-light', isLight);
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

const ICONS = {
    success: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8.5"/><polyline points="6.5 10 9 12.5 13.5 7.5"/></svg>`,
    error:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8.5"/><line x1="7" y1="7" x2="13" y2="13"/><line x1="13" y1="7" x2="7" y2="13"/></svg>`,
    warning: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5L18 17.5H2L10 2.5z"/><line x1="10" y1="8.5" x2="10" y2="12"/><circle cx="10" cy="14.5" r="0.75" fill="currentColor"/></svg>`,
    info:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8.5"/><line x1="10" y1="9" x2="10" y2="14"/><circle cx="10" cy="6.5" r="0.75" fill="currentColor"/></svg>`
};

function showToast(message, type = 'info', duration = 3500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');

    const icon = ICONS[type] || ICONS.info;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-msg">${escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Dismiss" onclick="this.closest('.toast').remove()">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="4" y1="4" x2="12" y2="12"></line>
                <line x1="12" y1="4" x2="4" y2="12"></line>
            </svg>
        </button>
    `;
    container.appendChild(toast);

    // Auto-dismiss
    window.setTimeout(() => {
        toast.classList.add('toast-exit');
        window.setTimeout(() => toast.remove(), 250);
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
        // Default to current date with year 2026
        const now = new Date();
        now.setFullYear(2026);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        // Default to 2026
        const now = new Date();
        now.setFullYear(2026);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // If date is in the past, default to 2026
    const now = new Date();
    if (date < now) {
        date.setFullYear(2026);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Generate date dropdown selects (compact single row with time and AM/PM)
function createDateSelects(name, dateString = null, defaultYear = 2026) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    // Parse date if provided
    let year = defaultYear;
    let month = currentMonth;
    let day = currentDay;
    let hour = 12;
    let minute = 0;
    let ampm = 'PM';

    if (dateString) {
        const d = new Date(dateString);
        if (!isNaN(d.getTime())) {
            year = d.getFullYear();
            month = d.getMonth() + 1;
            day = d.getDate();
            hour = d.getHours();
            minute = d.getMinutes();
            ampm = hour >= 12 ? 'PM' : 'AM';
        }
    }

    // If date is in past, use default year
    if (year < currentYear) {
        year = defaultYear;
    }

    // Calculate days in month based on month/year
    const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();
    const maxDays = getDaysInMonth(month, year);
    const days = Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, '0'));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [...new Set([defaultYear, currentYear, currentYear + 1])].sort((a, b) => a - b).slice(0, 4);

    // Hours 1-12 for 12-hour format
    const hour12 = hour % 12 || 12;
    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    // Build select options - no placeholders
    const dayOptions = days.map(d => `<option value="${d}" ${d === String(day).padStart(2, '0') ? 'selected' : ''}>${d}</option>`).join('');
    const monthOptions = months.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}" ${i + 1 === month ? 'selected' : ''}>${m}</option>`).join('');
    const yearOptions = years.map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('');
    const hourOptions = hours.map(h => `<option value="${h}" ${h === String(hour12) ? 'selected' : ''}>${h}</option>`).join('');
    const minuteOptions = minutes.map(m => `<option value="${m}" ${m === String(Math.floor(minute / 15) * 15).padStart(2, '0') ? 'selected' : ''}>${m}</option>`).join('');
    const ampmOptions = `<option value="AM" ${ampm === 'AM' ? 'selected' : ''}>AM</option><option value="PM" ${ampm === 'PM' ? 'selected' : ''}>PM</option>`;

    return `
        <div class="date-selects-compact">
            <select class="form-input" name="${name}_day">${dayOptions}</select>
            <select class="form-input" name="${name}_month">${monthOptions}</select>
            <select class="form-input" name="${name}_year">${yearOptions}</select>
            <span class="date-sep">@</span>
            <select class="form-input" name="${name}_hour">${hourOptions}</select>
            <span class="date-colon">:</span>
            <select class="form-input" name="${name}_minute">${minuteOptions}</select>
            <select class="form-input" name="${name}_ampm">${ampmOptions}</select>
        </div>
    `;
}

// Helper to combine date select values to ISO string
// Accepts either a form element or a plain object with field values
function combineDateSelects(formOrData, name) {
    // Get values - handle both form element and plain object
    let day, month, year, hour, minute, ampm;

    if (typeof formOrData.querySelector === 'function') {
        // It's a DOM form element
        const dayEl = formOrData.querySelector(`[name="${name}_day"]`);
        const monthEl = formOrData.querySelector(`[name="${name}_month"]`);
        const yearEl = formOrData.querySelector(`[name="${name}_year"]`);
        const hourEl = formOrData.querySelector(`[name="${name}_hour"]`);
        const minuteEl = formOrData.querySelector(`[name="${name}_minute"]`);
        const ampmEl = formOrData.querySelector(`[name="${name}_ampm"]`);

        day = dayEl?.value;
        month = monthEl?.value;
        year = yearEl?.value;
        hour = hourEl?.value ? parseInt(hourEl.value) : 12;
        minute = minuteEl?.value ? parseInt(minuteEl.value) : 0;
        ampm = ampmEl?.value || 'PM';
    } else {
        // It's a plain object - get dropdown values
        day = formOrData[`${name}_day`];
        month = formOrData[`${name}_month`];
        year = formOrData[`${name}_year`];
        hour = formOrData[`${name}_hour`] ? parseInt(formOrData[`${name}_hour`]) : 12;
        minute = formOrData[`${name}_minute`] ? parseInt(formOrData[`${name}_minute`]) : 0;
        ampm = formOrData[`${name}_ampm`] || 'PM';

        // If no dropdown values, check for existing date field
        if (!day && formOrData[name]) {
            const existingDate = new Date(formOrData[name]);
            if (!isNaN(existingDate.getTime())) {
                year = existingDate.getFullYear();
                month = existingDate.getMonth() + 1;
                day = existingDate.getDate();
                hour = existingDate.getHours();
                minute = existingDate.getMinutes();
                ampm = hour >= 12 ? 'PM' : 'AM';
            }
        }
    }

    // Validate - all required
    if (!day || !month || !year || !hour) {
        // Return default if missing
        const d = new Date();
        d.setFullYear(2026);
        d.setMonth(0);
        d.setDate(1);
        d.setHours(12, 0, 0, 0);
        return d.toISOString();
    }

    // Convert to 24-hour format
    let hour24 = hour;
    if (ampm === 'PM' && hour < 12) hour24 = hour + 12;
    if (ampm === 'AM' && hour === 12) hour24 = 0;

    // Create date using local time (no timezone)
    const date = new Date(year, month - 1, day, hour24, minute, 0, 0);

    // Check if date is in the past (return error object if so)
    const now = new Date();
    if (date < now) {
        return { error: 'past', date: date.toISOString() };
    }

    return date.toISOString();
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

/* ---------- Validation Utilities ---------- */

function debounce(fn, delay = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

function validateLength(value, min, max) {
    const str = String(value || '').trim();
    if (min !== undefined && str.length < min) {
        return `Must be at least ${min} characters.`;
    }
    if (max !== undefined && str.length > max) {
        return `Must be at most ${max} characters.`;
    }
    return null;
}

function validateYear(dateString) {
    if (!dateString) {
        return 'Date is required.';
    }
    const year = new Date(dateString).getFullYear();
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || String(year).length !== 4) {
        return 'Year must be exactly 4 digits.';
    }
    if (year < currentYear) {
        return `Year must be ${currentYear} or later.`;
    }
    return null;
}

function validateNumber(value, min, max) {
    const num = Number(value);
    if (isNaN(num)) {
        return 'Must be a valid number.';
    }
    if (min !== undefined && num < min) {
        return `Must be at least ${min}.`;
    }
    if (max !== undefined && num > max) {
        return `Must be at most ${max}.`;
    }
    return null;
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
    const adminDot = document.getElementById('admin-connection-dot');
    if (adminDot) {
        adminDot.classList.toggle('is-online', online);
        adminDot.classList.toggle('is-offline', !online);
    }
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
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('[SW] Registered:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
            console.log('[SW] Update found');
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    console.log('[SW] Worker state:', newWorker.state);
                    // When new worker is installed, activate and reload
                    if (newWorker.state === 'installed' || newWorker.state === 'activated') {
                        console.log('[SW] Reloading for update...');
                        // Show toast that update is ready
                        if (typeof DashboardUtils?.showToast === 'function') {
                            DashboardUtils.showToast('Update available. Refreshing...', 'info');
                        }
                        // Reload to get new version
                        setTimeout(() => window.location.reload(), 1500);
                    }
                });

                // Tell the new worker to skip waiting immediately
                newWorker.postMessage({ type: 'skipWaiting' });
            }
        });

        // Check if there's already a waiting worker (update available from previous session)
        if (registration.waiting) {
            console.log('[SW] Waiting worker found, triggering update...');
            registration.waiting.postMessage({ type: 'skipWaiting' });
            setTimeout(() => window.location.reload(), 1500);
        }
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
    initPwaInstall();
    // For the client-facing dashboard (index.html) remove the persistent sidebar
    // Admin panel (`admin.html`) keeps the sidebar.
    const isAdmin = window.location.pathname && window.location.pathname.endsWith('admin.html');
    if (!isAdmin) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.remove();
        const toggle = document.querySelector('.mobile-toggle');
        if (toggle) toggle.remove();
        document.body.classList.add('client-dashboard');
    }
});

// ---------- PWA Install Banner ----------
let PWA_DEFERRED_PROMPT = null;

async function initPwaInstall() {
    // Already installed — don't show banner
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        return;
    }

    // Listen for the install prompt event (Chrome/Android)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        PWA_DEFERRED_PROMPT = e;
        showPwaBanner();
    });

    // Show banner immediately for all browsers
    // iOS users will see instructions when they tap "Install"
    showPwaBanner();

    // When app is installed, hide the banner permanently
    window.addEventListener('appinstalled', () => {
        PWA_DEFERRED_PROMPT = null;
        hidePwaBanner();
    });
}

function showPwaBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.add('is-visible');
    }
}

function hidePwaBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.remove('is-visible');
    }
}

async function installPwa() {
    if (!PWA_DEFERRED_PROMPT) {
        // Fallback for browsers without beforeinstallprompt
        if (window.matchMedia('(display-mode: standalone)').matches) {
            DashboardUtils.showToast('App is already installed.', 'info');
            return;
        }
        // Try opening the install prompt manually (works on some browsers)
        const installURL = window.location.href;
        DashboardUtils.showToast('To install: tap Share then "Add to Home Screen".', 'info');
    } else {
        PWA_DEFERRED_PROMPT.prompt();
        const { outcome } = await PWA_DEFERRED_PROMPT.userChoice;

        if (outcome === 'accepted') {
            DashboardUtils.showToast('App installed!', 'success');
        }
        PWA_DEFERRED_PROMPT = null;
    }
    hidePwaBanner();
}

function dismissPwaBanner() {
    // Just hide for this session — banner will reappear on next visit
    hidePwaBanner();
}

function closePwaBanner() {
    hidePwaBanner();
}

// Expose PWA functions globally
window.installPwa = installPwa;
window.dismissPwaBanner = dismissPwaBanner;
window.closePwaBanner = closePwaBanner;

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
    createDateSelects,
    combineDateSelects,
    confirmAction,
    downloadJSON,
    readFile,
    debounce,
    validateLength,
    validateYear,
    validateNumber
};

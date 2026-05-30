/**
 * toast.js — Windows 11 toast notification component.
 */
import { icons } from '../icons.js';

const ICON_MAP = {
    success: icons.checkCircle,
    error:   icons.alertCircle,
    info:    icons.infoCircle,
};

/**
 * Show a toast notification.
 * @param {{ type: 'success'|'error'|'info', title: string, message?: string, duration?: number }} opts
 */
export function showToast({ type = 'info', title, message = '', duration = 4000 }) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
        <span class="toast-icon">${ICON_MAP[type] || ICON_MAP.info}</span>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close">${icons.x}</button>
    `;

    // Close button
    el.querySelector('.toast-close').addEventListener('click', () => dismiss(el));

    container.appendChild(el);

    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => dismiss(el), duration);
    }
}

function dismiss(el) {
    if (!el.parentNode) return;
    el.classList.add('dismissing');
    el.addEventListener('animationend', () => el.remove());
}

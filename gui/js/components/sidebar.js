/**
 * sidebar.js — Windows 11 NavigationView sidebar component
 */
import { icons } from '../icons.js';

const navItems = [
    { id: 'organize', label: 'Organize', icon: icons.folder },
    { id: 'history', label: 'History', icon: icons.clock },
    { id: 'settings', label: 'Settings', icon: icons.settings },
];

export function renderSidebar(root, activePage, onNavigate) {
    const nav = navItems.map(item => {
        const active = item.id === activePage ? 'active' : '';
        return `<a href="#" class="nav-item ${active}" data-page="${item.id}">
                    ${item.icon}
                    <span>${item.label}</span>
                </a>`;
    }).join('');

    root.innerHTML = `
        <aside class="sidebar">
            <nav class="sidebar-nav">
                ${nav}
            </nav>
            <div class="sidebar-footer">
                <span class="sidebar-footer-label">ArchiveMaster v1.0</span>
            </div>
        </aside>
    `;

    // Bind click events
    root.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const page = el.dataset.page;
            if (onNavigate) onNavigate(page);
        });
    });
}

/**
 * app.js — Main entry point.
 * Waits for pywebviewready, then initializes components and handles routing.
 */
import * as bridge from './bridge.js';
import { renderTitlebar } from './components/titlebar.js';
import { renderSidebar } from './components/sidebar.js';
import { renderOrganizer } from './components/organizer.js';
import { renderHistoryPage } from './components/history-page.js';
import { renderSettingsPage } from './components/settings-page.js';

let currentPage = 'organize';
let pagesMounted = false;

async function init() {
    // Wait for pywebview to be ready
    await bridge.isReady();

    const titlebarRoot = document.getElementById('titlebar-root');
    const sidebarRoot = document.getElementById('sidebar-root');

    renderTitlebar(titlebarRoot);
    renderSidebar(sidebarRoot, currentPage, navigateTo);

    // Mount all pages once
    renderOrganizer(document.getElementById('page-organize'));
    renderHistoryPage(document.getElementById('page-history'));
    renderSettingsPage(document.getElementById('page-settings'));
    pagesMounted = true;

    showPage(currentPage);
}

function navigateTo(page) {
    currentPage = page;
    const sidebarRoot = document.getElementById('sidebar-root');
    renderSidebar(sidebarRoot, currentPage, navigateTo);
    showPage(currentPage);
}

function showPage(page) {
    document.getElementById('page-organize').classList.toggle('hidden', page !== 'organize');
    document.getElementById('page-history').classList.toggle('hidden', page !== 'history');
    document.getElementById('page-settings').classList.toggle('hidden', page !== 'settings');

    if (page === 'history') {
        // Soft refresh history when switching to the tab
        renderHistoryPage(document.getElementById('page-history'));
    }
}

// Boot
document.addEventListener('DOMContentLoaded', init);

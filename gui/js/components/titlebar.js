/**
 * titlebar.js — Windows 11 title bar component
 */
import { icons } from '../icons.js';

export function renderTitlebar(root) {
    root.innerHTML = `
        <div class="titlebar">
            <div class="titlebar-left">
                <span class="titlebar-app-icon">${icons.grid}</span>
                <span class="titlebar-label">ArchiveMaster</span>
            </div>
        </div>
    `;
}

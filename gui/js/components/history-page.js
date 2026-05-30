/**
 * history-page.js — History page component.
 * Shows past organization sessions loaded from Python.
 */
import { icons } from '../icons.js';
import * as bridge from '../bridge.js';
import { showToast } from './toast.js';
import { showConfirm } from './dialog.js';

window._openHistoryFolder = (path) => {
    bridge.openFolder(path);
};

export async function renderHistoryPage(root) {
    root.innerHTML = `
        <div class="page-header">
            <h1>History</h1>
            <p class="page-subtitle">View past organization sessions.</p>
        </div>
        <div class="winui-card">
            <div class="winui-card-body" id="history-body">
                <div style="text-align:center; padding:24px; color:var(--text-tertiary)">Loading…</div>
            </div>
        </div>
    `;

    try {
        const history = await bridge.getHistory();
        renderHistoryList(history);
    } catch (e) {
        document.getElementById('history-body').innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">${icons.clock}</div>
                <p>Could not load history.</p>
            </div>
        `;
    }
}

function renderHistoryList(history) {
    const body = document.getElementById('history-body');

    if (!history || history.length === 0) {
        body.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">${icons.clock}</div>
                <p>No history yet. Run your first organization to see results here.</p>
            </div>
        `;
        return;
    }

    body.innerHTML = `<div class="history-list"></div><div class="history-actions"><button class="winui-btn winui-btn-danger" id="clear-history-btn">${icons.trash} Clear all history</button></div>`;
    const list = body.querySelector('.history-list');

    list.innerHTML = history.map(item => {
        const date = new Date(item.timestamp).toLocaleString();
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <div class="history-item-title">
                        <h3>Session ${date}</h3>
                    </div>
                    <div class="history-actions" style="display:flex; gap:8px;">
                        ${item.config.dest ? `<button type="button" class="winui-btn winui-btn-secondary btn-sm" onclick="window._openHistoryFolder('${item.config.dest.replace(/\\/g, '\\\\')}')" title="Open Destination">${icons.external}</button>` : ''}
                        <button type="button" class="winui-btn winui-btn-secondary btn-sm history-delete-btn" data-ts="${item.timestamp}" title="Delete session">
                            ${icons.trash}
                        </button>
                    </div>
                </div>
                
                <div class="history-item-paths">
                    <div class="path-row">
                        <span class="path-label">Source</span>
                        <span class="path-value" title="${item.config.source}">${item.config.source}</span>
                    </div>
                    <div class="path-row">
                        <span class="path-label">Dest</span>
                        <span class="path-value" title="${item.config.dest}">${item.config.dest}</span>
                    </div>
                </div>

                <div class="history-stats-grid">
                    <div class="stat-box">
                        <div class="stat-icon">${icons.search}</div>
                        <div class="stat-info">
                            <div class="stat-value">${item.results.scanned}</div>
                            <div class="stat-label">Scanned</div>
                        </div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-icon">${icons.check}</div>
                        <div class="stat-info">
                            <div class="stat-value">${item.results.copied}</div>
                            <div class="stat-label">Processed</div>
                        </div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-icon">${icons.clipboard}</div>
                        <div class="stat-info">
                            <div class="stat-value">${item.results.duplicates}</div>
                            <div class="stat-label">Duplicates</div>
                        </div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-icon">${icons.skipForward}</div>
                        <div class="stat-info">
                            <div class="stat-value">${item.results.skipped}</div>
                            <div class="stat-label">Skipped</div>
                        </div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-icon">${icons.memory}</div>
                        <div class="stat-info">
                            <div class="stat-value">${item.results.size_mb !== undefined ? item.results.size_mb + ' MB' : '--'}</div>
                            <div class="stat-label">Data</div>
                        </div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-icon">${icons.clock}</div>
                        <div class="stat-info">
                            <div class="stat-value">${item.duration_sec}s</div>
                            <div class="stat-label">Time</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Bind delete buttons
    list.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const confirmed = await showConfirm(
                "Delete Session", 
                "Are you sure you want to delete this session from your history? The moved files will remain untouched.", 
                "Delete", "Cancel", true
            );
            if (!confirmed) return;
            
            await bridge.deleteHistoryItem(btn.dataset.ts);
            const h = await bridge.getHistory();
            renderHistoryList(h);
        });
    });

    document.getElementById('clear-history-btn').addEventListener('click', async () => {
        const confirmed = await showConfirm(
            "Clear All History", 
            "Are you sure you want to permanently clear ALL history? This cannot be undone.", 
            "Clear History", "Cancel", true
        );
        if (!confirmed) return;
        
        await bridge.clearHistory();
        renderHistoryList([]);
        showToast({ type: 'info', title: 'History cleared' });
    });
}

function formatDuration(sec) {
    if (sec < 1) return '<1s';
    if (sec < 60) return `${Math.round(sec)}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

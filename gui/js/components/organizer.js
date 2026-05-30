/**
 * organizer.js — The main "Organize" page component.
 * Config form, folder pickers, progress panel with cancel/pause,
 * speed/ETA, memory usage, and disk space warnings.
 */
import { icons } from '../icons.js';
import * as bridge from '../bridge.js';
import { showToast } from './toast.js';

let els = {};
let memoryInterval = null;
let isPaused = false;

export function renderOrganizer(root) {
    cleanup();

    root.innerHTML = `
        <div class="page-header">
            <h1>Organize</h1>
            <p class="page-subtitle">Scan, deduplicate, and sort your photos &amp; videos by date.</p>
        </div>

        <div id="disk-warning" class="info-banner warning hidden">
            <span>${icons.alertCircle}</span>
            <span id="disk-warning-text">Low disk space on destination drive.</span>
        </div>

        <div class="winui-card">
            <div class="winui-card-header"><h2>Configuration</h2></div>
            <div class="winui-card-body">
                <form id="organizer-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="field-label" for="source">Source folder</label>
                            <div class="input-group">
                                <input class="winui-input" type="text" id="source" placeholder="Select source folder…">
                                <button type="button" class="winui-btn winui-btn-secondary" id="browse-source">
                                    ${icons.folderOpen} Browse
                                </button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="field-label" for="dest">Destination folder</label>
                            <div class="input-group">
                                <input class="winui-input" type="text" id="dest" placeholder="Select destination folder…">
                                <button type="button" class="winui-btn winui-btn-secondary" id="browse-dest">
                                    ${icons.folderOpen} Browse
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="field-label" for="operation">Operation</label>
                            <select class="winui-select" id="operation">
                                <option value="copy">Copy files</option>
                                <option value="move">Move files</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="field-label" for="date-scheme">Folder structure</label>
                            <select class="winui-select" id="date-scheme">
                                <option value="year-month">Year / Month</option>
                                <option value="year-month-day">Year / Month-Day</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="field-label" for="duplicates-folder">Duplicates folder name</label>
                            <input class="winui-input" type="text" id="duplicates-folder" value="duplicates">
                        </div>
                    </div>

                    <label class="field-label" style="margin-top: 16px;">Options &amp; Filters</label>
                    <div class="toggle-row">
                        <label class="winui-toggle">
                            <input type="checkbox" id="include-photos" checked>
                            <span class="winui-toggle-track"></span>
                            <span class="winui-toggle-label">Photos</span>
                        </label>
                        <label class="winui-toggle">
                            <input type="checkbox" id="include-videos" checked>
                            <span class="winui-toggle-track"></span>
                            <span class="winui-toggle-label">Videos</span>
                        </label>
                        <label class="winui-toggle">
                            <input type="checkbox" id="include-others">
                            <span class="winui-toggle-track"></span>
                            <span class="winui-toggle-label">Others</span>
                        </label>
                        <label class="winui-toggle">
                            <input type="checkbox" id="dry-run">
                            <span class="winui-toggle-track"></span>
                            <span class="winui-toggle-label">Dry run</span>
                        </label>
                    </div>

                    <div class="form-actions">
                        <button type="submit" id="start-btn" class="winui-btn winui-btn-accent">
                            <span class="btn-icon" id="btn-icon">${icons.play}</span>
                            <span id="btn-text">Start organizing</span>
                            <div class="spinner hidden" id="btn-spinner"></div>
                        </button>
                        <button type="button" id="open-dest-btn" class="winui-btn winui-btn-secondary hidden" style="margin-left: 8px;">
                            ${icons.external} Open Destination
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div class="winui-card hidden" id="progress-card">
            <div class="winui-card-header">
                <h2>Progress</h2>
                <span id="status-badge" class="status-badge">Idle</span>
            </div>
            <div class="winui-card-body">
                <div class="progress-row">
                    <div class="progress-track">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <span class="progress-pct" id="progress-pct">0%</span>
                </div>

                <div class="progress-meta">
                    <span class="progress-current-file" id="current-file"></span>
                    <div class="progress-speed-eta">
                        <span id="speed-label"></span>
                        <span id="eta-label"></span>
                    </div>
                </div>

                <div class="progress-controls" id="progress-controls">
                    <button class="winui-btn winui-btn-secondary" id="pause-btn">
                        ${icons.pause} Pause
                    </button>
                    <button class="winui-btn winui-btn-danger" id="cancel-btn">
                        ${icons.stop} Cancel
                    </button>
                </div>

                <div class="stats-row">
                    <div class="stat-tile">
                        <div class="stat-tile-icon scanned">${icons.search}</div>
                        <div class="stat-tile-info">
                            <span class="stat-tile-value" id="stat-scanned">0</span>
                            <span class="stat-tile-label">Scanned</span>
                        </div>
                    </div>
                    <div class="stat-tile">
                        <div class="stat-tile-icon copied">${icons.check}</div>
                        <div class="stat-tile-info">
                            <span class="stat-tile-value" id="stat-copied">0</span>
                            <span class="stat-tile-label">Copied</span>
                        </div>
                    </div>
                    <div class="stat-tile">
                        <div class="stat-tile-icon duplicates">${icons.clipboard}</div>
                        <div class="stat-tile-info">
                            <span class="stat-tile-value" id="stat-duplicates">0</span>
                            <span class="stat-tile-label">Duplicates</span>
                        </div>
                    </div>
                    <div class="stat-tile">
                        <div class="stat-tile-icon skipped">${icons.skipForward}</div>
                        <div class="stat-tile-info">
                            <span class="stat-tile-value" id="stat-skipped">0</span>
                            <span class="stat-tile-label">Skipped</span>
                        </div>
                    </div>
                </div>

                <div class="memory-row">
                    <span class="memory-label">${icons.memory} Memory:</span>
                    <span class="memory-value" id="memory-value">— MB</span>
                </div>
            </div>
        </div>
    `;

    cacheElements();
    bindEvents();
    loadDefaults();
}

function cleanup() {
    if (memoryInterval) {
        clearInterval(memoryInterval);
        memoryInterval = null;
    }
    isPaused = false;
}

function cacheElements() {
    els = {
        form: document.getElementById('organizer-form'),
        startBtn: document.getElementById('start-btn'),
        openDestBtn: document.getElementById('open-dest-btn'),
        btnText: document.getElementById('btn-text'),
        btnIcon: document.getElementById('btn-icon'),
        btnSpinner: document.getElementById('btn-spinner'),
        progressCard: document.getElementById('progress-card'),
        statusBadge: document.getElementById('status-badge'),
        progressFill: document.getElementById('progress-fill'),
        progressPct: document.getElementById('progress-pct'),
        currentFile: document.getElementById('current-file'),
        speedLabel: document.getElementById('speed-label'),
        etaLabel: document.getElementById('eta-label'),
        pauseBtn: document.getElementById('pause-btn'),
        cancelBtn: document.getElementById('cancel-btn'),
        progressCtrls: document.getElementById('progress-controls'),
        scanned: document.getElementById('stat-scanned'),
        copied: document.getElementById('stat-copied'),
        duplicates: document.getElementById('stat-duplicates'),
        skipped: document.getElementById('stat-skipped'),
        memoryValue: document.getElementById('memory-value'),
        diskWarning: document.getElementById('disk-warning'),
        diskWarningTxt: document.getElementById('disk-warning-text'),
    };
}

function bindEvents() {
    document.getElementById('browse-source').addEventListener('click', async () => {
        const path = await bridge.pickFolder();
        if (path) document.getElementById('source').value = path;
    });
    document.getElementById('browse-dest').addEventListener('click', async () => {
        const path = await bridge.pickFolder();
        if (path) {
            document.getElementById('dest').value = path;
            checkDiskSpace(path);
        }
    });

    document.getElementById('dest').addEventListener('change', (e) => {
        if (e.target.value) checkDiskSpace(e.target.value);
    });

    els.pauseBtn.addEventListener('click', async () => {
        if (isPaused) {
            await bridge.resumeOrganization();
            isPaused = false;
            els.pauseBtn.innerHTML = `${icons.pause} Pause`;
            els.statusBadge.textContent = 'Resuming…';
            els.statusBadge.className = 'status-badge running';
            els.progressFill.classList.remove('paused');
        } else {
            await bridge.pauseOrganization();
            isPaused = true;
            els.pauseBtn.innerHTML = `${icons.play} Resume`;
            els.statusBadge.textContent = 'Paused';
            els.statusBadge.className = 'status-badge paused';
            els.progressFill.classList.add('paused');
        }
    });

    els.cancelBtn.addEventListener('click', async () => {
        await bridge.cancelOrganization();
    });

    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const source = document.getElementById('source').value;
        const dest = document.getElementById('dest').value;

        if (!source || !dest) {
            showToast({ type: 'error', title: 'Missing folders', message: 'Please select both source and destination folders.' });
            return;
        }

        els.openDestBtn.classList.add('hidden');
        els.openDestBtn.onclick = () => bridge.openFolder(dest);
        setLoading(true);
        startMemoryMonitor();

        const args = {
            source,
            dest,
            operation: document.getElementById('operation').value,
            date_scheme: document.getElementById('date-scheme').value,
            duplicates_folder: document.getElementById('duplicates-folder').value,
            include_photos: document.getElementById('include-photos').checked,
            include_videos: document.getElementById('include-videos').checked,
            include_others: document.getElementById('include-others').checked,
            dry_run: document.getElementById('dry-run').checked,
        };

        try {
            await bridge.startOrganization(args);
        } catch (err) {
            handleError(err.toString());
        }
    });

    // Bridge listeners
    bridge.onProgress(handleProgress);
    bridge.onComplete(handleComplete);
    bridge.onError(handleError);
    bridge.onCancelled(handleCancelled);
}

async function loadDefaults() {
    try {
        const settings = await bridge.getSettings();
        if (settings.default_operation) document.getElementById('operation').value = settings.default_operation;
        if (settings.date_scheme) document.getElementById('date-scheme').value = settings.date_scheme;
        if (settings.duplicates_folder) document.getElementById('duplicates-folder').value = settings.duplicates_folder;
        if (settings.include_photos !== undefined) document.getElementById('include-photos').checked = settings.include_photos;
        if (settings.include_videos !== undefined) document.getElementById('include-videos').checked = settings.include_videos;
        if (settings.include_others !== undefined) document.getElementById('include-others').checked = settings.include_others;
    } catch (e) {
        // Settings not available yet, skip
    }
}

async function checkDiskSpace(destPath) {
    try {
        const info = await bridge.getDiskInfo(destPath);
        if (info.free_gb > 0 && info.free_gb < 5) {
            els.diskWarning.classList.remove('hidden');
            els.diskWarningTxt.textContent = `Low disk space: only ${info.free_gb} GB free on destination drive.`;
        } else {
            els.diskWarning.classList.add('hidden');
        }
    } catch (e) { /* ignore */ }
}

function handleProgress(data) {
    if (data.status) {
        els.statusBadge.textContent = data.status;
        if (!isPaused) els.statusBadge.className = 'status-badge running';
    }
    if (data.percentage !== undefined) {
        const pct = Math.min(100, Math.max(0, data.percentage));
        els.progressPct.textContent = `${pct.toFixed(1)}%`;
        els.progressFill.style.width = `${pct}%`;
    }
    if (data.current_file) {
        els.currentFile.textContent = data.current_file;
    }
    if (data.speed !== undefined) {
        els.speedLabel.textContent = `${data.speed} files/s`;
    }
    if (data.eta !== undefined) {
        els.etaLabel.textContent = data.eta > 0 ? `ETA: ${formatEta(data.eta)}` : '';
    }
    if (data.scanned !== undefined) els.scanned.textContent = data.scanned;
    if (data.copied !== undefined) els.copied.textContent = data.copied;
    if (data.duplicates !== undefined) els.duplicates.textContent = data.duplicates;
    if (data.skipped !== undefined) els.skipped.textContent = data.skipped;
}

function handleComplete(data) {
    handleProgress(data);
    els.statusBadge.textContent = 'Complete';
    els.statusBadge.className = 'status-badge done';
    els.progressFill.classList.add('done');
    els.progressCtrls.classList.add('hidden');
    els.currentFile.textContent = '';
    setLoading(false);
    stopMemoryMonitor();

    const dur = data.duration_sec ? ` in ${formatEta(data.duration_sec)}` : '';
    showToast({
        type: 'success',
        title: 'Organization complete!',
        message: `${data.copied} files copied, ${data.duplicates} duplicates found${dur}.`,
    });
}

function handleError(msg) {
    els.statusBadge.textContent = 'Error';
    els.statusBadge.className = 'status-badge error';
    els.progressFill.classList.add('error');
    els.progressFill.style.width = '100%';
    els.progressCtrls.classList.add('hidden');
    setLoading(false);
    stopMemoryMonitor();
    showToast({ type: 'error', title: 'Error', message: msg });
}

function handleCancelled() {
    els.statusBadge.textContent = 'Cancelled';
    els.statusBadge.className = 'status-badge cancelled';
    els.progressCtrls.classList.add('hidden');
    setLoading(false);
    stopMemoryMonitor();
    showToast({ type: 'info', title: 'Cancelled', message: 'Organization was cancelled.' });
}

function setLoading(loading) {
    els.startBtn.disabled = loading;
    els.btnText.classList.toggle('hidden', loading);
    els.btnIcon.classList.toggle('hidden', loading);
    els.btnSpinner.classList.toggle('hidden', !loading);
    els.progressCard.classList.remove('hidden');
    els.progressCtrls.classList.toggle('hidden', !loading);
    isPaused = false;
    els.pauseBtn.innerHTML = `${icons.pause} Pause`;

    if (loading) {
        els.progressFill.style.width = '0%';
        els.progressFill.className = 'progress-fill';
        els.progressPct.textContent = '0%';
        els.statusBadge.textContent = 'Initializing…';
        els.statusBadge.className = 'status-badge running';
        els.scanned.textContent = '0';
        els.copied.textContent = '0';
        els.duplicates.textContent = '0';
        els.skipped.textContent = '0';
        els.currentFile.textContent = '';
        els.speedLabel.textContent = '';
        els.etaLabel.textContent = '';
    }
}

function startMemoryMonitor() {
    stopMemoryMonitor();
    memoryInterval = setInterval(async () => {
        try {
            const mem = await bridge.getMemoryUsage();
            if (els.memoryValue) els.memoryValue.textContent = `${mem.rss_mb} MB`;
        } catch (e) { /* ignore */ }
    }, 2000);
}

function stopMemoryMonitor() {
    if (memoryInterval) {
        clearInterval(memoryInterval);
        memoryInterval = null;
    }
}

function formatEta(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

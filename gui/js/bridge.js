/**
 * bridge.js — Pywebview communication layer.
 *
 * Python calls JS via: window._bridge.<funcName>(data)
 * JS calls Python via: window.pywebview.api.<method>(args)
 *
 * Components register listeners; bridge dispatches events.
 */

const listeners = {
    onProgress: [],
    onComplete: [],
    onError: [],
    onCancelled: [],
};

// --- Event registration (components call these) ---

export function onProgress(cb)  { listeners.onProgress.push(cb); }
export function onComplete(cb)  { listeners.onComplete.push(cb); }
export function onError(cb)     { listeners.onError.push(cb); }
export function onCancelled(cb) { listeners.onCancelled.push(cb); }

function _dispatch(event, data) {
    (listeners[event] || []).forEach(cb => {
        try { cb(data); } catch(e) { console.error(`[bridge] listener error:`, e); }
    });
}

// --- Global bridge object (called by Python via evaluate_js) ---

window._bridge = {
    onProgress(data)              { _dispatch('onProgress', data); },
    onOrganizationComplete(data)  { _dispatch('onComplete', data); },
    onOrganizationError(msg)      { _dispatch('onError', msg); },
    onOrganizationCancelled(data) { _dispatch('onCancelled', data); },
};

// --- Python API wrappers ---

let _ready = false;
const _queue = [];

/** Wait for pywebview to be ready before calling API methods */
function _ensureReady() {
    return new Promise((resolve) => {
        if (_ready) return resolve();
        _queue.push(resolve);
    });
}

window.addEventListener('pywebviewready', () => {
    _ready = true;
    _queue.forEach(fn => fn());
    _queue.length = 0;
});

async function api() {
    await _ensureReady();
    return window.pywebview.api;
}

// --- Exposed API methods ---

export async function startOrganization(args) {
    const a = await api();
    return a.start_organization(args);
}

export async function cancelOrganization() {
    const a = await api();
    return a.cancel_organization();
}

export async function pauseOrganization() {
    const a = await api();
    return a.pause_organization();
}

export async function resumeOrganization() {
    const a = await api();
    return a.resume_organization();
}

export async function pickFolder() {
    const a = await api();
    return a.pick_folder();
}

export async function getMemoryUsage() {
    const a = await api();
    return a.get_memory_usage();
}

export async function getDiskInfo(path) {
    const a = await api();
    return a.get_disk_info(path);
}

export async function getHistory() {
    const a = await api();
    return a.get_history();
}

export async function clearHistory() {
    const a = await api();
    return a.clear_history();
}

export async function deleteHistoryItem(timestamp) {
    const a = await api();
    return a.delete_history_item(timestamp);
}

export async function getSettings() {
    const a = await api();
    return a.get_settings();
}

export async function saveSettings(data) {
    const a = await api();
    return a.save_settings(data);
}

export async function resetSettings() {
    const a = await api();
    return a.reset_settings();
}

export async function isReady() {
    await _ensureReady();
    return true;
}

export async function openFolder(path) {
    const a = await api();
    return a.open_folder(path);
}

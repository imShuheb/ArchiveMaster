/**
 * settings-page.js — Settings page component.
 * Loads/saves user preferences via the Python bridge.
 */
import { icons } from '../icons.js';
import * as bridge from '../bridge.js';
import { showToast } from './toast.js';

export async function renderSettingsPage(root) {
    root.innerHTML = `
        <div class="page-header">
            <h1>Settings</h1>
            <p class="page-subtitle">Configure default preferences for the organizer.</p>
        </div>

        <div class="winui-card">
            <div class="winui-card-header"><h2>Defaults</h2></div>
            <div class="winui-card-body">
                <div class="settings-section">
                    <div class="settings-row">
                        <div class="settings-row-label">
                            <span>Default operation</span>
                            <span>Copy or Move files by default</span>
                        </div>
                        <select class="winui-input" id="settings-operation" style="max-width: 150px;">
                            <option value="copy">Copy files</option>
                            <option value="move">Move files</option>
                        </select>
                    </div>

                    <div class="settings-row">
                        <div class="settings-row-label">
                            <span>Date folder structure</span>
                            <span>How files are organized by date</span>
                        </div>
                        <select class="winui-select" id="settings-date-scheme">
                            <option value="year-month">Year / Month</option>
                            <option value="year-month-day">Year / Month-Day</option>
                        </select>
                    </div>

                    <div class="settings-row">
                        <div class="settings-row-label">
                            <span>Duplicates folder name</span>
                            <span>Name of the folder for duplicate files</span>
                        </div>
                        <input class="winui-input" type="text" id="settings-duplicates-folder" value="duplicates">
                    </div>

                    <div class="settings-row">
                        <div class="settings-row-label">
                            <span>Organize Photos</span>
                            <span>Include image files like JPG, PNG, RAW</span>
                        </div>
                        <label class="winui-toggle">
                            <input type="checkbox" id="settings-include-photos">
                            <span class="winui-toggle-track"></span>
                        </label>
                    </div>

                    <div class="settings-row">
                        <div class="settings-row-label">
                            <span>Organize Videos</span>
                            <span>Include video files like MP4, MOV, AVI</span>
                        </div>
                        <label class="winui-toggle">
                            <input type="checkbox" id="settings-include-videos">
                            <span class="winui-toggle-track"></span>
                        </label>
                    </div>

                    <div class="settings-row">
                        <div class="settings-row-label">
                            <span>Organize Other Files</span>
                            <span>Include any other unrecognized files (documents, zips, etc.)</span>
                        </div>
                        <label class="winui-toggle">
                            <input type="checkbox" id="settings-include-others">
                            <span class="winui-toggle-track"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-actions">
                    <button class="winui-btn winui-btn-subtle" id="reset-settings-btn">
                        ${icons.refresh} Reset to defaults
                    </button>
                    <button class="winui-btn winui-btn-accent" id="save-settings-btn">
                        ${icons.save} Save settings
                    </button>
                </div>
            </div>
        </div>
    `;

    // Load current settings
    try {
        const s = await bridge.getSettings();
        fillForm(s);
    } catch (e) { /* defaults already in HTML */ }

    // Save
    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        const data = readForm();
        await bridge.saveSettings(data);
        showToast({ type: 'success', title: 'Settings saved' });
    });

    // Reset
    document.getElementById('reset-settings-btn').addEventListener('click', async () => {
        const defaults = await bridge.resetSettings();
        fillForm(defaults);
        showToast({ type: 'info', title: 'Settings reset to defaults' });
    });
}

function fillForm(s) {
    document.getElementById('settings-operation').value = s.default_operation || 'copy';
    document.getElementById('settings-date-scheme').value = s.date_scheme || 'year-month';
    document.getElementById('settings-duplicates-folder').value = s.duplicates_folder || 'duplicates';
    document.getElementById('settings-include-photos').checked = s.include_photos !== false;
    document.getElementById('settings-include-videos').checked = s.include_videos !== false;
    document.getElementById('settings-include-others').checked = !!s.include_others;
}

function readForm() {
    return {
        default_operation: document.getElementById('settings-operation').value,
        date_scheme:       document.getElementById('settings-date-scheme').value,
        duplicates_folder: document.getElementById('settings-duplicates-folder').value,
        include_photos:    document.getElementById('settings-include-photos').checked,
        include_videos:    document.getElementById('settings-include-videos').checked,
        include_others:    document.getElementById('settings-include-others').checked,
    };
}

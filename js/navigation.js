// public/js/navigation.js

import * as UI from './ui.js';
import { renderScheduler } from './ui-scheduler.js';

// --- PAGE CONFIG & TEMPLATES ---
const pageConfig = {
    'dashboard': { title: 'Dashboard Overview', buttonText: 'Refresh View', icon: 'fa-sync-alt' },
    'screens': { title: 'Manage Screens', buttonText: 'Add New Screen', icon: 'fa-plus' },
    'media': { title: 'Media Library', buttonText: 'Upload Media', icon: 'fa-upload' },
    'scheduler': { title: 'Event Scheduler', buttonText: 'Create Schedule', icon: 'fa-plus' }
};

const pageTemplates = {
     dashboard: () => `
        <div class="widget-grid">
            <div id="widget-screen-status" class="widget" data-page="screens">
                <div class="widget-header"><span>Screen Status</span><i class="fas fa-desktop"></i></div>
                <div id="widget-screen-status-value" class="widget-value">...</div>
            </div>
            <div id="widget-media-count" class="widget" data-page="media">
                <div class="widget-header"><span>Media Library</span><i class="fas fa-images"></i></div>
                <div id="widget-media-count-value" class="widget-value">...</div>
            </div>
        </div>
        <div class="dashboard-grid">
            <div class="live-view-container">
                <h3>Live Screen View</h3>
                <div id="live-view-grid" class="live-view-grid"></div>
            </div>
        </div>
        <div class="upcoming-schedule-container dashboard-section-margin-top">
            <h3>Upcoming Events</h3>
            <div id="upcoming-schedule-list" class="upcoming-schedule-list"></div>
        </div>
    `,
    screens: () => `<div class="data-table-container"><table class="data-table"><thead><tr><th>Screen Name</th><th>Screen ID</th><th>Status</th><th>Actions</th></tr></thead><tbody id="screens-table-body"></tbody></table></div>`,
    media: () => `<div class="media-upload-area"><i class="fas fa-cloud-arrow-up"></i><h3>Drag & Drop or Click to Upload</h3><p>PNG, JPG, GIF, SVG</p><div class="progress-bar-container"><div class="progress-bar"></div></div></div><div class="media-grid" id="media-grid-container"></div>`,
    scheduler: () => `
        <div class="scheduler-controls">
            <div class="scheduler-nav">
                <div class="nav-buttons-group">
                    <button class="btn btn-secondary" id="schedule-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="btn btn-secondary" id="schedule-today">Today</button>
                    <button class="btn btn-secondary" id="schedule-next"><i class="fas fa-chevron-right"></i></button>
                </div>
                <h3 id="schedule-current-date"></h3>
            </div>
            <div class="scheduler-view-options">
                <div id="screen-selector-container" class="screen-selector-container hidden">
                    <select id="screen-selector" class="form-control"></select>
                </div>
                <div class="view-tabs">
                    <button class="btn active" data-view="day">Day View</button>
                    <button class="btn" data-view="screen">Screen View</button>
                </div>
            </div>
        </div>
        <div id="scheduler-viewport" class="scheduler-viewport">
            <div id="scheduler-view-container"></div>
        </div>
    `,
};

export function navigateTo(pageId, appState) {
    document.querySelectorAll('.nav-link').forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-page') === pageId));
    document.querySelectorAll('.page').forEach(page => {
        const currentPageId = page.id.replace('page-', '');
        if (currentPageId === pageId) {
            page.innerHTML = pageTemplates[pageId]();
            page.classList.add('active');
            
            if (pageId === 'dashboard') UI.renderDashboard(appState.calculateCurrentScreenStates(), appState.allMedia, appState.allSchedules);
            else if (pageId === 'screens') UI.renderScreens(appState.allScreens);
            else if (pageId === 'media') {
                const mediaGrid = document.getElementById('media-grid-container');
                if (mediaGrid) {
                    appState.allMedia.forEach(item => {
                        const element = UI.createMediaItemElement(item, appState.userSettings.globalDefaultImage);
                        mediaGrid.appendChild(element);
                    });
                }
            }
            else if (pageId === 'scheduler') {
                const screenSelector = document.getElementById('screen-selector');
                if (screenSelector) {
                    screenSelector.innerHTML = appState.allScreens.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                    if (appState.selectedScreenId) screenSelector.value = appState.selectedScreenId;
                }
                appState.renderCurrentSchedulerView();
            }
            appState.handleImageLoading();
        } else {
            page.classList.remove('active');
            page.innerHTML = '';
        }
    });
    document.getElementById('page-title').textContent = pageConfig[pageId].title;

    const actionButton = document.getElementById('header-action-button');
    actionButton.innerHTML = `
        <i class="fas ${pageConfig[pageId].icon}"></i>
        <span class="btn-text">${pageConfig[pageId].buttonText}</span>
    `;    
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }
}
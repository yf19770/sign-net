// public/js/navigation.js

import * as UI from './ui.js';
import { renderScheduler } from './ui-scheduler.js';

const pageConfig = {
    'dashboard': { title: 'Dashboard Overview', buttonText: 'Refresh View', icon: 'fa-sync-alt' },
    'screens': { title: 'Manage Screens', buttonText: 'Add Screen', icon: 'fa-plus' },
    'media': { 
        title: 'Media Library', 
        actions: [
            { id: 'header-upload-btn', text: 'Upload Media', icon: 'fa-upload', classes: 'btn btn-secondary' },
            { id: 'header-playlist-btn', text: 'Create Playlist', icon: 'fa-plus-circle', classes: 'btn btn-primary' }
        ]
    },
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
    media: () => `
        <div class="media-upload-area">
            <i class="fas fa-cloud-upload-alt"></i>
            <h3>Drag & Drop or Click to Upload</h3>
            <p>PNG, JPG, GIF, SVG supported</p>
            <div class="progress-bar-container">
                <div class="progress-bar"></div>
            </div>
        </div>
        <div class="media-section">
            <h3 class="media-section-header">Image Library</h3>
            <div class="media-grid" id="media-grid-container"></div>
        </div>

        <div class="media-section">
            <h3 class="media-section-header">Playlists</h3>
            <div class="playlist-grid-container" id="playlist-grid-container"></div>
        </div>
    `,
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

    // 1. Update sidebar active link
    document.querySelectorAll('.nav-link').forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-page') === pageId));
    
    // 2. Switch the visible page content
    document.querySelectorAll('.page').forEach(page => {
        const currentPageId = page.id.replace('page-', '');
        const shouldBeActive = currentPageId === pageId;
        
        if (shouldBeActive && !page.classList.contains('active')) {
            // This page is becoming active, populate its template
            page.innerHTML = pageTemplates[pageId](); 
        }
        
        page.classList.toggle('active', shouldBeActive);
    });

    // 3. Render the content for the now-active page
    if (pageId === 'dashboard') {
        UI.renderDashboard(appState.calculateCurrentScreenStates(), appState.allMedia, appState.allSchedules);
    } else if (pageId === 'screens') {
        UI.renderScreens(appState.allScreens);
    } else if (pageId === 'media') {
        // --- FIX: Pass the correct userSettings property ---
        UI.renderMedia(appState.allMedia, appState.userSettings.globalDefaultContent);
        UI.renderPlaylists(appState.allPlaylists, appState.userSettings.globalDefaultContent);
    } else if (pageId === 'scheduler') {
        const screenSelector = document.getElementById('screen-selector');
        if (screenSelector) {
            screenSelector.innerHTML = appState.allScreens.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            if (appState.selectedScreenId) screenSelector.value = appState.selectedScreenId;
        }
        appState.renderCurrentSchedulerView();
    }
    
    // 4. Update the page title and header actions
    const config = pageConfig[pageId];
    document.getElementById('page-title').textContent = config.title;
    const headerActions = document.querySelector('.header-actions');
    headerActions.innerHTML = ''; // Always clear previous buttons

    if (config.actions && Array.isArray(config.actions)) {
        config.actions.forEach(action => {
            const button = document.createElement('button');
            button.id = action.id;
            button.className = action.classes;
            button.innerHTML = `<i class="fas ${action.icon}"></i> <span class="btn-text">${action.text}</span>`;
            headerActions.appendChild(button);
        });
    } else if (config.buttonText) {
        const button = document.createElement('button');
        button.id = 'header-action-button';
        button.className = 'btn btn-primary';
        button.innerHTML = `<i class="fas ${config.icon}"></i> <span class="btn-text">${config.buttonText}</span>`;
        headerActions.appendChild(button);
    }

    // 5. Ensure all images (especially lazy-loaded ones) are handled
    appState.handleImageLoading();
    
    // 6. Close the sidebar if it's open on mobile
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }
}
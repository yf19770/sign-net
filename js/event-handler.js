// public/js/event-handler.js

import { auth } from './firebase.js';
import * as UI from './ui.js';
import { navigateTo } from './navigation.js';
import * as ScreenManager from './screens-manager.js';
import * as MediaManager from './media-manager.js';
import * as SchedulerManager from './scheduler-manager.js';
import * as SettingsManager from './settings-manager.js';

export function initializeEventListeners(appState) {
    const fileUploadInput = document.getElementById('file-upload-input');
    
    // --- Sidebar and Theme Toggles (Direct Listeners) ---
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    };
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close-btn').addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
    });

    document.getElementById('header-action-button').addEventListener('click', () => {
        const activePage = document.querySelector('.nav-link.active').dataset.page;
        if (activePage === 'screens') UI.populateScreenModal(appState.allMedia, null);
        else if (activePage === 'media') fileUploadInput.click();
        else if (activePage === 'scheduler') {
            UI.populateSchedulerModal(appState.allScreens, appState.allMedia, null);
            UI.showModal('modal-create-schedule');
        } else if (activePage === 'dashboard') {
            UI.renderDashboard(appState.calculateCurrentScreenStates(), appState.allMedia, appState.allSchedules);
            UI.showToast("Dashboard view refreshed!");
            appState.handleImageLoading();
        }
    });

    // --- Single Delegated Click Listener for the Entire App ---
    document.body.addEventListener('click', async (e) => {
        const target = e.target;

        // Sidebar Navigation
        const navLink = target.closest('.nav-link');
        if (navLink) {
            e.preventDefault();
            navigateTo(navLink.dataset.page, appState);
            return;
        }

        // Widget Navigation
        const widget = target.closest('.widget[data-page]');
        if (widget) {
            navigateTo(widget.dataset.page, appState);
            return;
        }

        // Modal Closing
        if (target.classList.contains('close-modal')) {
            UI.hideModals();
        }

        // Screens Page Actions
        const screenRow = target.closest('tr[data-id]');
        if (screenRow) {
            const screenId = screenRow.dataset.id;
            const screen = appState.allScreens.find(s => s.id === screenId);
            if (target.matches('.fa-pen-to-square')) {
                UI.populateScreenModal(appState.allMedia, screen);
            } else if (target.matches('.fa-trash-can')) {
                if (confirm(`Delete screen "${screen.name}"?`)) ScreenManager.deleteScreen(appState.currentUser.uid, screenId);
            } else if (target.matches('.fa-copy')) {
                const url = `${window.location.origin}/view.html?user=${appState.currentUser.uid}&screen=${screenId}`;
                try { await navigator.clipboard.writeText(url); UI.showToast('View URL copied!'); } catch (err) { UI.showToast('Failed to copy URL.', 'error'); }
            }
        }
        
        // Media Page Actions
        if (target.closest('.media-upload-area')) fileUploadInput.click();
        
        const mediaItemEl = target.closest('.media-item');
        if(mediaItemEl) {
            if (target.matches('.fa-trash-can')) {
                if (confirm(`Are you sure you want to delete this media item?`)) { MediaManager.deleteMediaItem(appState.currentUser.uid, mediaItemEl.dataset.id, mediaItemEl.dataset.storagePath); }
            } else if (target.matches('.global-fallback-indicator')) {
                const mediaData = JSON.parse(mediaItemEl.dataset.media);
                await SettingsManager.setGlobalDefaultImage(appState.currentUser.uid, target.classList.contains('active') ? null : mediaData);
            } else if (target.matches('.media-save-btn')) { // CORRECTED SAVE LOGIC
                const filenameEl = mediaItemEl.querySelector('.media-filename');
                const newName = filenameEl.textContent.trim();
                
                if (newName && newName !== filenameEl.dataset.originalName) {
                    const success = await MediaManager.updateMediaName(appState.currentUser.uid, filenameEl.dataset.id, newName);
                    if (success) {
                        filenameEl.dataset.originalName = newName; // Update the original name in the DOM
                        target.classList.add('hidden'); // Hide the save button
                        filenameEl.blur(); // Unfocus the element
                    }
                } else { // If name is empty or unchanged, revert and hide button
                    filenameEl.textContent = filenameEl.dataset.originalName;
                    target.classList.add('hidden');
                    filenameEl.blur();
                }
            }
        }
        
        // Scheduler Page Actions
        const scheduledItemEl = target.closest('.scheduled-item');
        if (scheduledItemEl) {
            const scheduleItem = appState.allSchedules.find(item => item.id === scheduledItemEl.dataset.id);
            if (scheduleItem) {
                UI.populateSchedulerModal(appState.allScreens, appState.allMedia, scheduleItem);
                UI.showModal('modal-create-schedule');
            }
        }
        if (target.closest('#schedule-prev')) {
            appState.selectedDate.setDate(appState.selectedDate.getDate() - (appState.currentSchedulerView === 'day' ? 1 : 7));
            appState.renderCurrentSchedulerView();
        }
        if (target.closest('#schedule-next')) {
            appState.selectedDate.setDate(appState.selectedDate.getDate() + (appState.currentSchedulerView === 'day' ? 1 : 7));
            appState.renderCurrentSchedulerView();
        }
        if (target.closest('#schedule-today')) {
            appState.selectedDate = new Date();
            appState.renderCurrentSchedulerView();
        }
        if (target.closest('.view-tabs button')) {
            const btn = target.closest('button');
            if (!btn.classList.contains('active')) {
                btn.parentElement.querySelector('.active').classList.remove('active');
                btn.classList.add('active');
                appState.currentSchedulerView = btn.dataset.view;
                appState.renderCurrentSchedulerView();
            }
        }
    });

    // --- Delegated Input/Keydown Listeners ---
    document.body.addEventListener('input', e => {
        if (e.target.matches('.media-filename[contenteditable="true"]')) {
            const saveBtn = e.target.closest('.media-item').querySelector('.media-save-btn');
            saveBtn.classList.remove('hidden');
        }
        if (e.target.id === 'screen-name-input' && !document.getElementById('screen-id-edit-storage').value) {
            document.getElementById('screen-id-input').value = e.target.value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
    });

    document.body.addEventListener('keydown', async e => {
        if (e.target.matches('.media-filename[contenteditable="true"]')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.closest('.media-item').querySelector('.media-save-btn').click();
            }
            if (e.key === 'Escape') {
                const saveBtn = e.target.closest('.media-item').querySelector('.media-save-btn');
                e.target.textContent = e.target.dataset.originalName;
                saveBtn.classList.add('hidden');
                e.target.blur();
            }
        }
    });

    // --- Modal & Form Listeners ---
    document.getElementById('save-screen-btn').addEventListener('click', async () => {
        const name = document.getElementById('screen-name-input').value.trim();
        const id = document.getElementById('screen-id-input').value.trim();
        const editingId = document.getElementById('screen-id-edit-storage').value;
        if (!name || !id) { UI.showToast('Name and ID are required.', 'error'); return; }
        if (!editingId && appState.allScreens.some(s => s.id === id)) { UI.showToast('Screen ID must be unique.', 'error'); return; }
        const selectedEl = document.querySelector('#screen-default-image-picker .selected');
        const defaultImage = selectedEl ? JSON.parse(selectedEl.dataset.media) : null;
        const success = editingId
            ? await ScreenManager.updateScreen(appState.currentUser.uid, editingId, name, defaultImage)
            : await ScreenManager.addScreen(appState.currentUser.uid, id, name, defaultImage);
        if (success) UI.hideModals();
    });

    fileUploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) MediaManager.handleFileUpload(appState.currentUser.uid, e.target.files);
    });
    
    document.body.addEventListener('change', e => {
        if(e.target.id === 'screen-selector') { 
            appState.selectedScreenId = e.target.value; 
            appState.renderCurrentSchedulerView(); 
        }
    });
    
    document.getElementById('save-schedule-btn').addEventListener('click', async () => {
        const screenIds = [...document.querySelectorAll('#schedule-screen-select .selected')].map(el => el.dataset.id);
        const imageEl = document.querySelector('#schedule-image-picker .selected');
        const startTime = document.getElementById('schedule-start-time').value;
        const endTime = document.getElementById('schedule-end-time').value;
        const editingId = document.getElementById('schedule-id-edit-storage').value;
        if (screenIds.length === 0 || !imageEl || !startTime || !endTime) { UI.showToast("Please complete all fields.", "error"); return; }
        const data = { screenIds, media: JSON.parse(imageEl.dataset.media), startTime: firebase.firestore.Timestamp.fromDate(new Date(startTime)), endTime: firebase.firestore.Timestamp.fromDate(new Date(endTime)) };
        const success = editingId 
            ? await SchedulerManager.updateScheduleItem(appState.currentUser.uid, editingId, data) 
            : await SchedulerManager.addScheduleItem(appState.currentUser.uid, data);
        if(success) UI.hideModals();
    });

    document.getElementById('delete-schedule-btn').addEventListener('click', async () => {
        const id = document.getElementById('schedule-id-edit-storage').value;
        if (id && confirm('Are you sure you want to permanently delete this schedule item?')) { 
            if(await SchedulerManager.deleteScheduleItem(appState.currentUser.uid, id)) UI.hideModals(); 
        }
    });
}
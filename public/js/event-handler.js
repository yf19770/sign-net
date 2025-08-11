// js/event-handler.js

import { signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-functions.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import * as UI from './ui.js';
import { navigateTo } from './navigation.js';
import * as ScreenManager from './screens-manager.js';
import * as MediaManager from './media-manager.js';
import * as SchedulerManager from './scheduler-manager.js';
import * as PlaylistManager from './playlist-manager.js';
import * as SettingsManager from './settings-manager.js';

export function initializeEventListeners(appState) {
    const fileUploadInput = document.getElementById('file-upload-input');
    
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleSidebar = () => { sidebar.classList.toggle('active'); sidebarOverlay.classList.toggle('active'); };
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close-btn').addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => { e.preventDefault(); signOut(appState.auth); });

    document.querySelector('.header-actions').addEventListener('click', (e) => {
        const singleButton = e.target.closest('#header-action-button');
        if (singleButton) {
            const activePage = document.querySelector('.nav-link.active').dataset.page;
            if (activePage === 'screens') {
                UI.populateAddScreenModal(appState.allMedia, appState.allPlaylists);
                UI.showModal('modal-add-screen');
            } else if (activePage === 'scheduler') {
                UI.populateSchedulerModal(appState.allScreens, appState.allMedia, appState.allPlaylists, null);
                UI.showModal('modal-create-schedule');
            } else if (activePage === 'dashboard') {
                UI.renderDashboard(appState.calculateCurrentScreenStates(), appState.allMedia, appState.allSchedules);
                UI.showToast("Dashboard view refreshed!");
                appState.handleImageLoading();
            }
        }
    });

    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { document.body.addEventListener(eventName, preventDefaults); });
    document.body.addEventListener('dragenter', (e) => { const dropArea = document.querySelector('.media-upload-area'); if (dropArea) dropArea.classList.add('drag-over'); });
    document.body.addEventListener('dragleave', (e) => { if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget)) { const dropArea = document.querySelector('.media-upload-area'); if (dropArea) dropArea.classList.remove('drag-over'); } });
    document.body.addEventListener('drop', (e) => {
        const dropArea = document.querySelector('.media-upload-area');
        if (dropArea) {
            dropArea.classList.remove('drag-over');
            if (e.target.closest('.media-upload-area')) {
                const files = e.dataTransfer.files;
                if (files.length > 0) { MediaManager.handleFileUpload(appState.storage, appState.db, appState.currentUser.uid, files); }
            }
        }
    });

    document.body.addEventListener('click', async (e) => {
        const target = e.target;

         if (target.id === 'copy-view-url-btn') {
            const urlToCopy = 'https://sign-net.app/view';
            navigator.clipboard.writeText(urlToCopy).then(() => {
                UI.showToast('URL copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy URL: ', err);
                UI.showToast('Failed to copy URL.', 'error');
            });
            return; // Prevent other click handlers from firing
        }

        if (target.closest('#header-upload-btn')) { fileUploadInput.click(); }
        if (target.closest('#header-playlist-btn')) { UI.populatePlaylistEditor(appState.allMedia); UI.showModal('modal-playlist-editor'); }
        
        const playlistCard = target.closest('.playlist-card');
        if (playlistCard && !target.closest('.global-fallback-indicator')) { 
            const playlistData = JSON.parse(playlistCard.dataset.playlist);
            UI.populatePlaylistEditor(appState.allMedia, playlistData);
            UI.showModal('modal-playlist-editor');
        }

        if (target.closest('#create-first-playlist-cta')) { UI.populatePlaylistEditor(appState.allMedia); UI.showModal('modal-playlist-editor'); }

        const navLink = target.closest('.nav-link');
        if (navLink) { e.preventDefault(); navigateTo(navLink.dataset.page, appState); return; }
        const widget = target.closest('.widget[data-page]');
        if (widget) { navigateTo(widget.dataset.page, appState); return; }
        if (target.classList.contains('close-modal')) { UI.hideModals(); }

        const screenRow = target.closest('tr[data-id]');
        if (screenRow) {
            const screenId = screenRow.dataset.id;
            const screen = appState.allScreens.find(s => s.id === screenId);
            if (target.matches('.fa-link')) {
                document.getElementById('pin-entry-screen-id-storage').value = screenId;
                UI.showModal('modal-enter-pin');
            } else if (target.matches('.fa-pen-to-square')) {
                UI.populateScreenEditModal(appState.allMedia, appState.allPlaylists, screen);
                UI.showModal('modal-edit-screen');
            } else if (target.matches('.fa-trash-can')) {
                if (confirm(`Delete screen "${screen.name}"? This is permanent.`)) { ScreenManager.deleteScreen(appState.db, screenId); }
            }
        }
        
        if (target.closest('.media-upload-area') && !target.closest('.media-upload-area.is-uploading')) { fileUploadInput.click(); }
        
        const fallbackIndicator = target.closest('.global-fallback-indicator');
        if (fallbackIndicator) {
            const contentContainer = fallbackIndicator.closest('[data-content]');
            if (contentContainer) {
                const contentData = JSON.parse(contentContainer.dataset.content);
                const isBecomingInactive = fallbackIndicator.classList.contains('active');
                await SettingsManager.setGlobalDefaultContent(
                    appState.currentUser.uid, 
                    appState.db, 
                    isBecomingInactive ? null : contentData
                );
            }
        }

        const mediaItemEl = target.closest('.media-item');
        if(mediaItemEl) {
            if (target.matches('.fa-trash-can')) { 
                if (confirm(`Delete this media item?`)) { 
                    MediaManager.deleteMediaItem(appState.storage, appState.db, mediaItemEl.dataset.id, mediaItemEl.dataset.storagePath); 
                } 
            } else if (target.matches('.media-save-btn')) { 
                const filenameEl = mediaItemEl.querySelector('.media-filename');
                const newName = filenameEl.textContent.trim();
                if (newName && newName !== filenameEl.dataset.originalName) {
                    if (await MediaManager.updateMediaName(appState.db, filenameEl.dataset.id, newName)) {
                        filenameEl.dataset.originalName = newName; 
                        target.classList.add('hidden'); 
                        filenameEl.blur(); 
                    }
                } else { 
                    filenameEl.textContent = filenameEl.dataset.originalName; 
                    target.classList.add('hidden'); 
                    filenameEl.blur(); 
                }
            }
        }
        
        const scheduledItemEl = target.closest('.scheduled-item');
        if (scheduledItemEl) {
            const scheduleItem = appState.allSchedules.find(item => item.id === scheduledItemEl.dataset.id);
            if (scheduleItem) { UI.populateSchedulerModal(appState.allScreens, appState.allMedia, appState.allPlaylists, scheduleItem); UI.showModal('modal-create-schedule'); }
        }
        if (target.closest('#schedule-prev')) { appState.selectedDate.setDate(appState.selectedDate.getDate() - (appState.currentSchedulerView === 'day' ? 1 : 7)); appState.renderCurrentSchedulerView(); }
        if (target.closest('#schedule-next')) { appState.selectedDate.setDate(appState.selectedDate.getDate() + (appState.currentSchedulerView === 'day' ? 1 : 7)); appState.renderCurrentSchedulerView(); }
        if (target.closest('#schedule-today')) { appState.selectedDate = new Date(); appState.renderCurrentSchedulerView(); }
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

    document.body.addEventListener('input', e => {
        if (e.target.id === 'pairing-pin-input') { e.target.value = e.target.value.replace(/\D/g, ''); }
        if (e.target.matches('.media-filename[contenteditable="true"]')) { const saveBtn = e.target.closest('.media-item').querySelector('.media-save-btn'); saveBtn.classList.remove('hidden'); }
    });
    document.body.addEventListener('keydown', async e => {
        if (e.target.matches('.media-filename[contenteditable="true"]')) {
            if (e.key === 'Enter') { e.preventDefault(); e.target.closest('.media-item').querySelector('.media-save-btn').click(); }
            if (e.key === 'Escape') {
                const saveBtn = e.target.closest('.media-item').querySelector('.media-save-btn');
                e.target.textContent = e.target.dataset.originalName;
                saveBtn.classList.add('hidden');
                e.target.blur();
            }
        }
    });
    document.body.addEventListener('paste', e => {
        if (e.target.id === 'pairing-pin-input') {
            e.preventDefault();
            e.target.value = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        }
    });

    document.getElementById('save-new-screen-btn').addEventListener('click', async (e) => {
        const nameInput = document.getElementById('add-screen-name-input');
        const name = nameInput.value.trim();
        if (!name) { UI.showToast('Screen name is required.', 'error'); return; }
        const selectedEl = document.querySelector('#add-screen-media-picker-container .selected');
        const defaultContent = selectedEl ? JSON.parse(selectedEl.dataset.content) : null;
        const button = e.currentTarget;
        button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        try { if (await ScreenManager.addScreen(appState.db, appState.currentUser.uid, name, defaultContent)) { UI.hideModals(); } }
        catch (error) { console.error("Screen creation failed:", error); UI.showToast(error.message || "Failed to create screen.", "error"); }
        finally { nameInput.value = ''; button.disabled = false; button.innerHTML = 'Create Screen'; }
    });

    document.getElementById('confirm-pin-and-pair-btn').addEventListener('click', async (e) => {
        const pinInput = document.getElementById('pairing-pin-input');
        const pin = pinInput.value.trim();
        const screenId = document.getElementById('pin-entry-screen-id-storage').value;
        if (!pin || pin.length !== 6 || !screenId) { UI.showToast('Please enter a valid 6-digit PIN.', 'error'); return; }
        const button = e.currentTarget;
        button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pairing...';
        try {
            await httpsCallable(appState.functions, 'completePairing')({ pin, screenId });
            UI.showToast("Screen paired successfully!", "success"); UI.hideModals();
        } catch (error) { console.error("Pairing failed:", error); UI.showToast(error.message || "Failed to pair. Check PIN.", "error"); }
        finally { pinInput.value = ''; button.disabled = false; button.innerHTML = 'Confirm & Pair'; }
    });

    document.getElementById('save-screen-btn').addEventListener('click', async () => {
        const name = document.getElementById('screen-name-input').value.trim();
        const editingId = document.getElementById('screen-id-edit-storage').value;
        if (!name || !editingId) { UI.showToast('Screen name is required.', 'error'); return; }
        const selectedEl = document.querySelector('#edit-screen-media-picker-container .selected');
        const defaultContent = selectedEl ? JSON.parse(selectedEl.dataset.content) : null;
        if (await ScreenManager.updateScreen(appState.db, editingId, name, defaultContent)) UI.hideModals();
    });

    fileUploadInput.addEventListener('change', (e) => { if (e.target.files.length > 0) { MediaManager.handleFileUpload(appState.storage, appState.db, appState.currentUser.uid, e.target.files); } });
    
    document.body.addEventListener('change', e => { if(e.target.id === 'screen-selector') { appState.selectedScreenId = e.target.value; appState.renderCurrentSchedulerView(); } });
    
    document.getElementById('save-schedule-btn').addEventListener('click', async () => {
        const screenIds = [...document.querySelectorAll('#schedule-screen-select .selected')].map(el => el.dataset.id);
        const contentEl = document.querySelector('#schedule-media-picker-container .selected');
        const startTime = document.getElementById('schedule-start-time').value;
        const endTime = document.getElementById('schedule-end-time').value;
        const editingId = document.getElementById('schedule-id-edit-storage').value;
        if (screenIds.length === 0 || !contentEl || !startTime || !endTime) { UI.showToast("Please complete all fields.", "error"); return; }
        const data = { 
            screenIds, 
            content: JSON.parse(contentEl.dataset.content), 
            startTime: Timestamp.fromDate(new Date(startTime)), 
            endTime: Timestamp.fromDate(new Date(endTime)) 
        };
        const success = editingId 
            ? await SchedulerManager.updateScheduleItem(appState.db, editingId, data) 
            : await SchedulerManager.addScheduleItem(appState.db, appState.currentUser.uid, data);
        if(success) UI.hideModals();
    });

    document.getElementById('delete-schedule-btn').addEventListener('click', async () => {
        const id = document.getElementById('schedule-id-edit-storage').value;
        if (id && confirm('Delete this schedule item?')) { if(await SchedulerManager.deleteScheduleItem(appState.db, id)) UI.hideModals(); }
    });

    document.getElementById('add-slide-btn').addEventListener('click', () => { UI.populateImageSelector(appState.allMedia); UI.showModal('modal-select-image'); });
    document.getElementById('add-selected-images-btn').addEventListener('click', () => {
        document.querySelectorAll('#playlist-image-selector-grid .selected').forEach(imgEl => { UI.addSlideToPlaylistEditor(JSON.parse(imgEl.dataset.media)); });
        UI.hideModals(); UI.showModal('modal-playlist-editor');
    });

    document.getElementById('save-playlist-btn').addEventListener('click', async () => {
        const name = document.getElementById('playlist-name-input').value.trim();
        const editingId = document.getElementById('playlist-id-edit-storage').value;
        if (!name) { UI.showToast("Playlist name is required.", "error"); return; }
        const items = [];
        document.querySelectorAll('#playlist-slides-container .playlist-slide:not(.add-slide-card)').forEach(slideEl => {
            items.push({
                media: JSON.parse(slideEl.dataset.media),
                duration: parseInt(slideEl.dataset.duration, 10) || 10
            });
        });
        if (items.length === 0) { UI.showToast("A playlist must have at least one image.", "error"); return; }
        const playlistData = { name, items };
        const success = editingId 
            ? await PlaylistManager.updatePlaylist(appState.db, editingId, playlistData)
            : await PlaylistManager.addPlaylist(appState.db, appState.currentUser.uid, playlistData);
        if (success) { UI.hideModals(); }
    });

    document.getElementById('delete-playlist-btn').addEventListener('click', async () => {
        const id = document.getElementById('playlist-id-edit-storage').value;
        if (id && confirm('Delete this playlist?')) { if (await PlaylistManager.deletePlaylist(appState.db, id)) { UI.hideModals(); } }
    });

    // --- START OF DRAG & DROP FIX ---
    let draggedItem = null;

    document.body.addEventListener('dragstart', (e) => {
        // This selector correctly ignores the "add-slide-card"
        if (e.target.matches('.playlist-slide:not(.add-slide-card)')) {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0);
        }
    });

    document.body.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    document.body.addEventListener('dragover', (e) => {
        const container = e.target.closest('.playlist-slides-container');
        if (container && draggedItem) {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientX);
            const addSlideButton = document.getElementById('add-slide-btn');
            
            if (afterElement == null) {
                // If getDragAfterElement returns null, it means we're at the end.
                // So, insert the dragged item right before the "Add Slide" button.
                container.insertBefore(draggedItem, addSlideButton);
            } else {
                // Otherwise, insert it before the element we calculated.
                container.insertBefore(draggedItem, afterElement);
            }
        }
    });

    function getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.playlist-slide:not(.dragging):not(.add-slide-card)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}
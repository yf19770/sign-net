// public/js/main.js

import { auth, rtdb } from './firebase.js';
import * as UI from './ui.js';
import { renderScheduler } from './ui-scheduler.js';
import { navigateTo } from './navigation.js';
import { initializeEventListeners } from './event-handler.js';
import * as ScreenManager from './screens-manager.js';
import * as MediaManager from './media-manager.js';
import * as SchedulerManager from './scheduler-manager.js';
import * as SettingsManager from './settings-manager.js';

// --- GLOBAL STATE ---
const appState = {
    currentUser: null,
    userSettings: {},
    allScreens: [],
    screenStatuses: {}, // MASTER copy of statuses from RTDB
    allMedia: [],
    allSchedules: [],
    currentSchedulerView: 'day',
    selectedDate: new Date(),
    selectedScreenId: null,

    // Methods that depend on state
    calculateCurrentScreenStates() {
        const now = new Date();
        return this.allScreens.map(screen => {
            const activeSchedule = this.allSchedules.find(schedule =>
                schedule.screenIds.includes(screen.id) &&
                schedule.startTime.toDate() <= now &&
                schedule.endTime.toDate() > now
            );
            let url = null;
            if (activeSchedule) url = activeSchedule.media.url;
            else if (screen.defaultImage && screen.defaultImage.url) url = screen.defaultImage.url;
            else if (this.userSettings.globalDefaultImage && this.userSettings.globalDefaultImage.url) url = this.userSettings.globalDefaultImage.url;
            
            return { ...screen, currentImageURL: url };
        });
    },

    renderCurrentSchedulerView() {
        renderScheduler(this.currentSchedulerView, this.allSchedules, this.allScreens, this.selectedDate, this.selectedScreenId);
        
        const dateDisplay = document.getElementById('schedule-current-date');
        if (!dateDisplay) return;

        if (this.currentSchedulerView === 'day') {
            const mobileOptions = { weekday: 'short', month: 'numeric', day: 'numeric', year: '2-digit' };
            const desktopOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateDisplay.innerHTML = `<span class="date-desktop">${this.selectedDate.toLocaleDateString(undefined, desktopOptions)}</span><span class="date-mobile">${this.selectedDate.toLocaleDateString(undefined, mobileOptions)}</span>`;
        } else {
            const startOfWeek = new Date(this.selectedDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            const mobileOptions = { month: 'numeric', day: 'numeric' };
            const desktopOptions = { month: 'short', day: 'numeric' };
            dateDisplay.innerHTML = `<span class="date-desktop">${startOfWeek.toLocaleDateString(undefined, desktopOptions)} - ${endOfWeek.toLocaleDateString(undefined, desktopOptions)}</span><span class="date-mobile">${startOfWeek.toLocaleDateString(undefined, mobileOptions)} - ${endOfWeek.toLocaleDateString(undefined, mobileOptions)}</span>`;
        }

        const screenSelectorContainer = document.getElementById('screen-selector-container');
        if (screenSelectorContainer) {
            screenSelectorContainer.classList.toggle('hidden', this.currentSchedulerView !== 'screen');
        }

        const viewport = document.getElementById('scheduler-viewport');
        if (viewport) {
            const hourHeight = 60;
            const isToday = new Date().toDateString() === this.selectedDate.toDateString();
            viewport.scrollTop = isToday ? (new Date().getHours()) * hourHeight : 7.5 * hourHeight;
        }
        this.handleImageLoading();
    },

    handleImageLoading() {
        const images = document.querySelectorAll('.lazy-image');
        images.forEach(img => {
            if (img.complete && img.naturalHeight > 0) {
                img.classList.add('is-loaded');
            } else {
                img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
                img.addEventListener('error', () => console.warn("Image failed to load:", img.src), { once: true });
            }
        });
    }
};

// --- APPLICATION INITIALIZATION ---
function initApp(user) {
    appState.currentUser = user;
    document.getElementById('user-info').innerHTML = `<img src="${user.photoURL}" alt="User Photo"><span class="name">${user.displayName}</span>`;

    initializeEventListeners(appState);

    const reRenderDashboard = () => {
        if (document.querySelector('#page-dashboard.active')) {
            UI.renderDashboard(appState.calculateCurrentScreenStates(), appState.allMedia, appState.allSchedules);
            appState.handleImageLoading();
        }
    };
    
    // Listen for connection statuses from RTDB.
    const connectionsRef = rtdb.ref(`/connections/${user.uid}`);
    connectionsRef.on('value', (snapshot) => {
        appState.screenStatuses = snapshot.val() || {};
        
        let needsUIRefresh = false;
        appState.allScreens.forEach(screen => {
            // SIMPLIFIED LOGIC: Trust the 'status' field directly.
            const connectionInfo = appState.screenStatuses[screen.id];
            const newStatus = (connectionInfo?.status === 'online') ? 'online' : 'offline';
            
            if (screen.status !== newStatus) {
                screen.status = newStatus;
                needsUIRefresh = true;
            }
        });

        if (needsUIRefresh) {
            if (document.querySelector('#page-screens.active')) UI.renderScreens(appState.allScreens);
            reRenderDashboard();
        }
    });

    SettingsManager.listenForSettingsChanges(user.uid, settings => {
        appState.userSettings = settings;

        // Surgically update the star icons on the media page if it's active
        const mediaGrid = document.querySelector('#media-grid-container');
        if (mediaGrid) {
            const defaultUrl = settings.globalDefaultImage?.url;
            mediaGrid.querySelectorAll('.media-item').forEach(itemEl => {
                const itemData = JSON.parse(itemEl.dataset.media);
                const starIcon = itemEl.querySelector('.global-fallback-indicator');
                if (starIcon) {
                    starIcon.classList.toggle('active', itemData.url === defaultUrl);
                }
            });
        }
        reRenderDashboard();
    });

    // Listen for the main screen list from Firestore.
    ScreenManager.listenForScreenChanges(user.uid, newScreenData => {
        // Construct the screen list, merging config from Firestore with live status from RTDB.
        appState.allScreens = newScreenData.map(newScreen => {
            // SIMPLIFIED LOGIC: Trust the 'status' field directly.
            const connectionInfo = appState.screenStatuses[newScreen.id];
            const status = (connectionInfo?.status === 'online') ? 'online' : 'offline';
            
            // Return a clean object with only the properties we trust from each source.
            return { 
                id: newScreen.id,
                name: newScreen.name,
                defaultImage: newScreen.defaultImage,
                status: status 
            };
        });
        
        if (document.querySelector('#page-screens.active')) UI.renderScreens(appState.allScreens);
        
        const screenSelector = document.getElementById('screen-selector');
        if (screenSelector) {
            const currentVal = screenSelector.value;
            screenSelector.innerHTML = appState.allScreens.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            if (!appState.selectedScreenId && appState.allScreens.length > 0) appState.selectedScreenId = appState.allScreens[0].id;
            else if (appState.allScreens.length === 0) appState.selectedScreenId = null;
            screenSelector.value = appState.allScreens.some(s => s.id === currentVal) ? currentVal : appState.selectedScreenId;
        }
        reRenderDashboard();
        if (document.querySelector('#page-scheduler.active')) appState.renderCurrentSchedulerView();
    });

    MediaManager.listenForMediaChanges(user.uid, (snapshot) => {
        const mediaGrid = document.getElementById('media-grid-container');
        let needsImageLoadingCheck = false;

        snapshot.docChanges().forEach((change) => {
            const mediaData = { id: change.doc.id, ...change.doc.data() };
            const existingIndex = appState.allMedia.findIndex(m => m.id === mediaData.id);
            
            if (change.type === "added") {
                if (existingIndex === -1) {
                    appState.allMedia.unshift(mediaData);
                    if (mediaGrid) {
                        const newElement = UI.createMediaItemElement(mediaData, appState.userSettings.globalDefaultImage);
                        mediaGrid.prepend(newElement);
                        needsImageLoadingCheck = true;
                    }
                }
            }
            if (change.type === "modified") {
                if (existingIndex > -1) appState.allMedia[existingIndex] = mediaData;
                const element = mediaGrid?.querySelector(`.media-item[data-id="${mediaData.id}"] .media-filename`);
                if (element && element.textContent !== mediaData.name) {
                    element.textContent = mediaData.name;
                    element.dataset.originalName = mediaData.name;
                }
            }
            if (change.type === "removed") {
                if (existingIndex > -1) appState.allMedia.splice(existingIndex, 1);
                mediaGrid?.querySelector(`.media-item[data-id="${mediaData.id}"]`)?.remove();
            }
        });
        
        if (needsImageLoadingCheck) appState.handleImageLoading();
        reRenderDashboard(); 
    });

    SchedulerManager.listenForScheduleChanges(user.uid, schedules => {
        appState.allSchedules = schedules;
        reRenderDashboard();
        if (document.querySelector('#page-scheduler.active')) appState.renderCurrentSchedulerView();
    });

    navigateTo('dashboard', appState);
}

// --- AUTH STATE LISTENER ---
auth.onAuthStateChanged(user => {
    if (user) {
        if (window.location.pathname.includes('login.html')) window.location.replace('index.html');
        else initApp(user);
    } else {
        if (!window.location.pathname.includes('login.html')) window.location.replace('login.html');
    }
});
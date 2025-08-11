// public/js/main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, connectAuthEmulator, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";
import { getDatabase, connectDatabaseEmulator, ref, onValue } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-functions.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app-check.js";
import * as UI from './ui.js';
import { renderScheduler } from './ui-scheduler.js';
import { navigateTo } from './navigation.js';
import { initializeEventListeners } from './event-handler.js';
import * as ScreenManager from './screens-manager.js';
import * as MediaManager from './media-manager.js';
import * as SchedulerManager from './scheduler-manager.js';
import * as SettingsManager from './settings-manager.js';
import * as PlaylistManager from './playlist-manager.js';

const adminApp = initializeApp(firebaseConfig, "ADMIN");

initializeAppCheck(adminApp, {
    provider: new ReCaptchaV3Provider('PASTE_YOUR_RECAPTCHA_V3_SITE_KEY_HERE'),
    isTokenAutoRefreshEnabled: true
});

const auth = getAuth(adminApp);
const db = getFirestore(adminApp);
const storage = getStorage(adminApp);
const rtdb = getDatabase(adminApp);
const functions = getFunctions(adminApp);

if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

const appState = {
    auth: auth,
    db: db,
    storage: storage,
    rtdb: rtdb,
    functions: functions,
    currentUser: null,
    userSettings: {},
    allScreens: [],
    screenStatuses: {},
    allMedia: [],
    allPlaylists: [],
    allSchedules: [],
    currentSchedulerView: 'day',
    selectedDate: new Date(),
    selectedScreenId: null,

    calculateCurrentScreenStates() {
        const now = new Date();
        return this.allScreens.map(screen => {
            const activeSchedule = this.allSchedules.find(schedule =>
                schedule.screenIds.includes(screen.id) &&
                schedule.startTime.toDate() <= now &&
                schedule.endTime.toDate() > now
            );

            let contentToShow = null;
            if (activeSchedule) {
                contentToShow = activeSchedule.content;
            } else if (screen.defaultContent) {
                contentToShow = screen.defaultContent;
            } else if (this.userSettings.globalDefaultContent) {
                contentToShow = this.userSettings.globalDefaultContent;
            }

            let url = null;
            if (contentToShow) {
                if (contentToShow.type === 'image') {
                    url = contentToShow.data.url;
                } else if (contentToShow.type === 'playlist') {
                    const playlist = this.allPlaylists.find(p => p.id === contentToShow.data.id);
                    url = playlist?.items?.[0]?.media?.url || 'https://via.placeholder.com/400x200/1E1E1E/9CA3AF?text=Playlist';
                }
            }
            
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
            const desktopEndDateString = endOfWeek.toLocaleDateString(undefined, desktopOptions);
            dateDisplay.innerHTML = `<span class="date-desktop">${startOfWeek.toLocaleDateString(undefined, desktopOptions)} - ${desktopEndDateString}</span><span class="date-mobile">${startOfWeek.toLocaleDateString(undefined, mobileOptions)} - ${endOfWeek.toLocaleDateString(undefined, mobileOptions)}</span>`;
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

function initApp(user) {
    appState.currentUser = user;
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl) {
        userInfoEl.innerHTML = `<img src="${user.photoURL}" alt="User Photo"><span class="name">${user.displayName}</span>`;
    }
    
    initializeEventListeners(appState);

    const reRenderDashboard = () => {
        if (document.querySelector('#page-dashboard.active')) {
            UI.renderDashboard(appState.calculateCurrentScreenStates(), appState.allMedia, appState.allSchedules);
            appState.handleImageLoading();
        }
    };
    
    const connectionsRef = ref(rtdb, `/connections/${user.uid}`);
    onValue(connectionsRef, (snapshot) => {
        appState.screenStatuses = snapshot.val() || {};
        let needsUIRefresh = false;
        appState.allScreens.forEach(screen => {
            const connectionInfo = appState.screenStatuses[screen.id];
            // A screen is online if its connection list exists and has at least one entry.
            const newStatus = (connectionInfo && Object.keys(connectionInfo).length > 0) ? 'online' : 'offline';
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

    SettingsManager.listenForSettingsChanges(user.uid, db, settings => {
        appState.userSettings = settings;
        if (document.querySelector('#page-media.active')) {
            UI.updateGlobalDefaultIndicator(settings.globalDefaultContent);
        }
        reRenderDashboard();
    });

    ScreenManager.listenForScreenChanges(user.uid, db, newScreenData => {
        appState.allScreens = newScreenData.map(newScreen => ({
            id: newScreen.id,
            name: newScreen.name,
            defaultContent: newScreen.defaultContent,
            status: (() => {
                const connectionInfo = appState.screenStatuses[newScreen.id];
                return (connectionInfo && Object.keys(connectionInfo).length > 0) ? 'online' : 'offline';
            })()
        }));
        
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

    MediaManager.listenForMediaChanges(user.uid, db, (snapshot) => {
        appState.allMedia = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.querySelector('#page-media.active')) {
            UI.renderMedia(appState.allMedia, appState.userSettings.globalDefaultContent);
            appState.handleImageLoading();
        }
        reRenderDashboard(); 
    });
    
    PlaylistManager.listenForPlaylistsChanges(user.uid, db, (snapshot) => {
        appState.allPlaylists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.querySelector('#page-media.active')) {
            UI.renderPlaylists(appState.allPlaylists, appState.userSettings.globalDefaultContent);
        }
        reRenderDashboard();
    });

    SchedulerManager.listenForScheduleChanges(user.uid, db, schedules => {
        appState.allSchedules = schedules;
        reRenderDashboard();
        if (document.querySelector('#page-scheduler.active')) appState.renderCurrentSchedulerView();
    });

    navigateTo('dashboard', appState);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            window.location.replace('/dashboard');
        } else {
            initApp(user);
        }
    } else {
        if (window.location.pathname.includes('/dashboard')) {
             window.location.replace('/');
        }
    }
});
// js/view.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithCustomToken, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, getDoc, collection, where, query } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getDatabase, ref, onValue, set, remove, serverTimestamp, onDisconnect, push } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-functions.js";

if (typeof firebaseConfig === 'undefined') { throw new Error("Firebase SDK or firebaseConfig is not loaded."); }

const screenApp = initializeApp(firebaseConfig, "SCREEN");
const auth = getAuth(screenApp);
const db = getFirestore(screenApp);
const rtdb = getDatabase(screenApp);
const functions = getFunctions(screenApp);

const DOMElements = {
    errorContainer: document.getElementById('error-container'),
    pairingContainer: document.getElementById('pairing-container'),
    pairingBox: document.querySelector('.pairing-box'),
    pinDisplay: document.getElementById('pairing-pin-display'),
    pairingStatusText: document.querySelector('.status-text'),
    logoutModal: document.getElementById('logout-confirm-modal'),
    confirmLogoutBtn: document.getElementById('confirm-logout-btn'),
    cancelLogoutBtn: document.getElementById('cancel-logout-btn'),
    generateNewCodeBtn: document.getElementById('generate-new-code-btn'),
    imageSlots: [document.getElementById('image-slot-a'), document.getElementById('image-slot-b')]
};

let state = {
    screenId: null,
    adminUid: null,
    schedules: [],
    screenDefaultContent: null,
    globalDefaultContent: null,
    unsubscribeListeners: [],
    playlistUnsubscribe: null,
    pairingAttemptCount: 0,
    pinExpirationTimer: null,
    logoutPressTimer: null,
    contentTimer: null,
    playlistTimer: null,
    currentPlaylist: null,
    currentPlaylistIndex: 0,
    visibleImageSlot: 0,
    connectionRef: null, // Stores the unique reference for this specific connection
    contentSessionId: 0
};

const MAX_AUTO_ATTEMPTS = 2;

function showError(message = "An Error Occurred") {
    console.error("Showing Error:", message);
    DOMElements.errorContainer.querySelector('h1').textContent = message;
    DOMElements.pairingContainer.classList.add('hidden');
    DOMElements.logoutModal.classList.remove('visible');
    DOMElements.errorContainer.classList.add('visible');
}

function cleanupListeners() {
    state.unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    state.unsubscribeListeners = [];
    if (state.pinExpirationTimer) clearTimeout(state.pinExpirationTimer);
    if (state.contentTimer) clearTimeout(state.contentTimer);
    stopPlaylist();
    if (state.connectionRef) {
        remove(state.connectionRef); // Cleanly remove presence on major state changes
        state.connectionRef = null;
    }
}

function displayContent(content) {
    const url = content?.data?.url || null;
    const visibleSlot = DOMElements.imageSlots[state.visibleImageSlot];
    const hiddenSlot = DOMElements.imageSlots[1 - state.visibleImageSlot];

    for (let i = 0; i < DOMElements.imageSlots.length; i++) {
        if (DOMElements.imageSlots[i].src === url && url !== null) {
            if (i !== state.visibleImageSlot) {
                DOMElements.imageSlots[state.visibleImageSlot].classList.remove('visible');
                DOMElements.imageSlots[i].classList.add('visible');
                state.visibleImageSlot = i;
            }
            return;
        }
    }

    if (!url) {
        visibleSlot.classList.remove('visible');
        return;
    }

    hiddenSlot.src = url;
    hiddenSlot.onload = () => {
        visibleSlot.classList.remove('visible');
        hiddenSlot.classList.add('visible');
        state.visibleImageSlot = 1 - state.visibleImageSlot;
        hiddenSlot.onload = null;
    };
    hiddenSlot.onerror = () => {
        console.error(`[Display] Failed to load image: ${url}`);
        hiddenSlot.onload = null;
        hiddenSlot.onerror = null;
    };
}

function stopPlaylist() {
    if (state.playlistTimer) clearTimeout(state.playlistTimer);
    state.playlistTimer = null;
    state.currentPlaylist = null;
    state.currentPlaylistIndex = 0;
    if (state.playlistUnsubscribe) {
        state.playlistUnsubscribe();
        state.playlistUnsubscribe = null;
    }
}

function playNextInPlaylist(sessionId) {
    if (sessionId !== state.contentSessionId) return;
    if (!state.currentPlaylist || state.currentPlaylist.items.length === 0) {
        stopPlaylist();
        displayContent(null);
        return;
    }
    if (state.currentPlaylistIndex >= state.currentPlaylist.items.length) {
        state.currentPlaylistIndex = 0;
    }

    const currentItem = state.currentPlaylist.items[state.currentPlaylistIndex];
    const duration = (currentItem.duration || 10) * 1000;

    displayContent({ type: 'image', data: currentItem.media });

    state.currentPlaylistIndex++;
    state.playlistTimer = setTimeout(() => playNextInPlaylist(sessionId), duration);
}

function startPlaylist(playlistId, sessionId) {
    stopPlaylist();
    const playlistRef = doc(db, 'playlists', playlistId);

    state.playlistUnsubscribe = onSnapshot(playlistRef, (docSnap) => {
        if (sessionId !== state.contentSessionId) {
            stopPlaylist();
            return;
        }

        if (state.playlistTimer) clearTimeout(state.playlistTimer);

        if (docSnap.exists()) {
            state.currentPlaylist = docSnap.data();
            if (state.currentPlaylistIndex >= state.currentPlaylist.items.length) {
                state.currentPlaylistIndex = 0;
            }
            playNextInPlaylist(sessionId);
        } else {
            stopPlaylist();
            evaluateAndDisplay();
        }
    }, (error) => {
        console.error("Error listening to playlist:", error);
        stopPlaylist();
    });
}

function evaluateAndDisplay() {
    state.contentSessionId++;
    const currentSessionId = state.contentSessionId;
    if (state.contentTimer) clearTimeout(state.contentTimer);
    stopPlaylist();

    const now = new Date();
    let contentToShow = null;
    let nextChangeTime = null;

    const activeSchedule = state.schedules.find(s => s.startTime.toDate() <= now && s.endTime.toDate() > now);

    if (activeSchedule) {
        contentToShow = activeSchedule.content;
        nextChangeTime = activeSchedule.endTime.toDate();
    } else {
        contentToShow = state.screenDefaultContent || state.globalDefaultContent || null;
        const upcomingSchedules = state.schedules.filter(s => s.startTime.toDate() > now);
        if (upcomingSchedules.length > 0) {
            nextChangeTime = new Date(Math.min(...upcomingSchedules.map(s => s.startTime.toDate())));
        }
    }
    
    if (contentToShow) {
        if (contentToShow.type === 'playlist') {
            startPlaylist(contentToShow.data.id, currentSessionId);
        } else {
            displayContent(contentToShow);
        }
    } else {
        displayContent(null);
    }
    
    if (nextChangeTime) {
        const delay = nextChangeTime.getTime() - now.getTime();
        if (delay > 0) {
            state.contentTimer = setTimeout(evaluateAndDisplay, delay + 500);
        }
    }
}

function initializeAuthenticatedScreen(screenId) {
    cleanupListeners();
    state.pairingAttemptCount = 0;
    state.screenId = screenId;
    DOMElements.pairingContainer.classList.add('hidden');
    DOMElements.errorContainer.classList.remove('visible');

    const onDataUpdate = () => evaluateAndDisplay();

    const screenUnsub = onSnapshot(doc(db, 'screens', screenId), (docSnap) => {
        if (docSnap.exists()) {
            const screenData = docSnap.data();
            if (!state.adminUid) {
                state.adminUid = screenData.adminUid;
                listenForSettings(state.adminUid, onDataUpdate);
                setupPresence(state.adminUid, state.screenId);
            }
            state.screenDefaultContent = screenData.defaultContent || null;
            onDataUpdate();
        } else {
            showError("This screen has been deleted.");
            signOut(auth);
        }
    });

    const scheduleQuery = query(collection(db, 'schedules'), where('screenIds', 'array-contains', screenId));
    const scheduleUnsub = onSnapshot(scheduleQuery, (snapshot) => {
        state.schedules = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        onDataUpdate();
    });

    state.unsubscribeListeners.push(screenUnsub, scheduleUnsub);
}

function listenForSettings(userId, callback) {
    const settingsUnsub = onSnapshot(doc(db, `users/${userId}/settings`, 'main'), (docSnap) => {
        state.globalDefaultContent = docSnap.exists() ? (docSnap.data().globalDefaultContent || null) : null;
        callback();
    });
    state.unsubscribeListeners.push(settingsUnsub);
}

async function startPairingProcess() {
    cleanupListeners();
    Object.assign(state, { screenId: null, adminUid: null, contentSessionId: 0 });
    DOMElements.errorContainer.classList.remove('visible');
    DOMElements.pairingContainer.classList.remove('hidden');
    state.pairingAttemptCount++;

    if (state.pairingAttemptCount > MAX_AUTO_ATTEMPTS) {
        DOMElements.pairingBox.classList.add('stale-session-active');
        return;
    }
    DOMElements.pairingBox.classList.remove('stale-session-active');
    DOMElements.pairingStatusText.textContent = "Requesting pairing code...";

    try {
        const result = await httpsCallable(functions, 'generatePairingCode')();
        const { pin, pairingSessionId } = result.data;
        DOMElements.pinDisplay.textContent = `${pin.slice(0, 3)} ${pin.slice(3, 6)}`;
        DOMElements.pairingStatusText.textContent = "Waiting for admin to confirm...";
        state.pinExpirationTimer = setTimeout(() => { startPairingProcess(); }, 5 * 60 * 1000);

        const unsub = onSnapshot(doc(db, 'pairingRequests', pairingSessionId), async (docSnap) => {
            if (docSnap.exists() && docSnap.data().status === 'completed') {
                DOMElements.pairingStatusText.textContent = "Pairing complete. Authenticating...";
                unsub();
                if(state.pinExpirationTimer) clearTimeout(state.pinExpirationTimer);
                await signInWithCustomToken(auth, docSnap.data().customToken);
            }
        });
        state.unsubscribeListeners.push(unsub);
    } catch (error) {
        showError("Could not start pairing process. Refresh.");
    }
}

function setupPresence(userId, screenId) {
    const connectionsListRef = ref(rtdb, `/connections/${userId}/${screenId}`);

    onValue(ref(rtdb, '.info/connected'), (snap) => {
        if (snap.val() !== true) {
            // If we lose connection, the onDisconnect hook will handle cleanup.
            // If there's a current connectionRef, we assume it's now stale.
            if (state.connectionRef) {
                remove(state.connectionRef);
                state.connectionRef = null;
            }
            return;
        }

        // We are connected. Create a new, unique connection entry.
        state.connectionRef = push(connectionsListRef);

        // When this specific connection is severed, remove only its own entry.
        onDisconnect(state.connectionRef).remove();

        // Set the connection entry to true to mark our presence.
        set(state.connectionRef, true);
        console.log(`[Presence] Established connection with ID: ${state.connectionRef.key}`);
    });
}

function handleLogoutPressStart() {
    if (auth.currentUser) {
        state.logoutPressTimer = setTimeout(() => DOMElements.logoutModal.classList.add('visible'), 2000);
    }
}
function handleLogoutPressEnd() { clearTimeout(state.logoutPressTimer); }

function init() {
    setPersistence(auth, browserLocalPersistence)
        .then(() => onAuthStateChanged(auth, (user) => user ? initializeAuthenticatedScreen(user.uid) : startPairingProcess()))
        .catch((error) => { showError("Could not enable persistence."); });
    
    document.body.addEventListener('pointerdown', handleLogoutPressStart);
    document.body.addEventListener('pointerup', handleLogoutPressEnd);
    document.body.addEventListener('pointerleave', handleLogoutPressEnd);

    DOMElements.cancelLogoutBtn.addEventListener('click', () => DOMElements.logoutModal.classList.remove('visible'));
    DOMElements.confirmLogoutBtn.addEventListener('click', async () => {
        DOMElements.logoutModal.classList.remove('visible');
        if (state.connectionRef) {
            await remove(state.connectionRef);
            state.connectionRef = null;
        }
        signOut(auth);
    });
    DOMElements.generateNewCodeBtn.addEventListener('click', () => {
        state.pairingAttemptCount = 0;
        startPairingProcess();
    });
}

init();
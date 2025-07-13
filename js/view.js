// js/view.js

if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
    throw new Error("Firebase SDK or firebaseConfig is not loaded.");
}
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database();

// --- DOM ELEMENTS ---
const imageContainer = document.getElementById('image-container');
const errorContainer = document.getElementById('error-container');

// --- STATE ---
let currentImageURL = null;
let schedules = [];
let screenDefaultImage = null;
let globalDefaultImage = null;
let nextTimer = null; // To hold the handle for setTimeout

// --- CORE LOGIC ---
function showError(message = "Screen Not Found") {
    errorContainer.querySelector('h1').textContent = message;
    errorContainer.classList.remove('hidden');
}

function displayImage(newURL) {
    if (newURL === currentImageURL) return; // No change needed
    currentImageURL = newURL;

    const oldImages = imageContainer.querySelectorAll('img:not(.preloading)');
    oldImages.forEach(img => img.classList.remove('active'));

    if (!newURL) { // If there's no image to show, clear the screen
        setTimeout(() => oldImages.forEach(img => img.remove()), 1000);
        return;
    }

    const newImg = document.createElement('img');
    newImg.className = 'preloading';
    newImg.onload = () => {
        imageContainer.appendChild(newImg);
        setTimeout(() => {
            newImg.classList.remove('preloading');
            newImg.classList.add('active');
            setTimeout(() => oldImages.forEach(img => img.remove()), 1000);
        }, 20); // Small delay to ensure styles are applied for transition
    };
    newImg.onerror = () => newImg.remove();
    newImg.src = newURL;
}

/**
 * This is the main "brain" of the view page. It runs whenever data changes
 * or a timer fires. It determines what to show and sets the next timer.
 */
function updateDisplay() {
    // 1. Clear any pending timer
    if (nextTimer) clearTimeout(nextTimer);

    // 2. Determine what image should be displayed right now
    const now = new Date();
    let urlToShow = null;

    const activeSchedule = schedules.find(s => 
        s.startTime.toDate() <= now && s.endTime.toDate() > now
    );

    if (activeSchedule) {
        urlToShow = activeSchedule.media.url;
    } else if (screenDefaultImage && screenDefaultImage.url) {
        urlToShow = screenDefaultImage.url;
    } else if (globalDefaultImage && globalDefaultImage.url) {
        urlToShow = globalDefaultImage.url;
    }

    displayImage(urlToShow);

    // 3. Find the next time a change needs to happen
    const boundaries = [];
    schedules.forEach(s => {
        if (s.startTime.toDate() > now) boundaries.push(s.startTime.toDate());
        if (s.endTime.toDate() > now) boundaries.push(s.endTime.toDate());
    });

    if (boundaries.length > 0) {
        // Find the soonest future boundary
        const nextChangeTime = new Date(Math.min(...boundaries));
        const delay = nextChangeTime.getTime() - now.getTime();
        
        // Set a timer to re-run this function at the exact moment of the next change.
        // Add a small buffer (500ms) to ensure the change has occurred.
        if (delay > 0) {
            nextTimer = setTimeout(updateDisplay, delay + 500);
        }
    }
    // If no future boundaries, no timer is set. The display will only update
    // if a new schedule is added via the listener.
}


// --- DATA LISTENERS ---
function listenForSchedules(userId, screenId) {
    db.collection('users').doc(userId).collection('schedule')
      .where('screenIds', 'array-contains', screenId)
      .onSnapshot(snapshot => {
          schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          updateDisplay();
      }, err => {
          console.error("Error fetching schedule:", err);
          showError("Could not load schedule.");
      });
}

function listenForScreen(userId, screenId) {
    db.collection('users').doc(userId).collection('screens').doc(screenId)
      .onSnapshot(doc => {
          if (doc.exists) {
              screenDefaultImage = doc.data().defaultImage || null;
              updateDisplay();
          } else {
              showError("This screen has been deleted.");
          }
      }, err => {
          console.error("Error fetching screen data:", err);
          showError("Could not load screen data.");
      });
}

function listenForSettings(userId) {
    db.collection('users').doc(userId).collection('settings').doc('main')
      .onSnapshot(doc => {
          if (doc.exists) {
              globalDefaultImage = doc.data().globalDefaultImage || null;
              updateDisplay();
          }
      }, err => {
          console.error("Error fetching settings:", err);
          // Don't show an error, as settings are optional.
      });
}


// --- PRESENCE LOGIC ---
function setupPresence(userId, screenId) {
    const statusRef = rtdb.ref(`/connections/${userId}/${screenId}`);
    
    rtdb.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
            statusRef.onDisconnect().set({ status: 'offline', lastSeen: firebase.database.ServerValue.TIMESTAMP });
            statusRef.set({ status: 'online', lastSeen: firebase.database.ServerValue.TIMESTAMP });
        }
    });
}

// --- INITIALIZATION ---
function init() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user');
    const screenId = params.get('screen');

    if (!userId || !screenId) {
        showError("Invalid user or screen ID in URL.");
        return;
    }

    setupPresence(userId, screenId);
    listenForSchedules(userId, screenId);
    listenForScreen(userId, screenId);
    listenForSettings(userId);
}

init();
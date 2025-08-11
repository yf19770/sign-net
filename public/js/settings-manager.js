// js/settings-manager.js

import { doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast } from './ui.js';

function getSettingsDoc(db, userId) {
    return doc(db, 'users', userId, 'settings', 'main');
}

export function listenForSettingsChanges(userId, db, callback) {
    onSnapshot(getSettingsDoc(db, userId), doc => {
        if (doc.exists()) {
            callback(doc.data());
        } else {
            callback({}); 
        }
    }, error => {
        console.error("Error fetching settings: ", error);
        showToast("Could not load user settings.", "error");
    });
}

export async function setGlobalDefaultContent(userId, db, content) {
    try {
        await setDoc(getSettingsDoc(db, userId), {
            globalDefaultContent: content || null
        }, { merge: true });
        
        if (content) {
            showToast(`'${content.data.name}' is now the global fallback.`);
        } else {
            showToast('Global fallback content cleared.');
        }
        return true;
    } catch (error) {
        console.error("Error setting global fallback: ", error);
        showToast("Failed to update global fallback.", "error");
        return false;
    }
}
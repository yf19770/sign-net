// js/settings-manager.js

import { db } from './firebase.js';
import { showToast } from './ui.js';

const getSettingsDoc = (userId) => db.collection('users').doc(userId).collection('settings').doc('main');

/**
 * Listens for changes to the user's main settings document.
 * @param {string} userId The current user's ID.
 * @param {function} callback Function to call with the settings data.
 */
export function listenForSettingsChanges(userId, callback) {
    getSettingsDoc(userId).onSnapshot(doc => {
        if (doc.exists) {
            callback(doc.data());
        } else {
            // If no settings exist, callback with an empty object
            callback({}); 
        }
    }, error => {
        console.error("Error fetching settings: ", error);
        showToast("Could not load user settings.", "error");
    });
}

/**
 * Sets or unsets the global default image for the user.
 * @param {string} userId The current user's ID.
 * @param {object | null} mediaItem The media item object {name, url} to set, or null to unset.
 */
export async function setGlobalDefaultImage(userId, mediaItem) {
    try {
        await getSettingsDoc(userId).set({
            globalDefaultImage: mediaItem || null
        }, { merge: true }); // Use merge to not overwrite other future settings
        
        if (mediaItem) {
            showToast(`'${mediaItem.name}' is now the global fallback.`);
        } else {
            showToast('Global fallback image cleared.');
        }
        return true;
    } catch (error) {
        console.error("Error setting global fallback: ", error);
        showToast("Failed to update global fallback.", "error");
        return false;
    }
}
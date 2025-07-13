// js/screens-manager.js

import { db } from './firebase.js';
import { showToast } from './ui.js';

const getScreensCollection = (userId) => db.collection('users').doc(userId).collection('screens');

export function listenForScreenChanges(userId, callback) {
    getScreensCollection(userId).orderBy("name").onSnapshot(snapshot => {
        const screens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(screens);
    }, error => {
        console.error("Error fetching screens: ", error);
        showToast("Error connecting to database.", "error");
    });
}

export async function addScreen(userId, id, name, defaultImage = null) {
    try {
        await getScreensCollection(userId).doc(id).set({ 
            name: name, 
            status: 'offline', 
            lastSeen: null, 
            defaultImage: defaultImage
            // REMOVED: currentImageURL is no longer managed by the admin app
        });
        showToast('Screen added successfully!');
        return true;
    } catch (error) {
        console.error("Error adding screen: ", error);
        showToast('Error adding screen.', 'error');
        return false;
    }
}

export async function updateScreen(userId, id, newName, defaultImage = null) {
    try {
        await getScreensCollection(userId).doc(id).update({ 
            name: newName,
            defaultImage: defaultImage
        });
        showToast('Screen updated successfully!');
        return true;
    } catch (error) {
        console.error("Error updating screen: ", error);
        showToast('Error updating screen.', 'error');
        return false;
    }
}

export async function deleteScreen(userId, id) {
    try {
        // TODO: Add logic to also delete associated schedule items.
        await getScreensCollection(userId).doc(id).delete();
        showToast('Screen deleted successfully.');
        return true;
    } catch (error) {
        console.error("Error deleting screen: ", error);
        showToast('Error deleting screen.', 'error');
        return false;
    }
}
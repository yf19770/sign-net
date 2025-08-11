// js/screens-manager.js

import { collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast } from './ui.js';

export function listenForScreenChanges(userId, db, callback) {
    const screensCollection = collection(db, 'screens');
    const q = query(screensCollection, where("adminUid", "==", userId), orderBy("name"));
    onSnapshot(q, snapshot => {
        const screens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(screens);
    }, error => {
        console.error("Error fetching screens: ", error);
        showToast("Error connecting to database.", "error");
    });
}

export async function addScreen(db, userId, name, defaultContent = null) {
    const screensCollection = collection(db, 'screens');
    try {
        await addDoc(screensCollection, {
            name: name,
            defaultContent: defaultContent,
            adminUid: userId
        });
        showToast('Screen created successfully!');
        return true;
    } catch (error) {
        console.error("Error creating screen: ", error);
        showToast('Error creating screen.', 'error');
        return false;
    }
}

export async function updateScreen(db, id, newName, defaultContent = null) {
    try {
        const screenRef = doc(db, 'screens', id);
        // This will overwrite the document with the new structure,
        // effectively removing the old `defaultImage` field if it exists.
        await updateDoc(screenRef, { 
            name: newName,
            defaultContent: defaultContent
        });
        showToast('Screen updated successfully!');
        return true;
    } catch (error) {
        console.error("Error updating screen: ", error);
        showToast('Error updating screen.', 'error');
        return false;
    }
}

export async function deleteScreen(db, id) {
    try {
        const screenRef = doc(db, 'screens', id);
        await deleteDoc(screenRef);
        showToast('Screen deleted successfully.');
        return true;
    } catch (error) {
        console.error("Error deleting screen: ", error);
        showToast('Error deleting screen.', 'error');
        return false;
    }
}
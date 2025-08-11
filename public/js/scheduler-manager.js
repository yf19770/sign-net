// public/js/scheduler-manager.js

import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast } from './ui.js';

export function listenForScheduleChanges(userId, db, callback) {
    const scheduleCollection = collection(db, 'schedules'); // Define it here
    const q = query(scheduleCollection, where("adminUid", "==", userId), orderBy("startTime"));
    onSnapshot(q, snapshot => {
        const scheduleItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(scheduleItems);
    }, error => {
        console.error("Error fetching schedule: ", error);
        showToast("Error connecting to schedule.", "error");
    });
}

export async function addScheduleItem(db, userId, itemData) {
    const scheduleCollection = collection(db, 'schedules'); // Define it here
    try {
        await addDoc(scheduleCollection, {
            ...itemData,
            createdAt: serverTimestamp(),
            adminUid: userId
        });
        showToast('Schedule item created successfully!');
        return true;
    } catch (error) {
        console.error("Error adding schedule item: ", error);
        showToast("Failed to create schedule item.", "error");
        return false;
    }
}

export async function updateScheduleItem(db, id, itemData) {
    try {
        const scheduleRef = doc(db, 'schedules', id);
        await updateDoc(scheduleRef, itemData);
        showToast('Schedule item updated successfully!');
        return true;
    } catch (error) {
        console.error("Error updating schedule item: ", error);
        showToast("Failed to update schedule item.", "error");
        return false;
    }
}

export async function deleteScheduleItem(db, id) {
    try {
        const scheduleRef = doc(db, 'schedules', id);
        await deleteDoc(scheduleRef);
        showToast('Schedule item deleted.');
        return true;
    } catch (error) {
        console.error("Error deleting schedule item: ", error);
        showToast("Failed to delete schedule item.", "error");
        return false;
    }
}
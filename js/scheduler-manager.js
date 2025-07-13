// public/js/scheduler-manager.js

import { db } from './firebase.js';
import { showToast } from './ui.js';

const getScheduleCollection = (userId) => db.collection('users').doc(userId).collection('schedule');

export function listenForScheduleChanges(userId, callback) {
    getScheduleCollection(userId).orderBy("startTime").onSnapshot(snapshot => {
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

export async function addScheduleItem(userId, itemData) {
    try {
        await getScheduleCollection(userId).add({
            ...itemData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Schedule item created successfully!');
        return true;
    } catch (error) {
        console.error("Error adding schedule item: ", error);
        showToast("Failed to create schedule item.", "error");
        return false;
    }
}

export async function updateScheduleItem(userId, id, itemData) {
    try {
        await getScheduleCollection(userId).doc(id).update(itemData);
        showToast('Schedule item updated successfully!');
        return true;
    } catch (error) {
        console.error("Error updating schedule item: ", error);
        showToast("Failed to update schedule item.", "error");
        return false;
    }
}

export async function deleteScheduleItem(userId, id) {
    try {
        await getScheduleCollection(userId).doc(id).delete();
        showToast('Schedule item deleted.');
        return true;
    } catch (error) {
        console.error("Error deleting schedule item: ", error);
        showToast("Failed to delete schedule item.", "error");
        return false;
    }
}
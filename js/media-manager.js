// js/media-manager.js

import { db, storage } from './firebase.js';
import { showToast } from './ui.js';

const getMediaCollection = (userId) => db.collection('users').doc(userId).collection('media');

/**
 * Listens for granular changes to the media collection.
 * The callback will receive the entire snapshot object.
 */
export function listenForMediaChanges(userId, callback) {
    getMediaCollection(userId).orderBy("uploadedAt", "desc").onSnapshot(callback, error => {
        console.error("Error fetching media: ", error);
        showToast("Error connecting to media library.", "error");
    });
}

export function handleFileUpload(userId, files) {
    const progressBarContainer = document.querySelector('.progress-bar-container');
    const progressBar = document.querySelector('.progress-bar');
    if (!progressBarContainer || !progressBar) return;

    progressBarContainer.style.display = 'block';
    const file = files[0];
    if (!file) { progressBarContainer.style.display = 'none'; return; }

    const storagePath = `media/${userId}/${Date.now()}-${file.name}`;
    const storageRef = storage.ref(storagePath);
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = progress + '%';
        },
        (error) => {
            console.error("Upload failed: ", error);
            showToast("Upload failed.", "error");
            progressBarContainer.style.display = 'none';
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                getMediaCollection(userId).add({
                    name: file.name,
                    url: downloadURL,
                    storagePath: storagePath,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    showToast("Image uploaded successfully!");
                    progressBarContainer.style.display = 'none';
                    progressBar.style.width = '0%';
                });
            });
        }
    );
}

export async function deleteMediaItem(userId, id, storagePath) {
    if (!id || !storagePath) { showToast("Could not delete item.", "error"); return; }
    try {
        await storage.ref(storagePath).delete();
        await getMediaCollection(userId).doc(id).delete();
        showToast("Media item deleted successfully.");
    } catch (error) {
        console.error("Error deleting media item: ", error);
        showToast("Failed to delete media item.", "error");
    }
}

export async function updateMediaName(userId, mediaId, newName) {
    if (!mediaId || !newName) {
        showToast("Invalid data for update.", "error");
        return false;
    }
    try {
        await getMediaCollection(userId).doc(mediaId).update({ name: newName });
        showToast("Filename updated!");
        return true;
    } catch (error) {
        console.error("Error updating media name: ", error);
        showToast("Failed to update name.", "error");
        return false;
    }
}
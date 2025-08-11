// js/media-manager.js

import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";
import { showToast } from './ui.js';

export function listenForMediaChanges(userId, db, callback) {
    const mediaCollection = collection(db, 'media');
    const q = query(mediaCollection, where("adminUid", "==", userId), orderBy("uploadedAt", "desc"));
    onSnapshot(q, callback, error => {
        console.error("Error fetching media: ", error);
        showToast("Error connecting to media library.", "error");
    });
}


// A simple queue to manage uploads one by one
const uploadQueue = [];
let isCurrentlyUploading = false;
let totalFilesInBatch = 0; // To track total progress

async function processQueue(storage, db, userId) {
    if (isCurrentlyUploading || uploadQueue.length === 0) {
        return;
    }
    isCurrentlyUploading = true;

    const file = uploadQueue.shift(); // Get the next file from the queue
    const dropArea = document.querySelector('.media-upload-area');
    const uploadText = dropArea?.querySelector('h3');
    const progressBar = dropArea?.querySelector('.progress-bar');
    
    // Calculate how many files have been completed so far
    const filesCompleted = totalFilesInBatch - uploadQueue.length - 1;

    if (uploadText) {
        uploadText.textContent = `Uploading ${filesCompleted + 1} of ${totalFilesInBatch}...`;
    }

    try {
        await uploadSingleFile(storage, db, userId, file);
        
        const overallProgress = ((filesCompleted + 1) / totalFilesInBatch) * 100;
        if (progressBar) progressBar.style.width = overallProgress + '%';

    } catch (error) {
        console.error("Upload failed for file:", file.name, error);
        showToast(`Upload failed for ${file.name}.`, 'error');
        // In case of error, we still count it as "processed" for progress
        const overallProgress = ((filesCompleted + 1) / totalFilesInBatch) * 100;
        if (progressBar) progressBar.style.width = overallProgress + '%';
    }

    isCurrentlyUploading = false;
    
    if (uploadQueue.length > 0) {
        processQueue(storage, db, userId); // Process next file
    } else {
        // All uploads finished
        setTimeout(() => {
            if (dropArea) {
                dropArea.classList.remove('is-uploading');
                if (uploadText) uploadText.textContent = 'Drag & Drop or Click to Upload';
                if (progressBar) progressBar.style.width = '0%';
            }
            showToast('All files uploaded successfully!');
        }, 500); // Small delay to show 100% completion
    }
}

// The onProgress callback is no longer needed for the overall progress bar
function uploadSingleFile(storage, db, userId, file) {
    return new Promise((resolve, reject) => {
        const mediaCollection = collection(db, 'media');
        const storagePath = `media/${userId}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            null, // We don't need the progress snapshot anymore
            (error) => {
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await addDoc(mediaCollection, {
                        name: file.name,
                        url: downloadURL,
                        storagePath: storagePath,
                        uploadedAt: serverTimestamp(),
                        adminUid: userId
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

export function handleFileUpload(storage, db, userId, files) {
    const dropArea = document.querySelector('.media-upload-area');
    if (!dropArea || dropArea.classList.contains('is-uploading')) {
        showToast('Please wait for the current uploads to finish.', 'error');
        return;
    }
    
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
        showToast('No valid image files selected.', 'error');
        return;
    }
    
    // Reset and populate the queue
    uploadQueue.length = 0;
    uploadQueue.push(...validFiles);
    totalFilesInBatch = validFiles.length;
    
    dropArea.classList.add('is-uploading');
    
    // Start processing the queue
    if (!isCurrentlyUploading) {
        processQueue(storage, db, userId);
    }
}

export async function deleteMediaItem(storage, db, id, storagePath) {
    if (!id || !storagePath) { showToast("Could not delete item.", "error"); return; }
    try {
        await deleteObject(ref(storage, storagePath));
        await deleteDoc(doc(db, 'media', id));
        showToast("Media item deleted successfully.");
    } catch (error) {
        console.error("Error deleting media item: ", error);
        showToast("Failed to delete media item.", "error");
    }
}

export async function updateMediaName(db, mediaId, newName) {
    if (!mediaId || !newName) {
        showToast("Invalid data for update.", "error");
        return false;
    }
    try {
        await updateDoc(doc(db, 'media', mediaId), { name: newName });
        showToast("Filename updated!");
        return true;
    } catch (error) {
        console.error("Error updating media name: ", error);
        showToast("Failed to update name.", "error");
        return false;
    }
}
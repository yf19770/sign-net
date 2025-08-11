// public/js/playlist-manager.js

import { collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showToast } from './ui.js';

// DO NOT define the collection here. It must be defined inside the functions.

export function listenForPlaylistsChanges(userId, db, callback) {
    const playlistsCollection = collection(db, 'playlists'); // Define it here
    const q = query(playlistsCollection, where("adminUid", "==", userId), orderBy("createdAt", "desc"));
    onSnapshot(q, callback, error => {
        console.error("Error fetching playlists: ", error);
        showToast("Error connecting to playlists.", "error");
    });
}

export async function addPlaylist(db, userId, playlistData) {
    try {
        await addDoc(collection(db, 'playlists'), { // Call it directly here
            ...playlistData,
            adminUid: userId,
            createdAt: serverTimestamp()
        });
        showToast('Playlist created successfully!');
        return true;
    } catch (error) {
        console.error("Error creating playlist: ", error);
        showToast('Failed to create playlist.', 'error');
        return false;
    }
}

export async function updatePlaylist(db, playlistId, playlistData) {
    try {
        const playlistRef = doc(db, 'playlists', playlistId);
        await updateDoc(playlistRef, playlistData);
        showToast('Playlist updated successfully!');
        return true;
    } catch (error) {
        console.error("Error updating playlist: ", error);
        showToast('Failed to update playlist.', 'error');
        return false;
    }
}

export async function deletePlaylist(db, playlistId) {
    try {
        const playlistRef = doc(db, 'playlists', playlistId);
        await deleteDoc(playlistRef);
        showToast('Playlist deleted successfully.');
        return true;
    } catch (error) {
        console.error("Error deleting playlist: ", error);
        showToast('Failed to delete playlist.', 'error');
        return false;
    }
}
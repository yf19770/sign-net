// js/firebase.js

if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
    throw new Error("Firebase SDK or firebaseConfig is not loaded. Check script tags in index.html.");
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create and export the service instances
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const rtdb = firebase.database(); // Realtime Database instance
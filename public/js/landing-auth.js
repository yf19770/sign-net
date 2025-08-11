// js/landing-auth.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

if (typeof firebaseConfig === 'undefined') {
    throw new Error("firebaseConfig is not loaded. Check script tags.");
}

const adminApp = initializeApp(firebaseConfig, "ADMIN");
const auth = getAuth(adminApp);
const provider = new GoogleAuthProvider();

const loginError = document.getElementById('login-error');

onAuthStateChanged(auth, user => {
    if (user) {
        // If the user is logged in and they are NOT on a page that is part of the app...
        // This prevents redirect loops if they are already on the dashboard.
        if (!window.location.pathname.includes('/dashboard')) {
            // ...redirect them to the dashboard.
            window.location.href = '/dashboard';
        }
    }
});


// --- Function to handle the Google Login process ---
const handleLogin = () => {
    if (auth.currentUser) {
        window.location.href = '/dashboard';
        return;
    }

    if(loginError) loginError.textContent = '';

    signInWithPopup(auth, provider)
        .then((result) => {
            // The onAuthStateChanged listener above will now handle the redirect globally.
        }).catch((error) => {
            console.error("Google Sign-In Error:", error.code, error.message);
            if(loginError) loginError.textContent = "Could not sign in. Please try again.";
        });
};

// Expose handleLogin to the Global Scope for page-loader.js
window.handleLogin = handleLogin;

// Attach login handlers to buttons that are statically part of index.html
// This is for the homepage specifically. page-loader.js will handle other pages.
document.getElementById('login-btn')?.addEventListener('click', handleLogin);
document.getElementById('signup-btn')?.addEventListener('click', handleLogin);
document.getElementById('get-started-btn')?.addEventListener('click', handleLogin);
document.getElementById('final-cta-btn')?.addEventListener('click', handleLogin);
document.getElementById('footer-login-btn')?.addEventListener('click', handleLogin);
document.getElementById('footer-signup-btn')?.addEventListener('click', handleLogin);
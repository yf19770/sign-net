// js/auth.js

if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
    throw new Error("Firebase SDK or firebaseConfig is not loaded. Check script tags in login.html.");
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const googleLoginBtn = document.getElementById('google-login-btn');
const loginError = document.getElementById('login-error');

// --- EVENT LISTENERS ---

// Handle Google Login button click
googleLoginBtn.addEventListener('click', () => {
    loginError.textContent = ''; // Clear previous errors
    auth.signInWithPopup(provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            // const credential = result.credential;
            // const token = credential.accessToken;
            // const user = result.user;
            window.location.href = 'index.html'; // Redirect to dashboard on success
        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Google Sign-In Error:", errorCode, errorMessage);
            loginError.textContent = "Could not sign in. Please try again.";
        });
});


// --- AUTH STATE CHECK ---
// If the user is already logged in, redirect them to the dashboard immediately.
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in, redirect to the main app.
        // Use a small delay to avoid a "flash" if the page is just loading.
        setTimeout(() => {
            if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/') {
                window.location.href = 'index.html';
            }
        }, 100);
    }
});
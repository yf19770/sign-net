// js/page-loader.js
document.addEventListener('DOMContentLoaded', () => {
    const loadComponent = (selector, url) => {
        const element = document.querySelector(selector);
        if (element) {
            fetch(url)
                .then(response => response.ok ? response.text() : Promise.reject('Component not found'))
                .then(data => {
                    element.innerHTML = data;
                    // Re-attach event listeners for dynamically loaded content
                    if (selector === '#header-placeholder') attachHeaderListeners();
                    if (selector === '#footer-placeholder') attachFooterListeners();
                })
                .catch(error => console.error(`Error loading ${url}:`, error));
        }
    };

    const attachHeaderListeners = () => {
        // Your mobile menu toggle, login buttons, etc. from index.html's script tag
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const navLinks = document.getElementById('nav-links');
        if (menuToggleBtn && navLinks) {
            menuToggleBtn.addEventListener('click', () => navLinks.classList.toggle('active'));
        }
        // Add login/signup handlers if they exist on the page
        document.getElementById('login-btn')?.addEventListener('click', handleLogin);
        document.getElementById('signup-btn')?.addEventListener('click', handleLogin);
    };

    const attachFooterListeners = () => {
        // Attach handlers for footer login/signup buttons
        document.getElementById('footer-login-btn')?.addEventListener('click', handleLogin);
        document.getElementById('footer-signup-btn')?.addEventListener('click', handleLogin);
    };

    loadComponent('#header-placeholder', '/_header.html');
    loadComponent('#footer-placeholder', '/_footer.html');
});
// js/theme-loader.js
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    } else if (savedTheme === 'dark') {
        document.body.classList.remove('light-mode');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.classList.add('light-mode');
    }
})();
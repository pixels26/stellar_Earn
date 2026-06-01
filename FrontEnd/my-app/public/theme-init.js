(function () {
  try {
    var stored = localStorage.getItem('stellar_earn_theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : prefersDark
          ? 'dark'
          : 'light';
    var root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  } catch (e) {}
})();

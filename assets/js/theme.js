(function () {
  var STORAGE_KEY = 'blog-theme';
  var DARK = 'dark';
  var LIGHT = 'light';

  function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function getTheme() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK || stored === LIGHT) return stored;
    return getSystemPreference();
  }

  function applyTheme(theme) {
    if (theme === DARK) {
      document.documentElement.setAttribute('data-theme', DARK);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function toggleTheme() {
    var current = getTheme();
    var next = current === DARK ? LIGHT : DARK;
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    updateButton(next);
  }

  function updateButton(theme) {
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === DARK ? '☀️' : '🌙';
  }

  function init() {
    var theme = getTheme();
    applyTheme(theme);
    updateButton(theme);

    var btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!localStorage.getItem(STORAGE_KEY)) {
        var sys = getSystemPreference();
        applyTheme(sys);
        updateButton(sys);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

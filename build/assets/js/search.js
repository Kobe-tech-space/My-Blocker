(function () {
  var index = [];
  var loaded = false;

  async function loadIndex() {
    try {
      var resp = await fetch('/search-index.json');
      if (!resp.ok) return;
      index = await resp.json();
      loaded = true;
    } catch (e) {
      console.warn('Search index not available');
    }
  }

  function search(query) {
    if (!loaded || !query.trim()) return [];
    var q = query.toLowerCase().trim();
    return index.filter(function (item) {
      return item.title.toLowerCase().indexOf(q) !== -1 ||
        item.description.toLowerCase().indexOf(q) !== -1 ||
        item.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
    }).slice(0, 8);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<div class="search-result-item" style="color:var(--text-secondary)">No results</div>';
      return;
    }
    container.innerHTML = results.map(function (r) {
      return '<a href="/posts/' + r.slug + '.html" class="search-result-item">' +
        '<div class="result-title">' + escapeHtml(r.title) + '</div>' +
        '<div class="result-meta">' + escapeHtml(r.date) + ' · ' + escapeHtml(r.tags.join(', ')) + '</div>' +
        '</a>';
    }).join('');
  }

  function init() {
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    if (!input || !results) return;

    loadIndex();

    var debounceTimer;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var found = search(input.value);
        if (input.value.trim()) {
          renderResults(found, results);
          results.classList.add('active');
        } else {
          results.classList.remove('active');
        }
      }, 200);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim()) results.classList.add('active');
    });

    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.remove('active');
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        results.classList.remove('active');
        input.blur();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

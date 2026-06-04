/* Code Snippets Swag Shop custom scripts. */
(function () {
  'use strict';

  var ALPINE_SRC = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';
  var ALPINE_SELECTOR = 'script[src*="alpinejs"]';

  function markReady() {
    document.documentElement.classList.add('cs-alpine-ready');
    window.dispatchEvent(new CustomEvent('cs:alpine-ready', {
      detail: { Alpine: window.Alpine || null }
    }));
  }

  function loadAlpine() {
    if (window.Alpine) {
      markReady();
      return;
    }

    var existing = document.querySelector(ALPINE_SELECTOR);
    if (existing) {
      existing.addEventListener('load', markReady, { once: true });
      existing.addEventListener('error', function () {
        console.warn('[swag-shop] Alpine.js script tag exists but failed to load.');
      }, { once: true });
      return;
    }

    var script = document.createElement('script');
    script.src = ALPINE_SRC;
    script.defer = true;
    script.addEventListener('load', markReady, { once: true });
    script.addEventListener('error', function () {
      console.warn('[swag-shop] Failed to load Alpine.js.');
    }, { once: true });
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAlpine, { once: true });
  } else {
    loadAlpine();
  }
}());

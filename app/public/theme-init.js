// Applied before first paint so switching themes doesn't flash the
// wrong one for a frame. Explicit choice wins; otherwise follow the
// OS preference (the CSS media query below handles that case too).
//
// A plain external file, not inline in index.html: the CSP in index.html
// blocks inline scripts by design (script-src 'self', no 'unsafe-inline'),
// so this has to be loaded as a same-origin file to run at all. Kept as a
// classic (non-module) synchronous script so it still runs and blocks
// parsing before the page paints, same timing as when it was inline.
(function () {
  try {
    var stored = localStorage.getItem('zapsavr.theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', stored === 'light' ? '#f7f1e3' : '#0c1216');
    }
  } catch {}
})();

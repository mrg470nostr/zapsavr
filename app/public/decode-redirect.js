// Decode the path 404.html redirected here (see public/404.html).
//
// External file, not inline, for the same CSP reason as theme-init.js —
// see the comment there.
(function () {
  var params = new URLSearchParams(window.location.search);
  var p = params.get('p');
  if (p === null) return;
  var q = params.get('q');
  var newUrl =
    window.location.pathname.replace(/\/$/, '') + '/' + p +
    (q ? '?' + q : '') + window.location.hash;
  window.history.replaceState(null, '', newUrl);
})();

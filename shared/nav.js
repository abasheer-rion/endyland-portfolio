// Page-to-page transitions between tabs. A plain script in <head>, loaded on every page.
// The transition itself is CSS only (@view-transition in shared/base.css), so it works without JS.
// This file only adds a direction: moving right along the tab bar slides left, and the other way round.
// CSS reads it with html:active-view-transition-type(forward) and (back).
(function () {
  var order = ['/', '/web-design/', '/research/', '/startup-work/', '/projects/'];
  function idx(u) {
    try {
      var p = new URL(u, location.href).pathname.replace(/index\.html$/, '');
      if (p.slice(-1) !== '/') p += '/';
      return order.indexOf(p);
    } catch (e) { return -1; }
  }
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition || !window.navigation || !navigation.activation) return;
    var from = navigation.activation.from, to = navigation.activation.entry;
    if (!from || !to) return;
    var a = idx(from.url), b = idx(to.url);
    if (a < 0 || b < 0 || a === b) return;
    try { e.viewTransition.types.add(b > a ? 'forward' : 'back'); } catch (err) { /* older browsers */ }
  });
})();

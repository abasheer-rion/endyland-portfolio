// Page-to-page transitions between tabs. A plain script in <head>, loaded on every page.
// The transition itself is CSS (@view-transition in shared/base.css). This file does two things:
// 1. Names <main> only while a transition runs (class "vt" on <html>), so glass panels can blur the
//    3D scene the rest of the time.
// 2. Adds a direction: moving right along the tab bar slides left, and the other way round.
//    CSS reads it with html:active-view-transition-type(forward) and (back).
(function () {
  var order = ['/', '/web-design/', '/research/', '/startup-work/', '/projects/'];
  function idx(u) {
    try {
      var p = new URL(u, location.href).pathname.replace(/index\.html$/, '');
      if (p.slice(-1) !== '/') p += '/';
      return order.indexOf(p);
    } catch (e) { return -1; }
  }
  var root = document.documentElement;
  function quiet() { /* a skipped or aborted transition is fine, the page still loads */ }
  function done(vt) {
    vt.finished.then(off, off);
    if (vt.ready) vt.ready.catch(quiet);
    if (vt.updateCallbackDone) vt.updateCallbackDone.catch(quiet);
  }
  function off() { root.classList.remove('vt'); }
  // Old page: name <main> just before the browser takes its picture.
  addEventListener('pageswap', function (e) {
    if (e.viewTransition) { root.classList.add('vt'); done(e.viewTransition); }
  });
  // Coming back from the back/forward cache: drop the name the old page was left with.
  addEventListener('pageshow', function (e) { if (e.persisted) off(); });
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) { off(); return; }
    root.classList.add('vt');
    done(e.viewTransition);
    if (!window.navigation || !navigation.activation) return;
    var from = navigation.activation.from, to = navigation.activation.entry;
    if (!from || !to) return;
    var a = idx(from.url), b = idx(to.url);
    if (a < 0 || b < 0 || a === b) return;
    try { e.viewTransition.types.add(b > a ? 'forward' : 'back'); } catch (err) { /* older browsers */ }
  });
})();

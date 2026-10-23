// Page-to-page transitions. A plain script in <head>, loaded on every page.
// The transitions themselves are CSS (@view-transition in shared/base.css). This file:
// 1. Names <main> only while a tab-to-tab transition runs (class "vt" on <html>), so glass panels can
//    blur the 3D scene the rest of the time.
// 2. Adds a type the CSS reads with html:active-view-transition-type(...):
//    "forward" / "back": moving right or left along the tab bar. The page content slides.
//    "deeper" / "up": from a tab into one of its project pages, between them, or back up. The new page,
//    with its own theme, wipes in as a circle from where you clicked.
// 3. Remembers where you clicked (sessionStorage), so the circle starts there.
(function () {
  var order = ['', 'web-design', 'research', 'startup-work', 'projects', 'experience'];
  // Where a URL sits: { tab: index in order, depth: 0 for a tab page, 1 for a project page }.
  function where(u) {
    try {
      var p = new URL(u, location.href).pathname.replace(/index\.html$/, '');
      var parts = p.split('/').filter(Boolean);
      var tab = order.indexOf(parts[0] || '');
      if (tab < 0) return null;
      return { tab: tab, depth: tab === 0 ? 0 : parts.length - 1 };
    } catch (e) { return null; }
  }
  function typeFor(fromUrl, toUrl) {
    var a = where(fromUrl), b = where(toUrl);
    if (!a || !b) return '';
    if (a.tab !== b.tab) return b.tab > a.tab ? 'forward' : 'back';
    if (b.depth > a.depth) return 'deeper';
    if (b.depth < a.depth) return 'up';
    return a.depth > 0 && fromUrl !== toUrl ? 'deeper' : '';
  }
  var root = document.documentElement;
  var KEY = 'endyland-vt-point';
  function quiet() { /* a skipped or aborted transition is fine, the page still loads */ }
  function off() { root.classList.remove('vt'); }
  function done(vt) {
    vt.finished.then(off, off);
    if (vt.ready) vt.ready.catch(quiet);
    if (vt.updateCallbackDone) vt.updateCallbackDone.catch(quiet);
  }
  function wipe(t) { return t === 'deeper' || t === 'up'; }

  // Remember the click point as a share of the screen. Keyboard clicks use the link's center.
  addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var x = e.clientX, y = e.clientY;
    if (!e.detail) { var r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    try { sessionStorage.setItem(KEY, JSON.stringify([x / innerWidth, y / innerHeight])); } catch (err) { /* storage off */ }
  }, true);

  // Old page: name <main> just before the browser takes its picture, for tab-to-tab moves only.
  addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;
    var t = '';
    try { if (e.activation) t = typeFor(location.href, e.activation.entry.url); } catch (err) { /* older browsers */ }
    if (!wipe(t)) root.classList.add('vt');
    done(e.viewTransition);
  });
  // Coming back from the back/forward cache: drop the name the old page was left with.
  addEventListener('pageshow', function (e) { if (e.persisted) off(); });
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) { off(); return; }
    var t = '';
    if (window.navigation && navigation.activation && navigation.activation.from && navigation.activation.entry) {
      t = typeFor(navigation.activation.from.url, navigation.activation.entry.url);
    }
    if (wipe(t)) {
      var pt = null;
      try { pt = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (err) { /* storage off */ }
      if (pt && pt.length === 2) {
        root.style.setProperty('--vt-x', (Math.max(0, Math.min(1, pt[0])) * 100).toFixed(1) + '%');
        root.style.setProperty('--vt-y', (Math.max(0, Math.min(1, pt[1])) * 100).toFixed(1) + '%');
      }
      e.viewTransition.finished.then(function () {
        root.style.removeProperty('--vt-x'); root.style.removeProperty('--vt-y');
      }, quiet);
    } else {
      root.classList.add('vt');
    }
    done(e.viewTransition);
    if (!t) return;
    try { e.viewTransition.types.add(t); } catch (err) { /* older browsers */ }
  });
})();

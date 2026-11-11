// Page-to-page transitions and the glass top bar. A plain script in <head>, loaded on every page.
// The transitions themselves are CSS (@view-transition in shared/base.css). This file:
// 1. Names <main> only while a tab-to-tab transition runs (class "vt" on <html>), so pages that draw a
//    scene behind main are not flattened the rest of the time. The page turn itself is CSS in base.css.
// 2. Adds a type the CSS reads with html:active-view-transition-type(...):
//    "forward" / "back": moving right or left along the top bar. The new page turns in from the right
//    edge (forward) or the left (back) behind a short clip-path wipe.
//    "deeper" / "up": from a tab into one of its project pages, between them, or back up. The new page,
//    with its own theme, is inked in as a circle from where you clicked.
// 3. Remembers where you clicked (sessionStorage), so the circle starts there.
// 4. Runs the top bar (end of this file): condense, hide on scroll down, progress, tint, indicator, phone menu.
(function () {
  document.documentElement.classList.add('js');
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

  // ---------- Top bar ----------
  // Everything here is polish. Without it the bar is a plain row of links.
  function initBar() {
    var bar = document.querySelector('header.bar');
    if (!bar) return;
    var nav = bar.querySelector('.bar-nav');
    var ind = bar.querySelector('.bar-ind');
    var btn = bar.querySelector('.bar-menu');
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
    var phone = matchMedia('(max-width: 760px)');
    var open = false, resting = null, last = scrollY, ticking = false, lastTone = 0;

    // Sliding indicator: moves with transform only (translateX + scaleX).
    function mark(a) {
      if (!ind || !a || phone.matches) { if (nav) nav.classList.remove('has-ind'); return; }
      var pad = parseFloat(getComputedStyle(a).paddingLeft) || 12;
      ind.style.setProperty('--ix', (a.offsetLeft + pad) + 'px');
      ind.style.setProperty('--iw', Math.max(0, a.offsetWidth - pad * 2));
      nav.classList.add('has-ind');
    }
    function rest() { mark(resting); }
    function pickResting() {
      resting = nav && (nav.querySelector('a[aria-current]') || null);
      var sec = bar.getAttribute('data-section');
      if (sec && nav) resting = nav.querySelector('a[href="/' + sec + '/"]') || resting;
    }
    links.forEach(function (a) {
      a.addEventListener('pointerenter', function () { mark(a); });
      a.addEventListener('focus', function () { mark(a); });
      a.addEventListener('pointerleave', rest);
      a.addEventListener('blur', rest);
    });
    // The home page can mark long-scroll sections with data-bar-section="web-design" (and so on).
    var secs = document.querySelectorAll('[data-bar-section]');
    if (secs.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { bar.setAttribute('data-section', e.target.getAttribute('data-bar-section')); pickResting(); rest(); }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Array.prototype.forEach.call(secs, function (s) { io.observe(s); });
    }

    // Tint: look at what is behind the middle of the bar. A section may say data-tone="dark" or "light" itself.
    function opaqueBg(el) {
      for (; el && el.nodeType === 1; el = el.parentElement) {
        var m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
        if (m && m.length >= 3 && (m.length === 3 || parseFloat(m[3]) > 0.6)) return [+m[0], +m[1], +m[2]];
      }
      return null;
    }
    function lum(c) {
      var v = c.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }
    function tone() {
      var r = bar.firstElementChild.getBoundingClientRect();
      var els = document.elementsFromPoint(innerWidth / 2, r.top + r.height / 2), t = null, i, el;
      for (i = 0; i < els.length; i++) {
        el = els[i];
        if (bar.contains(el)) continue;
        var forced = el.closest && el.closest('[data-tone]');
        if (forced) { t = forced.getAttribute('data-tone'); break; }
        var c = opaqueBg(el);
        if (c) { t = lum(c) > 0.35 ? 'light' : 'dark'; break; }
      }
      if (!t) { var b = opaqueBg(document.body) || opaqueBg(document.documentElement); t = b && lum(b) > 0.35 ? 'light' : 'dark'; }
      if (bar.getAttribute('data-tone') !== t) bar.setAttribute('data-tone', t);
    }

    // Fast path: sections that say data-tone are watched with one IntersectionObserver over a thin band
    // at the bar's height, so scrolling does no hit-testing. Pages without data-tone use tone() above.
    var toned = Array.prototype.filter.call(document.querySelectorAll('[data-tone]'), function (el) { return !bar.contains(el); });
    var under = new Set(), toneIO = null;
    function setTone(t) { if (bar.getAttribute('data-tone') !== t) bar.setAttribute('data-tone', t); }
    function pickTone() {
      var best = null;
      under.forEach(function (el) { if (!best || (best.compareDocumentPosition(el) & 4)) best = el; });
      if (best) setTone(best.getAttribute('data-tone'));
      return !!best;
    }
    function watchTone() {
      if (!toned.length || !('IntersectionObserver' in window)) return;
      if (toneIO) toneIO.disconnect();
      under.clear();
      var r = bar.firstElementChild.getBoundingClientRect();
      var mid = Math.round(r.top + r.height / 2), h = innerHeight;
      toneIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) under.add(e.target); else under['delete'](e.target); });
        if (!pickTone()) tone();
      }, { rootMargin: '-' + Math.max(0, mid) + 'px 0px -' + Math.max(0, h - mid - 1) + 'px 0px' });
      toned.forEach(function (el) { toneIO.observe(el); });
    }
    function toneNow() { if (!toneIO || !pickTone()) tone(); }

    // Progress line: CSS does it where scroll timelines exist, otherwise a variable.
    var cssProgress = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');
    function progress() {
      if (cssProgress) return;
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--prog', h > 0 ? Math.min(1, Math.max(0, scrollY / h)).toFixed(4) : 0);
    }

    function update() {
      ticking = false;
      var y = Math.max(0, scrollY), dy = y - last;
      bar.classList.toggle('is-condensed', y > 24);
      if (y <= 24 || dy < -4) bar.classList.remove('is-hidden');
      else if (dy > 4 && y > 140 && !open && !bar.contains(document.activeElement)) bar.classList.add('is-hidden');
      if (Math.abs(dy) > 4) last = y;
      progress();
      if (!toneIO || !under.size) { var now = Date.now(); if (now - lastTone > 200) { lastTone = now; tone(); } }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { rest(); if (!phone.matches) close(true); onScroll(); watchTone(); });
    // Settle the tint once scrolling stops (only needed when there is no section watcher).
    var settle;
    addEventListener('scroll', function () { if (toneIO && under.size) return; clearTimeout(settle); settle = setTimeout(tone, 160); }, { passive: true });
    bar.addEventListener('focusin', function () { bar.classList.remove('is-hidden'); });

    // Phone menu: a panel that grows from the button.
    function close(quiet) {
      if (!open) return;
      open = false; nav.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
      if (!quiet) btn.focus();
    }
    if (btn && nav) {
      btn.addEventListener('click', function () {
        open = !open; nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
        if (open) { bar.classList.remove('is-hidden'); var f = nav.querySelector('a[aria-current]') || links[0]; if (f) f.focus(); }
      });
      addEventListener('keydown', function (e) { if (e.key === 'Escape') close(false); });
      document.addEventListener('click', function (e) { if (open && !bar.contains(e.target)) close(true); });
      nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) close(true); });
    }

    pickResting(); rest(); update(); tone(); watchTone();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { rest(); toneNow(); });
    addEventListener('load', function () { rest(); toneNow(); });
    addEventListener('pageshow', function () { rest(); onScroll(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBar); else initBar();
})();

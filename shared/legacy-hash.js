// Old links like endyland.com/#argus pointed at sections of the one-page site.
// Those sections now live on their own tabs. This sends old links to the new place.
// A plain script in <head> on the home page only, so the jump happens before anything paints.
(function () {
  var map = {
    '#argus': '/startup-work/#argus',
    '#rion': '/startup-work/#rion',
    '#ses-mailer': '/startup-work/#ses-mailer',
    '#yotummy': '/web-design/#yotummy',
    '#park-with-love': '/web-design/#park-with-love',
    '#rf-direction-finder': '/research/#rf-direction-finder',
    '#gohighlevel-mcp': '/projects/#gohighlevel-mcp',
    '#work': '/projects/',
    '#projects': '/projects/',
    '#links': '/#contact'
  };
  function go() {
    var to = map[location.hash];
    if (to && to !== location.pathname + location.hash) location.replace(to);
  }
  go();
  addEventListener('hashchange', go);
})();

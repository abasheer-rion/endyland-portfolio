// Projects tab: state shared by the page script (main.js) and the 3D scene (scene.js).
// Both import this one module, so they see the same object.
export const bus = {
  p: 0,              // scroll progress, 0 at the top and 1 at the bottom
  stage: 0,          // how many cabinets have scrolled into view
  hover: -1,         // index of the lit cabinet, -1 for none
  hoverColor: '#FF4FD8',
  hoverAt: 0,        // performance.now() when the current cabinet lit up
  px: 0, py: 0,      // pointer, -1 to 1
  pt: -1e9,          // performance.now() of the last pointer move
  fire: 0,           // shots asked for by the visitor. The scene fires the difference.
  onKill: null,      // set by main.js: the scene calls it when an invader is hit
  onCoin: null,      // set by main.js: the scene calls it when the ship grabs a coin
};

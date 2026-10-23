// Shared state between the page script (main.js) and the 3D scene (scene.js).
// main.js writes what the visitor is doing. scene.js reads it every frame.
export const state = {
  m: 0,          // scroll position as a chapter number: 0 intro, 1 Argus, 2 RION. Fractions mean in between.
  y: 0,          // scrollY in px, for scroll speed
  hover: -1,     // chapter of the card under the pointer or keyboard focus, or -1
  px: 0, py: 0,  // pointer position, -1 to 1
  ptr: 0,        // 1 while a mouse is over the page
  pulseAt: -1,   // time of the last tap or click, in seconds (performance.now / 1000)
  pulseX: 0, pulseY: 0,
  redraw: null,  // set by the scene. Draws one still frame (used with reduced motion).
};

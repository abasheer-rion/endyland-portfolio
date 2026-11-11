// Shared state between the page script (main.js) and the stipple scene (scene.js).
// main.js writes where the pointer is. scene.js reads it every frame.
export const state = {
  px: 0, py: 0,  // pointer position, -1 to 1, eased by the scene
  ptr: 0,        // 1 while a mouse is over the page
};

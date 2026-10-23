// State shared by main.js and scene.js on the endyland hosting page.
export const bus = {
  px: 0, py: 0,  // pointer, -1 to 1
  onCheck: null, // called with true while a health check goes out, false when it is done
};

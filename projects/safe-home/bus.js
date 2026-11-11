// State shared by main.js and scene.js on the Safe Home page.
export const bus = {
  knock: null,    // set by scene.js: cut one house off the mesh (returns true if one was cut)
  reset: null,    // set by scene.js: bring every house back
  onStats: null,  // set by main.js: called with { delivered, offline } when they change
};

// State shared by main.js and scene.js on the bench rig page.
export const bus = {
  onPoint: null, // called with the sweep point (1 to 12) as it is measured, or 0 when a new run starts
  onDone: null,  // called when a run ends and the out-of-spec point is flagged
};

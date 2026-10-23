// State shared by main.js and scene.js on the FPGA page.
export const bus = {
  px: 0, py: 0,     // pointer, -1 to 1
  onStage: null,    // called with 0..4 when the newest instruction enters a pipeline stage
  onStop: null,     // called when the scene stops (reduced motion)
};

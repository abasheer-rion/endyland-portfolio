// State shared by main.js and scene.js on the GoHighLevel page.
export const bus = {
  layout: null,   // set by the scene: { ox, oy, cell, cols, rows, P } in drawn pixels, to map the pointer to a slot
  want: -1,       // slot the pointer is over, -1 for none
  onSlot: null,   // called with the slot number (1 to 48) when the cursor lands on it
};

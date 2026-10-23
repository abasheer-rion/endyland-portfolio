// web-design tab: what the page and the 3D scene share.
// main.js says which card is in view; scene.js recolors its shapes to match.

// One palette per moment: the intro, then each card in page order.
// Slots: [main, second, third, fourth]. Ink (#1B1B1F) is always the outline color.
export const PALETTES = [
  ['#FF5A4E', '#FFC93C', '#2D5BFF', '#2EC4B6'], // intro
  ['#FFC93C', '#FF5A4E', '#2EC4B6', '#FF8A3D'], // YoTummy
  ['#2D5BFF', '#2EC4B6', '#FFC93C', '#A98BFF'], // New Door Investments
  ['#FFC93C', '#1B1B1F', '#FF5A4E', '#2D5BFF'], // Detail Theory
  ['#2EC4B6', '#FF8A3D', '#FFC93C', '#FF5A4E'], // Swadesi Mangoes
  ['#FF5A4E', '#2D5BFF', '#2EC4B6', '#FFC93C'], // RION Solutions website
  ['#FF5A4E', '#2D5BFF', '#FFC93C', '#FF8FC7'], // endyland.com
];

export const bus = new EventTarget();
export const state = { palette: 0 };

export function setPalette(i) {
  if (i === state.palette) return;
  state.palette = i;
  bus.dispatchEvent(new CustomEvent('palette', { detail: i }));
}

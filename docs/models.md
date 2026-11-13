# 3D model kit

Eight procedural three.js models and one viewer, in `shared/models/`. No build step, no outside requests. three.js
is the vendored r186 file. Test page: `/shared/models/_gallery.html` (noindex, in robots Disallow).

## Markup

```html
<link rel="stylesheet" href="/shared/models/stage.css">
...
<figure class="figure">
  <div class="model-stage" data-model="sensor-box" data-explode="scroll" data-labels
       aria-label="Safe Home sensor box. It opens as the page scrolls to show the boards and the battery pack."></div>
</figure>
...
<script type="module" src="/shared/models/auto.js"></script>
```

`auto.js` mounts every `.model-stage[data-model]`. Nothing heavy loads until a stage is within 300px of the
viewport; then `stage.js` imports `kit.js` (which imports three.js) and the one model file.

From a page script instead:

```js
import { mountModel } from '/shared/models/stage.js';
const stage = mountModel(el, { model: 'patch-array', options: { angle: 25 } });
stage.set('angle', -40);        // eases there; releases a scroll or pointer binding
stage.bind('angle', 'pointer'); // 'scroll' | 'pointer' | 'auto' | null
stage.get('angle'); stage.model; stage.stats(); stage.dispose();
```

## Attributes on the stage

| Attribute | Meaning |
|---|---|
| `data-model` | Model name (table below). |
| `data-<param>` | A number, or `scroll` (follows the element through the viewport), `pointer` (follows the pointer across the element), `auto` (slow sweep). |
| `data-scroll="out"` | With a `scroll` parameter: 0 until the element's centre passes mid-screen, 1 as it leaves the top. For heroes. Default runs 0 to 1 as the element comes up from the bottom to just above the middle. |
| `data-labels` | Show part names (HTML, 15px, positioned over the canvas). Models with labels: sensor-box, edge-unit, mesh, sensor-node. |
| `data-az`, `data-el`, `data-zoom` | Starting view: turn and tilt in radians, zoom factor. |
| `data-still` | No idle sway or spin. |
| `data-poster` | Fallback image URL, or `none`. Default `posters/<model>.webp`. |
| `data-soft-gl` | Allow software WebGL. Test page only. |
| `aria-label` | Say what the picture shows. A default is added if missing. |

The stage gets `tabindex="0"` and `role="group"`. Keys: arrows turn, Home resets, Enter or Space runs the model's
action (mesh: next house offline; models with `explode` and no binding: open or close).

Events on the element: `model:ready` `{ model }`; `model:change` (mesh: `{ offline: [ids], reachable: n }`).
Dispatch `model:set` with `{ name, value }` to set a parameter without importing anything.

Classes set by the viewer: `is-live` (drawing), `is-static` (fallback shown), `is-dragging`, `can-pick`.

## Models

| Name | What it is | Parameters | Intended place |
|---|---|---|---|
| `sensor-box` | Safe Home box A: printed enclosure, XIAO ESP32-S3, Arduino Uno Q, power module, tilt switch, buzzer, 6 x AA pack, water sensor on a lead, flame sensor, 2.4 GHz antenna | `explode` 0..1 | `/projects/safe-home/` hero or hardware section |
| `mesh` | Nine houses with radio nodes; packets hop to the one house with internet. Click a house to take it offline and routes change | none. `stage.model.setOffline([ids])` | `/projects/safe-home/` mesh section (replaces the boxed mesh scene) |
| `edge-unit` | Bullet camera wired to a NanoPi R76S (RK3576, 4 GB RAM, 64 GB eMMC, 2 x 2.5 GbE) in a finned case | `explode` 0..1 | `/startup-work/argus-edge-board/`, `/startup-work/argus-one/` |
| `patch-array` | Four 5.8 GHz patches, 25.844 mm apart, each with a feed and SMA, plus the computed beam lobe | `angle` -60..60 degrees | `/research/rf-direction-finder/` |
| `fpga-board` | Generic Artix-7 development board: FPGA, switches, LEDs, buttons, four-digit display, headers | none | `/projects/fpga-risc/` hero, projects index row |
| `logo` | The endyland mark extruded: E with three dots | `tone` `dark` (paper and foil, for leather) or `light` (ink and rust, for paper). Not animated: an option, set once | Home hero |
| `sensor-node` | Board with ESP32 module, I2C sensor, regulator, one 18650 cell | `pullup` 0..1 (the pull-up resistor missing on the first build drops in) | `/projects/sensor-node/` |
| `pose` | 17-keypoint figure with bones | `pose` 0..3 (standing, reaching, crouching, hand to torso; blends between) | `/startup-work/argus/` |

What is drawn from fact and what is not:
- `sensor-box`: parts list is from the Safe Home repo. The enclosure is drawn to fit the parts, not copied from the STL.
- `edge-unit`: the stock NanoPi R76S board. The camera is a generic bullet camera; Argus read stores' existing cameras.
- `patch-array`: spacing and the lobe maths are real (four-element array factor times a cosine element pattern). The board outline is illustrative; the board has not been built.
- `fpga-board`, `sensor-node`: typical layouts. Neither board was photographed.
- `pose`: the four poses are hand-made, not recorded data.

## CSS

`stage.css` is all that is needed. The stage is `width:100%; aspect-ratio:4/3`, transparent, no frame. Change the
shape per page with `aspect-ratio` or a height. Anything a page puts inside the stage (`img`, `svg`, `picture`) is
shown until the model draws and stays if it never does.

## Look

`kit.js` holds the palette (the book colours plus two board greens), one shader and the part helpers. The shader
is flat tone with a screen-space halftone in the shadows and a dark rim on curved surfaces; every part also gets
ink edge lines. No lights, no shadows, no textures except small canvas labels. Each part is one merged mesh and
one merged line set, so a model is 2 to 38 draw calls and 2,000 to 26,000 triangles.

## Behaviour

- Drag turns the model, with inertia. Past a limit it stretches and springs back. On touch, dragging turns only
  sideways so the page still scrolls up and down.
- Idle sway starts 1.4 seconds after the last touch.
- Drawing stops when the stage is more than 60px off screen or the tab is hidden.
- Pixel ratio is capped at 2 on desktop and 1.5 on phones and touch screens, and drops by 0.5 if frames stay slow.
- Without WebGL 2, or on any error or context loss, the stage shows the poster.
- Reduced motion is ignored on purpose (owner decision).

## Adding a model

1. Write `shared/models/<name>.js` exporting `create(options)` that returns a `THREE.Group` and calls
   `model(root, { params, set, tick, pick, pickables, action, labels, view, dispose })` from `kit.js`.
2. Add it to `LOADERS` in `stage.js` and to `_gallery.html`.
3. Make the poster: open `_gallery.html?only=<name>&bg=clear&still=1` in headless Chrome at 960x720 with
   `--default-background-color=00000000` and save to `posters/<name>.webp`.

Test page queries: `?only=<name>&explode=1&az=0.6&el=0.5&zoom=1&bg=dark|clear&labels=1&still=1`, `?stats=1`.

## Deploy

The test page is published unless excluded. To keep it off the site, add `--exclude '_gallery.*'` to the rsync
line in `.github/workflows/deploy.yml` (beside `--exclude 'docs'`). That has not been done.

// Mounts every <div class="model-stage" data-model="..."> on the page. Load it as a module:
//   <script type="module" src="/shared/models/auto.js"></script>
// Nothing heavy loads here: three.js and the model arrive when a stage nears the viewport. See stage.js.
import { mountAll } from './stage.js';

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountAll(), { once: true });
else mountAll();

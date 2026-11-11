// web-design tab. Work rows rise in as they scroll into view. Nothing else runs here, and the page reads the same without it.
import { onVisible } from '../shared/motion.js';

const rows = [...document.querySelectorAll('.work')];
if ('IntersectionObserver' in window && rows.length) {
  document.documentElement.classList.add('wd-anim');
  onVisible(rows, (el) => el.classList.add('in'), { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
}

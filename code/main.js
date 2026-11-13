// Code page. Reads /data/github.json (written by .github/scripts/fetch-github.mjs) and draws the page from it.
// If the file does not load, the intro and the profile link stay and a one-line message is shown.
import { onVisible } from '/shared/motion.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const num = (n) => Number(n).toLocaleString('en-US');
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;
const asDate = (iso) => new Date(`${iso}T00:00:00Z`);
const fmt = (iso, opts) => asDate(iso).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
const short = (iso) => fmt(iso, { month: 'short', day: 'numeric', year: 'numeric' });
const long = (iso) => fmt(iso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const addDays = (iso, n) => {
  const d = asDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LANG_COLORS = ['#D9AE4A', '#EFE3C8', '#C8713F', '#B8872E', '#8A6038', '#A8997A'];
const OTHER_COLOR = '#5A3A22';

function pair(list, label, value) {
  const row = el('div');
  row.append(el('dt', '', label), el('dd', '', value));
  list.append(row);
  return row;
}

function drawTotals(d) {
  const t = d.totals;
  const list = $('nums');
  const items = [
    ['Contributions', num(t.contributions)],
    ['Commits', num(t.commits)],
    ['Pull requests', num(t.pull_requests)],
  ];
  if (t.reviews > 0) items.push(['Reviews', num(t.reviews)]);
  if (t.issues > 0) items.push(['Issues', num(t.issues)]);
  if (items.length < 4) items.push(['Days in the longest streak', num(d.streaks.longest.days)]);
  items.forEach(([label, value], i) => {
    const row = pair(list, label, value);
    row.classList.add('rise');
    row.style.setProperty('--i', i);
  });
}

function drawFacts(d) {
  const list = $('facts');
  const s = d.streaks;
  if (d.busiest_day.date) pair(list, 'Busiest day', `${short(d.busiest_day.date)}, ${plural(d.busiest_day.count, 'contribution')}`);
  pair(list, 'Busiest weekday', d.busiest_weekday.name);
  if (s.longest.days > 0) pair(list, 'Longest streak', `${plural(s.longest.days, 'day')}, ${short(s.longest.from)} to ${short(s.longest.to)}`);
  pair(list, 'Current streak', plural(s.current.days, 'day'));
  pair(list, 'Days with a contribution', num(d.totals.active_days));
}

function drawPlate(d) {
  const counts = d.calendar.counts;
  const start = d.calendar.start;
  const offset = asDate(start).getUTCDay();
  const weeks = Math.ceil((offset + counts.length) / 7);
  const max = Math.max(1, ...counts);
  const grid = $('plate-grid');
  const months = $('plate-months');
  grid.style.setProperty('--weeks', weeks);
  months.style.setProperty('--weeks', weeks);

  // Month names over the week that holds the 1st. January carries the year.
  let lastCol = -9;
  counts.forEach((_, i) => {
    const iso = addDays(start, i);
    if (!iso.endsWith('-01')) return;
    const col = Math.floor((offset + i) / 7);
    if (col - lastCol < 3 || col > weeks - 2) return;
    lastCol = col;
    const m = el('span', '', fmt(iso, iso.slice(5, 7) === '01' ? { month: 'short', year: 'numeric' } : { month: 'short' }));
    m.style.gridColumn = `${col + 2} / span 3`;
    months.append(m);
  });

  const cells = [];
  for (let r = 0; r < 7; r++) {
    const row = el('div');
    row.setAttribute('role', 'row');
    const head = el('div', '', r % 2 === 1 ? WEEKDAYS[r].slice(0, 3) : '');
    head.setAttribute('role', 'rowheader');
    head.setAttribute('aria-label', WEEKDAYS[r]);
    row.append(head);
    for (let w = 0; w < weeks; w++) {
      const i = w * 7 + r - offset;
      const cell = el('div');
      cell.setAttribute('role', 'gridcell');
      if (i >= 0 && i < counts.length) {
        const c = counts[i];
        const iso = addDays(start, i);
        cell.tabIndex = -1;
        cell.dataset.i = i;
        cell.dataset.count = c;
        cell.dataset.date = iso;
        cell.setAttribute('aria-label', `${long(iso)}: ${c ? plural(c, 'contribution') : 'no contributions'}`);
        cell.style.setProperty('--w', w);
        if (c > 0) cell.style.setProperty('--s', (0.34 + 0.62 * Math.sqrt(c / max)).toFixed(3));
        else cell.style.setProperty('--o', '.38');
        cells[i] = cell;
      }
      row.append(cell);
    }
    grid.append(row);
  }

  // One tab stop. Arrows move by day and week, Home and End jump to the ends.
  let current = counts.length - 1;
  cells[current].tabIndex = 0;
  const go = (i) => {
    if (i < 0 || i >= cells.length) return;
    cells[current].tabIndex = -1;
    current = i;
    cells[i].tabIndex = 0;
    cells[i].focus();
  };
  grid.addEventListener('keydown', (e) => {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key];
    if (step) go(current + step);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(cells.length - 1);
    else if (e.key === 'Escape') hide();
    else return;
    e.preventDefault();
  });

  const tip = $('tip');
  const wrap = $('plate-wrap');
  let shown = null;
  function show(cell) {
    if (shown && shown !== cell) shown.classList.remove('is-on');
    shown = cell;
    cell.classList.add('is-on');
    const c = Number(cell.dataset.count);
    tip.firstElementChild.textContent = c ? plural(c, 'contribution') : 'No contributions';
    tip.lastElementChild.textContent = long(cell.dataset.date);
    const a = cell.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    const x = Math.max(4, Math.min(b.width - tip.offsetWidth - 4, a.left - b.left + a.width / 2 - tip.offsetWidth / 2));
    tip.style.setProperty('--x', `${Math.round(x)}px`);
    tip.style.setProperty('--y', `${Math.round(a.top - b.top - tip.offsetHeight - 8)}px`);
    tip.classList.add('on');
  }
  function hide() {
    if (shown) shown.classList.remove('is-on');
    shown = null;
    tip.classList.remove('on');
  }
  const dayOf = (e) => (e.target instanceof Element ? e.target.closest('[data-i]') : null);
  grid.addEventListener('pointerover', (e) => { const c = dayOf(e); if (c) show(c); });
  grid.addEventListener('pointerleave', () => { if (!grid.contains(document.activeElement)) hide(); });
  grid.addEventListener('focusin', (e) => {
    const c = dayOf(e);
    if (!c) return;
    cells[current].tabIndex = -1;
    current = Number(c.dataset.i);
    c.tabIndex = 0;
    show(c);
  });
  grid.addEventListener('focusout', hide);
  const scroller = $('plate-scroll');
  scroller.addEventListener('scroll', hide, { passive: true });
  // Narrow screens scroll the plate sideways. Start at the newest week.
  scroller.scrollLeft = scroller.scrollWidth;

  grid.classList.add('wait');
  onVisible([grid], () => {
    grid.classList.remove('wait');
    grid.classList.add('in');
  });
}

function drawLanguages(d) {
  const top = d.languages.slice(0, LANG_COLORS.length).filter((l) => l.percent >= 0.5);
  if (!top.length) {
    $('langs-h').closest('section').hidden = true;
    return;
  }
  const rest = Math.round((100 - top.reduce((n, l) => n + l.percent, 0)) * 10) / 10;
  const rows = top.map((l, i) => ({ name: l.name, percent: l.percent, color: LANG_COLORS[i] }));
  if (rest > 0) rows.push({ name: 'Other', percent: rest, color: OTHER_COLOR });
  const bar = $('langbar');
  const list = $('langlist');
  for (const r of rows) {
    const seg = el('i');
    seg.style.setProperty('--c', r.color);
    seg.style.flex = `${r.percent} 1 0`;
    bar.append(seg);
    const li = el('li');
    const sw = el('i');
    sw.style.setProperty('--c', r.color);
    sw.setAttribute('aria-hidden', 'true');
    li.append(sw, el('span', '', r.name), el('b', '', `${r.percent.toFixed(1)}%`));
    list.append(li);
  }
  // Watch the list: the bar starts fully clipped, so it never counts as visible itself.
  onVisible([list], () => bar.classList.add('in'));
}

const safeUrl = (u, prefix) => (typeof u === 'string' && u.startsWith(prefix) ? u : null);

function drawRepos(d) {
  const list = $('repos');
  d.repos.forEach((r, i) => {
    const url = safeUrl(r.url, 'https://github.com/');
    if (!url) return;
    const li = el('li', 'rise');
    li.style.setProperty('--i', Math.min(i, 8));
    const head = el('div');
    head.append(el('h3', '', r.name));
    const meta = [r.language, `Pushed ${short(r.pushed_at)}`];
    if (r.stars > 0) meta.push(plural(r.stars, 'star'));
    if (r.archived) meta.push('Archived');
    head.append(el('p', 'repo-meta', meta.filter(Boolean).join(' · ')));
    const body = el('div');
    if (r.description) body.append(el('p', 'repo-desc', r.description));
    const links = el('ul', 'repo-links');
    const add = (href, text, external) => {
      const a = el('a', '', text);
      a.href = href;
      if (external) a.rel = 'noopener';
      a.setAttribute('aria-label', `${text}: ${r.name}`);
      const item = el('li');
      item.append(a);
      links.append(item);
    };
    add(url, 'Code on GitHub', true);
    if (typeof r.page === 'string' && /^\/[a-z0-9/-]+\/$/.test(r.page)) add(r.page, 'Project page', false);
    const home = safeUrl(r.homepage, 'https://');
    if (home && !/^https:\/\/(www\.)?endyland\.com\/?$/.test(home)) add(home, 'Live site', true);
    body.append(links);
    li.append(head, body);
    list.append(li);
  });
  const p = d.private || {};
  if (p.repos > 0) {
    const note = $('private-p');
    let text = `${plural(p.repos, 'more repository').replace('repositorys', 'repositories')} ${p.repos === 1 ? 'is' : 'are'} private.`;
    if (p.commits > 0) text += ` They hold ${plural(p.commits, 'commit')} from the past year.`;
    note.textContent = text;
    note.hidden = false;
  }
}

async function main() {
  let d;
  try {
    const res = await fetch('/data/github.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    d = await res.json();
    if (!d || !d.calendar || !Array.isArray(d.calendar.counts) || !d.calendar.counts.length || !d.totals) throw new Error('shape');
    drawTotals(d);
    drawPlate(d);
    drawFacts(d);
    drawLanguages(d);
    drawRepos(d);
  } catch {
    $('code-data').hidden = true;
    $('code-fail').hidden = false;
    return;
  }
  $('code-lede').textContent = `My contributions on GitHub from ${short(d.range.from)} to ${short(d.range.to)}. Last updated ${short(d.fetched_at)}.`;
  onVisible('.rise', (n) => n.classList.add('in'), { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });
}

// The sections must be laid out before drawing, so the plate can be measured and scrolled.
$('code-data').hidden = false;
main();

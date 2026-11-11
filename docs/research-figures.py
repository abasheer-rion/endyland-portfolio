#!/usr/bin/env python3
"""Draws the research-tab figures (SVG) from real data. Not deployed (docs/ is skipped).
Reads, read-only: ~/Projects/ride-beamforming/experiments/*.csv and ~/Projects/parity/ledger/runs/RUN-000003.json.
Writes SVGs into research/*/img/. Run: python3 docs/research-figures.py
Every number on a figure comes from those files or from the formula named in its caption."""
import csv, json, math, os, html
HOME = os.path.expanduser('~')
RF = f'{HOME}/Projects/ride-beamforming/experiments'
PAR = f'{HOME}/Projects/parity/ledger/runs/RUN-000003.json'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'research')

PAPER, VEL, INK, SADDLE, BRASS, RUST, LEATH, CREAM, FOIL = '#EFE3C8', '#F6EEDB', '#17100A', '#5A3A22', '#B8872E', '#9C4A22', '#26180F', '#D9CBAA', '#D9AE4A'
FONT = "'Instrument Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
SERIF = "'Newsreader',Georgia,'Times New Roman',serif"

def esc(s): return html.escape(str(s), quote=False)

class Svg:
    def __init__(s, w, h, title, desc, bg=VEL):
        s.w, s.h, s.p = w, h, []
        s.title, s.desc, s.bg = title, desc, bg
    def add(s, x): s.p.append(x)
    def rect(s, x, y, w, h, fill='none', stroke='none', sw=1, rx=0, extra=''):
        s.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')
    def line(s, x1, y1, x2, y2, stroke=INK, sw=1, dash=None, extra=''):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        s.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}"{d} {extra}/>')
    def text(s, x, y, t, size=16, anchor='start', fill=INK, weight=400, family=FONT, style='', extra=''):
        st = f' font-style="{style}"' if style else ''
        s.add(f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" fill="{fill}"{st} {extra}>{esc(t)}</text>')
    def path(s, d, fill='none', stroke=INK, sw=2, extra=''):
        s.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>')
    def circle(s, x, y, r, fill=INK, stroke='none', sw=1):
        s.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
    def arrow(s, x1, y1, x2, y2, stroke=SADDLE, sw=2):
        a = math.atan2(y2 - y1, x2 - x1); L = 9
        s.line(x1, y1, x2 - math.cos(a) * 4, y2 - math.sin(a) * 4, stroke, sw)
        p1 = (x2 - L * math.cos(a - .45), y2 - L * math.sin(a - .45)); p2 = (x2 - L * math.cos(a + .45), y2 - L * math.sin(a + .45))
        s.add(f'<path d="M{x2:.1f} {y2:.1f}L{p1[0]:.1f} {p1[1]:.1f}L{p2[0]:.1f} {p2[1]:.1f}Z" fill="{stroke}"/>')
    def render(s):
        defs = (f'<defs><pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1" fill="{BRASS}"/></pattern>'
                f'<pattern id="dots2" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="translate(3 2)"><circle cx="4" cy="4" r="1.1" fill="{SADDLE}"/></pattern></defs>')
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s.w} {s.h}" width="{s.w}" height="{s.h}" role="img" aria-labelledby="t d">'
                f'<title id="t">{esc(s.title)}</title><desc id="d">{esc(s.desc)}</desc>{defs}'
                f'<rect width="{s.w}" height="{s.h}" fill="{s.bg}"/>' + ''.join(s.p) + '</svg>\n')
    def save(s, rel):
        p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').write(s.render()); print('wrote', rel, len(s.render()))

def wrap(s, x, y, text, width_chars, size=16, lh=21, anchor='start', fill=INK, weight=400):
    words, lines, cur = text.split(), [], ''
    for w in words:
        if len(cur) + len(w) + 1 > width_chars and cur: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    lines.append(cur)
    for i, l in enumerate(lines): s.text(x, y + i * lh, l, size, anchor, fill, weight)
    return len(lines)

def box(s, x, y, w, h, title, body, fill=VEL, stroke=SADDLE, tfill=INK, bfill=SADDLE, chars=20, size=16):
    s.rect(x, y, w, h, fill, stroke, 1.5, 2)
    s.text(x + w / 2, y + 28, title, size + 2, 'middle', tfill, 600)
    wrap(s, x + w / 2, y + 52, body, chars, size - 1, 19, 'middle', bfill)

def axes(s, L, T, R, B, xt, yt, xlab, ylab, xfmt=str, yfmt=str, grid=True):
    """xt: list of (value_px_x, label); yt: same for y."""
    for px, lab in xt:
        if grid: s.line(px, T, px, B, 'rgba(90,58,34,.18)', 1)
        s.text(px, B + 22, lab, 15, 'middle', SADDLE)
    for py, lab in yt:
        if grid: s.line(L, py, R, py, 'rgba(90,58,34,.18)', 1)
        s.text(L - 9, py + 5, lab, 15, 'end', SADDLE)
    s.line(L, B, R, B, INK, 1.5); s.line(L, T, L, B, INK, 1.5)
    s.text((L + R) / 2, B + 46, xlab, 16, 'middle', INK, 500)
    s.add(f'<text transform="translate(16 {(T + B) / 2:.1f}) rotate(-90)" font-family="{FONT}" font-size="16" font-weight="500" text-anchor="middle" fill="{INK}">{esc(ylab)}</text>')

# ------------------------------------------------------------------ RF
def af_db(deg, steer, n=4, d=0.5):
    th, t0 = math.radians(deg), math.radians(steer)
    psi = 2 * math.pi * d * (math.sin(th) - math.sin(t0))
    s_ = math.sin(psi / 2)
    a = 1.0 if abs(s_) < 1e-9 else abs(math.sin(n * psi / 2) / (n * s_))
    return 20 * math.log10(max(a, 1e-4))

def rf_loop():
    s = Svg(760, 360, 'The find-then-steer loop', 'Five steps from left to right: a 5.8 GHz signal reaches a 2 by 2 antenna array, the array data goes to a direction finder, the result sets the phase shifters, and the beam points at the source. A Butler matrix route is drawn below.')
    xs = [14, 162, 310, 458, 606]; w = 128; y = 24; h = 160
    items = [('Signal', 'A 5.8 GHz beacon arrives at some angle.'), ('Array', '2 by 2 antennas, 25.844 mm apart (half a wavelength).'),
             ('Find', 'MUSIC turns the data into azimuth and elevation.'), ('Steer', 'Phase shifters point the beam at that angle.'), ('Beam', 'Most of the power goes toward the beacon.')]
    for x, (t, b) in zip(xs, items):
        box(s, x, y, w, h, t, b, chars=14, size=15)
    for i in range(4): s.arrow(xs[i] + w + 1, y + 70, xs[i + 1] - 2, y + 70)
    s.text(14, 216, 'The passive route, no phase measurement needed', 17, 'start', INK, 600)
    bx = [14, 214, 414, 584]; bw = [170, 170, 150, 160]
    items2 = [('Butler matrix', '4 inputs make 4 fixed beams.'), ('Power detector', 'Reads the power on each beam port.'), ('Pick the loudest', 'The strongest port says roughly where.'), ('Point there', 'Switch to that beam.')]
    for x, w2, (t, b) in zip(bx, bw, items2):
        box(s, x, 232, w2, 112, t, b, chars=int(w2 / 8.6), size=15)
    for i in range(3): s.arrow(bx[i] + bw[i] + 1, 288, bx[i + 1] - 2, 288)
    s.save('rf-direction-finder/img/loop.svg')

def rf_polar():
    W, H = 800, 430
    s = Svg(W, H, 'Beam of a 4-element array at 5.8 GHz', 'Polar plot of the gain of a four-element array spaced half a wavelength apart, steered to 0, 25 and 45 degrees. The main lobe at broadside is about 26 degrees wide at the half-power points, and the first sidelobe is 11.3 dB below it.')
    cx, cy, R = 450, 398, 312
    floor = -30
    rad = lambda db: max(0, (db - floor) / -floor) * R
    for k, db in enumerate((0, -10, -20, -30)):
        r = rad(db)
        s.path(f'M{cx - r:.1f} {cy}A{r:.1f} {r:.1f} 0 0 1 {cx + r:.1f} {cy}', 'none', 'rgba(90,58,34,.35)', 1)
        if db < 0 and db > floor: s.text(cx + 6, cy - r + 17, f'{db} dB', 14, 'start', SADDLE)
    for a in range(-90, 91, 30):
        x, y = cx + R * math.sin(math.radians(a)), cy - R * math.cos(math.radians(a))
        s.line(cx, cy, x, y, 'rgba(90,58,34,.3)', 1)
        tx, ty = cx + (R + 20) * math.sin(math.radians(a)), cy - (R + 20) * math.cos(math.radians(a))
        s.text(tx, min(ty + 5, cy - 4) if abs(a) == 90 else ty + 5, f'{a:+d}°' if a else '0°', 15, 'middle', SADDLE)
    def curve(steer):
        pts = []
        a = -90
        while a <= 90.001:
            r = rad(af_db(a, steer)); pts.append((cx + r * math.sin(math.radians(a)), cy - r * math.cos(math.radians(a)))); a += .5
        return pts
    def d_of(pts): return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
    p0 = curve(0)
    s.path(d_of(p0) + f'L{cx} {cy}Z', 'url(#dots)', 'none', 0)
    s.path(d_of(p0), 'none', INK, 2.4)
    s.path(d_of(curve(25)), 'none', RUST, 2.2, 'stroke-dasharray="9 5"')
    s.path(d_of(curve(45)), 'none', SADDLE, 2, 'stroke-dasharray="2 5"')
    # legend
    s.line(30, 30, 70, 30, INK, 2.4); s.text(78, 35, 'Steered to 0°', 16)
    s.line(30, 58, 70, 58, RUST, 2.2, '9 5'); s.text(78, 63, 'Steered to +25°', 16)
    s.line(30, 86, 70, 86, SADDLE, 2, '2 5'); s.text(78, 91, 'Steered to +45°', 16)
    s.text(30, 140, 'Half-power width at broadside', 15, 'start', SADDLE); s.text(30, 166, 'about 26\u00b0', 24, 'start', INK, 600, SERIF)
    s.text(30, 204, 'First sidelobe', 15, 'start', SADDLE); s.text(30, 230, '11.3 dB down', 24, 'start', INK, 600, SERIF)
    s.save('rf-direction-finder/img/polar.svg')
    # sanity numbers for the page
    half = [a / 10 for a in range(0, 900) if af_db(a / 10, 0) >= -3.0103]
    print('HPBW full width deg', 2 * max(half))

def read_csv(p): return list(csv.DictReader(open(p)))

def rf_snr():
    a = read_csv(f'{RF}/ura-2x2-snr-sweep.csv'); b = read_csv(f'{RF}/ura-4x4-snr-sweep.csv')
    W, H = 760, 420; L, T, R, B = 74, 28, 736, 340
    s = Svg(W, H, 'Direction error against signal strength, 2 by 2 and 4 by 4', 'Error in degrees on a log scale against signal-to-noise ratio from minus 25 to 30 dB. The 4 by 4 array has about five times less error and keeps working about 10 dB deeper into the noise.')
    xmin, xmax = -25, 30
    X = lambda v: L + (v - xmin) / (xmax - xmin) * (R - L)
    lo, hi = math.log10(0.008), math.log10(80)
    Y = lambda v: B - (math.log10(v) - lo) / (hi - lo) * (B - T)
    axes(s, L, T, R, B, [(X(v), str(v)) for v in range(-20, 31, 10)], [(Y(v), f'{v:g}') for v in (0.01, 0.1, 1, 10)], 'Signal to noise ratio (dB)', 'Error (degrees, log scale)')
    for rows, col, dash, name in ((a, INK, None, '2 by 2'), (b, RUST, None, '4 by 4')):
        pts = [(X(float(r['snr_db'])), Y(float(r['rmse_angle_deg']))) for r in rows]
        s.path('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts), 'none', col, 2.6)
        for r, (x, y) in zip(rows, pts):
            fail = float(r['fails_pct'])
            s.circle(x, y, 5 if fail < 50 else 5, col if fail < 50 else VEL, col, 2)
    s.text(X(-3), Y(5.5) - 12, '2 by 2', 17, 'start', INK, 600)
    s.text(X(-22), Y(0.4), '4 by 4', 17, 'start', RUST, 600)
    s.text(X(-24), Y(0.05), 'At 20 dB, 2 by 2: 0.15\u00b0', 16, 'start', INK, 500)
    s.text(X(-24), Y(0.022), 'At 20 dB, 4 by 4: 0.03\u00b0', 16, 'start', RUST, 500)
    s.text(L + 6, T - 8 + 4, 'Open dots: most trials lost the source', 14, 'start', SADDLE)
    s.save('rf-direction-finder/img/snr.svg')

def rf_angle():
    a = read_csv(f'{RF}/ura-2x2-angle-sweep.csv'); b = read_csv(f'{RF}/ura-4x4-angle-sweep.csv')
    W, H = 760, 380; L, T, R, B = 74, 24, 736, 300
    s = Svg(W, H, 'Direction error across angle, 2 by 2 and 4 by 4', 'Error in degrees for a source at azimuth minus 60 to plus 60, elevation 20, 20 dB signal to noise. Both arrays are worst at the edges and best near the middle. The 4 by 4 is about five times better everywhere.')
    X = lambda v: L + (v + 60) / 120 * (R - L); Y = lambda v: B - v / 0.25 * (B - T)
    axes(s, L, T, R, B, [(X(v), f'{v:+d}°' if v else '0°') for v in range(-60, 61, 30)], [(Y(v), f'{v:.2f}') for v in (0, .05, .1, .15, .2, .25)], 'Source azimuth', 'Error (degrees)')
    for rows, col, name in ((a, INK, '2 by 2'), (b, RUST, '4 by 4')):
        pts = [(X(float(r['az_deg'])), Y(float(r['rmse_angle_deg']))) for r in rows]
        s.path('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts), 'none', col, 2.6)
        for x, y in pts: s.circle(x, y, 4.5, col)
    s.text(X(-58), Y(.213) - 12, '2 by 2', 17, 'start', INK, 600); s.text(X(-58), Y(.048) - 12, '4 by 4', 17, 'start', RUST, 600)
    s.text(X(0), Y(.137) - 14, '0.14° at the middle', 15, 'middle', SADDLE); s.text(X(0), Y(.029) - 14, '0.03°', 15, 'middle', SADDLE)
    s.save('rf-direction-finder/img/angle.svg')

def rf_steer():
    rows = read_csv(f'{RF}/find-then-steer.csv')
    W, H = 760, 450; L, T, R, B = 74, 24, 736, 316
    s = Svg(W, H, 'Power lost when the beam is pointed with 2-bit phase shifters', 'Loss in dB against target azimuth. The mean loss is under 1.1 dB at every angle and the worst single case is 2.0 dB. The curve that skips the search step and the one that knows the true angle sit almost on top of each other.')
    X = lambda v: L + (v + 60) / 120 * (R - L); Y = lambda v: B - v / 2.4 * (B - T)
    axes(s, L, T, R, B, [(X(v), f'{v:+d}°' if v else '0°') for v in range(-60, 61, 30)], [(Y(v), f'{v:g}') for v in (0, .5, 1, 1.5, 2)], 'Target azimuth (elevation 0 and 20 combined)', 'Loss against a perfect beam (dB)')
    by = {}
    for r in rows: by.setdefault(int(r['az_deg']), []).append(r)
    az = sorted(by)
    mean = [sum(float(r['loss_cal_mean_db']) for r in by[a]) / len(by[a]) for a in az]
    worst = [max(float(r['loss_cal_worst_db']) for r in by[a]) for a in az]
    orc = [sum(float(r['loss_oracle_mean_db']) for r in by[a]) / len(by[a]) for a in az]
    top = [(X(a), Y(w)) for a, w in zip(az, worst)]; bot = [(X(a), Y(m)) for a, m in zip(az, mean)]
    s.path('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in top + bot[::-1]) + 'Z', 'url(#dots)', 'none', 0)
    s.path('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in top), 'none', SADDLE, 1.6, 'stroke-dasharray="3 4"')
    s.path('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in bot), 'none', INK, 2.8)
    s.path('M' + 'L'.join(f'{X(a):.1f} {Y(m):.1f}' for a, m in zip(az, orc)), 'none', RUST, 1.8, 'stroke-dasharray="8 5"')
    s.text(L + 8, T + 18, 'Dots: the spread between the average and the worst of 50 boards', 15, 'start', SADDLE)
    s.text(R - 4, B + 70 - 4, '', 1)
    s.line(L + 8, 398, L + 44, 398, INK, 2.8); s.text(L + 52, 403, 'Find, then steer (average)', 15)
    s.line(L + 300, 398, L + 336, 398, RUST, 1.8, '8 5'); s.text(L + 344, 403, 'Best possible 2-bit setting', 15)
    s.line(L + 8, 428, L + 44, 428, SADDLE, 1.6, '3 4'); s.text(L + 52, 433, 'Worst of 50 boards', 15)
    print('steer mean range', min(mean), max(mean), 'worst', max(worst))
    s.save('rf-direction-finder/img/find-steer.svg')

# ------------------------------------------------------------------ Parity
def par():
    d = json.load(open(PAR)); rec = d['record']['results']; runs = {r['strategy']: r for r in d['report']['runs']}
    bench = runs['us_market_buy_hold']['metrics']
    fam = lambda n: 'stocks' if n.startswith('stocks') else 'fx' if n.startswith('fx') else 'cmd'
    names = {'stocks_trend_10m': 'Stocks, 10-month trend', 'stocks_golden_cross': 'Stocks, golden cross', 'stocks_vol_managed': 'Stocks, cut back when wild', 'stocks_turn_of_month': 'Stocks, turn of the month',
             'stocks_plus_fx_trend': 'Stocks plus currency trend', 'stocks_sell_in_may': 'Stocks, sell in May', 'fx_carry': 'Currency carry', 'fx_carry_trend_value': 'Carry, trend and value',
             'fx_dollar_carry': 'Dollar carry', 'fx_tsmom': 'Currency trend', 'fx_ma_cross': 'Currency moving average', 'fx_commodity_gap': 'Oil gap', 'fx_value_reer': 'Currency value',
             'fx_xs_momentum': 'Currency relative momentum', 'fx_rsi_reversion': 'Currency RSI', 'commodity_tsmom': 'Commodity trend'}
    rows = sorted(((n, rec[n]['sharpe'], rec[n]['gauntlet']) for n in rec), key=lambda r: -r[1])
    json.dump({'names': names, 'rows': rows, 'bench': bench}, open('/tmp/parity-rows.json', 'w'))
    # Sharpe bars
    W = 760; rowh = 34; T = 70; L = 262; R = 640
    H = T + rowh * (len(rows) + 1) + 84
    s = Svg(W, H, 'Sharpe ratio of the 16 strategies against the S&P 500', 'Horizontal bars. The market scores 0.54. Four stock rules score higher, from 0.66 to 0.75, but none passes all six beat-the-market tests. All currency and commodity strategies score below 0.42.')
    mx = 0.9; X = lambda v: L + (max(v, -.2) + .2) / (mx + .2) * (R - L)
    x0 = X(0); xm = X(bench['sharpe'])
    for v in (0, .25, .5, .75):
        s.line(X(v), T - 8, X(v), H - 76, 'rgba(90,58,34,.2)', 1); s.text(X(v), H - 60, f'{v:g}', 15, 'middle', SADDLE)
    s.text((L + R) / 2, H - 42, 'Sharpe ratio (return for the risk taken), 1999 to 2026, after costs', 15, 'middle', INK, 500)
    for i, (n, sh, g) in enumerate(rows):
        y = T + i * rowh
        col = {'stocks': INK, 'fx': BRASS, 'cmd': SADDLE}[fam(n)]
        s.text(L - 12, y + 21, names[n], 15, 'end', INK)
        s.rect(min(x0, X(sh)), y + 5, abs(X(sh) - x0), 22, col if fam(n) != 'fx' else col)
        s.text(max(x0, X(sh)) + 8 if sh >= 0 else x0 + 8, y + 21, f'{sh:.2f}', 15, 'start', INK, 600)
        s.text(W - 14, y + 21, g.replace('/', ' of '), 15, 'end', SADDLE)
    s.line(xm, T - 14, xm, H - 76, RUST, 2.2, '7 4'); s.text(xm + 8, T - 22, f'Market {bench["sharpe"]:.2f}', 16, 'start', RUST, 600)
    s.text(W - 14, T - 22, 'Tests passed', 15, 'end', SADDLE, 600)
    for k, (lab, col) in enumerate((('Stock rules', INK), ('Currency rules', BRASS), ('Commodity rule', SADDLE))):
        s.rect(262 + k * 150, H - 30, 14, 14, col); s.text(282 + k * 150, H - 18, lab, 14, 'start', INK)
    s.save('parity/img/sharpe.svg')
    # growth of $1
    ys = {}
    for r in d['report']['runs']: ys[r['strategy']] = r['yearly']
    yrs = sorted(ys['us_market_buy_hold'], key=int)
    # drop partial first/last handled as given
    def grow(n):
        v, out = 1.0, [(int(yrs[0]) - 1, 1.0)]
        for y in yrs: v *= 1 + ys[n].get(y, 0); out.append((int(y), v))
        return out
    series = [('us_market_buy_hold', 'US stock market', INK, None), ('stocks_vol_managed', 'Stocks cut back when wild', RUST, '9 5'), ('fx_carry', 'Currency carry', BRASS, None)]
    G = {n: grow(n) for n, *_ in series}
    W, H = 760, 420; L, T, R, B = 74, 28, 736, 340
    s = Svg(W, H, 'Growth of one dollar, 1999 to 2026', 'Growth of one dollar compounded from yearly returns: the stock market ends near 11 dollars, the stock rule that passed the most tests near 20 dollars, and currency carry near 1.50 dollars.')
    x0y, x1y = G['us_market_buy_hold'][0][0], G['us_market_buy_hold'][-1][0]
    X = lambda y: L + (y - x0y) / (x1y - x0y) * (R - L)
    top = max(v for g in G.values() for _, v in g); lo, hi = math.log10(0.7), math.log10(top * 1.15)
    Y = lambda v: B - (math.log10(v) - lo) / (hi - lo) * (B - T)
    yt = [(Y(v), f'${v}') for v in (1, 2, 5, 10, 20) if v < top * 1.15]
    axes(s, L, T, R, B, [(X(v), str(v)) for v in range(2000, 2026, 5)], yt, 'Year', 'Value of $1 (log scale)')
    mk = G['us_market_buy_hold']
    s.path('M' + 'L'.join(f'{X(y):.1f} {Y(v):.1f}' for y, v in mk) + f'L{X(mk[-1][0]):.1f} {B}L{X(mk[0][0]):.1f} {B}Z', 'url(#dots)', 'none', 0)
    for n, lab, col, dash in series:
        g = G[n]
        s.path('M' + 'L'.join(f'{X(y):.1f} {Y(v):.1f}' for y, v in g), 'none', col, 2.8, f'stroke-dasharray="{dash}"' if dash else '')
        y, v = g[-1]; s.text(X(y) - 8, Y(v) - 10, f'${v:.1f}', 16, 'end', col if col != BRASS else SADDLE, 600)
    for k, (lab, col, dash) in enumerate((('Stock market', INK, None), ('Stocks cut back when wild (passed the most tests)', RUST, '9 5'), ('Currency carry', BRASS, None))):
        yy = T + 16 + k * 26
        s.line(L + 14, yy - 5, L + 54, yy - 5, col, 2.8, dash); s.text(L + 64, yy, lab, 16, 'start', INK, 500)
    s.save('parity/img/growth.svg')
    print({n: round(G[n][-1][1], 2) for n in G})
    # pipeline
    s = Svg(760, 250, 'How Parity works', 'Left to right: scrapers pull free daily data, strategy files turn it into target weights, one backtester replays history with costs, the gauntlet runs eleven tests, and the nightly job posts results to a private dashboard.')
    xs = [10, 160, 310, 460, 610]; w = 130
    items = [('Scrapers', '9 currencies, 10 rates, oil, gas, copper, S&P 500, VIX'), ('Strategies', 'One file each. Data in, target weights out.'), ('Backtester', 'Costs, interest, same rules for all.'), ('Gauntlet', '11 fixed tests. Bars set before the run.'), ('Dashboard', 'Nightly run, private. Official runs go in the ledger.')]
    for x, (t, b) in zip(xs, items): box(s, x, 24, w, 156, t, b, chars=16, size=15)
    for i in range(4): s.arrow(xs[i] + w + 1, 102, xs[i + 1] - 2, 102, SADDLE, 2)
    s.text(14, 222, 'Official results come only from the ledger: plan written first, frozen code, fingerprinted data.', 15.5, 'start', SADDLE)
    s.save('parity/img/pipeline.svg')
    # facts for html
    pas = {t: sum(1 for n in rec if rec[n]['tests'][t]) for t in 'A1 A2 A3 A4 A5 A6 B1 B2 B3 B4 B5'.split()}
    print('passes per test', pas)
    cr = d['report']['comparison']['crises']
    print([(c['name'], c['returns']['us_market_buy_hold'], c['returns']['stocks_vol_managed'], c['returns']['fx_carry']) for c in cr])

# ------------------------------------------------------------------ DFW and spending
def dfw():
    s = Svg(800, 450, 'DFW rental pricing model, as drawn from the stated numbers', 'More than 1,200 listings go into the model, which predicts rent with a median error of 6 percent. Comparing asking rent with the prediction flagged 8 units, worth about 14 thousand dollars a year.')
    s.text(32, 54, 'DFW rental pricing model', 26, 'start', INK, 500, SERIF)
    xs = [32, 300, 568]; w = 200
    items = [('1,200+', 'listings across Dallas-Fort Worth'), ('6%', 'median error when it predicts rent'), ('8 units', 'ask far less than predicted, about $14K a year')]
    for x, (a, b) in zip(xs, items):
        s.rect(x, 130, w, 190, VEL, SADDLE, 1.5, 2)
        s.text(x + w / 2, 206, a, 40, 'middle', INK, 500, SERIF)
        wrap(s, x + w / 2, 244, b, 22, 17, 23, 'middle', SADDLE)
    s.arrow(xs[0] + w + 4, 225, xs[1] - 6, 225); s.arrow(xs[1] + w + 4, 225, xs[2] - 6, 225)
    s.text(xs[0] + w / 2 + 100, 380, 'learn from', 16, 'middle', SADDLE); s.text(xs[1] + w / 2 + 100, 380, 'compare asking rent with it', 16, 'middle', SADDLE)
    s.text(32, 424, 'Python, pandas, PostgreSQL', 16, 'start', SADDLE)
    s.save('dfw-rent-model/img/figure.svg')
    # proportion strip
    s = Svg(760, 190, 'Flagged units against all listings', 'A strip of 1,200 slots with 8 of them marked. 8 of more than 1,200 listings is under 1 percent.')
    s.text(20, 34, '8 flagged out of 1,200+ listings', 20, 'start', INK, 600, SERIF)
    cw, ch = 7.2, 9
    s.add(f'<defs><pattern id="grid" width="{cw}" height="{ch}" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="2" fill="rgba(90,58,34,.45)"/></pattern></defs>')
    s.rect(20, 56, 100 * cw, 12 * ch, 'url(#grid)')
    for i in (137, 402, 555, 618, 790, 903, 1044, 1131):   # marks for drawing only
        s.circle(20 + (i % 100) * cw + 2.5, 56 + (i // 100) * ch + 2.5, 3.6, RUST)
    s.text(20, 184, 'Each dot is one of 1,200 listings. The 8 rust dots are placed for drawing only, not by position in the data.', 14.5, 'start', SADDLE)
    s.save('dfw-rent-model/img/flagged.svg')

def spending():
    s = Svg(800, 450, 'Public spending data explorer, as drawn from the stated numbers', '250 thousand plus county spending rows are cleaned and 40 plus duplicate vendors merged, so a search that took 20 minutes by hand takes under 5 seconds.')
    s.text(32, 54, 'Public spending data explorer', 26, 'start', INK, 500, SERIF)
    xs = [32, 300, 568]; w = 200
    items = [('250K+', 'rows of county spending records'), ('40+', 'duplicate vendors merged into one name each'), ('< 5 s', 'a search, down from 20 minutes by hand')]
    for x, (a, b) in zip(xs, items):
        s.rect(x, 130, w, 190, VEL, SADDLE, 1.5, 2)
        s.text(x + w / 2, 206, a, 40, 'middle', INK, 500, SERIF)
        wrap(s, x + w / 2, 244, b, 22, 17, 23, 'middle', SADDLE)
    s.arrow(xs[0] + w + 4, 225, xs[1] - 6, 225); s.arrow(xs[1] + w + 4, 225, xs[2] - 6, 225)
    s.text(xs[0] + w / 2 + 100, 380, 'clean', 16, 'middle', SADDLE); s.text(xs[1] + w / 2 + 100, 380, 'merge, then search', 16, 'middle', SADDLE)
    s.text(32, 424, 'Python, data pipeline', 16, 'start', SADDLE)
    s.save('spending-explorer/img/figure.svg')

if __name__ == '__main__':
    rf_loop(); rf_polar(); rf_snr(); rf_angle(); rf_steer(); par(); dfw(); spending()

#!/usr/bin/env python3
"""Render the per-page social images (1200x630) to shared/brand/og/NAME.png.
Run from anywhere: python3 docs/make-og.py   (needs Google Chrome; fonts are system serif and sans)."""
import os, subprocess, tempfile, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
IMAGES = {
  "home": ("Ayan Basheer", "Electrical engineering student at UT Dallas. RF, hardware and software."),
  "safe-home": ("Safe Home", "Home sensor box, radio mesh and responder map. HackUTD 2026, 3rd place in the State Farm track."),
  "argus": ("Argus", "Computer vision for convenience store cameras. Ayan Basheer worked on it from 2025 to 2026."),
  "parity": ("Parity", "A lab that tests trading strategies against the S&P 500."),
  "rf-direction-finder": ("RF direction finder", "A 5.8 GHz antenna array that finds a signal and steers its beam toward it."),
  "web-design": ("Web design", "Sites and apps built by Ayan Basheer."),
  "research": ("Research", "RF, a trading strategy lab, a rent model and a spending data search."),
  "startup-work": ("Startup work", "Argus and RION Solutions."),
  "projects": ("Projects", "Hardware, firmware, servers and tools built by Ayan Basheer."),
  "experience": ("Experience", "Verizon network engineering, property management and a food bank."),
}
LOGO = '<svg viewBox="0 0 64 64" width="250" height="250"><path fill="none" stroke="#EFE3C8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" d="M36 12H12V52H20M12 32H28"/><g fill="#D9AE4A"><circle cx="52" cy="12" r="6"/><circle cx="44" cy="32" r="6"/><circle cx="36" cy="52" r="6"/></g></svg>'
TPL = """<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;background:#26180F;overflow:hidden}
body{position:relative;font-family:system-ui,-apple-system,"Helvetica Neue",sans-serif;color:#EFE3C8}
.dots{position:absolute;right:-120px;top:-60px;width:860px;height:760px;color:#5A3A22;
 background-image:radial-gradient(circle at 50% 50%,currentColor 1px,transparent 1.5px);background-size:6px 6px;
 -webkit-mask-image:radial-gradient(closest-side,#000 40%,transparent 100%);mask-image:radial-gradient(closest-side,#000 40%,transparent 100%)}
.logo{position:absolute;right:130px;top:190px}
.t{position:absolute;left:84px;top:150px;width:700px}
h1{font:500 @FS@px/1 "Iowan Old Style","Palatino Linotype",Georgia,serif;letter-spacing:-.02em;color:#F6EEDB}
p{margin-top:34px;font-size:34px;line-height:1.3;color:#D9CBAA;max-width:640px}
.f{position:absolute;left:84px;right:84px;bottom:0;height:78px;border-top:1px solid rgba(184,135,46,.45);padding-top:24px;
 font:italic 500 26px "Iowan Old Style",Georgia,serif;color:#D9AE4A}
</style><div class="dots"></div><div class="logo">@LOGO@</div>
<div class="t"><h1>@H@</h1><p>@P@</p></div><div class="f">endyland.com</div>"""
def main():
    os.makedirs(os.path.join(ROOT, "shared/brand/og"), exist_ok=True)
    for name, (h, p) in IMAGES.items():
        fs = 112 if len(h) <= 13 else 88 if len(h) <= 20 else 72
        src = TPL.replace("@FS@", str(fs)).replace("@LOGO@", LOGO).replace("@H@", html.escape(h)).replace("@P@", html.escape(p))
        with tempfile.TemporaryDirectory() as d:
            f = os.path.join(d, "t.html"); open(f, "w").write(src)
            out = os.path.join(ROOT, "shared/brand/og", name + ".png")
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1200,630",
                            "--force-device-scale-factor=1", "--virtual-time-budget=2000", "--screenshot=" + out, "file://" + f],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(out)

if __name__ == "__main__":
    main()

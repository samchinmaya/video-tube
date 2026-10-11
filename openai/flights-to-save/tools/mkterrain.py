# Builds a 20 km x 20 km elevation grid around each crash site from Tilezen terrarium tiles (AWS open data).
import json, math, os, subprocess, base64, io, sys
from PIL import Image
S = sys.argv[1]
node = "global.window={}; require('%s/incidents.js'); console.log(JSON.stringify(window.INCIDENTS.map(x=>({id:x.id, crash:x.geo.crash}))))" % S
sites = json.loads(subprocess.check_output(["node", "-e", node]))
SIZE_M, SEG = 20000, 96
def tile(z, x, y):
    p = f"{S}/tiles/{z}_{x}_{y}.png"
    if not os.path.exists(p):
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        subprocess.check_call(["curl", "-sS", "-m", "30", "-o", p, url])
    im = Image.open(p).convert("RGB")
    return im
out = {}
for s in sites:
    lat, lon = s["crash"]
    mpp_z0 = 156543.034 * math.cos(math.radians(lat))
    z = max(8, min(13, round(math.log2(mpp_z0 / 100))))
    n = 2 ** z
    def to_px(la, lo):
        x = (lo + 180) / 360 * n * 256
        y = (1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * n * 256
        return x, y
    cx, cy = to_px(lat, lon)
    mpp = mpp_z0 / n
    half = SIZE_M / 2 / mpp
    tx0, tx1 = int((cx - half) // 256) - 0, int((cx + half) // 256)
    ty0, ty1 = int((cy - half) // 256), int((cy + half) // 256)
    cache = {}
    def elev(px, py):
        tx, ty = int(px // 256), int(py // 256)
        if (tx, ty) not in cache: cache[(tx, ty)] = tile(z, tx % n, ty)
        r, g, b = cache[(tx, ty)].getpixel((int(px) % 256, int(py) % 256))
        return r * 256 + g + b / 256 - 32768
    def bil(px, py):
        x0, y0 = math.floor(px - 0.5), math.floor(py - 0.5); fx, fy = px - 0.5 - x0, py - 0.5 - y0
        a, b = elev(x0 + .5, y0 + .5), elev(x0 + 1.5, y0 + .5); c, d = elev(x0 + .5, y0 + 1.5), elev(x0 + 1.5, y0 + 1.5)
        return a * (1-fx)*(1-fy) + b*fx*(1-fy) + c*(1-fx)*fy + d*fx*fy
    grid = []
    for iy in range(SEG + 1):          # north → south
        for ix in range(SEG + 1):      # west → east
            px = cx + (-half + ix * 2 * half / SEG); py = cy + (-half + iy * 2 * half / SEG)
            grid.append(bil(px, py))
    water = [h <= 0.5 for h in grid]
    land = [h for h, w in zip(grid, water) if not w]
    hmin = min(land) if land and len(land) == len(grid) else 0.0
    hmax = max(land) if land else 1.0
    span = max(1.0, hmax - hmin)
    by = bytes(0 if w else 1 + round((h - hmin) / span * 254) for h, w in zip(grid, water))
    out[s["id"]] = {"hmin": round(hmin), "hmax": round(hmax), "water": round(sum(water) / len(water), 3), "z": z, "b": base64.b64encode(by).decode()}
    print(f'{s["id"]:10s} z{z} tiles {(tx1-tx0+1)*(ty1-ty0+1)}  hmin {hmin:7.0f}  hmax {hmax:7.0f}  water {out[s["id"]]["water"]*100:4.0f}%', file=sys.stderr)
    # preview
    im = Image.new("L", (SEG + 1, SEG + 1)); im.putdata(list(by)); im.resize((194, 194)).save(f'{S}/tiles/prev_{s["id"]}.png')
open(f"{S}/terrain.js", "w").write(
  "// Real elevation around each crash site: 20 km x 20 km, 97 x 97 samples, north row first.\n"
  "// Byte 0 = sea, 1-255 = land scaled between hmin and hmax metres.\n"
  "// Source: Mapzen/Tilezen terrain tiles on AWS Open Data (SRTM, GMTED, ETOPO1, NED and others).\n"
  "window.TERRAIN = " + json.dumps(out, separators=(",", ":")) + ";\n")

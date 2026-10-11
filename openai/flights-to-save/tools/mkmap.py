import json, math, base64, sys
from PIL import Image, ImageDraw
topo = json.load(open(sys.argv[1]))
sx, sy = topo["transform"]["scale"]; tx, ty = topo["transform"]["translate"]
arcs = []
for a in topo["arcs"]:
    x = y = 0; pts = []
    for dx, dy in a:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def ring(idx):
    out = []
    for i in idx:
        pts = arcs[i] if i >= 0 else arcs[~i][::-1]
        out.extend(pts if not out else pts[1:])
    return out
A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796
M = math.sqrt(3) / 2
def ee(lon, lat):  # Equal Earth
    l = math.radians(lon); p = math.radians(lat)
    t = math.asin(M * math.sin(p)); t2 = t * t; t6 = t2 ** 3
    x = l * math.cos(t) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
    y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return x, y
LAT_MIN, LAT_MAX = -80, 84
X0, X1 = ee(-180, 0)[0], ee(180, 0)[0]
Y0, Y1 = ee(0, LAT_MIN)[1], ee(0, LAT_MAX)[1]
COLS = 240
ROWS = round(COLS * (Y1 - Y0) / (X1 - X0))
K = 8
img = Image.new("L", (COLS * K, ROWS * K), 0); d = ImageDraw.Draw(img)
def px(lon, lat):
    x, y = ee(lon, max(LAT_MIN - 5, min(LAT_MAX + 5, lat)))
    return ((x - X0) / (X1 - X0) * COLS * K, (Y1 - y) / (Y1 - Y0) * ROWS * K)
for g in topo["objects"]["land"]["geometries"]:
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    for poly in polys:
        for j, r in enumerate(poly):
            rr = ring(r)
            wraps = any(abs(rr[i][0] - rr[i - 1][0]) > 180 for i in range(1, len(rr)))
            if wraps and min(la for lo, la in rr) > -60:  # unwrap across the date line, draw on both edges
                un = [rr[0]]; off = 0
                for i in range(1, len(rr)):
                    dl = rr[i][0] - rr[i - 1][0]
                    if dl > 180: off -= 360
                    elif dl < -180: off += 360
                    un.append((rr[i][0] + off, rr[i][1]))
                for shift in (0, -360, 360):
                    q = [px(lo + shift, la) for lo, la in un]
                    d.polygon(q, fill=255 if j == 0 else 0)
                continue
            pts = [px(lo, la) for lo, la in rr]
            if len(pts) > 2: d.polygon(pts, fill=255 if j == 0 else 0)
bits = []
for r in range(ROWS):
    for c in range(COLS):
        bits.append(1 if img.getpixel((c * K + K // 2, r * K + K // 2)) > 0 else 0)
by = bytearray()
for i in range(0, len(bits), 8):
    v = 0
    for b in bits[i:i + 8]: v = (v << 1) | b
    by.append(v << (8 - len(bits[i:i + 8])) if len(bits[i:i+8]) < 8 else v)
print(json.dumps({"cols": COLS, "rows": ROWS, "latMin": LAT_MIN, "latMax": LAT_MAX, "dots": sum(bits), "mask": base64.b64encode(bytes(by)).decode()}))
img.resize((COLS * 2, ROWS * 2)).save(sys.argv[2])

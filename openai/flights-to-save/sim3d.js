// Real-time 3D flight view (three.js / WebGL).
// Exposes window.Sim3D.create(container, hudEl) → controller, or null if WebGL is unavailable.
(function () {
  "use strict";
  const T = window.THREE;

  // ---- Scale and motion ----
  const TILE = 4000;              // terrain tile size (world units ≈ metres)
  const SEGMENTS = 96;            // terrain grid resolution per tile (matches terrain.js grids)
  const REAL_SIZE_M = 20000;      // real terrain patch edge, metres
  const M_TO_UNITS = TILE / REAL_SIZE_M;
  const RWY = { len: 1500, width: 70, z: 1100, margin: 140 };   // runway in the home tile, heading 360
  const VR = 56;                  // rotation speed in units/s (~152 kt)
  const MAX_TRIM = 40;            // how far W/S can move the plane off its assigned altitude (units)
  const FT_TO_UNITS = 0.056;      // compresses game feet into the visible scene
  const CRUISE_SPEED = 100;       // units per second, shown as ~272 knots

  // ---- Weather, light and terrain for each accident ----
  const ENVS = {
    tenerife: { // fog over volcanic hills
      water: 0x24485e, snowLine: 3200,
      skyTop: 0x7f8d99, horizon: 0xc4ccd3, below: 0x8c9196, fog: 0xbfc7ce, fogDensity: 0.00085,
      sun: { elev: 28, az: -30, color: 0xfff0dc, intensity: 1.4 }, hemi: [0xdfe5ea, 0x5b5649, 1.4],
      terrain: [0x45463a, 0x645d4a, 0x8a857a], heightScale: 240,
      clouds: { count: 80, base: 140, top: 520, color: 0xe4e8ec, opacity: 0.85, size: 520 }
    },
    jal123: { // sunset over steep forested mountains
      snowLine: 99999,
      skyTop: 0x2c4a7c, horizon: 0xf4a35c, below: 0x6b4a3a, fog: 0xc98e66, fogDensity: 0.0003,
      sun: { elev: 4, az: 60, color: 0xffa25a, intensity: 2.6 }, hemi: [0xffd2a8, 0x2a2a22, 0.9],
      terrain: [0x1b3320, 0x2d4f2c, 0x6a6656], heightScale: 560, ridged: true,
      clouds: { count: 40, base: 800, top: 1400, color: 0xf5c29a, opacity: 0.8, size: 600 }
    },
    charkhi: { // night over the plains west of Delhi
      skyTop: 0x02050c, horizon: 0x1b2436, below: 0x0b0d12, fog: 0x121826, fogDensity: 0.00038, night: true,
      sun: { elev: 38, az: -120, color: 0x9fb3e6, intensity: 0.35 }, hemi: [0x31405e, 0x0a0a0a, 0.35],
      terrain: [0x15180f, 0x1e2117, 0x272a20], heightScale: 60, lights: 500,
      clouds: { count: 20, base: 600, top: 900, color: 0x2a3245, opacity: 0.6, size: 500 }
    },
    thy981: { // grey March day over the forests north of Paris
      skyTop: 0x5a7fae, horizon: 0xc6d2dd, below: 0x6f7a72, fog: 0xbdc9d4, fogDensity: 0.00042,
      sun: { elev: 38, az: 20, color: 0xfff6e6, intensity: 2.2 }, hemi: [0xdce6ee, 0x3c4a33, 1.2],
      terrain: [0x2a4423, 0x3b5a2d, 0x5c6c45], heightScale: 110, fields: true,
      clouds: { count: 60, base: 520, top: 1000, color: 0xf2f4f6, opacity: 0.9, size: 560 }
    },
    saudia163: { // dusk over the desert near Riyadh
      skyTop: 0x1d2c56, horizon: 0xe58d55, below: 0x5a4030, fog: 0xbd8460, fogDensity: 0.00032,
      sun: { elev: 3, az: -80, color: 0xff9650, intensity: 2.4 }, hemi: [0xffc49a, 0x3a2c20, 0.8],
      terrain: [0xa9774a, 0xc0935f, 0xd6b382], heightScale: 70, lights: 260,
      clouds: { count: 8, base: 900, top: 1200, color: 0xf0b08a, opacity: 0.7, size: 500 }
    },
    aa191: { // clear afternoon over Illinois farmland
      skyTop: 0x2a6cc4, horizon: 0xbad6f0, below: 0x6a7a5a, fog: 0xb3cbe3, fogDensity: 0.00026,
      sun: { elev: 52, az: 140, color: 0xfff8ec, intensity: 3.0 }, hemi: [0xcfe3f7, 0x4a5a2e, 1.1],
      terrain: [0x4c7633, 0x7d9045, 0xa7995a], heightScale: 45, fields: true,
      clouds: { count: 35, base: 700, top: 1100, color: 0xffffff, opacity: 0.95, size: 520 }
    },
    aa587: { // bright November morning over Queens
      water: 0x2f5266,
      skyTop: 0x3672c0, horizon: 0xd0dfec, below: 0x6c7470, fog: 0xc4d4e3, fogDensity: 0.0003,
      sun: { elev: 22, az: 110, color: 0xfff1dc, intensity: 2.7 }, hemi: [0xd8e6f2, 0x4a4c44, 1.1],
      terrain: [0x56644e, 0x6f7867, 0x8c8b82], heightScale: 40, fields: true,
      clouds: { count: 15, base: 900, top: 1300, color: 0xffffff, opacity: 0.9, size: 480 }
    },
    ci140: { // night approach into Nagoya
      water: 0x0c1622,
      skyTop: 0x03060d, horizon: 0x1e2638, below: 0x0a0c10, fog: 0x131a28, fogDensity: 0.00036, night: true,
      sun: { elev: 30, az: 90, color: 0xa6b8e8, intensity: 0.3 }, hemi: [0x2f3d5a, 0x0a0a0a, 0.35],
      terrain: [0x14170f, 0x1c1f16, 0x25281e], heightScale: 60, lights: 900,
      clouds: { count: 18, base: 650, top: 950, color: 0x283044, opacity: 0.6, size: 500 }
    },
    wt2120: { // hazy morning over the desert outside Jeddah
      water: 0x2a6476,
      skyTop: 0x4a82c0, horizon: 0xedd3ad, below: 0x8a6e50, fog: 0xdcc39e, fogDensity: 0.0004,
      sun: { elev: 16, az: 95, color: 0xffe2b8, intensity: 2.6 }, hemi: [0xf3dcc0, 0x5a4630, 1.0],
      terrain: [0xb08055, 0xc79a66, 0xdcbc8c], heightScale: 90,
      clouds: { count: 6, base: 1000, top: 1300, color: 0xf6e4cc, opacity: 0.6, size: 500 }
    },
    te901: { // Antarctic whiteout under a solid overcast
      water: 0xdbe4ec, snowLine: -1,
      skyTop: 0xdce2e8, horizon: 0xeef1f4, below: 0xe6eaee, fog: 0xe8ecf0, fogDensity: 0.00055,
      sun: { elev: 18, az: -150, color: 0xffffff, intensity: 1.0 }, hemi: [0xffffff, 0xd9e1ea, 2.4],
      terrain: [0xdfe6ee, 0xeef2f6, 0xffffff], heightScale: 620, ridged: true, overcast: 1500,
      clouds: { count: 30, base: 900, top: 1400, color: 0xf4f6f8, opacity: 0.8, size: 700 }
    },
    twa800: { // summer dusk over the Atlantic off Long Island
      skyTop: 0x24406e, horizon: 0xf0a868, below: 0x2a3a4a, fog: 0xb88f78, fogDensity: 0.0003,
      sun: { elev: 2, az: -60, color: 0xffa060, intensity: 2.2 }, hemi: [0xffcfa8, 0x1e2e3e, 0.9],
      terrain: [0x0f2f45, 0x14394f, 0x1a4358], heightScale: 6, ocean: true,
      clouds: { count: 15, base: 900, top: 1300, color: 0xf2b894, opacity: 0.75, size: 520 }
    },
    sr111: { // night over the sea off Nova Scotia
      skyTop: 0x02050c, horizon: 0x151d2c, below: 0x05080d, fog: 0x0e1420, fogDensity: 0.0004, night: true,
      sun: { elev: 30, az: 0, color: 0x9fb3e6, intensity: 0.3 }, hemi: [0x2b3954, 0x050505, 0.3],
      terrain: [0x06121c, 0x081722, 0x0a1b28], heightScale: 6, ocean: true,
      clouds: { count: 20, base: 600, top: 900, color: 0x262e40, opacity: 0.6, size: 500 }
    },
    af447: { // night thunderstorms over the equatorial Atlantic
      skyTop: 0x020409, horizon: 0x101826, below: 0x040609, fog: 0x0c121c, fogDensity: 0.0007, night: true, lightning: true, rain: true,
      sun: { elev: 30, az: 0, color: 0x8ea2d0, intensity: 0.2 }, hemi: [0x223048, 0x050505, 0.3],
      terrain: [0x050d14, 0x07121b, 0x091722], heightScale: 6, ocean: true,
      clouds: { count: 90, base: 600, top: 1500, color: 0x1c2433, opacity: 0.85, size: 800 }
    },
    ke801: { // night rain over the hills of Guam
      water: 0x0c1a26,
      skyTop: 0x03060c, horizon: 0x172030, below: 0x080a0e, fog: 0x101722, fogDensity: 0.0008, night: true, rain: true,
      sun: { elev: 30, az: 0, color: 0x9fb3e6, intensity: 0.25 }, hemi: [0x2b3954, 0x0a0a0a, 0.35],
      terrain: [0x0f1a10, 0x172417, 0x232d20], heightScale: 200, lights: 250,
      clouds: { count: 50, base: 400, top: 900, color: 0x222a38, opacity: 0.7, size: 600 }
    },
    jt610: { // early morning over the Java Sea
      skyTop: 0x4a86c6, horizon: 0xf2dcc0, below: 0x2e4a5c, fog: 0xd8d4c8, fogDensity: 0.00045,
      sun: { elev: 12, az: 80, color: 0xffd9a8, intensity: 2.4 }, hemi: [0xf0e2cc, 0x24404e, 1.0],
      terrain: [0x1d4f66, 0x22607a, 0x2a6f88], heightScale: 6, ocean: true,
      clouds: { count: 40, base: 700, top: 1200, color: 0xffffff, opacity: 0.9, size: 520 }
    },
    et302: { // morning over the Ethiopian highlands
      water: 0x3c5a5e,
      skyTop: 0x3d7cc6, horizon: 0xd8e4ee, below: 0x6a6a52, fog: 0xc9d6e2, fogDensity: 0.00035,
      sun: { elev: 30, az: 100, color: 0xfff4e0, intensity: 2.6 }, hemi: [0xdfe8f0, 0x4a4a32, 1.1],
      terrain: [0x5a6b3a, 0x7a7a4a, 0x9a8a66], heightScale: 320, fields: true,
      clouds: { count: 30, base: 800, top: 1200, color: 0xffffff, opacity: 0.9, size: 520 }
    },
    af4590: { // summer afternoon over the fields north of Paris
      skyTop: 0x2f78cc, horizon: 0xc4dcf2, below: 0x6a7a5a, fog: 0xb9d0e6, fogDensity: 0.0003,
      sun: { elev: 45, az: 200, color: 0xfff8ec, intensity: 3.0 }, hemi: [0xd2e4f6, 0x4a5a2e, 1.1],
      terrain: [0x5d7f3a, 0x8b9a4a, 0xb5a463], heightScale: 40, fields: true,
      clouds: { count: 20, base: 800, top: 1200, color: 0xffffff, opacity: 0.95, size: 520 }
    }
  };

  // ---- Airframe and livery for each accident ----
  const AIRCRAFT = {
    tenerife:  { type: "747",   body: 0xf4f6f8, tail: 0x00a1de, cheat: 0x00a1de },
    jal123:    { type: "747",   body: 0xf6f6f6, tail: 0xf6f6f6, cheat: 0xc8102e, tailMark: 0xc8102e },
    charkhi:   { type: "747",   body: 0xf2f2ee, tail: 0x1f6e3a, cheat: 0x1f6e3a },
    thy981:    { type: "dc10",  body: 0xf5f5f5, tail: 0xc8102e, cheat: 0xc8102e },
    saudia163: { type: "l1011", body: 0xf2f2ee, tail: 0x1f6e3a, cheat: 0x1f6e3a },
    aa191:     { type: "dc10",  body: 0xc4c9ce, tail: 0xc4c9ce, cheat: 0xb22234, cheat2: 0x2a4d9b },
    aa587:     { type: "a300",  body: 0xc4c9ce, tail: 0xc4c9ce, cheat: 0xb22234, cheat2: 0x2a4d9b },
    ci140:     { type: "a300",  body: 0xf5f5f5, tail: 0x1f4e9c, cheat: 0x1f4e9c },
    wt2120:    { type: "dc8",   body: 0xf4f4f4, tail: 0xb3262d, cheat: 0xb3262d },
    te901:     { type: "dc10",  body: 0xf5f5f5, tail: 0x0b6f8a, cheat: 0x0b6f8a },
    twa800:    { type: "747",   body: 0xf4f4f4, tail: 0xb3202a, cheat: 0xb3202a },
    sr111:     { type: "dc10",  body: 0xf5f5f5, tail: 0xd52b1e, cheat: 0xd52b1e, tailMark: 0xffffff },
    af447:     { type: "a300",  body: 0xf5f5f5, tail: 0x0a1f5c, cheat: 0x0a1f5c, tailMark: 0xd2232a },
    ke801:     { type: "747",   body: 0xa9d3ef, tail: 0xf5f5f5, cheat: 0xa9d3ef, tailMark: 0xd0103a },
    jt610:     { type: "737",   body: 0xf5f5f5, tail: 0xe31e24, cheat: 0xe31e24 },
    et302:     { type: "737",   body: 0xf5f5f5, tail: 0x078930, cheat: 0xfcdd09, tailMark: 0xda121a },
    af4590:    { type: "concorde", body: 0xf7f7f7, tail: 0xf7f7f7, cheat: 0x0a1f5c }
  };

  // ---- Periodic value noise so terrain tiles repeat seamlessly ----
  function hash(i, j) {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function vnoise(x, z, period) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi, zf = z - zi;
    const w = (i) => ((i % period) + period) % period;
    const a = hash(w(xi), w(zi)), b = hash(w(xi + 1), w(zi));
    const c = hash(w(xi), w(zi + 1)), d = hash(w(xi + 1), w(zi + 1));
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function terrainNoise(u, v, ridged) {
    let sum = 0, amp = 0.5, norm = 0, period = 5;
    for (let o = 0; o < 5; o++) {
      let n = vnoise(u * period, v * period, period);
      if (ridged) n = 1 - Math.abs(2 * n - 1);
      sum += n * amp; norm += amp; amp *= 0.5; period *= 2;
    }
    return sum / norm;
  }

  // ---- Small canvas textures ----
  function canvasTexture(size, draw) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d"), size);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }
  function puffTexture() {
    return canvasTexture(256, (g, s) => {
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 18; i++) {
        const x = s * (0.25 + rnd() * 0.5), y = s * (0.35 + rnd() * 0.3), r = s * (0.12 + rnd() * 0.16);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(255,255,255,0.55)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    });
  }
  function glowTexture() {
    return canvasTexture(64, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(255,255,255,0.6)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }

  function runwayTexture() {
    return canvasTexture(2048, (g, s) => {
      // drawn on a square canvas, stretched over a 70 x 1500 strip: x is across, y is along (top = north end)
      const W = s, Hh = s, kx = W / RWY.width, ky = Hh / RWY.len;
      g.fillStyle = "#34383d"; g.fillRect(0, 0, W, Hh);
      let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; g.fillRect(rnd() * W, rnd() * Hh, 3, 3); }
      g.fillStyle = "#e9ecef";
      g.fillRect(1.2 * kx, 0, 0.9 * kx, Hh); g.fillRect(W - 2.1 * kx, 0, 0.9 * kx, Hh);            // edge lines
      for (let y = 70; y < RWY.len - 70; y += 30) g.fillRect(W / 2 - 0.5 * kx, y * ky, 1 * kx, 15 * ky); // centreline
      const keys = (y0) => { for (let i = 0; i < 12; i++) { if (i === 5 || i === 6) continue; g.fillRect((4 + i * 5.4) * kx, y0 * ky, 3.2 * kx, 22 * ky); } };
      keys(RWY.len - 30); keys(8);                                                                   // threshold bars
      const tdz = (y0, dir) => { for (let k = 0; k < 3; k++) { const y = y0 + dir * k * 22; g.fillRect(14 * kx, y * ky, 4 * kx, 10 * ky); g.fillRect(W - 18 * kx, y * ky, 4 * kx, 10 * ky); } };
      tdz(RWY.len - 120, -1); tdz(110, 1);                                                           // touchdown zone
      g.font = `bold ${Math.round(28 * ky)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.save(); g.translate(W / 2, (RWY.len - 52) * ky); g.scale(kx / ky * 0.9, 1); g.fillText("36", 0, 0); g.restore();
      g.save(); g.translate(W / 2, 52 * ky); g.rotate(Math.PI); g.scale(kx / ky * 0.9, 1); g.fillText("18", 0, 0); g.restore();
    });
  }

  // ---- Cabin interior with seated passengers (only drawn in the Cabin camera) ----
  function buildCabin(spec, R, h, concorde) {
    const group = new T.Group();
    group.visible = false;
    const Ri = R * 0.93, floorY = -R * 0.36, ceilY = R * 0.66;
    const z0 = -h + (concorde ? 16 : 11), z1 = h - (concorde ? 10 : 15), len = z1 - z0;
    const wall = new T.MeshLambertMaterial({ color: 0xe9e6df, side: T.BackSide, emissive: 0x2a2620 });
    const shell = new T.Mesh(new T.CylinderGeometry(Ri, Ri, len, 40, 1, true), wall);
    shell.rotation.x = Math.PI / 2; shell.position.z = (z0 + z1) / 2; group.add(shell);
    const floorW = 2 * Math.sqrt(Ri * Ri - floorY * floorY);
    const carpet = new T.Mesh(new T.PlaneGeometry(floorW, len), new T.MeshLambertMaterial({ color: 0x3a4250, emissive: 0x0c0f14 }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, floorY, (z0 + z1) / 2); group.add(carpet);
    const ceilW = 2 * Math.sqrt(Math.max(0, Ri * Ri - ceilY * ceilY));
    const ceiling = new T.Mesh(new T.PlaneGeometry(ceilW, len), new T.MeshLambertMaterial({ color: 0xf4f2ec, emissive: 0x5a5650, side: T.DoubleSide }));
    ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, ceilY, (z0 + z1) / 2); group.add(ceiling);
    for (const s of [-1, 1]) { // overhead bins
      const bin = new T.Mesh(new T.BoxGeometry(0.55, 0.42, len), new T.MeshLambertMaterial({ color: 0xf1efe9, emissive: 0x3c3a36 }));
      bin.position.set(s * (ceilW / 2 - 0.1), ceilY - 0.28, (z0 + z1) / 2); group.add(bin);
    }
    const lamp = new T.PointLight(0xfff1dc, 30, 70, 1);
    lamp.position.set(0, ceilY - 0.3, (z0 + z1) / 2); group.add(lamp);

    // Seat blocks and aisles
    const blocks = concorde ? [2, 2] : R > 2.8 ? [3, 4, 3] : [3, 3];
    const seats = blocks.reduce((a, b) => a + b, 0), aisles = blocks.length - 1, aisleW = 0.5;
    const seatW = Math.min(0.52, (floorW * 0.9 - aisles * aisleW) / seats);
    const xs = [], aisleXs = [];
    let x = -(seats * seatW + aisles * aisleW) / 2;
    blocks.forEach((n, bi) => { for (let k = 0; k < n; k++) { xs.push(x + seatW / 2); x += seatW; } if (bi < aisles) { aisleXs.push(x + aisleW / 2); x += aisleW; } });
    const pitchZ = 0.86, rows = Math.floor(len / pitchZ);
    const seatGeo = new T.BoxGeometry(seatW * 0.9, 0.14, 0.46), backGeo = new T.BoxGeometry(seatW * 0.9, 0.62, 0.1);
    const seatMat = new T.MeshLambertMaterial({ color: new T.Color(spec.cheat).lerp(new T.Color(0x2a3140), 0.45), emissive: 0x15181e });
    const count = rows * xs.length;
    const cushions = new T.InstancedMesh(seatGeo, seatMat, count), backs = new T.InstancedMesh(backGeo, seatMat, count);
    const m4 = new T.Matrix4();
    const seatPos = [];
    for (let r = 0; r < rows; r++) for (const sx of xs) {
      const sz = z0 + 0.6 + r * pitchZ;
      seatPos.push([sx, sz]);
      const i = seatPos.length - 1;
      cushions.setMatrixAt(i, m4.makeTranslation(sx, floorY + 0.42, sz));
      backs.setMatrixAt(i, m4.makeTranslation(sx, floorY + 0.75, sz + 0.24));
    }
    group.add(cushions, backs);

    // Passengers (about nine in ten seats taken), each a torso and a head
    let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const taken = seatPos.filter(() => rnd() < 0.9);
    const torsoGeo = new T.BoxGeometry(seatW * 0.62, 0.46, 0.24), headGeo = new T.SphereGeometry(0.11, 10, 8);
    const torsos = new T.InstancedMesh(torsoGeo, new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2a2a }), taken.length);
    const heads = new T.InstancedMesh(headGeo, new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a3028 }), taken.length);
    const clothes = [0x2f4a6d, 0x7a2e2e, 0x3d5a3a, 0x5b4a7a, 0xb08a3e, 0x2b2b2b, 0x8a8f96, 0xc45a3c, 0x1f6f78, 0xd8d2c4].map((c) => new T.Color(c));
    const skin = [0xf1d1b5, 0xd9a882, 0xb47b57, 0x8a5a3c, 0x5e3b26].map((c) => new T.Color(c));
    const col = new T.Color();
    taken.forEach((p, i) => {
      torsos.setColorAt(i, col.copy(clothes[Math.floor(rnd() * clothes.length)]));
      heads.setColorAt(i, col.copy(skin[Math.floor(rnd() * skin.length)]));
    });
    group.add(torsos, heads);

    // Cabin crew standing in the aisles near the front
    const crewMat = new T.MeshLambertMaterial({ color: new T.Color(spec.cheat).lerp(new T.Color(0x111111), 0.2) });
    const crew = aisleXs.slice(0, 2).map((ax, k) => {
      const c = new T.Group();
      const body = new T.Mesh(new T.BoxGeometry(0.36, 1.0, 0.24), crewMat); body.position.y = floorY + 0.95; c.add(body);
      const legs = new T.Mesh(new T.BoxGeometry(0.28, 0.5, 0.2), new T.MeshLambertMaterial({ color: 0x1d1f24 })); legs.position.y = floorY + 0.25; c.add(legs);
      const head = new T.Mesh(headGeo, new T.MeshLambertMaterial({ color: skin[k + 1] })); head.position.y = floorY + 1.58; c.add(head);
      c.position.set(ax, 0, z0 + 2.5 + k * 3); group.add(c);
      return c;
    });

    // Oxygen masks above every passenger, hidden until needed
    const masks = new T.InstancedMesh(new T.ConeGeometry(0.06, 0.12, 8), new T.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x332600 }), taken.length);
    masks.visible = false; group.add(masks);

    const eyeX = aisleXs[0] || 0;
    return {
      group, lamp, torsos, heads, masks, crew, taken, floorY, ceilY,
      eye: new T.Vector3(eyeX, floorY + 1.2, z1 - 1.2), look: new T.Vector3(eyeX, floorY + 0.95, z0),
      // Pose every passenger: sway with the aircraft, brace when it goes down
      pose(t, jolt, brace) {
        const q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(1, 1, 1), v = new T.Vector3();
        taken.forEach(([sx, sz], i) => {
          const sway = Math.sin(t * 1.7 + i * 0.7) * 0.012 + (Math.random() - 0.5) * jolt * 0.08;
          const lean = brace ? 0.75 : sway * 2;
          e.set(lean, 0, sway); q.setFromEuler(e);
          torsos.setMatrixAt(i, m4.compose(v.set(sx, floorY + 0.72 - (brace ? 0.12 : 0), sz + 0.08 - (brace ? 0.18 : 0)), q, sc));
          heads.setMatrixAt(i, m4.compose(v.set(sx + sway, floorY + (brace ? 0.82 : 1.08) + jolt * (Math.random() - 0.5) * 0.06, sz + 0.02 - (brace ? 0.34 : 0)), q, sc));
          masks.setMatrixAt(i, m4.compose(v.set(sx, ceilY - 0.5 + Math.sin(t * 3 + i) * 0.03, sz - 0.1), q.identity(), sc));
        });
        torsos.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true; masks.instanceMatrix.needsUpdate = true;
      }
    };
  }

  // ---- Airliner built from primitives (nose points to -Z, ~60 units long) ----
  function buildAircraft(spec) {
    const g = new T.Group();
    const metal = (hex, rough = 0.42, metalness = 0.35) => new T.MeshStandardMaterial({ color: hex, roughness: rough, metalness });
    const bodyMat = metal(spec.body, 0.38, spec.body === 0xc4c9ce ? 0.75 : 0.25);
    const tailMat = metal(spec.tail, 0.45, 0.25);
    const wingMat = new T.MeshStandardMaterial({ color: 0xb9c0c7, roughness: 0.5, metalness: 0.45, side: T.DoubleSide });
    const darkMat = new T.MeshStandardMaterial({ color: 0x16191d, roughness: 0.3, metalness: 0.2 });
    const engMat = metal(0xd9dde1, 0.35, 0.5);

    const concorde = spec.type === "concorde";
    const len = { dc8: 54, a300: 52, "737": 40, concorde: 62 }[spec.type] || 60;
    const R = { "747": 3.3, dc8: 2.2, "737": 2.0, concorde: 1.5 }[spec.type] || 3.0;
    const h = len / 2;

    // Fuselage: lathe profile around the long axis
    const prof = (concorde ? [
      [0, h], [R * 0.2, h - 2], [R * 0.5, h - 5], [R * 0.8, h - 9], [R, h - 14],
      [R, -h + 8], [R * 0.75, -h + 3], [R * 0.4, -h + 0.8], [0.1, -h]
    ] : [
      [0, h], [R * 0.38, h - 0.6], [R * 0.7, h - 1.8], [R * 0.92, h - 3.6], [R, h - 6],
      [R, -h + 16], [R * 0.9, -h + 10], [R * 0.66, -h + 5], [R * 0.34, -h + 1.4], [0.12, -h]
    ]).reverse().map(([r, y]) => new T.Vector2(r, y)); // tail → nose so faces point outward
    const fus = new T.LatheGeometry(prof, 36);
    fus.rotateX(-Math.PI / 2);
    g.add(new T.Mesh(fus, bodyMat));

    if (spec.type === "747") { // upper-deck hump
      const hump = new T.SphereGeometry(1, 28, 16);
      hump.scale(R * 0.8, R * 0.62, 11);
      hump.translate(0, R * 0.55, -h + 13);
      g.add(new T.Mesh(hump, bodyMat));
    }

    // Cheatline + window band, both sides
    const lineGeo = new T.BoxGeometry(0.06, 0.55, len - 12);
    const winGeo = new T.BoxGeometry(0.06, 0.32, len - 16);
    for (const s of [-1, 1]) {
      const cl = new T.Mesh(lineGeo, metal(spec.cheat, 0.5, 0.2));
      cl.position.set(s * (R - 0.02), -0.25, 1); g.add(cl);
      if (spec.cheat2) {
        const c2 = new T.Mesh(lineGeo, metal(spec.cheat2, 0.5, 0.2));
        c2.position.set(s * (R - 0.08), -0.85, 1); c2.scale.y = 0.7; g.add(c2);
      }
      const w = new T.Mesh(winGeo, darkMat);
      w.position.set(s * (R + 0.01), 0.6, 1.5); g.add(w);
    }
    // Cockpit windows
    const cw = new T.Mesh(new T.BoxGeometry(R * 1.1, 0.5, 1.4), darkMat);
    cw.position.set(0, R * (concorde ? 0.55 : 0.42), concorde ? -h + 10 : -h + 3.1); cw.rotation.x = -0.45; g.add(cw);

    // Wings (planform in x = span, y = forward; extruded for thickness)
    const span = { "747": 31, dc8: 22, "737": 17, concorde: 12 }[spec.type] || 24;
    const wingShape = new T.Shape();
    if (concorde) { // slender delta
      wingShape.moveTo(0, 6); wingShape.quadraticCurveTo(3, -4, span, -22); wingShape.lineTo(span, -25.5); wingShape.lineTo(0, -25.5);
    } else {
      wingShape.moveTo(0, 7); wingShape.lineTo(span, -span * 0.55 + 4); wingShape.lineTo(span, -span * 0.55 + 1.6); wingShape.lineTo(0, -6);
    }
    const wingGeo = new T.ExtrudeGeometry(wingShape, { depth: 0.7, bevelEnabled: false });
    wingGeo.rotateX(-Math.PI / 2);
    for (const s of [-1, 1]) {
      const w = new T.Mesh(wingGeo, wingMat);
      w.scale.x = s; w.position.set(s * R * 0.4, -R * 0.55, 2); w.rotation.z = concorde ? 0 : s * 0.07;
      g.add(w);
    }

    // Horizontal stabilisers
    const hs = new T.Shape();
    const hsSpan = span * 0.38;
    hs.moveTo(0, -h + 13); hs.lineTo(hsSpan, -h + 6); hs.lineTo(hsSpan, -h + 4); hs.lineTo(0, -h + 6.5);
    const hsGeo = new T.ExtrudeGeometry(hs, { depth: 0.4, bevelEnabled: false });
    hsGeo.rotateX(-Math.PI / 2);
    if (!concorde) for (const s of [-1, 1]) {
      const m = new T.Mesh(hsGeo, wingMat);
      m.scale.x = s; m.position.set(0, 0.4, 0); g.add(m);
    }

    // Vertical fin (shape x = forward, y = up)
    const finH = { "747": 13, "737": 8, concorde: 9 }[spec.type] || 11;
    const fin = new T.Shape();
    if (concorde) { fin.moveTo(-h + 16, 0); fin.lineTo(-h + 3, finH); fin.lineTo(-h + 1.2, finH); fin.lineTo(-h + 0.5, 0); }
    else { fin.moveTo(-h + 13, 0); fin.lineTo(-h + 4.5, finH); fin.lineTo(-h + 1.5, finH); fin.lineTo(-h + 0.6, 0); }
    const finGeo = new T.ExtrudeGeometry(fin, { depth: 0.6, bevelEnabled: false });
    finGeo.rotateY(Math.PI / 2);
    finGeo.translate(-0.3, R * 0.6, 0);
    g.add(new T.Mesh(finGeo, tailMat));
    if (spec.tailMark) { // red disc on a white tail
      const disc = new T.Mesh(new T.CircleGeometry(2.2, 28), metal(spec.tailMark, 0.5, 0.1));
      for (const s of [-1, 1]) {
        const d = disc.clone(); d.rotation.y = s * Math.PI / 2; d.position.set(s * 0.33, R * 0.6 + finH * 0.55, h - 6); g.add(d);
      }
    }

    // Engines
    const engine = (x, y, z, scale = 1) => {
      const e = new T.Group();
      const nac = new T.CylinderGeometry(1.45 * scale, 1.15 * scale, 6 * scale, 24, 1, true);
      nac.rotateX(Math.PI / 2);
      e.add(new T.Mesh(nac, new T.MeshStandardMaterial({ color: 0xd9dde1, roughness: 0.35, metalness: 0.5, side: T.DoubleSide })));
      const fan = new T.Mesh(new T.CircleGeometry(1.4 * scale, 24), darkMat);
      fan.position.z = -2.9 * scale; fan.rotation.y = Math.PI; e.add(fan);
      const core = new T.Mesh(new T.ConeGeometry(0.7 * scale, 2 * scale, 16), engMat);
      core.rotation.x = -Math.PI / 2; core.position.z = 3.6 * scale; e.add(core);
      e.position.set(x, y, z);
      g.add(e);
      return e;
    };
    const wingZ = (x) => -(7 - (Math.abs(x) / span) * (span * 0.55 - 4 + 7)) + 2;
    const under = -R * 0.55 - 2.1;
    const pylon = (x) => {
      const p = new T.Mesh(new T.BoxGeometry(0.4, 1.6, 4), wingMat);
      p.position.set(x, under + 1.1, wingZ(x) + 0.5); g.add(p);
    };
    const pods = spec.type === "747" ? [10, 19] : spec.type === "dc8" ? [7, 13.5] : spec.type === "737" ? [6.2] : concorde ? [] : [9.5];
    const scale = spec.type === "dc8" ? 0.72 : spec.type === "737" ? 0.78 : 1;
    for (const x of pods) for (const s of [-1, 1]) { engine(s * x, under, wingZ(s * x) - 1.5, scale); pylon(s * x); }
    if (concorde) for (const s of [-1, 1]) { // twin-engine nacelle box under each wing
      const box = new T.Mesh(new T.BoxGeometry(3.4, 1.7, 12), engMat);
      box.position.set(s * 4.6, -R * 0.55 - 1.1, 19); g.add(box);
      const intake = new T.Mesh(new T.PlaneGeometry(3.1, 1.4), darkMat);
      intake.position.set(s * 4.6, -R * 0.55 - 1.1, 12.95); intake.rotation.y = Math.PI; g.add(intake);
    }
    if (spec.type === "dc10") engine(0, R + 1.6, h - 9, 0.95);      // through the fin
    if (spec.type === "l1011") engine(0, R * 0.25, h - 1.5, 0.9);   // S-duct exhaust at the tail

    // Landing gear (nose + two main legs), retractable
    const gear = new T.Group();
    const drop = R + 2.6;
    const wheelGeo = new T.CylinderGeometry(1.1, 1.1, 0.8, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const strutGeo = new T.CylinderGeometry(0.22, 0.22, 1, 8);
    const leg = (lx, lz) => {
      const st = new T.Mesh(strutGeo, darkMat);
      st.scale.y = drop - R * 0.6; st.position.set(lx, -(R * 0.6 + (drop - R * 0.6) / 2), lz); gear.add(st);
      for (const k of [-0.55, 0.55]) { const w = new T.Mesh(wheelGeo, darkMat); w.position.set(lx + k, -drop, lz); gear.add(w); }
    };
    leg(0, -h + (concorde ? 14 : 7));
    for (const s of [-1, 1]) leg(s * R * 0.75, concorde ? 10 : 4);
    g.add(gear);
    g.userData.gear = gear;
    g.userData.cabin = buildCabin(spec, R, h, concorde);
    g.add(g.userData.cabin.group);
    g.userData.groundY = drop + 1.1;   // fuselage axis height when sitting on the wheels

    for (const m of g.children) m.castShadow = false;

    // Navigation lights: red left, green right, white strobes
    const glow = glowTexture();
    const nav = [];
    const light = (hex, x, y, z, size, blink) => {
      const s = new T.Sprite(new T.SpriteMaterial({ map: glow, color: hex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      s.position.set(x, y, z); s.scale.setScalar(size); g.add(s);
      nav.push({ s, blink, size });
    };
    const tipZ = concorde ? 24.5 : span * 0.55 - 0.8;
    const tipY = concorde ? -R * 0.55 + 0.4 : -R * 0.55 + span * 0.07 + 0.35;
    light(0xff2a2a, -span - R * 0.4, tipY, tipZ, 3.2, null);
    light(0x2aff6a, span + R * 0.4, tipY, tipZ, 3.2, null);
    light(0xffffff, -span - R * 0.4, tipY, tipZ + 1, 5, 0);
    light(0xffffff, span + R * 0.4, tipY, tipZ + 1, 5, 0);
    light(0xff3020, 0, R + 0.2, -2, 3.5, 0.6);
    light(0xffffff, 0, R * 0.6 + 0.5, h - 0.5, 3.5, 0.2);
    g.userData.nav = nav;
    g.userData.length = len;
    return g;
  }

  function create(container, hud, onEvent) {
    const emit = (type, data) => { if (onEvent) onEvent(type, data); };
    if (!T) return null;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (e) {
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.className = "sim-canvas";
    container.prepend(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(50, 1, 0.5, 22000);
    scene.fog = new T.FogExp2(0xffffff, 0.0004);

    // Sky dome
    const skyUniforms = {
      top: { value: new T.Color() }, horizon: { value: new T.Color() }, below: { value: new T.Color() },
      sunColor: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) }
    };
    const sky = new T.Mesh(
      new T.SphereGeometry(9000, 32, 16),
      new T.ShaderMaterial({
        uniforms: skyUniforms, side: T.BackSide, depthWrite: false, fog: false,
        vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: [
          "uniform vec3 top; uniform vec3 horizon; uniform vec3 below; uniform vec3 sunColor; uniform vec3 sunDir;",
          "varying vec3 vDir;",
          "void main(){",
          "  vec3 d = normalize(vDir); float h = d.y;",
          "  vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.5)) : mix(horizon, below, min(1.0, -h * 5.0));",
          "  float s = max(dot(d, normalize(sunDir)), 0.0);",
          "  col += sunColor * (pow(s, 1200.0) * 6.0 + pow(s, 10.0) * 0.3);",
          "  gl_FragColor = vec4(col, 1.0);",
          "  #include <tonemapping_fragment>",
          "  #include <colorspace_fragment>",
          "}"
        ].join("\n")
      })
    );
    sky.renderOrder = -1;
    scene.add(sky);

    // Stars for night scenes
    const starGeo = new T.BufferGeometry();
    {
      const pos = [];
      for (let i = 0; i < 1400; i++) {
        const th = Math.random() * Math.PI * 2, y = 0.05 + Math.random() * 0.95, r = Math.sqrt(1 - y * y);
        pos.push(Math.cos(th) * r * 8500, y * 8500, Math.sin(th) * r * 8500);
      }
      starGeo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    }
    const stars = new T.Points(starGeo, new T.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    scene.add(stars);

    // Lights
    const hemi = new T.HemisphereLight(0xffffff, 0x444444, 1);
    const sun = new T.DirectionalLight(0xffffff, 2);
    scene.add(hemi, sun, sun.target);
    const flash = new T.PointLight(0xff7a2a, 0, 900, 2);
    scene.add(flash);

    // Terrain tiles sharing one geometry
    const terrainGeo = new T.PlaneGeometry(TILE, TILE, SEGMENTS, SEGMENTS);
    terrainGeo.rotateX(-Math.PI / 2);
    terrainGeo.setAttribute("color", new T.Float32BufferAttribute(new Float32Array(terrainGeo.attributes.position.count * 3), 3));
    const terrainMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
    const lightsMat = new T.PointsMaterial({ size: 14, vertexColors: true, blending: T.AdditiveBlending, depthWrite: false, transparent: true, map: glowTexture(), alphaTest: 0.01 });
    const tiles = [];
    for (let c = -2; c <= 2; c++) {
      for (let r = -2; r <= 2; r++) {
        const m = new T.Mesh(terrainGeo, terrainMat);
        m.userData = { col: c, row: r };
        scene.add(m);
        tiles.push(m);
      }
    }
    let lightsGeo = null;
    const water = new T.Mesh(new T.PlaneGeometry(40000, 40000), new T.MeshStandardMaterial({ color: 0x2b5871, roughness: 0.3, metalness: 0.15 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.5;
    water.visible = false;
    scene.add(water);

    // Runway: marked asphalt strip with edge, threshold and end lights
    const runway = new T.Mesh(new T.PlaneGeometry(RWY.width, RWY.len), new T.MeshStandardMaterial({ map: runwayTexture(), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    runway.rotation.x = -Math.PI / 2;
    runway.visible = false;
    scene.add(runway);
    const rwyLights = (() => {
      const p = [], c = [], white = new T.Color(0xfff4d6), green = new T.Color(0x3dff7a), red = new T.Color(0xff3b30);
      const add = (lx, lz, col) => { p.push(lx, 0.8, lz); c.push(col.r, col.g, col.b); };
      for (let lz = -RWY.len / 2; lz <= RWY.len / 2; lz += 50) { add(-RWY.width / 2 - 2, lz, white); add(RWY.width / 2 + 2, lz, white); }
      for (let lx = -RWY.width / 2; lx <= RWY.width / 2; lx += 7) { add(lx, RWY.len / 2 + 3, green); add(lx, -RWY.len / 2 - 3, red); }
      for (let k = 1; k <= 8; k++) add(0, RWY.len / 2 + 25 * k, white);   // approach lights
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
      geo.setAttribute("color", new T.Float32BufferAttribute(c, 3));
      return new T.Points(geo, new T.PointsMaterial({ size: 9, vertexColors: true, map: glowTexture(), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    })();
    runway.add(rwyLights);
    rwyLights.rotation.x = Math.PI / 2;

    // Rain streaks around the camera (KE 801, AF 447)
    const RAIN_N = 1600;
    const rainGeo = new T.BufferGeometry();
    const rainPos = new Float32Array(RAIN_N * 6), drops = new Float32Array(RAIN_N * 3);
    for (let i = 0; i < RAIN_N; i++) { drops[i * 3] = (Math.random() - 0.5) * 500; drops[i * 3 + 1] = (Math.random() - 0.5) * 400; drops[i * 3 + 2] = (Math.random() - 0.5) * 500; }
    rainGeo.setAttribute("position", new T.BufferAttribute(rainPos, 3));
    const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: 0xa9b8cc, transparent: true, opacity: 0.35 }));
    rain.frustumCulled = false;
    rain.visible = false;
    scene.add(rain);

    // Clouds
    const puff = puffTexture();
    const clouds = [];
    const cloudGroup = new T.Group();
    scene.add(cloudGroup);
    let overcast = null;

    // Crash smoke and fire
    const smokeMatBase = new T.SpriteMaterial({ map: puff, color: 0x2a2826, transparent: true, depthWrite: false, opacity: 0 });
    const fireMatBase = new T.SpriteMaterial({ map: glowTexture(), color: 0xff8a2a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
    const smoke = [], fire = [];
    for (let i = 0; i < 70; i++) {
      const s = new T.Sprite(smokeMatBase.clone()); s.visible = false; scene.add(s);
      smoke.push({ s, life: 0, max: 1, vel: new T.Vector3() });
    }
    for (let i = 0; i < 8; i++) {
      const s = new T.Sprite(fireMatBase.clone()); s.visible = false; scene.add(s); fire.push(s);
    }

    // State
    let env = null, envId = null;
    let plane = null;
    let baseY = 300;
    let y = 600, targetY = 600, vy = 0, pitch = 0;
    let mode = "fly";           // fly | crashing | crashed
    let speed = CRUISE_SPEED;
    let x = 0, z = 0, t = 0;
    let yaw = 0, roll = 0, trim = 0;   // pilot input: heading, bank, altitude trim
    // Held controls. W A S D for casual play; arrows, rudder, throttle and brakes for pilots.
    const keys = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false,
                   rudderL: false, rudderR: false, thrUp: false, thrDn: false, brake: false };
    const KEYMAP = { w: "w", a: "a", s: "s", d: "d", arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right",
                     ",": "rudderL", ".": "rudderR", pageup: "thrUp", "+": "thrUp", "=": "thrUp", pagedown: "thrDn", "-": "thrDn", b: "brake" };
    let thr = 0, flaps = 1, gearDown = true, groundY = 0, liftT = 0, said = {}, handoffT = 99;
    let shake = 0, smokeTimer = 0;
    let fovKick = 0, distKick = 0;   // camera zoom punches
    let lightningT = 3, strike = 0;   // storm flashes (AF 447)
    let running = false, last = 0, hudTimer = 0;
    let viewIndex = 0;
    const VIEWS = [
      { name: "Chase" },
      { name: "Wing", off: new T.Vector3(40, 5, 14), look: new T.Vector3(0, 0, -24) },
      { name: "Cockpit", off: new T.Vector3(0, 2.4, -25.8), look: new T.Vector3(0, 1.2, -400) },
      { name: "Cabin", cabin: true }
    ];
    const camPos = new T.Vector3(40, 620, 80);
    const tmpV = new T.Vector3(), tmpL = new T.Vector3();
    const fwd = new T.Vector3(0, 0, -1), right = new T.Vector3(1, 0, 0), UP = new T.Vector3(0, 1, 0);

    function placeCloud(s, initial) {
      const along = initial ? 300 + Math.random() * 7000 : 6000 + Math.random() * 2000;
      const side = (Math.random() - 0.5) * 5000;
      s.position.x = x + fwd.x * along + right.x * side;
      s.position.z = z + fwd.z * along + right.z * side;
    }

    // Real terrain: decoded grid (north row first) repeated with mirroring so tiles join seamlessly
    let real = null;
    function decodeReal(id) {
      const d = window.TERRAIN && window.TERRAIN[id];
      if (!d) return null;
      const raw = atob(d.b), n = SEGMENTS + 1;
      const h = new Float32Array(n * n), sea = new Uint8Array(n * n);
      const scale = (d.hmax - d.hmin) / 254 * M_TO_UNITS;
      for (let i = 0; i < n * n; i++) {
        const v = raw.charCodeAt(i);
        sea[i] = v === 0 ? 1 : 0;
        h[i] = v === 0 ? -4 : (v - 1) * scale;
      }
      const flat = new Float32Array(n * n);
      let rwyElev = null;
      if (d.water < 0.9) { // carve a level runway, with a grass margin, into the real ground
        const local = (i) => [-TILE / 2 + (i % n) / SEGMENTS * TILE, -TILE / 2 + Math.floor(i / n) / SEGMENTS * TILE];
        const out = (i) => { const [lx, lz] = local(i); return Math.max(Math.abs(lx) - RWY.width / 2, Math.abs(lz - RWY.z) - RWY.len / 2); };
        const inside = [];
        for (let i = 0; i < n * n; i++) if (out(i) <= 0) inside.push(sea[i] ? 2 : h[i]);
        inside.sort((a, b) => a - b);
        rwyElev = Math.max(2, inside[Math.floor(inside.length / 2)] || 2);
        for (let i = 0; i < n * n; i++) {
          const o = out(i);
          if (o >= RWY.margin) continue;
          const tt = o <= 0 ? 1 : 1 - o / RWY.margin, w = tt * tt * (3 - 2 * tt);
          h[i] = h[i] + (rwyElev - h[i]) * w;
          flat[i] = w;
          if (w > 0.5) sea[i] = 0;
        }
      }
      return { h, sea, flat, rwyElev, n, hmin: d.hmin, hmax: d.hmax, top: Math.max((d.hmax - d.hmin) * M_TO_UNITS, rwyElev || 0), water: d.water };
    }
    const parity = (k) => ((k % 2) + 2) % 2;
    function localXZ(wx, wz) {
      const col = Math.round(wx / TILE), row = Math.round(wz / TILE);
      let lx = wx - col * TILE, lz = wz - row * TILE;
      if (parity(col)) lx = -lx;
      if (parity(row)) lz = -lz;
      return [lx, lz];
    }
    function realAt(lx, lz) {
      const f = (v) => Math.max(0, Math.min(SEGMENTS, (v + TILE / 2) / TILE * SEGMENTS));
      const fx = f(lx), fz = f(lz), x0 = Math.min(SEGMENTS - 1, Math.floor(fx)), z0 = Math.min(SEGMENTS - 1, Math.floor(fz));
      const tx = fx - x0, tz = fz - z0, n = real.n, H = real.h;
      const a = H[z0 * n + x0], b = H[z0 * n + x0 + 1], c = H[(z0 + 1) * n + x0], d = H[(z0 + 1) * n + x0 + 1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
    }
    function heightAt(wx, wz) {
      if (real) { const [lx, lz] = localXZ(wx, wz); return Math.max(0, realAt(lx, lz)); }
      return terrainNoise(wx / TILE, wz / TILE, env.ridged) ** 1.7 * env.heightScale;
    }

    function buildTerrain() {
      const pos = terrainGeo.attributes.position, col = terrainGeo.attributes.color;
      const pal = env.terrain.map((h) => new T.Color(h));
      const c = new T.Color();
      const snow = new T.Color(0xf4f7fa), grass = new T.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), zz = pos.getZ(i);
        let hgt, k;
        if (real) {
          const ix = Math.round((x + TILE / 2) / TILE * SEGMENTS), iz = Math.round((zz + TILE / 2) / TILE * SEGMENTS);
          const gi = iz * real.n + ix;
          hgt = real.h[gi];
          pos.setY(i, hgt);
          const metres = real.hmin + Math.max(0, hgt) / M_TO_UNITS;
          k = real.top > 1 ? Math.max(0, hgt) / real.top : 0;
          if (k < 0.5) c.copy(pal[0]).lerp(pal[1], k * 2); else c.copy(pal[1]).lerp(pal[2], (k - 0.5) * 2);
          if (env.snowLine != null && metres > env.snowLine) c.lerp(snow, Math.min(1, env.snowLine < 0 ? 1 : (metres - env.snowLine) / 300));
          if (real.flat[gi] > 0.2) c.lerp(grass.copy(pal[0]).lerp(new T.Color(0x6f8a4a), env.snowLine === -1 ? 0 : 0.5), real.flat[gi] * 0.8);
          if (real.sea[gi]) c.set(env.water || 0x2b5871).multiplyScalar(0.7);
          const jitter = 0.92 + vnoise(x / TILE * 160, zz / TILE * 160, 160) * 0.16;
          col.setXYZ(i, c.r * jitter, c.g * jitter, c.b * jitter);
          continue;
        }
        const n = terrainNoise(x / TILE, zz / TILE, env.ridged);
        hgt = n ** 1.7 * env.heightScale;
        pos.setY(i, hgt);
        k = Math.min(1, hgt / Math.max(1, env.heightScale) * 1.4);
        if (k < 0.5) c.copy(pal[0]).lerp(pal[1], k * 2); else c.copy(pal[1]).lerp(pal[2], (k - 0.5) * 2);
        if (env.fields) { // patchwork of fields
          const f = hash(Math.floor(((x / TILE) + 0.5) * 48), Math.floor(((zz / TILE) + 0.5) * 48));
          c.lerp(pal[Math.floor(f * 3)], 0.55);
        }
        const jitter = 0.9 + vnoise(x / TILE * 160, zz / TILE * 160, 160) * 0.2;
        col.setXYZ(i, c.r * jitter, c.g * jitter, c.b * jitter);
      }
      pos.needsUpdate = true; col.needsUpdate = true;
      terrainMat.roughness = env.ocean && !real ? 0.32 : 0.95;
      terrainMat.metalness = env.ocean && !real ? 0.15 : 0;
      // Sea surface wherever the real terrain is at sea level
      water.visible = !!(real && real.water > 0);
      water.material.color.set(env.ocean ? env.terrain[1] : env.water || 0x2b5871);
      water.material.roughness = env.snowLine === -1 ? 0.9 : 0.3;
      terrainGeo.computeVertexNormals();
      terrainGeo.computeBoundingSphere();

      // Ground lights (towns at night)
      for (const m of tiles) { while (m.children.length) m.remove(m.children[0]); }
      if (lightsGeo) { lightsGeo.dispose(); lightsGeo = null; }
      if (env.lights) {
        const p = [], cl = [];
        const warm = new T.Color(0xffc27a), cool = new T.Color(0xdbe6ff);
        let seed = 11;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < env.lights; i++) {
          // cluster lights into towns
          const cx = (rnd() - 0.5) * TILE, cz = (rnd() - 0.5) * TILE;
          const n = 1 + Math.floor(rnd() * 14);
          for (let j = 0; j < n; j++) {
            const lx = Math.max(-TILE / 2, Math.min(TILE / 2, cx + (rnd() - 0.5) * 220));
            const lz = Math.max(-TILE / 2, Math.min(TILE / 2, cz + (rnd() - 0.5) * 220));
            if (real && realAt(lx, lz) <= 0) continue; // no towns at sea
            p.push(lx, heightAt(lx, lz) + 3, lz);
            const cc = rnd() < 0.75 ? warm : cool;
            cl.push(cc.r, cc.g, cc.b);
          }
        }
        lightsGeo = new T.BufferGeometry();
        lightsGeo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
        lightsGeo.setAttribute("color", new T.Float32BufferAttribute(cl, 3));
        for (const m of tiles) m.add(new T.Points(lightsGeo, lightsMat));
      }
    }

    function buildClouds() {
      for (const c of clouds) { cloudGroup.remove(c.s); c.s.material.dispose(); }
      clouds.length = 0;
      const cc = env.clouds;
      for (let i = 0; i < cc.count; i++) {
        const s = new T.Sprite(new T.SpriteMaterial({ map: puff, color: cc.color, transparent: true, opacity: cc.opacity, depthWrite: false }));
        const size = cc.size * (0.6 + Math.random() * 0.9);
        s.scale.set(size * 1.6, size, 1);
        s.material.rotation = (Math.random() - 0.5) * 0.3;
        s.position.y = (real ? real.top : 0) + cc.base + Math.random() * (cc.top - cc.base);
        placeCloud(s, true);
        cloudGroup.add(s);
        clouds.push({ s });
      }
      if (overcast) { scene.remove(overcast); overcast.geometry.dispose(); overcast.material.dispose(); overcast = null; }
      if (env.overcast) {
        overcast = new T.Mesh(new T.PlaneGeometry(30000, 30000), new T.MeshBasicMaterial({ color: env.clouds.color, transparent: true, opacity: 0.92, side: T.DoubleSide, depthWrite: false }));
        overcast.rotation.x = Math.PI / 2;
        overcast.position.y = baseY + 1250;
        scene.add(overcast);
      }
    }

    function setIncident(id) {
      if (id === envId) return;
      envId = id;
      env = ENVS[id] || ENVS.aa191;
      skyUniforms.top.value.set(env.skyTop);
      skyUniforms.horizon.value.set(env.horizon);
      skyUniforms.below.value.set(env.below);
      skyUniforms.sunColor.value.set(env.sun.color).multiplyScalar(env.night ? 0.25 : 1);
      const el = T.MathUtils.degToRad(env.sun.elev), az = T.MathUtils.degToRad(env.sun.az);
      const dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      skyUniforms.sunDir.value.copy(dir);
      sun.color.set(env.sun.color); sun.intensity = env.sun.intensity;
      sun.userData.dir = dir;
      hemi.color.set(env.hemi[0]); hemi.groundColor.set(env.hemi[1]); hemi.intensity = env.hemi[2];
      strike = 0;
      scene.fog.color.set(env.fog); scene.fog.density = env.fogDensity;
      stars.visible = !!env.night;
      renderer.toneMappingExposure = env.night ? 1.25 : 1.0;
      real = decodeReal(id);
      baseY = (real ? real.top : env.heightScale) + 70;
      rain.visible = !!env.rain;
      runway.visible = !!(real && real.rwyElev != null);
      if (runway.visible) runway.position.set(0, real.rwyElev + 0.3, RWY.z);
      buildTerrain();
      buildClouds();
      if (plane) { scene.remove(plane); }
      plane = buildAircraft(AIRCRAFT[id] || AIRCRAFT.aa191);
      scene.add(plane);
      reset();
    }

    function altToY(alt) { return baseY + alt * FT_TO_UNITS; }

    function setAltitude(alt, instant) {
      targetY = altToY(alt);
      if (instant && mode === "fly") { y = targetY; vy = 0; pitch = 0; }
    }

    function reset() {
      mode = "fly"; speed = CRUISE_SPEED; shake = 0; roll = 0; trim = 0;
      if (plane) { gearDown = false; plane.userData.gear.visible = false; }
      x = 0; z = TILE * 0.45; yaw = 0;   // start south of the crash site, flying north over it
      camPos.set(x + 60, baseY + 500, z + 300);
      fovKick = 45; distKick = 0.8;  // takeoff opens wide and far, then zooms in
      for (const p of smoke) { p.s.visible = false; p.life = 0; }
      for (const f of fire) f.visible = false;
      flash.intensity = 0;
      if (plane) plane.rotation.set(0, 0, 0);
    }

    // Line up on runway 36 for a manual take-off. Returns false where the accident area is open sea.
    function startRunway() {
      if (!real || real.rwyElev == null) return false;
      mode = "ground"; speed = 0; thr = 0; flaps = 1; gearDown = true; said = {}; liftT = 0;
      plane.userData.gear.visible = true;
      groundY = real.rwyElev + plane.userData.groundY;
      x = 0; z = RWY.z + RWY.len / 2 - 70; yaw = 0; y = groundY; vy = 0; pitch = 0; roll = 0;
      camPos.set(x + 40, y + 30, z + 140);
      fovKick = 30; distKick = 0.3;
      return true;
    }
    function handoff() {
      mode = "fly"; trim = 0; flaps = 0; handoffT = 0;
      if (gearDown) { gearDown = false; plane.userData.gear.visible = false; emit("toast", "Gear retracted by autopilot"); }
      emit("handoff");
    }
    function skipTakeoff() {
      if (mode !== "ground" && mode !== "climbout") return;
      if (mode === "ground") { y = groundY + 260; z -= RWY.len * 0.6; }
      speed = CRUISE_SPEED; pitch = 0.08;
      handoff();
    }
    function toggleGear() {
      if (mode === "ground") { emit("toast", "The gear stays down on the ground"); return; }
      gearDown = !gearDown;
      plane.userData.gear.visible = gearDown;
      emit("callout", gearDown ? "Gear down" : "Gear up");
    }
    function setFlaps(dir) {
      flaps = Math.max(0, Math.min(3, flaps + dir));
      emit("toast", flaps ? `Flaps ${flaps}` : "Flaps up");
    }

    function crash() {
      if (mode !== "fly") return;
      mode = "crashing";
    }

    // "good": dolly far out; "bad": vertigo warp (dolly in while the lens widens) with a jolt
    function punch(kind) {
      if (kind === "good") { distKick = 1.2; fovKick = 14; }
      else { distKick = -0.5; fovKick = 30; shake = Math.max(shake, 0.35); }
    }

    function spawnSmoke(origin) {
      const p = smoke.find((q) => q.life <= 0);
      if (!p) return;
      p.max = p.life = 5 + Math.random() * 4;
      p.s.position.set(origin.x + (Math.random() - 0.5) * 14, origin.y + Math.random() * 4, origin.z + (Math.random() - 0.5) * 14);
      p.vel.set((Math.random() - 0.5) * 4 + 6, 14 + Math.random() * 10, (Math.random() - 0.5) * 4);
      p.s.visible = true;
      p.s.material.opacity = 0;
      p.size0 = 18 + Math.random() * 12;
    }

    function update(dt) {
      t += dt;
      if (!plane) return;
      const flying = mode === "fly";
      const pitchIn = (keys.w || keys.down ? 1 : 0) - (keys.s || keys.up ? 1 : 0);   // nose up is positive (↓ pulls back, as in a sim)
      const bankIn = (keys.a || keys.left ? 1 : 0) - (keys.d || keys.right ? 1 : 0);
      const rudderIn = (keys.rudderL ? 1 : 0) - (keys.rudderR ? 1 : 0);
      if (mode === "ground" || mode === "climbout") thr = Math.max(0, Math.min(1, thr + ((keys.thrUp ? 1 : 0) - (keys.thrDn ? 1 : 0)) * 0.55 * dt));
      let rumble = 0;

      // Take-off roll on the runway
      if (mode === "ground") {
        const vr = flaps > 0 ? VR : VR + 7;
        const offRwy = Math.abs(x) > RWY.width / 2 + 3 || z < RWY.z - RWY.len / 2;
        const accel = 3.6 * thr - 0.00032 * speed * speed - (speed > 0 ? 0.25 : 0) - (keys.brake ? 7 : 0) - (offRwy ? 2.5 : 0);
        speed = Math.max(0, speed + accel * dt);
        yaw += (bankIn + rudderIn) * 0.32 * Math.min(1, speed / 12) * (1 - Math.min(0.75, speed / 120)) * dt;
        if (speed > vr - 6 && !said.v1) { said.v1 = 1; emit("callout", "V1"); }
        if (speed > vr && !said.vr) { said.vr = 1; emit("callout", "Rotate"); }
        if (pitchIn > 0) {
          if (speed >= vr * 0.96) pitch = Math.min(0.17, pitch + 0.09 * dt);
          else if (!said.slow && speed > 15) { said.slow = 1; emit("toast", "Too slow to rotate. Wait for ROTATE"); }
        } else pitch = Math.max(0, pitch - 0.12 * dt);
        if (offRwy && !said.off) { said.off = 1; emit("toast", "Off the runway. Steer back with ← → or , ."); }
        if (!offRwy) said.off = 0;
        y = groundY; vy = 0; roll = 0;
        rumble = Math.min(1, speed / 50) * (offRwy ? 2.5 : 1);
        if (pitch > 0.1 && speed >= vr) { mode = "climbout"; liftT = 0; emit("callout", "Liftoff"); }
      } else if (mode === "climbout") {
        liftT += dt;
        speed += (CRUISE_SPEED * (0.35 + thr * 0.75) - speed) * 0.12 * dt;
        const wantPitch = Math.max(0.03, Math.min(0.28, 0.14 + pitchIn * 0.12));
        pitch += (wantPitch - pitch) * (1 - Math.exp(-dt * 2));
        vy = speed * Math.sin(pitch) * 0.9;
        y = Math.max(y + vy * dt, Math.max(groundY, heightAt(x, z) + plane.userData.groundY + 2));
        const wantRoll = bankIn * 0.4;
        roll += (wantRoll - roll) * (1 - Math.exp(-dt * 2.2));
        yaw += (9.81 * Math.tan(roll) / Math.max(speed, 30)) * 2 * dt + rudderIn * 0.05 * dt;
        const agl = y - groundY;
        if (agl > 15 && !said.pos) { said.pos = 1; emit("callout", "Positive rate"); }
        if (agl > 120 && gearDown && !said.gear) { said.gear = 1; emit("toast", "Gear up: press G"); }
        if (agl > 200 || liftT > 24) handoff();
      }

      // Pilot input: W/S trim altitude around the assigned level, A/D bank and turn
      if (flying) {
        const climbIn = pitchIn;
        if (climbIn) trim = Math.max(-MAX_TRIM, Math.min(MAX_TRIM, trim + climbIn * 22 * dt));
        else trim -= trim * (1 - Math.exp(-dt * 0.35)); // autopilot drifts back to the assigned altitude
        const wantRoll = bankIn * 0.5 + Math.sin(t * 0.35) * 0.04;
        roll += (wantRoll - roll) * (1 - Math.exp(-dt * 2.2));
        yaw += (9.81 * Math.tan(roll) / speed) * 2 * dt + rudderIn * 0.06 * dt;   // coordinated turn, sped up for play
      }
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(-fwd.z, 0, fwd.x);

      // Vertical motion
      if (flying) {
        const prev = y;
        handoffT += dt;   // after take-off, climb gently to the assigned altitude
        y += (targetY + trim - y) * (1 - Math.exp(-dt * (handoffT < 20 ? 0.35 : 1.5)));
        vy = (y - prev) / Math.max(dt, 1e-4);
        const want = Math.max(-0.32, Math.min(0.32, Math.atan2(vy, speed) * 2.6));
        pitch += (want - pitch) * (1 - Math.exp(-dt * 4));
      } else if (mode === "crashing") {
        vy = Math.max(vy - 90 * dt, -170);
        y += vy * dt;
        speed = Math.min(speed + 20 * dt, 190);
        pitch += (-0.42 - pitch) * (1 - Math.exp(-dt * 2));
        const ground = heightAt(x + fwd.x * 20, z + fwd.z * 20);
        if (y <= ground + 4) {
          y = ground + 2;
          mode = "crashed";
          speed = 0;
          shake = 1;
          flash.intensity = 60000;
          flash.position.set(x, y + 10, z);
          roll = 0.5;
          pitch = -0.18;
          fovKick = -22;
          for (let i = 0; i < 14; i++) spawnSmoke(tmpV.set(x, y, z));
        }
      }

      x += fwd.x * speed * dt;
      z += fwd.z * speed * dt;

      // Aircraft attitude with light turbulence
      const turb = flying ? Math.sin(t * 1.7) * 0.006 + Math.sin(t * 3.1) * 0.004 : 0;
      plane.position.set(x, y + (flying ? Math.sin(t * 0.9) * 0.8 : 0), z);
      const jig = rumble ? (Math.random() - 0.5) * 0.004 * rumble : 0;
      if (rumble) plane.position.y += Math.abs(Math.sin(t * 40)) * 0.25 * rumble;
      plane.rotation.set(pitch + turb + jig, yaw, roll + turb * 2 + jig, "YXZ");
      if (rumble) shake = Math.max(shake, 0.06 * rumble);

      // Lightning in storm scenes
      if (env.lightning) {
        lightningT -= dt;
        if (lightningT <= 0) { strike = 1; lightningT = 2 + Math.random() * 5; }
        strike = Math.max(0, strike - dt * 5);
        const flick = strike > 0 ? strike * (0.6 + Math.random() * 0.4) : 0;
        hemi.intensity = env.hemi[2] + flick * 9;
      }

      // Navigation lights
      for (const n of plane.userData.nav) {
        if (n.blink == null) continue;
        const ph = (t + n.blink) % 1.3;
        n.s.visible = ph < 0.09 || (n.blink === 0.6 && ph > 0.6 && ph < 0.7);
      }

      // Terrain tiles stay centred on the aircraft
      const cx = Math.round(x / TILE), cz = Math.round(z / TILE);
      for (const m of tiles) {
        const c = cx + m.userData.col, r = cz + m.userData.row;
        m.position.set(c * TILE, 0, r * TILE);
        m.scale.set(real && parity(c) ? -1 : 1, 1, real && parity(r) ? -1 : 1);
      }

      // Clouds behind or far to the side are moved ahead
      for (const c of clouds) {
        const dx = c.s.position.x - x, dz = c.s.position.z - z;
        const along = dx * fwd.x + dz * fwd.z, side = dx * right.x + dz * right.z;
        if (along < -600 || along > 9000 || Math.abs(side) > 3600) placeCloud(c.s, false);
      }
      if (overcast) overcast.position.set(x, baseY + 1250, z);
      if (water.visible) water.position.set(x, 0.5, z);

      // Crash effects
      if (mode === "crashed") {
        smokeTimer -= dt;
        if (smokeTimer <= 0) { spawnSmoke(tmpV.set(x, y, z)); smokeTimer = 0.12; }
        flash.intensity *= Math.exp(-dt * 1.4);
        fire.forEach((f, i) => {
          f.visible = true;
          f.position.set(x + Math.sin(i * 2.1) * 9, y + 2 + Math.abs(Math.sin(t * 7 + i)) * 4, z + Math.cos(i * 1.7) * 9);
          const sz = 10 + Math.sin(t * 9 + i * 1.3) * 3;
          f.scale.set(sz, sz * 1.3, 1);
          f.material.opacity = 0.75 + Math.sin(t * 13 + i) * 0.2;
        });
      }
      for (const p of smoke) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.s.position.addScaledVector(p.vel, dt);
        const k = 1 - p.life / p.max;
        const sz = p.size0 * (1 + k * 4);
        p.s.scale.set(sz, sz, 1);
        p.s.material.opacity = Math.min(1, k * 6) * (1 - k) * 0.85;
        if (p.life <= 0) p.s.visible = false;
      }

      // Camera
      const view = VIEWS[viewIndex];
      const cab = plane.userData.cabin;
      cab.group.visible = !!view.cabin;
      const near = view.cabin ? 0.05 : 0.5;
      if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
      if (view.cabin) {
        const down = mode === "crashing" || mode === "crashed";
        const alarm = down || (mode === "fly" && targetY < altToY(3000));
        cab.masks.visible = alarm;
        cab.lamp.intensity = down ? (Math.random() < 0.15 ? 3 : 14) : 30;
        cab.pose(t, Math.min(1, shake * 3 + Math.abs(vy) * 0.004 + (mode === "ground" ? speed * 0.004 : 0)), down);
        for (const c of cab.crew) c.visible = mode === "ground" || (mode === "fly" && !alarm);
        plane.updateMatrixWorld();
        camera.position.copy(cab.eye).applyMatrix4(plane.matrixWorld);
        camera.up.copy(UP).applyQuaternion(plane.quaternion);
        camera.lookAt(tmpL.copy(cab.look).applyMatrix4(plane.matrixWorld));
        if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 0.3; camera.position.y += (Math.random() - 0.5) * shake * 0.3; }
        camPos.copy(camera.position);
      } else if (view.off) {
        if (view.name === "Cockpit") view.off.z = -plane.userData.length / 2 + 4.2;
        plane.updateMatrixWorld();
        camera.position.copy(view.off).applyMatrix4(plane.matrixWorld);
        camera.up.copy(UP).applyQuaternion(plane.quaternion);
        camera.lookAt(tmpL.copy(view.look).applyMatrix4(plane.matrixWorld));
        camPos.copy(camera.position);
      } else {
        camera.up.copy(UP);
        tmpV.set(30 + Math.sin(t * 0.07) * 14, 11 + Math.sin(t * 0.05) * 4, 76).multiplyScalar(1 + distKick);
        if (mode === "crashed") tmpV.set(120, 45, 170);
        tmpV.applyAxisAngle(UP, yaw).add(plane.position);
        camPos.lerp(tmpV, 1 - Math.exp(-dt * (mode === "crashed" ? 0.8 : 3)));
        camera.position.copy(camPos);
        if (shake > 0) {
          camera.position.x += (Math.random() - 0.5) * shake * 6;
          camera.position.y += (Math.random() - 0.5) * shake * 6;
          shake = Math.max(0, shake - dt * 0.8);
        }
        const floor = heightAt(camera.position.x, camera.position.z) + 10;   // never inside a hillside
        if (camera.position.y < floor) { camera.position.y = floor; camPos.y = Math.max(camPos.y, floor); }
        camera.lookAt(tmpL.copy(plane.position).addScaledVector(fwd, 22).setY(plane.position.y + 2));
      }
      camera.fov = 50 + fovKick + Math.sin(t * 0.5) * 1.5;
      camera.updateProjectionMatrix();
      fovKick *= Math.exp(-dt * 1.8);
      distKick *= Math.exp(-dt * 1.4);
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      if (rain.visible) {
        const fall = 320 * dt, sx = fwd.x * speed * 0.035, sz = fwd.z * speed * 0.035;
        const cp = camera.position;
        for (let i = 0; i < RAIN_N; i++) {
          let dx = drops[i * 3], dy = drops[i * 3 + 1] - fall, dz = drops[i * 3 + 2];
          dx -= fwd.x * speed * dt; dz -= fwd.z * speed * dt;   // the aircraft flies through the rain
          if (dy < -200) dy += 400;
          if (dx < -250) dx += 500; else if (dx > 250) dx -= 500;
          if (dz < -250) dz += 500; else if (dz > 250) dz -= 500;
          drops[i * 3] = dx; drops[i * 3 + 1] = dy; drops[i * 3 + 2] = dz;
          const o = i * 6;
          rainPos[o] = cp.x + dx; rainPos[o + 1] = cp.y + dy; rainPos[o + 2] = cp.z + dz;
          rainPos[o + 3] = cp.x + dx + sx; rainPos[o + 4] = cp.y + dy + 11; rainPos[o + 5] = cp.z + dz + sz;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      if (sun.userData.dir) {
        sun.position.copy(plane.position).addScaledVector(sun.userData.dir, 1000);
        sun.target.position.copy(plane.position);
      }

      // HUD
      hudTimer -= dt;
      if (hud && hudTimer <= 0) {
        hudTimer = 0.15;
        const ias = Math.round(speed / CRUISE_SPEED * 272);
        const deg = pitch * 180 / Math.PI;
        let hdg = Math.round(((-yaw * 180 / Math.PI) % 360 + 360) % 360);
        if (hdg === 0) hdg = 360;
        const pilot = mode === "ground" || mode === "climbout";
        hud.textContent = mode === "crashed"
          ? "IAS 0 KT   HDG ---   PITCH --"
          : `IAS ${ias} KT   HDG ${String(hdg).padStart(3, "0")}   PITCH ${deg >= 0 ? "+" : "−"}${Math.abs(deg).toFixed(1)}°` +
            (pilot ? `\nTHR ${Math.round(thr * 100)}%   FLAPS ${flaps || "UP"}   GEAR ${gearDown ? "DN" : "UP"}${keys.brake ? "   BRAKES" : ""}` : "");
        if (pilot) emit("telemetry", { mode, ias, thr, flaps, gear: gearDown, vr: Math.round((flaps > 0 ? VR : VR + 7) / CRUISE_SPEED * 272), agl: Math.max(0, Math.round((y - groundY) / FT_TO_UNITS * 0.12)) });
      }
    }

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container);

    // W A S D flight controls (keyboard; touch buttons call setKey)
    function setKey(k, down) {
      if (k === "gear") { if (down) toggleGear(); return; }
      if (k in keys) keys[k] = down;
    }
    window.addEventListener("keydown", (e) => {
      if (!running || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = KEYMAP[e.key.toLowerCase()];
      if (k) { keys[k] = true; e.preventDefault(); return; }
      if (e.repeat) return;
      if (e.key === "g" || e.key === "G") { toggleGear(); e.preventDefault(); }
      else if (e.key === "f") setFlaps(1);
      else if (e.key === "F") setFlaps(-1);
    });
    window.addEventListener("keyup", (e) => { const k = KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
    window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
    window.addEventListener("resize", resize);

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      update(dt);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }

    return {
      setIncident,
      setAltitude,
      crash,
      reset,
      punch,
      setKey,
      get crashed() { return mode === "crashing" || mode === "crashed"; },
      startRunway,
      skipTakeoff,
      cycleView() { viewIndex = (viewIndex + 1) % VIEWS.length; return VIEWS[viewIndex].name; },
      get viewName() { return VIEWS[viewIndex].name; },
      start() {
        if (running) return;
        running = true;
        resize();
        last = performance.now();
        requestAnimationFrame(frame);
      },
      stop() { running = false; for (const k in keys) keys[k] = false; },
      // Advance the simulation by a fixed amount of time without rendering (used by automated tests)
      advance(seconds) { for (let k = 0; k < Math.round(seconds * 60); k++) update(1 / 60); }
    };
  }

  window.Sim3D = { create };
})();

// Real-time 3D flight view (three.js / WebGL).
// Exposes window.Sim3D.create(container, hudEl) → controller, or null if WebGL is unavailable.
(function () {
  "use strict";
  const T = window.THREE;

  // ---- Scale and motion ----
  const TILE = 4000;              // terrain tile size (world units ≈ metres)
  const SEGMENTS = 96;            // terrain grid resolution per tile
  const FT_TO_UNITS = 0.075;      // compresses game feet into the visible scene
  const CRUISE_SPEED = 140;       // units per second (~272 knots)

  // ---- Weather, light and terrain for each accident ----
  const ENVS = {
    tenerife: { // fog over volcanic hills
      skyTop: 0x7f8d99, horizon: 0xc4ccd3, below: 0x8c9196, fog: 0xbfc7ce, fogDensity: 0.00085,
      sun: { elev: 28, az: -30, color: 0xfff0dc, intensity: 1.4 }, hemi: [0xdfe5ea, 0x5b5649, 1.4],
      terrain: [0x45463a, 0x645d4a, 0x8a857a], heightScale: 240,
      clouds: { count: 80, base: 140, top: 520, color: 0xe4e8ec, opacity: 0.85, size: 520 }
    },
    jal123: { // sunset over steep forested mountains
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
      skyTop: 0x3672c0, horizon: 0xd0dfec, below: 0x6c7470, fog: 0xc4d4e3, fogDensity: 0.0003,
      sun: { elev: 22, az: 110, color: 0xfff1dc, intensity: 2.7 }, hemi: [0xd8e6f2, 0x4a4c44, 1.1],
      terrain: [0x56644e, 0x6f7867, 0x8c8b82], heightScale: 40, fields: true,
      clouds: { count: 15, base: 900, top: 1300, color: 0xffffff, opacity: 0.9, size: 480 }
    },
    ci140: { // night approach into Nagoya
      skyTop: 0x03060d, horizon: 0x1e2638, below: 0x0a0c10, fog: 0x131a28, fogDensity: 0.00036, night: true,
      sun: { elev: 30, az: 90, color: 0xa6b8e8, intensity: 0.3 }, hemi: [0x2f3d5a, 0x0a0a0a, 0.35],
      terrain: [0x14170f, 0x1c1f16, 0x25281e], heightScale: 60, lights: 900,
      clouds: { count: 18, base: 650, top: 950, color: 0x283044, opacity: 0.6, size: 500 }
    },
    wt2120: { // hazy morning over the desert outside Jeddah
      skyTop: 0x4a82c0, horizon: 0xedd3ad, below: 0x8a6e50, fog: 0xdcc39e, fogDensity: 0.0004,
      sun: { elev: 16, az: 95, color: 0xffe2b8, intensity: 2.6 }, hemi: [0xf3dcc0, 0x5a4630, 1.0],
      terrain: [0xb08055, 0xc79a66, 0xdcbc8c], heightScale: 90,
      clouds: { count: 6, base: 1000, top: 1300, color: 0xf6e4cc, opacity: 0.6, size: 500 }
    },
    te901: { // Antarctic whiteout under a solid overcast
      skyTop: 0xdce2e8, horizon: 0xeef1f4, below: 0xe6eaee, fog: 0xe8ecf0, fogDensity: 0.00055,
      sun: { elev: 18, az: -150, color: 0xffffff, intensity: 1.0 }, hemi: [0xffffff, 0xd9e1ea, 2.4],
      terrain: [0xdfe6ee, 0xeef2f6, 0xffffff], heightScale: 620, ridged: true, overcast: 1500,
      clouds: { count: 30, base: 900, top: 1400, color: 0xf4f6f8, opacity: 0.8, size: 700 }
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
    te901:     { type: "dc10",  body: 0xf5f5f5, tail: 0x0b6f8a, cheat: 0x0b6f8a }
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

  // ---- Airliner built from primitives (nose points to -Z, ~60 units long) ----
  function buildAircraft(spec) {
    const g = new T.Group();
    const metal = (hex, rough = 0.42, metalness = 0.35) => new T.MeshStandardMaterial({ color: hex, roughness: rough, metalness });
    const bodyMat = metal(spec.body, 0.38, spec.body === 0xc4c9ce ? 0.75 : 0.25);
    const tailMat = metal(spec.tail, 0.45, 0.25);
    const wingMat = new T.MeshStandardMaterial({ color: 0xb9c0c7, roughness: 0.5, metalness: 0.45, side: T.DoubleSide });
    const darkMat = new T.MeshStandardMaterial({ color: 0x16191d, roughness: 0.3, metalness: 0.2 });
    const engMat = metal(0xd9dde1, 0.35, 0.5);

    const len = spec.type === "dc8" ? 54 : spec.type === "a300" ? 52 : 60;
    const R = spec.type === "747" ? 3.3 : spec.type === "dc8" ? 2.2 : 3.0;
    const h = len / 2;

    // Fuselage: lathe profile around the long axis
    const prof = [
      [0, h], [R * 0.38, h - 0.6], [R * 0.7, h - 1.8], [R * 0.92, h - 3.6], [R, h - 6],
      [R, -h + 16], [R * 0.9, -h + 10], [R * 0.66, -h + 5], [R * 0.34, -h + 1.4], [0.12, -h]
    ].reverse().map(([r, y]) => new T.Vector2(r, y)); // tail → nose so faces point outward
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
    cw.position.set(0, R * 0.42, -h + 3.1); cw.rotation.x = -0.45; g.add(cw);

    // Wings (planform in x = span, y = forward; extruded for thickness)
    const span = spec.type === "747" ? 31 : spec.type === "dc8" ? 22 : 24;
    const wingShape = new T.Shape();
    wingShape.moveTo(0, 7); wingShape.lineTo(span, -span * 0.55 + 4); wingShape.lineTo(span, -span * 0.55 + 1.6); wingShape.lineTo(0, -6);
    const wingGeo = new T.ExtrudeGeometry(wingShape, { depth: 0.7, bevelEnabled: false });
    wingGeo.rotateX(-Math.PI / 2);
    for (const s of [-1, 1]) {
      const w = new T.Mesh(wingGeo, wingMat);
      w.scale.x = s; w.position.set(s * R * 0.4, -R * 0.55, 2); w.rotation.z = s * 0.07;
      g.add(w);
    }

    // Horizontal stabilisers
    const hs = new T.Shape();
    const hsSpan = span * 0.38;
    hs.moveTo(0, -h + 13); hs.lineTo(hsSpan, -h + 6); hs.lineTo(hsSpan, -h + 4); hs.lineTo(0, -h + 6.5);
    const hsGeo = new T.ExtrudeGeometry(hs, { depth: 0.4, bevelEnabled: false });
    hsGeo.rotateX(-Math.PI / 2);
    for (const s of [-1, 1]) {
      const m = new T.Mesh(hsGeo, wingMat);
      m.scale.x = s; m.position.set(0, 0.4, 0); g.add(m);
    }

    // Vertical fin (shape x = forward, y = up)
    const finH = spec.type === "747" ? 13 : 11;
    const fin = new T.Shape();
    fin.moveTo(-h + 13, 0); fin.lineTo(-h + 4.5, finH); fin.lineTo(-h + 1.5, finH); fin.lineTo(-h + 0.6, 0);
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
    const pods = spec.type === "747" ? [10, 19] : spec.type === "dc8" ? [7, 13.5] : [9.5];
    const scale = spec.type === "dc8" ? 0.72 : 1;
    for (const x of pods) for (const s of [-1, 1]) { engine(s * x, under, wingZ(s * x) - 1.5, scale); pylon(s * x); }
    if (spec.type === "dc10") engine(0, R + 1.6, h - 9, 0.95);      // through the fin
    if (spec.type === "l1011") engine(0, R * 0.25, h - 1.5, 0.9);   // S-duct exhaust at the tail

    for (const m of g.children) m.castShadow = false;

    // Navigation lights: red left, green right, white strobes
    const glow = glowTexture();
    const nav = [];
    const light = (hex, x, y, z, size, blink) => {
      const s = new T.Sprite(new T.SpriteMaterial({ map: glow, color: hex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      s.position.set(x, y, z); s.scale.setScalar(size); g.add(s);
      nav.push({ s, blink, size });
    };
    const tipZ = span * 0.55 - 0.8;
    const tipY = -R * 0.55 + span * 0.07 + 0.35;
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

  function create(container, hud) {
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
    for (let c = -1; c <= 1; c++) {
      for (let r = 0; r < 4; r++) {
        const m = new T.Mesh(terrainGeo, terrainMat);
        m.userData = { col: c, row: r };
        scene.add(m);
        tiles.push(m);
      }
    }
    let lightsGeo = null;

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
    let z = 0, t = 0;
    let shake = 0, smokeTimer = 0;
    let running = false, last = 0, hudTimer = 0;
    let viewIndex = 0;
    const VIEWS = [
      { name: "Chase" },
      { name: "Wing", off: new T.Vector3(40, 5, 14), look: new T.Vector3(0, 0, -24) },
      { name: "Cockpit", off: new T.Vector3(0, 2.4, -25.8), look: new T.Vector3(0, 1.2, -400) }
    ];
    const camPos = new T.Vector3(40, 620, 80);
    const tmpV = new T.Vector3(), tmpL = new T.Vector3();

    function heightAt(wx, wz) {
      return terrainNoise(wx / TILE, wz / TILE, env.ridged) ** 1.7 * env.heightScale;
    }

    function buildTerrain() {
      const pos = terrainGeo.attributes.position, col = terrainGeo.attributes.color;
      const pal = env.terrain.map((h) => new T.Color(h));
      const c = new T.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), zz = pos.getZ(i);
        const n = terrainNoise(x / TILE, zz / TILE, env.ridged);
        const hgt = n ** 1.7 * env.heightScale;
        pos.setY(i, hgt);
        const k = Math.min(1, hgt / Math.max(1, env.heightScale) * 1.4);
        if (k < 0.5) c.copy(pal[0]).lerp(pal[1], k * 2); else c.copy(pal[1]).lerp(pal[2], (k - 0.5) * 2);
        if (env.fields) { // patchwork of fields
          const f = hash(Math.floor(((x / TILE) + 0.5) * 48), Math.floor(((zz / TILE) + 0.5) * 48));
          c.lerp(pal[Math.floor(f * 3)], 0.55);
        }
        const jitter = 0.9 + vnoise(x / TILE * 160, zz / TILE * 160, 160) * 0.2;
        col.setXYZ(i, c.r * jitter, c.g * jitter, c.b * jitter);
      }
      pos.needsUpdate = true; col.needsUpdate = true;
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
        s.position.set((Math.random() - 0.5) * 5000, cc.base + Math.random() * (cc.top - cc.base), z - 300 - Math.random() * 7000);
        cloudGroup.add(s);
        clouds.push({ s });
      }
      if (overcast) { scene.remove(overcast); overcast.geometry.dispose(); overcast.material.dispose(); overcast = null; }
      if (env.overcast) {
        overcast = new T.Mesh(new T.PlaneGeometry(30000, 30000), new T.MeshBasicMaterial({ color: env.clouds.color, transparent: true, opacity: 0.92, side: T.DoubleSide, depthWrite: false }));
        overcast.rotation.x = Math.PI / 2;
        overcast.position.y = env.overcast;
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
      scene.fog.color.set(env.fog); scene.fog.density = env.fogDensity;
      stars.visible = !!env.night;
      renderer.toneMappingExposure = env.night ? 1.25 : 1.0;
      baseY = env.heightScale + 70;
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
      if (instant) { y = targetY; vy = 0; pitch = 0; }
    }

    function reset() {
      mode = "fly"; speed = CRUISE_SPEED; shake = 0;
      for (const p of smoke) { p.s.visible = false; p.life = 0; }
      for (const f of fire) f.visible = false;
      flash.intensity = 0;
      if (plane) plane.rotation.set(0, 0, 0);
    }

    function crash() {
      if (mode !== "fly") return;
      mode = "crashing";
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

      // Vertical motion
      if (mode === "fly") {
        const prev = y;
        y += (targetY - y) * (1 - Math.exp(-dt * 1.5));
        vy = (y - prev) / Math.max(dt, 1e-4);
        const want = Math.max(-0.32, Math.min(0.32, Math.atan2(vy, speed) * 2.6));
        pitch += (want - pitch) * (1 - Math.exp(-dt * 4));
      } else if (mode === "crashing") {
        vy = Math.max(vy - 90 * dt, -170);
        y += vy * dt;
        speed = Math.min(speed + 20 * dt, 190);
        pitch += (-0.42 - pitch) * (1 - Math.exp(-dt * 2));
        const ground = heightAt(0, z - 20);
        if (y <= ground + 4) {
          y = ground + 2;
          mode = "crashed";
          speed = 0;
          shake = 1;
          flash.intensity = 60000;
          flash.position.set(0, y + 10, z);
          plane.rotation.z = 0.5;
          pitch = -0.18;
          for (let i = 0; i < 14; i++) spawnSmoke(tmpV.set(0, y, z));
        }
      }

      z -= speed * dt;

      // Aircraft attitude with light turbulence
      const turb = mode === "fly" ? Math.sin(t * 1.7) * 0.006 + Math.sin(t * 3.1) * 0.004 : 0;
      plane.position.set(0, y + (mode === "fly" ? Math.sin(t * 0.9) * 0.8 : 0), z);
      plane.rotation.x = pitch + turb;
      if (mode === "fly") plane.rotation.z = Math.sin(t * 0.35) * 0.05 + turb * 2;

      // Navigation lights
      for (const n of plane.userData.nav) {
        if (n.blink == null) continue;
        const ph = (t + n.blink) % 1.3;
        n.s.visible = ph < 0.09 || (n.blink === 0.6 && ph > 0.6 && ph < 0.7);
      }

      // Terrain tile recycling
      const row0 = Math.round(z / TILE);
      for (const m of tiles) {
        m.position.set(m.userData.col * TILE, 0, (row0 + 1 - m.userData.row) * TILE);
      }

      // Cloud recycling
      for (const c of clouds) {
        if (c.s.position.z > z + 600) {
          c.s.position.z -= 7600;
          c.s.position.x = (Math.random() - 0.5) * 5000;
        }
      }
      if (overcast) { overcast.position.x = 0; overcast.position.z = z; }

      // Crash effects
      if (mode === "crashed") {
        smokeTimer -= dt;
        if (smokeTimer <= 0) { spawnSmoke(tmpV.set(0, y, z)); smokeTimer = 0.12; }
        flash.intensity *= Math.exp(-dt * 1.4);
        fire.forEach((f, i) => {
          f.visible = true;
          f.position.set(Math.sin(i * 2.1) * 9, y + 2 + Math.abs(Math.sin(t * 7 + i)) * 4, z + Math.cos(i * 1.7) * 9);
          const s = 10 + Math.sin(t * 9 + i * 1.3) * 3;
          f.scale.set(s, s * 1.3, 1);
          f.material.opacity = 0.75 + Math.sin(t * 13 + i) * 0.2;
        });
      }
      for (const p of smoke) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.s.position.addScaledVector(p.vel, dt);
        const k = 1 - p.life / p.max;
        const s = p.size0 * (1 + k * 4);
        p.s.scale.set(s, s, 1);
        p.s.material.opacity = Math.min(1, k * 6) * (1 - k) * 0.85;
        if (p.life <= 0) p.s.visible = false;
      }

      // Camera
      const view = VIEWS[viewIndex];
      if (view.off) {
        if (view.name === "Cockpit") view.off.z = -plane.userData.length / 2 + 4.2;
        plane.updateMatrixWorld();
        camera.position.copy(view.off).applyMatrix4(plane.matrixWorld);
        camera.lookAt(tmpL.copy(view.look).applyMatrix4(plane.matrixWorld));
        camPos.copy(camera.position);
      } else {
        tmpV.set(30 + Math.sin(t * 0.07) * 14, 11 + Math.sin(t * 0.05) * 4, 76);
        if (mode === "crashed") tmpV.set(120, 45, 170);
        tmpV.add(plane.position);
        camPos.lerp(tmpV, 1 - Math.exp(-dt * (mode === "crashed" ? 0.8 : 3)));
        camera.position.copy(camPos);
        if (shake > 0) {
          camera.position.x += (Math.random() - 0.5) * shake * 6;
          camera.position.y += (Math.random() - 0.5) * shake * 6;
          shake = Math.max(0, shake - dt * 0.8);
        }
        camera.lookAt(tmpL.set(0, plane.position.y + 2, plane.position.z - 22));
      }
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      if (sun.userData.dir) {
        sun.position.copy(plane.position).addScaledVector(sun.userData.dir, 1000);
        sun.target.position.copy(plane.position);
      }

      // HUD
      hudTimer -= dt;
      if (hud && hudTimer <= 0) {
        hudTimer = 0.15;
        const ias = Math.round(speed * 1.944);
        const deg = (plane.rotation.x * 180 / Math.PI);
        hud.textContent = mode === "crashed"
          ? "IAS 0 KT   PITCH --"
          : `IAS ${ias} KT   PITCH ${deg >= 0 ? "+" : "−"}${Math.abs(deg).toFixed(1)}°`;
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
      get crashed() { return mode !== "fly"; },
      cycleView() { viewIndex = (viewIndex + 1) % VIEWS.length; return VIEWS[viewIndex].name; },
      get viewName() { return VIEWS[viewIndex].name; },
      start() {
        if (running) return;
        running = true;
        resize();
        last = performance.now();
        requestAnimationFrame(frame);
      },
      stop() { running = false; }
    };
  }

  window.Sim3D = { create };
})();

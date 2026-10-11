// Realistic 3D Earth (three.js): NASA Blue Marble imagery, relief, ocean glint, clouds and atmosphere.
// Each accident's route flies from its real departure airport to the crash site, in the airline's colour.
// window.Globe3D.create(container, { onHover(id|null), onSelect(id) }) → controller (same API as WorldMap), or null.
(function () {
  "use strict";
  const T = window.THREE;
  const D2R = Math.PI / 180;

  // Matches three's SphereGeometry UV layout so lat/lon line up with the equirectangular texture
  function ll2v(lat, lon, r, out) {
    const phi = (lon + 180) * D2R, theta = (90 - lat) * D2R;
    return (out || new T.Vector3()).set(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
  }
  function slerpLL(a, b, f) {
    const p = ll2v(a[0], a[1], 1), q = ll2v(b[0], b[1], 1);
    const d = Math.acos(Math.max(-1, Math.min(1, p.dot(q))));
    if (d < 1e-6) return p;
    return p.multiplyScalar(Math.sin((1 - f) * d) / Math.sin(d)).add(q.multiplyScalar(Math.sin(f * d) / Math.sin(d)));
  }
  const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, ll2v(a[0], a[1], 1).dot(ll2v(b[0], b[1], 1)))));
  function arc(a, b, n, lift) {
    const d = angle(a, b), pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      pts.push(slerpLL(a, b, f).normalize().multiplyScalar(1.004 + Math.sin(Math.PI * f) * Math.min(0.12, d * lift)));
    }
    return pts;
  }

  function spriteTex(draw, size = 64) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    draw(c.getContext("2d"), size);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  const planeTex = () => spriteTex((g, s) => {
    g.translate(s / 2, s / 2); g.scale(s / 18, s / 18); g.fillStyle = "#fff"; g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 0.8;
    const p = new Path2D("M0 -7 L1.1 -2.2 L7 1.2 L7 2.6 L1.1 1 L0.9 4.6 L2.8 6.2 L2.8 7.2 L0 6.3 L-2.8 7.2 L-2.8 6.2 L-0.9 4.6 L-1.1 1 L-7 2.6 L-7 1.2 L-1.1 -2.2 Z");
    g.stroke(p); g.fill(p);
  });
  const ringTex = () => spriteTex((g, s) => { g.strokeStyle = "#fff"; g.lineWidth = s * 0.06; g.beginPath(); g.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2); g.stroke(); });
  const dotTex = () => spriteTex((g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, s, s); });

  function create(container, opts) {
    if (!T) return null;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(opts.background || 0xf6f7f9, 1);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    container.appendChild(renderer.domElement);
    const labels = document.createElement("div");
    labels.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    container.appendChild(labels);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.01, 100);
    const sunLight = new T.DirectionalLight(0xffffff, 2.6);
    scene.add(sunLight, new T.AmbientLight(0xffffff, 0.55));

    // Earth
    const loader = new T.TextureLoader();
    const tex = (url, srgb) => { const t = loader.load(url); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
    const earth = new T.Mesh(new T.SphereGeometry(1, 96, 64), new T.MeshPhongMaterial({
      map: tex("earth.jpg", true), bumpMap: tex("earth-bump.jpg"), bumpScale: 4, specularMap: tex("earth-water.jpg"),
      specular: new T.Color(0x5a6a7a), shininess: 18
    }));
    scene.add(earth);
    const clouds = new T.Mesh(new T.SphereGeometry(1.012, 64, 48), new T.MeshLambertMaterial({ map: tex("earth-clouds.png", true), transparent: true, opacity: 0.38, depthWrite: false }));
    scene.add(clouds);
    const atmosphere = new T.Mesh(new T.SphereGeometry(1.1, 64, 48), new T.ShaderMaterial({
      side: T.BackSide, transparent: true, depthWrite: false,
      vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying vec3 vN; varying vec3 vP; void main(){ float d = dot(vN, normalize(-vP)); float f = pow(clamp(0.78 + d, 0.0, 1.0), 4.0); gl_FragColor = vec4(0.45, 0.68, 1.0, f * 1.1); }"
    }));
    scene.add(atmosphere);

    // Data layers
    const routes = new T.Group(); scene.add(routes);
    const PLANE = planeTex(), RING = ringTex(), DOT = dotTex();
    let flights = [], highlight = null, live = null;
    let focusId = null, focusOpts = {}, home = { lat: 24, lon: 18, dist: 3.4, ax: 0.5, ay: 0.5 };
    const view = { lat: 10, lon: -20, dist: 6, ax: 0.5, ay: 0.5 }, target = { lat: 24, lon: 18, dist: 3.4, ax: 0.5, ay: 0.5 };
    let auto = true, idleT = 0, dragging = null, hoverId = null, running = false, last = 0, t = 0, W = 1, H = 1;
    const tmp = new T.Vector3(), tmp2 = new T.Vector3();

    function setFlights(list) {
      while (routes.children.length) routes.remove(routes.children[0]);
      flights = list.map((f, k) => {
        const g = f.geo, col = new T.Color(f.brand);
        const flown = arc(g.from, g.crash, 72, 0.35), plan = arc(g.crash, g.dest, 72, 0.35);
        const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(flown), 96, 0.0035, 6, false),
          new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }));
        const dash = new T.Line(new T.BufferGeometry().setFromPoints(plan), new T.LineDashedMaterial({ color: col, dashSize: 0.012, gapSize: 0.01, transparent: true, opacity: 0.6 }));
        dash.computeLineDistances();
        const crash = new T.Mesh(new T.SphereGeometry(0.008, 12, 8), new T.MeshBasicMaterial({ color: col }));
        crash.position.copy(ll2v(g.crash[0], g.crash[1], 1.004));
        const ring = new T.Sprite(new T.SpriteMaterial({ map: RING, color: col, transparent: true, depthWrite: false }));
        ring.position.copy(crash.position);
        const plane = new T.Sprite(new T.SpriteMaterial({ map: PLANE, color: col, transparent: true, depthWrite: false, depthTest: true }));
        const ports = [g.from, g.dest].map((p) => { const m = new T.Mesh(new T.SphereGeometry(0.006, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff })); m.position.copy(ll2v(p[0], p[1], 1.003)); return m; });
        routes.add(tube, dash, crash, ring, plane, ...ports);
        const len = angle(g.from, g.crash);
        return { id: f.id, f, col, flown, tube, dash, crash, ring, plane, ports,
                 dur: Math.max(2.8, Math.min(7, len * 9)), hold: 1.8, phase: (k * 1.37) % 6, len };
      });
    }

    // Labels for the highlighted flight: departure, destination and crash site
    const labelEls = [0, 1, 2].map(() => {
      const d = document.createElement("div");
      d.style.cssText = "position:absolute;left:0;top:0;transform:translate(-50%,-140%);white-space:nowrap;font:700 11px 'B612 Mono',ui-monospace,monospace;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.9);box-shadow:0 4px 14px rgba(0,0,0,.15);color:#1c2430;opacity:0;transition:opacity .25s";
      labels.appendChild(d); return d;
    });

    function resize() {
      W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight);
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
    }
    function retarget() {
      const f = focusId && flights.find((x) => x.id === focusId);
      if (f) {
        const g = f.f.geo, mid = slerpLL(g.from, g.crash, 0.5).normalize();
        const lat = Math.asin(mid.y) / D2R;
        const lon = Math.atan2(mid.z, -mid.x) / D2R - 180;
        const spread = Math.max(f.len, angle(g.crash, g.dest) * 0.25);
        Object.assign(target, { lat, lon: ((lon + 540) % 360) - 180, dist: Math.max(1.3, Math.min(focusOpts.maxDist || 3.2, 1.28 + spread * 2.4)),
          ax: focusOpts.anchorX != null ? focusOpts.anchorX : 0.5, ay: focusOpts.anchorY != null ? focusOpts.anchorY : 0.5 });
        auto = false;
      } else {
        Object.assign(target, { lat: target.lat, dist: home.dist, ax: home.ax, ay: home.ay });
        if (!dragging) auto = true;
      }
    }
    const project = (v) => { tmp2.copy(v).project(camera); return [(tmp2.x * 0.5 + 0.5) * W, (-tmp2.y * 0.5 + 0.5) * H, tmp2.z]; };
    const facing = (v) => v.dot(tmp.copy(camera.position).normalize()) > 0.08;

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now; t += dt;
      if (auto && !dragging) { idleT += dt; if (idleT > 1.5) target.lon += dt * 4; }
      const k = 1 - Math.exp(-dt * 2.6);
      let dl = ((target.lon - view.lon + 540) % 360) - 180;
      view.lon += dl * k; view.lat += (target.lat - view.lat) * k; view.dist += (target.dist - view.dist) * k;
      view.ax += (target.ax - view.ax) * k; view.ay += (target.ay - view.ay) * k;
      view.lat = Math.max(-75, Math.min(75, view.lat));
      ll2v(view.lat, view.lon, view.dist, camera.position);
      camera.lookAt(0, 0, 0);
      camera.setViewOffset(W, H, (0.5 - view.ax) * W, (0.5 - view.ay) * H, W, H);
      sunLight.position.copy(camera.position).applyAxisAngle(new T.Vector3(0, 1, 0), 0.6).add(new T.Vector3(0, 1.2, 0));
      clouds.rotation.y += dt * 0.004;

      // Routes, planes and pulses
      const pxScale = 1 / H * view.dist * 0.6;
      for (const r of flights) {
        const on = highlight === r.id, dim = highlight && !on;
        r.tube.material.opacity = dim ? 0.12 : on ? 1 : 0.75;
        r.dash.material.opacity = dim ? 0.08 : on ? 0.9 : 0.45;
        r.crash.scale.setScalar(on ? 1.8 : 1);
        const cyc = (t + r.phase) % (r.dur + r.hold), prog = Math.min(1, cyc / r.dur);
        const i = Math.min(r.flown.length - 2, Math.floor(prog * (r.flown.length - 1)));
        const a = r.flown[i], b = r.flown[i + 1], fr = prog * (r.flown.length - 1) - i;
        r.plane.position.copy(a).lerp(b, fr);
        const s = (on ? 30 : 20) * pxScale;
        r.plane.scale.set(s, s, 1);
        r.plane.visible = prog < 1 && facing(r.plane.position) && !dim;
        const [ax, ay] = project(a), [bx, by] = project(b);
        r.plane.material.rotation = -Math.atan2(by - ay, bx - ax) - Math.PI / 2;
        const pulse = cyc > r.dur ? (cyc - r.dur) / r.hold : -1;
        r.ring.visible = pulse >= 0 && facing(r.crash.position);
        if (r.ring.visible) { const rs = (8 + pulse * 26) * pxScale * (on ? 1.4 : 1); r.ring.scale.set(rs, rs, 1); r.ring.material.opacity = (1 - pulse) * (dim ? 0.3 : 1); }
        for (const p of r.ports) p.visible = on;
      }

      // Labels
      const f = highlight && flights.find((x) => x.id === highlight);
      const g = f && f.f.geo;
      const items = f ? [[r0(g.from), `${g.fromCode || ""} ${g.fromName}`.trim()], [r0(g.dest), `${g.destCode || ""} ${g.destName}`.trim()], [f.crash.position, `✕ ${f.f.callsigns[0]}`]] : [];
      labelEls.forEach((el, i) => {
        const it = items[i];
        if (!it || !facing(it[0])) { el.style.opacity = 0; return; }
        const [x, y] = project(it[0]);
        el.textContent = it[1];
        el.style.left = x + "px"; el.style.top = y + "px"; el.style.opacity = 1;
        el.style.color = i === 2 ? f.f.brand : "#1c2430";
      });

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    const r0 = (p) => ll2v(p[0], p[1], 1.003);

    // Pointer: drag to spin, wheel to zoom, hover/click crash markers
    function pick(e) {
      const rc = renderer.domElement.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
      let best = null, bd = 16;
      for (const r of flights) {
        if (!facing(r.crash.position)) continue;
        const [px, py] = project(r.crash.position);
        const d = Math.hypot(px - x, py - y);
        if (d < bd) { bd = d; best = r.id; }
      }
      return best;
    }
    const el = renderer.domElement;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", (e) => { dragging = { x: e.clientX, y: e.clientY, lat: target.lat, lon: target.lon, moved: false }; el.setPointerCapture(e.pointerId); auto = false; idleT = 0; });
    el.addEventListener("pointermove", (e) => {
      if (dragging) {
        const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragging.moved = true;
        const deg = 140 / H * view.dist;
        target.lon = dragging.lon - dx * deg * 0.6; target.lat = Math.max(-75, Math.min(75, dragging.lat + dy * deg * 0.6));
        return;
      }
      const id = pick(e);
      el.style.cursor = id ? "pointer" : "grab";
      if (id !== hoverId) { hoverId = id; opts.onHover && opts.onHover(id); }
    });
    el.addEventListener("pointerup", (e) => {
      const d = dragging; dragging = null;
      if (d && !d.moved) { const id = pick(e); if (id && opts.onSelect) opts.onSelect(id); }
      if (!focusId) setTimeout(() => { if (!dragging && !focusId) auto = true; }, 4000);
    });
    el.addEventListener("pointerleave", () => { if (hoverId) { hoverId = null; opts.onHover && opts.onHover(null); } });
    el.addEventListener("wheel", (e) => { e.preventDefault(); home.dist = target.dist = Math.max(1.4, Math.min(6, target.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container);
    resize();

    return {
      setFlights,
      setHighlight(id) { highlight = id || null; },
      setFocus(id, o) { focusId = id || null; focusOpts = o || {}; retarget(); },
      setHome(o) { home = { lat: 24, lon: 18, dist: o.dist || 3.4, ax: o.anchorX != null ? o.anchorX : 0.5, ay: o.anchorY != null ? o.anchorY : 0.5 }; retarget(); },
      setLive(list) {
        if (live) { scene.remove(live); live.geometry.dispose(); live = null; }
        if (!list || !list.length) return;
        const pos = new Float32Array(list.length * 3);
        list.forEach((a, i) => { ll2v(a.lat, a.lon, 1.006, tmp); pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z; });
        const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
        live = new T.Points(geo, new T.PointsMaterial({ color: 0xffe9a8, size: 2.2, sizeAttenuation: false, map: DOT, transparent: true, depthWrite: false, opacity: 0.85 }));
        scene.add(live);
      },
      start() { if (running) return; running = true; resize(); last = performance.now(); requestAnimationFrame(frame); },
      stop() { running = false; }
    };
  }

  window.Globe3D = { create };
})();

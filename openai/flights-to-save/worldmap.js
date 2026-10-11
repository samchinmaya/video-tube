// Interactive dotted world map (canvas 2D, Equal Earth projection).
// Draws each accident's route in its airline colour with a plane flying it, plus optional live traffic.
// window.WorldMap.create(canvas, { onHover(id|null), onSelect(id) }) → controller
(function () {
  "use strict";
  const MASK = { cols: 240, rows: 115, latMin: -80, latMax: 84, bits: "AAAAAAAAAAAAAF/z///gAAAAAAIAAAAAAAAAAAAAABgAAAAAAAACAJ4f//8AAgAAAAAYAAAAAAAAAAAAf/AAAAAAAAAgAHgB//8AAAAAgAf/AAAAAAAAAAAA//+D4AAAAAD/2P4B//wAAAABgz///4PAAAAAAAAA////+jgD/x+f1EeBf/gAAP4AG///////BwAAAAAA//////wP///7/8vB/4AAAf/r/9////////wAAAAA//////7//////wdB+A+AA88f//////////vAAAAA/////wQ/////84eB8AIAD9////////////wAAAAA////+AP/////wPAB4AAAP7///////////3wAAAAA//+PAA/9////gHkAQAAAP5v//////////HQAAAAA/4BgAALAP///gPsAAAAEE4//////////AGAAAAAA+APAAAKAH///wP8AAAAGC5//////////AHAAAAAAwA8AACAAH///4f+AAAAGCh/////////+AHgAAAAA4BwAAAAAX///8//AAAAbD///////////4BgAAAAAwCAAAAAAH///9//AAAATv///////////+AgAAAAAAAAAAAAAP/////8AAAAHf////////////AAAAAAAAAAAAAAAP////+SAAAAA////////////+wAAAAAAAAAAAAAAP/////HAAAAH/////////////QAAAAAAAAAAAAAAP/////AAAAAB////8////////IAAAAAAAAAAAAAAf/////gAAAAB/v+/5////////AAAAAAAAAAAAAAA/////yAAAAAB/n8D5////////HAAAAAAAAAAAAAA/////gAAAAAfwz8A8f//////8GAAAAAAAAAAAAAB/////AAAAAAfgd+8+P//////8AAAAAAAAAAAAAAB////8AAAAAAfBEj/+P/////+8BAAAAAAAAAAAAAD////4AAAAAA/AEz/+P/////8MBAAAAAAAAAAAAAD////4AAAAAAeAIT//P/////+jBgAAAAAAAAAAAAD////wAAAAAAI/AAf////////jDgAAAAAAAAAAAAD////wAAAAAAP/gEL////////hPgAAAAAAAAAAAAB////AAAAAAAf/gAD////////wEAAAAAAAAAAAAAA///+AAAAAAA//4QH////////4IAAAAAAAAAAAAAAv//8AAAAAAA//8+3////////8AAAAAAAAAAAAAAAv/84AAAAAAA//////f//////8AAAAAAAAAAAAAAAv/AIAAAAAAB//////P//////8AAAAAAAAAAAAAABv+AIAAAAAAD////7/n//////8AAAAAAAAAAAAAAAn8AKAAAAAAH////5/w//////8AAAAAAAAAAAAAAAH8AIAAAAAAP////9/5P/////8AAAAAAAAAAAAAAAX8ACAAAAAAP////+//Af////5AAAAAAAAAAAAAAAT4AwAAAAAAf////+f/wP////xAAAAAAAAAAAAAAAD4BMAAAAAAf/////f/wH/5//AAAAAAAAAAAAAAAAD4cHAAAAAAf/////f/wB/w/4AAAAAAAAAAAQAAAAD8YAYAAAAAf/////P/gB/gf7AAAAAAAAAAAAAAAAB94F6AAAAAf/////n/gB/gf4AgAAAAAAAAAAAAAAA/wAAAAAAAf/////j/AA/AP8AwAAAAAAAAAAAAAAAPwAAAAAAAf/////z8AA+Ab+AwAAAAAAAAAAAAAAAB+AAAAAAAf/////74AAcAD+AQAAAAAAAAAAAAAAAAeAAAAAAAf//////gAAeAD/AYAAAAAAAAAAAAAAAAOAAAAAAAf/////9AAAeAB/AUAAAAAAAAAAAAAAAAGAgAAAAAf/////8EAAOABPAKAAAAAAAAAAAAAAAAGD9wAAAAP//////8AAOABGAGAAAAAAAAAAAAAAAACXfwAAAAH//////4AAFABEAlAAAAAAAAAAAAAAAABv/4AAAAH//////4AAFABgAHAAAAAAAAAAAAAAAAAP/4AAAAD//////4AABAAgACAAAAAAAAAAAAAAAAAP/8AAAAB/n////4AAAAAQBBAAAAAAAAAAAAAAAAAP//gAAAAyH////wAAAAGYDgAAAAAAAAAAAAAAAAAP//wAAAAAA////wAAAADYHAAAAAAAAAAAAAAAAAAP//wAAAAAA////gAAAABoPgAAAAAAAAAAAAAAAAAf//4AAAAAA////AAAAAAwfgQAAAAAAAAAAAAAAAAf//wAAAAAA///+AAAAAA4fOQAAAAAAAAAAAAAAAA///8AAAAAA///8AAAAAAYfASAAAAAAAAAAAAAAAA////AAAAAA///8AAAAAAcfYCQAAAAAAAAAAAAAAAf///4AAAAAf//4AAAAAAOfYb+AAAAAAAAAAAAAAA////+AAAAAf//wAAAAAAMAED/BAAAAAAAAAAAAAA/////AAAAAP//wAAAAAAEAUAfiAAAAAAAAAAAAAA/////gAAAAP//wAAAAAADAAAP0QAAAAAAAAAAAAAf////gAAAAP//wAAAAAAB4AAPwAAAAAAAAAAAAAAf////gAAAAH//wAAAAAAAF5AGQCAAAAAAAAAAAAAP////AAAAAH//wAAAAAAAASAAYAAAAAAAAAAAAAAP////AAAAAH//4AAAAAAAAAAAAAAAAAAAAAAAAAAH///+AAAAAH//4AAAAAAAAAEAAAAAAAAAAAAAAAAH///+AAAAAP//4IAAAAAAAAPGAAAAAAAAAAAAAAAD///8AAAAAP//4YAAAAAAADeEAAAAAAAAAAAAAAAB///+AAAAAP//44AAAAAAAD+GAAQAAAAAAAAAAAAA///8AAAAAf//x4AAAAAAAH/OAAQEAAAAAAAAAAAAf//8AAAAAP//BwAAAAAAAP/+AAAAAAAAAAAAAAAAP//8AAAAAP//BwAAAAAAAf/+AAAAAAAAAAAAAAAAP//8AAAAAP/+BwAAAAAAA///AAAAAAAAAAAAAAAAH//8AAAAAH/+DgAAAAAAH///ACAAAAAAAAAAAAAAH//4AAAAAH/+DgAAAAAAf///gAAAAAAAAAAAAAAAH//gAAAAAH/+DgAAAAAAf///gAAAAAAAAAAAAAAAH//AAAAAAH/8DAAAAAAA////gAAAAAAAAAAAAAAAH/+AAAAAAH/4AAAAAAAA////gAAAAAAAAAAAAAAAH/+AAAAAAH/4AAAAAAAA////gAAAAAAAAAAAAAAAH/+AAAAAAD/wAAAAAAAA////gAAAAAAAAAAAAAAAH/+AAAAAAD/wAAAAAAAA////AAAAAAAAAAAAAAAAH/+AAAAAAB/gAAAAAAAB///+AAAAAAAAAAAAAAAAD/8AAAAAAB/AAAAAAAAB/3/+AAAAAAAAAAAAAAAAD/8AAAAAAB+AAAAAAAAB+D/4AAAAAAAAAAAAAAAAD/4AAAAAABgAAAAAAAADgC/wAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAA/gAEAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAAAA+AAOAAAAAAAAAAAAAAD+AAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAD+AAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAB8AAAAAAAAAAAAAAAAAAAAYADAAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAAAwAEAAAAAAAAAAAAAAAB+AAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAB8AAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAA4AAAhAEAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAP/wf////wAAAAAAAAAAAAAAAAAAAAAADwAAAAF8f//n//////gAAAAAAAAAAAAAAAAAAAJAA4AAA/////////////4AAAAAAAAAAAAAAAAF/////wAAD////////////+AAAAAAAAAAAAAAAAC/////8AHH/////////////4AAAAAAAA" };

  // ---- Equal Earth projection, normalised so the map spans u,v ∈ [0,1] ----
  const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
  function ee(lon, lat) {
    const l = lon * Math.PI / 180, p = lat * Math.PI / 180;
    const t = Math.asin(M * Math.sin(p)), t2 = t * t, t6 = t2 * t2 * t2;
    return [l * Math.cos(t) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))), t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))];
  }
  const X0 = ee(-180, 0)[0], X1 = ee(180, 0)[0], Y0 = ee(0, MASK.latMin)[1], Y1 = ee(0, MASK.latMax)[1];
  const ASPECT = (X1 - X0) / (Y1 - Y0);
  function project(lat, lon) {
    const [x, y] = ee(lon, Math.max(MASK.latMin - 5, Math.min(MASK.latMax + 5, lat)));
    return [(x - X0) / (X1 - X0), (Y1 - y) / (Y1 - Y0)];
  }

  // ---- Land dots from the bitmask ----
  const DOTS = (() => {
    const raw = atob(MASK.bits), out = [];
    for (let i = 0; i < MASK.cols * MASK.rows; i++) {
      if ((raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1) {
        const r = Math.floor(i / MASK.cols), c = i % MASK.cols;
        out.push((c + 0.5) / MASK.cols, (r + 0.5) / MASK.rows);
      }
    }
    return new Float32Array(out);
  })();

  // ---- Great-circle path between two [lat, lon] points ----
  function greatCircle(a, b, n) {
    const rad = Math.PI / 180;
    const v = ([la, lo]) => [Math.cos(la * rad) * Math.cos(lo * rad), Math.cos(la * rad) * Math.sin(lo * rad), Math.sin(la * rad)];
    const p = v(a), q = v(b);
    const d = Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])));
    if (d < 1e-4) return [project(a[0], a[1]), project(b[0], b[1])];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, s1 = Math.sin((1 - f) * d) / Math.sin(d), s2 = Math.sin(f * d) / Math.sin(d);
      const x = s1 * p[0] + s2 * q[0], y = s1 * p[1] + s2 * q[1], z = s1 * p[2] + s2 * q[2];
      pts.push(project(Math.atan2(z, Math.hypot(x, y)) / rad, Math.atan2(y, x) / rad));
    }
    return pts;
  }
  function pathLength(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], (pts[i][1] - pts[i - 1][1]) / ASPECT);
    return L;
  }
  function pointAt(pts, cum, f) {
    const target = f * cum[cum.length - 1];
    let i = 1;
    while (i < cum.length - 1 && cum[i] < target) i++;
    const seg = cum[i] - cum[i - 1] || 1, k = (target - cum[i - 1]) / seg;
    const a = pts[i - 1], b = pts[i];
    return { u: a[0] + (b[0] - a[0]) * k, v: a[1] + (b[1] - a[1]) * k, i, du: b[0] - a[0], dv: b[1] - a[1] };
  }

  const PLANE = new Path2D("M0 -7 L1.1 -2.2 L7 1.2 L7 2.6 L1.1 1 L0.9 4.6 L2.8 6.2 L2.8 7.2 L0 6.3 L-2.8 7.2 L-2.8 6.2 L-0.9 4.6 L-1.1 1 L-7 2.6 L-7 1.2 L-1.1 -2.2 Z");
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  function create(canvas, opts) {
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 1, H = 1, dpr = 1;
    let flights = [];
    let highlight = null;
    let live = [];
    const view = { cx: 0.5, cy: 0.5, z: 0.6, ax: 0.5, ay: 0.5 };
    const target = { cx: 0.5, cy: 0.47, z: 1, ax: 0.5, ay: 0.5 };
    let home = { cover: true, ax: 0.5, ay: 0.5 };
    let focusId = null, focusOpts = {};
    const mouse = { x: 0.5, y: 0.5 }, par = { x: 0, y: 0 };
    let running = false, last = 0, t = 0, hoverId = null, markers = [];

    function resize() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      retarget();
    }
    // At z = 1 the map is exactly as wide as the canvas
    const scr = (u, v) => [(u - view.cx) * W * view.z + W * view.ax + par.x, (v - view.cy) * (W / ASPECT) * view.z + H * view.ay + par.y];

    function retarget() {
      const f = focusId && flights.find((x) => x.id === focusId);
      if (f) {
        const pts = f.path.concat([f.crash]);
        let u0 = 1, u1 = 0, v0 = 1, v1 = 0;
        for (const [u, v] of pts) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
        const bw = Math.max(u1 - u0, 0.004), bh = Math.max(v1 - v0, 0.004);
        const fitW = focusOpts.fitW || 0.5, fitH = focusOpts.fitH || 0.55;
        const z = Math.min((W * fitW) / (bw * W), (H * fitH) / (bh * W / ASPECT));
        Object.assign(target, {
          cx: (u0 + u1) / 2, cy: (v0 + v1) / 2,
          z: Math.max(1, Math.min(focusOpts.maxZoom || 4, z)),
          ax: focusOpts.anchorX != null ? focusOpts.anchorX : 0.5,
          ay: focusOpts.anchorY != null ? focusOpts.anchorY : 0.5
        });
      } else {
        const cover = home.cover ? Math.max(1, (H * ASPECT) / W) : 1;
        Object.assign(target, { cx: 0.5, cy: home.cover ? 0.47 : 0.5, z: cover * (home.zoom || 1), ax: home.ax, ay: home.ay });
      }
      if (reduce) Object.assign(view, target);
    }

    function setFlights(list) {
      flights = list.map((f, k) => {
        const path = greatCircle(f.geo.from, f.geo.crash, 48);
        const plan = greatCircle(f.geo.crash, f.geo.dest, 48);
        const cum = [0];
        for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], (path[i][1] - path[i - 1][1]) / ASPECT));
        const len = pathLength(path);
        return {
          id: f.id, brand: f.brand, label: f.callsigns[0], path, plan, cum,
          crash: project(f.geo.crash[0], f.geo.crash[1]),
          dur: Math.max(2.6, Math.min(7, len * 16)), hold: 1.8, phase: (k * 1.37) % 6
        };
      });
      retarget();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = opts.background || "#f6f7f9";
      ctx.fillRect(0, 0, W, H);

      // Land
      const pitch = (W * view.z) / MASK.cols;
      const r = Math.max(1.05, Math.min(3.4, pitch * 0.26));
      ctx.fillStyle = opts.dots || "#cfd6de";
      ctx.beginPath();
      for (let i = 0; i < DOTS.length; i += 2) {
        const [x, y] = scr(DOTS[i], DOTS[i + 1]);
        if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();

      // Live traffic
      if (live.length) {
        ctx.fillStyle = "rgba(84,104,130,0.45)";
        const glyph = view.z > 2.2;
        if (!glyph) ctx.beginPath();
        for (const a of live) {
          const [x, y] = scr(a.u, a.v);
          if (x < -6 || y < -6 || x > W + 6 || y > H + 6) continue;
          if (glyph) {
            ctx.save(); ctx.translate(x, y); ctx.rotate((a.track || 0) * Math.PI / 180); ctx.scale(0.42, 0.42); ctx.fill(PLANE); ctx.restore();
          } else { ctx.moveTo(x + 1.3, y); ctx.arc(x, y, 1.3, 0, Math.PI * 2); }
        }
        if (!glyph) ctx.fill();
      }

      // Accident routes
      markers = [];
      const hl = highlight;
      const order = hl ? flights.filter((f) => f.id !== hl).concat(flights.filter((f) => f.id === hl)) : flights;
      const zs = Math.min(1.7, Math.sqrt(view.z));
      for (const f of order) {
        const on = hl === f.id, dim = hl && !on;
        const alpha = dim ? 0.14 : on ? 1 : 0.6;
        const cyc = (t + f.phase) % (f.dur + f.hold);
        const prog = reduce ? 1 : Math.min(1, cyc / f.dur);
        const pulse = reduce ? 0 : cyc > f.dur ? (cyc - f.dur) / f.hold : -1;

        // Planned remainder of the journey, never flown
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = on ? 1.4 : 1;
        ctx.strokeStyle = hexA(f.brand, alpha * 0.45);
        ctx.beginPath();
        f.plan.forEach(([u, v], i) => { const [x, y] = scr(u, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
        ctx.setLineDash([]);

        // Flown path: faint full line, bright trail up to the aircraft
        const pos = pointAt(f.path, f.cum, prog);
        ctx.lineWidth = on ? 2.4 : 1.5;
        ctx.strokeStyle = hexA(f.brand, alpha * 0.3);
        ctx.beginPath();
        f.path.forEach(([u, v], i) => { const [x, y] = scr(u, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
        ctx.strokeStyle = hexA(f.brand, alpha);
        ctx.beginPath();
        for (let i = 0; i < pos.i; i++) { const [x, y] = scr(f.path[i][0], f.path[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        { const [x, y] = scr(pos.u, pos.v); ctx.lineTo(x, y); }
        ctx.stroke();

        // Crash site
        const [cx, cy] = scr(f.crash[0], f.crash[1]);
        if (pulse >= 0) {
          ctx.strokeStyle = hexA(f.brand, alpha * (1 - pulse));
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(cx, cy, 4 + pulse * 16 * zs, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = hexA(f.brand, dim ? 0.3 : 1);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, (on ? 5 : 3.4) * Math.min(1.3, zs), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        markers.push({ id: f.id, x: cx, y: cy });

        // Aircraft
        if (prog < 1 || on) {
          const [px, py] = scr(pos.u, pos.v);
          const ang = Math.atan2(pos.dv * (W / ASPECT), pos.du * W) + Math.PI / 2;
          ctx.save();
          ctx.translate(px, py); ctx.rotate(isFinite(ang) ? ang : 0); ctx.scale(zs * (on ? 1.25 : 0.9), zs * (on ? 1.25 : 0.9));
          ctx.globalAlpha = dim ? 0.35 : 1;
          ctx.fillStyle = f.brand; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2;
          ctx.stroke(PLANE); ctx.fill(PLANE);
          ctx.restore();
        }

        if (on) { // callsign tag
          ctx.font = "700 11px 'B612 Mono', ui-monospace, monospace";
          const w = ctx.measureText(f.label).width + 14;
          const lx = Math.min(W - w - 6, cx + 10), ly = cy - 26;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, w, 20, 10) : ctx.rect(lx, ly, w, 20); ctx.fill();
          ctx.fillStyle = f.brand; ctx.fillText(f.label, lx + 7, ly + 14);
        }
      }
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now; t += dt;
      const k = 1 - Math.exp(-dt * 3.2);
      for (const key of ["cx", "cy", "z", "ax", "ay"]) view[key] += (target[key] - view[key]) * k;
      if (!reduce) {
        par.x += ((0.5 - mouse.x) * 18 - par.x) * k;
        par.y += ((0.5 - mouse.y) * 12 - par.y) * k;
      }
      draw();
      requestAnimationFrame(frame);
    }

    function pick(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 18;
      for (const m of markers) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m.id; } }
      return best;
    }
    canvas.addEventListener("pointermove", (e) => {
      const id = pick(e);
      canvas.style.cursor = id ? "pointer" : "default";
      if (id !== hoverId) { hoverId = id; opts.onHover && opts.onHover(id); }
    });
    canvas.addEventListener("pointerleave", () => { if (hoverId) { hoverId = null; opts.onHover && opts.onHover(null); } });
    canvas.addEventListener("click", (e) => { const id = pick(e); if (id && opts.onSelect) opts.onSelect(id); });
    window.addEventListener("pointermove", (e) => { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    window.addEventListener("resize", resize);
    resize();

    return {
      setFlights,
      setHighlight(id) { highlight = id || null; },
      setFocus(id, o) { focusId = id || null; focusOpts = o || {}; retarget(); },
      setHome(o) { home = { cover: o.cover !== false, ax: o.anchorX != null ? o.anchorX : 0.5, ay: o.anchorY != null ? o.anchorY : 0.5, zoom: o.zoom || 1 }; retarget(); },
      setLive(list) { live = (list || []).map((a) => { const [u, v] = project(a.lat, a.lon); return { u, v, track: a.track }; }); },
      start() { if (running) return; running = true; resize(); last = performance.now(); requestAnimationFrame(frame); },
      stop() { running = false; }
    };
  }

  window.WorldMap = { create };
})();

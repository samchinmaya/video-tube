(function () {
  "use strict";

  const INCIDENTS = window.INCIDENTS;
  const START_ALT = 5000;
  const STEP = 1000;
  const MAX_ALT = START_ALT + STEP * 10;
  const QUESTIONS_PER_FLIGHT = 10;
  const STORE_KEY = "tenFlightsToSave.v1";
  const KEYS = ["A", "B", "C", "D"];

  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => INCIDENTS.find((x) => x.id === id);
  const fmtAlt = (ft) => Math.max(0, ft).toLocaleString("en-US");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- Per-viewer records (best score + badge); the game works without them ----
  function loadRecords() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveRecords() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(records)); } catch (e) { /* storage unavailable */ }
  }
  let records = loadRecords();

  let state = { screen: "hangar" };
  let motionTimer = null;

  function shuffled(n) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Badge artwork ----
  function badgeSVG(inc, locked) {
    const code = esc(inc.callsigns[0]);
    const wing = "M100 58 C78 44 42 38 6 42 C30 50 54 55 76 58 C54 60 34 63 16 68 C42 72 70 70 98 66 Z" +
                 " M96 72 C74 76 52 80 32 86 C56 88 78 84 98 78 Z";
    return `<svg class="badge-svg${locked ? " locked" : ""}" viewBox="0 0 240 130" role="img" aria-label="${locked ? "Locked badge" : "Badge"} for ${code}">
      <path d="${wing}" fill="var(--gold)"/>
      <path d="${wing}" fill="var(--gold)" transform="translate(240 0) scale(-1 1)"/>
      <circle cx="120" cy="64" r="36" fill="var(--gold)"/>
      <circle cx="120" cy="64" r="29" fill="var(--surface)"/>
      <path d="M104 60 L120 50 L136 60 L120 56 Z" fill="var(--accent)"/>
      <text x="120" y="74" text-anchor="middle" font-family="B612 Mono, monospace" font-size="9.5" font-weight="700" fill="var(--ink)">${code}</text>
      <text x="120" y="86" text-anchor="middle" font-family="B612 Mono, monospace" font-size="7" letter-spacing="1.5" fill="var(--muted)">${locked ? "LOCKED" : "SAVED"}</text>
    </svg>`;
  }

  // ---- Screens ----
  function show(screen) {
    for (const id of ["hangar", "briefing", "flight", "result"]) $("#" + id).hidden = id !== screen;
  }

  function renderHangar() {
    const list = $("#strips");
    list.innerHTML = INCIDENTS.map((inc, i) => {
      const rec = records[inc.id] || {};
      const status = rec.saved
        ? '<span class="chip saved">Badge earned</span>'
        : rec.best != null
          ? `<span class="chip tried">Best ${rec.best}/10</span>`
          : '<span class="chip">Not flown</span>';
      return `<li><button class="strip" type="button" data-id="${inc.id}">
        <span class="strip-rank">#${i + 1}</span>
        <span class="strip-call">${inc.callsigns.map(esc).join('<br><span class="sep"> · </span>')}</span>
        <span class="strip-main"><strong>${esc(inc.name)}</strong><span>${esc(inc.date)} · ${esc(inc.aircraft)}</span><span>${esc(inc.location)}</span></span>
        <span class="strip-toll"><b>${inc.fatalities}</b> lives lost</span>
        <span class="strip-status">${status}</span>
      </button></li>`;
    }).join("");
    const earned = INCIDENTS.filter((x) => records[x.id] && records[x.id].saved).length;
    $("#badge-count").textContent = `${earned} of ${INCIDENTS.length} saved`;
    $("#tally-pips").innerHTML = INCIDENTS.map((x) => `<i class="${records[x.id] && records[x.id].saved ? "on" : ""}"></i>`).join("");
  }

  function renderBriefing() {
    const inc = byId(state.id);
    $("#br-call").textContent = inc.callsigns.join(" · ");
    $("#br-name").textContent = inc.name;
    $("#br-facts").innerHTML = [
      ["Date", inc.date],
      ["Aircraft", inc.aircraft],
      ["Route", inc.route],
      ["People on board", inc.aboard.toLocaleString("en-US")]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    $("#br-text").textContent = inc.briefing;
  }

  function renderFlight() {
    const inc = byId(state.id);
    const q = inc.questions[state.q];
    const order = state.orders[state.q];

    $("#fl-call").textContent = `${inc.callsigns.join(" · ")} · ${inc.date}`;
    $("#fl-name").textContent = inc.name;
    setAltitude(state.alt);
    $("#sky").classList.toggle("crashed", state.over === "crash");

    $("#q-count").textContent = `Question ${state.q + 1} of ${QUESTIONS_PER_FLIGHT}`;
    $("#q-score").textContent = `Right ${state.correct} · Wrong ${state.wrong}`;
    $("#pips").innerHTML = Array.from({ length: QUESTIONS_PER_FLIGHT }, (_, i) => {
      const cls = i < state.answers.length ? (state.answers[i] ? "ok" : "no") : i === state.q ? "now" : "";
      return `<i class="${cls}"></i>`;
    }).join("");
    $("#q-text").textContent = q.q;

    const picked = state.picked;
    $("#options").innerHTML = order.map((optIdx, i) => {
      let cls = "opt", mark = "";
      if (picked != null) {
        if (optIdx === 0) { cls += " is-correct"; mark = "Correct"; }
        else if (i === picked) { cls += " is-wrong"; mark = "Your answer"; }
        else cls += " is-dim";
      }
      return `<li><button class="${cls}" type="button" data-i="${i}" ${picked != null ? "disabled" : ""}>
        <span class="opt-key">${KEYS[i]}</span><span>${esc(q.a[optIdx])}</span><span class="opt-mark">${mark}</span>
      </button></li>`;
    }).join("");

    const fb = $("#feedback");
    const next = $("#next");
    if (picked == null) {
      fb.hidden = true;
      next.hidden = true;
      $("#keys-hint").hidden = false;
      return;
    }
    const ok = order[picked] === 0;
    fb.hidden = false;
    fb.className = "feedback " + (ok ? "good" : "bad");
    let head;
    if (state.over === "crash") head = 'Wrong. <span class="fb-alt">Altitude 0 ft.</span> The aircraft has hit the ground.';
    else if (ok) head = `Correct. <span class="fb-alt">Climbing to ${fmtAlt(state.alt)} ft.</span>`;
    else head = `Wrong. <span class="fb-alt">Descending to ${fmtAlt(state.alt)} ft.</span>`;
    $("#fb-head").innerHTML = head;
    $("#fb-why").textContent = q.why;
    next.hidden = false;
    next.textContent = state.over || state.q === QUESTIONS_PER_FLIGHT - 1 ? "See the outcome" : "Next question";
    $("#keys-hint").hidden = true;
  }

  function renderResult() {
    const inc = byId(state.id);
    const card = $("#res-card");
    const saved = state.outcome === "saved";
    card.classList.toggle("saved", saved);
    $("#res-visual").innerHTML = badgeSVG(inc, !saved);
    if (saved) {
      $("#res-eyebrow").textContent = "Badge earned";
      $("#res-title").textContent = "Flight saved";
      $("#res-sub").textContent = `You answered all ten correctly and brought ${inc.callsigns[0]} home safely. The badge is now in your hangar.`;
    } else if (state.outcome === "crash") {
      $("#res-eyebrow").textContent = "Altitude 0 ft";
      $("#res-title").textContent = "Flight lost";
      $("#res-sub").textContent = "Five wrong answers took the aircraft down. Read what happened, then try again.";
    } else {
      $("#res-eyebrow").textContent = "Badge locked";
      $("#res-title").textContent = "Not saved yet";
      $("#res-sub").textContent = "Every answer has to be right to save this flight. Read the debrief and fly it again.";
    }
    $("#res-score").textContent = `Score ${state.correct}/10 · Final altitude ${fmtAlt(state.alt)} ft`;
    $("#res-debrief").textContent = inc.debrief;
    $("#res-legacy").textContent = inc.legacy;
    const ground = inc.fatalities - Math.min(inc.fatalities, inc.aboard - inc.survivors);
    $("#res-memorial").textContent =
      `In memory of the ${inc.fatalities.toLocaleString("en-US")} people who died` +
      (ground > 0 ? `, including ${ground} on the ground` : "") +
      `, ${inc.date}.`;
  }

  function render() {
    show(state.screen);
    if (state.screen === "hangar") renderHangar();
    else if (state.screen === "briefing") renderBriefing();
    else if (state.screen === "flight") renderFlight();
    else if (state.screen === "result") renderResult();
  }

  function go(next) {
    state = next;
    render();
    window.scrollTo(0, 0);
  }

  // ---- Altimeter and aircraft ----
  function buildAltimeter() {
    const scale = $("#alti-scale");
    const steps = MAX_ALT / STEP;
    let html = "";
    for (let i = 0; i <= steps; i++) {
      const major = i % 5 === 0;
      html += `<div class="tick${major ? " major" : ""}" style="bottom:${(i / steps) * 100}%">${major ? `<span>${i}</span>` : ""}</div>`;
    }
    scale.insertAdjacentHTML("afterbegin", html);
  }

  function setAltitude(alt) {
    const p = Math.max(0, Math.min(1, alt / MAX_ALT));
    $("#sky").style.setProperty("--p", p.toFixed(4));
    $("#alt-read").textContent = String(Math.max(0, alt)).padStart(5, "0").replace(/(\d{2})(\d{3})$/, "$1,$2");
  }

  function pitch(dir) {
    const sky = $("#sky");
    clearTimeout(motionTimer);
    sky.classList.remove("climb", "descend");
    void sky.offsetWidth;
    sky.classList.add(dir);
    motionTimer = setTimeout(() => sky.classList.remove(dir), 1200);
  }

  // ---- Game flow ----
  function openBriefing(id) {
    go({ screen: "briefing", id });
  }

  function takeOff() {
    const inc = byId(state.id);
    go({
      screen: "flight",
      id: inc.id,
      q: 0,
      alt: START_ALT,
      correct: 0,
      wrong: 0,
      answers: [],
      picked: null,
      over: null,
      orders: inc.questions.map((q) => shuffled(q.a.length))
    });
  }

  function answer(i) {
    if (state.screen !== "flight" || state.picked != null) return;
    const ok = state.orders[state.q][i] === 0;
    state.picked = i;
    state.answers.push(ok);
    if (ok) { state.correct++; state.alt += STEP; }
    else { state.wrong++; state.alt -= STEP; }
    if (state.alt <= 0) {
      state.alt = 0;
      state.over = "crash";
      $("#sky").classList.add("crashed");
    } else {
      pitch(ok ? "climb" : "descend");
    }
    renderFlight();
    $("#next").focus({ preventScroll: true });
  }

  function nextQuestion() {
    if (state.picked == null) return;
    if (state.over || state.q === QUESTIONS_PER_FLIGHT - 1) return finish();
    state.q++;
    state.picked = null;
    renderFlight();
    const first = document.querySelector("#options .opt");
    if (first) first.focus({ preventScroll: true });
  }

  function finish() {
    const outcome = state.over === "crash" ? "crash" : state.correct === QUESTIONS_PER_FLIGHT ? "saved" : "short";
    const rec = records[state.id] || {};
    rec.best = Math.max(rec.best || 0, state.correct);
    rec.saved = rec.saved || outcome === "saved";
    records[state.id] = rec;
    saveRecords();
    go(Object.assign({}, state, { screen: "result", outcome }));
  }

  function toHangar() {
    $("#sky").classList.remove("crashed", "climb", "descend");
    go({ screen: "hangar" });
  }

  // ---- Wiring ----
  function wire() {
    $("#strips").addEventListener("click", (e) => {
      const b = e.target.closest(".strip");
      if (b) openBriefing(b.dataset.id);
    });
    $("#take-off").addEventListener("click", takeOff);
    $("#br-back").addEventListener("click", toHangar);
    $("#abort").addEventListener("click", toHangar);
    $("#options").addEventListener("click", (e) => {
      const b = e.target.closest(".opt");
      if (b && !b.disabled) answer(Number(b.dataset.i));
    });
    $("#next").addEventListener("click", nextQuestion);
    $("#retry").addEventListener("click", () => { $("#sky").classList.remove("crashed"); takeOff(); });
    $("#res-hangar").addEventListener("click", toHangar);

    document.addEventListener("keydown", (e) => {
      if (state.screen !== "flight" || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      const idx = KEYS.indexOf(k) >= 0 ? KEYS.indexOf(k) : ["1", "2", "3", "4"].indexOf(k);
      if (idx >= 0 && state.picked == null) { e.preventDefault(); answer(idx); }
      else if (e.key === "Enter" && state.picked != null && document.activeElement !== $("#next")) { e.preventDefault(); nextQuestion(); }
    });
  }

  function start(data) {
    if (data && data.screen) state = data;
    buildAltimeter();
    wire();
    render();
  }

  // Keep an in-progress flight when a hosting viewer hot-reloads the page.
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
    window.claude.hot.snapshot(() => state);
  }
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start);
  else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();

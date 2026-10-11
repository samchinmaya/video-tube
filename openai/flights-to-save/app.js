// Flights to Save — React UI (htm templates, Tailwind classes).
// Front page: interactive world map (worldmap.js) with every accident route and live traffic from OpenSky.
// Flight: three.js engine (sim3d.js). Each flight's screens take its airline colour.
(function () {
  "use strict";
  const { useState, useEffect, useRef } = React;
  const html = htm.bind(React.createElement);

  const INCIDENTS = window.INCIDENTS;
  const COUNT = INCIDENTS.length;
  const START_ALT = 10000;   // ten wrong answers reach 0 ft
  const STEP = 1000;
  const N = 10;
  const STORE_KEY = "tenFlightsToSave.v1";
  const DEFAULT_ACCENT = "#ff5a1f";
  const LIVE_URL = "https://opensky-network.org/api/states/all";
  const LIVE_EVERY = 5 * 60 * 1000;   // anonymous OpenSky access allows about 100 global requests a day

  const byId = (id) => INCIDENTS.find((x) => x.id === id);
  const fmt = (ft) => Math.max(0, ft).toLocaleString("en-US");
  const yearOf = (inc) => inc.date.slice(-4);
  const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];

  function loadRecords() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveRecords(r) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(r)); } catch (e) { /* storage unavailable */ }
  }
  function shuffled(n) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function useMedia(q) {
    const [m, setM] = useState(() => window.matchMedia(q).matches);
    useEffect(() => {
      const mq = window.matchMedia(q), on = () => setM(mq.matches);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    }, [q]);
    return m;
  }

  // Text that fades in letter by letter out of a blur
  function Fade({ text, delay = 0, step = 0.03 }) {
    let n = 0;
    return html`<span aria-label=${text}>
      ${text.split(" ").map((word, w, all) => html`<span key=${w} className="inline-block whitespace-nowrap" aria-hidden="true">
        ${word.split("").map((ch, c) => html`<span key=${c} className="inline-block animate-letter" style=${{ animationDelay: `${delay + (n++) * step}s` }}>${ch}</span>`)}
        ${w < all.length - 1 ? html`<span className="inline-block w-[0.28em]"></span>` : null}
      </span>`)}
    </span>`;
  }

  // Tail fin in the airline's colour
  function Fin({ color, size = 16 }) {
    return html`<svg viewBox="0 0 16 16" width=${size} height=${size} aria-hidden="true" className="shrink-0">
      <path d="M2 14 L8.5 2 L13 2 L11.5 14 Z" fill=${color} />
    </svg>`;
  }

  function Badge({ inc, locked }) {
    const code = inc.callsigns[0];
    const wing = "M100 58 C78 44 42 38 6 42 C30 50 54 55 76 58 C54 60 34 63 16 68 C42 72 70 70 98 66 Z M96 72 C74 76 52 80 32 86 C56 88 78 84 98 78 Z";
    return html`<svg viewBox="0 0 240 130" role="img" aria-label=${`${locked ? "Locked badge" : "Badge"} for ${code}`}
      className=${`w-[min(220px,60vw)] h-auto ${locked ? "opacity-25 grayscale" : "animate-badge"}`}>
      <path d=${wing} fill="var(--gold)" />
      <path d=${wing} fill="var(--gold)" transform="translate(240 0) scale(-1 1)" />
      <circle cx="120" cy="64" r="36" fill="var(--gold)" />
      <circle cx="120" cy="64" r="29" fill="#ffffff" />
      <path d="M104 60 L120 50 L136 60 L120 56 Z" fill=${inc.brand} />
      <text x="120" y="74" textAnchor="middle" fontFamily="B612 Mono, monospace" fontSize="9.5" fontWeight="700" fill="var(--ink)">${code}</text>
      <text x="120" y="86" textAnchor="middle" fontFamily="B612 Mono, monospace" fontSize="7" letterSpacing="1.5" fill="var(--muted)">${locked ? "LOCKED" : "SAVED"}</text>
    </svg>`;
  }

  const linkCls = "justify-self-start font-mono text-[13px] text-muted hover:text-ink transition-colors cursor-pointer py-1";
  const brandBtn = "inline-flex items-center gap-2 rounded-full bg-accent-strong text-white font-bold px-6 py-3 cursor-pointer transition-transform duration-300 ease-out hover:scale-105 active:scale-95";
  const card = "pointer-events-auto rounded-3xl bg-white/85 backdrop-blur-xl shadow-[0_30px_80px_rgba(20,32,52,0.16)] ring-1 ring-black/5";

  // ---------- Earth layer (shared by hangar, briefing and result) ----------
  // Realistic 3D globe where WebGL works; the flat dotted map otherwise.
  function MapLayer({ visible, highlight, focus, home, live, onHover, onSelect }) {
    const ref = useRef(null), mapRef = useRef(null), cb = useRef({});
    cb.current = { onHover, onSelect };
    const [ready, setReady] = useState(false);
    useEffect(() => {
      const handlers = { background: 0xf6f7f9, onHover: (id) => cb.current.onHover(id), onSelect: (id) => cb.current.onSelect(id) };
      let m = window.Globe3D ? window.Globe3D.create(ref.current, handlers) : null;
      if (!m && window.WorldMap) {
        const c = document.createElement("canvas");
        c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
        ref.current.appendChild(c);
        m = window.WorldMap.create(c, { ...handlers, background: "#f6f7f9", dots: "#c6ced8" });
      }
      if (!m) return;
      m.setFlights(INCIDENTS);
      mapRef.current = m;
      setReady(true);
    }, []);
    useEffect(() => { if (ready) visible ? mapRef.current.start() : mapRef.current.stop(); }, [visible, ready]);
    useEffect(() => { if (ready) mapRef.current.setHighlight(highlight); }, [highlight, ready]);
    useEffect(() => { if (ready) mapRef.current.setHome(home); }, [JSON.stringify(home), ready]);
    useEffect(() => { if (ready) mapRef.current.setFocus(focus.id, focus.opts); }, [focus.id, JSON.stringify(focus.opts), ready]);
    useEffect(() => { if (ready) mapRef.current.setLive(live); }, [live, ready]);
    return html`<div ref=${ref} hidden=${!visible} className="fixed inset-0 z-0" role="img" aria-label="Globe showing each accident's route from its departure airport to the crash site"></div>`;
  }

  // ---------- Live traffic status ----------
  function LiveChip({ info, show, onToggle }) {
    const dot = info.state === "ok" ? "bg-good animate-pulse" : info.state === "loading" ? "bg-gold animate-pulse" : "bg-muted";
    let text;
    if (info.state === "ok") {
      const hh = String(info.time.getUTCHours()).padStart(2, "0"), mm = String(info.time.getUTCMinutes()).padStart(2, "0");
      text = `Live traffic · ${info.count.toLocaleString("en-US")} aircraft · ${hh}:${mm} UTC${info.stale ? " (last update)" : ""}`;
    } else if (info.state === "loading") text = "Loading live traffic…";
    else text = "Live traffic unavailable in this view";
    return html`<div className="pointer-events-auto inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full bg-white/85 backdrop-blur-md ring-1 ring-black/5 px-3.5 py-2 font-mono text-[11px] text-ink animate-fade-up" style=${{ animationDelay: "0.9s" }}>
      <span className=${`size-2 rounded-full ${dot}`}></span>
      <span>${text}</span>
      ${info.state === "ok" ? html`<button type="button" onClick=${onToggle} className="text-muted hover:text-ink underline underline-offset-2 cursor-pointer">${show ? "Hide" : "Show"}</button>` : null}
      <a href="https://opensky-network.org" target="_blank" rel="noopener" className="text-muted hover:text-ink">OpenSky Network</a>
    </div>`;
  }

  // ---------- How to fly ----------
  const CONTROLS = [
    ["Pick a flight", "Hover or tap a flight in the list, or a crash marker on the globe. Drag the globe to spin it, scroll to zoom."],
    ["Take off", "Throttle up with Page Up or +. Keep the centreline with ← → (or , . for rudder). At ROTATE (about 152 kt) pull back with ↓ or S. After liftoff press G for gear up. Skip take-off does it for you."],
    ["Answer", "Keys 1–4 or tap an answer. Right answers climb 1,000 ft, wrong answers sink 1,000 ft. Enter for the next question."],
    ["Fly", "W / S or ↓ / ↑ to climb and descend a little. A / D or ← → to bank and turn. Flaps F / Shift+F, brakes B."],
    ["Cameras", "V cycles Chase, Wing, Cockpit and Cabin. The Cabin view shows the passengers and crew."],
    ["Win", "Ten right answers save the flight and earn its badge. Ten wrong answers and the aircraft goes down."]
  ];
  function HelpCard({ onClose }) {
    return html`<div className="pointer-events-auto fixed inset-0 z-20 grid place-items-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in" onClick=${onClose}>
      <div role="dialog" aria-modal="true" aria-label="How to fly" onClick=${(e) => e.stopPropagation()}
        className=${`${card} w-full max-w-[560px] max-h-[86vh] overflow-y-auto p-6 grid gap-4 animate-zoom-near`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-normal">How to fly</h2>
          <button type="button" onClick=${onClose} className="rounded-full bg-ink/[0.06] hover:bg-ink/[0.12] px-3 py-1.5 font-mono text-xs cursor-pointer">Close</button>
        </div>
        <ol className="grid gap-3">
          ${CONTROLS.map(([k, v], i) => html`<li key=${k} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 animate-fade-up" style=${{ animationDelay: `${0.08 + i * 0.05}s` }}>
            <span className="font-mono text-xs text-muted pt-0.5">${String(i + 1).padStart(2, "0")}</span>
            <div><p className="font-bold">${k}</p><p className="text-sm text-muted leading-relaxed">${v}</p></div>
          </li>`)}
        </ol>
        <p className="font-mono text-[11px] text-muted">On a phone, use the on-screen pad: W A S D, T+ / T− for throttle and G for gear.</p>
      </div>
    </div>`;
  }

  // ---------- Hangar ----------
  function Hangar({ records, sort, setSort, hover, setHover, onPick, liveInfo, showLive, setShowLive }) {
    const [help, setHelp] = useState(false);
    const list = INCIDENTS.slice().sort(sort === "year"
      ? (a, b) => new Date(a.date) - new Date(b.date)
      : (a, b) => b.fatalities - a.fatalities);
    const earned = INCIDENTS.filter((x) => records[x.id] && records[x.id].saved).length;
    const shown = hover ? byId(hover) : null;
    const seg = (key, label) => html`<button type="button" onClick=${() => setSort(key)} aria-pressed=${sort === key}
      className=${`px-3 py-1 rounded-full transition-colors cursor-pointer ${sort === key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>${label}</button>`;

    return html`<section className="relative z-[1] flow-root min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden pointer-events-none">
      <header className="pointer-events-auto absolute left-4 top-6 md:left-10 md:top-9 grid gap-3 max-w-[min(500px,calc(100vw-32px))] lg:max-w-[min(480px,calc(100vw-470px))]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted animate-fade-in">Aviation safety quiz · ${COUNT} flights</p>
        <h1 className="text-[clamp(32px,4.2vw,54px)] font-normal leading-[1.05] tracking-[-0.015em]"><${Fade} text="Flights to Save" delay=${0.15} /></h1>
        <p className="text-[15px] text-muted max-w-[44ch] animate-fade-up" style=${{ animationDelay: "0.55s" }}>
          ${WORDS[COUNT] || COUNT} real accidents, ten questions each. Right answers climb, wrong answers sink, and ten right answers save the flight. Drag the globe, or hover a flight to fly its real route.
        </p>
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px] animate-fade-up" style=${{ animationDelay: "0.7s" }}>
          ${["Start 10,000 ft", "Right +1,000 ft", "Wrong −1,000 ft", "10 / 10 earns the badge"].map((c) => html`<span key=${c} className="rounded-full bg-white/80 ring-1 ring-black/5 px-2.5 py-1 text-ink">${c}</span>`)}
          <button type="button" onClick=${() => setHelp(true)} className="rounded-full bg-ink text-white px-3 py-1 cursor-pointer transition-transform hover:scale-105">How to fly</button>
        </div>
      </header>

      <div className="absolute left-4 md:left-10 top-[calc(58vh-48px)] lg:top-auto lg:bottom-8 grid gap-3 justify-items-start max-w-[calc(100vw-32px)]">
        ${shown ? html`<div key=${shown.id} className=${`${card} hidden lg:grid gap-2 w-[360px] p-5 animate-zoom-near`}>
          <div className="flex items-center gap-2"><${Fin} color=${shown.brand} /><span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">${shown.callsigns.join(" · ")} · ${yearOf(shown)}</span></div>
          <p className="text-lg font-bold leading-snug">${shown.name}</p>
          <p className="text-sm text-muted">${shown.geo.fromName} → ${shown.geo.destName}, never arrived. Crashed: ${shown.location}.</p>
          <p className="font-mono text-xs text-muted">${shown.date} · ${shown.aircraft} · ${shown.fatalities} lives lost</p>
          <div className="pt-1"><button type="button" className="inline-flex items-center gap-2 rounded-full text-white font-bold px-5 py-2.5 cursor-pointer transition-transform duration-300 hover:scale-105" style=${{ background: shown.brand }} onClick=${() => onPick(shown.id)}>Fly this flight →</button></div>
        </div>` : null}
        <${LiveChip} info=${liveInfo} show=${showLive} onToggle=${() => setShowLive(!showLive)} />
      </div>

      <aside className=${`${card} relative mt-[58vh] lg:mt-0 lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:w-[400px] flex flex-col rounded-b-none lg:rounded-b-3xl animate-slide-in`}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <p className="font-bold">${COUNT} flights</p>
            <p className="font-mono text-[11px] text-muted">${earned} of ${COUNT} saved</p>
          </div>
          <div className="flex rounded-full bg-ink/[0.05] p-1 font-mono text-[11px]" role="group" aria-label="Sort flights">
            ${seg("deadliest", "Deadliest")}${seg("year", "Year")}
          </div>
        </div>
        <ol className="lg:flex-1 lg:overflow-y-auto px-2 pb-3">
          ${list.map((inc, i) => {
            const rec = records[inc.id] || {};
            const on = hover === inc.id;
            return html`<li key=${inc.id + sort} className="animate-fade-up" style=${{ animationDelay: `${0.25 + i * 0.035}s` }}>
              <button type="button" onClick=${() => onPick(inc.id)}
                onMouseEnter=${() => setHover(inc.id)} onMouseLeave=${() => setHover(null)} onFocus=${() => setHover(inc.id)} onBlur=${() => setHover(null)}
                className=${`group w-full grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 rounded-2xl text-left cursor-pointer transition-[background-color,transform] duration-300 ease-out hover:translate-x-1 ${on ? "bg-ink/[0.05]" : ""}`}>
                <${Fin} color=${inc.brand} />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-tight truncate">${inc.name}</span>
                  <span className="block font-mono text-[11px] text-muted truncate">${inc.callsigns.join(" · ")} · ${yearOf(inc)}${inc.landmark ? " · landmark" : ""}</span>
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="text-right font-mono leading-tight"><span className="block text-[13px]">${inc.fatalities}</span><span className="block text-[10px] text-muted">lives</span></span>
                  <span className=${`size-2 rounded-full ${rec.saved ? "" : rec.best != null ? "ring-1 ring-muted" : "ring-1 ring-line"}`} style=${rec.saved ? { background: inc.brand } : null}
                    aria-label=${rec.saved ? "Badge earned" : rec.best != null ? `Best ${rec.best}/10` : "Not flown"}></span>
                </span>
              </button>
            </li>`;
          })}
        </ol>
        <p className="px-5 pb-5 text-[11px] text-muted leading-relaxed">
          The ten deadliest accidental airliner crashes, plus seven landmark accidents that changed how aircraft are built and flown. Deliberate acts are not included, and Air India 171 (2025) is left out while its investigation is open. Every flight here was real.
          <br />3D terrain is the real ground around each crash site, from <a className="underline underline-offset-2 hover:text-ink" href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Mapzen terrain tiles</a> (SRTM, GMTED, ETOPO1 and others). Earth imagery: NASA Blue Marble. Fallback map coastlines: Natural Earth.
        </p>
      </aside>
      ${help ? html`<${HelpCard} onClose=${() => setHelp(false)} />` : null}
    </section>`;
  }

  // ---------- Briefing ----------
  function Briefing({ inc, onBack, onTakeOff }) {
    const facts = [["Date", inc.date], ["Aircraft", inc.aircraft], ["On board", inc.aboard.toLocaleString("en-US")], ["Lives lost", inc.fatalities.toLocaleString("en-US")]];
    return html`<section className="relative z-[1] min-h-[100dvh] flex items-end lg:items-center px-4 md:px-10 pt-[46vh] pb-6 lg:py-8 pointer-events-none">
      <div className=${`${card} w-full max-w-[470px] p-6 md:p-7 grid gap-4 animate-zoom-near`}>
        <button type="button" className=${linkCls} onClick=${onBack}>← All flights</button>
        <div className="flex items-center gap-2 animate-fade-up" style=${{ animationDelay: "0.15s" }}>
          <span className="rounded-full px-3 py-1 text-white font-mono text-xs font-bold" style=${{ background: inc.brand }}>${inc.callsigns.join(" · ")}</span>
          <span className="font-mono text-xs text-muted">${yearOf(inc)}</span>
        </div>
        <h2 className="text-[clamp(26px,3vw,36px)] font-normal leading-tight tracking-[-0.01em]"><${Fade} text=${inc.name} delay=${0.2} step=${0.02} /></h2>
        <p className="text-sm text-muted animate-fade-up" style=${{ animationDelay: "0.35s" }}>${inc.geo.fromName} → ${inc.geo.destName}, never arrived. Crashed: ${inc.location}.</p>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5 animate-fade-up" style=${{ animationDelay: "0.45s" }}>
          ${facts.map(([k, v]) => html`<div key=${k}><dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">${k}</dt><dd className="text-sm">${v}</dd></div>`)}
        </dl>
        <p className="text-[15px] leading-relaxed animate-fade-up" style=${{ animationDelay: "0.55s" }}>${inc.briefing}</p>
        <p className="font-mono text-[11px] text-muted animate-fade-up" style=${{ animationDelay: "0.6s" }}>
          ${window.TERRAIN && window.TERRAIN[inc.id] && window.TERRAIN[inc.id].water < 0.9
            ? "You start on runway 36. Take off by hand, then climb to 10,000 ft for the questions. ±1,000 ft per answer · 10/10 earns the badge"
            : "This accident happened over open sea, so you join the flight in the climb. Start 10,000 ft · ±1,000 ft per answer · 10/10 earns the badge"}
        </p>
        <div className="animate-zoom-near" style=${{ animationDelay: "0.7s" }}>
          <button type="button" id="take-off" className=${brandBtn + " text-[16px] px-8 py-3.5"} onClick=${onTakeOff}>Take off</button>
        </div>
      </div>
    </section>`;
  }

  // ---------- Result ----------
  function Result({ g, onRetry, onHangar }) {
    const inc = byId(g.id);
    const saved = g.outcome === "saved", crash = g.outcome === "crash";
    const title = saved ? "Saved" : crash ? "Lost" : "Not yet";
    const eyebrow = saved ? "Badge earned" : crash ? "Altitude 0 ft" : "Badge locked";
    const sub = saved
      ? `You answered all ten correctly and brought ${inc.callsigns[0]} home. The badge is in your hangar.`
      : crash
        ? "Every answer was wrong, and the aircraft went down. Read what happened, then try again."
        : "Every answer has to be right to save this flight. Read the debrief and fly it again.";
    const ground = inc.fatalities - Math.min(inc.fatalities, inc.aboard - inc.survivors);
    return html`<section className="relative z-[1] min-h-[100dvh] flex items-end lg:items-center px-4 md:px-10 pt-[40vh] pb-6 lg:py-8 pointer-events-none">
      <div className=${`${card} w-full max-w-[500px] p-6 md:p-7 grid gap-4 lg:max-h-[calc(100dvh-64px)] lg:overflow-y-auto animate-zoom-deep`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">${inc.callsigns.join(" · ")} · ${eyebrow}</p>
        <h2 className="text-[clamp(52px,7vw,84px)] font-normal leading-none tracking-[-0.02em] animate-slam" style=${{ color: saved ? inc.brand : crash ? "var(--bad)" : "var(--ink)" }}>${title}</h2>
        <${Badge} inc=${inc} locked=${!saved} />
        <p className="text-[15px] animate-fade-up" style=${{ animationDelay: "0.5s" }}>${sub}</p>
        <p className="font-mono text-xs text-muted animate-fade-up" style=${{ animationDelay: "0.6s" }}>Score ${g.correct}/10 · Final altitude ${fmt(g.alt)} ft</p>
        <div className="flex flex-wrap items-center gap-5 animate-zoom-near" style=${{ animationDelay: "0.7s" }}>
          <button type="button" className=${brandBtn} onClick=${onRetry}>Fly again</button>
          <button type="button" className=${linkCls} onClick=${onHangar}>All flights</button>
        </div>
        <article className="grid gap-2 pt-4 border-t border-line animate-fade-up" style=${{ animationDelay: "0.85s" }}>
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted">What actually happened</h3>
          <p className="text-sm leading-relaxed">${inc.debrief}</p>
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted mt-2">What changed afterward</h3>
          <p className="text-sm leading-relaxed">${inc.legacy}</p>
          <p className="text-xs text-muted mt-2">In memory of the ${inc.fatalities.toLocaleString("en-US")} people who died${ground > 0 ? `, including ${ground} on the ground` : ""}, ${inc.date}.</p>
        </article>
      </div>
    </section>`;
  }

  // ---------- Flight stage (always mounted so the WebGL context is created once) ----------
  function Stage({ g, active, hasSim, skyRef, hudRef, panelRef, pressed, view, onAnswer, onNext, onExit, onView, onPad, telem, callout, toast, onSkip }) {
    const inc = g.id ? byId(g.id) : null;
    const flying = active && inc && g.orders;
    const takeoff = flying && g.phase === "takeoff";
    const q = flying ? inc.questions[g.q] : null;
    const order = flying ? g.orders[g.q] : null;
    const picked = flying ? g.picked : null;
    const ok = picked != null && order[picked] === 0;
    const p = flying ? Math.min(1, g.alt / (START_ALT + STEP * N)) : 0.5;

    let head = null;
    if (picked != null) {
      head = g.over === "crash"
        ? html`Wrong. <span className="font-mono text-bad">Altitude 0 ft.</span> The aircraft is going down.`
        : ok
          ? html`Correct. <span className="font-mono text-good">Climbing to ${fmt(g.alt)} ft.</span>`
          : html`Wrong. <span className="font-mono text-bad">Descending to ${fmt(g.alt)} ft.</span>`;
    }
    const chip = "rounded-full bg-black/50 text-white backdrop-blur-md font-mono font-bold text-xs tracking-[0.04em] px-3.5 py-2 cursor-pointer transition-transform duration-300 ease-out hover:scale-110";

    return html`<section hidden=${!active}
      className=${`fixed inset-0 z-10 overflow-hidden bg-bg ${g.over === "crash" ? "animate-impact" : "animate-warp"}`}>
      <div ref=${skyRef} className="absolute inset-0 overflow-hidden"
        style=${hasSim ? null : { background: "linear-gradient(to top, var(--sky-bottom), var(--sky-top))" }}>
        ${!hasSim && flying ? html`<svg viewBox="0 0 160 60" className="absolute left-[18%] w-40 transition-all duration-[1200ms] ease-out"
            style=${{ bottom: g.over === "crash" ? "3%" : `${12 + p * 60}%`, transform: `rotate(${g.over === "crash" ? 24 : picked == null ? 0 : ok ? -10 : 11}deg)` }}>
            <path d="M18 24 L6 4 L22 4 L44 24 Z" fill="var(--accent)" />
            <path d="M10 30 Q10 23 22 23 L128 23 Q148 23 156 31 Q148 38 128 38 L22 38 Q10 38 10 30 Z" fill="#f8fafc" stroke="#1b2a38" strokeWidth="1.5" />
            <path d="M68 33 L52 52 L66 52 L96 33 Z" fill="#9db0c0" stroke="#1b2a38" />
          </svg>` : null}
      </div>

      <div className="pointer-events-none absolute z-[2] top-[calc(env(safe-area-inset-top,0px)+16px)] inset-x-4 flex justify-between items-start gap-4">
        <div className="pointer-events-auto grid gap-2 justify-items-start min-w-0 flex-1">
          <button type="button" className=${chip} onClick=${onExit}>✕ Exit</button>
          ${inc ? html`<p className="font-mono text-xs uppercase tracking-[0.06em] text-white mix-blend-difference">${inc.callsigns.join(" · ")}<span className="hidden md:inline"> · ${inc.name}</span></p>` : null}
          <p ref=${hudRef} hidden=${!hasSim} className="font-mono text-xs uppercase tracking-[0.06em] text-white/85 mix-blend-difference whitespace-pre-wrap tabular-nums"></p>
        </div>
        ${flying ? html`<div className="grid justify-items-end gap-2.5">
          <p className="flex items-baseline gap-1.5 text-white mix-blend-difference font-display leading-[0.85] font-semibold">
            ${takeoff
              ? html`<b className="font-semibold tabular-nums text-[clamp(48px,10vw,132px)] inline-block">${telem.ias || 0}</b><span className="font-mono text-[13px] uppercase">kt</span>`
              : html`<b key=${g.alt} className=${`font-semibold tabular-nums text-[clamp(48px,10vw,132px)] inline-block ${g.delta > 0 ? "animate-pop-up" : g.delta < 0 ? "animate-pop-down" : ""}`}>${fmt(g.alt)}</b>
            <span className="font-mono text-[13px] uppercase">ft</span>`}
          </p>
          <div className="flex gap-1.5" aria-hidden="true">
            ${Array.from({ length: N }, (_, i) => {
              const cls = i < g.answers.length ? (g.answers[i] ? "bg-good" : "bg-bad") : i === g.q ? "bg-white scale-150" : "bg-white/35";
              return html`<i key=${i} className=${`size-2 rounded-full transition-all duration-300 ${cls}`}></i>`;
            })}
          </div>
        </div>` : null}
      </div>

      ${hasSim ? html`<div className="absolute z-[2] left-4 top-[calc(env(safe-area-inset-top,0px)+130px)] lg:top-auto lg:bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] grid gap-2.5 justify-items-start">
        <div className="grid grid-cols-[repeat(4,40px)] gap-1.5 touch-none select-none [@media(hover:hover)_and_(pointer:fine)]:hidden"
          style=${{ gridTemplateAreas: '". w . thrUp" "a s d thrDn" ". . . gear"' }} onContextMenu=${(e) => e.preventDefault()}>
          ${["w", "a", "s", "d", "thrUp", "thrDn", "gear"].map((k) => html`<button key=${k} type="button" aria-label=${{ w: "Climb", a: "Bank left", s: "Descend", d: "Bank right", thrUp: "Throttle up", thrDn: "Throttle down", gear: "Landing gear" }[k]}
            style=${{ gridArea: k }}
            className=${`h-10 rounded-xl font-mono font-bold text-[13px] text-white backdrop-blur-md touch-none transition-transform ${pressed[k] ? "bg-accent-strong scale-90" : "bg-black/50"}`}
            onPointerDown=${(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onPad(k, true); }}
            onPointerUp=${() => onPad(k, false)} onPointerCancel=${() => onPad(k, false)} onLostPointerCapture=${() => onPad(k, false)}>${{ thrUp: "T+", thrDn: "T−", gear: "G" }[k] || k.toUpperCase()}</button>`)}
        </div>
        <button type="button" className=${chip} onClick=${onView}>Camera: ${view}</button>
      </div>` : null}

      ${active && callout ? html`<p key=${callout.k} aria-live="assertive"
        className="pointer-events-none absolute z-[4] inset-x-0 top-[34%] text-center font-display font-semibold uppercase tracking-[0.04em] text-white mix-blend-difference text-[clamp(44px,8vw,112px)] animate-callout">${callout.text}</p>` : null}
      ${active && toast ? html`<p key=${toast.k} role="status"
        className="pointer-events-none absolute z-[4] left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top,0px)+18px)] rounded-full bg-black/60 text-white backdrop-blur-md font-mono text-xs px-4 py-2 animate-toast">${toast.text}</p>` : null}

      <div ref=${panelRef} className="absolute z-[3] inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] mx-auto max-w-[720px]">
        ${takeoff ? html`<div className="grid gap-3 rounded-[20px] bg-glass backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-4 sm:p-5 max-h-[58vh] overflow-y-auto animate-zoom-deep" style=${{ animationDelay: "0.45s" }}>
          <div className="flex justify-between items-baseline gap-3 flex-wrap">
            <p className="font-bold">Take-off · Runway 36</p>
            <p className="font-mono text-xs text-muted">Rotate at ${telem.vr || 152} kt</p>
          </div>
          <ol className="grid gap-1.5 sm:grid-cols-2 text-sm">
            ${[
              ["Throttle up", (telem.thr || 0) > 0.85, `${Math.round((telem.thr || 0) * 100)}%`, "Page Up / +"],
              ["Hold the centreline", true, "", "← →  or  , ."],
              ["Rotate at ROTATE", telem.mode === "climbout", `${telem.ias || 0} kt`, "↓ or S"],
              ["Gear up after liftoff", telem.mode === "climbout" && telem.gear === false, telem.gear === false ? "UP" : "DN", "G"]
            ].map(([label, done, val, key], i) => html`<li key=${i} className=${`flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors ${done && i !== 1 ? "bg-good/15" : "bg-ink/[0.05]"}`}>
              <span className="flex items-center gap-2"><span className=${`size-1.5 rounded-full ${done && i !== 1 ? "bg-good" : "bg-muted"}`}></span>${label}</span>
              <span className="font-mono text-[11px] text-muted whitespace-nowrap">${val ? val + " · " : ""}${key}</span>
            </li>`)}
          </ol>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <p className="font-mono text-[11px] text-muted">Flaps F / Shift+F · Brakes B · Camera V · Rudder , .</p>
            <button type="button" onClick=${onSkip} className="ml-auto rounded-full bg-ink/[0.07] hover:bg-ink/[0.12] font-bold px-4 py-2 text-sm cursor-pointer transition-colors">Skip take-off</button>
          </div>
        </div>` : null}
        ${flying && !takeoff ? html`<div className="grid gap-3.5 rounded-[20px] bg-glass backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-4 sm:p-5 max-h-[58vh] lg:max-h-[62vh] overflow-y-auto animate-zoom-deep" style=${{ animationDelay: "0.45s" }}>
          <div className="flex justify-between font-mono text-xs text-muted">
            <span>Question ${g.q + 1} / ${N}</span><span>Right ${g.correct} · Wrong ${g.wrong}</span>
          </div>
          <h3 key=${"q" + g.q} className="text-[clamp(18px,2.4vw,23px)] font-bold leading-snug animate-zoom-deep" aria-live="polite">${q.q}</h3>
          <ol key=${"o" + g.q} className="grid gap-2 md:grid-cols-2">
            ${order.map((optIdx, i) => {
              let state = "animate-zoom-near bg-ink/[0.06] hover:bg-ink/[0.11] hover:scale-[1.04] cursor-pointer";
              let mark = "";
              if (picked != null) {
                if (optIdx === 0) { state = "animate-punch bg-good text-white"; mark = "Correct"; }
                else if (i === picked) { state = "animate-shake bg-bad text-white"; mark = "Your answer"; }
                else state = "animate-none opacity-35 scale-95 bg-ink/[0.06]";
              }
              return html`<li key=${i}>
                <button type="button" disabled=${picked != null} onClick=${() => onAnswer(i)} style=${{ animationDelay: picked == null ? `${0.12 + i * 0.07}s` : "0s" }}
                  className=${`w-full h-full grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2.5 items-start text-left rounded-xl px-3.5 py-3 transition-[transform,background-color,opacity] duration-300 ease-out ${state}`}>
                  <span className=${`font-mono font-bold pt-px ${picked != null && (optIdx === 0 || i === picked) ? "text-white" : "text-muted"}`}>${i + 1}</span>
                  <span>${q.a[optIdx]}</span>
                  ${mark ? html`<span className="col-start-2 font-mono text-[11px] uppercase tracking-[0.06em]">${mark}</span>` : null}
                </button>
              </li>`;
            })}
          </ol>
          ${picked != null ? html`<div className="grid gap-1 animate-zoom-near" aria-live="polite">
            <p className="font-bold">${head}</p>
            <p className="text-sm text-muted">${q.why}</p>
          </div>` : null}
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <p className="font-mono text-[11px] text-muted">${hasSim ? "Keys 1–4 to answer · W A S D to fly · V to change camera" : "Keys 1–4 to answer"}</p>
            ${picked != null ? html`<button type="button" id="next" onClick=${onNext}
              className="ml-auto rounded-full bg-accent-strong text-white font-bold px-6 py-3 cursor-pointer animate-zoom-near transition-transform duration-300 ease-out hover:scale-110 active:scale-90">
              ${g.over || g.q === N - 1 ? "See the outcome" : "Next"}</button>` : null}
          </div>
        </div>` : null}
      </div>
    </section>`;
  }


  // ---------- App ----------
  function App({ initial }) {
    const [g, setG] = useState(initial || { screen: "hangar" });
    const [records, setRecords] = useState(loadRecords);
    const [hasSim, setHasSim] = useState(false);
    const [view, setView] = useState("Chase");
    const [pressed, setPressed] = useState({});
    const [sort, setSort] = useState("deadliest");
    const [hover, setHoverNow] = useState(null);
    const [live, setLive] = useState([]);
    const [liveInfo, setLiveInfo] = useState({ state: "loading" });
    const [showLive, setShowLive] = useState(true);
    const [telem, setTelem] = useState({});
    const [callout, setCallout] = useState(null);
    const [toast, setToast] = useState(null);
    const calloutTimer = useRef(0), toastTimer = useRef(0);
    const desk = useMedia("(min-width: 1024px)");
    const simRef = useRef(null), skyRef = useRef(null), hudRef = useRef(null), panelRef = useRef(null), hoverTimer = useRef(0);
    const gRef = useRef(g);
    gRef.current = g;

    // Leaving one list row for the next shouldn't bounce the map back home
    function setHover(id) {
      clearTimeout(hoverTimer.current);
      if (id) setHoverNow(id);
      else hoverTimer.current = setTimeout(() => setHoverNow(null), 160);
    }

    // Each flight's screens take its airline colour
    useEffect(() => {
      const inc = g.id && g.screen !== "hangar" ? byId(g.id) : null;
      document.documentElement.style.setProperty("--accent", inc ? inc.brand : DEFAULT_ACCENT);
    }, [g.id, g.screen]);

    // 3D engine, created once
    useEffect(() => {
      const onEvent = (type, data) => {
        if (type === "telemetry") setTelem(data);
        else if (type === "callout") { clearTimeout(calloutTimer.current); setCallout({ text: data, k: Date.now() }); calloutTimer.current = setTimeout(() => setCallout(null), 1500); }
        else if (type === "toast") { clearTimeout(toastTimer.current); setToast({ text: data, k: Date.now() }); toastTimer.current = setTimeout(() => setToast(null), 2600); }
        else if (type === "handoff") setG((cur) => (cur.screen === "flight" ? { ...cur, phase: "quiz" } : cur));
      };
      const sim = window.Sim3D ? window.Sim3D.create(skyRef.current, hudRef.current, onEvent) : null;
      simRef.current = sim;
      setHasSim(!!sim);
      if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => gRef.current);
    }, []);

    useEffect(() => {
      const sim = simRef.current;
      document.body.classList.toggle("overflow-hidden", g.screen === "flight");
      if (g.screen !== "hangar") setHoverNow(null);
      window.scrollTo(0, 0);
      if (!sim) return;
      if (g.screen === "flight") { sim.setIncident(g.id); sim.start(); } else sim.stop();
    }, [g.screen, hasSim]);

    useEffect(() => { if (simRef.current && g.screen === "flight") simRef.current.setAltitude(g.alt); }, [g.alt, hasSim]);
    useEffect(() => { if (simRef.current && g.over === "crash") simRef.current.crash(); }, [g.over, hasSim]);

    // Live traffic from the OpenSky Network, refreshed while the map is on screen
    const mapScreen = g.screen !== "flight";
    useEffect(() => {
      if (!mapScreen) return;
      let stop = false, timer = 0;
      async function load() {
        if (document.hidden) { timer = setTimeout(load, 20000); return; }
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 12000);
        try {
          const r = await fetch(LIVE_URL, { signal: ctl.signal });
          if (!r.ok) throw new Error("HTTP " + r.status);
          const j = await r.json();
          const list = (j.states || [])
            .filter((s) => s[5] != null && s[6] != null && !s[8])
            .map((s) => ({ lon: s[5], lat: s[6], track: s[10] || 0 }));
          if (!stop) { setLive(list); setLiveInfo({ state: "ok", count: list.length, time: new Date((j.time || Date.now() / 1000) * 1000) }); }
          timer = setTimeout(load, LIVE_EVERY);
        } catch (e) {
          if (!stop) setLiveInfo((i) => (i.state === "ok" ? { ...i, stale: true } : { state: "error" }));
          timer = setTimeout(load, LIVE_EVERY);
        } finally {
          clearTimeout(to);
        }
      }
      load();
      return () => { stop = true; clearTimeout(timer); };
    }, [mapScreen]);

    // Answer reactions: camera punch + card jolt
    const answered = g.answers ? g.answers.length : 0;
    useEffect(() => {
      if (g.screen !== "flight" || !answered) return;
      const ok = g.answers[answered - 1];
      if (simRef.current && !g.over) simRef.current.punch(ok ? "good" : "bad");
      const el = panelRef.current;
      if (el) {
        el.classList.remove("animate-pulse-good", "animate-kick");
        void el.offsetWidth;
        el.classList.add(ok ? "animate-pulse-good" : "animate-kick");
      }
      const next = document.getElementById("next");
      if (next) next.focus({ preventScroll: true });
    }, [answered]);

    function takeOff() {
      const inc = byId(gRef.current.id);
      const sim = simRef.current;
      let runway = false;
      if (sim) { sim.setIncident(inc.id); sim.reset(); sim.setAltitude(START_ALT, true); runway = sim.startRunway(); }
      setTelem({}); setCallout(null);
      setG({ screen: "flight", phase: runway ? "takeoff" : "quiz", id: inc.id, q: 0, alt: START_ALT, delta: 0, correct: 0, wrong: 0, answers: [], picked: null, over: null,
             orders: inc.questions.map((q) => shuffled(q.a.length)) });
    }
    function answer(i) {
      setG((cur) => {
        if (cur.screen !== "flight" || cur.picked != null || cur.phase === "takeoff") return cur;
        const ok = cur.orders[cur.q][i] === 0;
        const alt = Math.max(0, cur.alt + (ok ? STEP : -STEP));
        return { ...cur, picked: i, answers: [...cur.answers, ok], correct: cur.correct + (ok ? 1 : 0), wrong: cur.wrong + (ok ? 0 : 1),
                 alt, delta: ok ? 1 : -1, over: alt <= 0 ? "crash" : null };
      });
    }
    function finish(cur) {
      const outcome = cur.over === "crash" ? "crash" : cur.correct === N ? "saved" : "short";
      setRecords((r) => {
        const rec = { ...(r[cur.id] || {}) };
        rec.best = Math.max(rec.best || 0, cur.correct);
        rec.saved = rec.saved || outcome === "saved";
        const nr = { ...r, [cur.id]: rec };
        saveRecords(nr);
        return nr;
      });
      setG({ ...cur, screen: "result", outcome });
    }
    function next() {
      const cur = gRef.current;
      if (cur.picked == null) return;
      if (cur.over || cur.q === N - 1) finish(cur);
      else setG({ ...cur, q: cur.q + 1, picked: null, delta: 0 });
    }
    function cycleView() { if (simRef.current) setView(simRef.current.cycleView()); }
    function pad(k, down) {
      if (simRef.current) simRef.current.setKey(k, down);
      setPressed((p) => ({ ...p, [k]: down }));
    }
    const pick = (id) => setG({ screen: "briefing", id });

    // Keyboard: 1–4 answer, Enter next, V camera; W A S D are read by the engine (lit up on the pad here)
    useEffect(() => {
      const onDown = (e) => {
        const cur = gRef.current;
        if (cur.screen !== "flight" || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (k.length === 1 && "wasd".includes(k)) setPressed((p) => ({ ...p, [k]: true }));
        if (k === "pageup" || k === "+" || k === "=") setPressed((p) => ({ ...p, thrUp: true }));
        if (k === "pagedown" || k === "-") setPressed((p) => ({ ...p, thrDn: true }));
        if (k === "v") { cycleView(); return; }
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx >= 0 && cur.picked == null && cur.phase !== "takeoff") { e.preventDefault(); answer(idx); }
        else if (e.key === "Enter" && cur.picked != null && !(document.activeElement && document.activeElement.id === "next")) { e.preventDefault(); next(); }
      };
      const onUp = (e) => {
        const k = e.key.toLowerCase();
        if (k.length === 1 && "wasd".includes(k)) setPressed((p) => ({ ...p, [k]: false }));
        if (k === "pageup" || k === "+" || k === "=") setPressed((p) => ({ ...p, thrUp: false }));
        if (k === "pagedown" || k === "-") setPressed((p) => ({ ...p, thrDn: false }));
      };
      document.addEventListener("keydown", onDown);
      document.addEventListener("keyup", onUp);
      return () => { document.removeEventListener("keydown", onDown); document.removeEventListener("keyup", onUp); };
    }, []);

    // Where the map looks
    // Each layer reads the fields it understands: dist for the globe, zoom/cover/fit for the flat map
    const home = desk ? { dist: 4.8, cover: false, zoom: 0.95, anchorX: 0.4, anchorY: 0.6 } : { dist: 7.2, cover: false, anchorX: 0.5, anchorY: 0.4, zoom: 1.25 };
    const detail = desk ? { maxDist: 2.6, maxZoom: 6, anchorX: 0.68, anchorY: 0.5, fitW: 0.42, fitH: 0.6 } : { maxDist: 3.6, maxZoom: 6, anchorX: 0.5, anchorY: 0.22, fitW: 0.8, fitH: 0.28 };
    let focus = { id: null, opts: {} };
    if (g.screen === "hangar" && hover) focus = { id: hover, opts: desk ? { maxDist: 2.8, maxZoom: 3.2, anchorX: 0.36, anchorY: 0.5, fitW: 0.4, fitH: 0.5 } : { maxDist: 4.5, maxZoom: 3.2, anchorX: 0.5, anchorY: 0.33, fitW: 0.8, fitH: 0.25 } };
    else if (g.screen === "briefing" || g.screen === "result") focus = { id: g.id, opts: detail };
    const highlight = g.screen === "hangar" ? hover : g.id;

    return html`<div>
      <${MapLayer} visible=${mapScreen} highlight=${highlight} focus=${focus} home=${home} live=${showLive ? live : []}
        onHover=${(id) => { if (gRef.current.screen === "hangar") setHover(id); }} onSelect=${(id) => { if (gRef.current.screen === "hangar") pick(id); }} />
      ${g.screen === "hangar" ? html`<${Hangar} key="hangar" records=${records} sort=${sort} setSort=${setSort} hover=${hover} setHover=${setHover}
          onPick=${pick} liveInfo=${liveInfo} showLive=${showLive} setShowLive=${setShowLive} />` : null}
      ${g.screen === "briefing" ? html`<${Briefing} key=${"b" + g.id} inc=${byId(g.id)} onBack=${() => setG({ screen: "hangar" })} onTakeOff=${takeOff} />` : null}
      ${g.screen === "result" ? html`<${Result} key=${"r" + g.id + g.outcome} g=${g} onRetry=${takeOff} onHangar=${() => setG({ screen: "hangar" })} />` : null}
      <${Stage} g=${g} active=${g.screen === "flight"} hasSim=${hasSim} skyRef=${skyRef} hudRef=${hudRef} panelRef=${panelRef}
        pressed=${pressed} view=${view} onAnswer=${answer} onNext=${next} onExit=${() => setG({ screen: "hangar" })} onView=${cycleView} onPad=${pad}
        telem=${telem} callout=${callout} toast=${toast} onSkip=${() => simRef.current && simRef.current.skipTakeoff()} />
    </div>`;
  }

  function boot(data) {
    ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} initial=${data && data.screen ? data : null} />`);
  }
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
  else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();

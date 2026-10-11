# Flights to Save: handoff

A browser game about 17 real airliner accidents. The player picks a flight on a 3D globe, takes off from a runway, then answers ten questions while flying over the real terrain where the accident happened. Right answers climb 1,000 ft, wrong answers sink 1,000 ft. Ten right answers save the flight and earn its badge. Ten wrong answers crash it.

There is no build step. Serve this folder over HTTP and open `index.html`:

```sh
npx serve openai/flights-to-save    # or: python3 -m http.server -d openai/flights-to-save
```

Opening the file directly (`file://`) breaks the globe, because browsers block WebGL textures loaded from local files.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell: theme tokens, Tailwind v4 `@theme` and keyframes, CDN scripts |
| `app.js` | React 18 UI written with `htm` templates (JSX-like, no compiler). Screens: hangar → briefing → flight → result |
| `globe.js` | `window.Globe3D`: three.js Earth (NASA Blue Marble), routes, airport labels, live-traffic points, drag and zoom |
| `worldmap.js` | `window.WorldMap`: flat dotted-map fallback when WebGL is unavailable. Land mask embedded as base64 |
| `sim3d.js` | `window.Sim3D`: three.js flight scene, with real terrain, weather, aircraft models, runway take-off physics, cameras (Chase, Wing, Cockpit, Cabin) and crash effects |
| `terrain.js` | `window.TERRAIN`: real 20 km × 20 km elevation grid around each crash site, 97 × 97 samples, 8-bit |
| `incidents.js` | `window.INCIDENTS`: 17 flights, 170 questions, route coordinates, airport codes, airline colours |
| `earth*.jpg/png` | Globe textures: colour, relief, ocean mask, clouds |
| `tools/mkmap.py` | Builds the dotted-map land mask from `world-atlas` `land-110m.json` |
| `tools/mkterrain.py` | Builds `terrain.js` from Mapzen terrarium tiles on AWS (`s3.amazonaws.com/elevation-tiles-prod`) |

Libraries load from CDNs, pinned: React 18.3.1, htm 3.1.1, three 0.158.0 (UMD build), and `@tailwindcss/browser` 4.1.11.

## How the pieces talk

- `app.js` creates one `Sim3D` instance and one `Globe3D` instance and keeps both alive. Each runs its own animation loop only while visible (`start()` / `stop()`).
- `Sim3D.create(container, hudElement, onEvent)` emits these events:
  - `telemetry`: about 7 times a second during take-off.
  - `callout`: V1, Rotate, Liftoff, Positive rate, Gear up.
  - `toast`
  - `handoff`: take-off is finished and the quiz starts.
- The quiz sets the target altitude with `sim.setAltitude(ft)`, plays a camera punch on each answer with `sim.punch("good" | "bad")`, and sends the plane down with `sim.crash()`.
- `sim.startRunway()` returns `false` for open-sea accidents: TWA 800, Swissair 111, Air France 447 and Lion Air 610. Those flights start airborne.
- `sim.advance(seconds)` steps the physics without rendering. It exists for automated tests.
- Scale: about 1 world unit to 1 m for the aircraft. Real terrain is scaled by 0.2 (`M_TO_UNITS`). Game altitude is compressed by 0.056 units per foot (`FT_TO_UNITS`).

## Controls

| Input | Action |
| --- | --- |
| Page Up / Page Down (or + / −) | Throttle |
| ↓ / ↑ or S / W | Pitch (↓ pulls the nose up, as in flight sims; W climbs in casual mode) |
| ← / → or A / D | Steer on the ground, bank in the air |
| , / . | Rudder |
| F / Shift+F | Flaps |
| G | Gear |
| B | Brakes |
| V | Camera: Chase, Wing, Cockpit, Cabin |
| 1–4 | Answer |
| Enter | Next question |

Phones get an on-screen pad: W A S D, T+, T− and G.

## Status

Tested with headless Chromium using SwiftShader WebGL:
- Hangar, sorting, hover-to-zoom, briefing, the quiz, the crash-only-on-ten-wrong rule, badges and the phone layout.
- A full manual take-off (V1 → Rotate → Liftoff → Positive rate → Gear up → handoff to the quiz), Skip take-off, and the open-sea airborne start.
- The terrain crash into the real JAL 123 mountains, the cabin camera, and oxygen masks dropping during the crash.

**Changed but not verified.** These edits were written right before the handoff and have not been looked at yet:
- `globe.js`: the atmosphere shader was rewritten (`0.78 + d`, sphere radius 1.1), because the previous version drew a solid blue ring around the globe on the light background.
- `sim3d.js`: cabin lighting was raised (`PointLight` intensity 30, emissive on passengers and seats), because the cabin rendered too dark.

## Known issues and next steps

1. Verify the two unverified edits above, by screenshotting the globe home view and the Cabin camera.
2. **Live traffic:** `app.js` fetches `https://opensky-network.org/api/states/all` every 5 minutes. It has never succeeded in testing: the build environment could not reach OpenSky, and the claude.ai artifact preview blocks outside requests. Check that OpenSky allows browser requests (CORS) once the game is hosted. Anonymous access is limited to about 100 global requests a day. The page shows "Live traffic unavailable in this view" on failure and never invents aircraft.
3. **Routes:** routes are great-circle approximations from the departure airport to the crash site, not recorded flight tracks.
4. **Fact-check:** the questions, briefings and passenger figures were written from memory of the official investigation reports. Have someone check `incidents.js` against the reports before publishing.
5. **Runway:** the runway is generic, runway 36 in the home terrain tile, not the real airport layout. The real-terrain patch repeats with mirroring beyond 20 km.
6. **Size:** `app.js` is a single file. Split it into modules, or move to Vite with real JSX, if the project grows.

## Data and attribution

- **Earth imagery:** NASA Blue Marble, public domain, taken from the `three-globe` example images.
- **Terrain:** Mapzen/Tilezen terrain tiles on AWS Open Data (SRTM, GMTED, ETOPO1 and others). Attribution: https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- **Coastlines (flat map):** Natural Earth via `world-atlas`.
- **Live traffic:** The OpenSky Network. Credit OpenSky wherever the traffic layer is shown.

A playable copy of this version is at https://claude.ai/artifact/Vi74uwPQzjw9NuFT5VX83A. It's private to the owner unless shared.

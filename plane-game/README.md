# Ten Flights to Save

A browser quiz game about the ten deadliest accidental airliner crashes. Each flight has ten questions drawn from the official investigations.

## How it plays

- The aircraft starts at 5,000 ft.
- A right answer climbs 1,000 ft; a wrong answer descends 1,000 ft.
- Five wrong answers bring it to 0 ft and the flight is lost.
- Answer all ten correctly to save the flight and earn its badge.

Badges and best scores are kept in the browser's `localStorage`.

## 3D flight view

The flight is rendered in real time with [three.js](https://threejs.org/) (WebGL), loaded from jsDelivr. Each accident has its own setting: fog over Tenerife, sunset over the mountains for JAL 123, night with town lights for Charkhi Dadri and China Airlines 140, desert at dusk for Saudia 163, and an Antarctic whiteout for Erebus. The airliner model matches the type (747, DC-10, L-1011, A300, DC-8) with navigation lights and strobes.

- Press **V** or the camera button to switch between Chase, Wing and Cockpit views.
- If WebGL is unavailable, the game falls back to the flat 2D view.

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```sh
npx serve plane-game
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup: hangar, briefing, flight and result screens |
| `styles.css` | Theme tokens (light and dark), layout and animation |
| `game.js` | Game state, scoring, altitude animation and badge storage |
| `sim3d.js` | three.js scene: terrain, sky, weather, aircraft models, cameras and crash effects |
| `incidents.js` | The ten incidents and their 100 questions (correct answer listed first; options are shuffled at runtime) |

## The ten flights

Ranked by lives lost. Deliberate acts (bombings, shoot-downs, 9/11) are excluded, and Air India 171 (2025) is left out while its investigation is open.

1. Tenerife airport disaster, 1977 (583)
2. Japan Air Lines 123, 1985 (520)
3. Charkhi Dadri mid-air collision, 1996 (349)
4. Turkish Airlines 981, 1974 (346)
5. Saudia 163, 1980 (301)
6. American Airlines 191, 1979 (273)
7. American Airlines 587, 2001 (265)
8. China Airlines 140, 1994 (264)
9. Nigeria Airways 2120, 1991 (261)
10. Air New Zealand 901, 1979 (257)

# CityRunner2

An endless runner through the world's greatest cities — New York, Paris, London and Rome — built with Three.js.

Sprint down Broadway, the Champs-Élysées, Oxford Street and the Via del Corso. Each city has three levels of increasing intensity, and every level ends with a 60-second **monument puzzle**: gather the scattered blocks and rebuild an icon of that city, from the Empire State Building to the Colosseum.

## Play locally

No build step. Serve the folder with any static server:

```bash
npx serve .
```

then open the printed URL.

## Controls

- **← / →** (or swipe): change lane
- **↑ / Space** (or swipe up): jump
- **↓** (or swipe down): roll
- **Puzzle mode**: click/tap a glowing block to send it to its place in the monument

## Tech

- [Three.js](https://threejs.org/) (vendored in `vendor/`), zero other dependencies
- All geometry, textures and audio are generated procedurally at runtime — no asset downloads

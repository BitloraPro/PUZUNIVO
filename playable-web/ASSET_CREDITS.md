# Real asset credits and limitations

This web edition uses browser-loaded authored 3D glTF geometry from the official **KhronosGroup/glTF-Sample-Assets** repository.

- [CesiumMan.glb](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan) – © Cesium, **CC BY 4.0**. Cesium logos / trademarks are excluded from the license; the model is loaded as a demonstration only. Replace all third-party markings with clean original assets before commercial release. The game does not claim endorsement from Cesium.
- [CarConcept.glb](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) – © Khronos contributors, **CC BY 4.0** for geometry, with trademark/logo carve-outs. Again: prototype visual asset, not approved commercial game car.
- [Three.js](https://threejs.org/) – Copyright three.js contributors, MIT License.
- [Vite](https://vite.dev/) – MIT License.

Models are loaded over HTTPS from `raw.githubusercontent.com` at runtime, so the first visit needs internet and those URLs must remain accessible. This is not a claim that the visual assets are original, free of trademarks, or equal to the user's reference video. Missing remote models show a clear warning in-game; we don't silently claim they were loaded.

The road/sky/water/city and a first-pass helicopter are generated at runtime using Three.js materials, not bundled reference-video art. The code implements a REAL playable engine; this is a **web gameplay milestone**, not Unity/PS5 export, a signed APK, a high-end AAA game, or a final photorealistic match.

Web demo has NO cloud economy, no paid ads, no real online multiplayer, and no real account-backed XP/coins.

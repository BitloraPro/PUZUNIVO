# PUZUNIVO / MegaRush – single-pass Apper implementation specification
Date: 2026-10-14

## Product contract
Audience: global mobile players using Android landscape; responsive desktop keyboard/mouse support.
Primary loop: start Sunset Harbor Chase, steer an animated skater through a real 3D coastal city, outrun in-world police, reach a visible Harbor checkpoint, replay.
Secondary loop: Free Roam, ride skateboard/on foot/nearby traffic cars, discover streets and coastal landmarks without unwanted police pursuit.
Rendering: reuse the original self-contained WebGL2 3D geometry engine from BitloraPro/PUZUNIVO main, not a fake static screenshot or AI illustration.
Scenes: lit skyscrapers, wet-road shading, downtown boulevard, moving traffic, pedestrians, harbor piers, bridge, Ferris wheel, palm trees, coastal ocean, helicopters, day/night lighting, rain/fog.
Character: third person Rylee and actual moving 3D body and skateboard mesh; real acceleration, jump, kickflip, walking and vehicle mode.
Chase: one functional physics police pursuer, visual support cars, health contact damage, 3 hearts, crash/revive; local Harbor completion.
UI: top-left live minimap, center chase/waypoint meter distance, top-right level/coins/XP/health/wanted indicator, bottom left analog touch joystick, bottom-right six action buttons.
Controls: touch joystick, camera drag, WASD, arrows, Space, Shift, B, E, K, Esc; use landscape safe areas.
Modes: explicit Harbor Chase and Free Roam. Preserve existing PUZUNIVO admin and connected database without replacing schema or overwriting account tables.
Security: do not display made-up coin/XP values and do not save cash rewards. Web edition does not fake native rewarded ad callbacks.
Playback: no autoplay login wall for a public practice game. Do not present local practice result as server-authoritative completion.
Page structure: public "/" and "/games" redirect to immersive "/megarush". Puzzle modules remain in source as rollback reference, not main menu.
Single deployment: exactly one Apper shouldBuild:true write for the complete frontend change; no repeated generation prompts.

## Known non-final areas
This is a real interactive WebGL2 vertical slice, but stylized procedural geometry. An asset pipeline of licensed high-poly city and character models, animation rigs, textures and PBR lighting is required to match a photorealistic reference frame-for-frame.
GitHub Node/SQLite server code and Apper's hosted React SPA are different deployments. A secure hosted MegaRush mission API and Apper player's identity mapping are still required for cloud-verified progress, balances and fraud-resistant rewards.
A signed Android APK, device GPU/frame-rate QA, native AdMob SDK verification, production assets and public deployment smoke testing must be completed separately.
No claim of 500 handcrafted levels, real cash payments, authenticated police events or production-grade graphics until evidence is available.

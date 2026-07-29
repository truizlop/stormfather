# Living Roshar fidelity concepts

These three images are original visual targets generated with the built-in
ImageGen tool on 2026-07-29. They are design references for real-time Three.js
implementation; none may be substituted for the navigable 3D scene.

The existing application screenshots were used only as edit targets so the
working UI and camera roles remained stable:

- `docs/qa/fidelity-kharbranth-collision-final.png`
- `docs/qa/fidelity-highstorm-final.png`
- `docs/qa/fidelity-continent-final.png`

Online reference research informed the briefs but no downloaded illustration is
shipped as a project asset:

- Brandon Sanderson’s Stormlight series and art pages.
- Brandon Sanderson’s post about the official *Call to Adventure* artwork.
- Coppermind’s credited official-art galleries for highstorms and chasmfiends.
- Coppermind’s official Kholinar map and official-art index.

## Kharbranth target

Output: `living-roshar-kharbranth-target.png`

```text
Use case: ui-mockup
Asset type: full primary screen visual specification for an existing interactive React Three Fiber world atlas
Primary request: Preserve the attached Stormfather Roshar web app screenshot’s exact UI shell, information architecture, navigation labels, panels, minimap, controls, typography mood, and camera framing, but redesign only the real-time 3D Kharbranth street scene to establish the production-quality target for a living Roshar city. The result must remain obviously navigable real-time 3D, never a flat painted backdrop.
Input image: Image 1 is the edit target and layout/UI reference.
Scene/backdrop: Kharbranth built continuously into steep storm-cut coastal rock around a sheltered harbor; foundations, retaining walls, stairs, drainage channels, bridges, terraces, alleys, docks, awnings, vegetation in protected pockets, and lower floors visibly intersect and follow the terrain rather than float.
Subject: a close oblique street-scale view with human-scale architecture, dense but navigable circulation, several distinct facade families, believable doors/windows/balconies, market stalls and port activity. Include varied Rosharan inhabitants at correct scale with different ages, builds, skin tones, cultural clothing silhouettes, workers carrying goods, merchants, children, sailors, scribes, an axehound, tiny cremlings, and subtle emotion/windspren/lifespren whose movement can be implemented procedurally.
Style/medium: highly detailed photorealistic-quality real-time 3D game render, physically based materials and lighting, original design informed by Stormlight’s described stone-and-storm ecology without copying any single illustration.
Composition/framing: retain the original screenshot dimensions and all code-native UI regions. Keep the 3D scene readable beneath and between UI panels; strong depth from foreground roof/street through terraced middle city to harbor/cliff distance.
Lighting/mood: late-afternoon coastal light after rain, moist stone, restrained atmospheric haze, warm inhabited windows balanced against cool sea light.
Color palette: weathered gray and ochre stormstone, mineral plaster in muted blue/teal/terracotta, dark wet timber, aged copper and brass, natural cloth accents; avoid toy-like saturated blocks.
Materials/textures: scale-correct stone grain, crem deposits, chipped plaster, wood grain, roof seams, rope, canvas, metals, puddles and runoff; texture variation must align to building scale and not repeat visibly.
Interaction cues: visible walkable routes, collision-respecting inhabitants, small motion trails only where useful, sheltered vegetation, water and cloth responding to wind. The UI remains crisp and code-native.
Constraints: change only the 3D world content and its physically coherent lighting; keep every visible app control and panel in the same role and approximate placement. No static-image replacement, no isometric miniature/diorama, no floating structures, no giant people, no generic fantasy towers, no Earth trees in exposed areas, no copyrighted character likenesses, no watermark, no new UI copy, no hero badge/pill, no illegible UI text.
```

## Highstorm target

Output: `living-roshar-highstorm-target.png`

```text
Use case: ui-mockup
Asset type: full primary-screen visual specification for the Highstorm travel mode of an existing interactive React Three Fiber Roshar atlas
Primary request: Preserve the attached Stormfather app screenshot’s exact UI shell, travel panel, highstorm panel, minimap, timeline, nav, controls, code-native labels, and oblique aerial camera role, but redesign only the real-time 3D world and storm rendering so the highstorm reads as a catastrophic opaque moving wall with overwhelming power. The result must still be clearly implementable as layered real-time Three.js geometry, shaders, GPU particles, lights, debris, water response, and camera effects—not a static matte painting.
Input image: Image 1 is the edit target and exact UI/layout reference.
Scene/backdrop: aerial camera riding alongside and slightly ahead of a continent-spanning east-to-west stormwall over Roshar, with land and sea visible only in the clear air ahead and a short violent wake behind.
Subject: a towering nearly opaque blue-black convective wall from ground to cloud ceiling; layered rolling shelf-cloud lobes, dense gray-white rain core, lateral wind streaks, ground-hugging spray and crem mist, torn vegetation and stone/wood debris, multiple lightning channels illuminating internal cloud volume, sharply darkened advancing shadow, whitecaps and wave fronts on sea, runoff and flash channels on land. The front edge should feel physically thick, turbulent, asymmetrical and many kilometres deep, never a flat transparent curtain.
Style/medium: photorealistic-quality real-time 3D game render, cinematic but scientifically coherent storm structure, original design inspired by the books’ destructive force and shelter-shaped ecology.
Composition/framing: retain original dimensions and all UI regions. Keep the stormwall as the dominant diagonal/vertical visual mass across the central canvas; the camera moves with the leading edge and sees world scale from above. The map beneath must not remain clearly legible through the rain core.
Lighting/mood: near-black storm shadow, cold cyan-white lightning, dim sickly daylight ahead, volumetric shafts only at the broken leading rim, high contrast and palpable pressure.
Color palette: charcoal, blue-black, slate, dirty white spray, muted earth and sea ahead, cyan lightning; no cheerful turquoise mist.
Interaction cues: visible people/animals/vegetation in the near foreground bracing, fleeing, retracting or taking shelter; loose cloth and debris stream horizontally; spren scatter or intensify; water surface deforms in aligned wave bands. A subtle camera shake/pressure cue may be suggested visually, while all UI remains crisp.
Constraints: change only the 3D canvas content and its coherent scene lighting; preserve UI information architecture and approximate placement. Opaque destructive storm, not gentle rain; no transparent veil, no soft waterfall, no wispy smoke, no fantasy tornado, no giant face in clouds, no static-image replacement, no new UI copy, no watermark, no illegible controls.
```

## Continental LOD target

Output: `living-roshar-lod-target.png`

```text
Use case: ui-mockup
Asset type: full primary-screen visual specification for continental-to-regional LOD in an existing interactive React Three Fiber Roshar atlas
Primary request: Preserve the attached Stormfather continent screenshot’s exact UI shell, top navigation, legend role, minimap, scale bar, controls, map footprint, country frontiers, rivers, sea, and camera framing, but redesign the real-time 3D place representations so named cities and landmarks remain readable at this zoom and transition naturally into richer models. Replace any ambiguous colored dodecahedrons, prisms, octahedrons, or generic blocks with semantic miniature silhouettes and restrained labels.
Input image: Image 1 is the edit target and UI/layout reference.
Scene/backdrop: faithful raised-relief Roshar surrounded by animated deep ocean, with terrain colors, frontiers and rivers integrated into the surface.
Subject: at continental distance, major cities are tiny terrain-seated silhouette clusters unique to their geography—Urithiru as a stepped mountain-tower cut into peaks, Kholinar as a sheltered oval city between windblades, Kharbranth as coastal terraces in a cove, Azimir as a radial ochre plan with central dome, Thaylen City as long harbor walls and docks, Akinah as pale ring ruins, Shinovar settlements as low green-valley compounds. Secondary cities/towns use small but recognizable roof-and-wall clusters; ruins use broken arcs; monasteries use courtyard-temple silhouettes; natural landmarks use terrain forms rather than colored gems. Keep labels legible, decluttered and hierarchical.
Style/medium: detailed physically based real-time 3D strategy-map render, Google Earth relief combined with a refined city-builder overview, original assets, understated cinematic realism.
Composition/framing: retain the map centered and the original screen dimensions. Show a few representative far/mid LOD transition bands subtly: no city disappears, no one-frame pop, and nothing appears to float above the terrain.
Lighting/mood: calm oblique daylight with crisp relief shadows and atmospheric depth; ocean has non-repeating multi-scale waves and coastal foam.
Color palette: natural stone, earth, vegetation and water; semantic gold/cyan reserved for UI selection and labels, not giant geometry.
Materials/textures: scale-aware terrain, roof and masonry variation, tiny emissive window points only on major settlements, varied shoreline foam and sea normals.
Interaction cues: selected city may have a subtle ground ring and label, but markers remain miniature physical places. Frontiers and rivers stay visible without overpowering terrain.
Constraints: change only the real-time 3D map content and coherent scene lighting; preserve UI information architecture. No generic colored polyhedra, no oversized pins, no floating city plates, no toy board-game pieces, no static flat map replacement, no invented continent outline, no new UI copy, no watermark, no illegible interface.
```


# Visual QA and fidelity ledger

The original accepted concepts were compared with baseline browser renders at
1440 × 900. The detail-refinement concepts were compared with the final live
renders at 1280 × 720 and 390 × 844.

## Canonical fidelity acceptance

| # | Exact check | Evidence | Result |
|---:|---|---|:---:|
| 1 | Outer mainland silhouette | 607-point coast derived from the supplied 1889 × 1144 reference; long east-west aspect, western bays, southern inlets, and tapered stormward coast are retained. | Pass |
| 2 | Aimia | Independent 71-point western island polygon remains detached at the reference-map spacing. | Pass |
| 3 | Reshi and secondary islands | 52 shoreline-detected islands preserve the northern arc, southern chains, and eastern Origin groups instead of synthetic pebbles. | Pass |
| 4 | Inland water | Five cutout water bodies include the reference-shaped Purelake at the same relative position and extent. | Pass |
| 5 | Mountain systems | Nine named ridge systems drive the continuous heightfield and remain visible at continent scale. | Pass |
| 6 | Rivers | Ten reference-traced trunks follow terrain toward the correct lake or coast corridors. | Pass |
| 7 | Political geography | Sixteen shared frontier polylines and 12 country labels distinguish national, disputed, and porous boundaries in both 3D and the minimap. | Pass |
| 8 | Destination agreement | Terrain, minimap, labels, cameras, search, and travel controls consume the same canonical anchors; geometry tests verify representative spatial relationships. | Pass |
| 9 | Geographic scale | 102.272 coast units map to the documented roughly 4,000-mile continental width, or about 39.1 miles per geographic unit. | Pass |
| 10 | Water and relief | Ocean waves, coast foam, inland cutouts, Purelake caustics, harbors, terrain ridges, and pale crem macro texture remain distinct at their intended LODs. | Pass |
| 11 | City/district scale | Every selected Blender landmark is fitted to its declared local district diameter; authored landmark cities no longer have overlapping procedural building fields. | Pass |
| 12 | Human scale | Residents use 1.56–2.00 m calibrated heights, 2.08 m standard doors, and culture-specific Blender actors normalized to the same local meter scale. | Pass |
| 13 | Collision safety | Pedestrian paths are generated from the exact procedural footprints and solid GLB landmark meshes, validate every route edge, retain 0.77 m body-plus-clearance, and apply collision-safe crowd separation. | Pass |
| 14 | Bridge activity | A 30-carrier bridge crew runs beneath a 12 m Blender-authored deck; the protected activity corridor remains clear of district modules. | Pass |
| 15 | Responsive and weather behavior | 390 × 844 framing contains the full continent and preserves mobile city detail; the aerial Highstorm camera, water, flora, crowds, and shelter paths remain storm-reactive. | Pass |

The final acceptance matrix is **15/15**, including the Build Web Apps visual,
responsive, interaction, accessibility, and implementation signoff. Desktop and
mobile Lighthouse accessibility and best-practices scores are both 100. The
automated suite contains 126 passing tests across 29 files.

## Living Roshar refinement acceptance — 2026-07-29

| # | Exact check | Evidence | Result |
|---:|---|---|:---:|
| 1 | Required-place contract | All 33 user-required names are source-backed, classified with the requested reader-facing category, inside the supplied-map raster, searchable, and routed to semantic geometry. Makabak is explicitly a regional display anchor rather than false point precision. | Pass |
| 2 | Continuous city LOD | Far, mid, and authored near tiers crossfade with hysteresis. A selected city in city/street mode retains its authored layer, so wide hero cameras cannot regress to a box proxy. | Pass |
| 3 | Urithiru form | The exported Blender root contains ten semicircular strata, repeated façade bays, crown drums, mountain embraces, a human-scale east entrance, and exactly ten local destination-labelled Oathgates. | Pass |
| 4 | Urithiru terrain integration | The flat basalt pedestal is hidden; a cragged support massif is part of the shared terrain sampler; the landmark is sunk 0.62 units; mountain materials use the local rock family; render and pedestrian collision share the same east-facing rotation. | Pass |
| 5 | Knights Radiant activity | Deterministic captain, knight, and squire patrols remain at shared human scale, clear the tower, expose an east-side hero patrol, leak readable Stormlight ribbons, and enter stormguard behavior near the highstorm. | Pass |
| 6 | Living population and ecology | Meter-calibrated cultural variants, occupations, bridge crews, collision-safe routes, chulls, axehounds, skyeels, cremlings, a chasmfiend, and five spren families react to place, detail tier, and storm proximity. | Pass |
| 7 | Highstorm power | The leading edge uses an opaque procedural billow core, dense rain/spray/debris particles, lightning, storm-reactive inhabitants/flora/water, and an oblique moving aerial camera. | Pass |
| 8 | Water continuity | The ocean uses a higher-resolution adaptive surface with crossing swell families, Fresnel color, crests, coast foam, storm amplification, and separate shallow-water treatments without tiled square flecks. | Pass |
| 9 | Responsive composition | Browser QA at 1440 × 960 and 390 × 844 reports zero horizontal overflow. The mobile Urithiru view keeps the monumental façade, terrain shoulders, map controls, scale, and travel sheet usable. | Pass |
| 10 | Runtime and asset integrity | 126 tests, TypeScript, ESLint, production build, and asset validation pass. The 54.2 MiB GLB contains 3,794 authored objects, 352 Urithiru nodes, 45 expected roots, 13 runtime textures, and no full-scene image-relief path. | Pass |

Latest living-world captures:

- `living-roshar-desktop-continent.png`
- `living-roshar-desktop-literary-place.png`
- `living-roshar-desktop-kharbranth-mid.png`
- `living-roshar-desktop-kharbranth-near.png`
- `living-roshar-desktop-urithiru.png`
- `living-roshar-desktop-highstorm.png`
- `living-roshar-mobile-kharbranth.png`
- `living-roshar-mobile-urithiru.png`
- `living-roshar-mobile-highstorm.png`

## Visual fidelity

1. **Atlas hierarchy:** the near-black top bar, slim brass rules, editorial serif place names, cyan live-state accents, and translucent slate panels all carry from concept to implementation.
2. **World treatment:** the photographic concept becomes an interactive miniature-diorama treatment so terrain, landmarks, crowds, caravans, flora, and weather can all move at runtime. The mineral color range and storm-lit contrast remain intact.
3. **Map composition:** desktop preserves the left travel rail, right information panel, lower legend, minimap, and compact map controls without covering the main subject.
4. **Highstorm view:** the live build keeps the concept’s elevated moving camera, broad stormwall, rain curtain, east-to-west direction, status panel, minimap track, and bottom timeline.
5. **Responsive behavior:** mobile preserves the large uninterrupted world view, top location card, right zoom stack, and thumb-accessible bottom travel sheet. The menu expands into a complete destination grid.
6. **Interaction states:** selected destinations, LOD, search results, daylight, paused simulation, storm follow, and easter-egg discoveries all have distinct visible or accessible states.

## Detail-refinement fidelity

1. **Kharbranth identity:** the live district carries the concept’s harbor-to-mountain
   composition through seven stepped streets, color-coded facades and roofs, bells,
   arches, awnings, stalls, docks, skiffs, a working crane, porter routes, and a
   moving caustic harbor. The Highstorm changes water chop and sends inhabitants
   toward shelter.
2. **Shattered Plains activity:** the street view has wet generated paving,
   plateau slabs, crem edges, chasms, rope bridges, scaffolds, tents, stores,
   shelters, and a Blender-authored bridge run. Thirty runners carry a physically
   scaled 12-meter bridge along a protected plateau route and withdraw west as
   the storm closes.
3. **Purelake character:** the final view preserves a sparse shallow-water
   settlement with a visible textured lakebed, depth pools, drainage lines,
   translucent caustics, shoals, stilted domes, walkways, nets, rafts, and wading
   inhabitants. Fishing rafts return toward the village before the storm.
4. **Readable inhabitants:** the former cone walkers are now GPU-instanced heads,
   torsos, arms, legs, hats, cultural marbling, and occupation props. Routes include
   porters, merchants, scribes, guards, fishers, builders, farmers, sailors,
   surgeons, children, and pilgrims; gait, work gestures, storm lean, speed, and
   shelter position animate from simulation time. Heights are meter-calibrated,
   routes clear rendered footprints, and a deterministic local-avoidance pass
   prevents crowd overlap without pushing people through walls or over chasms.
5. **Water system:** deep ocean water uses layered vertex waves, Fresnel color,
   crests, storm amplification, and animated coastal foam. Purelake and city
   harbors use separate shallow treatments rather than sharing a flat blue plane.
6. **Political geography:** solid national, broken disputed, and widely spaced
   porous borders use one named data set in both the 3D scene and minimap. Country
   labels, the legend, and the visibility toggle remain legible at broad zooms.
7. **Honest scale:** the continent is calibrated from a roughly 4,000-mile
   east-to-west reference, while close views declare a separate 12-meters-per-unit
   local district scale. Landmarks fit their district diameter, people stay within
   a 1.56–2.00 m range, doors are 2.08 m, and buildings no longer use unrelated
   scale factors.
8. **Performance-aware density:** only the selected place receives its full
   landmark, district, modules, population, and local activities. Street mode
   raises building and resident budgets; narrow screens reduce them while retaining
   water, jobs, and motion.
9. **Mobile composition:** the 390 × 844 pass keeps the location card, map controls,
   water and population visible above a thumb-accessible travel sheet. One tap on
   **Explore location** reaches street detail, the expanded grid hides the scale
   card, and **Highstorm** enters the moving aerial region camera.
10. **Original asset chain:** three generated refinement boards and four generated
    material sources were preserved with prompts; the deterministic Blender source,
    `.blend`, GLB, and preview preserve the authored 3D kit. No researched
    illustration is shipped or traced.

The refinement boards deliberately set an aspirational density beyond the runtime
render. The live atlas keeps the same visual cues but uses a crisp stylized
miniature language rather than attempting the boards’ near-photorealistic crowds
and hundreds of unique facades. This preserves interactive camera motion,
storm simulation, instancing, and usable mobile frame budgets. The concepts remain
committed as targets for future asset expansion.

## Copy differences

- The mobile concept’s “Highstorm approaching from the west” was corrected to **east** because Highstorms cross Roshar east-to-west.
- Static concept weather copy became dynamic phase copy such as **Rising winds**, **Stormwall**, and **Stormwake**.
- **Explore City** became **Explore location** so the same control remains accurate for nations, lakes, islands, and landmarks.
- Numeric **LOD 1–4** labels became the clearer **continent / region / city / street** scale.
- Decorative placeholder metrics from the concept were reduced to location facts, inhabitants, activity, storm proximity, and direction so the live panels remain readable.
- The refinement boards show much larger regional slices; live city and street
  modes label themselves as **Local district** and **Local street** so their
  50-meter and 10-meter scale bars do not pretend to cover an entire country.
- Kharbranth’s activity copy remains **Crowded docks and night markets**, while the
  world now depicts the jobs through animated occupation props instead of listing
  every simulated role in the panel.
- Purelake remains **calf-deep** in its factual copy; apparent deeper turquoise
  patches are visual depth cues and drainage pools, not a change to the location
  description.

## Captures

- `desktop-final.png`
- `mobile-final.png`
- `highstorm-final.png`
- `detail-kharbranth-harbor.png`
- `detail-shattered-bridge.png`
- `detail-purelake-water.png`
- `detail-continent-frontiers.png`
- `detail-mobile-purelake.png`
- `detail-mobile-highstorm.png`
- `fidelity-continent-final.png`
- `fidelity-kharbranth-collision-final.png`
- `fidelity-purelake-scale-final.png`
- `fidelity-shattered-final.png`
- `fidelity-mobile-final.png`
- `fidelity-mobile-kharbranth-final.png`
- `fidelity-highstorm-final.png`

# Visual QA and fidelity ledger

The original accepted concepts were compared with baseline browser renders at
1440 × 900. The detail-refinement concepts were compared with the final live
renders at 1280 × 720 and 390 × 844.

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
   shelters, and a Blender-authored bridge run. Ten runners carry the bridge along
   the plateau route and withdraw west as the storm closes.
3. **Purelake character:** the final view preserves a sparse shallow-water
   settlement with a visible textured lakebed, depth pools, drainage lines,
   translucent caustics, shoals, stilted domes, walkways, nets, rafts, and wading
   inhabitants. Fishing rafts return toward the village before the storm.
4. **Readable inhabitants:** the former cone walkers are now GPU-instanced heads,
   torsos, arms, legs, hats, cultural marbling, and occupation props. Routes include
   porters, merchants, scribes, guards, fishers, builders, farmers, sailors,
   surgeons, children, and pilgrims; gait, work gestures, storm lean, speed, and
   shelter position animate from simulation time.
5. **Water system:** deep ocean water uses layered vertex waves, Fresnel color,
   crests, storm amplification, and animated coastal foam. Purelake and city
   harbors use separate shallow treatments rather than sharing a flat blue plane.
6. **Political geography:** solid national, broken disputed, and widely spaced
   porous borders use one named data set in both the 3D scene and minimap. Country
   labels, the legend, and the visibility toggle remain legible at broad zooms.
7. **Honest scale:** the continent is calibrated from a roughly 4,000-mile
   east-to-west reference, while close views declare a separate 12-meters-per-unit
   local district scale. Landmarks therefore behave like semantic map insets
   instead of kilometer-high buildings.
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

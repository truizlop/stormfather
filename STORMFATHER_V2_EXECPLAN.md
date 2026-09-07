# Rebuild Stormfather as a researched living field atlas

This is a living execution plan. Keep Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective current. This plan is local working documentation and must not be committed.

## Purpose / Big Picture

Build a complete new interactive version of this React/Three.js atlas. Readers should see Roshar's recognizable geography, enter distinctive reconstructed places, observe people and appropriate creatures moving through usable streets, change the weather and simulation speed, and read the evidence behind the reconstructions. Accuracy means implementing attested silhouettes, relationships, geography and ecology while explicitly identifying invented district arrangements. It does not mean pretending the books provide surveyed elevations or every building footprint.

## Progress

- [x] 2026-09-05: Created the active goal; inspected repository and baseline browser rendering.
- [x] 2026-09-05: Found official map, Urithiru drawing, city depictions, and textual references; visually inspected Roshar and Urithiru references.
- [x] Complete source ledger; reject generated geography and retain only HUD cues.
- [x] Implement a new atlas renderer and responsive HUD with search, place travel, field notes and simulation controls.
- [x] Build new original detailed models for Urithiru, Kholinar, Kharbranth, Thaylen City, Azimir, Shattered Plains, Shinovar, Purelake, Vedenar and Akinah.
- [x] Implement route-constrained articulated people, locally appropriate creatures, activity cycles, storm shelter and pausable speed-controlled simulation.
- [x] Export and validate ten place GLBs and six articulated creature GLBs, with a source manifest.
- [x] Validate geometry, routes, HUD and behavior: 363 tests across 60 files; lint/typecheck; desktop 1280×720 and mobile 390×844; exact paused screenshot equality; source dialog and layers. Final clean-load console has no application errors; only the upstream Three.Clock deprecation warning remains.
- [x] Update README, record validation and deliver the running version at http://127.0.0.1:5173/.

## Context and Orientation

Repository: /Users/tomasruizlopez/Development/Stormfather. React 19, TypeScript, Three.js 0.185, React Three Fiber 9, Drei and Zustand are installed. Vite serves the application at http://127.0.0.1:5173/. `src/main.tsx` now mounts `src/atlas/App.tsx`; the previous entry remains in the repository. Existing code separates `src/world` simulation and geometry, `src/ui` controls, and `blender` original assets. Geographic outlines and registered anchors live in `src/world/cartography/geography.ts` and `.generated.ts`; the sourced gazetteer lives in `src/world/gazetteer`. Preserve these valuable reference datasets. The old application can remain as an explicit legacy view during development, but the new version must be the default at delivery.

## Research and Reference Decisions

Isaac Stewart's official Roshar map (Dragonsteel Roshar Map Poster) provides continental silhouette, relative settlement positions, mountain chains and ecological variation. Existing coastline registration is useful and should be retained, with new shading and geometry built from it. The official Urithiru Shallan drawing shows ten tiers, a flat east face, mountain integration and ten separate Oathgate platforms. Source prose describes semicircular tiers of eighteen floors, a glass east wall, and terrace agriculture. The reconstruction will keep these relationships and a height near 823 metres, with dimensional estimates labeled as such.

Coppermind's Kholinar/Windblades page identifies strata-colored fins, enclosing walls, a northern elevated palace and the Sunwalk. Kharbranth's page identifies a sheltered wedge-shaped mountain port, colorful blocky buildings, switchback Ralinsa and bells. Thaylen City's official map provides its mountainside wards, western field, wall and harbor. Azimir and Bronze Palace pages describe ordered boulevards and bulbous bronze-clad buildings, with the Grand Market on an Oathgate. The Shattered Plains have fourfold fracture organization, deepening/widening eastern chasms and Stormseat/Narak centrally. Shinovar has soil, ordinary grass, farms and earth/clay buildings. The Purelake is a shallow inland lake. These are model constraints; fine street layouts in new representative districts are interpretation.

Creature research: chulls have six legs, mineral shells and retract into their shells; skyeels are coastal airborne eel-like animals with flowing fins; axehounds are six-limbed crustaceans with antennae; chasmfiends have eighteen limbs including four larger foreclaws and a plated violet body. The baseline era is an illustrative, peaceful early-Oathbringer atlas, avoiding plot-state claims and later destructive events.

## Plan of Work

First create `src/atlas` as the new version's independent implementation using existing geographic data. Add typed source/place records, a small Zustand store, and a shared simulation clock. Implement original mesh-generation functions with material batching (combining repeated static objects into a few GPU submissions), terrain, labels and bounded orbit cameras. No backend is required.

Next implement `src/atlas/HUD.tsx` and its CSS: narrow top navigation, compact searchable destination drawer, an optional location inspector, bottom playback/weather controls, camera controls and a source notebook. The central scene must remain usable at 1280x720 and phone width. Every control changes real state. A place's overview camera shows its silhouette; close view shows a populated district. The continent and local views explicitly use different scales, both exposed in the interface.

Then implement original city models in dedicated modules, using metric units for local scenes and a shared building/road layout consumed by both geometry and navigation. People should walk on valid paths, dwell at destinations, head to shelter in storms and remain stopped while paused. Creatures should have correct body plans and habitat assignments. The new model builder must support GLB export through a reproducible script, with source attribution recorded separately from original geometry.

Finally run existing checks and new behavior tests, inspect the browser through the built-in browser API, compare concept and rendered screenshots, and fix visual problems. Check all ten locations, close view, pause, speed, weather, search, source notes, keyboard dismissal and mobile controls. Build for production and update project documentation.

## Concrete Steps

Run commands from the repository root. `npm run dev -- --host 127.0.0.1` starts Vite (current server session 77453). The host environment required permission to bind the local port; that command is now authorized. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` after implementing the new version. Run the new export command when introduced and inspect the generated GLB statistics.

## Validation and Acceptance

The default route opens the new atlas with visible usable controls and no framework overlay. Selecting each named destination opens its original new model. Urithiru visibly has ten semicircular tiers, Kholinar has windblades, Kharbranth climbs from docks to a sheltered mountain, and Azimir has bronze domes. Human and creature activity changes over time, pauses exactly, and responds to weather. Search retains the existing gazetteer's broader coverage. Field notes expose real source links and reconstruction uncertainty. Mobile navigation opens and closes without covering all controls. Browser logs show no relevant errors. Tests cover geography, safe paths, species anatomy/placement, store transitions and main HUD interactions. Production build succeeds.

## Idempotence and Recovery

Keep the old renderer available while authoring the new modules, then make v2 the default. Do not delete or overwrite the old Blender assets. Generation must be seeded and deterministic. Export new assets to `public/models/v2` or a named v2 kit. Do not commit this plan, publish a deployment, or alter remote state as part of local implementation unless separately authorized.

## Surprises & Discoveries

Baseline screenshot: the HUD takes both sides of the viewport, water has a strong repeating crosshatch appearance, and the continental terrain lacks fine readable ridges. Existing data already includes carefully registered geography and city-plan points, so rebuilding those from guessed coordinates would reduce accuracy. Some direct Coppermind requests return 403; indexed pages and accessible aliases provide the needed text, with retrieval limitations recorded in the reference ledger.

## Decision Log

- Decision: Keep the existing React/Vite repository and geographic datasets; build a new scene/HUD/model layer. Rationale: preserve researched placement while replacing the user-visible version. Date: 2026-09-05.
- Decision: Use explicit atlas versus metric place views. Rationale: continent-scale geography and human-scale streets cannot share one linear scale without misleading geometry. Date: 2026-09-05.
- Decision: Original procedural Three.js geometry and a GLB export kit satisfy the new model requirement. Reference artworks guide forms and are linked, not embedded as project-owned textures. Date: 2026-09-05.

## Outcomes & Retrospective

The new atlas is the default and the requested rebuild is complete. Ten source-informed place models, six articulated creature rigs, responsive HUD, searchable gazetteer, source notes, downloadable models, street and wildlife cameras, and pausable weather-aware activity are implemented. Published cartography constrains the coastline and anchors. Fine architectural layout and elevation remain explicitly labeled reconstructions.

All 363 tests across 60 files, lint, type checking, production build and all sixteen GLB validations pass. Desktop and mobile browser review covered all destinations, source dialogs, camera controls, layers and simulation. Paused scene screenshots are byte-identical. The final north-up atlas was visually compared with the official map. Final browser load has no application errors, with an upstream Three.Clock deprecation warning. Caching exact shared terrain coordinates reduced mesh construction from 18,231 ms to 1,208 ms without changing its 277,449 vertices. The local preview is running for delivery; nothing has been committed or published.

## Artifacts and Notes

Temporary downloaded reference images are in /tmp/stormfather-references. Generated HUD concept is at docs/concepts/v2/field-atlas.png. The user correctly rejected its invented geography; it is NOT an accepted reference for terrain or placement. Use only its HUD design cues. The map must follow the official east-west Roshar outline and be checked north-up against the actual source. Reference source links and concise original paraphrases will be preserved in docs/research/v2-references.md and the in-app notebook. QA screenshots stay outside committed source.

## Interfaces and Dependencies

Use the existing dependency versions. Define `Place` records with id, name, region, world anchor, source IDs, summary, modeled features and interpretation text. Model builders return a Three.js Group plus metric paths, shelter positions and camera poses. A shared clock advances only when playing and multiplies elapsed time by the selected speed. World and HUD consume the same selection and weather state.

Revision 2026-09-05: Initial plan created from repository inspection, browser baseline and online reference research.

Revision 2026-09-05: User explicitly requires faithfulness to references and rejects the generated continent. Added north-up silhouette verification as a mandatory acceptance step. Actual maps override generated imagery in every geographic or architectural conflict.

Revision 2026-09-06: Implemented source-informed v2 and ten original model builders. Explicitly corrected Kholinar plan orientation, Thaylen coastal relationships, broad Urithiru basal tiers, and irregular closely packed Plains using the published density sketch. Final QA is checking mobile controls, pause, weather and exports.

Validation 2026-09-06: `npm run typecheck`, `npm run lint`, `npm test` (363/363), `npm run export:v2`, `npm run validate:v2` (16/16) and `npm run build` passed. Vite emits its normal large-bundle notice for the Three.js application. Paused screenshots `/tmp/stormfather-paused-a.png` and `-b.png` have identical SHA-256 hashes. Temporary QA images include `/tmp/stormfather-v2-mobile.png` and `/tmp/stormfather-v2-plains.png`.

Revision 2026-09-06: Added a direct Wildlife camera after reviewing discoverability of chasmfiends and small animals. It follows registered live scene subjects, restores the creature layer, and yields to manual orbiting. Verified chasmfiend and chull selection in the browser; new HUD test covers camera/layer state.

Final validation 2026-09-06: Wildlife follow camera verified on mobile with a clearly framed chull and cargo routes reserved from pedestrian traffic. Viewport restored to desktop. Final implementation screenshot: `/tmp/stormfather-v2-final-desktop.png`; mobile wildlife screenshot: `/tmp/stormfather-v2-mobile-wildlife.png`.

## Follow-up: continuous city exploration (2026-09-06)

User requests cities integrated into the continental map while zooming, illustration-checked colors, and applicable Radiants including visible Windrunner patrols. Replace the conditional map/model scene switch with one coordinate system. Detailed place geometry remains metric internally and is uniformly enlarged at registered anchors for exploration; disclose the illustrative scale. The continental mesh and city positions remain mounted while the camera flies in or pulls out. Blend terrain at local footprints, constrain oversized legacy ground/water sheets, and enable inhabitants near the camera. Camera presets and followed actors must transform from local metres into the atlas frame; wheel zoom must discover cities without selecting a separate scene. Check coast/terrain seams, phone controls, pause, zoom back out and source notes in the browser.

Recheck original illustrations and published descriptions before palette changes. Sepia plan drawings establish form, not literal wall colors. Improve blue-uniformed Windrunner silhouettes, Stormlight wisps and patrol paths at Urithiru, with a dedicated follow action and independent Radiants layer. Limit placement to defensible locations and document the illustrative patrol interpretation.

- [x] Research color and Radiant references, update source ledger.
- [x] Implement continuous map/city coordinates and terrain joins.
- [x] Improve palettes and visible, pausable Radiant patrols.
- [x] Verify zoom, transitions, camera collision/follow, colors and mobile in browser; run appropriate tests and exports.

Follow-up outcome (2026-09-06): All ten models remain mounted at registered anchors while the camera scrolls or flies between continent and city. Browser wheel zoom revealed Urithiru and automatically activated its HUD without a scene change. Coastal taper, joined regional terrain, terrain-aware flight clearance and adaptive camera near planes remove the previous plinths, camera occlusion and distant shore depth artifacts. Fixed reversed mountain and regional-ground normals, verified with a new regression test. Blue-uniformed Windrunners now have articulated coats, ordinary spears, Stormlight wisps, an independent layer and a follow camera. The focused city takes priority for simulation activation, including wide phone views where another city is closer to the camera.

Validation: full 369-test suite passed before the last focus-selection regression; the final targeted 13-test HUD/integration suite passed with that added case (370 total tests now). Type checking, lint and production build pass. All sixteen GLBs were rebuilt and validated after the palette and mountain-normal corrections. Mobile 390×844 and desktop 1280×720 browser review passed. The paused mobile patrol screenshots have identical SHA-256 `7a8a0491243a6b650eab35aabfdaf217462fcf1b43a0766401148f7b0d23372d`. Fresh console contains no app errors, only the upstream Three.Clock deprecation notice. Source notes disclose enlarged city display scale, exact-color uncertainty and illustrative patrol routes/count. No commit or deployment performed.
Final browser delivery: zooming out from Thaylen City automatically restored atlas controls; source-registry city meshes remained in the scene throughout. Viewport override restored. Final screenshot `/tmp/stormfather-integrated-final.png` inspected; mobile patrol verification retained in `/tmp/stormfather-integrated-patrol-pause-a.png`. No application errors in the reviewed console. Latest production build includes adaptive depth precision, focus-prioritized simulation and narrow-desktop camera framing.

## Living Roshar expansion — 6 September 2026

### Purpose and user-visible outcome
Enhance the continuous atlas with two more source-anchored cities, more detailed people and fauna, all ten Radiant orders performing visible power demonstrations, discoverable Easter eggs, a coordinated bridge run, an anonymous chasmfiend hunt and a Parshendi village with daily behavior. Keep the published continental outline and integrated zoom experience. Activities are illustrative, spoiler-light loops with no named plot participants or outcomes.

### Plan and progress
- [x] Inspect existing continuous scene, simulation clock, anatomy, registered gazetteer and camera ownership.
- [x] Research the author's ten-order guide and illustrations; book-cited Yeddaw, Sesemalex Dar, listener anatomy, huts and rhythms; published bridge/hunt references.
- [x] Add Yeddaw and Sesemalex Dar at existing registered gazetteer anchors; document interpreted footprints and colors.
- [x] Build reusable articulated people with faces, hands, clothing and props; listener workform/warform variations; enrich carapace and creature joints.
- [x] Add shared-clock bridge/hunt state machines and listener daily-life routines in authored, unobstructed Plains areas.
- [x] Add all ten orders with visible, distinct Surge demonstrations and a usable scene/order selector.
- [x] Add in-world discoverables with persistent field notes and visual atmosphere.
- [x] Validate state transitions, spatial safety, pause, HUD navigation, every order and responsive browser views; export updated models and open the finished experience.

### Decisions and constraints
No new dependency is needed. Reuse the existing Three.js model builder and one-world camera. New city anchors come from the registered gazetteer, not guessed coordinates. Local demonstrations remain inside the same integrated city group. Author artwork guides costume/gemstone accents, but pale Stormlight is not recast as ten different canonical laser colors. Only one representative Bondsmith is shown. No named character identities, hidden forms, transformations or battle outcomes are exposed. Listener daily life is shown as an interpreted settlement vignette, not a claim about a precisely surveyed village or simultaneous historical era. All activity progression uses worldClock; camera easing may continue while the world is paused.

### Implementation and validation strategy
Implement actor rigs and pure phase/pose helpers separately from R3F presentation. Scene selection should restore the needed layers, travel to its host city and frame the activity. Leaving the activity returns normal exploration; user drag releases the camera. Add a compact collapsible scenes panel, order picker and phase caption rather than multiple permanent HUD panels. Use deterministic scripts to test bridge support/crossing timing and bounded creature/people paths. Browser QA must inspect the bridge, hunt, listener village, representative Radiant effects, both new cities, discovery persistence, mobile sizing and pause. Run npm test, npm run lint, npm run build, npm run export:v2 and npm run validate:v2 after changes settle.


### Outcome and evidence
Twelve integrated place models now include Yeddaw's spiral trench streets and Sesemalex Dar's covered troughs. Their anchors remain registered to the source map. Azimir and neighboring Yeddaw use a smaller displayed scale of 0.0011 to avoid overlapping their enlarged terrain footprints. No coastline or anchor was moved.

The Scenes browser launches a coordinated forty-person bridge run, a lure-and-withdrawal hunt on an open plateau, a crem-and-shell listener settlement with 24 articulated workform/warform inhabitants, and all ten Radiant orders. Powers include Lashings, Abrasion, Progression, Illumination, Soulcasting, grounded Cohesion arches/steps and simple Adhesion. Participants remain anonymous. Four inspectable props persist as curiosity notes. Faces, hands, costume details, props, listener skin marbling and carapace, and native creature shell/joint details were enhanced; humanoid and creature rigs are exported separately.

Browser review covered all ten order controls, close/wide cameras, bridge phases and completed crossing, the open-plateau hunt, listener village, both new cities, and curiosity inspection/persistence. Responsive views at 390×844 and 1280×720 kept simulation and scene controls usable. Paused Lightweaver frames `/tmp/stormfather-radiant-pause-a.png` and `-b.png` were byte-identical. Review corrected Skybreaker close-view clipping, an over-tight hunt camera, floating stone effects, shadow acne and a city-terrain overlap. Native viewport is restored for delivery.

Validation: the full suite passed 387 tests across 62 files; after two additional HUD regression cases, the final targeted HUD/experience/integration run passed all 30 tests (389 total tests in the project). Final lint, type checking and production build pass. All 32 GLBs validate (12 places, 6 creatures, 14 humanoid rigs). Vite retains its standard large-bundle notice for the Three.js app. Runtime HMR dependency warnings during editing were cleared by a fresh page load; the remaining upstream Three.Clock deprecation notice is unrelated to the application changes. No commit or deployment was performed.

Reconstruction limits: the activity choreography, village location, training court and detailed city layouts are original illustrative interpretations. The app does not assert an exact historical coexistence, surveyed city dimensions or canonical RGB swatches. Source links and interpretation notes remain accessible in Field notes and the research ledger.

## Expansion and stormwall polish — 6 September 2026 (complete)

The user asks for another substantial detail pass, more cities and Easter eggs, and explicitly a raging stormwall crossing Roshar. Add Hearthstone, Revolar, Kasitor and Rall Elorim at the existing gazetteer anchors. Preserve the continuous scene and map outline. Model Hearthstone's east-sloped homes and breakwall, Revolar's inner walls in a sprawling hill hollow, Kasitor's brick harbor and four golden pedestals, and Rall Elorim's great overhang, waterways, vines and ceramic sphere lamps. Canonical facts constrain these forms; footprints, minor architecture and colors remain original interpretations. Do not expose plot histories from research pages.

Replace the thin storm plane with a dimensional shelf-cloud front, dense driving rain, debris and branched lightning. It moves east to west, has a trailing rain body, weakens toward Shinovar and shares worldClock. Add a discoverable follow-storm camera with a compact progress HUD; manual orbit releases follow, and pause freezes the weather. Keep lightning local to the cloud rather than flashing the entire screen; support reduced motion. Enrich nearby street districts with lanterns, hanging cloth and human variations. Expand four curiosities to ten with six distinct modeled objects and a more readable collected journal.

- [x] Inspect current renderer, behavior and source anchors; research four locations and highstorm structure.
- [x] Build and integrate four source-informed destinations with valid street and animal routes.
- [x] Enhance close-up architecture, people, lighting and nearby ambient details.
- [x] Add six inspectable curiosities and collected-entry presentation without automatic discovery on hint travel.
- [x] Build dimensional stormwall, rain and lightning, continental follow camera and responsive HUD.
- [x] Test geometry/placement, shared-clock storm, camera state and discovery navigation; browser review new places, close-ups, storm, night and mobile; export, build and deliver.

Implementation touches src/atlas/models/expandedCities.ts, district details and atmosphere components, src/atlas/Stormwall.tsx and storm state helpers, data/integration/store/Scene/HUD, and the source ledger. Reuse installed Three.js and the GLB export pipeline, with no new dependency. Verify with npm test, npm run lint, npm run build, npm run export:v2 and npm run validate:v2. Inspect the running localhost:5173 preview through CUA, then restore native viewport and keep the final tab open. Do not commit or publish.


### Outcome and verification
The continuous atlas contains sixteen detailed places. Hearthstone has west-facing openings in wedge-shaped homes and a continuous eastern bluff; Revolar grows over a smooth hill hollow around its older walls; Kasitor uses brick façades, rigged boats, a viewing platform and four golden pedestals; Rall Elorim has a rough vaulted overhang backed by cliff, pendant dwellings, falling water, mist and a precisely bounded reservoir. All new anchors match the registered gazetteer. Tests confirm no displayed city terrain footprints overlap.

Street furniture, moving banners, luminous sphere lamps, improved shoulder/elbow joints, hair and braid variations, and golden-haired Iriali residents enrich close views. Ten curiosities are distributed across ten places; hint travel does not grant discovery, and found entries expose their saved descriptions and revisit action. The earlier Radiant orders, listener routines, bridge crew and non-lethal hunt remain in the same world.

The highstorm uses a ray-marched cloud volume with layered billows, localized lightning, rain and tumbling debris. A following camera tracks its east-to-west crossing, with region/progress feedback and an immediate clear action that works while paused. Reduced-motion settings suppress billow animation, debris motion and lightning. Its displayed speed and height remain explicitly illustrative. Browser review caught and fixed a GPU-uniform update issue, an obstructed street camera, overly angular terrain boundaries and a reservoir bank seam.

Validation: 404 tests passed across 63 files with one worker. The earlier four-worker run competed for resources and hit timeouts; the serial rerun passed. Subsequent focused checks passed all 20 HUD/storm cases and all 16 storm/integration cases after the final visual fixes. Production build, type checking and lint pass; Vite retains its Three.js bundle-size notice. All 36 exported GLBs validate (16 places, six creatures, fourteen character rigs), with finite vertices, valid buffers and expected articulated limbs. No new dependency was added.

Visual review covered all four added places, corrected street views, curiosity inspection and persistence, the storm-follow HUD at 390×844 and 1280×720, and the final reservoir/cliff. Paused storm screenshots `/tmp/stormfather-storm-pause-a.png` and `-b.png` are byte-identical. The native viewport is restored for delivery. The local preview remains open; no commit or deployment was performed. Reference evidence and interpretation limits are in `docs/research/v2-references.md` and the in-app Field notes.

The final night view confirmed illuminated windows and sphere lamps under Rall Elorim’s overhang. The browser was marked as the deliverable and presented with the highstorm running; the only remaining console notice is the upstream Three.Clock deprecation. A delivery screenshot is saved at `docs/concepts/v2/stormwall-pass4.png`.

# Terrain, proximity, arrival, population, and ecology QA

This ledger records the final acceptance pass for the nine authored Roshar
destinations. The generated concept boards in `docs/concepts` are visual targets,
never runtime backdrops. The browser captures below are current Three.js output.

## Authored destinations

Every desktop capture uses a 1440 × 1000 viewport. The live tour verified, for
each place, that:

1. the final camera position is outside the conservative authored bounds;
2. the camera target faces the location anchor;
3. `proximityLocationId` resolves to the approached city;
4. the authored GLB root and its complete ancestor chain are visible; and
5. the surrounding terrain or water remains visible for contact inspection.

| Destination | Current render | Terrain/contact result | Arrival/LOD result |
|---|---|---|---|
| Azimir / Azir | [desktop](terrain-integration-desktop-azimir-final.jpg), [mobile](terrain-integration-mobile-azimir-final.jpg) | Radial civic fabric and foundations meet the bounded earth cradle; no presentation slab is visible. | Exterior city frame; exact Azimir search routes to this authored scene while retaining the precise inspector label. |
| Shattered Plains | [desktop](terrain-integration-desktop-shattered-plains-final.jpg) | Stormseat, warcamp, bridges, plateaus, residents, and fauna share the local surface contract. | Interior-facing exterior arrival avoids the prior black map-edge wedge; far, mid, and near tiers remain distinct. |
| Urithiru | [desktop](terrain-integration-desktop-urithiru-final.jpg), [mobile](terrain-integration-mobile-urithiru-final.jpg) | The lower tower, gate, forecourt, retaining shoulders, and mountain saddle overlap without a detached fan plinth. | Full ten-tier silhouette is visible on arrival; portrait fitting preserves mountain context. |
| Shinovar | [desktop](terrain-integration-desktop-shinovar-final.jpg) | Fields, farms, roads, temple compound, and valley terrain use one sampled ground contract. | Exterior frame remains inside Shinovar’s proximity lens and mounts without list-selection ownership. |
| Purelake | [desktop](terrain-integration-desktop-purelake-final.jpg), [mobile](terrain-integration-mobile-purelake-final.jpg) | Huts, rafts, reeds, shallows, lakebed, and animated water share the settlement water datum. | Irregular water-edge context remains visible; no selected oval or circular lake insert is exposed. |
| Akinah / Aimia | [desktop](terrain-integration-desktop-akinah-final.jpg) | Ruins, pale geological supports, pools, surf, and island transition meet at one tidal datum. | Exact Akinah search activates the Aimia authored root without leaving a stale prior city mounted. |
| Kharbranth | [desktop](terrain-integration-desktop-kharbranth-final.jpg), [mobile](terrain-integration-mobile-kharbranth-final.jpg), [street](terrain-integration-desktop-kharbranth-street-final.jpg) | Hospital crown, stacked wards, cliff toes, switchbacks, quay, ships, and harbor water form one wedge. | Complete exterior on travel; human-scale street pose stays above paving and repeated zoom-out exits inspection monotonically. |
| Kholinar | [desktop](terrain-integration-desktop-kholinar-final.jpg) | Gates, windblades, ravine wards, palace, markets, and shared geology have no floating district cap. | Authored root mounted during a manual approach while `selectedId` remained `roshar`. |
| Thaylen City | [desktop](terrain-integration-desktop-thaylen-city-final.jpg) | Seawalls, merchant ward, docks, ships, peninsula terrain, and animated ocean use the shared harbor datum. | The previous circular coastal-foundation display base is absent; overlap ownership hands off cleanly from Kharbranth. |

Direct `view_image` comparison against the four target boards confirmed the
required relationships: continuous ground/water contact, readable settlement
silhouette, local human scale, and surrounding geographic context. The runtime
remains a stylized real-time atlas; the target boards set material and composition
direction rather than promising offline-render photorealism.

## Camera, free navigation, and progressive LOD

| Check | Evidence | Result |
|---|---|:---:|
| Manual approach renders cities without tapping a list | Live Kholinar approach kept `selectedId=roshar`, resolved `proximityLocationId=kholinar`, mounted `Landmark_Kholinar`, and entered city detail. Automated coverage repeats the contract for all nine roots. | Pass |
| Only the viewed overlapping city owns near detail | View-aligned scoring resolves Kharbranth’s lower road to Kharbranth instead of nearby Thaylen City; owner hysteresis and outgoing fade have integration tests. | Pass |
| Far → mid → authored near progression | Non-owners retain real camera distance for far/mid silhouettes while near mounting remains owner-gated. A regression test prevents far-to-near popping. | Pass |
| Cold authored asset never blanks the world | CityClusters has a non-null proxy fallback. GLB-backed population, activities, and ecology suspend in local boundaries instead of the app-wide null boundary. | Pass |
| List/search arrivals begin outside geometry | Conservative bounds and surface-clearance tests cover all nine desktop and portrait poses; the live tour confirmed each authored root. | Pass |
| Camera does not start inside a city | All nine poses look toward their bounds from outside; city/street zoom uses collision-safe envelopes. | Pass |
| Superseding travel clears queued zoom | Live sequence Kharbranth → queued Street → Urithiru finished at Urithiru city (`distance=19.5`) with no stale Kharbranth zoom. Component regression coverage matches it. | Pass |
| Stale exact search cannot hijack later zoom | With exact Azimir still selected, a manual Kholinar pan followed by Street kept the focus within `0.2` units of Kholinar and `49.76` from Azir. | Pass |
| Kharbranth Street zoom-out is monotonic | Recorded camera distances: `0.882`, `4.618`, `6.372`, `8.794`, `12.136`, `16.747`, `23.111`, `31.893`; detail progressed Street → City → Region and ownership cleared only beyond the city lens. | Pass |
| Mobile rotate/pan preserves the city | At 390 × 844, a controls start/end with unchanged distance retained `detail=city` and `proximity=kharbranth`. | Pass |
| Mobile pinch/dolly can leave fitted city detail | A 2% native dolly changed distance `54.0 → 55.08`, released fitted semantics, and returned naturally to Region. | Pass |
| Portrait composition and overflow | Pure fitting tests cover all nine modeled bounds. Azimir, Purelake, Kharbranth, and Urithiru were visually inspected at 390 × 844 with usable title card, controls, travel sheet, and no horizontal overflow. | Pass |

## People, activities, and collision

| Check | Evidence | Result |
|---|---|:---:|
| Human/building scale | Door, actor, prop, road, and bridge dimensions share the local meter scale; the Kharbranth street capture shows full bodies against counters and façades. | Pass |
| Terrain and authored-floor grounding | Navigation validates sampled height, slope, water exclusion, terrain masks, authored walkable supports, and maximum step height for all nine destinations. | Pass |
| Environment collision | Routes are built against expanded rotated district footprints and measured GLB obstacles; invalid routes are rejected. | Pass |
| Crowd distribution | Resident route assignment is deterministic and balanced across available paths; separation resolves shared occupancy without per-frame allocation. | Pass |
| City-specific activity | Ports, civic traffic, farming, fishing, bridge crews, Urithiru patrols/Windrunners, and Thaylen shipping remain location-specific and proximity-owned. | Pass |
| GPU lifecycle | Cloned cloth/skin textures and Kharbranth actor materials dispose on handoff; non-Khar residents no longer request Khar-only microtextures. | Pass |

## Creatures and spren

| Check | Evidence | Result |
|---|---|:---:|
| Chasmfiend anatomy and scale | [Current desktop capture](terrain-integration-desktop-chasmfiend.jpg) plus physical-dimension tests cover the segmented carapace, foreclaws, eyes, fourteen legs, and hero-scale budget. | Pass |
| Chasmfiend locomotion/grounding | Continuous ellipse motion, tangent heading, terrain-plane fit, alternating lift, and fourteen residual foot contacts are tested across phases. | Pass |
| Creature collision | Ground fauna use terrain- and GLB-obstacle-validated routes with species-length-aware clearance and separated pocket patrols. An exact 54 MB GLB audit covered all nine modeled locations at both city and street detail; every full footprint cleared rotated geometry, terrain, and the complete detailed-resident lane/body corridor. | Pass |
| LOD/performance | Physical fauna budgets are zero at continent/region, at most one hero exists locally, compact mobile rigs reduce segments/shadows, and heavy collision data loads only in local detail. | Pass |
| Storm response | Fauna brace or shelter without discontinuous phase/heading changes; wind/rain spren increase while life spren retract. | Pass |

## Final automated and browser gates

The final source revision passed:

- `npm test -- --run` — 46 files, 251 tests passed
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run validate:assets` — passed for 45 expected roots, 13 generated
  runtime textures, and eight city material atlases
- `git diff --check` — passed

Browser QA used the current development server, not the removed stale 5176
session. No Vite overlay, failed asset, framework error, or WebGL error appeared.
The only console warning was Three.js’s existing `Clock` deprecation notice.

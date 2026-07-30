# Accepted visual direction

These images are the implementation specification for the Roshar living atlas.

- `atlas-desktop.png` defines the primary desktop composition, terrain treatment, travel rail, location intelligence, controls, and minimap.
- `atlas-mobile.png` defines the responsive hierarchy, compact location strip, touch controls, and bottom travel sheet. Its “approaching from the west” warning is a generated-copy error; the implementation uses the canonical east-to-west Highstorm direction.
- `highstorm-follow.png` defines the cinematic storm-follow camera, telemetry, timeline, and world reaction state.
- `refinement-kharbranth-city.png` defines the second-pass city-density target: a steep working harbor, terraced districts, switchback stairs, bells, painted roofs, docks, crowds, and storm-dark water.
- `refinement-shattered-street.png` defines the close street target: wet plateau paving, chasm depth, scaffolding, bridges, tents, work props, articulated crowds, and visible storm preparation.
- `refinement-purelake-water.png` defines the water target: transparent shallows, visible lakebed, caustics, shoals, drainage channels, rafts, fishing work, and wading inhabitants.
- `fidelity-continent-map.png` defines the third-pass continental target: a
  geographically recognizable Roshar silhouette, dense island systems, regional
  relief, river networks, shallow shelves, settlement-scale landmarks, and a
  distant Highstorm, while preserving the accepted interface.
- `city-fidelity-kharbranth.jpg` defines the realistic Kharbranth benchmark:
  a storm-sheltered cliff wedge, working harbor, continuous Ralinsa, blocky
  painted buildings, bells, cliff-carved institutions, grounded PBR materials,
  correctly scaled crowds, and cold highstorm-front light.
- `city-fidelity-kharbranth-residents.jpg` defines the corresponding human
  benchmark: realistic anatomy, varied Rosharan complexions, layered workwear,
  occupation props, visible textile wear, and a covered Vorin safehand.
- `shattered-plains-narak-topology-target.png` defines the topology benchmark
  for the Shattered Plains: level cap-rock plateaus, deeply recessed chasms,
  bridge-only crossings, grounded warcamps, and Narak/Stormseat as a readable
  central precinct with its adjacent Oathgate plateau.
- `vedenar-authored-city-target.png` defines the authored Vedenar benchmark:
  terraced wards embedded in Tarat Sea cliffs, the Valhav Oathgate garden,
  river and field approaches, a damaged palace quarter, storm shelters, and
  burned docks under active reconstruction.
- `vedenar-material-atlas-source.png` is the generated source for Vedenar's
  modeled green-gray stormstone, damaged Veden plaster, stormwood, and wet
  Oathgate/harbor paving. The optimized runtime sheet lives under
  `public/textures/cities/`; it is mapped only onto real geometry.
- `shinovar-pastoral-scale-target.png` defines the corrected Shinovar scale:
  broad pasture, many ordinary-sized trees, low farms and Herald temples,
  sheep flocks, shepherds, and mountains that remain vastly larger than every
  inhabited or vegetated element.

The visuals are original ImageGen concepts created for this project. They are not official art and do not reproduce an official map raster.

The refinement images are deliberately aspirational. They specify hierarchy,
material response, density, occupations, and location identity rather than asking
the real-time scene to reproduce every painted object. The implementation uses
original procedural layouts, Blender-authored modules, instancing, shaders, and
LOD budgets. Full generation prompts are preserved in
`refinement-prompts.md`.
The full third-pass prompt and its reference roles are preserved in
`fidelity-prompts.md`.
The city-fidelity prompts, illustration research, factual cues, and copyright
boundary are preserved in `city-fidelity-prompts.md`.
The Shattered Plains, Vedenar, and Shinovar target prompts, research roles, and
runtime constraints are preserved in
`shattered-vedenar-shinovar-prompts.md`.

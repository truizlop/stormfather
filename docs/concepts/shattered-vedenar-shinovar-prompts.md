# Shattered Plains, Vedenar, and Shinovar concept targets

These original OpenAI Image Gen concepts were created on 2026-07-30 as
implementation targets for the Blender/Three.js world. They are visual
specifications, not runtime backdrops, billboards, texture projections, or
official Stormlight artwork. The shipped scenes must reproduce their spatial
logic with interactive geometry, materials, simulation, and progressive LOD.

## Shattered Plains and Narak

Output: `shattered-plains-narak-topology-target.png`

Research roles:

- The supplied Roshar map fixes the Shattered Plains in eastern Alethkar.
- The Coppermind Shattered Plains and Stormseat/Narak summaries inform the
  relationship between deep plateau chasms, human bridge crossings, the
  listener settlement among older ruins, and the nearby Oathgate plateau.
- `refinement-shattered-street.png` and
  `terrain-integration-landforms-target.png` preserve the accepted material,
  occupation, and storm-weathered direction.

Generation prompt:

> Create a highly detailed, photorealistic oblique aerial visual-development
> target for a production Blender and Three.js Shattered Plains scene from The
> Stormlight Archive. Show a vast continuous cap-rock formation fractured into
> broad irregular plateaus by genuinely deep, recessed, branching chasms. The
> plateau tops must be mostly level and large enough for human camps, roads,
> carts, troops, and portable bridge crews; chasm floors and layered eroded
> walls must sit far below them. Every person, tent, barracks, scaffold, cart,
> and bridge foot must visibly contact a plateau cap. People cross gaps only on
> bridge decks that meet both stone lips. Make Narak/Stormseat a readable,
> substantial central precinct: ancient ruined stonework adapted with
> carapace-like dwellings, crem partitions, rockbud plots, a watchtower, and an
> adjacent intact Oathgate plateau reached by old bridges and ramps. Include a
> few distant warcamps and chasmfiend scale cues without making them the focal
> point. Use storm-dark atmosphere, wet stratified stone, crem deposits,
> sparse Rosharan flora, deep occlusion, mist in the lowest chasms, tiny
> correctly scaled inhabitants, and modular forms feasible for real-time LOD.
> No floating islands, pillar forest, shallow painted cracks, detached city
> platform, miniature diorama, text, labels, UI, or static matte-painting
> composition.

## Vedenar

Output: `vedenar-authored-city-target.png`

Research roles:

- The supplied Roshar map fixes Vedenar in Jah Keved near the Tarat Sea.
- The Coppermind Vedenar and Oathgate summaries inform the cliff and river
  setting, northern fields, terraced geology, Valhav Oathgate garden and
  approach, palace destruction, sheltered docks, temples, storm shelters, and
  wartime rebuilding.
- Existing authored Kharbranth, Kholinar, and Azimir targets establish the
  project-wide density, terrain contact, and human-scale standard.

Generation prompt:

> Create a highly detailed, photorealistic oblique aerial visual-development
> target for an authored Blender and Three.js version of Vedenar, capital of
> Jah Keved. Build a large inhabited cliff city into stepped, plate-like
> geological terraces above the Tarat Sea, with continuous retaining walls,
> foundations, stairs, roads, drains, and ramps keyed into the same terrain.
> A river approaches from the Horneater Peaks past broad northern fields.
> Center a dignified Valhav Oathgate garden and raised ramp/stair approach
> within a dense civic quarter. Contrast surviving green-gray stone wards,
> temples, library, markets, storm shelters, bridges, and painted Veden roofs
> with a visibly war-damaged palace district and burned harbor warehouses.
> Place docks in a naturally sheltered coastal notch behind a stone ridge and
> show crews rebuilding roofs, quays, and masonry. Include crowds, carts,
> caravans, ships, scaffolds, smoke residue, wet stone, crem, cloth, vegetation,
> warm interiors, and storm light at believable scale. Compose clear far,
> mid-distance, and street-detail silhouettes that can become progressive
> real-time LODs. No floating city slab, pristine generic fantasy castle,
> detached Oathgate, text, labels, UI, official-art imitation, or static
> backdrop.

## Pastoral Shinovar

Output: `shinovar-pastoral-scale-target.png`

Research roles:

- The supplied Shinovar map fixes its enclosed geography, roads, settlements,
  and Herald temple compounds.
- `terrain-integration-landforms-target.png` preserves the accepted green
  sheltered-valley direction.
- The current runtime screenshot is used only as a defect reference: its five
  trees are roughly mountain-sized and must not be reproduced.

Generation prompt:

> Create a highly detailed, photorealistic oblique aerial visual-development
> target for a production Blender and Three.js pastoral Shinovar valley.
> Preserve Shinovar as an unusually soft, green, sheltered landscape enclosed
> by the enormous Misted Mountains. Fill the valley with broad sheep pasture,
> ordered fields, hedgerows, streams, modest stone-and-timber farms, winding
> roads, villages, and restrained Herald temple compounds seated naturally on
> slopes and valley floor. Use many ordinary-sized deciduous and orchard trees:
> most around five to eight metres, selected mature specimens below twelve
> metres, dense enough to shape lanes and shelterbelts but tiny compared with
> the mountains. Show several correctly scaled sheep flocks, lambs, shepherds,
> sheepdogs, low fences, gates, wool carts, and people guiding animals between
> pasture and storm shelters. People, sheep, trees, houses, and distant
> mountains must make the scale hierarchy unmistakable. Use realistic grass,
> soil, bark, foliage, wool, timber, stone, soft cloud light, atmospheric
> distance, and modular geometry suitable for instancing and LOD. No giant
> lollipop trees, circular green platform, floating farms, toy diorama,
> Rosharan rock terrain inside the protected valley, text, labels, or UI.

## Fidelity checks

The implementation is compared against these targets on:

1. terrain topology and contact;
2. silhouette at far and mid LOD;
3. human, animal, vegetation, building, and mountain scale;
4. material variation and weather response;
5. visible daily-life activity;
6. camera framing and progressive detail;
7. desktop and portrait-mobile readability.

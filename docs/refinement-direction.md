# Detail refinement direction

This pass preserves the accepted ink-and-brass atlas interface and concentrates
new visual work in the navigable world. The target is not a static illustration;
it is a readable simulation whose detail changes with camera distance.

## Reference extraction

The supplied map is used as a cartographic reference for national adjacency,
relative placement, and broad frontier shape. It is not embedded in the site.
Country boundaries are represented as named vector polylines shared by the 3D
terrain and minimap. Solid brass means a national frontier, a broken warm line
means disputed control, and a widely spaced green-gold line means a porous
cultural or ecological edge.

Online references were consulted for factual inspiration:

- Brandon Sanderson’s official *The Way of Kings* interior-art collection includes
  the Kharbranth map and confirms the city’s harbor-to-mountain composition:
  <https://www.brandonsanderson.com/blogs/blog/the-way-of-kings-interior-illustrations-now-uploaded>
- The Coppermind’s Kharbranth and Ralinsa summaries describe a steep, crowded city
  of switchbacks, porters, bells, color-coded functions, and buildings integrated
  into the mountain:
  <https://coppermind.net/wiki/Coppermind:Welcome/Featured_Article/Kharbranth>
  and <https://coppermind.net/wiki/Ralinsa>
- Brandon Sanderson’s official series overview emphasizes stone, storms, and
  shelter-shaped ecology:
  <https://www.brandonsanderson.com/pages/the-stormlight-archive-series>
- Community galleries were used only to compare broad color and silhouette
  interpretations of the Purelake and singers:
  <https://www.17thshard.com/gallery/image/2776-purelake/> and
  <https://coppermind.net/wiki/Sah>

No online illustration is copied, traced, downloaded into the runtime, or used as
a texture. All concept boards, textures, geometry, layouts, and shaders in this
repository are original project assets.

## Runtime translation

1. **Kharbranth:** concentrate mass vertically; connect terraces with stairs and
   switchbacks; use bells, awnings, colored roofs, docks, and porter routes as
   readable identity cues.
2. **Shattered Plains:** replace a generic block cluster with layered plateau
   slabs, wet paving, rope bridges, scaffolding, tents, crates, barrels, and work
   crews close to chasm edges.
3. **Purelake:** distinguish shallow inland water from ocean through transparency,
   lakebed color, caustics, ripples, shoals, platforms, rafts, nets, and wading
   behavior.
4. **Inhabitants:** use articulated instanced parts and deterministic culture,
   clothing, stature, job, prop, gait, and shelter behavior. Crowds should read as
   social activity rather than orbiting markers.
5. **Water:** layer vertex waves, view-angle Fresnel, procedural crests, foam,
   shallow color, wakes, and Highstorm amplification without a mobile-expensive
   reflection pass.
6. **Frontiers:** keep borders cartographic, not physical. Opacity and labels
   decrease toward street LOD while the minimap retains an overview.

## Refinement fidelity ledger

- Preserve the original near-black, brass, cyan, and mineral palette.
- Preserve all existing travel, search, time, weather, minimap, and zoom controls.
- Match the Kharbranth concept’s vertical circulation and harbor activity.
- Match the Shattered Plains concept’s wet material contrast and occupation density.
- Match the Purelake concept’s visible lakebed and shallow-water translucency.
- Keep every new close-detail system deterministic and performance-aware.
- Make national, disputed, and porous frontiers visually distinct at a glance.
- Ensure mobile retains meaningful water, people, and city detail rather than
  disabling those systems.

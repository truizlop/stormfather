# Geographic fidelity concept

## Generation record

- Mode: ImageGen image edit / full-screen UI concept
- Accepted output: `fidelity-continent-map.png`
- Canonical geography reference:
  `codex-clipboard-8b488375-7ee7-4f61-a858-8afeafbb7419.png`, supplied by the
  project owner
- Interface reference: `../qa/detail-continent-frontiers.png`
- Runtime use: none. This is an implementation target, not a backdrop or texture.

## Prompt

> Create a polished desktop UI concept for the existing Roshar interactive 3D
> atlas. IMAGE 1 is the canonical geography reference and must control the land
> silhouette, coast shape, Reshi Isles arc, Aimia, Thaylenah and southern islands,
> eastern islands, Purelake footprint, relative mountain systems, rivers, country
> frontiers, and relative placement of major regions and cities. IMAGE 2 is the
> current product and must control the interface: preserve its exact dark navy and
> antique-gold visual language, top navigation, left Travel panel, right
> information panel, legend, geographic scale, minimap, and lower-right controls.
> Change only the central Three.js world visualization and the minimap geography.
>
> Show the CONTINENT zoom as a premium, physically dimensional oblique 3D relief
> atlas, geographically faithful to IMAGE 1: a long east-west Roshar landmass with
> deeply articulated bays, peninsulas, narrow channels, hundreds of varied islands
> grouped in the correct places, a shallow luminous Purelake, mountain chains
> following the reference, fine river networks, subtle biome/material transitions,
> and crisp country frontier lines conforming to terrain. Major destinations
> should be visible as tiny authored settlement clusters and landmark silhouettes
> appropriate to continental scale, not oversized icons. Ocean should be richly
> rendered deep blue water with shallow turquoise shelves, foam along windward
> eastern coasts, and bathymetric variation. Add a distant Highstorm wall over the
> eastern ocean with coherent atmosphere and cloud shadow, without obscuring the
> map.
>
> The map should feel like Google Earth 3D meets a hand-crafted prestige strategy
> game: high-resolution terrain, legible hierarchy, realistic scale, restrained
> cinematic lighting, excellent contrast, and plausible implementation in
> Three.js using LOD and Blender-authored assets. Keep an oblique camera that makes
> the whole landmass readable. Preserve all existing UI text and structure from
> IMAGE 2; do not invent panels, buttons, logos, or labels. Do not reproduce IMAGE
> 1 as a flat raster texture and do not make a parchment map. Avoid a floating
> slab, rounded blob coastline, toy-like cones, oversized buildings, noisy
> micro-labels, illegible text, fantasy sky islands, or photoreal people at this
> zoom. Full-screen 16:9 product screenshot, no device frame.

## Translation into the real-time scene

The concept is intentionally aspirational, but its structural cues are acceptance
criteria:

1. Coastline, islands, inland water, borders, and destinations must share one
   canonical vector coordinate system derived from the supplied map.
2. Continental terrain must use continuous relief rather than a flat extruded
   slab with cone mountains.
3. Ocean depth, shelves, coast foam, and Purelake must make water legible at the
   whole-continent view.
4. Settlements and landmarks must remain correctly scaled at continent zoom and
   add density only through LOD.
5. The existing ink-and-brass interface remains intact.

# Stormfather

An original, unofficial fan-made living 3D atlas of Roshar, built with React, Three.js, and Blender.

The project aims for the immediacy of a 3D map and the ambient life of a city-builder: travel from a continent view into regional landmarks, watch inhabitants and caravans move through the world, and follow a Highstorm from the Ocean of Origins toward the west.

> Stormlight Archive, Roshar, and related names belong to Brandon Sanderson and Dragonsteel Entertainment. This non-commercial fan project is not endorsed by or affiliated with them. All application code, terrain meshes, textures, UI designs, and 3D interpretations in this repository are original.

## Visual direction

The accepted design concepts are preserved in [`docs/concepts`](docs/concepts). They establish a dark mineral cartographic interface, fine brass rules, restrained Stormlight cyan, editorial place-name typography, and a detailed miniature-diorama world.

## What is in the atlas

- Smooth travel from a full-continent view to region, city, and street detail
- Alethkar, Azir, the Shattered Plains, Urithiru, Shinovar, Jah Keved, the Purelake, Aimia, Kharbranth, Kholinar, and Thaylen City
- A moving east-to-west Highstorm with rain, lightning, settlement dimming, sheltering inhabitants, retracting flora, and an aerial follow camera
- Animated articulated cultural populations with occupation props, bridge runs,
  fishing rafts, working harbor cargo, caravans, ships, and storm shelter behavior
- Meter-calibrated inhabitants, doors, districts, and Blender landmarks, with
  pedestrian navigation generated from rendered building footprints, chasm-safe
  walkable areas, and local crowd separation
- Storm-reactive deep seas, coastal foam, shallow Purelake caustics and drainage,
  shoals, wakes, and animated harbor basins
- Location-specific close districts: Kharbranth terraces and docks, Shattered
  Plains warcamp infrastructure, Purelake walkways and nets, Azish domes, Shin
  farms, Aimian ruins, and more
- Solid national, dashed disputed, and porous country frontiers shared by the 3D
  terrain and minimap, with a visibility control and broad-zoom country labels
- A responsive brass-and-slate interface with search, minimap, semantic scale
  bars, LOD controls, day/night lighting, and a compact mobile travel sheet
- A draggable Kharbranth reference/live inspection mode with generated
  depth-relief city and resident LODs; authored Blender streets and animated
  residents take over again at navigable close range
- Settlement lights, roads, mountain chains, culturally distinct materials, and
  ten hidden discoveries
- An original Blender-authored landmark and inhabitant kit, plus original generated tiling materials

The scene adapts population counts, architecture, modules, labels, landmarks,
frontiers, and water quality to the current camera distance. Geographic mode is
calibrated to an approximately 4,000-mile-wide Roshar; city and street views
explicitly switch to a 12-meters-per-unit local district scale. Instancing keeps
the busy “living miniature” views practical on mobile GPUs. Detailed inhabitants
remain within a calibrated 1.56–2.00 m range, while pathfinding preserves 0.77 m
of body-plus-environment clearance.

## Controls

- Drag to orbit; secondary-drag to pan; wheel or pinch to zoom.
- Use the Travel rail, search button, or mobile destination sheet to jump to a place.
- Select **Highstorm** to move with the stormwall over Roshar.
- The top detail controls and map zoom buttons move between continent, region, city, and street scales.
- Select a small cyan discovery marker to reveal an easter egg.
- Use the map-layer button to show or hide political frontiers.
- In Kharbranth city or street detail, use **Compare generated art to 3D** and
  switch between the city and resident views. The comparison labels its
  image-based depth-relief LOD explicitly; close it or zoom to street scale to
  return to the fully authored moving scene.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Rebuild the source Blender scene and exported GLB with:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/build_landmarks.py
```

The deterministic authoring script writes `blender/roshar-landmarks.blend`, `public/models/roshar-landmarks.glb`, and the preview render in `docs`.

The `main` branch is published to GitHub Pages by [the deployment workflow](.github/workflows/deploy.yml).

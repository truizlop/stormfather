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
- Animated cultural populations, caravans, ships, settlement lights, roads, mountain chains, and ten hidden discoveries
- A responsive brass-and-slate interface with search, minimap, LOD controls, day/night lighting, and a compact mobile travel sheet
- An original Blender-authored landmark and inhabitant kit, plus original generated tiling materials

The scene adapts its population counts, labels, landmarks, and procedural detail to the current camera distance. Instancing keeps the busy “living miniature” views practical on mobile GPUs.

## Controls

- Drag to orbit; secondary-drag to pan; wheel or pinch to zoom.
- Use the Travel rail, search button, or mobile destination sheet to jump to a place.
- Select **Highstorm** to move with the stormwall over Roshar.
- The top detail controls and map zoom buttons move between continent, region, city, and street scales.
- Select a small cyan discovery marker to reveal an easter egg.

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

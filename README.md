# Stormfather

An original, unofficial fan-made living 3D atlas of Roshar, built with React, Three.js, and Blender.

The project aims for the immediacy of a 3D map and the ambient life of a city-builder: travel from a continent view into regional landmarks, watch inhabitants and caravans move through the world, and follow a Highstorm from the Ocean of Origins toward the west.

> Stormlight Archive, Roshar, and related names belong to Brandon Sanderson and Dragonsteel Entertainment. This non-commercial fan project is not endorsed by or affiliated with them. All application code, terrain meshes, textures, UI designs, and 3D interpretations in this repository are original.

## Visual direction

The accepted design concepts are preserved in [`docs/concepts`](docs/concepts). They establish a dark mineral cartographic interface, fine brass rules, restrained Stormlight cyan, editorial place-name typography, and a detailed miniature-diorama world.

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

The `main` branch is published to GitHub Pages by [the deployment workflow](.github/workflows/deploy.yml).

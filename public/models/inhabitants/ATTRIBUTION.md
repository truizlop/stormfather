# Stormfather inhabitants

The active people renderer uses the realistic male and female anatomical bases from **Blender Studio Human Base Meshes**, licensed **CC0 1.0**. Contributors: Blender Studio, Dan Ulrich, Paul Kotelevets, Tonatiuh de San Julián and Julien Kaspar.

Source: https://www.blender.org/download/demo-files/
Original bundle: https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.2.0.zip
License: https://creativecommons.org/publicdomain/zero/1.0/

`blender/export_people.py` normalizes and subdivides the existing licensed bases and exports `anatomy-male.glb` and `anatomy-female.glb`. Runtime code fits clothing, regional appearance, hair, eyes and grown shell, and binds the surfaces to shared animation joints. These are artistic representatives, not likenesses of real people or official character designs.

The aligned male/female skin atlas in `public/textures/people/face-albedo.png` was created with the built-in imagegen tool from an orthographic render of those bases. Concept images and generation notes are in `docs/concepts/people`. The conversion route uses an anatomical asset adapter and fitted texture projection; it is not neural extraction of a complete mesh from an image. Rodin and Hunyuan3D were not configured in this environment.

## Retained earlier assets

`head.glb`, `head-color.jpg` and `head-normal.jpg` are the earlier **Lee Perry-Smith** head scan, by Lee Perry-Smith / Infinite-Realities, retained in the workspace but no longer used by the active people renderer. These retain their **CC BY 3.0** attribution.

Source: https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/LeePerrySmith
Creator: https://www.ir-ltd.net/
License: https://creativecommons.org/licenses/by/3.0/

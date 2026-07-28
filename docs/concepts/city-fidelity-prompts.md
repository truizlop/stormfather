# City and inhabitant fidelity concepts

Mode: built-in ImageGen, project-bound generation. The previous Kharbranth concept
was used as a composition reference. The new images and production textures are
original outputs created for this repository.

## Research boundary

The following published pages were reviewed for factual and visual cues:

- Brandon Sanderson's official upload of *The Way of Kings* interior
  illustrations:
  https://www.brandonsanderson.com/blogs/blog/the-way-of-kings-interior-illustrations-now-uploaded
- The licensed Cosmere RPG cultural character presentation from Brotherwise
  Games:
  https://www.brotherwisegames.com/cosmere-rpg
- The publisher's *The Way of Kings* excerpt describing Alethi dress and
  appearance:
  https://us.macmillan.com/books/9780765365279/thewayofkings/
- Brandon Sanderson's art-direction notes for *Oathbringer*:
  https://www.brandonsanderson.com/blogs/blog/oathbringer-art-roundup-part-1
- Kharbranth image and description indexes on the Coppermind:
  https://coppermind.net/wiki/Kharbranth/Gallery
- Akhil Nasar's independent architectural interpretation, reviewed as a
  comparative example rather than copied:
  https://akhilnasar.artstation.com/projects/5XkLPW

No illustration from these sources is stored in the repository or used as a
runtime texture. Research was reduced to factual cues: a city wedged in a broad
coastal crack; blocky mud-or-daub buildings with square windows; weathered
red/orange/blue/yellow paint; a steep climbing road; a cosmopolitan port; ordinary
bells; Rosharan layered clothing; and the covered Vorin safehand.

## Complete-screen Kharbranth target

Input: `docs/concepts/refinement-kharbranth-city.png`, used as a composition and
interface reference.

Prompt:

> Create a complete desktop game/map screen that preserves the established
> 16:9 elevated harbor-facing camera, dark ink-and-brass atlas interface and panel
> hierarchy. Rebuild only the Kharbranth world scene as a near-photoreal,
> physically plausible PBR visualization. Place the dense city in a broad crack
> between immense dark coastal cliffs, open to the sea. Make the Ralinsa a
> continuous switchback stair-road from the working harbor to cliff-carved upper
> institutions. Use compact blocky mud-and-daub buildings with square windows,
> weathered red, orange, teal, ochre and ivory paint, pervasive ordinary bronze
> bells, deep institutional portals, wet quays, timber piers, cargo, ships,
> drainage and storm-worn masonry. Populate real stairs and plazas with correctly
> scaled porters, dock workers, surgeons, scribes, merchants, pilgrims and
> travelers in layered Rosharan clothing, including covered safehands where
> appropriate. Use chipped mineral plaster, crem staining, salt bloom, wet
> basalt, patinated metal, rough timber, woven cloth and restrained stormlight.
> Light the scene with cool highstorm-front daylight and subtle warm windows.
> Avoid European cathedral, Venetian, Tuscan, Ottoman, steampunk, fairy-tale,
> glossy, empty or giant-scaled interpretations. No copied art, logos or
> watermarks.

The generated information-panel activity copy is not authoritative; code-native
copy remains the source of truth. The central visual composition is the
specification.

## Standalone environment target

Output: `public/reference/kharbranth-concept.jpg`.

Prompt:

> Recreate the accepted Kharbranth city as a fresh standalone 16:9 environment
> image with no interface. Preserve the elevated three-quarter harbor-facing
> camera, sea in the lower left, full quay, both enclosing cliffs and complete
> vertical city. Show the same compact painted buildings, continuous Ralinsa,
> cliff-carved hospitals and Palanaeum, ordinary bells, dense markets, ships,
> porters, surgeons, scholars and sailors. Render it as sharp grounded real-time
> game architecture with physically based chipped plaster, salt bloom, wet dark
> stone, patinated bronze, rough wood, ropes and woven cloth under a cool
> highstorm front. No text, panels, map, logos, watermark or direct reproduction
> of any artist.

This clean image is the website's concept/live comparison asset.

## Kharbranth resident target

Output: `docs/concepts/city-fidelity-kharbranth-residents.jpg`.

Prompt:

> Create a coherent near-photoreal real-time game-character lineup of five
> original unnamed Kharbranth residents: a muscular dark-skinned dock porter with
> rope, a brown-skinned woman surgeon in pale practical layered robes with her
> left safehand fully covered, a tan scholarly merchant with ledger and satchel,
> a weathered harbor worker with crate harness, and a visiting Thaylen sailor with
> long white eyebrows and salt-worn clothing. Show every full body head-to-toe in
> separate neutral three-quarter poses at consistent scale under soft overcast
> coastal studio light. Use believable anatomy, varied faces and builds, woven
> fibers, stitched hems, patched fabric, worn leather, salt marks, natural skin,
> hair, scratched wood and aged metal. Avoid named-character likenesses, generic
> medieval cosplay, modern clothes, anime, plastic skin, duplicate faces, armor,
> magic effects, labels, logos and watermarks.

## Production textures

Each texture was generated as a seamless, square, orthographic game material
without baked directional light, text, objects, logos or watermarks.

- `public/textures/kharbranth-plaster-realistic.jpg`: pale neutral
  mineral plaster with fine aggregate, hairline cracks, chipped substrate, rain
  streaks, salt bloom and crem deposits.
- `public/textures/kharbranth-stone-realistic.jpg`: worn dark coastal paving with
  fitted slabs, mineral joints, chips, damp tonal variation and pale deposits.
- `public/textures/rosharan-cloth-realistic.jpg`: desaturated indigo-gray
  handwoven cloth with irregular fibers, repaired stitches, salt wear and sparse
  ochre thread.

These files were generated through built-in ImageGen, then converted to stripped,
web-sized JPEG assets with ImageMagick. They are consumed as albedo and/or fine
bump detail; code-native material color retains cultural variation.

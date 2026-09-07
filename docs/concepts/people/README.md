# People reconstruction references

This pass uses generated design references and a licensed anatomical mesh adapter. It does **not** claim automatic neural image-to-3D conversion. The local Blender bridge had neither Rodin nor Hunyuan3D configured. Blender Studio CC0 male/female anatomy already present in this repository supplies continuous topology; the Three.js adapter adds skinning, fitted clothes, cultural profiles, eyes, hair and carapace.

## Built-in imagegen assets

- `alethi-traveler.png`: original adult Alethi traveler, frontal relaxed A pose, 7.5-head proportions, copper-brown skin, almond eyes, black wavy hair and short beard; indigo standing-collar knee-length coat, double button rows, shoulder strap, belt/pouch, trousers and cuffed boots. Neutral studio background. Used as artistic direction, not a calibrated complete likeness.
- `listener-warform.png`: original broad humanoid listener, red/charcoal/pale marbling, red swept hair and grown brown-red carapace along face, chest, shoulders and limbs, ochre waist wrap. Frontal A pose. Backside construction is inferred.
- `face-atlas-base.png`: local Blender orthographic render of the CC0 male/female heads, with no eyes or hair; the exact input to the generated skin atlas.
- `public/textures/people/face-albedo.png`: imagegen edit of that atlas. Prompt requested exact unchanged silhouettes/landmarks/framing, warm medium-tan skin, fine pores, subtle freckles/lips/eyebrows, bald scalps, dark hollow eye openings and neutral diffuse lighting. The output remains an approximate albedo; soft residual illumination is not claimed to be a calibrated scan.

Projection uses the source orthographic camera: width 0.62m, aspect 1.5, vertical center 1.58m; male center x=-0.155m, female x=+0.155m. Original source coordinates survive regional shaping in a separate UV attribute. Projection fades at the temple, neck and hidden sides; those regions use regional materials. No face image is stretched around the back of the head.

## Regional reference basis

These are representative individuals; cultures are not reduced to one facial type. Male/female bases, deterministic individual variation and clothing profiles retain variety. Interpretations use the project's existing culture definitions plus these references:

- Brandon Sanderson on epicanthic folds and Rosharan appearances: https://wob.coppermind.net/adv_search/?query=epicanthic
- Brandon Sanderson on Thaylen eyebrows: https://wob.coppermind.net/adv_search/?tags=thaylenah
- Author-hosted *The Way of Kings* prologue (Azish appearances): https://www.brandonsanderson.com/blogs/blog/the-way-of-kings-prologue
- Iriali golden skin and hair: https://coppermind.net/wiki/Iriali?mobileaction=toggle_view_desktop
- Listener forms: https://coppermind.net/wiki/Listener

The field guide includes Alethi, Azish, Veden, Thaylen, Shin, Purelaker, Reshi, Iriali, Siah Aimian and singer representatives. Singer workform and warform have different shell coverage. The world uses regional crowd profiles and a mixed Urithiru population. Siah Aimians remain an illustrative guide subject rather than turning the deserted ruins of Akinah into a populated city.

## Hair, tailoring and shell refinement

The follow-up replaces tube hair clumps with overlapping swept ribbons, fiber shading, tapered edges, temple layers, nape locks and braided strands. The scalp fit uses separate male/female crown proportions. Hair stays attached to the existing animated head joint.

Coats now have rolled lapels, a finished standing collar, seams, stitched flat straps, buckles and pocket welts. Lapels and straps fit the actual dressed male/female body. Garments have more room and tension folds around elbows and the waist; hidden trousers are omitted beneath long hems to prevent intersections. Woven detail and cloth sheen are quieter at close range.

Warform shell uses overlapping pointed chest, shoulder, forearm, shin and back plates with physical rims and raised keels. A front/back surface field fits those plates to the selected anatomical body while preserving shell thickness. Skin marbling uses layered, warped pigmentation rather than smooth graphic islands. These are authored approximations, not a scanned creature.

The loaded actor geometry remains under the existing 180,000-triangle regression budget. Pose tests now check every deforming cloth and shell mesh as well as skin. Browser review covers both body types, all people profiles, side/rear orbit, walk/reach/carry poses and five regional cities.

## Current fidelity limit

This is an anatomical and regional-detail iteration. Layered hair, fitted garments and grown shell remain visibly stylized, especially in portrait views. The result remains below the cinematic reference quality; passing runtime tests does not imply photographic likeness.

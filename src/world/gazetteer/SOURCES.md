# Roshar gazetteer sources and placement policy

The data layer preserves all 83 distinct Physical-Realm locations in the
17th Shard Interactive Map's `locations.json` at default-branch commit
`dfbf1c167808f29176a7c01469e8ba957a8b3692` (2026-07-18). The upstream
repository is MIT licensed.

- [17th Shard `locations.json`](https://github.com/17thshard/roshar-map/blob/dfbf1c167808f29176a7c01469e8ba957a8b3692/src/stores/locations.json)
- [17th Shard English locale](https://github.com/17thshard/roshar-map/blob/dfbf1c167808f29176a7c01469e8ba957a8b3692/src/lang/en-US.lang.json)
- [17th Shard repository license](https://github.com/17thshard/roshar-map/blob/dfbf1c167808f29176a7c01469e8ba957a8b3692/LICENSE)
- [Coppermind Roshar category](https://coppermind.net/wiki/Category:Roshar)
- [Coppermind Stormlight Archive places index](https://coppermind.net/wiki/Coppermind:Stormlight_Archive/places)

Each entry also links directly to its relevant Coppermind page. Coppermind is
used to cross-check canonical naming, place type, containing nation or region,
and whether a location can responsibly be placed.

## Coordinate systems

The 17th Shard map stores locations on a logical 1024 × 512 map plane.
`sourceMapPixelToReferencePixel` applies a fixed projective registration into
Stormfather's 1889 × 1144 supplied-reference coordinate system. Principal
destinations explicitly use the already-authored reference pixels from
`src/world/cartography/geography.ts`, so travel, labels, and this gazetteer share
the same point. `referencePixelToWorld` is the sole conversion from those
reference pixels into Stormfather world `[x, z]`.

## Certainty

- `precise`: the cited map has an explicit point for the place.
- `regional`: the source identifies a containing area but not a surveyed local
  point. Country, sea, mountain-range, and supplemental local-feature labels are
  intentionally regional.
- `unknown`: no responsible exterior or regional point is available. These
  entries remain in the catalog but have null coordinates and are never rendered.

This distinction prevents details such as Feverstone Keep or Uvara from being
given invented map pins. It also keeps the Palanaeum and the Silent Gatherers'
hospital unrendered: their containing complex is known, but neither has a
distinct exterior that should masquerade as an independent city marker.

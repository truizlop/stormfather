# Literary place gap audit

This audit adds named Physical-Realm places from published *Stormlight
Archive* prose and official inset maps that were absent from the existing
continental, Shinovar, and city-plan catalogs.

It is a location audit only. It does not use fan art as evidence for a
building, character, or landscape's appearance.

## Result

| Group | Added records |
| --- | ---: |
| Alethi princedoms and Eastern Crownlands | 11 |
| Alethi settlements and named regions | 20 |
| Alethi waters, mountains, and Kholinar interiors | 8 |
| Bavland settlements | 4 |
| Azir, Yulay, Emul, and Yeddaw | 7 |
| Purelake villages and grotto | 5 |
| Shattered Plains and warcamp sites | 8 |
| Urithiru, Kharbranth, and Thaylen City interiors | 8 |
| Jah Keved, Iri, Horneater Peaks, and Shinovar | 7 |
| **Total additions** | **78** |
| Audited but deliberately excluded | 8 |

The full machine-readable list, visualization archetype, containing region,
source, and display anchor is in `literaryPlaces.ts`.

## Placement policy

- `sourceMapPixel` is `null` for every record in this module. None of these
  points was copied from the already-registered 17th Shard continental raster.
- Every addition is marked `certainty: "regional"`.
- A marker may be centered on an identified parent city (for example,
  Urithiru), on a named directional subregion from an official inset (for
  example, northeastern Alethkar), or on its containing country when the text
  gives nothing narrower.
- Co-located markers are intentional. A shared parent anchor means “somewhere
  in this city/region,” not that two canonical places occupy the same point.
- Official-map direction is used only at coarse display resolution. The
  rounded `[x, y]` anchors are useful for label separation but must not be
  presented as surveyed coordinates or border vertices.
- `parentLocationId` is used only when the parent is an actual travel
  destination in `locations.ts`.

This policy is deliberately stricter than the request for “precise” placement:
where the books do not publish precision, the atlas must expose that
uncertainty rather than invent it.

## Primary regional and cartographic evidence

### Alethkar

- [Alethkar](https://coppermind.net/wiki/Alethkar) reproduces Isaac Stewart's
  official Map of Alethkar and identifies all ten princedoms, their directional
  placement, notable settlements, Eastern Crownlands, and major natural
  boundaries.
- [Category: Alethkar](https://coppermind.net/wiki/Category:Alethkar) is the
  completeness cross-check for named Alethi locations.
- Individual geography pages provide the directional evidence used for
  [Aladar](https://coppermind.net/wiki/Aladar_princedom),
  [Bethab](https://coppermind.net/wiki/Bethab_princedom),
  [Hatham](https://coppermind.net/wiki/Hatham_princedom),
  [Kholin](https://coppermind.net/wiki/Kholin_princedom),
  [Roion](https://coppermind.net/wiki/Roion_princedom),
  [Ruthar](https://coppermind.net/wiki/Ruthar_princedom),
  [Sadeas](https://coppermind.net/wiki/Sadeas_princedom),
  [Sebarial](https://coppermind.net/wiki/Sebarial_princedom),
  [Thanadal](https://coppermind.net/wiki/Thanadal_princedom), and
  [Vamah](https://coppermind.net/wiki/Vamah_princedom).
- [Inkwell](https://coppermind.net/wiki/Inkwell_(town)) is only narrowed to
  central Alethkar on the Revolar–Kholinar route.
- [Talinar](https://coppermind.net/wiki/Talinar) is only known to be in
  Alethkar, so it intentionally uses the country anchor.
- [Hornhollow](https://coppermind.net/wiki/Hornhollow) is narrowed to Akanny
  in Sadeas princedom, near Hearthstone.
- [Vedelliar](https://coppermind.net/wiki/Vedelliar) is in southeastern
  Alethkar near Rathalas and the Unclaimed Hills.
- [Rockfall](https://coppermind.net/wiki/Rockfall) and the
  [Fallen Tower](https://coppermind.net/wiki/Fallen_Tower) are only placed at
  Kholinar scale, not at fabricated street coordinates.

### Jah Keved and Bavland

- [Bavland](https://coppermind.net/wiki/Bavland) identifies the region in
  southwestern Jah Keved and names Bornwater, Ironsway, Kneespike, and
  Staplind. Their relative local positions are not registered to the project
  raster, so all four retain one regional anchor.
- The direct pages for [Bornwater](https://coppermind.net/wiki/Bornwater),
  [Ironsway](https://coppermind.net/wiki/Ironsway),
  [Kneespike](https://coppermind.net/wiki/Kneespike), and
  [Staplind](https://coppermind.net/wiki/Staplind) cite the relevant book
  interludes and/or official map.
- [Valam princedom](https://coppermind.net/wiki/Valam_princedom) explicitly
  says its size and position within Jah Keved are unknown. It therefore uses
  the national anchor.
- [Silent Mount](https://coppermind.net/wiki/Silent_Mount) is known to be in
  Jah Keved but has no published continental point.

### Azir, Yulay, Emul, and Tashikk

- [Azir](https://coppermind.net/wiki/Azir) and its official eastern Makabakam
  cartography establish Mazzu in the northwest, Zodruf centrally on the river
  to Azimir, Owd near Emul, and Benru/Berqq on the Yulay border.
- Direct pages: [Mazzu](https://coppermind.net/wiki/Mazzu),
  [Zodruf](https://coppermind.net/wiki/Zodruf),
  [Owd](https://coppermind.net/wiki/Owd),
  [Benru](https://coppermind.net/wiki/Benru), and
  [Berqq](https://coppermind.net/wiki/Berqq).
- [Laqqi](https://coppermind.net/wiki/Laqqi) is in central Emul near the
  northern Azish border.
- The [Grand Indicium](https://coppermind.net/wiki/Grand_Indicium) is in
  Yeddaw; without a registered Yeddaw city plan it uses the city's continental
  anchor and does not claim a local point.

### Purelake

- [Purelake](https://coppermind.net/wiki/Purelake) and
  [Category: Purelake](https://coppermind.net/wiki/Category:Purelake) identify
  Fu Abra, Fu Albast, Fu Moorin, and Fu Ralis in addition to already-cataloged
  Fu Namir.
- [Holy grotto](https://coppermind.net/wiki/Holy_grotto) is only placeable to
  the Purelake as a region.

### Shattered Plains

- [Category: Shattered Plains](https://coppermind.net/wiki/Category:Shattered_Plains)
  is the completeness cross-check.
- [Honor Chasm](https://coppermind.net/wiki/Honor_Chasm) is near the Sadeas
  warcamp.
- [Outer Market](https://coppermind.net/wiki/Outer_Market),
  [Pinnacle](https://coppermind.net/wiki/Pinnacle),
  [Feasting basin](https://coppermind.net/wiki/Feasting_basin),
  [Little Herdaz](https://coppermind.net/wiki/Little_Herdaz), and the
  [Ornery Chull](https://coppermind.net/wiki/Ornery_Chull) are warcamp-scale
  locations.
- [Tower plateau](https://coppermind.net/wiki/Tower_(Roshar)) is shown on
  Isaac Stewart's Shattered Plains map, but that inset has not been registered
  to the continental raster in this module.
- The [Dueling Arena](https://coppermind.net/wiki/Dueling_Arena) is named
  “Pinnacle Dueling Arena” in this catalog so it cannot be confused with the
  already-cataloged Kholinar arena.
- Stormseat is not added again: the core Narak record already carries
  “Stormseat” as an alternate name.

### Urithiru, Kharbranth, and other city interiors

- [Breakaway](https://coppermind.net/wiki/Breakaway), the
  [Ten Rings](https://coppermind.net/wiki/Ten_Rings),
  [All's Alley](https://coppermind.net/wiki/All%27s_Alley), and the
  [Urithiru gem archive](https://coppermind.net/wiki/Urithiru_gem_archive)
  are placed only at Urithiru scale.
- The [Great Concourse of Kharbranth](https://coppermind.net/wiki/Great_Concourse_of_Kharbranth)
  and [Ralinsa](https://coppermind.net/wiki/Ralinsa) are placed only at
  Kharbranth scale.
- The [School of Storms](https://coppermind.net/wiki/School_of_Storms) is
  associated with Palanaeum access and likely nearby; its exact site is not
  confirmed, a limitation preserved in `nationOrRegion`.
- The [Thaylen Gemstone Reserve](https://coppermind.net/wiki/Thaylen_Gemstone_Reserve)
  is placed only at Thaylen City scale.

### Iri, Horneater Peaks, and Shinovar

- [Stormfalls](https://coppermind.net/wiki/Stormfalls) is in Rall Elorim.
- [Horneater Oceans](https://coppermind.net/wiki/Horneater_Oceans) are thermal
  lakes atop the Horneater Peaks.
- [Valley of Truth](https://coppermind.net/wiki/Valley_of_Truth) is in coastal
  Shinovar.
- [Nirovah Valley](https://coppermind.net/wiki/Nirovah_Valley) and
  [Dison's Valley](https://coppermind.net/wiki/Dison%27s_Valley) are only
  narrowed to southeastern Shinovar. They do not overwrite the more exact
  registered Shinovar inset points in `shinovar.ts`.

## Deliberate exclusions

Eight audited names remain out of the placeable layer:

- Abamabar: no responsible modern containing region is known.
- Feverstone Keep, Uvara, and Puuli's lighthouse: already preserved as
  unplaceable core records.
- Haka'alaku, Number City, and Riino's lighthouse: Shadesmar locations, outside
  the Physical-Realm map.
- Stormseat: already represented as an alternate name of Narak.

These exclusions are machine-readable in `literaryPlaceExclusions`, including
their direct evidence and reason.

## Integration

This audit intentionally does not edit the live catalog or rendering scene.
The owner can integrate it with:

```ts
import { literaryPlaceGazetteer } from "./literaryPlaces";

export const rosharGazetteer = [
  // existing entries
  ...literaryPlaceGazetteer,
];
```

`literaryPlaceGazetteer` and `literaryPlaceExclusions` should also be exported
from `src/world/gazetteer/index.ts`.

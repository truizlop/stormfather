import {
  aimiaOutline,
  inlandWaterPolygons,
  islandPolygons,
  mainlandOutline,
  referenceMapSize,
  referenceWorldOrigin,
  worldUnitsPerReferencePixel,
  type GeographyPoint,
} from "./geography.generated";

export {
  aimiaOutline,
  inlandWaterPolygons,
  islandPolygons,
  mainlandOutline,
  referenceMapSize,
  type GeographyPoint,
};

export const ROSHAR_MAP_BOUNDS = {
  minX: -62,
  maxX: 59,
  minZ: -32,
  maxZ: 31,
} as const;

export function referencePixelToWorld(
  pixel: readonly [number, number],
): GeographyPoint {
  return [
    (pixel[0] - referenceWorldOrigin[0]) * worldUnitsPerReferencePixel,
    (pixel[1] - referenceWorldOrigin[1]) * worldUnitsPerReferencePixel,
  ];
}

function referencePath(
  pixels: readonly (readonly [number, number])[],
): readonly GeographyPoint[] {
  return pixels.map(referencePixelToWorld);
}

/**
 * Major destination anchors read from the supplied reference. Consumers should
 * use these positions rather than maintaining their own approximations.
 */
export const destinationAnchors = {
  roshar: referencePixelToWorld([1045, 641]),
  alethkar: referencePixelToWorld([1480, 600]),
  azir: referencePixelToWorld([620, 680]),
  "shattered-plains": referencePixelToWorld([1575, 815]),
  urithiru: referencePixelToWorld([830, 700]),
  shinovar: referencePixelToWorld([335, 560]),
  "jah-keved": referencePixelToWorld([1170, 535]),
  purelake: referencePixelToWorld([800, 540]),
  aimia: referencePixelToWorld([95, 685]),
  kharbranth: referencePixelToWorld([1105, 885]),
  kholinar: referencePixelToWorld([1405, 540]),
  "thaylen-city": referencePixelToWorld([1090, 970]),
} as const;

export interface MountainRidge {
  id: string;
  points: readonly GeographyPoint[];
  elevation: number;
  width: number;
  crags: number;
}

/**
 * Ridge centerlines follow the dominant mountain systems visible in the supplied
 * reference. The terrain sampler turns each line into continuous relief.
 */
export const mountainRidges: readonly MountainRidge[] = [
  {
    id: "aimian-spine",
    points: referencePath([
      [18, 640],
      [70, 670],
      [130, 720],
      [190, 730],
    ]),
    elevation: 2.4,
    width: 3.3,
    crags: 0.82,
  },
  {
    id: "iri-highlands",
    points: referencePath([
      [450, 175],
      [495, 230],
      [520, 310],
      [490, 390],
      [465, 465],
    ]),
    elevation: 4.6,
    width: 4.8,
    crags: 0.92,
  },
  {
    id: "misted-mountains",
    points: referencePath([
      [348, 355],
      [382, 455],
      [405, 560],
      [425, 660],
      [455, 765],
    ]),
    elevation: 5.8,
    width: 3.9,
    crags: 1,
  },
  {
    id: "azish-crescent",
    points: referencePath([
      [430, 600],
      [520, 640],
      [625, 650],
      [725, 690],
      [835, 725],
      [940, 720],
    ]),
    elevation: 4.2,
    width: 5.2,
    crags: 0.8,
  },
  {
    id: "central-southern-fold",
    points: referencePath([
      [700, 790],
      [800, 750],
      [900, 700],
      [1010, 735],
      [1110, 800],
    ]),
    elevation: 4.7,
    width: 4.9,
    crags: 0.9,
  },
  {
    id: "horneater-peaks",
    points: referencePath([
      [1040, 690],
      [1090, 620],
      [1145, 545],
      [1200, 505],
      [1265, 545],
      [1325, 615],
    ]),
    elevation: 6.4,
    width: 4.1,
    crags: 1,
  },
  {
    id: "jah-keved-ranges",
    points: referencePath([
      [1000, 430],
      [1110, 405],
      [1215, 390],
      [1320, 410],
      [1410, 455],
    ]),
    elevation: 3.8,
    width: 5.4,
    crags: 0.76,
  },
  {
    id: "unclaimed-hills",
    points: referencePath([
      [1500, 415],
      [1550, 500],
      [1600, 590],
      [1660, 680],
      [1710, 790],
    ]),
    elevation: 5.2,
    width: 4.6,
    crags: 0.96,
  },
  {
    id: "frostlands-rim",
    points: referencePath([
      [1270, 875],
      [1390, 850],
      [1500, 850],
      [1620, 900],
    ]),
    elevation: 2.8,
    width: 4.7,
    crags: 0.7,
  },
] as const;

export interface RiverPath {
  id: string;
  points: readonly GeographyPoint[];
  width: number;
}

/**
 * Major drainage corridors visible at the source map's scale. Small tributaries
 * are added procedurally around these authored trunks.
 */
export const riverPaths: readonly RiverPath[] = [
  {
    id: "shinovar-north",
    points: referencePath([
      [350, 430],
      [355, 520],
      [330, 610],
      [335, 700],
    ]),
    width: 0.16,
  },
  {
    id: "shinovar-south",
    points: referencePath([
      [430, 525],
      [450, 620],
      [430, 710],
      [390, 790],
    ]),
    width: 0.18,
  },
  {
    id: "babatharnam",
    points: referencePath([
      [570, 440],
      [610, 485],
      [650, 520],
      [675, 550],
    ]),
    width: 0.13,
  },
  {
    id: "purelake-outflow",
    points: referencePath([
      [925, 555],
      [965, 600],
      [990, 665],
      [1040, 735],
      [1085, 800],
    ]),
    width: 0.2,
  },
  {
    id: "azir-south",
    points: referencePath([
      [720, 650],
      [700, 720],
      [650, 780],
      [600, 830],
    ]),
    width: 0.14,
  },
  {
    id: "veden-west",
    points: referencePath([
      [1110, 400],
      [1140, 485],
      [1130, 580],
      [1100, 680],
      [1070, 760],
    ]),
    width: 0.18,
  },
  {
    id: "veden-east",
    points: referencePath([
      [1245, 390],
      [1250, 490],
      [1280, 590],
      [1300, 690],
      [1260, 780],
    ]),
    width: 0.19,
  },
  {
    id: "alethkar-north",
    points: referencePath([
      [1400, 370],
      [1420, 470],
      [1400, 575],
      [1360, 680],
      [1330, 760],
    ]),
    width: 0.16,
  },
  {
    id: "alethkar-central",
    points: referencePath([
      [1510, 440],
      [1520, 535],
      [1490, 625],
      [1450, 710],
      [1420, 790],
    ]),
    width: 0.17,
  },
  {
    id: "stormward-delta",
    points: referencePath([
      [1640, 560],
      [1600, 640],
      [1580, 715],
      [1540, 770],
      [1460, 820],
    ]),
    width: 0.22,
  },
] as const;

export const countryLabelAnchors = {
  shinovar: referencePixelToWorld([330, 575]),
  iri: referencePixelToWorld([505, 350]),
  azir: referencePixelToWorld([635, 690]),
  tashikk: referencePixelToWorld([620, 805]),
  tukar: referencePixelToWorld([650, 900]),
  emul: referencePixelToWorld([750, 760]),
  "tu-bayla": referencePixelToWorld([1010, 555]),
  "jah-keved": referencePixelToWorld([1180, 525]),
  alethkar: referencePixelToWorld([1465, 600]),
  herdaz: referencePixelToWorld([1360, 360]),
  thaylenah: referencePixelToWorld([1150, 1000]),
  frostlands: referencePixelToWorld([1410, 885]),
} as const;

export function polygonBounds(points: readonly GeographyPoint[]) {
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

export function pointInPolygon(
  point: GeographyPoint,
  polygon: readonly GeographyPoint[],
) {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current++
  ) {
    const [currentX, currentZ] = polygon[current];
    const [previousX, previousZ] = polygon[previous];
    if (
      currentZ > point[1] !== previousZ > point[1] &&
      point[0] <
        ((previousX - currentX) * (point[1] - currentZ)) /
          (previousZ - currentZ) +
          currentX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

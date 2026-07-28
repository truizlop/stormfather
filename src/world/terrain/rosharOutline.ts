import { referencePixelToWorld } from "../cartography/geography";

export { mainlandOutline as rosharOutline } from "../cartography/geography";

function roadFromReference(
  pixels: readonly (readonly [number, number])[],
) {
  return pixels.map(referencePixelToWorld);
}

export const majorRoads = [
  roadFromReference([
    [360, 590],
    [520, 650],
    [635, 690],
    [830, 700],
    [1040, 625],
    [1170, 535],
    [1405, 540],
  ]),
  roadFromReference([
    [520, 390],
    [620, 440],
    [800, 540],
    [980, 520],
    [1170, 535],
  ]),
  roadFromReference([
    [635, 690],
    [760, 770],
    [900, 835],
    [1105, 885],
    [1090, 970],
  ]),
  roadFromReference([
    [1405, 540],
    [1480, 600],
    [1530, 700],
    [1575, 815],
  ]),
] as const;

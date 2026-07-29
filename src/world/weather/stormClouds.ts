export type StormCloudBand = "core" | "shelf" | "ground";

export interface StormCloudLobe {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotation: number;
  shade: number;
}

function hash01(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

/**
 * Deterministic, low-discrepancy cloud volume. Lobes overlap far enough that
 * the leading edge reads as one many-kilometre mass rather than a bead chain.
 */
export function createStormCloudLobes(
  count: number,
  band: StormCloudBand,
): readonly StormCloudLobe[] {
  const salt = band === "core" ? 5 : band === "shelf" ? 17 : 29;
  return Array.from({ length: count }, (_, index) => {
    const column = index % 18;
    const row = Math.floor(index / 18);
    const u = (column + hash01(index, salt) * 0.86) / 18;
    const v =
      (row + hash01(index, salt + 5) * 0.82) /
      Math.max(1, Math.ceil(count / 18));
    const z = -38 + u * 76;

    if (band === "ground") {
      const scale = 0.9 + hash01(index, salt + 23) * 1.45;
      return {
        x: -2.6 + hash01(index, salt + 11) * 5.8,
        y: 0.45 + v * 3.4,
        z,
        scaleX: scale * 1.55,
        scaleY: scale * 0.68,
        scaleZ: scale * 1.3,
        rotation: hash01(index, salt + 31) * Math.PI,
        shade: hash01(index, salt + 41),
      };
    }

    const shelf = band === "shelf";
    const baseScale =
      (shelf ? 1.15 : 1.35) +
      hash01(index, salt + 23) * (shelf ? 1.65 : 1.95);
    const height = shelf ? 5.3 + v * 11.8 : 2 + v * 22;
    return {
      x:
        (shelf ? 0.8 : -0.7) +
        (hash01(index, salt + 11) - 0.5) * (shelf ? 5.4 : 8.2),
      y: height,
      z,
      scaleX: baseScale * (shelf ? 1.35 : 1.15),
      scaleY: baseScale * (0.82 + hash01(index, salt + 13) * 0.56),
      scaleZ: baseScale * (1.25 + hash01(index, salt + 19) * 0.45),
      rotation: hash01(index, salt + 31) * Math.PI,
      shade: hash01(index, salt + 41),
    };
  });
}

export function stormWallOpacity(localX: number) {
  const core = Math.max(0, 1 - Math.abs(localX + 0.8) / 6.4);
  return 0.58 + core * 0.4;
}

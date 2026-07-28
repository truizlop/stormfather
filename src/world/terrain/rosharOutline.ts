export const rosharOutline = [
  [-43, -10],
  [-38, -15],
  [-29, -20],
  [-18, -18],
  [-9, -21],
  [1, -18],
  [10, -19],
  [20, -16],
  [31, -17],
  [40, -13],
  [46, -7],
  [44, -2],
  [49, 4],
  [46, 10],
  [42, 12],
  [43, 18],
  [36, 22],
  [27, 24],
  [19, 26],
  [11, 24],
  [2, 25],
  [-6, 23],
  [-15, 22],
  [-23, 19],
  [-31, 16],
  [-38, 13],
  [-41, 8],
  [-45, 4],
  [-43, -2],
  [-47, -6],
] as const;

export const shinovarOutline = [
  [-43, -9],
  [-37, -13],
  [-30, -14],
  [-26, -9],
  [-27, -1],
  [-29, 8],
  [-34, 14],
  [-40, 12],
  [-43, 7],
  [-42, 1],
] as const;

export const majorRoads = [
  [
    [-34, 2],
    [-22, 5],
    [-11, 7],
    [-2, 4],
    [10, -1],
    [29, -2],
    [39, 8],
  ],
  [
    [-11, 7],
    [-4, 12],
    [8, 17],
    [23, 17],
  ],
  [
    [10, -1],
    [17, 8],
    [19, 23],
  ],
] as const;

export const mountainChains = [
  // Misted Mountains, sheltering Shinovar.
  ...Array.from({ length: 18 }, (_, index) => ({
    x: -27 + Math.sin(index * 1.3) * 1.2,
    z: -10 + index * 1.15,
    scale: 0.75 + (index % 4) * 0.18,
  })),
  // Horneater Peaks and the central Rosharan spine.
  ...Array.from({ length: 24 }, (_, index) => ({
    x: -5 + index * 0.9,
    z: 0.5 + Math.sin(index * 0.72) * 2.3,
    scale: 0.7 + ((index * 5) % 7) * 0.13,
  })),
  // Unclaimed Hills, facing the Origin.
  ...Array.from({ length: 16 }, (_, index) => ({
    x: 35 + Math.sin(index * 0.64) * 2.5,
    z: -8 + index * 1.25,
    scale: 0.58 + (index % 5) * 0.12,
  })),
] as const;

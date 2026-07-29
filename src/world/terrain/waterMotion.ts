export function sampleOceanWaveHeight(
  x: number,
  z: number,
  time: number,
  stormStrength = 0,
  quality = 1,
) {
  const broad =
    Math.sin(x * 0.19 + z * 0.035 + time * 0.58) * 0.13 +
    Math.sin(z * 0.27 - x * 0.055 - time * 0.43) * 0.095;
  const crossing =
    Math.sin((x * 0.72 + z * 0.31) + time * 1.07) * 0.038 +
    Math.sin((-x * 0.41 + z * 0.89) - time * 0.91) * 0.026;
  const swell =
    Math.sin(Math.hypot(x * 0.7, z * 0.48) * 0.22 - time * 0.34) * 0.055;
  const amplitude = 1 + Math.max(0, Math.min(1, stormStrength)) * 1.75;

  return (broad + crossing * quality + swell * 0.72) * amplitude;
}

export function harborWaveHeight(
  x: number,
  z: number,
  time: number,
  stormStrength = 0,
) {
  const shelter = 0.42 + Math.max(0, Math.min(1, stormStrength)) * 0.58;
  return (
    (Math.sin(x * 2.1 + time * 1.15) * 0.028 +
      Math.sin(z * 2.8 - time * 0.86) * 0.021 +
      Math.sin((x + z) * 4.4 + time * 1.83) * 0.008) *
    shelter
  );
}

export function shorelineFoamPulse(seed: number, time: number) {
  return 0.5 + Math.sin(time * 1.35 + seed * 7.31) * 0.5;
}

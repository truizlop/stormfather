export type StormParticleBand = "rain" | "spray" | "debris";

export type StormParticleField = {
  positions: Float32Array;
  seeds: Float32Array;
  sizes: Float32Array;
};

function hash01(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export function createStormParticleField(
  count: number,
  band: StormParticleBand,
): StormParticleField {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const salt = band === "rain" ? 1 : band === "spray" ? 2 : 3;

  for (let index = 0; index < count; index += 1) {
    const u = hash01(index, salt);
    const v = hash01(index, salt + 7);
    const w = hash01(index, salt + 19);
    positions[index * 3] =
      band === "debris" ? -5.5 + u * 11 : -6.5 + u * 13;
    positions[index * 3 + 1] =
      band === "spray" ? 0.2 + v * 7.5 : 0.4 + v * 23;
    positions[index * 3 + 2] = -36 + w * 72;
    seeds[index] = hash01(index, salt + 41);
    sizes[index] =
      band === "rain"
        ? 0.55 + hash01(index, salt + 53) * 0.75
        : band === "spray"
          ? 1.2 + hash01(index, salt + 53) * 2.4
          : 1.1 + hash01(index, salt + 53) * 2.1;
  }

  return { positions, seeds, sizes };
}

export function lightningIntensity(time: number) {
  const cycle = ((time % 13.7) + 13.7) % 13.7;
  const first = Math.max(0, 1 - Math.abs(cycle - 2.18) / 0.045);
  const returnStroke = Math.max(0, 1 - Math.abs(cycle - 2.34) / 0.025);
  const distant = Math.max(0, 1 - Math.abs(cycle - 8.92) / 0.07) * 0.58;
  return Math.min(1, first + returnStroke * 0.86 + distant);
}

import { stat } from "node:fs/promises";
import { resolve } from "node:path";

const modelPath = resolve("public/models/roshar-landmarks.glb");

try {
  const model = await stat(modelPath);
  if (model.size < 1024) {
    throw new Error(`Landmark GLB is unexpectedly small: ${model.size} bytes`);
  }
  console.log(`✓ Roshar landmark kit: ${(model.size / 1024).toFixed(1)} KiB`);
} catch (error) {
  console.error(`✗ Missing or invalid landmark kit at ${modelPath}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

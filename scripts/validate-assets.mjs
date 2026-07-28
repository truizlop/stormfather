import { open, stat } from "node:fs/promises";
import { resolve } from "node:path";

const modelPath = resolve("public/models/roshar-landmarks.glb");
const expectedRoots = [
  "Landmark_Urithiru",
  "Landmark_Kharbranth",
  "Landmark_Kholinar",
  "Landmark_Azimir",
  "Landmark_Purelake",
  "Landmark_Shinovar",
  "Landmark_Akinah",
  "Landmark_Shattered_Plains",
  "Landmark_Oathgate",
  "Actor_Alethi",
  "Actor_Azish",
  "Actor_Shin",
  "Actor_Singer",
  "Actor_Thaylen",
  "Actor_Purelaker",
];

try {
  const model = await stat(modelPath);
  if (model.size < 1024) {
    throw new Error(`Landmark GLB is unexpectedly small: ${model.size} bytes`);
  }

  const file = await open(modelPath, "r");
  const header = Buffer.alloc(20);
  await file.read(header, 0, header.length, 0);
  const magic = header.toString("utf8", 0, 4);
  const jsonLength = header.readUInt32LE(12);
  const jsonType = header.toString("utf8", 16, 20);
  if (magic !== "glTF" || jsonType !== "JSON") {
    throw new Error("Asset is not a valid binary glTF file");
  }
  const jsonBuffer = Buffer.alloc(jsonLength);
  await file.read(jsonBuffer, 0, jsonLength, 20);
  await file.close();
  const gltf = JSON.parse(jsonBuffer.toString("utf8").trim());
  const names = new Set(gltf.nodes?.map((node) => node.name).filter(Boolean));
  const missing = expectedRoots.filter((name) => !names.has(name));
  if (missing.length) {
    throw new Error(`Missing authored roots: ${missing.join(", ")}`);
  }

  console.log(`✓ Roshar landmark kit: ${(model.size / 1024).toFixed(1)} KiB`);
  console.log(`✓ ${expectedRoots.length} expected landmark and actor roots`);
} catch (error) {
  console.error(`✗ Missing or invalid landmark kit at ${modelPath}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

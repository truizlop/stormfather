import { open, readFile, readdir, stat } from "node:fs/promises";
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
  "Actor_Veden",
  "Actor_Aimian",
  "Actor_Reshi",
  "Actor_Kharbranth_Porter",
  "Actor_Kharbranth_Surgeon",
  "Actor_Kharbranth_Scholar",
  "Actor_Kharbranth_Dockworker",
  "Actor_Kharbranth_Thaylen_Sailor",
  "Actor_Kharbranth_Porter_HD",
  "Actor_Kharbranth_Surgeon_HD",
  "Actor_Kharbranth_Scholar_HD",
  "Actor_Kharbranth_Dockworker_HD",
  "Actor_Kharbranth_Thaylen_Sailor_HD",
  "Module_Storm_Awning",
  "Module_Stone_Arch",
  "Module_Market_Stall",
  "Module_Dock_Crane",
  "Module_Rope_Bridge",
  "Prop_Bridge_Run",
  "Module_Terraced_House",
  "Module_Windbreak_House",
  "Module_Azish_Arcade",
  "Module_Shin_Farmstead",
  "Module_Purelake_Jetty",
  "Module_Warcamp_Scaffold",
  "Module_Aimian_Ruin",
  "Module_Urithiru_Gallery",
  "Module_Thaylen_Warehouse",
  "Prop_Chull_Caravan",
];
const expectedTextures = [
  "crem-stone-albedo.jpg",
  "shinovar-grass-albedo.jpg",
  "highstorm-density.jpg",
  "shattered-paving-albedo.jpg",
  "kharbranth-plaster-albedo.jpg",
  "rosharan-cloth-albedo.jpg",
  "purelake-caustics.jpg",
  "roshar-crem-macro.jpg",
  "kharbranth-plaster-realistic.jpg",
  "kharbranth-plaster-subtle.jpg",
  "kharbranth-facade-realistic.jpg",
  "kharbranth-stone-realistic.jpg",
  "rosharan-cloth-realistic.jpg",
  "rosharan-skin-microdetail.png",
];
const forbiddenRuntimeTokens = [
  "FidelityComparison",
  "KharbranthVistaLOD",
  "kharbranth-vista-depth.png",
  "kharbranth-residents-depth.png",
  "reference/kharbranth-concept.jpg",
  "reference/kharbranth-residents.jpg",
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
  for (const textureName of expectedTextures) {
    const texture = await stat(resolve("public/textures", textureName));
    if (texture.size < 16 * 1024) {
      throw new Error(
        `Texture ${textureName} is unexpectedly small: ${texture.size} bytes`,
      );
    }
  }
  console.log(`✓ ${expectedTextures.length} generated runtime textures`);

  const sourceFiles = (await readdir(resolve("src"), { recursive: true }))
    .filter((fileName) => /\.(css|ts|tsx)$/.test(fileName));
  for (const fileName of sourceFiles) {
    const source = await readFile(resolve("src", fileName), "utf8");
    const forbidden = forbiddenRuntimeTokens.find((token) =>
      source.includes(token),
    );
    if (forbidden) {
      throw new Error(
        `Runtime source ${fileName} contains rejected image-relief token ${forbidden}`,
      );
    }
  }
  console.log("✓ Runtime contains no full-scene image relief or comparison path");
} catch (error) {
  console.error(`✗ Missing or invalid landmark kit at ${modelPath}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

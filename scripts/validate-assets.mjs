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
  "Landmark_ThaylenCity",
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
const expectedCityTextures = [
  "akinah-salt-ruin-stone-atlas.jpg",
  "alethi-kholinar-stormstone-timber-atlas.jpg",
  "azimir-ochre-inlay-atlas.jpg",
  "purelake-stone-reed-stiltwood-atlas.jpg",
  "shattered-plains-crem-fracture-atlas.jpg",
  "shinovar-earthen-thatch-atlas.jpg",
  "thaylen-coastal-masonry-tile-dockwood-atlas.jpg",
  "urithiru-striated-stone-atlas.jpg",
];
const forbiddenRuntimeTokens = [
  "FidelityComparison",
  "KharbranthVistaLOD",
  "kharbranth-vista-depth.png",
  "kharbranth-residents-depth.png",
  "reference/kharbranth-concept.jpg",
  "reference/kharbranth-residents.jpg",
];
const expectedKharbranthGeometry = [
  "Kharbranth_FacadeAtlas_Batch_01",
  "Kharbranth_Retaining_FrameBatch",
  "Kharbranth_CliffWard_FacadeAtlasBatch",
  "Kharbranth_Civic_LoggiaBatch",
  "Kharbranth_Harbor_RopeworkBatch",
];
const expectedUrithiruOathgates = [
  ["Panatham", "Panatham"],
  ["Rall_Elorim", "Rall Elorim"],
  ["Shinovar", "Shinovar"],
  ["Akinah", "Akinah"],
  ["Azimir", "Azimir"],
  ["Thaylen_City", "Thaylen City"],
  ["Narak", "Narak"],
  ["Kholinar", "Kholinar"],
  ["Vedenar", "Vedenar"],
  ["Kurth", "Kurth"],
];
const expectedModeledCities = [
  {
    name: "Urithiru",
    prefix: "Urithiru_",
    minimumNodes: 285,
    required: [
      "Urithiru_East_Window_01_01",
      "Urithiru_Monumental_East_Portal",
      "Urithiru_Mountain_Embedded_Backbone",
      "Urithiru_MountainCut_CeremonialApron",
      "Urithiru_GrandTerrace_10",
      "Urithiru_RadiantLightwell_10",
      "Urithiru_Crown_Rotunda",
      "Urithiru_Crown_UpperRotunda",
      "Urithiru_Crown_RadiantLantern",
      "Urithiru_Oathgate_Forecourt_BridgeFoundation",
      "Urithiru_Oathgate_Forecourt_TerrainSkirt",
      "Urithiru_Oathgate_Approach_Panatham",
      "Urithiru_Oathgate_Approach_Kholinar",
      "Urithiru_Oathgate_PortalRing_Panatham",
      "Urithiru_Oathgate_PortalRing_Kholinar",
    ],
  },
  {
    name: "Kholinar",
    prefix: "Kholinar_",
    minimumNodes: 185,
    required: [
      "Kholinar_EasternWard_01_Building",
      "Kholinar_CityGate_01_GateLintel",
      "Kholinar_Palace_MainGallery",
      "Kholinar_Temple_01_Jezerezeh_Dais",
      "Kholinar_ImpossibleFalls_Water",
    ],
  },
  {
    name: "Azimir",
    prefix: "Azimir_",
    minimumNodes: 105,
    required: [
      "Azimir_ClerkQuarter_01_Building",
      "Azimir_BronzePalace_Building",
      "Azimir_GrandMarket_Piazza",
      "Azimir_Hospital_Building",
      "Azimir_WatchpostTower",
      "Azimir_PathOfTheThunderclast",
    ],
  },
  {
    name: "Purelake",
    prefix: "Purelake_",
    minimumNodes: 125,
    required: ["Purelake_Hut_0_Door"],
  },
  {
    name: "Shinovar",
    prefix: "Shinovar_",
    minimumNodes: 105,
    required: ["Shinovar_FarmHome_01_Building"],
  },
  {
    name: "Akinah",
    prefix: "Akinah_",
    minimumNodes: 155,
    required: ["Akinah_RuinQuarter_1_02_Building"],
  },
  {
    name: "Thaylen City",
    prefix: "ThaylenCity_",
    minimumNodes: 300,
    required: [
      "ThaylenCity_MerchantQuarter_1_01_Building",
      "ThaylenCity_Dock_1_Plank_01",
    ],
  },
  {
    name: "Shattered Plains and Stormseat",
    prefix: "Stormseat_",
    minimumNodes: 42,
    required: ["Stormseat_RuinBuilding_01_Building"],
  },
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
  const nodeIndexByName = new Map(
    gltf.nodes?.map((node, index) => [node.name, index]).filter(([name]) => name),
  );
  const urithiruIndex = nodeIndexByName.get("Landmark_Urithiru");
  const destinationCityRoots = [
    "Landmark_Kharbranth",
    "Landmark_Kholinar",
    "Landmark_Azimir",
    "Landmark_Purelake",
    "Landmark_Shinovar",
    "Landmark_Akinah",
    "Landmark_ThaylenCity",
    "Landmark_Shattered_Plains",
  ];
  const descendantIndexes = new Set();
  const pendingChildren =
    urithiruIndex === undefined
      ? []
      : [...(gltf.nodes[urithiruIndex]?.children ?? [])];
  while (pendingChildren.length) {
    const childIndex = pendingChildren.pop();
    if (childIndex === undefined || descendantIndexes.has(childIndex)) continue;
    descendantIndexes.add(childIndex);
    pendingChildren.push(...(gltf.nodes[childIndex]?.children ?? []));
  }
  const misplacedDestinationCities = destinationCityRoots.filter((rootName) => {
    const rootIndex = nodeIndexByName.get(rootName);
    return rootIndex !== undefined && descendantIndexes.has(rootIndex);
  });
  if (misplacedDestinationCities.length) {
    throw new Error(
      `Urithiru contains destination cities instead of local Oathgates: ${misplacedDestinationCities.join(", ")}`,
    );
  }
  console.log("✓ Urithiru Oathgates do not contain destination-city geometry");
  const modeledUrithiruOathgates = [...names].filter((name) =>
    name.startsWith("Urithiru_Oathgate_Approach_"),
  );
  if (modeledUrithiruOathgates.length !== expectedUrithiruOathgates.length) {
    throw new Error(
      `Urithiru must contain exactly ten local Oathgate portals, found ${modeledUrithiruOathgates.length}`,
    );
  }
  for (const [gateSlug, gateLabel] of expectedUrithiruOathgates) {
    const nodeName = `Urithiru_Oathgate_Approach_${gateSlug}`;
    const nodeIndex = nodeIndexByName.get(nodeName);
    const extras =
      nodeIndex === undefined ? undefined : gltf.nodes[nodeIndex]?.extras;
    if (
      extras?.oathgate_destination !== gateLabel ||
      extras?.structure_type !== "local_oathgate_portal" ||
      extras?.contains_destination_geometry !== false
    ) {
      throw new Error(
        `${nodeName} is missing its local-portal destination metadata`,
      );
    }
  }
  console.log("✓ Ten named Urithiru Oathgates export as local portals");
  const missingKharbranthGeometry = expectedKharbranthGeometry.filter(
    (name) => !names.has(name),
  );
  if (missingKharbranthGeometry.length) {
    throw new Error(
      `Missing modeled Kharbranth systems: ${missingKharbranthGeometry.join(", ")}`,
    );
  }
  const kharbranthNodeCount = [...names].filter((name) =>
    name.startsWith("Kharbranth_"),
  ).length;
  if (kharbranthNodeCount < 330) {
    throw new Error(
      `Kharbranth geometry is unexpectedly sparse: ${kharbranthNodeCount} named nodes`,
    );
  }
  for (const city of expectedModeledCities) {
    const missingCitySystems = city.required.filter(
      (requiredName) => !names.has(requiredName),
    );
    if (missingCitySystems.length) {
      throw new Error(
        `${city.name} is missing required modeled systems ${missingCitySystems.join(", ")}`,
      );
    }
    const cityNodeCount = [...names].filter((name) =>
      name.startsWith(city.prefix),
    ).length;
    if (cityNodeCount < city.minimumNodes) {
      throw new Error(
        `${city.name} is unexpectedly sparse: ${cityNodeCount} named nodes`,
      );
    }
    console.log(`✓ ${cityNodeCount} modeled ${city.name} nodes`);
  }

  console.log(`✓ Roshar landmark kit: ${(model.size / 1024).toFixed(1)} KiB`);
  console.log(`✓ ${expectedRoots.length} expected landmark and actor roots`);
  console.log(`✓ ${kharbranthNodeCount} modeled Kharbranth nodes`);
  for (const textureName of expectedTextures) {
    const texture = await stat(resolve("public/textures", textureName));
    if (texture.size < 16 * 1024) {
      throw new Error(
        `Texture ${textureName} is unexpectedly small: ${texture.size} bytes`,
      );
    }
  }
  console.log(`✓ ${expectedTextures.length} generated runtime textures`);
  for (const textureName of expectedCityTextures) {
    const texture = await stat(
      resolve("public/textures/cities", textureName),
    );
    if (texture.size < 64 * 1024) {
      throw new Error(
        `City texture ${textureName} is unexpectedly small: ${texture.size} bytes`,
      );
    }
  }
  const cityManifest = JSON.parse(
    await readFile(resolve("public/textures/cities/manifest.json"), "utf8"),
  );
  if (cityManifest.assets?.length !== expectedCityTextures.length) {
    throw new Error(
      `City texture manifest has ${cityManifest.assets?.length ?? 0} entries; expected ${expectedCityTextures.length}`,
    );
  }
  console.log(`✓ ${expectedCityTextures.length} city-specific material atlases`);

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

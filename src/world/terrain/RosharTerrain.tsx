import { Line, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import {
  ROSHAR_MAP_BOUNDS,
  aimiaOutline,
  inlandWaterPolygons,
  islandPolygons,
  mainlandOutline,
  type GeographyPoint,
} from "../cartography/geography";
import { isCompactViewport } from "../compactViewport";
import { locations } from "../locations";
import {
  createRiverBankGeometry,
  createRiverSurfaceGeometry,
  riverDepressionAt,
} from "./riverChannels";
import { majorRoads } from "./rosharOutline";
import { terrainColorAt } from "./terrainColor";
import { terrainHeightAt } from "./terrainHeight";
import { WaterSystem } from "./WaterSystem";
import {
  detailedLocationSurface,
  type DetailedLocationId,
} from "./locationSurface";
import {
  SHATTERED_PLAINS_PATCH,
} from "./shatteredPlainsTopology";
import {
  createShatteredPlainsCapGeometry,
  createShatteredPlainsFloorGeometry,
  createShatteredPlainsWallGeometry,
  SHATTERED_PLAINS_HANDOFF_PROGRESS,
  shatteredPlainsBoundaryScale,
} from "./shatteredPlainsTerrainPatch";
import {
  showCartographicLinework,
  terrainMeshSegments,
} from "./terrainMeshLod";
import { THAYLEN_CITY_TERRAIN_PATCH } from "./thaylenTerrainPatch";

const landPolygons: readonly (readonly GeographyPoint[])[] = [
  mainlandOutline,
  aimiaOutline,
  ...islandPolygons.map((island) => island.points),
];

const mapWidth = ROSHAR_MAP_BOUNDS.maxX - ROSHAR_MAP_BOUNDS.minX;
const mapDepth = ROSHAR_MAP_BOUNDS.maxZ - ROSHAR_MAP_BOUNDS.minZ;
const mapCenterX = (ROSHAR_MAP_BOUNDS.minX + ROSHAR_MAP_BOUNDS.maxX) / 2;
const mapCenterZ = (ROSHAR_MAP_BOUNDS.minZ + ROSHAR_MAP_BOUNDS.maxZ) / 2;

const riverVertexShader = `
  attribute float aProgress;
  varying vec2 vUv;
  varying float vProgress;

  void main() {
    vUv = uv;
    vProgress = aProgress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const riverFragmentShader = `
  uniform float uTime;
  uniform float uNight;
  varying vec2 vUv;
  varying float vProgress;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  void main() {
    float across = abs(vUv.x * 2.0 - 1.0);
    float downstream = vUv.y - uTime * 0.72;
    float braidA = sin(downstream * 9.2 + sin(vUv.x * 8.0) * 1.6);
    float braidB = sin(downstream * 15.8 - vUv.x * 11.0 + uTime * 0.34);
    float glint = smoothstep(0.79, 0.99, braidA * 0.5 + braidB * 0.24 + 0.48);
    float granular = hash21(floor(vec2(vUv.x * 19.0, downstream * 5.0)));
    float edgeFoam = smoothstep(0.86, 0.995, across) *
      smoothstep(0.46, 0.88, braidB * 0.5 + 0.5);
    float estuaryFoam = smoothstep(0.78, 1.0, vProgress) *
      smoothstep(0.69, 0.98, braidA * 0.5 + granular * 0.18 + 0.4);

    vec3 daylightDeep = vec3(0.035, 0.15, 0.17);
    vec3 daylightShallow = vec3(0.10, 0.32, 0.34);
    vec3 nightDeep = vec3(0.018, 0.075, 0.105);
    vec3 nightShallow = vec3(0.055, 0.20, 0.26);
    vec3 deep = mix(daylightDeep, nightDeep, uNight);
    vec3 shallow = mix(daylightShallow, nightShallow, uNight);
    vec3 color = mix(deep, shallow, 0.28 + across * 0.34 + glint * 0.18);
    color += vec3(0.21, 0.29, 0.28) * glint * (0.14 + 0.32 * (1.0 - uNight));
    color = mix(color, vec3(0.52, 0.62, 0.57), max(edgeFoam * 0.42, estuaryFoam * 0.32));

    float alpha = 0.84 + edgeFoam * 0.08;
    gl_FragColor = vec4(color, alpha);
  }
`;

const riverBankVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const riverBankFragmentShader = `
  uniform float uNight;
  varying vec2 vUv;

  void main() {
    float feather = smoothstep(0.0, 0.74, vUv.x);
    float silt = 0.78 + sin(vUv.y * 41.0) * 0.08;
    vec3 dayColor = vec3(0.20, 0.25, 0.20) * silt;
    vec3 nightColor = vec3(0.055, 0.075, 0.07);
    gl_FragColor = vec4(mix(dayColor, nightColor, uNight), feather * 0.48);
  }
`;

function rasterRowToWorldZ(row: number, height: number) {
  return (
    ROSHAR_MAP_BOUNDS.maxZ -
    (row / (height - 1)) *
      (ROSHAR_MAP_BOUNDS.maxZ - ROSHAR_MAP_BOUNDS.minZ)
  );
}

function worldXToRasterColumn(x: number, width: number) {
  return Math.round(
    ((x - ROSHAR_MAP_BOUNDS.minX) /
      (ROSHAR_MAP_BOUNDS.maxX - ROSHAR_MAP_BOUNDS.minX)) *
      (width - 1),
  );
}

function rasterColumnToWorldX(column: number, width: number) {
  return (
    ROSHAR_MAP_BOUNDS.minX +
    (column / (width - 1)) *
      (ROSHAR_MAP_BOUNDS.maxX - ROSHAR_MAP_BOUNDS.minX)
  );
}

function clearEllipse(
  data: Uint8Array,
  width: number,
  height: number,
  center: readonly [number, number],
  radiusX: number,
  radiusZ: number,
  boundaryScaleAt: (angle: number) => number = () => 1,
) {
  const maximumBoundaryScale = 1.07;
  for (let row = 0; row < height; row += 1) {
    const z = rasterRowToWorldZ(row, height);
    if (
      Math.abs(z - center[1]) >
      radiusZ * maximumBoundaryScale
    ) {
      continue;
    }
    for (let column = 0; column < width; column += 1) {
      const x = rasterColumnToWorldX(column, width);
      if (
        Math.abs(x - center[0]) >
        radiusX * maximumBoundaryScale
      ) {
        continue;
      }
      const localX = x - center[0];
      const localZ = z - center[1];
      const angle = Math.atan2(localZ / radiusZ, localX / radiusX);
      const boundaryScale = boundaryScaleAt(angle);
      if (
        (localX * localX) /
            (radiusX * radiusX * boundaryScale * boundaryScale) +
          (localZ * localZ) /
            (radiusZ * radiusZ * boundaryScale * boundaryScale) >
        1
      ) {
        continue;
      }
      const offset = (row * width + column) * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
  }
}

function fillPolygon(
  data: Uint8Array,
  width: number,
  height: number,
  polygon: readonly GeographyPoint[],
  value: number,
) {
  for (let row = 0; row < height; row += 1) {
    const z = rasterRowToWorldZ(row, height);
    const intersections: number[] = [];
    for (
      let current = 0, previous = polygon.length - 1;
      current < polygon.length;
      previous = current++
    ) {
      const [currentX, currentZ] = polygon[current];
      const [previousX, previousZ] = polygon[previous];
      if ((currentZ > z) === (previousZ > z)) continue;
      intersections.push(
        currentX +
          ((z - currentZ) * (previousX - currentX)) /
            (previousZ - currentZ),
      );
    }
    intersections.sort((first, second) => first - second);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const start = Math.max(
        0,
        worldXToRasterColumn(intersections[index], width),
      );
      const end = Math.min(
        width - 1,
        worldXToRasterColumn(intersections[index + 1], width),
      );
      for (let column = start; column <= end; column += 1) {
        const offset = (row * width + column) * 4;
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
        data[offset + 3] = 255;
      }
    }
  }
}

function createLandMaskTexture(
  width: number,
  height: number,
  focusedLocationId?: DetailedLocationId,
) {
  const data = new Uint8Array(width * height * 4);
  for (let offset = 3; offset < data.length; offset += 4) data[offset] = 255;
  landPolygons.forEach((polygon) =>
    fillPolygon(data, width, height, polygon, 255),
  );
  if (focusedLocationId === "thaylen-city") {
    fillPolygon(
      data,
      width,
      height,
      THAYLEN_CITY_TERRAIN_PATCH,
      255,
    );
  }
  inlandWaterPolygons.forEach((water) =>
    fillPolygon(data, width, height, water.points, 0),
  );
  if (focusedLocationId === "shattered-plains") {
    const center = detailedLocationSurface("shattered-plains")!.center;
    const handoffRadiusX = THREE.MathUtils.lerp(
      SHATTERED_PLAINS_PATCH.innerRadiusX,
      SHATTERED_PLAINS_PATCH.outerRadiusX,
      SHATTERED_PLAINS_HANDOFF_PROGRESS,
    );
    const handoffRadiusZ = THREE.MathUtils.lerp(
      SHATTERED_PLAINS_PATCH.innerRadiusZ,
      SHATTERED_PLAINS_PATCH.outerRadiusZ,
      SHATTERED_PLAINS_HANDOFF_PROGRESS,
    );
    clearEllipse(
      data,
      width,
      height,
      center,
      handoffRadiusX,
      handoffRadiusZ,
      shatteredPlainsBoundaryScale,
    );
  }
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createTerrainGeometry(
  segmentsX: number,
  segmentsZ: number,
  focusedLocationId?: DetailedLocationId,
) {
  const geometry = new THREE.PlaneGeometry(
    mapWidth,
    mapDepth,
    segmentsX,
    segmentsZ,
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(mapCenterX, 0, mapCenterZ);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const height =
      terrainHeightAt(x, z, focusedLocationId) +
      riverDepressionAt(x, z);
    positions.setY(index, height);
    terrainColorAt(x, z, height).toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function addCoastSkirt(
  vertices: number[],
  indices: number[],
  polygon: readonly GeographyPoint[],
) {
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const currentHeight = terrainHeightAt(current[0], current[1]);
    const nextHeight = terrainHeightAt(next[0], next[1]);
    const offset = vertices.length / 3;
    vertices.push(
      current[0],
      currentHeight,
      current[1],
      next[0],
      nextHeight,
      next[1],
      current[0],
      -0.38,
      current[1],
      next[0],
      -0.38,
      next[1],
    );
    indices.push(
      offset,
      offset + 2,
      offset + 1,
      offset + 1,
      offset + 2,
      offset + 3,
    );
  }
}

function createCoastSkirtGeometry() {
  const vertices: number[] = [];
  const indices: number[] = [];
  landPolygons.forEach((polygon) =>
    addCoastSkirt(vertices, indices, polygon),
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function TerrainSurface() {
  const mobile = useThree((state) =>
    isCompactViewport(state.size.width, state.size.height),
  );
  const selectedId = useAtlasStore((state) => state.selectedId);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const [stone, macroSource] = useTexture([
    `${import.meta.env.BASE_URL}textures/crem-stone-albedo.jpg`,
    `${import.meta.env.BASE_URL}textures/roshar-crem-macro.jpg`,
  ]);
  const focusedLocationId = proximityLocationId
    ? detailedLocationSurface(proximityLocationId)?.id
    : detailLevel === "city" || detailLevel === "street"
      ? detailedLocationSurface(selectedId)?.id
      : undefined;
  const [segmentsX, segmentsZ] = terrainMeshSegments(
    mobile,
    focusedLocationId !== undefined,
  );
  const geometry = useMemo(
    () =>
      createTerrainGeometry(
        segmentsX,
        segmentsZ,
        focusedLocationId,
      ),
    [focusedLocationId, segmentsX, segmentsZ],
  );
  const alphaMap = useMemo(
    () =>
      createLandMaskTexture(
        mobile ? 640 : 1280,
        mobile ? 336 : 672,
        focusedLocationId,
      ),
    [focusedLocationId, mobile],
  );
  const bumpMap = useMemo(() => {
    const copy = stone.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(18, 9.4);
    copy.anisotropy = mobile ? 2 : 8;
    copy.colorSpace = THREE.NoColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [mobile, stone]);
  const macroMap = useMemo(() => {
    const copy = macroSource.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(12, 6.25);
    copy.anisotropy = mobile ? 2 : 8;
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [macroSource, mobile]);

  useEffect(
    () => () => {
      geometry.dispose();
      alphaMap.dispose();
      bumpMap.dispose();
      macroMap.dispose();
    },
    [alphaMap, bumpMap, geometry, macroMap],
  );

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        map={macroMap}
        alphaMap={alphaMap}
        alphaTest={0.42}
        bumpMap={bumpMap}
        bumpScale={mobile ? 0.08 : 0.14}
        roughness={0.91}
        metalness={0.015}
      />
    </mesh>
  );
}

function ShatteredPlainsTerrainPatch() {
  const mobile = useThree((state) =>
    isCompactViewport(state.size.width, state.size.height),
  );
  const selectedId = useAtlasStore((state) => state.selectedId);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const [source, macroSource] = useTexture([
    `${import.meta.env.BASE_URL}textures/cities/shattered-plains-crem-fracture-atlas.jpg`,
    `${import.meta.env.BASE_URL}textures/roshar-crem-macro.jpg`,
  ]);
  const visible =
    proximityLocationId === "shattered-plains" ||
    ((detailLevel === "city" || detailLevel === "street") &&
      selectedId === "shattered-plains");
  const center = detailedLocationSurface("shattered-plains")!.center;
  const landmarkDatum = terrainHeightAt(
    center[0],
    center[1],
    "shattered-plains",
  );
  const floorGeometry = useMemo(
    () =>
      visible
        ? createShatteredPlainsFloorGeometry(
            center,
            landmarkDatum,
            (x, z) => terrainHeightAt(x, z, "shattered-plains"),
            mobile ? 56 : 96,
            (x, z, y) => terrainColorAt(x, z, y),
            (x, z) => [
              (x - ROSHAR_MAP_BOUNDS.minX) / mapWidth,
              (ROSHAR_MAP_BOUNDS.maxZ - z) / mapDepth,
            ],
          )
        : null,
    [center, landmarkDatum, mobile, visible],
  );
  const wallGeometry = useMemo(
    () =>
      visible
        ? createShatteredPlainsWallGeometry(center, landmarkDatum)
        : null,
    [center, landmarkDatum, visible],
  );
  const capGeometry = useMemo(
    () =>
      visible
        ? createShatteredPlainsCapGeometry(center, landmarkDatum)
        : null,
    [center, landmarkDatum, visible],
  );
  const materialTexture = useMemo(() => {
    const copy = source.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(7.5, 6.8);
    copy.anisotropy = mobile ? 2 : 8;
    copy.colorSpace = THREE.NoColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [mobile, source]);
  const macroTexture = useMemo(() => {
    const copy = macroSource.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(12, 6.25);
    copy.anisotropy = mobile ? 2 : 8;
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [macroSource, mobile]);
  const cremAlbedoTexture = useMemo(() => {
    const copy = source.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(3.8, 3.4);
    copy.anisotropy = mobile ? 2 : 8;
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [mobile, source]);

  useEffect(
    () => () => {
      floorGeometry?.dispose();
      capGeometry?.dispose();
      wallGeometry?.dispose();
      materialTexture.dispose();
      macroTexture.dispose();
      cremAlbedoTexture.dispose();
    },
    [
      capGeometry,
      cremAlbedoTexture,
      floorGeometry,
      macroTexture,
      materialTexture,
      wallGeometry,
    ],
  );

  if (!floorGeometry || !capGeometry || !wallGeometry) return null;
  return (
    <group name="Carved Shattered Plains terrain">
      <mesh geometry={floorGeometry} receiveShadow>
        <meshStandardMaterial
          bumpMap={materialTexture}
          bumpScale={0.018}
          map={macroTexture}
          vertexColors
          emissive="#111816"
          emissiveIntensity={0.08}
          roughness={0.97}
          metalness={0.01}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <mesh geometry={capGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          bumpMap={materialTexture}
          bumpScale={0.018}
          map={cremAlbedoTexture}
          color="#b1a68f"
          emissive="#8c8069"
          emissiveMap={cremAlbedoTexture}
          emissiveIntensity={0.16}
          roughness={0.96}
          metalness={0.008}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh geometry={wallGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          map={cremAlbedoTexture}
          bumpMap={materialTexture}
          bumpScale={0.024}
          color="#9e9583"
          vertexColors
          emissive="#786e5c"
          emissiveMap={cremAlbedoTexture}
          emissiveIntensity={0.09}
          roughness={0.98}
          metalness={0.008}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CoastSkirts() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const geometry = useMemo(() => createCoastSkirtGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (
    proximityLocationId !== null ||
    detailLevel === "city" ||
    detailLevel === "street"
  ) {
    return null;
  }
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        color="#4c4b43"
        roughness={0.96}
        metalness={0.01}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GeographicCoastlines() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  if (proximityLocationId !== null || detailLevel === "street") return null;
  const lineWidth = detailLevel === "continent" ? 0.62 : 0.92;
  return (
    <group name="Canonical coastlines">
      {[mainlandOutline, aimiaOutline].map((polygon, index) => (
        <Line
          key={index}
          points={polygon.map(([x, z]) => [
            x,
            terrainHeightAt(x, z) + 0.065,
            z,
          ])}
          color="#c4b485"
          lineWidth={lineWidth}
          transparent
          opacity={detailLevel === "continent" ? 0.28 : 0.16}
          depthWrite={false}
        />
      ))}
    </group>
  );
}

function CartographicLines() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  if (
    proximityLocationId !== null ||
    !showCartographicLinework(detailLevel)
  ) {
    return null;
  }
  const showRoads = detailLevel !== "continent";

  return (
    <group>
      {showRoads &&
        majorRoads.map((road, index) => (
          <Line
            key={index}
            points={road.map(([x, z]) => [
              x,
              terrainHeightAt(x, z) + 0.12,
              z,
            ])}
            color="#b79861"
            lineWidth={0.72}
            transparent
            opacity={0.72}
            dashed
            dashSize={0.38}
            gapSize={0.2}
          />
        ))}
      {locations
        .filter((location) => location.id !== "roshar")
        .map((location) => (
          <mesh
            key={location.id}
            position={[
              location.coordinates.x,
              terrainHeightAt(
                location.coordinates.x,
                location.coordinates.z,
              ) + 0.36,
              location.coordinates.z,
            ]}
          >
            <cylinderGeometry args={[0.095, 0.18, 0.42, 8]} />
            <meshStandardMaterial
              color={location.accentColor}
              emissive={location.accentColor}
              emissiveIntensity={0.72}
              toneMapped={false}
            />
          </mesh>
        ))}
    </group>
  );
}

function RiverNetwork() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const nightMode = useAtlasStore((state) => state.nightMode);
  const mobile = useThree((state) =>
    isCompactViewport(state.size.width, state.size.height),
  );
  const surfaceGeometry = useMemo(
    () => createRiverSurfaceGeometry(mobile ? 0.38 : 0.22),
    [mobile],
  );
  const bankGeometry = useMemo(
    () => createRiverBankGeometry(mobile ? 0.42 : 0.25),
    [mobile],
  );
  const riverUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNight: { value: 0 },
    }),
    [],
  );
  const bankUniforms = useMemo(
    () => ({
      uNight: { value: 0 },
    }),
    [],
  );
  const riverMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const bankMaterialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (riverMaterialRef.current) {
      riverMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      riverMaterialRef.current.uniforms.uNight.value = nightMode ? 1 : 0;
    }
    if (bankMaterialRef.current) {
      bankMaterialRef.current.uniforms.uNight.value = nightMode ? 1 : 0;
    }
  });

  useEffect(
    () => () => {
      surfaceGeometry.dispose();
      bankGeometry.dispose();
    },
    [bankGeometry, surfaceGeometry],
  );

  if (
    proximityLocationId !== null ||
    detailLevel === "city" ||
    detailLevel === "street"
  ) {
    return null;
  }
  return (
    <group name="Canonical river network">
      <mesh
        name="Shallow river valleys and wet banks"
        geometry={bankGeometry}
        renderOrder={2}
      >
        <shaderMaterial
          ref={bankMaterialRef}
          vertexShader={riverBankVertexShader}
          fragmentShader={riverBankFragmentShader}
          uniforms={bankUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh
        name="Directional animated river surfaces and estuaries"
        geometry={surfaceGeometry}
        renderOrder={3}
      >
        <shaderMaterial
          ref={riverMaterialRef}
          vertexShader={riverVertexShader}
          fragmentShader={riverFragmentShader}
          uniforms={riverUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
}

export function RosharTerrain() {
  return (
    <group>
      <WaterSystem />
      <TerrainSurface />
      <ShatteredPlainsTerrainPatch />
      <CoastSkirts />
      <GeographicCoastlines />
      <RiverNetwork />
      <CartographicLines />
    </group>
  );
}

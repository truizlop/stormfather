import { Line, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import {
  ROSHAR_MAP_BOUNDS,
  aimiaOutline,
  inlandWaterPolygons,
  islandPolygons,
  mainlandOutline,
  riverPaths,
  type GeographyPoint,
} from "../cartography/geography";
import { locations } from "../locations";
import { majorRoads } from "./rosharOutline";
import { terrainHeightAt, terrainSlopeAt } from "./terrainHeight";
import { WaterSystem } from "./WaterSystem";

const landPolygons: readonly (readonly GeographyPoint[])[] = [
  mainlandOutline,
  aimiaOutline,
  ...islandPolygons.map((island) => island.points),
];

const mapWidth = ROSHAR_MAP_BOUNDS.maxX - ROSHAR_MAP_BOUNDS.minX;
const mapDepth = ROSHAR_MAP_BOUNDS.maxZ - ROSHAR_MAP_BOUNDS.minZ;
const mapCenterX = (ROSHAR_MAP_BOUNDS.minX + ROSHAR_MAP_BOUNDS.maxX) / 2;
const mapCenterZ = (ROSHAR_MAP_BOUNDS.minZ + ROSHAR_MAP_BOUNDS.maxZ) / 2;

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

function createLandMaskTexture(width: number, height: number) {
  const data = new Uint8Array(width * height * 4);
  for (let offset = 3; offset < data.length; offset += 4) data[offset] = 255;
  landPolygons.forEach((polygon) =>
    fillPolygon(data, width, height, polygon, 255),
  );
  inlandWaterPolygons.forEach((water) =>
    fillPolygon(data, width, height, water.points, 0),
  );
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

const biomeColors = {
  crem: new THREE.Color("#81765f"),
  stormward: new THREE.Color("#6f664d"),
  shinovar: new THREE.Color("#748d54"),
  iri: new THREE.Color("#7d8050"),
  azir: new THREE.Color("#b1844b"),
  frostlands: new THREE.Color("#a49570"),
  aimia: new THREE.Color("#5f6a68"),
  rock: new THREE.Color("#5a5954"),
  summit: new THREE.Color("#aaa79b"),
} as const;

function terrainColorAt(x: number, z: number, height: number) {
  const color = biomeColors.crem.clone();
  if (x < -47) {
    color.copy(biomeColors.aimia);
  } else if (x < -31) {
    color.copy(biomeColors.shinovar);
  } else if (x < -18 && z < -7) {
    color.copy(biomeColors.iri);
  } else if (x < 3 && z > 1) {
    color.copy(biomeColors.azir);
  } else if (z > 13 && x > 2) {
    color.copy(biomeColors.frostlands);
  } else if (x > 28) {
    color.copy(biomeColors.stormward);
  }

  const slope = terrainSlopeAt(x, z);
  const rockBlend = THREE.MathUtils.clamp(
    (height - 1.75) * 0.19 + slope * 0.23,
    0,
    0.78,
  );
  color.lerp(biomeColors.rock, rockBlend);
  color.lerp(
    biomeColors.summit,
    THREE.MathUtils.smoothstep(height, 5.4, 7.4) * 0.62,
  );
  const variation =
    Math.sin(x * 1.37 + z * 0.61) * 0.025 +
    Math.sin(x * 0.29 - z * 1.11) * 0.018;
  color.offsetHSL(variation * 0.16, variation * 0.35, variation);
  return color;
}

function createTerrainGeometry(segmentsX: number, segmentsZ: number) {
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
    const height = terrainHeightAt(x, z);
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
  const viewportWidth = useThree((state) => state.size.width);
  const stone = useTexture(
    `${import.meta.env.BASE_URL}textures/crem-stone-albedo.jpg`,
  );
  const mobile = viewportWidth < 720;
  const geometry = useMemo(
    () => createTerrainGeometry(mobile ? 190 : 320, mobile ? 100 : 168),
    [mobile],
  );
  const alphaMap = useMemo(
    () => createLandMaskTexture(mobile ? 640 : 1280, mobile ? 336 : 672),
    [mobile],
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

  useEffect(
    () => () => {
      geometry.dispose();
      alphaMap.dispose();
      bumpMap.dispose();
    },
    [alphaMap, bumpMap, geometry],
  );

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
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

function CoastSkirts() {
  const geometry = useMemo(createCoastSkirtGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
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
  if (detailLevel === "street") return null;
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
  const tributaries = useMemo(
    () =>
      riverPaths.flatMap((river, riverIndex) =>
        river.points.slice(1, -1).map((point, pointIndex) => {
          const previous = river.points[pointIndex];
          const following = river.points[pointIndex + 2];
          const tangentX = following[0] - previous[0];
          const tangentZ = following[1] - previous[1];
          const length = Math.hypot(tangentX, tangentZ) || 1;
          const side = (riverIndex + pointIndex) % 2 === 0 ? 1 : -1;
          const reach = 1.4 + ((riverIndex * 5 + pointIndex * 3) % 5) * 0.3;
          const source: GeographyPoint = [
            point[0] + (-tangentZ / length) * reach * side - tangentX * 0.08,
            point[1] + (tangentX / length) * reach * side - tangentZ * 0.08,
          ];
          return [source, point] as const;
        }),
      ),
    [],
  );

  if (detailLevel === "city" || detailLevel === "street") return null;
  return (
    <group name="Canonical river network">
      {riverPaths.map((river) => (
        <Line
          key={river.id}
          points={river.points.map(([x, z]) => [
            x,
            terrainHeightAt(x, z) + 0.1,
            z,
          ])}
          color="#2d8790"
          lineWidth={
            (detailLevel === "continent" ? 0.86 : 1.28) +
            river.width * 1.8
          }
          transparent
          opacity={detailLevel === "continent" ? 0.72 : 0.84}
          depthWrite={false}
          renderOrder={3}
        />
      ))}
      {tributaries.map((tributary, index) => (
        <Line
          key={index}
          points={tributary.map(([x, z]) => [
            x,
            terrainHeightAt(x, z) + 0.09,
            z,
          ])}
          color="#397d83"
          lineWidth={detailLevel === "continent" ? 0.42 : 0.68}
          transparent
          opacity={0.56}
          depthWrite={false}
        />
      ))}
    </group>
  );
}

export function RosharTerrain() {
  return (
    <group>
      <WaterSystem />
      <TerrainSurface />
      <CoastSkirts />
      <GeographicCoastlines />
      <RiverNetwork />
      <CartographicLines />
    </group>
  );
}

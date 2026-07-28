import { Line, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import {
  aimiaOutline,
  destinationAnchors,
  inlandWaterPolygons,
  islandPolygons,
  mainlandOutline,
  pointInPolygon,
  polygonBounds,
  type GeographyPoint,
} from "../cartography/geography";
import {
  preStormDrainage,
  stormProximity,
  stormXAtTime,
} from "../weather/storm";

const coastlinePolygons: readonly (readonly GeographyPoint[])[] = [
  mainlandOutline,
  aimiaOutline,
  ...islandPolygons.map((island) => island.points),
];
const purelakePolygon = inlandWaterPolygons.find(
  (water) => water.id === "purelake",
)!.points;
const purelakeCenter = destinationAnchors.purelake;

function polygonShapeGeometry(
  points: readonly GeographyPoint[],
  center: GeographyPoint,
) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    const localX = x - center[0];
    const localY = -(z - center[1]);
    if (index === 0) shape.moveTo(localX, localY);
    else shape.lineTo(localX, localY);
  });
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

const oceanVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uStormX;
  uniform float uQuality;
  varying vec3 vWorldPosition;
  varying float vWave;
  varying float vStorm;

  float waveField(vec2 point, float time) {
    float broad = sin(point.x * 0.28 + time * 0.62) * 0.11;
    broad += sin(point.y * 0.36 - time * 0.48 + point.x * 0.08) * 0.085;
    float chop = sin(dot(point, vec2(0.91, 0.43)) * 0.82 + time * 1.18) * 0.036;
    chop += sin(dot(point, vec2(-0.38, 0.96)) * 1.36 - time * 0.92) * 0.022;
    return broad + chop * uQuality;
  }

  void main() {
    vec3 displaced = position;
    vec4 originalWorld = modelMatrix * vec4(position, 1.0);
    vStorm = smoothstep(17.0, 0.0, abs(originalWorld.x - uStormX));
    float wave = waveField(position.xy, uTime);
    wave *= mix(1.0, 2.45, vStorm);
    displaced.z += wave;
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = world.xyz;
    vWave = wave;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const oceanFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  varying vec3 vWorldPosition;
  varying float vWave;
  varying float vStorm;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 dx = dFdx(vWorldPosition);
    vec3 dy = dFdy(vWorldPosition);
    vec3 normal = normalize(cross(dx, dy));
    if (normal.y < 0.0) normal *= -1.0;
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.7);
    float fine = sin(vWorldPosition.x * 2.7 + uTime * 1.4)
      * sin(vWorldPosition.z * 2.2 - uTime * 1.1);
    float crest = smoothstep(0.105, 0.22, vWave + fine * 0.025);
    float fleck = step(0.9, hash21(floor(vWorldPosition.xz * 2.1 + uTime * 0.14)));
    vec3 deep = mix(vec3(0.012, 0.095, 0.145), vec3(0.018, 0.135, 0.19), 1.0 - uNight);
    vec3 middle = vec3(0.025, 0.24, 0.30);
    vec3 horizon = mix(vec3(0.13, 0.28, 0.34), vec3(0.26, 0.43, 0.46), 1.0 - uNight);
    vec3 color = mix(deep, middle, 0.22 + 0.28 * fine);
    color = mix(color, horizon, fresnel * 0.82);
    color += vec3(0.19, 0.42, 0.45) * crest * (0.35 + vStorm * 0.8);
    color += vec3(0.32, 0.54, 0.56) * fleck * crest * 0.18;
    color *= 1.0 - vStorm * 0.22;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const lakeVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uStorm;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vRipple;

  void main() {
    vec3 displaced = position;
    float ripple = sin(length(position.xy) * 4.2 - uTime * 1.55) * 0.016;
    ripple += sin(position.x * 2.8 + uTime * 0.72) * 0.011;
    ripple += sin(position.y * 3.5 - uTime * 0.58) * 0.008;
    displaced.z += ripple * (1.0 + uStorm * 0.8);
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vUv = uv;
    vRipple = ripple;
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const lakeFragmentShader = /* glsl */ `
  uniform sampler2D uCaustics;
  uniform float uTime;
  uniform float uStorm;
  uniform float uNight;
  uniform float uDrain;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vRipple;

  void main() {
    vec2 uvA = vUv * vec2(7.2, 5.0) + vec2(uTime * 0.018, -uTime * 0.011);
    vec2 uvB = vUv.yx * vec2(5.4, 7.8) + vec2(-uTime * 0.012, uTime * 0.016);
    float causticA = texture2D(uCaustics, uvA).r;
    float causticB = texture2D(uCaustics, uvB).r;
    float caustic = smoothstep(0.54, 0.94, causticA * 0.62 + causticB * 0.52);
    vec3 dx = dFdx(vWorldPosition);
    vec3 dy = dFdy(vWorldPosition);
    vec3 normal = normalize(cross(dx, dy));
    if (normal.y < 0.0) normal *= -1.0;
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);
    float channel = smoothstep(0.06, 0.0, abs(sin(vUv.x * 31.0 + sin(vUv.y * 9.0) * 2.0)));
    vec3 shallow = mix(vec3(0.03, 0.32, 0.35), vec3(0.045, 0.43, 0.43), 1.0 - uNight);
    vec3 deep = vec3(0.012, 0.17, 0.23);
    float radial = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0);
    vec3 color = mix(deep, shallow, smoothstep(0.18, 0.96, radial));
    color = mix(color, deep, fresnel * 0.64 + channel * uDrain * 0.2);
    color += vec3(0.20, 0.62, 0.57) * caustic * (0.19 - uNight * 0.04);
    color += vec3(0.18, 0.42, 0.45) * smoothstep(0.012, 0.034, vRipple);
    color *= 1.0 - uStorm * 0.18;
    float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(0.0, 0.1, vUv.y)
      * smoothstep(0.0, 0.1, 1.0 - vUv.x) * smoothstep(0.0, 0.1, 1.0 - vUv.y);
    float alpha = mix(0.74, 0.5, uDrain) * (0.68 + edge * 0.32);
    gl_FragColor = vec4(color, alpha);
  }
`;

function OceanSurface() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const width = useThree((state) => state.size.width);
  const nightMode = useAtlasStore((state) => state.nightMode);
  const segments = width < 720 ? [72, 44] : [144, 86];
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStormX: { value: 54 },
      uQuality: { value: width < 720 ? 0.58 : 1 },
      uNight: { value: nightMode ? 1 : 0 },
    }),
    [nightMode, width],
  );

  useFrame(({ clock }) => {
    if (!material.current) return;
    const state = useAtlasStore.getState();
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uStormX.value = stormXAtTime(
      state.simulationTime,
    );
    material.current.uniforms.uNight.value = state.nightMode ? 1 : 0;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.25} receiveShadow>
      <planeGeometry args={[148, 90, segments[0], segments[1]]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={oceanVertexShader}
        fragmentShader={oceanFragmentShader}
      />
    </mesh>
  );
}

function CoastalFoam() {
  const points = useRef<THREE.Points>(null);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const positions = useMemo(() => {
    const values: number[] = [];
    coastlinePolygons.forEach((polygon, polygonIndex) => {
      polygon.forEach((point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        const length = Math.hypot(next[0] - point[0], next[1] - point[1]);
        const density = Math.max(1, Math.min(5, Math.ceil(length / 0.22)));
        for (let step = 0; step < density; step += 1) {
          const t = step / density;
          const jitter =
            (((index * 37 + step * 19 + polygonIndex * 13) % 17) - 8) *
            0.01;
          values.push(
            THREE.MathUtils.lerp(point[0], next[0], t) + jitter,
            0.075 + ((index + step) % 4) * 0.012,
            THREE.MathUtils.lerp(point[1], next[1], t) - jitter,
          );
        }
      });
    });
    return new Float32Array(values);
  }, []);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const material = points.current.material as THREE.PointsMaterial;
    material.opacity = 0.26 + Math.sin(clock.elapsedTime * 1.4) * 0.08;
  });

  if (detailLevel === "street") return null;
  return (
    <>
      {[mainlandOutline, aimiaOutline].map((polygon, index) => (
        <Line
          key={index}
          points={polygon.map(([x, z]) => [x, 0.08, z])}
          color="#74d7d5"
          lineWidth={detailLevel === "continent" ? 0.72 : 1.12}
          transparent
          opacity={detailLevel === "continent" ? 0.28 : 0.42}
          depthWrite={false}
        />
      ))}
      <points ref={points} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#b9efdf"
          size={detailLevel === "continent" ? 0.035 : 0.065}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </points>
    </>
  );
}

function PurelakeShoals() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const close =
    selectedId === "purelake" &&
    (detailLevel === "city" || detailLevel === "street");
  const count = close ? 46 : 18;
  const shoals = useMemo(() => {
    const bounds = polygonBounds(purelakePolygon);
    const points: Array<{
      x: number;
      z: number;
      sx: number;
      sz: number;
      rotation: number;
    }> = [];
    for (let index = 0; index < count * 18 && points.length < count; index += 1) {
      const x =
        bounds.minX +
        (((index * 73 + 19) % 997) / 997) * (bounds.maxX - bounds.minX);
      const z =
        bounds.minZ +
        (((index * 181 + 43) % 991) / 991) * (bounds.maxZ - bounds.minZ);
      if (!pointInPolygon([x, z], purelakePolygon)) continue;
      points.push({
        x,
        z,
        sx: 0.18 + ((index * 17) % 13) / 20,
        sz: 0.12 + ((index * 11) % 9) / 28,
        rotation: (index * 0.77) % Math.PI,
      });
    }
    return points;
  }, [count]);
  const stone = useTexture(
    `${import.meta.env.BASE_URL}textures/shattered-paving-albedo.jpg`,
  );
  const configured = useMemo(() => {
    const copy = stone.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(1.8, 1.8);
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [stone]);

  return (
    <group>
      {shoals.map((shoal, index) => {
        return (
          <mesh
            key={index}
            rotation-x={-Math.PI / 2}
            rotation-z={shoal.rotation}
            position={[
              shoal.x,
              0.14 + (index % 3) * 0.008,
              shoal.z,
            ]}
            scale={[shoal.sx, shoal.sz, 1]}
            receiveShadow
          >
            <circleGeometry args={[1, 18]} />
            <meshStandardMaterial
              map={configured}
              color={index % 5 === 0 ? "#c7ae78" : "#938466"}
              roughness={0.88}
              metalness={0.02}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function PurelakeLakebed() {
  const geometry = useMemo(
    () => polygonShapeGeometry(purelakePolygon, purelakeCenter),
    [],
  );
  const texture = useTexture(
    `${import.meta.env.BASE_URL}textures/crem-stone-albedo.jpg`,
  );
  const configured = useMemo(() => {
    const copy = texture.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(6.8, 3.2);
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [texture]);
  const pools = useMemo(() => {
    const bounds = polygonBounds(purelakePolygon);
    const values: GeographyPoint[] = [];
    for (let index = 0; index < 240 && values.length < 19; index += 1) {
      const point: GeographyPoint = [
        bounds.minX +
          (((index * 67 + 31) % 251) / 251) * (bounds.maxX - bounds.minX),
        bounds.minZ +
          (((index * 113 + 17) % 257) / 257) * (bounds.maxZ - bounds.minZ),
      ];
      if (pointInPolygon(point, purelakePolygon)) values.push(point);
    }
    return values;
  }, []);

  return (
    <group
      name="Purelake lakebed"
      position={[purelakeCenter[0], 0, purelakeCenter[1]]}
    >
      <mesh
        geometry={geometry}
        rotation-x={-Math.PI / 2}
        position-y={-0.11}
        receiveShadow
      >
        <meshStandardMaterial
          map={configured}
          color="#a9986f"
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      {pools.map((point, index) => {
        const sx = 0.32 + ((index * 7) % 9) / 18;
        const sz = 0.18 + ((index * 13) % 7) / 22;
        return (
          <mesh
            key={`pool-${index}`}
            rotation-x={-Math.PI / 2}
            position={[
              point[0] - purelakeCenter[0],
              -0.085,
              point[1] - purelakeCenter[1],
            ]}
            scale={[sx, sz, 1]}
          >
            <circleGeometry args={[1, 20]} />
            <meshBasicMaterial
              color={index % 3 === 0 ? "#194c55" : "#315e59"}
              transparent
              opacity={0.72}
            />
          </mesh>
        );
      })}
      {Array.from({ length: 11 }, (_, index) => {
        const angle = -0.48 + index * 0.09;
        const length = 2.8 + (index % 4) * 0.72;
        return (
          <mesh
            key={`drain-${index}`}
            rotation={[-Math.PI / 2, 0, angle]}
            position={[-1.4 + index * 0.26, -0.07, -0.8 + index * 0.1]}
          >
            <planeGeometry args={[0.055 + (index % 3) * 0.014, length]} />
            <meshBasicMaterial
              color="#173f45"
              transparent
              opacity={0.58}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function PurelakeSurface() {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(
    () => polygonShapeGeometry(purelakePolygon, purelakeCenter),
    [],
  );
  const shoreline = useMemo(
    () =>
      purelakePolygon.map(([x, z]) => [
        x - purelakeCenter[0],
        0.045,
        z - purelakeCenter[1],
      ]) as Array<[number, number, number]>,
    [],
  );
  const caustics = useTexture(
    `${import.meta.env.BASE_URL}textures/purelake-caustics.jpg`,
  );
  const configuredCaustics = useMemo(() => {
    const copy = caustics.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.colorSpace = THREE.NoColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [caustics]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStorm: { value: 0 },
      uNight: { value: 1 },
      uDrain: { value: 0 },
      uCaustics: { value: configuredCaustics },
    }),
    [configuredCaustics],
  );

  useFrame(({ clock }) => {
    if (!material.current || !group.current) return;
    const state = useAtlasStore.getState();
    const stormX = stormXAtTime(state.simulationTime);
    const proximity = stormProximity(stormX, purelakeCenter[0]);
    const drain = preStormDrainage(stormX, purelakeCenter[0]);
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uStorm.value = proximity;
    material.current.uniforms.uDrain.value = drain;
    material.current.uniforms.uNight.value = state.nightMode ? 1 : 0;
    group.current.scale.set(1 - drain * 0.1, 1, 1 - drain * 0.08);
    group.current.position.y = 0.08 - drain * 0.045;
  });

  return (
    <group
      ref={group}
      position={[purelakeCenter[0], 0.08, purelakeCenter[1]]}
    >
      <mesh
        geometry={geometry}
        rotation-x={-Math.PI / 2}
        renderOrder={3}
      >
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={lakeVertexShader}
          fragmentShader={lakeFragmentShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line
        points={shoreline}
        color="#83e2d3"
        lineWidth={1.1}
        transparent
        opacity={0.38}
        depthWrite={false}
      />
    </group>
  );
}

const harborCoordinates: Record<
  string,
  { center: readonly [number, number]; scale: readonly [number, number] }
> = {
  kharbranth: {
    center: [11.02, 22.29],
    scale: [5.8, 3.05],
  },
  "thaylen-city": {
    center: [9.56, 27.08],
    scale: [6.4, 3.35],
  },
};

function SelectedHarborSurface() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const surface = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const causticsSource = useTexture(
    `${import.meta.env.BASE_URL}textures/purelake-caustics.jpg`,
  );
  const caustics = useMemo(() => {
    const copy = causticsSource.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(3.6, 2.1);
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [causticsSource]);
  const foamPoints = useMemo(
    () =>
      Array.from({ length: 81 }, (_, index) => {
        const angle = (index / 80) * Math.PI * 2;
        return [Math.cos(angle), 0.025, Math.sin(angle)] as [
          number,
          number,
          number,
        ];
      }),
    [],
  );

  useFrame(({ clock }) => {
    const harbor = harborCoordinates[selectedId];
    if (!surface.current || !material.current || !harbor) return;
    const state = useAtlasStore.getState();
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      harbor.center[0],
    );
    caustics.offset.set(clock.elapsedTime * 0.009, -clock.elapsedTime * 0.006);
    surface.current.position.y =
      1.285 +
      Math.sin(clock.elapsedTime * (0.7 + proximity * 1.4)) *
        (0.012 + proximity * 0.026);
    surface.current.rotation.z =
      Math.sin(clock.elapsedTime * 0.23) * 0.006 * (1 + proximity);
    material.current.color.set(state.nightMode ? "#0b6672" : "#1595a0");
    material.current.emissive.set(state.nightMode ? "#07333c" : "#0b4148");
    material.current.opacity = 0.78 - proximity * 0.08;
  });

  const harbor = harborCoordinates[selectedId];
  if (
    !harbor ||
    (detailLevel !== "city" && detailLevel !== "street")
  ) {
    return null;
  }

  return (
    <group
      name={`${selectedId} animated harbor`}
      position={[harbor.center[0], 0, harbor.center[1]]}
      scale={[harbor.scale[0], 1, harbor.scale[1]]}
    >
      <mesh
        ref={surface}
        rotation-x={-Math.PI / 2}
        position-y={1.285}
        renderOrder={3}
        receiveShadow
      >
        <circleGeometry args={[1, 72]} />
        <meshPhysicalMaterial
          ref={material}
          map={caustics}
          color="#1595a0"
          emissive="#0b4148"
          emissiveIntensity={0.2}
          roughness={0.26}
          metalness={0.04}
          clearcoat={0.42}
          clearcoatRoughness={0.34}
          transparent
          opacity={0.78}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line
        points={foamPoints}
        color="#c0f4eb"
        lineWidth={1.2}
        transparent
        opacity={0.48}
        depthWrite={false}
      />
    </group>
  );
}

export function WaterSystem() {
  return (
    <group name="Roshar water system">
      <OceanSurface />
      <CoastalFoam />
      <SelectedHarborSurface />
      <PurelakeLakebed />
      <PurelakeSurface />
      <PurelakeShoals />
    </group>
  );
}

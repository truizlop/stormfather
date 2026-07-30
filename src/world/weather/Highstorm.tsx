import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import {
  createStormCloudLobes,
  stormWallOpacity,
  type StormCloudBand,
} from "./stormClouds";
import {
  createStormParticleField,
  lightningIntensity,
  type StormParticleBand,
} from "./stormParticles";
import { stormXAtTime } from "./storm";

const highstormWorldBounds = new THREE.Box3();
const highstormViewFrustum = new THREE.Frustum();
const highstormProjectionView = new THREE.Matrix4();

const stormParticleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uKind;
  uniform float uPointScale;
  attribute float aSeed;
  attribute float aSize;
  varying float vSeed;
  varying float vKind;
  varying float vFade;

  void main() {
    vec3 animated = position;

    if (uKind < 0.5) {
      float speed = 17.0 + aSeed * 9.0;
      animated.y = mod(position.y - uTime * speed - 0.4, 23.0) + 0.4;
      animated.x = mod(
        position.x - uTime * (2.4 + aSeed * 1.8) + 6.5,
        13.0
      ) - 6.5;
      animated.z += sin(uTime * 2.1 + aSeed * 31.0) * 0.34;
    } else if (uKind < 1.5) {
      animated.y = mod(
        position.y + uTime * (1.6 + aSeed * 3.7),
        7.8
      );
      animated.x = mod(
        position.x - uTime * (3.0 + aSeed * 2.2) + 6.5,
        13.0
      ) - 6.5;
      animated.z += sin(uTime * (1.7 + aSeed) + aSeed * 43.0) * 1.35;
    } else {
      float orbit = uTime * (1.1 + aSeed * 1.9) + aSeed * 21.0;
      animated.x = mod(
        position.x - uTime * (2.1 + aSeed * 2.8) + 6.0,
        12.0
      ) - 6.0;
      animated.y = mod(
        position.y + uTime * (0.65 + aSeed * 1.4),
        18.0
      ) + sin(orbit) * 1.4;
      animated.z += sin(orbit * 0.73) * 2.1;
    }

    vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
    float distanceScale = clamp(56.0 / max(8.0, -mvPosition.z), 0.45, 2.6);
    gl_PointSize = aSize * uPointScale * distanceScale;
    gl_Position = projectionMatrix * mvPosition;
    vSeed = aSeed;
    vKind = uKind;
    vFade = 1.0 - smoothstep(24.0, 38.0, abs(animated.z));
  }
`;

const stormParticleFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying float vSeed;
  varying float vKind;
  varying float vFade;

  float rainStreak(vec2 point) {
    vec2 p = point - 0.5;
    p.x += p.y * 0.26;
    float width = 1.0 - smoothstep(0.018, 0.12, abs(p.x));
    float cap = 1.0 - smoothstep(0.34, 0.52, abs(p.y));
    return width * cap;
  }

  void main() {
    float alpha;
    vec2 centered = gl_PointCoord - 0.5;
    if (vKind < 0.5) {
      alpha = rainStreak(gl_PointCoord);
    } else if (vKind < 1.5) {
      float radius = length(centered);
      alpha = 1.0 - smoothstep(0.08, 0.5, radius);
      alpha *= 0.62 + sin(vSeed * 71.0 + uTime * 3.0) * 0.18;
    } else {
      float angle = vSeed * 6.28318 + uTime * (1.8 + vSeed);
      mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      vec2 debris = rotation * centered;
      alpha = (1.0 - smoothstep(0.08, 0.15, abs(debris.y)))
        * (1.0 - smoothstep(0.31, 0.48, abs(debris.x)));
    }
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(uColor, alpha * uOpacity * vFade);
  }
`;

const particleKind: Record<StormParticleBand, number> = {
  rain: 0,
  spray: 1,
  debris: 2,
};

type StormParticleLayerProps = {
  band: StormParticleBand;
  count: number;
  color: string;
  opacity: number;
  pointScale: number;
  position?: [number, number, number];
};

function StormParticleLayer({
  band,
  count,
  color,
  opacity,
  pointScale,
  position = [0, 0, 0],
}: StormParticleLayerProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const field = useMemo(
    () => createStormParticleField(count, band),
    [band, count],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uKind: { value: particleKind[band] },
      uPointScale: { value: pointScale },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    }),
    [band, color, opacity, pointScale],
  );

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <points position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[field.positions, 3]}
        />
        <bufferAttribute attach="attributes-aSeed" args={[field.seeds, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[field.sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={stormParticleVertexShader}
        fragmentShader={stormParticleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

function StormParticleWall() {
  const width = useThree((state) => state.size.width);
  const mobile = width < 720;

  return (
    <group>
      <StormParticleLayer
        band="rain"
        count={mobile ? 3200 : 7800}
        color="#c4e1e6"
        opacity={mobile ? 0.86 : 0.8}
        pointScale={mobile ? 6.2 : 8}
      />
      <StormParticleLayer
        band="rain"
        count={mobile ? 1450 : 3500}
        color="#edf7f7"
        opacity={0.62}
        pointScale={mobile ? 4.5 : 5.8}
        position={[1.5, 1.1, -1.8]}
      />
      <StormParticleLayer
        band="spray"
        count={mobile ? 1150 : 2800}
        color="#d9e9e9"
        opacity={mobile ? 0.64 : 0.7}
        pointScale={mobile ? 4.8 : 6}
        position={[-1.3, 0, 0]}
      />
      <StormParticleLayer
        band="debris"
        count={mobile ? 125 : 360}
        color="#403b32"
        opacity={0.9}
        pointScale={mobile ? 4.2 : 5.2}
        position={[-0.6, 0, 0]}
      />
      <mesh position={[-3.2, 0.045, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[19, 78]} />
        <meshBasicMaterial
          color="#02090d"
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

const stormWallVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vRidge;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    float broad = sin(position.x * 0.13 + uTime * 0.22) * 0.72;
    float billow = sin(position.x * 0.41 - position.y * 0.29 + uTime * 0.37) * 0.42;
    float cellular = sin(position.x * 0.91 + position.y * 0.67 - uTime * 0.18) * 0.18;
    displaced.z += broad + billow + cellular;
    vRidge = broad + billow;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const stormWallFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFlash;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vRidge;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int octave = 0; octave < 5; octave++) {
      value += noise(p) * amplitude;
      p = p * 2.03 + vec2(13.7, 7.1);
      amplitude *= 0.49;
    }
    return value;
  }

  void main() {
    vec2 flow = vec2(
      vUv.x * 8.0 - uTime * 0.035,
      vUv.y * 5.8 + uTime * 0.018
    );
    float large = fbm(flow);
    float folded = fbm(flow * 2.2 + large * 1.8);
    float density = smoothstep(0.22, 0.84, large * 0.72 + folded * 0.48);
    float raggedTop = 0.86 + (fbm(vec2(vUv.x * 6.0, uTime * 0.025)) - 0.5) * 0.26;
    if (vUv.y > raggedTop || vUv.y < 0.008) discard;

    // ACES compresses the low end aggressively. These values deliberately
    // retain readable charcoal billows without turning an opaque wall into a
    // featureless black cutout.
    vec3 charcoal = vec3(0.14, 0.20, 0.23);
    vec3 slate = vec3(0.40, 0.52, 0.56);
    vec3 spray = vec3(0.72, 0.83, 0.84);
    float groundRoll = 1.0 - smoothstep(0.0, 0.24, vUv.y);
    vec3 color = mix(charcoal, slate, density * 0.72 + vRidge * 0.025);
    color = mix(color, spray, groundRoll * (0.28 + folded * 0.32));
    float innerLightning = pow(max(0.0, folded - 0.48), 4.0) * uFlash * 7.0;
    color += vec3(0.62, 0.92, 1.0) * innerLightning;
    color *= 0.82 + density * 0.23;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

const stormCloudVertexShader = /* glsl */ `
  varying vec3 vCloudPosition;
  varying vec3 vCloudNormal;
  varying vec3 vCloudColor;

  void main() {
    vec4 local = instanceMatrix * vec4(position, 1.0);
    vec4 world = modelMatrix * local;
    vCloudPosition = world.xyz;
    vCloudNormal = normalize(
      normalMatrix * mat3(instanceMatrix) * normal
    );
    vCloudColor = instanceColor;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const stormCloudFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFlash;
  uniform float uBand;
  varying vec3 vCloudPosition;
  varying vec3 vCloudNormal;
  varying vec3 vCloudColor;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 cell = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash31(cell), hash31(cell + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(cell + vec3(0.0, 1.0, 0.0)), hash31(cell + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash31(cell + vec3(0.0, 0.0, 1.0)), hash31(cell + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(cell + vec3(0.0, 1.0, 1.0)), hash31(cell + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm3(vec3 p) {
    float value = 0.0;
    float amplitude = 0.56;
    for (int octave = 0; octave < 4; octave++) {
      value += noise3(p) * amplitude;
      p = p * 2.03 + vec3(7.7, 13.1, 5.9);
      amplitude *= 0.46;
    }
    return value;
  }

  void main() {
    vec3 flow = vCloudPosition * vec3(0.34, 0.27, 0.29);
    flow += vec3(-uTime * 0.045, uTime * 0.018, uTime * 0.012);
    float billow = fbm3(flow);
    float folded = fbm3(flow * 1.92 + billow * 1.35);
    float density = smoothstep(0.28, 1.05, billow * 0.68 + folded * 0.48);

    vec3 normal = normalize(vCloudNormal);
    vec3 lightDirection = normalize(vec3(-0.38, 0.72, 0.42));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float grazing = pow(1.0 - abs(normal.z), 2.0);
    float illumination = 0.48 + diffuse * 0.42 + grazing * 0.1;
    vec3 color = vCloudColor * mix(0.54, 1.18, density) * illumination;
    color = mix(color, color * vec3(0.72, 0.82, 0.86), folded * 0.22);
    color += vec3(0.58, 0.89, 1.0)
      * uFlash * pow(max(0.0, folded - 0.52), 3.0) * 3.2;
    color += vec3(0.06, 0.085, 0.09) * (1.0 - uBand) * density;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function StormWallMembrane() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uOpacity: { value: stormWallOpacity(-0.8) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uFlash.value = lightningIntensity(
      clock.elapsedTime,
    );
  });

  return (
    <mesh
      name="Opaque turbulent highstorm core"
      position={[-1.1, 12.4, 0]}
      rotation-y={Math.PI / 2}
      frustumCulled={false}
      castShadow
      receiveShadow
    >
      <planeGeometry args={[78, 25.5, 72, 32]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={stormWallVertexShader}
        fragmentShader={stormWallFragmentShader}
        side={THREE.DoubleSide}
        transparent={false}
        depthWrite
      />
    </mesh>
  );
}

function StormCloudLobes({
  band,
  count,
}: {
  band: StormCloudBand;
  count: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const lobes = useMemo(
    () => createStormCloudLobes(count, band),
    [band, count],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uBand: {
        value: band === "core" ? 0 : band === "shelf" ? 0.5 : 1,
      },
    }),
    [band],
  );

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const dark =
      band === "core"
        ? new THREE.Color("#29414a")
        : band === "shelf"
          ? new THREE.Color("#405c66")
          : new THREE.Color("#70878c");
    const light =
      band === "core"
        ? new THREE.Color("#748b91")
        : band === "shelf"
          ? new THREE.Color("#99aaae")
          : new THREE.Color("#d1dddd");

    lobes.forEach((lobe, index) => {
      dummy.position.set(lobe.x, lobe.y, lobe.z);
      dummy.rotation.set(
        lobe.rotation * 0.18,
        lobe.rotation,
        lobe.rotation * 0.11,
      );
      dummy.scale.set(lobe.scaleX, lobe.scaleY, lobe.scaleZ);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
      mesh.current!.setColorAt(
        index,
        color.copy(dark).lerp(light, lobe.shade * 0.68),
      );
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) {
      mesh.current.instanceColor.needsUpdate = true;
    }
    mesh.current.computeBoundingSphere();
  }, [band, lobes]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const time = clock.elapsedTime;
    if (material.current) {
      material.current.uniforms.uTime.value = time;
      material.current.uniforms.uFlash.value = lightningIntensity(time);
    }
    group.current.position.y =
      Math.sin(time * 0.19 + (band === "core" ? 0 : 1.7)) *
      (band === "ground" ? 0.08 : 0.18);
    group.current.rotation.x =
      Math.sin(time * 0.11 + (band === "shelf" ? 0.8 : 0)) * 0.003;
  });

  return (
    <group ref={group} name={`Highstorm ${band} cloud lobes`}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, lobes.length]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry
          args={[
            1,
            band === "core" ? 2 : band === "shelf" ? 2 : 1,
          ]}
        />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={stormCloudVertexShader}
          fragmentShader={stormCloudFragmentShader}
          depthWrite
        />
      </instancedMesh>
    </group>
  );
}

function StormCloudVolume() {
  const width = useThree((state) => state.size.width);
  const mobile = width < 720;

  return (
    <group name="Opaque highstorm cloud volume">
      <StormWallMembrane />
      <StormCloudLobes
        band="core"
        count={mobile ? 108 : 252}
      />
      <StormCloudLobes
        band="shelf"
        count={mobile ? 84 : 180}
      />
      <StormCloudLobes
        band="ground"
        count={mobile ? 72 : 144}
      />
    </group>
  );
}

function Lightning() {
  const group = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const intensity = lightningIntensity(clock.elapsedTime);
    if (group.current) {
      group.current.visible = intensity > 0.03;
      group.current.scale.y = 0.97 + intensity * 0.03;
    }
    if (flash.current) flash.current.intensity = intensity * 44;
  });

  return (
    <>
      <group ref={group} position={[-0.8, 0, 0]}>
        <Line
          points={[
            [0, 22, -18],
            [-0.3, 17, -17],
            [0.45, 12.4, -18.2],
            [-0.2, 7.1, -17.3],
            [0.3, 1.5, -18],
          ]}
          color="#e5fdff"
          lineWidth={1.8}
          transparent
          opacity={0.94}
        />
        <Line
          points={[
            [0.08, 15.8, -17.45],
            [1.2, 12.8, -15.8],
            [0.86, 9.8, -14.9],
          ]}
          color="#b9f7ff"
          lineWidth={1.05}
          transparent
          opacity={0.76}
        />
        <Line
          points={[
            [0.4, 19, 13],
            [-0.2, 14.2, 12.5],
            [0.6, 10.1, 13.7],
            [0, 4.3, 13.2],
          ]}
          color="#a7f3ff"
          lineWidth={1.25}
          transparent
          opacity={0.84}
        />
      </group>
      <pointLight
        ref={flash}
        position={[-2, 13, -4]}
        color="#c5f8ff"
        intensity={0}
        distance={42}
        decay={1.6}
      />
    </>
  );
}

export function Highstorm() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    if (!group.current) return;
    const time = useAtlasStore.getState().simulationTime;
    const stormX = stormXAtTime(time);
    group.current.position.x = stormX;
    highstormWorldBounds.min.set(stormX - 8, -2.5, -42);
    highstormWorldBounds.max.set(stormX + 8, 29, 42);
    highstormProjectionView.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    highstormViewFrustum.setFromProjectionMatrix(
      highstormProjectionView,
    );
    // The particle shaders animate beyond their static buffer bounds, so the
    // child objects cannot use ordinary frustum culling. Cull the complete,
    // conservative storm volume here and submit zero storm draws offscreen.
    group.current.visible =
      highstormViewFrustum.intersectsBox(highstormWorldBounds);
  });

  return (
    <group ref={group} name="Opaque particle-driven highstorm">
      <StormCloudVolume />
      <StormParticleWall />
      <Lightning />
      <pointLight
        position={[2, 8, 0]}
        color="#a9c4c9"
        intensity={34}
        distance={28}
        decay={1.8}
      />
    </group>
  );
}

import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import {
  createStormParticleField,
  lightningIntensity,
  type StormParticleBand,
} from "./stormParticles";
import { stormXAtTime } from "./storm";

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
        blending={
          band === "debris"
            ? THREE.NormalBlending
            : THREE.AdditiveBlending
        }
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
        count={mobile ? 1850 : 4100}
        color="#8ec8d8"
        opacity={mobile ? 0.46 : 0.4}
        pointScale={mobile ? 2.15 : 2.45}
      />
      <StormParticleLayer
        band="rain"
        count={mobile ? 820 : 1900}
        color="#d5edf1"
        opacity={0.24}
        pointScale={mobile ? 1.45 : 1.7}
        position={[1.5, 1.1, -1.8]}
      />
      <StormParticleLayer
        band="spray"
        count={mobile ? 620 : 1500}
        color="#b9e4e7"
        opacity={mobile ? 0.3 : 0.34}
        pointScale={mobile ? 1.75 : 2.2}
        position={[-1.3, 0, 0]}
      />
      <StormParticleLayer
        band="debris"
        count={mobile ? 90 : 250}
        color="#3c3229"
        opacity={0.72}
        pointScale={mobile ? 2.15 : 2.7}
        position={[-0.6, 0, 0]}
      />
      <mesh position={[-2.8, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[15, 74]} />
        <meshBasicMaterial
          color="#061117"
          transparent
          opacity={0.31}
          depthWrite={false}
        />
      </mesh>
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

  useFrame(() => {
    if (!group.current) return;
    const time = useAtlasStore.getState().simulationTime;
    group.current.position.x = stormXAtTime(time);
  });

  return (
    <group ref={group} name="Particle-driven highstorm">
      <StormParticleWall />
      <Lightning />
    </group>
  );
}

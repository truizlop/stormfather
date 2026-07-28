import { Line, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { stormXAtTime } from "./storm";

function StormPlanes() {
  const texture = useTexture(
    `${import.meta.env.BASE_URL}textures/highstorm-density.jpg`,
  );

  const configuredTexture = useMemo(() => {
    const copy = texture.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(3.4, 1.25);
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [texture]);

  return (
    <group>
      {[
        { x: 0, y: 11, opacity: 0.78, color: "#9fc7d7", scale: 1 },
        { x: 1.4, y: 12.5, opacity: 0.52, color: "#5b7d91", scale: 1.08 },
        { x: -1.8, y: 9.6, opacity: 0.42, color: "#d5e6ea", scale: 0.93 },
      ].map((layer, index) => (
        <mesh
          key={index}
          position={[layer.x, layer.y, 0]}
          rotation-y={Math.PI / 2}
          scale={[layer.scale, layer.scale, layer.scale]}
          renderOrder={10 + index}
        >
          <planeGeometry args={[68, 24, 1, 1]} />
          <meshBasicMaterial
            map={configuredTexture}
            alphaMap={configuredTexture}
            color={layer.color}
            transparent
            opacity={layer.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh position={[-3.5, 1.42, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[13, 70]} />
        <meshBasicMaterial
          color="#071017"
          transparent
          opacity={0.36}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function RainCurtain() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(900 * 3);
    for (let index = 0; index < 900; index += 1) {
      values[index * 3] = -5 + ((index * 37) % 100) / 10;
      values[index * 3 + 1] = 0.4 + ((index * 71) % 220) / 10;
      values[index * 3 + 2] = -34 + ((index * 97) % 680) / 10;
    }
    return values;
  }, []);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const position = points.geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index) - delta * (15 + (index % 7));
      position.setY(index, y < 0.4 ? 20 + (index % 31) * 0.1 : y);
      position.setX(index, position.getX(index) - delta * 2.2);
      if (position.getX(index) < -7) {
        position.setX(index, 5);
      }
    }
    position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#9ad9ea"
        size={0.06}
        transparent
        opacity={0.56}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Lightning() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const pulse =
      Math.sin(clock.elapsedTime * 4.7) + Math.sin(clock.elapsedTime * 12.3);
    group.current.visible = pulse > 1.35;
  });

  return (
    <group ref={group} position={[-0.8, 0, 0]}>
      <Line
        points={[
          [0, 21, -18],
          [-0.3, 16, -17],
          [0.45, 12, -18.2],
          [-0.2, 7, -17.3],
          [0.3, 2.2, -18],
        ]}
        color="#d9fbff"
        lineWidth={1.35}
        transparent
        opacity={0.9}
      />
      <Line
        points={[
          [0.4, 18, 13],
          [-0.2, 14, 12.5],
          [0.6, 10, 13.7],
          [0, 5, 13.2],
        ]}
        color="#a7f3ff"
        lineWidth={1.1}
        transparent
        opacity={0.82}
      />
    </group>
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
    <group ref={group}>
      <StormPlanes />
      <RainCurtain />
      <Lightning />
    </group>
  );
}

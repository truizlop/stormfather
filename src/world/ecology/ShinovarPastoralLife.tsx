import { useFrame } from "@react-three/fiber";
import {
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref,
} from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { metersToLocal } from "../scale";
import { localSurfaceY } from "../terrain/localSurface";
import type { DetailLevel } from "../types";
import { stormProximity, stormXAtTime } from "../weather/storm";
import type { NavigationRoute } from "../actors/pedestrianNavigation";
import {
  advanceCreatureMotionClock,
  type CreatureMotion,
  type CreatureSeed,
} from "./ecology";
import {
  createShinovarShepherdAssignments,
  SHINOVAR_SHEPHERD_SCALE,
  writeShinovarShepherdMotion,
  type ShinovarShepherdAssignment,
} from "./shinovarPastoral";

interface ShepherdRigHandle {
  update: (gaitPhase: number, pace: number, stormStrength: number) => void;
}

function ShepherdModel({
  rigRef,
  ordinal,
}: {
  rigRef?: Ref<ShepherdRigHandle>;
  ordinal: number;
}) {
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const cloak = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const cloth = ordinal % 2 === 0 ? "#6d7f54" : "#846f4c";
  const accent = ordinal % 2 === 0 ? "#c5a45b" : "#8a9b66";
  useImperativeHandle(rigRef, () => ({
    update(gaitPhase, pace, stormStrength) {
      const storm = Math.max(0, Math.min(1, stormStrength));
      const gait = pace > 0.001 ? Math.sin(gaitPhase) * 0.38 : 0;
      if (leftLeg.current) leftLeg.current.rotation.x = gait;
      if (rightLeg.current) rightLeg.current.rotation.x = -gait;
      if (leftArm.current) leftArm.current.rotation.x = -gait * 0.68;
      if (rightArm.current) {
        rightArm.current.rotation.x = 0.12 + gait * 0.16;
      }
      if (cloak.current) {
        cloak.current.rotation.x =
          0.08 + storm * 0.32 + Math.sin(gaitPhase * 0.5) * 0.025;
      }
      if (head.current) head.current.rotation.x = storm * 0.13;
    },
  }));
  return (
    <group name={`Shin shepherd ${ordinal + 1}`}>
      <group
        ref={leftLeg}
        position={[-metersToLocal(0.12), metersToLocal(0.72), 0]}
      >
        <mesh position={[0, -metersToLocal(0.32), 0]} castShadow>
          <cylinderGeometry
            args={[
              metersToLocal(0.075),
              metersToLocal(0.09),
              metersToLocal(0.64),
              7,
            ]}
          />
          <meshStandardMaterial color="#4a4031" roughness={0.92} />
        </mesh>
      </group>
      <group
        ref={rightLeg}
        position={[metersToLocal(0.12), metersToLocal(0.72), 0]}
      >
        <mesh position={[0, -metersToLocal(0.32), 0]} castShadow>
          <cylinderGeometry
            args={[
              metersToLocal(0.075),
              metersToLocal(0.09),
              metersToLocal(0.64),
              7,
            ]}
          />
          <meshStandardMaterial color="#4a4031" roughness={0.92} />
        </mesh>
      </group>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`boot-${side}`}
          position={[
            side * metersToLocal(0.12),
            metersToLocal(0.035),
            -metersToLocal(0.035),
          ]}
          castShadow
        >
          <boxGeometry
            args={[
              metersToLocal(0.17),
              metersToLocal(0.07),
              metersToLocal(0.28),
            ]}
          />
          <meshStandardMaterial color="#332a20" roughness={0.96} />
        </mesh>
      ))}
      <mesh
        position={[0, metersToLocal(1.04), 0]}
        scale={[
          metersToLocal(0.29),
          metersToLocal(0.34),
          metersToLocal(0.2),
        ]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={cloth} roughness={0.94} />
      </mesh>
      <mesh
        ref={cloak}
        position={[0, metersToLocal(1.02), metersToLocal(0.12)]}
        rotation-x={0.08}
        castShadow
      >
        <coneGeometry
          args={[
            metersToLocal(0.37),
            metersToLocal(0.78),
            7,
            1,
            true,
          ]}
        />
        <meshStandardMaterial
          color={accent}
          roughness={0.98}
          side={THREE.DoubleSide}
        />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group
          key={`arm-${side}`}
          ref={side < 0 ? leftArm : rightArm}
          position={[
            side * metersToLocal(0.35),
            metersToLocal(1.25),
            0,
          ]}
        >
          <mesh position={[0, -metersToLocal(0.27), 0]} castShadow>
            <cylinderGeometry
              args={[
                metersToLocal(0.055),
                metersToLocal(0.07),
                metersToLocal(0.54),
                7,
              ]}
            />
            <meshStandardMaterial color={cloth} roughness={0.94} />
          </mesh>
        </group>
      ))}
      <group
        ref={head}
        position={[0, metersToLocal(1.56), 0]}
      >
        <mesh scale={metersToLocal(0.16)} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#ba865f" roughness={0.78} />
        </mesh>
        <mesh
          position={[0, metersToLocal(0.15), 0]}
          scale={[
            metersToLocal(0.22),
            metersToLocal(0.07),
            metersToLocal(0.2),
          ]}
          castShadow
        >
          <cylinderGeometry args={[1, 1.08, 1, 9]} />
          <meshStandardMaterial color="#736443" roughness={0.96} />
        </mesh>
      </group>
      <mesh
        position={[
          metersToLocal(0.34),
          SHINOVAR_SHEPHERD_SCALE.staffHeightLocal / 2,
          -metersToLocal(0.02),
        ]}
        rotation-z={-0.04}
        castShadow
      >
        <cylinderGeometry
          args={[
            metersToLocal(0.025),
            metersToLocal(0.032),
            SHINOVAR_SHEPHERD_SCALE.staffHeightLocal,
            7,
          ]}
        />
        <meshStandardMaterial color="#594126" roughness={0.98} />
      </mesh>
    </group>
  );
}

function ShepherdActor({
  assignment,
  center,
}: {
  assignment: ShinovarShepherdAssignment;
  center: readonly [number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const rig = useRef<ShepherdRigHandle>(null);
  const motion = useRef<CreatureMotion>({
    x: 0,
    z: 0,
    heading: 0,
    crouch: 1,
    pace: 0,
    gaitPhase: assignment.leaderSeed.phase,
  });
  const motionClock = useRef(Number.NaN);
  const lastSimulationTime = useRef(Number.NaN);
  const previousStorm = useRef(0);
  const smoothedHeading = useRef(Number.NaN);

  useFrame((_, delta) => {
    if (!group.current) return;
    const simulationTime = useAtlasStore.getState().simulationTime;
    const storm = stormProximity(
      stormXAtTime(simulationTime),
      center[0],
    );
    if (!Number.isFinite(lastSimulationTime.current)) {
      motionClock.current = simulationTime;
    } else {
      motionClock.current = advanceCreatureMotionClock(
        motionClock.current,
        simulationTime - lastSimulationTime.current,
        assignment.leaderSeed.species,
        previousStorm.current,
        storm,
      );
    }
    lastSimulationTime.current = simulationTime;
    previousStorm.current = storm;
    const pose = writeShinovarShepherdMotion(
      motion.current,
      assignment,
      motionClock.current,
      storm,
    );
    const surfaceY = localSurfaceY("shinovar", pose.x, pose.z);
    group.current.position.set(
      pose.x,
      surfaceY,
      pose.z,
    );
    const targetHeading = pose.heading + Math.PI;
    if (!Number.isFinite(smoothedHeading.current)) {
      smoothedHeading.current = targetHeading;
    } else {
      const headingDelta = Math.atan2(
        Math.sin(targetHeading - smoothedHeading.current),
        Math.cos(targetHeading - smoothedHeading.current),
      );
      smoothedHeading.current +=
        headingDelta * (1 - Math.exp(-delta * 9));
    }
    group.current.rotation.y = smoothedHeading.current;
    group.current.rotation.z = -storm * 0.075;

    rig.current?.update(pose.gaitPhase, pose.pace, storm);
  });

  return (
    <group
      ref={group}
      name={`${assignment.occupation} ${assignment.id}`}
    >
      <ShepherdModel rigRef={rig} ordinal={assignment.ordinal} />
    </group>
  );
}

function StoneWallRun({
  end,
  id,
  segments,
  start,
}: {
  end: readonly [number, number];
  id: string;
  segments: number;
  start: readonly [number, number];
}) {
  const deltaX = end[0] - start[0];
  const deltaZ = end[1] - start[1];
  const length = Math.hypot(deltaX, deltaZ);
  const segmentLength = length / segments;
  const rotation = Math.atan2(deltaZ, deltaX);
  const wallHeight = metersToLocal(1.08);
  const wallDepth = metersToLocal(0.46);
  return (
    <group name={id}>
      {Array.from({ length: segments }, (_, index) => {
        const amount = (index + 0.5) / segments;
        const x = start[0] + deltaX * amount;
        const z = start[1] + deltaZ * amount;
        const y = localSurfaceY("shinovar", x, z);
        return (
          <mesh
            key={`${id}-${index}`}
            position={[
              x,
              y + wallHeight / 2 - metersToLocal(0.1),
              z,
            ]}
            rotation-y={-rotation}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[
                segmentLength * 0.96,
                wallHeight * (0.92 + (index % 2) * 0.08),
                wallDepth,
              ]}
            />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#777661" : "#666b55"}
              roughness={0.99}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function PastureStormbreak({
  route,
}: {
  route: NavigationRoute;
}) {
  const shelter = route.points[route.points.length - 1];
  if (!shelter) return null;
  const approach = route.points[route.points.length - 2] ?? shelter;
  const eastWallX = shelter.x + metersToLocal(2.15);
  const halfWidth = metersToLocal(3.2);
  const gateHalfWidth = metersToLocal(0.72);
  const minimumFlankLength = metersToLocal(0.7);
  const eastwardDistance = approach.x - shelter.x;
  const approachAmount =
    eastwardDistance > 0.0001
      ? Math.max(
          0,
          Math.min(
            1,
            (eastWallX - shelter.x) / eastwardDistance,
          ),
        )
      : 0;
  const gateZ = Math.max(
    shelter.z -
      halfWidth +
      gateHalfWidth +
      minimumFlankLength,
    Math.min(
      shelter.z +
        halfWidth -
        gateHalfWidth -
        minimumFlankLength,
      shelter.z +
        (approach.z - shelter.z) * approachAmount,
    ),
  );
  const wingEndX = shelter.x - metersToLocal(0.8);
  return (
    <group name={`Pasture stormbreak ${route.id}`}>
      <StoneWallRun
        id={`${route.id}-east-wall-north`}
        start={[eastWallX, shelter.z - halfWidth]}
        end={[eastWallX, gateZ - gateHalfWidth]}
        segments={2}
      />
      <StoneWallRun
        id={`${route.id}-east-wall-south`}
        start={[eastWallX, gateZ + gateHalfWidth]}
        end={[eastWallX, shelter.z + halfWidth]}
        segments={2}
      />
      <StoneWallRun
        id={`${route.id}-north-wing`}
        start={[eastWallX, shelter.z - halfWidth]}
        end={[wingEndX, shelter.z - halfWidth]}
        segments={3}
      />
      <StoneWallRun
        id={`${route.id}-south-wing`}
        start={[eastWallX, shelter.z + halfWidth]}
        end={[wingEndX, shelter.z + halfWidth]}
        segments={3}
      />
    </group>
  );
}

export function ShinovarPastoralLife({
  center,
  compactViewport,
  creatureSeeds,
  detailLevel,
  routeByCreatureId,
}: {
  center: readonly [number, number];
  compactViewport: boolean;
  creatureSeeds: readonly CreatureSeed[];
  detailLevel: DetailLevel;
  routeByCreatureId: ReadonlyMap<string, NavigationRoute>;
}) {
  const sheepSeeds = useMemo(
    () => creatureSeeds.filter((seed) => seed.species === "sheep"),
    [creatureSeeds],
  );
  const shepherds = useMemo(
    () =>
      createShinovarShepherdAssignments(
        sheepSeeds,
        routeByCreatureId,
        detailLevel,
        compactViewport,
      ),
    [
      compactViewport,
      detailLevel,
      routeByCreatureId,
      sheepSeeds,
    ],
  );

  return (
    <group name="Shinovar pastoral life">
      {shepherds.map((assignment) => (
        <group key={assignment.id}>
          <PastureStormbreak route={assignment.route} />
          <ShepherdActor assignment={assignment} center={center} />
        </group>
      ))}
    </group>
  );
}

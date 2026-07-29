import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import { localSurfaceY } from "../terrain/localSurface";
import { terrainHeightAt } from "../terrain/terrainHeight";
import { stormProximity, stormXAtTime } from "../weather/storm";
import { CreatureModel } from "./CreatureModels";
import {
  createCreatureSeeds,
  createSprenSeeds,
  creatureMotionAt,
  sprenBehaviorAt,
  type CreatureSeed,
  type SprenSeed,
} from "./ecology";
import { SprenModel } from "./SprenModel";

function CreatureActor({
  center,
  locationId,
  seed,
}: {
  center: readonly [number, number];
  locationId: string;
  seed: CreatureSeed;
}) {
  const group = useRef<THREE.Group>(null);
  const previous = useRef(new THREE.Vector2());

  useFrame(() => {
    if (!group.current) return;
    const simulationTime = useAtlasStore.getState().simulationTime;
    const storm = stormProximity(
      stormXAtTime(simulationTime),
      center[0],
    );
    const pose = creatureMotionAt(seed, simulationTime, storm);
    const x = center[0] + pose.x;
    const z = center[1] + pose.z;
    const flying = seed.species === "skyeel";
    const surfaceY = flying
      ? terrainHeightAt(x, z)
      : localSurfaceY(locationId, x, z);
    const altitude = flying
      ? 0.72 +
        Math.sin(simulationTime * pose.pace * 2.4 + seed.phase) * 0.22 +
        storm * 0.35
      : 0.015;
    const gait = Math.sin(simulationTime * pose.pace * 8 + seed.phase);
    group.current.position.set(
      x,
      surfaceY + altitude + (flying ? 0 : Math.abs(gait) * 0.018 * seed.scale),
      z,
    );
    const dx = x - previous.current.x;
    const dz = z - previous.current.y;
    if (Math.hypot(dx, dz) > 0.0001) {
      group.current.rotation.y = Math.atan2(dx, dz);
    } else {
      group.current.rotation.y = pose.heading;
    }
    group.current.rotation.z =
      (flying ? Math.sin(simulationTime * 0.9 + seed.phase) * 0.12 : 0) -
      storm * (flying ? 0.3 : 0.08);
    group.current.scale.set(
      seed.scale,
      seed.scale * pose.crouch,
      seed.scale,
    );
    previous.current.set(x, z);
  });

  return (
    <group ref={group} name={`${seed.species} ${seed.id}`}>
      <CreatureModel species={seed.species} />
    </group>
  );
}

function SprenActor({
  center,
  locationId,
  seed,
}: {
  center: readonly [number, number];
  locationId: string;
  seed: SprenSeed;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const simulationTime = useAtlasStore.getState().simulationTime;
    const storm = stormProximity(
      stormXAtTime(simulationTime),
      center[0],
    );
    const behavior = sprenBehaviorAt(seed.type, storm);
    const orbit =
      seed.angle + simulationTime * 0.16 * behavior.speed + seed.phase * 0.1;
    const pulse =
      0.82 + Math.sin(simulationTime * behavior.speed * 2.2 + seed.phase) * 0.18;
    const x =
      center[0] +
      Math.cos(orbit) * seed.radius -
      behavior.stormDrift;
    const z =
      center[1] +
      Math.sin(orbit) * seed.radius * 0.72 +
      Math.sin(simulationTime * 0.7 + seed.phase) * 0.18;
    const surfaceY = localSurfaceY(locationId, x, z);
    const grounded = seed.type === "fearspren";
    group.current.position.set(
      x,
      surfaceY +
        (grounded ? 0.035 : seed.altitude * behavior.heightMultiplier) +
        (grounded ? 0 : Math.sin(orbit * 2 + seed.phase) * 0.08),
      z,
    );
    const scale = pulse * behavior.visibility;
    group.current.scale.setScalar(Math.max(0.001, scale));
    group.current.rotation.set(
      Math.sin(orbit + seed.phase) * 0.16,
      -orbit + storm * 0.45,
      Math.cos(orbit * 0.7) * 0.2,
    );
    group.current.visible = behavior.visibility > 0.08;
  });

  return (
    <group ref={group} name={`${seed.type} ${seed.id}`}>
      <SprenModel type={seed.type} />
    </group>
  );
}

/**
 * A selected-habitat ecology layer. It intentionally owns no global scene
 * state: integration only requires rendering this component beside the other
 * world simulation layers.
 */
export function RosharEcology() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const compactViewport = useThree((state) => state.size.width < 760);
  const location = locationById.get(selectedId);
  const creatureSeeds = useMemo(
    () =>
      location
        ? createCreatureSeeds(location.id, detailLevel, compactViewport)
        : [],
    [compactViewport, detailLevel, location],
  );
  const sprenSeeds = useMemo(
    () =>
      location
        ? createSprenSeeds(location.id, detailLevel, compactViewport)
        : [],
    [compactViewport, detailLevel, location],
  );

  if (!location || (creatureSeeds.length === 0 && sprenSeeds.length === 0)) {
    return null;
  }

  const center = [location.coordinates.x, location.coordinates.z] as const;
  return (
    <group name={`Living ecology of ${location.name}`}>
      <group name="Rosharan fauna">
        {creatureSeeds.map((seed) => (
          <CreatureActor
            key={seed.id}
            center={center}
            locationId={location.id}
            seed={seed}
          />
        ))}
      </group>
      <group name="Rosharan spren">
        {sprenSeeds.map((seed) => (
          <SprenActor
            key={seed.id}
            center={center}
            locationId={location.id}
            seed={seed}
          />
        ))}
      </group>
    </group>
  );
}

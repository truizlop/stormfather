import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { landmarkAssetUrl } from "../assets/landmarkAssets";
import { isCompactViewport } from "../compactViewport";
import {
  createNavigationField,
  landmarkNavigationObstacles,
  type NavigationPoint,
  type NavigationRoute,
} from "../actors/pedestrianNavigation";
import { createDistrictLayout } from "../cities/districtLayout";
import {
  landmarkLocalScale,
  landmarkRotationY,
} from "../cities/landmarkMetrics";
import { cityProfile } from "../cities/profiles";
import { locationById } from "../locations";
import { localSurfaceY } from "../terrain/localSurface";
import { detailedLocationSurface } from "../terrain/locationSurface";
import { terrainHeightAt } from "../terrain/terrainHeight";
import type { DetailLevel, WorldLocation } from "../types";
import { stormProximity, stormXAtTime } from "../weather/storm";
import {
  CreatureModel,
  type CreatureRigHandle,
} from "./CreatureModels";
import {
  CHASMFIEND_FOOT_COUNT,
  advanceCreatureMotionClock,
  creatureCollisionClearance,
  createCreatureSeeds,
  createSprenSeeds,
  resolveEcologyLocationId,
  shinovarPastoralBudget,
  sprenBehaviorAt,
  writeCreatureMotion,
  writeChasmfiendFootContact,
  writePastoralCreatureMotion,
  writeRoutedCreatureMotion,
  type CreatureMotion,
  type CreatureSeed,
  type CreatureSpecies,
  type SprenSeed,
} from "./ecology";
import { SprenModel } from "./SprenModel";
import {
  assignUniqueCreatureRoutes,
  assignShinovarHerdRoutes,
  createShinovarPastureRoutes,
  ecologyLandmarkCollisionRoot,
  ecologyLayoutViewportWidth,
  fallbackCreatureRoutes,
  isEcologyWalkableSupportObstacle,
} from "./ecologyNavigation";
import { ShinovarPastoralLife } from "./ShinovarPastoralLife";

const EMPTY_CREATURE_ROUTES = new Map<string, NavigationRoute>();

function CreatureActor({
  center,
  compact,
  locationId,
  route,
  seed,
}: {
  center: readonly [number, number];
  compact: boolean;
  locationId: string;
  route?: NavigationRoute;
  seed: CreatureSeed;
}) {
  const group = useRef<THREE.Group>(null);
  const rig = useRef<CreatureRigHandle>(null);
  const motion = useRef<CreatureMotion>({
    x: 0,
    z: 0,
    heading: 0,
    crouch: 1,
    pace: 0,
    gaitPhase: seed.phase,
  });
  const smoothedHeading = useRef(Number.NaN);
  const footContacts = useRef(
    seed.species === "chasmfiend"
      ? Array.from(
          { length: CHASMFIEND_FOOT_COUNT },
          () => ({ x: 0, z: 0 }),
        )
      : [],
  );
  const footTargets = useRef(
    new Float32Array(
      seed.species === "chasmfiend" ? CHASMFIEND_FOOT_COUNT : 0,
    ),
  );
  const footOffsets = useRef(
    new Float32Array(
      seed.species === "chasmfiend" ? CHASMFIEND_FOOT_COUNT : 0,
    ),
  );
  const groundTarget = useRef(Number.NaN);
  const groundCurrent = useRef(Number.NaN);
  const pitchTarget = useRef(0);
  const pitchCurrent = useRef(0);
  const rollTarget = useRef(0);
  const rollCurrent = useRef(0);
  const lastGroundTick = useRef(Number.NaN);
  const motionClock = useRef(Number.NaN);
  const lastSimulationTime = useRef(Number.NaN);
  const previousStorm = useRef(0);

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
        seed.species,
        previousStorm.current,
        storm,
      );
    }
    lastSimulationTime.current = simulationTime;
    previousStorm.current = storm;
    const pose = route
      ? seed.species === "sheep"
        ? writePastoralCreatureMotion(
            motion.current,
            seed,
            route,
            motionClock.current,
            storm,
          )
        : writeRoutedCreatureMotion(
            motion.current,
            seed,
            route,
            motionClock.current,
            storm,
          )
      : writeCreatureMotion(
          motion.current,
          seed,
          motionClock.current,
          storm,
        );
    const x = route ? pose.x : center[0] + pose.x;
    const z = route ? pose.z : center[1] + pose.z;
    const flying = seed.species === "skyeel";
    const chasmfiend = seed.species === "chasmfiend";
    let surfaceY: number;
    let plantedFootOffsets: Float32Array | undefined;
    if (chasmfiend) {
      const groundTick = Math.floor(simulationTime * 12);
      if (groundTick !== lastGroundTick.current) {
        const actorYaw = pose.heading + Math.PI;
        const cosYaw = Math.cos(actorYaw);
        const sinYaw = Math.sin(actorYaw);
        let contactXTotal = 0;
        let contactZTotal = 0;
        let terrainTotal = 0;
        for (
          let legIndex = 0;
          legIndex < CHASMFIEND_FOOT_COUNT;
          legIndex += 1
        ) {
          const contact = footContacts.current[legIndex];
          writeChasmfiendFootContact(
            contact,
            legIndex,
            pose.gaitPhase,
            storm,
          );
          const footX =
            x +
            seed.scale *
              (cosYaw * contact.x + sinYaw * contact.z);
          const footZ =
            z +
            seed.scale *
              (-sinYaw * contact.x + cosYaw * contact.z);
          const terrainY = localSurfaceY(locationId, footX, footZ);
          footTargets.current[legIndex] = terrainY;
          contactXTotal += contact.x;
          contactZTotal += contact.z;
          terrainTotal += terrainY;
        }
        const meanContactX = contactXTotal / CHASMFIEND_FOOT_COUNT;
        const meanContactZ = contactZTotal / CHASMFIEND_FOOT_COUNT;
        const meanTerrainY = terrainTotal / CHASMFIEND_FOOT_COUNT;
        let covarianceXX = 0;
        let covarianceXZ = 0;
        let covarianceZZ = 0;
        let covarianceXY = 0;
        let covarianceZY = 0;
        for (
          let legIndex = 0;
          legIndex < CHASMFIEND_FOOT_COUNT;
          legIndex += 1
        ) {
          const contact = footContacts.current[legIndex];
          const centeredX = contact.x - meanContactX;
          const centeredZ = contact.z - meanContactZ;
          const centeredY = footTargets.current[legIndex] - meanTerrainY;
          covarianceXX += centeredX * centeredX;
          covarianceXZ += centeredX * centeredZ;
          covarianceZZ += centeredZ * centeredZ;
          covarianceXY += centeredX * centeredY;
          covarianceZY += centeredZ * centeredY;
        }
        const determinant =
          covarianceXX * covarianceZZ - covarianceXZ * covarianceXZ;
        const slopeX =
          Math.abs(determinant) <= 0.000001
            ? 0
            : (covarianceXY * covarianceZZ -
                covarianceZY * covarianceXZ) /
              determinant;
        const slopeZ =
          Math.abs(determinant) <= 0.000001
            ? 0
            : (covarianceZY * covarianceXX -
                covarianceXY * covarianceXZ) /
              determinant;
        const terrainIntercept =
          meanTerrainY - slopeX * meanContactX - slopeZ * meanContactZ;
        groundTarget.current = terrainIntercept;
        pitchTarget.current = Math.max(
          -0.62,
          Math.min(0.62, -Math.atan2(slopeZ, seed.scale)),
        );
        rollTarget.current = Math.max(
          -0.62,
          Math.min(0.62, Math.atan2(slopeX, seed.scale)),
        );
        const verticalScale = Math.max(
          0.001,
          seed.scale * pose.crouch,
        );
        for (
          let legIndex = 0;
          legIndex < CHASMFIEND_FOOT_COUNT;
          legIndex += 1
        ) {
          const contact = footContacts.current[legIndex];
          const fittedTerrainY =
            terrainIntercept + slopeX * contact.x + slopeZ * contact.z;
          footTargets.current[legIndex] =
            (footTargets.current[legIndex] - fittedTerrainY) /
            verticalScale;
        }
        if (!Number.isFinite(groundCurrent.current)) {
          groundCurrent.current = groundTarget.current;
          footOffsets.current.set(footTargets.current);
          pitchCurrent.current = pitchTarget.current;
          rollCurrent.current = rollTarget.current;
        }
        lastGroundTick.current = groundTick;
      }
      const groundingBlend = 1 - Math.exp(-delta * 14);
      groundCurrent.current +=
        (groundTarget.current - groundCurrent.current) * groundingBlend;
      pitchCurrent.current +=
        (pitchTarget.current - pitchCurrent.current) * groundingBlend;
      rollCurrent.current +=
        (rollTarget.current - rollCurrent.current) * groundingBlend;
      for (
        let legIndex = 0;
        legIndex < CHASMFIEND_FOOT_COUNT;
        legIndex += 1
      ) {
        footOffsets.current[legIndex] +=
          (footTargets.current[legIndex] -
            footOffsets.current[legIndex]) *
          groundingBlend;
      }
      surfaceY = groundCurrent.current;
      plantedFootOffsets = footOffsets.current;
    } else {
      surfaceY = flying
        ? terrainHeightAt(x, z)
        : localSurfaceY(locationId, x, z);
    }
    const altitude = flying
      ? 0.72 +
        Math.sin(
          motionClock.current * seed.speed * 2.4 + seed.phase,
        ) *
          0.22 +
        storm * 0.35
      : chasmfiend
        ? 0
        : seed.species === "sheep"
          ? -0.0015
          : 0.015;
    const gait = pose.pace > 0.001 ? Math.sin(pose.gaitPhase) : 0;
    group.current.position.set(
      x,
      surfaceY +
        altitude +
        (flying
          ? 0
          : Math.abs(gait) * (chasmfiend ? 0 : 0.018) * seed.scale),
      z,
    );
    const targetHeading = pose.heading + Math.PI;
    if (!Number.isFinite(smoothedHeading.current)) {
      smoothedHeading.current = targetHeading;
    } else {
      const headingDelta = Math.atan2(
        Math.sin(targetHeading - smoothedHeading.current),
        Math.cos(targetHeading - smoothedHeading.current),
      );
      const headingBlend =
        1 - Math.exp(-delta * (chasmfiend ? 12 : pose.pace > 0 ? 9 : 5));
      smoothedHeading.current += headingDelta * headingBlend;
    }
    group.current.rotation.x = chasmfiend ? pitchCurrent.current : 0;
    group.current.rotation.y = smoothedHeading.current;
    group.current.rotation.z = chasmfiend
      ? rollCurrent.current
      : (flying
          ? Math.sin(simulationTime * 0.9 + seed.phase) * 0.12
          : 0) - storm * (flying ? 0.3 : 0.045);
    group.current.scale.set(
      seed.scale,
      seed.scale * pose.crouch,
      seed.scale,
    );
    rig.current?.update(pose.gaitPhase, storm, plantedFootOffsets);
  });

  return (
    <group ref={group} name={`${seed.species} ${seed.id}`}>
      <CreatureModel
        species={seed.species}
        rigRef={rig}
        compact={compact}
      />
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

function EcologyActors({
  center,
  compactViewport,
  creatureSeeds,
  location,
  routeByCreatureId,
  sprenSeeds,
}: {
  center: readonly [number, number];
  compactViewport: boolean;
  creatureSeeds: readonly CreatureSeed[];
  location: WorldLocation;
  routeByCreatureId: ReadonlyMap<string, NavigationRoute>;
  sprenSeeds: readonly SprenSeed[];
}) {
  return (
    <group name={`Living ecology of ${location.name}`}>
      <group name="Rosharan fauna">
        {creatureSeeds.map((seed) => {
          const route = routeByCreatureId.get(seed.id);
          if (
            seed.species !== "chasmfiend" &&
            seed.species !== "skyeel" &&
            !route
          ) {
            return null;
          }
          return (
            <CreatureActor
              key={seed.id}
              center={center}
              compact={compactViewport}
              locationId={location.id}
              route={route}
              seed={seed}
            />
          );
        })}
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

/**
 * The 53 MB authored landmark graph is required only to derive collision
 * envelopes for ground fauna. Keeping this hook in a city/street-only child
 * preserves the cold continent/region path where ecology budgets are zero.
 */
function RoutedCityEcology({
  center,
  compactViewport,
  creatureSeeds,
  detailLevel,
  location,
  sprenSeeds,
  layoutViewportWidth,
}: {
  center: readonly [number, number];
  compactViewport: boolean;
  creatureSeeds: readonly CreatureSeed[];
  detailLevel: DetailLevel;
  location: WorldLocation;
  sprenSeeds: readonly SprenSeed[];
  layoutViewportWidth: number;
}) {
  const { scene } = useGLTF(landmarkAssetUrl(location.modelRoot!));
  const navigation = useMemo(() => {
    const profile = cityProfile(location.id, location.culture);
    const layout = createDistrictLayout(
      profile,
      location.id,
      center,
      detailLevel,
      layoutViewportWidth,
    );
    const collisionRoot = ecologyLandmarkCollisionRoot(
      location.modelRoot,
      detailLevel,
    );
    const landmarkObstacles =
      collisionRoot
        ? landmarkNavigationObstacles(
            scene,
            collisionRoot,
            center,
            landmarkLocalScale(collisionRoot, profile),
            landmarkRotationY(location.id),
          ).filter(
            (obstacle) =>
              !isEcologyWalkableSupportObstacle(obstacle.id),
          )
        : [];
    const surface = detailedLocationSurface(location.id);
    const navigationSurface = surface
      ? {
          isWalkable: ({ x, z }: NavigationPoint) =>
            surface.containsWalkablePoint(x, z, "pedestrian"),
          heightAt: ({ x, z }: NavigationPoint) =>
            surface.walkableY(x, z, "pedestrian"),
          maximumStepHeight: surface.maximumStepHeight,
          maximumSlope: surface.maximumWalkSlope,
        }
      : undefined;
    return createNavigationField(
      location.id,
      profile,
      center,
      layout,
      landmarkObstacles,
      navigationSurface,
    );
  }, [center, detailLevel, layoutViewportWidth, location, scene]);
  const routeByCreatureId = useMemo(() => {
    const routedSpecies = new Map<CreatureSpecies, CreatureSeed[]>();
    for (const seed of creatureSeeds) {
      if (
        seed.species === "chasmfiend" ||
        seed.species === "skyeel" ||
        seed.species === "sheep"
      ) {
        continue;
      }
      const speciesSeeds = routedSpecies.get(seed.species) ?? [];
      speciesSeeds.push(seed);
      routedSpecies.set(seed.species, speciesSeeds);
    }
    const routesBySpecies = new Map<
      CreatureSpecies,
      readonly NavigationRoute[]
    >();
    for (const speciesSeeds of routedSpecies.values()) {
      const widestSeed = speciesSeeds.reduce((widest, seed) =>
        creatureCollisionClearance(seed) >
        creatureCollisionClearance(widest)
          ? seed
          : widest,
      );
      const validRoutes = fallbackCreatureRoutes(
        navigation,
        widestSeed,
        navigation.routes,
      );
      routesBySpecies.set(widestSeed.species, validRoutes);
    }
    const assignments = assignUniqueCreatureRoutes(
      creatureSeeds
        .filter(
          (seed) =>
            seed.species !== "chasmfiend" &&
            seed.species !== "skyeel" &&
            seed.species !== "sheep",
        )
        .map((seed) => ({
          seed,
          routes: routesBySpecies.get(seed.species) ?? [],
        })),
    );
    if (location.id !== "shinovar") return assignments;

    const sheepSeeds = creatureSeeds.filter(
      (seed) => seed.species === "sheep",
    );
    if (sheepSeeds.length === 0) return assignments;
    const widestSheep = sheepSeeds.reduce((widest, seed) =>
      creatureCollisionClearance(seed) >
      creatureCollisionClearance(widest)
        ? seed
        : widest,
    );
    const pastureRoutes = createShinovarPastureRoutes(
      navigation,
      widestSheep,
      [...navigation.routes, ...assignments.values()],
    );
    const herdCount = shinovarPastoralBudget(
      detailLevel,
      compactViewport,
    ).shepherds;
    const herdAssignments = assignShinovarHerdRoutes(
      sheepSeeds,
      pastureRoutes,
      herdCount,
    );
    for (const [seedId, route] of herdAssignments) {
      assignments.set(seedId, route);
    }
    return assignments;
  }, [
    compactViewport,
    creatureSeeds,
    detailLevel,
    location.id,
    navigation,
  ]);

  return (
    <group name={`Routed ecology of ${location.name}`}>
      <EcologyActors
        center={center}
        compactViewport={compactViewport}
        creatureSeeds={creatureSeeds}
        location={location}
        routeByCreatureId={routeByCreatureId}
        sprenSeeds={sprenSeeds}
      />
      {location.id === "shinovar" && (
        <ShinovarPastoralLife
          center={center}
          compactViewport={compactViewport}
          creatureSeeds={creatureSeeds}
          detailLevel={detailLevel}
          routeByCreatureId={routeByCreatureId}
        />
      )}
    </group>
  );
}

/**
 * A camera-owned local habitat layer. Manual navigation and exact trips both
 * publish their nearest modeled city through proximityLocationId. A stale
 * selected destination never keeps offscreen local actors or the GLB-derived
 * navigation field alive after the camera leaves its presence radius.
 */
export function RosharEcology() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const viewportWidth = useThree((state) => state.size.width);
  const compactViewport = useThree((state) =>
    isCompactViewport(state.size.width, state.size.height),
  );
  const layoutViewportWidth =
    ecologyLayoutViewportWidth(
      compactViewport ? Math.min(viewportWidth, 719) : viewportWidth,
    );
  const ecologyLocationId = resolveEcologyLocationId(
    detailLevel,
    proximityLocationId,
    selectedId,
  );
  const location = ecologyLocationId
    ? locationById.get(ecologyLocationId)
    : undefined;
  const center = useMemo(
    () =>
      location
        ? ([
            location.coordinates.x,
            location.coordinates.z,
          ] as const)
        : null,
    [location],
  );
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

  if (
    !location ||
    !center ||
    (creatureSeeds.length === 0 && sprenSeeds.length === 0)
  ) {
    return null;
  }

  const needsRoutedCityEcology =
    (detailLevel === "city" || detailLevel === "street") &&
    creatureSeeds.some(
      (seed) => seed.species !== "chasmfiend" && seed.species !== "skyeel",
    );

  return needsRoutedCityEcology ? (
    <RoutedCityEcology
      center={center}
      compactViewport={compactViewport}
      creatureSeeds={creatureSeeds}
      detailLevel={detailLevel}
      location={location}
      sprenSeeds={sprenSeeds}
      layoutViewportWidth={layoutViewportWidth}
    />
  ) : (
    <EcologyActors
      center={center}
      compactViewport={compactViewport}
      creatureSeeds={creatureSeeds}
      location={location}
      routeByCreatureId={EMPTY_CREATURE_ROUTES}
      sprenSeeds={sprenSeeds}
    />
  );
}

import { useMemo } from "react";
import { useAtlasStore } from "../../store/useAtlasStore";
import type { DetailLevel } from "../types";
import { placeableGazetteer } from "./catalog";
import {
  gazetteerMarkerY,
  isGazetteerPlaceVisibleAtLod,
  isWithinGazetteerFocus,
} from "./markerLayout";
import type { GazetteerKind, GazetteerPlace } from "./types";

const markerColor: Record<GazetteerKind, string> = {
  nation: "#c5a76c",
  city: "#e4c47c",
  town: "#d9b970",
  village: "#c9aa68",
  ruin: "#a8896a",
  institution: "#f2d993",
  "mountain-range": "#9d9180",
  hills: "#9f956b",
  plains: "#aea36f",
  valley: "#83956f",
  lake: "#5fb6c2",
  river: "#6cc5d0",
  sea: "#468fa7",
  ocean: "#326d8b",
  strait: "#4b9eb2",
  island: "#78966f",
  "island-chain": "#78966f",
  caves: "#8c7b70",
  landmark: "#c6a271",
};

function isWater(place: GazetteerPlace) {
  return ["lake", "river", "sea", "ocean", "strait"].includes(place.kind);
}

function isTopographic(place: GazetteerPlace) {
  return ["mountain-range", "hills", "plains", "valley"].includes(place.kind);
}

function isSettlement(place: GazetteerPlace) {
  return ["city", "town", "village"].includes(place.kind);
}

function isInstitution(place: GazetteerPlace) {
  return (
    place.kind === "institution" ||
    ["library", "palace", "hospital", "monastery", "oathgate"].includes(
      place.visualization,
    )
  );
}

function GazetteerMarker({
  place,
  selected,
}: {
  place: GazetteerPlace;
  selected: boolean;
}) {
  const focusGazetteerPlace = useAtlasStore(
    (state) => state.focusGazetteerPlace,
  );
  if (place.world === null) {
    return null;
  }
  const [x, z] = place.world;
  const scale = selected ? 1.45 : 1;
  const color = markerColor[place.kind];

  return (
    <group
      name={`Gazetteer_${place.id}`}
      position={[x, gazetteerMarkerY(place), z]}
      scale={scale}
      userData={{ gazetteerId: place.id, visualization: place.visualization }}
      onClick={(event) => {
        event.stopPropagation();
        focusGazetteerPlace(place.id);
      }}
    >
      {isWater(place) ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.11, 0.2, 24]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={selected ? 1 : 0.76}
            />
          </mesh>
          {place.visualization === "river" && (
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
              <planeGeometry args={[0.36, 0.045]} />
              <meshBasicMaterial color={color} transparent opacity={0.72} />
            </mesh>
          )}
        </>
      ) : isTopographic(place) ? (
        <>
          <mesh position={[-0.08, 0.06, 0]}>
            <coneGeometry args={[0.13, 0.32, 7]} />
            <meshStandardMaterial color={color} roughness={0.92} />
          </mesh>
          <mesh position={[0.1, 0.035, 0.02]}>
            <coneGeometry args={[0.1, 0.24, 7]} />
            <meshStandardMaterial color={color} roughness={0.94} />
          </mesh>
        </>
      ) : isSettlement(place) ? (
        <>
          <mesh position={[-0.075, 0.1, 0]}>
            <boxGeometry args={[0.12, 0.24, 0.13]} />
            <meshStandardMaterial color={color} roughness={0.76} />
          </mesh>
          <mesh position={[0.075, 0.07, 0.015]}>
            <boxGeometry args={[0.11, 0.18, 0.11]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[-0.075, 0.24, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.09, 0.09, 4]} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
          {place.visualization === "port-city" && (
            <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.18, 0.225, 18]} />
              <meshBasicMaterial color="#69bed0" transparent opacity={0.7} />
            </mesh>
          )}
        </>
      ) : isInstitution(place) ? (
        <>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.13, 0.16, 0.16, 10]} />
            <meshStandardMaterial color={color} roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.185, 0]}>
            <sphereGeometry args={[0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color} roughness={0.76} />
          </mesh>
        </>
      ) : place.kind === "ruin" ? (
        <>
          <mesh position={[-0.06, 0.08, 0]} rotation={[0.08, 0, -0.14]}>
            <boxGeometry args={[0.1, 0.24, 0.11]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          <mesh position={[0.08, 0.035, 0.03]} rotation={[0, 0.4, 0.2]}>
            <tetrahedronGeometry args={[0.12]} />
            <meshStandardMaterial color={color} roughness={0.98} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 0.06, 0]}>
          {place.kind === "nation" ? (
            <cylinderGeometry args={[0.17, 0.2, 0.12, 8]} />
          ) : (
            <octahedronGeometry args={[0.16]} />
          )}
          <meshStandardMaterial
            color={color}
            emissive={selected ? color : "#000000"}
            emissiveIntensity={selected ? 0.35 : 0}
            metalness={0.08}
            roughness={0.76}
          />
        </mesh>
      )}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.3, 28]} />
          <meshBasicMaterial color="#6fe7ef" transparent opacity={0.92} />
        </mesh>
      )}
    </group>
  );
}

export interface GazetteerMarkersProps {
  detailLevel: DetailLevel;
  selectedId?: string;
  /**
   * Optional focus culling for city/street views. Positions are Stormfather
   * world-space `[x, z]`; omitting it preserves the complete atlas layer.
   */
  focusWorld?: readonly [number, number];
  maxDistance?: number;
}

/** Terrain-aware, clickable place layer shared by the map and search UI. */
export function GazetteerMarkers({
  detailLevel,
  selectedId,
  focusWorld,
  maxDistance = detailLevel === "street" ? 4 : detailLevel === "city" ? 9 : 160,
}: GazetteerMarkersProps) {
  const visiblePlaces = useMemo(
    () =>
      placeableGazetteer.filter(
        (place) =>
          isGazetteerPlaceVisibleAtLod(place, detailLevel) &&
          isWithinGazetteerFocus(place, focusWorld, maxDistance),
      ),
    [detailLevel, focusWorld, maxDistance],
  );

  return (
    <group name="GazetteerMarkers">
      {visiblePlaces.map((place) => (
        <GazetteerMarker
          key={place.id}
          place={place}
          selected={place.id === selectedId}
        />
      ))}
    </group>
  );
}

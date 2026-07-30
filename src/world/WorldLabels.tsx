import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import {
  easterEggs,
  locations,
} from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";
import { localSurfaceY } from "./terrain/localSurface";
import { placeableGazetteer } from "./gazetteer";
import { terrainHeightAt } from "./terrain/terrainHeight";
import {
  buildSettlementLabelCandidates,
  layoutProjectedSettlementLabels,
  type ProjectedSettlementLabel,
} from "./settlementLabelLayout";

const LABEL_LAYOUT_INTERVAL_SECONDS = 0.075;

function SettlementNameLayer({
  candidates,
}: {
  candidates: ReturnType<typeof buildSettlementLabelCandidates>;
}) {
  const labelElements = useRef(new Map<string, HTMLSpanElement>());
  const lastLayoutAt = useRef(-Infinity);
  const projection = useMemo(() => new Vector3(), []);
  const worldPoints = useMemo(
    () =>
      candidates.map((candidate) => {
        const [x, z] = candidate.world;
        const surfaceY =
          candidate.source === "authored" && candidate.authoredLocationId
            ? localSurfaceY(candidate.authoredLocationId, x, z)
            : terrainHeightAt(x, z);
        return {
          candidate,
          point: new Vector3(
            x,
            surfaceY + (candidate.selected ? 2.25 : 0.9),
            z,
          ),
        };
      }),
    [candidates],
  );

  useFrame(({ camera, clock, size }) => {
    const elapsed = clock.getElapsedTime();
    if (elapsed - lastLayoutAt.current < LABEL_LAYOUT_INTERVAL_SECONDS) {
      return;
    }
    lastLayoutAt.current = elapsed;

    const projected: ProjectedSettlementLabel[] = worldPoints.map(
      ({ candidate, point }) => {
        projection.copy(point).project(camera);
        return {
          ...candidate,
          x: (projection.x * 0.5 + 0.5) * size.width,
          y: (-projection.y * 0.5 + 0.5) * size.height,
          depth: projection.z,
        };
      },
    );
    const placed = layoutProjectedSettlementLabels(
      projected,
      size,
      useAtlasStore.getState().detailLevel,
    );
    const placementById = new Map(
      placed.map((label) => [label.id, label]),
    );

    for (const candidate of candidates) {
      const element = labelElements.current.get(candidate.id);
      if (!element) continue;
      const placement = placementById.get(candidate.id);
      if (!placement) {
        element.style.visibility = "hidden";
        continue;
      }
      element.style.visibility = "visible";
      element.style.transform =
        `translate3d(${Math.round(placement.x)}px, ` +
        `${Math.round(placement.y)}px, 0) translate(-50%, -50%)`;
    }
  });

  if (candidates.length === 0) return null;
  return (
    <Html
      fullscreen
      zIndexRange={[10, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="settlement-label-overlay"
        aria-hidden="true"
      >
        {candidates.map((candidate) => (
          <span
            key={candidate.id}
            ref={(element) => {
              if (element) {
                labelElements.current.set(candidate.id, element);
              } else {
                labelElements.current.delete(candidate.id);
              }
            }}
            className={`world-label settlement-world-label ${
              candidate.selected ? "is-selected" : ""
            }`}
          >
            {candidate.label}
          </span>
        ))}
      </div>
    </Html>
  );
}

export function WorldLabels() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const showToast = useAtlasStore((state) => state.showToast);
  const candidates = useMemo(
    () =>
      buildSettlementLabelCandidates({
        detailLevel,
        selectedId,
        selectedGazetteerId,
        proximityLocationId,
        locations,
        gazetteer: placeableGazetteer,
      }),
    [
      detailLevel,
      proximityLocationId,
      selectedGazetteerId,
      selectedId,
    ],
  );
  const activeLocationId = proximityLocationId ?? selectedId;

  return (
    <>
      <SettlementNameLayer candidates={candidates} />
      {(detailLevel === "city" || detailLevel === "street") &&
        easterEggs.map((egg) => (
          <Html
            key={egg.id}
            position={[
              egg.coordinates.x,
              localSurfaceY(
                activeLocationId,
                egg.coordinates.x,
                egg.coordinates.z,
              ) +
                egg.height +
                0.45,
              egg.coordinates.z,
            ]}
            center
            distanceFactor={12}
            zIndexRange={[30, 10]}
          >
            <button
              className="easter-egg"
              type="button"
              aria-label={`Inspect ${egg.title}`}
              onClick={() => showToast(egg.title, egg.message)}
            >
              <span aria-hidden="true">✦</span>
            </button>
          </Html>
        ))}
    </>
  );
}

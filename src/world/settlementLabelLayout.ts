import type { GazetteerPlace } from "./gazetteer/types";
import type { DetailLevel, WorldLocation } from "./types";

const detailRank: Record<DetailLevel, number> = {
  continent: 0,
  region: 1,
  city: 2,
  street: 3,
};

const settlementKinds = new Set(["city", "town", "village"]);

export interface SettlementLabelCandidate {
  id: string;
  label: string;
  world: readonly [number, number];
  source: "authored" | "gazetteer";
  kind: WorldLocation["kind"] | "town" | "village";
  authoredLocationId: string | null;
  selected: boolean;
  priority: number;
}

interface SettlementLabelCandidateOptions {
  detailLevel: DetailLevel;
  selectedId: string;
  selectedGazetteerId: string | null;
  proximityLocationId: string | null;
  locations: readonly WorldLocation[];
  gazetteer: readonly GazetteerPlace[];
}

function selectedGazetteerForLocation(
  place: GazetteerPlace | undefined,
  location: WorldLocation,
) {
  return place?.id === location.id ||
    place?.parentLocationId === location.id
    ? place
    : undefined;
}

function authoredPriority(location: WorldLocation, selected: boolean) {
  const semanticPriority =
    location.kind === "city"
      ? 6_000
      : location.kind === "landmark"
        ? 4_200
        : 3_500;
  return semanticPriority + (selected ? 100_000 : 0);
}

function gazetteerPriority(place: GazetteerPlace, selected: boolean) {
  const semanticPriority =
    place.kind === "city" ? 5_000 : place.kind === "town" ? 4_000 : 3_000;
  const certaintyPriority = place.certainty === "precise" ? 120 : 0;
  return semanticPriority + certaintyPriority + (selected ? 100_000 : 0);
}

function authoredCandidate(
  location: WorldLocation,
  selectedGazetteer: GazetteerPlace | undefined,
  selected: boolean,
): SettlementLabelCandidate {
  const exactPlace = selectedGazetteerForLocation(
    selectedGazetteer,
    location,
  );
  return {
    id: location.id,
    label: exactPlace?.canonicalName ?? location.name,
    world: [location.coordinates.x, location.coordinates.z],
    source: "authored",
    kind: location.kind,
    authoredLocationId: location.id,
    selected,
    priority: authoredPriority(location, selected),
  };
}

function gazetteerCandidate(
  place: GazetteerPlace,
  selected: boolean,
): SettlementLabelCandidate {
  return {
    id: place.id,
    label: place.canonicalName,
    world: place.world!,
    source: "gazetteer",
    kind: place.kind as "city" | "town" | "village",
    authoredLocationId: place.parentLocationId ?? null,
    selected,
    priority: gazetteerPriority(place, selected),
  };
}

/**
 * Builds the stable label roster for the current semantic zoom.
 *
 * All continental/region settlement names share one projected DOM layer.
 * Once a modeled city owns the proximity lens, the roster contracts to that
 * city alone so names from the compressed continental map cannot float through
 * the local composition.
 */
export function buildSettlementLabelCandidates({
  detailLevel,
  selectedId,
  selectedGazetteerId,
  proximityLocationId,
  locations,
  gazetteer,
}: SettlementLabelCandidateOptions): readonly SettlementLabelCandidate[] {
  const selectedGazetteer = selectedGazetteerId
    ? gazetteer.find((place) => place.id === selectedGazetteerId)
    : undefined;

  if (proximityLocationId) {
    if (detailLevel === "street") return [];
    const owner = locations.find(
      (location) => location.id === proximityLocationId,
    );
    return owner
      ? [
          authoredCandidate(
            owner,
            selectedGazetteer,
            true,
          ),
        ]
      : [];
  }

  if (detailLevel === "street") return [];

  if (detailLevel === "city") {
    if (selectedGazetteer?.world) {
      const owningLocation = locations.find(
        (location) =>
          location.id ===
          (selectedGazetteer.parentLocationId ??
            selectedGazetteer.id),
      );
      return owningLocation
        ? [
            authoredCandidate(
              owningLocation,
              selectedGazetteer,
              true,
            ),
          ]
        : [gazetteerCandidate(selectedGazetteer, true)];
    }
    const selectedLocation = locations.find(
      (location) =>
        location.id === selectedId &&
        location.id !== "roshar" &&
        location.kind !== "nation",
    );
    if (selectedLocation) {
      return [
        authoredCandidate(
          selectedLocation,
          selectedGazetteer,
          true,
        ),
      ];
    }
    return [];
  }

  const selectedLocationId =
    selectedGazetteer?.parentLocationId ?? selectedGazetteer?.id;
  const authored = locations
    .filter(
      (location) =>
        location.id !== "roshar" && location.kind !== "nation",
    )
    .map((location) =>
      authoredCandidate(
        location,
        selectedGazetteer,
        location.id === selectedId ||
          location.id === selectedLocationId,
      ),
    );
  const authoredIds = new Set(authored.map((candidate) => candidate.id));
  const catalogSettlements = gazetteer
    .filter(
      (place) =>
        place.renderable &&
        place.world !== null &&
        settlementKinds.has(place.kind) &&
        detailRank[detailLevel] >= detailRank[place.minimumLod] &&
        !authoredIds.has(place.id),
    )
    .map((place) =>
      gazetteerCandidate(place, place.id === selectedGazetteerId),
    );

  return [...authored, ...catalogSettlements];
}

export interface ProjectedSettlementLabel
  extends Omit<SettlementLabelCandidate, "world"> {
  x: number;
  y: number;
  depth: number;
}

export interface PlacedSettlementLabel extends ProjectedSettlementLabel {
  width: number;
  height: number;
}

export interface SettlementLabelViewport {
  width: number;
  height: number;
}

const LABEL_GAP = 6;
const VIEWPORT_MARGIN = 8;
const TOP_CHROME_SAFE_AREA = 58;

export function settlementLabelBudget(
  detailLevel: DetailLevel,
  viewportWidth: number,
) {
  const compact = viewportWidth < 720;
  switch (detailLevel) {
    case "continent":
      return compact ? 10 : 18;
    case "region":
      return compact ? 18 : 34;
    case "city":
      return 1;
    case "street":
      return 0;
  }
}

export function estimateSettlementLabelSize(
  label: string,
  selected: boolean,
) {
  const fontSize = selected ? 15 : 12;
  return {
    width: Math.min(
      selected ? 190 : 164,
      Math.max(38, Math.ceil(label.length * fontSize * 0.57 + 16)),
    ),
    height: selected ? 27 : 22,
  };
}

interface Rectangle {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function labelRectangle(
  label: Pick<PlacedSettlementLabel, "x" | "y" | "width" | "height">,
): Rectangle {
  return {
    left: label.x - label.width / 2 - LABEL_GAP,
    right: label.x + label.width / 2 + LABEL_GAP,
    top: label.y - label.height / 2 - LABEL_GAP,
    bottom: label.y + label.height / 2 + LABEL_GAP,
  };
}

function rectanglesIntersect(left: Rectangle, right: Rectangle) {
  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

/**
 * Deterministic screen-space label deconfliction.
 *
 * Selected and authored destinations win ties, then labels nearest the center
 * of the camera receive the remaining budget. Dimensions are estimated rather
 * than measured so camera movement never forces synchronous DOM layout.
 */
export function layoutProjectedSettlementLabels(
  projected: readonly ProjectedSettlementLabel[],
  viewport: SettlementLabelViewport,
  detailLevel: DetailLevel,
): readonly PlacedSettlementLabel[] {
  const budget = settlementLabelBudget(detailLevel, viewport.width);
  if (budget === 0 || viewport.width <= 0 || viewport.height <= 0) return [];

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const candidates = projected
    .filter(
      (label) =>
        label.depth >= -1 &&
        label.depth <= 1 &&
        label.x >= VIEWPORT_MARGIN &&
        label.x <= viewport.width - VIEWPORT_MARGIN &&
        label.y >= TOP_CHROME_SAFE_AREA &&
        label.y <= viewport.height - VIEWPORT_MARGIN,
    )
    .map((label) => ({
      ...label,
      ...estimateSettlementLabelSize(label.label, label.selected),
    }))
    .sort((left, right) => {
      if (left.selected !== right.selected) {
        return left.selected ? -1 : 1;
      }
      if (left.priority !== right.priority) {
        return right.priority - left.priority;
      }
      const leftCenterDistance =
        (left.x - centerX) ** 2 + (left.y - centerY) ** 2;
      const rightCenterDistance =
        (right.x - centerX) ** 2 + (right.y - centerY) ** 2;
      if (leftCenterDistance !== rightCenterDistance) {
        return leftCenterDistance - rightCenterDistance;
      }
      return left.label.localeCompare(right.label);
    });

  const placed: PlacedSettlementLabel[] = [];
  const occupied: Rectangle[] = [];
  for (const candidate of candidates) {
    if (placed.length >= budget) break;
    const rectangle = labelRectangle(candidate);
    if (occupied.some((existing) => rectanglesIntersect(existing, rectangle))) {
      continue;
    }
    placed.push(candidate);
    occupied.push(rectangle);
  }
  return placed;
}

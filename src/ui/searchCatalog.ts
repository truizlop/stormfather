import { gazetteerById, rosharGazetteer } from "../world/gazetteer";
import { secondaryLocations, travelLocations } from "../world/locations";
import type { GazetteerPlace } from "../world/gazetteer";
import type { WorldLocation } from "../world/types";

const searchableLocations = [...travelLocations, ...secondaryLocations];
const destinationIds = new Set(
  searchableLocations.map((location) => location.id),
);
const supplementalGazetteer = rosharGazetteer.filter(
  (place) => !destinationIds.has(place.id),
);

export type SearchResult =
  | { type: "destination"; location: WorldLocation }
  | { type: "gazetteer"; place: GazetteerPlace };

export function searchRosharCatalog(query: string): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    return [
      ...searchableLocations.map<SearchResult>((location) => ({
        type: "destination",
        location,
      })),
      ...[...supplementalGazetteer]
        .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
        .map<SearchResult>((place) => ({ type: "gazetteer", place })),
    ];
  }
  const destinations = searchableLocations
    .filter((location) =>
      `${location.name} ${location.kind} ${
        gazetteerById.get(location.id)?.category ?? ""
      } ${location.subtitle}`
        .toLocaleLowerCase()
        .includes(normalized),
    )
    .map<SearchResult>((location) => ({ type: "destination", location }));
  const places = supplementalGazetteer
    .filter((place) =>
      [
        place.canonicalName,
        place.category,
        place.kind,
        place.nationOrRegion,
        ...(place.alternateNames ?? []),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized),
    )
    .map<SearchResult>((place) => ({ type: "gazetteer", place }));
  return [...destinations, ...places];
}

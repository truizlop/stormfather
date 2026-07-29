import type { DetailLevel } from "./types";
import { semanticSettlementProfile } from "./gazetteer/semanticSettlements";

export type GazetteerArrivalPlace = {
  id: string;
  minimumLod: DetailLevel;
};

export function gazetteerArrivalOffset(
  place: GazetteerArrivalPlace,
  mobile: boolean,
): readonly [number, number, number] {
  const semanticCity = Boolean(semanticSettlementProfile(place.id));
  if (place.minimumLod === "street") {
    return mobile ? [6, 8, 7] : [4, 6, 5];
  }
  if (place.minimumLod === "region" && !semanticCity) {
    return mobile ? [24, 34, 30] : [18, 28, 22];
  }
  return mobile ? [9, 16, 12] : [7, 12, 9];
}

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import { useAtlasStore } from "../../store/useAtlasStore";
import { terrainHeightAt } from "../terrain/terrainHeight";
import { countryLabels, frontiers, frontierStyle } from "./frontiers";
import { drapePolyline } from "./terrainDraping";

export function CountryFrontiers() {
  const visible = useAtlasStore((state) => state.frontiersVisible);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const selectedId = useAtlasStore((state) => state.selectedId);
  const drapedFrontiers = useMemo(
    () =>
      frontiers.map((frontier) => ({
        frontier,
        points: drapePolyline(frontier.points),
      })),
    [],
  );

  if (
    !visible ||
    proximityLocationId !== null ||
    detailLevel === "city" ||
    detailLevel === "street"
  ) {
    return null;
  }

  const isContinent = detailLevel === "continent";
  const opacityScale = isContinent ? 1 : 0.64;
  const widthScale = isContinent ? 1 : 0.82;

  return (
    <group name="Country frontiers">
      {drapedFrontiers.map(({ frontier, points }) => {
        const style = frontierStyle[frontier.kind];
        const dashed = frontier.kind !== "national";
        return (
          <group key={frontier.id} name={frontier.id}>
            <Line
              name={`${frontier.id}-terrain-halo`}
              points={points}
              color={style.haloColor}
              lineWidth={(style.lineWidth + 2.8) * widthScale}
              transparent
              opacity={style.haloOpacity * opacityScale}
              dashed={dashed}
              dashSize={style.dashSize}
              gapSize={style.gapSize}
              depthWrite={false}
              renderOrder={4}
            />
            <Line
              name={`${frontier.id}-survey-stroke`}
              points={points}
              color={style.color}
              lineWidth={style.lineWidth * widthScale}
              transparent
              opacity={style.opacity * opacityScale}
              dashed={dashed}
              dashSize={style.dashSize}
              gapSize={style.gapSize}
              depthWrite={false}
              renderOrder={5}
            />
            {frontier.kind === "national" ? (
              <Line
                name={`${frontier.id}-survey-seam`}
                points={points}
                color="#493328"
                lineWidth={0.46 * widthScale}
                transparent
                opacity={0.72 * opacityScale}
                depthWrite={false}
                renderOrder={6}
              />
            ) : null}
          </group>
        );
      })}
      {(detailLevel === "continent" || detailLevel === "region") &&
        countryLabels.map((country) => {
          const selected = country.locationId === selectedId;
          return (
            <Html
              key={country.id}
              position={[
                country.position[0],
                terrainHeightAt(country.position[0], country.position[1]) +
                  0.72,
                country.position[1],
              ]}
              center
              distanceFactor={isContinent ? 38 : 25}
              zIndexRange={[7, 0]}
              className="country-label-anchor"
            >
              <span
                className={[
                  "country-label",
                  country.emphasis === "minor" ? "is-minor" : "",
                  selected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {country.name}
              </span>
            </Html>
          );
        })}
    </group>
  );
}

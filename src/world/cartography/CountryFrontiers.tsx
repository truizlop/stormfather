import { Html, Line } from "@react-three/drei";
import { useAtlasStore } from "../../store/useAtlasStore";
import { terrainHeightAt } from "../terrain/terrainHeight";
import { countryLabels, frontiers, frontierStyle } from "./frontiers";

export function CountryFrontiers() {
  const visible = useAtlasStore((state) => state.frontiersVisible);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedId = useAtlasStore((state) => state.selectedId);

  if (!visible || detailLevel === "city" || detailLevel === "street") return null;

  const isContinent = detailLevel === "continent";
  const opacityScale = isContinent ? 1 : 0.72;

  return (
    <group name="Country frontiers">
      {frontiers.map((frontier) => {
        const style = frontierStyle[frontier.kind];
        return (
          <Line
            key={frontier.id}
            name={frontier.id}
            points={frontier.points.map(([x, z]) => [
              x,
              terrainHeightAt(x, z) + 0.18,
              z,
            ])}
            color={style.color}
            lineWidth={style.lineWidth * (isContinent ? 1 : 0.82)}
            transparent
            opacity={style.opacity * opacityScale}
            dashed={frontier.kind !== "national"}
            dashSize={style.dashSize}
            gapSize={style.gapSize}
            depthWrite={false}
            renderOrder={4}
          />
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

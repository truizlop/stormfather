import { useAtlasStore } from "../store/useAtlasStore";
import { scalePresentation } from "../world/scale";

export function ScaleReadout() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const scale = scalePresentation[detailLevel];

  return (
    <aside
      className={`scale-readout is-${scale.mode}`}
      aria-label={`${scale.eyebrow}: ${scale.distance}. ${scale.note}`}
    >
      <span>{scale.eyebrow}</span>
      <div aria-hidden="true">
        <i />
        <strong>{scale.distance}</strong>
      </div>
      <small>{scale.note}</small>
    </aside>
  );
}

import { useState } from "react";
import { useAtlasStore } from "../store/useAtlasStore";

type ReferenceMode = "city" | "residents";

const referenceByMode: Record<
  ReferenceMode,
  { src: string; label: string; hint: string }
> = {
  city: {
    src: `${import.meta.env.BASE_URL}reference/kharbranth-concept.jpg`,
    label: "Generated city target",
    hint: "Compare harbor, Ralinsa, cliff strata, painted wards and civic crown",
  },
  residents: {
    src: `${import.meta.env.BASE_URL}reference/kharbranth-residents.jpg`,
    label: "Generated resident target",
    hint: "Compare anatomy, layered dress, role props, skin and cultural detail",
  },
};

export function FidelityComparison() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const travelEpoch = useAtlasStore((state) => state.travelEpoch);
  const [openAtEpoch, setOpenAtEpoch] = useState<number | null>(null);
  const [split, setSplit] = useState(50);
  const [mode, setMode] = useState<ReferenceMode>("city");
  const eligible =
    selectedId === "kharbranth" &&
    (detailLevel === "city" || detailLevel === "street");
  const open = eligible && openAtEpoch === travelEpoch;

  if (!eligible) return null;

  const reference = referenceByMode[mode];
  const selectMode = (nextMode: ReferenceMode) => {
    setMode(nextMode);
    setSplit(50);
    window.dispatchEvent(
      nextMode === "residents"
        ? new Event("atlas:inspect-residents")
        : new Event("atlas:inspect-city"),
    );
  };

  return (
    <section
      className={`fidelity-comparison ${open ? "is-open" : ""}`}
      aria-label="Kharbranth visual fidelity comparison"
    >
      {open && (
        <>
          <div className="fidelity-reference" aria-hidden="true">
            <div
              className={`fidelity-reference-clip is-${mode}`}
              style={{ width: `${split}%` }}
            >
              <img src={reference.src} alt="" />
            </div>
            <span
              className="fidelity-divider"
              style={{ left: `${split}%` }}
            />
            <span className="fidelity-side-label is-reference">
              Generated reference
            </span>
            <span className="fidelity-side-label is-live">
              Live 3D relief LOD
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            Showing {reference.label} to the left of the divider and the live
            Three.js scene to the right.
          </p>
        </>
      )}

      <div className="fidelity-comparison-controls panel">
        {!open ? (
          <button
            className="fidelity-open"
            type="button"
            onClick={() => {
              setOpenAtEpoch(travelEpoch);
              setMode("city");
              setSplit(50);
              window.dispatchEvent(new Event("atlas:inspect-city"));
            }}
          >
            <span aria-hidden="true">◫</span>
            Compare generated art to 3D
          </button>
        ) : (
          <>
            <div className="fidelity-control-heading">
              <span>
                <strong>{reference.label}</strong>
                <small>{reference.hint}</small>
              </span>
              <button
                className="fidelity-close"
                type="button"
                onClick={() => {
                  setOpenAtEpoch(null);
                  window.dispatchEvent(
                    new Event(
                      mode === "residents"
                        ? "atlas:inspect-city"
                        : "atlas:end-inspection",
                    ),
                  );
                }}
                aria-label="Close visual comparison"
              >
                ×
              </button>
            </div>
            <div className="fidelity-control-row">
              <div className="fidelity-modes" aria-label="Reference subject">
                <button
                  type="button"
                  className={mode === "city" ? "is-active" : ""}
                  aria-pressed={mode === "city"}
                  onClick={() => selectMode("city")}
                >
                  City
                </button>
                <button
                  type="button"
                  className={mode === "residents" ? "is-active" : ""}
                  aria-pressed={mode === "residents"}
                  onClick={() => selectMode("residents")}
                >
                  People
                </button>
              </div>
              <label>
                <span>Reference {split}%</span>
                <input
                  type="range"
                  min="8"
                  max="92"
                  value={split}
                  onChange={(event) => setSplit(Number(event.target.value))}
                  aria-label="Reference and live 3D comparison divider"
                />
              </label>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

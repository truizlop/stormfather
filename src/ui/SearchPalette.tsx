import { MapPin, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAtlasStore } from "../store/useAtlasStore";
import { gazetteerById, rosharGazetteer } from "../world/gazetteer";
import { searchRosharCatalog } from "./searchCatalog";

export function SearchPalette() {
  const [query, setQuery] = useState("");
  const searchOpen = useAtlasStore((state) => state.searchOpen);
  const setSearchOpen = useAtlasStore((state) => state.setSearchOpen);
  const selectLocation = useAtlasStore((state) => state.selectLocation);
  const focusGazetteerPlace = useAtlasStore(
    (state) => state.focusGazetteerPlace,
  );
  const results = useMemo(() => searchRosharCatalog(query), [query]);

  if (!searchOpen) return null;

  return (
    <div
      className="search-backdrop"
      role="presentation"
      onMouseDown={() => setSearchOpen(false)}
    >
      <section
        className="search-palette panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search Roshar"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <Search size={18} />
          <input
            autoFocus
            type="search"
            aria-label="Search Roshar locations"
            placeholder="Find a kingdom, city, or landmark"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearchOpen(false);
            }}
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          >
            <X size={17} />
          </button>
        </header>
        <div className="search-gazetteer-summary">
          <span>{rosharGazetteer.length} sourced places</span>
          <span>
            {rosharGazetteer.filter((place) => place.renderable).length} mapped
          </span>
          <span>
            {rosharGazetteer.filter((place) => !place.renderable).length} kept
            unplaced
          </span>
        </div>
        <div className="search-results">
          {results.map((result) => {
            const id =
              result.type === "destination"
                ? result.location.id
                : result.place.id;
            const name =
              result.type === "destination"
                ? result.location.name
                : result.place.canonicalName;
            const detail =
              result.type === "destination"
                ? `${
                    gazetteerById.get(result.location.id)?.category ??
                    result.location.kind
                  } · ${result.location.subtitle}`
                : `${result.place.category} · ${result.place.nationOrRegion} · ${
                    result.place.certainty === "unknown"
                      ? "location unconfirmed"
                      : `${result.place.certainty} placement`
                  }`;
            return (
              <button
                key={`${result.type}-${id}`}
                type="button"
                onClick={() =>
                  result.type === "destination"
                    ? selectLocation(id)
                    : focusGazetteerPlace(id)
                }
              >
                <MapPin size={15} />
                <span>
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </span>
              </button>
            );
          })}
          {results.length === 0 && (
            <p>No charted place matches that search.</p>
          )}
        </div>
      </section>
    </div>
  );
}

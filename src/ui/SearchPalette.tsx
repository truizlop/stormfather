import { MapPin, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAtlasStore } from "../store/useAtlasStore";
import { secondaryLocations, travelLocations } from "../world/locations";

const searchableLocations = [...travelLocations, ...secondaryLocations];

export function SearchPalette() {
  const [query, setQuery] = useState("");
  const searchOpen = useAtlasStore((state) => state.searchOpen);
  const setSearchOpen = useAtlasStore((state) => state.setSearchOpen);
  const selectLocation = useAtlasStore((state) => state.selectLocation);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return searchableLocations.slice(0, 8);
    return searchableLocations
      .filter((location) =>
        `${location.name} ${location.kind} ${location.subtitle}`
          .toLocaleLowerCase()
          .includes(normalized),
      )
      .slice(0, 8);
  }, [query]);

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
        <div className="search-results">
          {results.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => selectLocation(location.id)}
            >
              <MapPin size={15} />
              <span>
                <strong>{location.name}</strong>
                <small>
                  {location.kind} · {location.subtitle}
                </small>
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <p>No charted place matches that search.</p>
          )}
        </div>
      </section>
    </div>
  );
}

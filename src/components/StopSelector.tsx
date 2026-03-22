import { useEffect, useRef, useState } from "react";
import type { StopId } from "../types/bus";
import { STOPS } from "../data/stops";

interface StopSelectorProps {
  value: StopId | "";
  onChange: (stopId: StopId) => void;
  onRequestLocation: () => void;
  locating: boolean;
  plannedDateTime: string;
  onPlannedDateTimeChange: (value: string) => void;
}

export function StopSelector({
  value,
  onChange,
  onRequestLocation,
  locating,
  plannedDateTime,
  onPlannedDateTimeChange
}: StopSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showPlanner, setShowPlanner] = useState(Boolean(plannedDateTime));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredStops = Object.values(STOPS).filter((stop) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return true;
    }

    return stop.name.toLowerCase().includes(normalized) || stop.shortName.toLowerCase().includes(normalized);
  });

  useEffect(() => {
    function onDocClick(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }

    setQuery(STOPS[value].name);
  }, [value]);

  useEffect(() => {
    if (plannedDateTime) {
      setShowPlanner(true);
    }
  }, [plannedDateTime]);

  function handleInputFocus(): void {
    setQuery("");
    setOpen(true);

    if (typeof window !== "undefined" && window.innerWidth <= 700) {
      window.setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }

  return (
    <div className="selector-wrap" ref={rootRef}>
      <span>Search bus stop</span>
      <div className="search-select-shell">
        <input
          ref={inputRef}
          type="search"
          className="custom-select-trigger search-input"
          value={query}
          placeholder="Search stops..."
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          name="kmcfb-stop-search"
          onFocus={handleInputFocus}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        />
        <button
          type="button"
          className="search-select-toggle"
          onClick={() => setShowPlanner((prev) => !prev)}
          aria-label="Plan trip time"
          title="Plan trip time"
        >
          <svg className="search-action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
        <button
          type="button"
          className="search-select-toggle"
          onClick={onRequestLocation}
          aria-label="Use current location"
          title="Use current location"
          disabled={locating}
        >
          {locating ? (
            <span className="search-action-loading" aria-hidden="true" />
          ) : (
            <svg className="search-action-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          )}
        </button>
      </div>

      {showPlanner && (
        <div className="planner-control">
          <label htmlFor="trip-plan-time">Plan trip time</label>
          <div className="planner-row">
            <input
              id="trip-plan-time"
              type="datetime-local"
              className="planner-input"
              value={plannedDateTime}
              onChange={(event) => onPlannedDateTimeChange(event.target.value)}
            />
            {plannedDateTime ? (
              <button
                type="button"
                className="secondary-btn planner-clear-btn"
                onClick={() => {
                  onPlannedDateTimeChange("");
                  setShowPlanner(false);
                }}
              >
                Now
              </button>
            ) : null}
          </div>
        </div>
      )}

      {open && (
        <div className="custom-select-list" role="listbox">
          {filteredStops.length === 0 ? (
            <div className="custom-option empty-option">
              <span>No stops found</span>
              <small>Try another stop name</small>
            </div>
          ) : (
            filteredStops.map((stop) => (
              <button
                key={stop.id}
                type="button"
                className={`custom-option ${value === stop.id ? "selected-option" : ""}`}
                role="option"
                aria-selected={value === stop.id}
                onClick={() => {
                  onChange(stop.id);
                  setQuery(stop.name);
                  setOpen(false);
                }}
              >
                <span>{stop.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

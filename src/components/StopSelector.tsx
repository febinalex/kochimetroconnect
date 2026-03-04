import { useEffect, useRef, useState } from "react";
import type { StopId } from "../types/bus";
import { STOPS } from "../data/stops";

interface StopSelectorProps {
  value: StopId | "";
  onChange: (stopId: StopId) => void;
}

export function StopSelector({ value, onChange }: StopSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedLabel = value ? STOPS[value].name : "Choose a stop";

  useEffect(() => {
    function onDocClick(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="selector-wrap" ref={rootRef}>
      <span>Select bus stop</span>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <span className={`select-caret ${open ? "open" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="custom-select-list" role="listbox">
          {Object.values(STOPS).map((stop) => (
            <button
              key={stop.id}
              type="button"
              className={`custom-option ${value === stop.id ? "selected-option" : ""}`}
              role="option"
              aria-selected={value === stop.id}
              onClick={() => {
                onChange(stop.id);
                setOpen(false);
              }}
            >
              <span>{stop.name}</span>
              <small>{stop.shortName}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface LocationPermissionProps {
  onAllowLocation: () => void;
  loading: boolean;
  errorMessage: string | null;
}

export function LocationPermission({
  onAllowLocation,
  loading,
  errorMessage
}: LocationPermissionProps) {
  return (
    <section className="card gate-card">
      <h2>Use current location</h2>
      <p>Find the nearest metro connect stop automatically and show a walkable map.</p>

      <button type="button" onClick={onAllowLocation} disabled={loading}>
        {loading ? "Detecting location..." : "Allow Location"}
      </button>

      {errorMessage && <p className="error-text">{errorMessage}</p>}
    </section>
  );
}

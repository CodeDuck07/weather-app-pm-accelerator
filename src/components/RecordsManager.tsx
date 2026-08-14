"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { prepareSavedRecord } from "@/lib/weather-client";
import { openStreetMapEmbedUrl } from "@/lib/weather-shared";

type WeatherRecord = {
  id: string;
  locationInput: string;
  resolvedName: string;
  latitude: number;
  longitude: number;
  dateFrom: string;
  dateTo: string;
  temperatures: string;
  weatherSummary: string | null;
  notes: string | null;
  youtubeVideoId: string | null;
  mapUrl: string | null;
  wikipediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type TempRow = { date: string; tMin: number; tMax: number; tAvg: number };

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function RecordsManager() {
  const today = useMemo(() => new Date(), []);
  const defaultTo = ymd(new Date(today.getTime() - 86400000));
  const defaultFrom = ymd(new Date(today.getTime() - 7 * 86400000));

  const [records, setRecords] = useState<WeatherRecord[]>([]);
  const [location, setLocation] = useState("Paris");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [notes, setNotes] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSource, setErrorSource] = useState<"create" | "update" | "list" | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  function validateDateRange(from: string, to: string): string | null {
    if (!from || !to) return "Please choose both start and end dates.";
    if (from > to) {
      return "Start date must be on or before end date. Check the From / To fields.";
    }
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (to > todayStr) {
      return "End date cannot be in the future (archive weather is past dates only).";
    }
    const fromTime = new Date(from + "T00:00:00Z").getTime();
    const toTime = new Date(to + "T00:00:00Z").getTime();
    const spanDays = (toTime - fromTime) / (1000 * 60 * 60 * 24);
    if (spanDays > 31) return "Date range cannot exceed 31 days.";
    return null;
  }

  function friendlyError(raw: string): string {
    if (/HTTP 400/i.test(raw) || /Unexpected weather/i.test(raw)) {
      return "Could not load temperatures for these dates. Check that From ≤ To and both dates are in the past.";
    }
    return raw;
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/records");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to load records");
    setRecords(json);
  }, []);

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load");
      setErrorSource("list");
    });
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setEditNotes(selected.notes ?? "");
    setEditLocation(selected.locationInput);
    setEditFrom(selected.dateFrom.slice(0, 10));
    setEditTo(selected.dateTo.slice(0, 10));
  }, [selected]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorSource(null);
    setMessage(null);
    try {
      const dateError = validateDateRange(dateFrom, dateTo);
      if (dateError) throw new Error(dateError);

      const prepared = await prepareSavedRecord({
        location,
        dateFrom,
        dateTo,
        notes,
      });
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepared),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      setMessage(`Saved: ${json.record.resolvedName}`);
      setNotes("");
      await load();
      setSelectedId(json.record.id);
    } catch (err) {
      setErrorSource("create");
      setError(
        friendlyError(err instanceof Error ? err.message : "Create failed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function onUpdate() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setErrorSource(null);
    setMessage(null);
    try {
      const dateError = validateDateRange(editFrom, editTo);
      if (dateError) throw new Error(dateError);

      const locationOrDatesChanged =
        editLocation !== selected?.locationInput ||
        editFrom !== selected?.dateFrom.slice(0, 10) ||
        editTo !== selected?.dateTo.slice(0, 10);

      let body: Record<string, unknown> = {
        location: editLocation,
        dateFrom: editFrom,
        dateTo: editTo,
        notes: editNotes,
      };

      if (locationOrDatesChanged) {
        const prepared = await prepareSavedRecord({
          location: editLocation,
          dateFrom: editFrom,
          dateTo: editTo,
          notes: editNotes || undefined,
        });
        body = { ...prepared };
      }

      const res = await fetch(`/api/records/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setMessage("Record updated");
      await load();
    } catch (err) {
      setErrorSource("update");
      setError(
        friendlyError(err instanceof Error ? err.message : "Update failed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    setLoading(true);
    setError(null);
    setErrorSource(null);
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      if (selectedId === id) setSelectedId(null);
      setMessage("Record deleted");
      await load();
    } catch (err) {
      setErrorSource("list");
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  function exportUrl(format: string) {
    const params = new URLSearchParams({ format });
    if (selectedId) params.set("id", selectedId);
    return `/api/export?${params.toString()}`;
  }

  let temps: TempRow[] = [];
  if (selected) {
    try {
      temps = JSON.parse(selected.temperatures) as TempRow[];
    } catch {
      temps = [];
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Saved weather records (CRUD)</h1>
        <p className="muted">
          CREATE a location + date range, store temperatures in SQLite, then READ / UPDATE / DELETE.
          Historical data uses Open-Meteo Archive (past dates only).
        </p>
        <form
          onSubmit={onCreate}
          style={{ display: "grid", gap: "0.65rem", maxWidth: 720 }}
        >
          <label>
            Location
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.65rem",
            }}
          >
            <label>
              From
              <input
                className="input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
              />
            </label>
            <label>
              To
              <input
                className="input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            Notes (optional)
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Saving…" : "Create record"}
          </button>
          {error && errorSource === "create" && (
            <div className="error-box" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}
        </form>
      </section>

      {error && (
        <div className="error-box" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      {message && (
        <div className="panel" style={{ borderColor: "#2f6b45" }}>
          {message}
        </div>
      )}

      <section className="panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>Records ({records.length})</h2>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {(["json", "csv", "md", "xml"] as const).map((fmt) => (
              <a key={fmt} className="btn" href={exportUrl(fmt)}>
                Export {fmt.toUpperCase()}
                {selectedId ? " (selected)" : " (all)"}
              </a>
            ))}
          </div>
        </div>

        {records.length === 0 ? (
          <p className="muted">No records yet.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="muted">
                  <th style={th}>Location</th>
                  <th style={th}>Range</th>
                  <th style={th}>Summary</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={td}>
                      <button
                        className="btn"
                        style={{
                          borderColor:
                            selectedId === r.id ? "var(--accent)" : undefined,
                        }}
                        onClick={() => setSelectedId(r.id)}
                      >
                        {r.resolvedName}
                      </button>
                    </td>
                    <td style={td} className="muted">
                      {r.dateFrom.slice(0, 10)} → {r.dateTo.slice(0, 10)}
                    </td>
                    <td style={td}>{r.weatherSummary}</td>
                    <td style={td}>
                      <button className="btn btn-danger" onClick={() => onDelete(r.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="panel">
          <h2 style={{ marginTop: 0 }}>Detail / Update</h2>
          <p className="muted">
            Coords: {selected.latitude}, {selected.longitude}
          </p>
          <div style={{ display: "grid", gap: "0.65rem", maxWidth: 720 }}>
            <label>
              Location
              <input
                className="input"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.65rem",
              }}
            >
              <label>
                From
                <input
                  className="input"
                  type="date"
                  value={editFrom}
                  onChange={(e) => setEditFrom(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  className="input"
                  type="date"
                  value={editTo}
                  onChange={(e) => setEditTo(e.target.value)}
                />
              </label>
            </div>
            <label>
              Notes
              <input
                className="input"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </label>
            {error && errorSource === "update" && (
              <div className="error-box" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}
            <button className="btn btn-primary" onClick={onUpdate} disabled={loading}>
              Update record
            </button>
          </div>

          <h3>Temperatures</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="muted">
                  <th style={th}>Date</th>
                  <th style={th}>Min</th>
                  <th style={th}>Max</th>
                  <th style={th}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {temps.map((t) => (
                  <tr key={t.date} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={td}>{t.date}</td>
                    <td style={td}>{t.tMin}</td>
                    <td style={td}>{t.tMax}</td>
                    <td style={td}>{t.tAvg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Map (OpenStreetMap)</h3>
          <iframe
            title="map"
            src={openStreetMapEmbedUrl(selected.latitude, selected.longitude)}
            style={{
              width: "100%",
              height: 320,
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          {selected.mapUrl && (
            <p>
              <a href={selected.mapUrl} target="_blank" rel="noreferrer">
                Open map
              </a>
            </p>
          )}

          <h3>Extra APIs</h3>
          <ul>
            {selected.wikipediaUrl && (
              <li>
                Wikipedia:{" "}
                <a href={selected.wikipediaUrl} target="_blank" rel="noreferrer">
                  {selected.wikipediaUrl}
                </a>
              </li>
            )}
            <li>
              YouTube search:{" "}
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  selected.resolvedName + " travel"
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Videos about {selected.resolvedName}
              </a>
              {selected.youtubeVideoId && (
                <>
                  {" "}
                  · embedded id: {selected.youtubeVideoId}
                </>
              )}
            </li>
          </ul>
          {selected.youtubeVideoId && (
            <iframe
              title="youtube"
              width="100%"
              height="315"
              src={`https://www.youtube.com/embed/${selected.youtubeVideoId}`}
              style={{ border: 0, borderRadius: 12 }}
              allowFullScreen
            />
          )}
        </section>
      )}
    </div>
  );
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "0.45rem 0.35rem",
  fontWeight: 600,
};
const td: CSSProperties = {
  padding: "0.55rem 0.35rem",
  verticalAlign: "top",
};

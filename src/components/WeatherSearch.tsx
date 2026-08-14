"use client";

import { useState } from "react";
import { loadLiveWeather } from "@/lib/weather-client";
import {
  weatherIcon,
  weatherLabel,
  type WeatherBundle,
} from "@/lib/weather-shared";

export default function WeatherSearch() {
  const [query, setQuery] = useState("London");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherBundle | null>(null);

  async function loadWeather(params: { q?: string; lat?: number; lon?: number }) {
    setLoading(true);
    setError(null);
    try {
      // Prefer browser → Open-Meteo (works even when the Next server can't reach the internet).
      // Fall back to our API route if direct fetch fails.
      try {
        const bundle = await loadLiveWeather(params);
        setData(bundle);
        return;
      } catch (directErr) {
        const url = new URL("/api/weather", window.location.origin);
        if (params.q) url.searchParams.set("q", params.q);
        if (params.lat != null && params.lon != null) {
          url.searchParams.set("lat", String(params.lat));
          url.searchParams.set("lon", String(params.lon));
        }
        const res = await fetch(url.toString());
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            json.error ||
              (directErr instanceof Error ? directErr.message : "Request failed")
          );
        }
        setData(json);
      }
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadWeather({ q: query });
  }

  function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void loadWeather({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (geoErr) => {
        setLoading(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError("Location permission denied. Enter a city manually instead.");
        } else {
          setError("Could not get your location. Try again or enter a city.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel">
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Live weather</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Enter a city, town, landmark, ZIP/postal code, or coordinates (e.g.{" "}
          <code>48.8566, 2.3522</code>).
        </p>
        <form onSubmit={onSubmit} className="search-form">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, ZIP, landmark, or lat,lon"
            aria-label="Location"
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Loading…" : "Get weather"}
          </button>
          <button className="btn" type="button" onClick={useMyLocation} disabled={loading}>
            Use my location
          </button>
        </form>
      </section>

      {error && (
        <div className="error-box" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <>
          <section className="panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{data.location.name}</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  {data.location.latitude.toFixed(4)}, {data.location.longitude.toFixed(4)}
                </p>
              </div>
              <div style={{ fontSize: "3rem", lineHeight: 1 }}>
                {weatherIcon(data.current.weatherCode)}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
                marginTop: "1rem",
              }}
            >
              <Stat label="Temperature" value={`${data.current.temperature}°C`} />
              <Stat label="Feels like" value={`${data.current.apparentTemperature}°C`} />
              <Stat label="Humidity" value={`${data.current.humidity}%`} />
              <Stat label="Wind" value={`${data.current.windSpeed} km/h`} />
              <Stat label="Condition" value={weatherLabel(data.current.weatherCode)} />
            </div>
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>5-day forecast</h3>
            <div className="grid-forecast">
              {data.forecast.map((day) => (
                <div
                  key={day.date}
                  style={{
                    background: "var(--panel-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "0.85rem",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{day.date}</div>
                  <div style={{ fontSize: "1.8rem", margin: "0.35rem 0" }}>
                    {weatherIcon(day.weatherCode)}
                  </div>
                  <div>{weatherLabel(day.weatherCode)}</div>
                  <div className="muted" style={{ marginTop: "0.35rem" }}>
                    {day.tMin}° / {day.tMax}°C
                  </div>
                  <div className="muted">Rain chance: {day.precipitationProbability}%</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--panel-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "0.75rem",
      }}
    >
      <div className="muted" style={{ fontSize: "0.85rem" }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

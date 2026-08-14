import {
  type ForecastDay,
  type GeoResult,
  type WeatherBundle,
} from "@/lib/weather-shared";

function formatPlace(g: {
  name: string;
  admin1?: string;
  country?: string;
}): string {
  return [g.name, g.admin1, g.country].filter(Boolean).join(", ");
}

function parseCoordinates(input: string): { lat: number; lon: number } | null {
  const m = input
    .trim()
    .match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function coordsAsLocation(lat: number, lon: number): GeoResult {
  return {
    name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    latitude: lat,
    longitude: lon,
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  try {
    // Open-Meteo has no reliable reverse endpoint; BigDataCloud is browser-friendly (CORS).
    const url = new URL(
      "https://api.bigdatacloud.net/data/reverse-geocode-client"
    );
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("localityLanguage", "en");

    const res = await fetch(url.toString());
    if (!res.ok) return coordsAsLocation(lat, lon);

    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };

    const city = data.city || data.locality;
    if (!city && !data.countryName) return coordsAsLocation(lat, lon);

    return {
      name: [city, data.principalSubdivision, data.countryName]
        .filter(Boolean)
        .join(", "),
      country: data.countryName,
      admin1: data.principalSubdivision,
      latitude: lat,
      longitude: lon,
    };
  } catch {
    return coordsAsLocation(lat, lon);
  }
}

async function geocodeLocation(query: string): Promise<GeoResult> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Please enter a location.");

  const coords = parseCoordinates(trimmed);
  if (coords) return reverseGeocode(coords.lat, coords.lon);

  // Open-Meteo is picky: "saint-petersburg" → empty, "Saint Petersburg" → ok.
  const variants = Array.from(
    new Set([
      trimmed,
      trimmed.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim(),
      trimmed.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\bst\b/gi, "Saint"),
    ].filter(Boolean))
  );

  let lastNetworkError: Error | null = null;

  for (const name of variants) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
          lastNetworkError = new Error("Geocoding service failed. Please try again.");
          continue;
        }
        const data = await res.json();
        if (data.results?.length) {
          const best = data.results[0];
          return {
            name: formatPlace(best),
            country: best.country,
            admin1: best.admin1,
            latitude: best.latitude,
            longitude: best.longitude,
            timezone: best.timezone,
          };
        }
        // Empty result for this variant — try next variant.
        break;
      } catch {
        lastNetworkError = new Error(
          "Could not reach the geocoding service. Check your internet connection and try again."
        );
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }

  if (lastNetworkError) throw lastNetworkError;

  throw new Error(
    `Location not found: "${trimmed}". Try a city name with spaces (e.g. "Saint Petersburg"), ZIP, landmark, or coordinates.`
  );
}

async function fetchJsonWithRetry(url: string, attempts = 3): Promise<unknown> {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        lastError = new Error(`Weather API HTTP ${res.status}`);
        continue;
      }
      return await res.json();
    } catch {
      lastError = new Error("Weather API network error");
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError ?? new Error("Weather API request failed. Please try again later.");
}

async function fetchWeatherBundle(location: GeoResult): Promise<WeatherBundle> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  let data: {
    current?: Record<string, number | string>;
    daily?: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max?: number[];
    };
  };

  try {
    data = (await fetchJsonWithRetry(url.toString())) as typeof data;
  } catch {
    throw new Error("Weather API request failed. Please try again later.");
  }

  if (!data.current || !data.daily) {
    throw new Error("Unexpected weather API response.");
  }

  const forecast: ForecastDay[] = data.daily.time.map((date: string, i: number) => ({
    date,
    weatherCode: data.daily!.weather_code[i],
    tMax: data.daily!.temperature_2m_max[i],
    tMin: data.daily!.temperature_2m_min[i],
    precipitationProbability: data.daily!.precipitation_probability_max?.[i] ?? 0,
  }));

  return {
    location,
    current: {
      temperature: Number(data.current.temperature_2m),
      apparentTemperature: Number(data.current.apparent_temperature),
      humidity: Number(data.current.relative_humidity_2m),
      windSpeed: Number(data.current.wind_speed_10m),
      weatherCode: Number(data.current.weather_code),
      isDay: Boolean(data.current.is_day),
      time: String(data.current.time),
    },
    forecast,
  };
}

/** Fetch live weather directly from Open-Meteo in the browser. */
export async function loadLiveWeather(params: {
  q?: string;
  lat?: number;
  lon?: number;
}): Promise<WeatherBundle> {
  // Coordinates: resolve name in parallel, but never block weather on reverse-geocode.
  if (params.lat != null && params.lon != null) {
    const lat = params.lat;
    const lon = params.lon;
    const placeholder = coordsAsLocation(lat, lon);
    const weatherPromise = fetchWeatherBundle(placeholder);
    const namePromise = reverseGeocode(lat, lon);
    const [bundle, named] = await Promise.all([weatherPromise, namePromise]);
    return { ...bundle, location: named };
  }

  if (params.q) {
    const coords = parseCoordinates(params.q);
    if (coords) {
      return loadLiveWeather({ lat: coords.lat, lon: coords.lon });
    }
    const location = await geocodeLocation(params.q);
    return fetchWeatherBundle(location);
  }

  throw new Error("Provide a location or coordinates.");
}

export type PreparedRecordPayload = {
  location: string;
  dateFrom: string;
  dateTo: string;
  notes?: string;
  resolvedName: string;
  latitude: number;
  longitude: number;
  temperatures: Array<{ date: string; tMin: number; tMax: number; tAvg: number }>;
  weatherSummary: string;
  mapUrl: string;
  wikipediaUrl?: string | null;
};

async function fetchHistoricalClient(
  lat: number,
  lon: number,
  dateFrom: string,
  dateTo: string
) {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("start_date", dateFrom);
  url.searchParams.set("end_date", dateTo);
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,temperature_2m_mean"
  );
  url.searchParams.set("timezone", "auto");

  const data = (await fetchJsonWithRetry(url.toString())) as {
    daily?: {
      time: string[];
      temperature_2m_min: number[];
      temperature_2m_max: number[];
      temperature_2m_mean: number[];
    };
  };

  if (!data.daily?.time?.length) {
    throw new Error("No temperature data for that location and date range.");
  }

  return data.daily.time.map((date, i) => ({
    date,
    tMin: data.daily!.temperature_2m_min[i],
    tMax: data.daily!.temperature_2m_max[i],
    tAvg: data.daily!.temperature_2m_mean[i],
  }));
}

async function fetchWikipediaUrl(placeName: string): Promise<string | null> {
  try {
    const title = placeName.split(",")[0]?.trim();
    if (!title) return null;
    const api =
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(title);
    const res = await fetch(api, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content_urls?.desktop?.page ?? null;
  } catch {
    return null;
  }
}

/** Build a full saved-record payload in the browser (geocode + archive weather). */
export async function prepareSavedRecord(input: {
  location: string;
  dateFrom: string;
  dateTo: string;
  notes?: string;
}): Promise<PreparedRecordPayload> {
  const geo = await geocodeLocation(input.location);
  const temperatures = await fetchHistoricalClient(
    geo.latitude,
    geo.longitude,
    input.dateFrom,
    input.dateTo
  );
  const avg =
    temperatures.reduce((s, t) => s + t.tAvg, 0) / Math.max(temperatures.length, 1);
  const wikipediaUrl = await fetchWikipediaUrl(geo.name);
  const mapUrl = `https://www.openstreetmap.org/?mlat=${geo.latitude}&mlon=${geo.longitude}#map=12/${geo.latitude}/${geo.longitude}`;

  return {
    location: input.location,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    notes: input.notes,
    resolvedName: geo.name,
    latitude: geo.latitude,
    longitude: geo.longitude,
    temperatures,
    weatherSummary: `Avg ${avg.toFixed(1)}°C over ${temperatures.length} day(s)`,
    mapUrl,
    wikipediaUrl,
  };
}

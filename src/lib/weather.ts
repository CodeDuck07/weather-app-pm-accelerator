import { httpGetJson, httpGetJsonSoft } from "@/lib/http";
import {
  openStreetMapEmbedUrl,
  openStreetMapLink,
  weatherLabel,
  type DailyTemperature,
  type ForecastDay,
  type GeoResult,
  type WeatherBundle,
} from "@/lib/weather-shared";

export * from "@/lib/weather-shared";

function formatPlace(g: {
  name: string;
  admin1?: string;
  country?: string;
}): string {
  return [g.name, g.admin1, g.country].filter(Boolean).join(", ");
}

/** Detect coordinates like "40.71,-74.00" or "40.71, -74.00" */
export function parseCoordinates(input: string): { lat: number; lon: number } | null {
  const m = input
    .trim()
    .match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export async function geocodeLocation(query: string): Promise<GeoResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Please enter a location.");
  }

  const coords = parseCoordinates(trimmed);
  if (coords) {
    return reverseGeocode(coords.lat, coords.lon);
  }

  const variants = Array.from(
    new Set([
      trimmed,
      trimmed.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim(),
    ].filter(Boolean))
  );

  let lastError: Error | null = null;
  for (const name of variants) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    try {
      const data = await httpGetJson<{
        results?: Array<{
          name: string;
          country?: string;
          admin1?: string;
          latitude: number;
          longitude: number;
          timezone?: string;
        }>;
      }>(url.toString());

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
    } catch {
      lastError = new Error("Geocoding service failed. Please try again.");
    }
  }

  if (lastError) throw lastError;

  throw new Error(
    `Location not found: "${trimmed}". Try a city name with spaces (e.g. "Saint Petersburg"), ZIP, landmark, or coordinates.`
  );
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  try {
    const url = new URL(
      "https://api.bigdatacloud.net/data/reverse-geocode-client"
    );
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("localityLanguage", "en");

    const soft = await httpGetJsonSoft<{
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    }>(url.toString());

    if (!soft.ok) {
      return {
        name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        latitude: lat,
        longitude: lon,
      };
    }

    const city = soft.data.city || soft.data.locality;
    const name =
      [city, soft.data.principalSubdivision, soft.data.countryName]
        .filter(Boolean)
        .join(", ") || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    return {
      name,
      country: soft.data.countryName,
      admin1: soft.data.principalSubdivision,
      latitude: lat,
      longitude: lon,
    };
  } catch {
    return {
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      latitude: lat,
      longitude: lon,
    };
  }
}

export async function fetchWeatherBundle(location: GeoResult): Promise<WeatherBundle> {
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
    data = await httpGetJson(url.toString());
  } catch {
    throw new Error("Weather API request failed. Please try again later.");
  }
  if (!data.current || !data.daily) {
    throw new Error("Unexpected weather API response.");
  }

  const forecast: ForecastDay[] = data.daily.time.map((date: string, i: number) => ({
    date,
    weatherCode: data.daily.weather_code[i],
    tMax: data.daily.temperature_2m_max[i],
    tMin: data.daily.temperature_2m_min[i],
    precipitationProbability: data.daily.precipitation_probability_max?.[i] ?? 0,
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

export async function fetchHistoricalTemperatures(
  location: GeoResult,
  dateFrom: string,
  dateTo: string
): Promise<DailyTemperature[]> {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("start_date", dateFrom);
  url.searchParams.set("end_date", dateTo);
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,temperature_2m_mean"
  );
  url.searchParams.set("timezone", "auto");

  let data: {
    daily?: {
      time: string[];
      temperature_2m_min: number[];
      temperature_2m_max: number[];
      temperature_2m_mean: number[];
    };
  };
  try {
    data = await httpGetJson(url.toString());
  } catch {
    throw new Error("Historical weather API request failed.");
  }
  if (!data.daily?.time?.length) {
    throw new Error("No temperature data for that location and date range.");
  }

  return data.daily.time.map((date: string, i: number) => ({
    date,
    tMin: data.daily!.temperature_2m_min[i],
    tMax: data.daily!.temperature_2m_max[i],
    tAvg: data.daily!.temperature_2m_mean[i],
  }));
}

export async function fetchWikipediaSummary(placeName: string): Promise<{
  extract?: string;
  url?: string;
} | null> {
  const title = placeName.split(",")[0]?.trim();
  if (!title) return null;

  const api =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title);
  const soft = await httpGetJsonSoft<{
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  }>(api, { headers: { Accept: "application/json" } });
  if (!soft.ok) return null;
  return {
    extract: soft.data.extract,
    url: soft.data.content_urls?.desktop?.page,
  };
}

export async function resolveYoutubeVideo(
  placeName: string
): Promise<{ videoId?: string; searchUrl: string }> {
  const q = `${placeName} travel weather`;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { searchUrl };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", key);

  const soft = await httpGetJsonSoft<{
    items?: Array<{ id?: { videoId?: string } }>;
  }>(url.toString());
  if (!soft.ok) return { searchUrl };
  const videoId = soft.data.items?.[0]?.id?.videoId;
  return { videoId, searchUrl };
}

// re-export helpers used by API routes
export { openStreetMapEmbedUrl, openStreetMapLink, weatherLabel };

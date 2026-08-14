import { NextResponse } from "next/server";
import {
  fetchWeatherBundle,
  geocodeLocation,
  reverseGeocode,
} from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    let location;
    if (lat && lon) {
      const latitude = Number(lat);
      const longitude = Number(lon);
      if (
        Number.isNaN(latitude) ||
        Number.isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return NextResponse.json(
          { error: "Invalid GPS coordinates." },
          { status: 400 }
        );
      }
      location = await reverseGeocode(latitude, longitude);
    } else if (q) {
      location = await geocodeLocation(q);
    } else {
      return NextResponse.json(
        { error: "Provide q (location) or lat & lon." },
        { status: 400 }
      );
    }

    const bundle = await fetchWeatherBundle(location);
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = /not found/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

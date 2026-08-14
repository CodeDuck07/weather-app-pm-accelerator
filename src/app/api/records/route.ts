import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRecordSchema } from "@/lib/validation";
import {
  fetchHistoricalTemperatures,
  fetchWikipediaSummary,
  geocodeLocation,
  openStreetMapEmbedUrl,
  openStreetMapLink,
  resolveYoutubeVideo,
  weatherLabel,
} from "@/lib/weather";

export async function GET() {
  try {
    const records = await prisma.weatherRecord.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const hasClientPayload =
      data.resolvedName &&
      data.latitude != null &&
      data.longitude != null &&
      data.temperatures?.length;

    let resolvedName: string;
    let latitude: number;
    let longitude: number;
    let temperatures: Array<{ date: string; tMin: number; tMax: number; tAvg: number }>;
    let weatherSummary: string;
    let mapUrl: string;
    let wikipediaUrl: string | null;
    let youtubeVideoId: string | null = null;
    let youtubeSearchUrl: string | undefined;
    let wikipediaExtract: string | null = null;

    if (hasClientPayload) {
      resolvedName = data.resolvedName!;
      latitude = data.latitude!;
      longitude = data.longitude!;
      temperatures = data.temperatures!;
      weatherSummary =
        data.weatherSummary ??
        `Avg ${(
          temperatures.reduce((s, t) => s + t.tAvg, 0) / temperatures.length
        ).toFixed(1)}°C over ${temperatures.length} day(s)`;
      mapUrl = data.mapUrl ?? openStreetMapLink(latitude, longitude);
      wikipediaUrl = data.wikipediaUrl ?? null;
      const yt = await resolveYoutubeVideo(resolvedName).catch(() => ({
        searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(resolvedName)}`,
      }));
      youtubeVideoId = "videoId" in yt ? yt.videoId ?? null : null;
      youtubeSearchUrl = yt.searchUrl;
    } else {
      const geo = await geocodeLocation(data.location);
      temperatures = await fetchHistoricalTemperatures(
        geo,
        data.dateFrom,
        data.dateTo
      );
      const avg =
        temperatures.reduce((s, t) => s + t.tAvg, 0) /
        Math.max(temperatures.length, 1);
      resolvedName = geo.name;
      latitude = geo.latitude;
      longitude = geo.longitude;
      weatherSummary = `Avg ${avg.toFixed(1)}°C over ${temperatures.length} day(s)`;
      mapUrl = openStreetMapLink(geo.latitude, geo.longitude);
      const wiki = await fetchWikipediaSummary(geo.name);
      wikipediaUrl = wiki?.url ?? null;
      wikipediaExtract = wiki?.extract ?? null;
      const yt = await resolveYoutubeVideo(geo.name);
      youtubeVideoId = yt.videoId ?? null;
      youtubeSearchUrl = yt.searchUrl;
    }

    const record = await prisma.weatherRecord.create({
      data: {
        locationInput: data.location,
        resolvedName,
        latitude,
        longitude,
        dateFrom: new Date(data.dateFrom + "T00:00:00Z"),
        dateTo: new Date(data.dateTo + "T00:00:00Z"),
        temperatures: JSON.stringify(temperatures),
        weatherSummary,
        notes: data.notes ?? null,
        youtubeVideoId,
        mapUrl,
        wikipediaUrl,
      },
    });

    return NextResponse.json(
      {
        record,
        extras: {
          mapEmbedUrl: openStreetMapEmbedUrl(latitude, longitude),
          youtubeSearchUrl,
          wikipediaExtract,
          weatherHint: weatherLabel(0),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    const status = /not found/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

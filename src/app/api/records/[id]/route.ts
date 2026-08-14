import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateRecordSchema } from "@/lib/validation";
import {
  fetchHistoricalTemperatures,
  fetchWikipediaSummary,
  geocodeLocation,
  openStreetMapLink,
  resolveYoutubeVideo,
} from "@/lib/weather";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const record = await prisma.weatherRecord.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json(record);
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.weatherRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateRecordSchema.safeParse(body);
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

    let locationInput = existing.locationInput;
    let resolvedName = existing.resolvedName;
    let latitude = existing.latitude;
    let longitude = existing.longitude;
    let dateFrom = existing.dateFrom;
    let dateTo = existing.dateTo;
    let temperatures = existing.temperatures;
    let weatherSummary = existing.weatherSummary;
    let youtubeVideoId = existing.youtubeVideoId;
    let mapUrl = existing.mapUrl;
    let wikipediaUrl = existing.wikipediaUrl;

    if (hasClientPayload) {
      locationInput = data.location ?? existing.locationInput;
      resolvedName = data.resolvedName!;
      latitude = data.latitude!;
      longitude = data.longitude!;
      if (data.dateFrom) dateFrom = new Date(data.dateFrom + "T00:00:00Z");
      if (data.dateTo) dateTo = new Date(data.dateTo + "T00:00:00Z");
      temperatures = JSON.stringify(data.temperatures);
      weatherSummary = data.weatherSummary ?? weatherSummary;
      mapUrl = data.mapUrl ?? openStreetMapLink(latitude, longitude);
      wikipediaUrl =
        data.wikipediaUrl === undefined ? wikipediaUrl : data.wikipediaUrl;
    } else {
      const locationChanged = Boolean(
        data.location && data.location !== existing.locationInput
      );
      const datesChanged =
        (data.dateFrom &&
          data.dateFrom !== existing.dateFrom.toISOString().slice(0, 10)) ||
        (data.dateTo &&
          data.dateTo !== existing.dateTo.toISOString().slice(0, 10));

      if (locationChanged && data.location) {
        const geo = await geocodeLocation(data.location);
        locationInput = data.location;
        resolvedName = geo.name;
        latitude = geo.latitude;
        longitude = geo.longitude;
        mapUrl = openStreetMapLink(geo.latitude, geo.longitude);
        const wiki = await fetchWikipediaSummary(geo.name);
        wikipediaUrl = wiki?.url ?? null;
        const yt = await resolveYoutubeVideo(geo.name);
        youtubeVideoId = yt.videoId ?? null;
      }

      if (data.dateFrom) dateFrom = new Date(data.dateFrom + "T00:00:00Z");
      if (data.dateTo) dateTo = new Date(data.dateTo + "T00:00:00Z");

      if (locationChanged || datesChanged) {
        const fromStr = dateFrom.toISOString().slice(0, 10);
        const toStr = dateTo.toISOString().slice(0, 10);
        if (dateFrom > dateTo) {
          return NextResponse.json(
            { error: "Start date must be on or before end date" },
            { status: 400 }
          );
        }
        const temps = await fetchHistoricalTemperatures(
          { name: resolvedName, latitude, longitude },
          fromStr,
          toStr
        );
        temperatures = JSON.stringify(temps);
        const avg =
          temps.reduce((s, t) => s + t.tAvg, 0) / Math.max(temps.length, 1);
        weatherSummary = `Avg ${avg.toFixed(1)}°C over ${temps.length} day(s)`;
      }
    }

    if (data.weatherSummary !== undefined && data.weatherSummary !== null) {
      weatherSummary = data.weatherSummary;
    }

    const record = await prisma.weatherRecord.update({
      where: { id },
      data: {
        locationInput,
        resolvedName,
        latitude,
        longitude,
        dateFrom,
        dateTo,
        temperatures,
        weatherSummary,
        notes: data.notes === undefined ? existing.notes : data.notes,
        youtubeVideoId,
        mapUrl,
        wikipediaUrl,
      },
    });

    return NextResponse.json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await prisma.weatherRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
}

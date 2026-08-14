import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv, toJson, toMarkdown, toXml } from "@/lib/export";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const id = searchParams.get("id");

    const records = id
      ? await prisma.weatherRecord.findMany({ where: { id } })
      : await prisma.weatherRecord.findMany({ orderBy: { createdAt: "desc" } });

    if (id && records.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (format === "csv") {
      return new NextResponse(toCsv(records), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="weather-records.csv"',
        },
      });
    }

    if (format === "md" || format === "markdown") {
      return new NextResponse(toMarkdown(records), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": 'attachment; filename="weather-records.md"',
        },
      });
    }

    if (format === "xml") {
      return new NextResponse(toXml(records), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": 'attachment; filename="weather-records.xml"',
        },
      });
    }

    return new NextResponse(toJson(records), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="weather-records.json"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

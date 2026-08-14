import type { WeatherRecord } from "@prisma/client";

type TempRow = { date: string; tMin: number; tMax: number; tAvg: number };

function parseTemps(raw: string): TempRow[] {
  try {
    return JSON.parse(raw) as TempRow[];
  } catch {
    return [];
  }
}

export function toJson(records: WeatherRecord | WeatherRecord[]) {
  return JSON.stringify(records, null, 2);
}

export function toCsv(records: WeatherRecord[]): string {
  const header = [
    "id",
    "locationInput",
    "resolvedName",
    "latitude",
    "longitude",
    "dateFrom",
    "dateTo",
    "avgTemp",
    "notes",
    "createdAt",
  ];
  const lines = [header.join(",")];
  for (const r of records) {
    const temps = parseTemps(r.temperatures);
    const avg =
      temps.length > 0
        ? (
            temps.reduce((s, t) => s + (t.tAvg ?? 0), 0) / temps.length
          ).toFixed(2)
        : "";
    const row = [
      r.id,
      csvEscape(r.locationInput),
      csvEscape(r.resolvedName),
      r.latitude,
      r.longitude,
      r.dateFrom.toISOString().slice(0, 10),
      r.dateTo.toISOString().slice(0, 10),
      avg,
      csvEscape(r.notes ?? ""),
      r.createdAt.toISOString(),
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toMarkdown(records: WeatherRecord[]): string {
  const parts = ["# Weather records", ""];
  for (const r of records) {
    const temps = parseTemps(r.temperatures);
    parts.push(`## ${r.resolvedName}`);
    parts.push("");
    parts.push(`- **ID:** ${r.id}`);
    parts.push(`- **Query:** ${r.locationInput}`);
    parts.push(`- **Coords:** ${r.latitude}, ${r.longitude}`);
    parts.push(
      `- **Range:** ${r.dateFrom.toISOString().slice(0, 10)} → ${r.dateTo.toISOString().slice(0, 10)}`
    );
    if (r.notes) parts.push(`- **Notes:** ${r.notes}`);
    if (r.mapUrl) parts.push(`- **Map:** ${r.mapUrl}`);
    if (r.wikipediaUrl) parts.push(`- **Wikipedia:** ${r.wikipediaUrl}`);
    parts.push("");
    parts.push("| Date | Min | Max | Avg |");
    parts.push("| --- | --- | --- | --- |");
    for (const t of temps) {
      parts.push(
        `| ${t.date} | ${t.tMin} | ${t.tMax} | ${t.tAvg} |`
      );
    }
    parts.push("");
  }
  return parts.join("\n");
}

export function toXml(records: WeatherRecord[]): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const body = records
    .map((r) => {
      const temps = parseTemps(r.temperatures)
        .map(
          (t) =>
            `      <day date="${t.date}" tMin="${t.tMin}" tMax="${t.tMax}" tAvg="${t.tAvg}" />`
        )
        .join("\n");
      return `  <record id="${esc(r.id)}">
    <locationInput>${esc(r.locationInput)}</locationInput>
    <resolvedName>${esc(r.resolvedName)}</resolvedName>
    <latitude>${r.latitude}</latitude>
    <longitude>${r.longitude}</longitude>
    <dateFrom>${r.dateFrom.toISOString()}</dateFrom>
    <dateTo>${r.dateTo.toISOString()}</dateTo>
    <notes>${esc(r.notes ?? "")}</notes>
    <temperatures>
${temps}
    </temperatures>
  </record>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<weatherRecords>\n${body}\n</weatherRecords>\n`;
}

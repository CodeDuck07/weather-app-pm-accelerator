import { z } from "zod";

const tempRowSchema = z.object({
  date: z.string(),
  tMin: z.number(),
  tMax: z.number(),
  tAvg: z.number(),
});

export const createRecordSchema = z
  .object({
    location: z.string().min(1, "Location is required").max(200),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom must be YYYY-MM-DD"),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo must be YYYY-MM-DD"),
    notes: z.string().max(1000).optional(),
    // Optional client-prepared fields (browser already fetched weather)
    resolvedName: z.string().min(1).max(300).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    temperatures: z.array(tempRowSchema).min(1).optional(),
    weatherSummary: z.string().max(500).optional(),
    mapUrl: z.string().url().optional(),
    wikipediaUrl: z.string().url().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const from = new Date(val.dateFrom + "T00:00:00Z");
    const to = new Date(val.dateTo + "T00:00:00Z");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date values", path: ["dateFrom"] });
      return;
    }
    if (from > to) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be on or before end date",
        path: ["dateFrom"],
      });
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (to > today) {
      ctx.addIssue({
        code: "custom",
        message: "End date cannot be in the future (archive API)",
        path: ["dateTo"],
      });
    }
    const spanDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (spanDays > 31) {
      ctx.addIssue({
        code: "custom",
        message: "Date range cannot exceed 31 days",
        path: ["dateTo"],
      });
    }
  });

export const updateRecordSchema = z
  .object({
    location: z.string().min(1).max(200).optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z.string().max(1000).nullable().optional(),
    weatherSummary: z.string().max(500).nullable().optional(),
    resolvedName: z.string().min(1).max(300).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    temperatures: z.array(tempRowSchema).min(1).optional(),
    mapUrl: z.string().url().optional(),
    wikipediaUrl: z.string().url().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.dateFrom && val.dateTo) {
      const from = new Date(val.dateFrom + "T00:00:00Z");
      const to = new Date(val.dateTo + "T00:00:00Z");
      if (from > to) {
        ctx.addIssue({
          code: "custom",
          message: "Start date must be on or before end date",
          path: ["dateFrom"],
        });
      }
    }
  });

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
